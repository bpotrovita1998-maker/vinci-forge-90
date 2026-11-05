CREATE OR REPLACE FUNCTION public.charge_generation(_user_id uuid, _job_ref text, _action_type text, _credits numeric, _units integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bal public.token_balances%ROWTYPE;
  v_existing public.usage_logs%ROWTYPE;
  v_active boolean;
  v_source text;
  v_amount numeric;
  v_job_exists boolean;
BEGIN
  IF _credits IS NULL OR _credits <= 0 OR _units IS NULL OR _units <= 0 THEN
    RAISE EXCEPTION 'Invalid generation price';
  END IF;
  IF _job_ref IS NULL OR length(_job_ref) = 0 THEN
    RAISE EXCEPTION 'Missing job reference';
  END IF;

  SELECT * INTO v_existing FROM public.usage_logs
  WHERE user_id = _user_id AND cost_breakdown->>'job_ref' = _job_ref AND action_type <> 'refund'
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('already_charged', true, 'source', v_existing.cost_breakdown->>'source', 'credits', v_existing.tokens_used);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id::text = _job_ref) INTO v_job_exists;

  -- Owner mode: the GM pays the AI provider directly, so no app credits move
  IF public.has_role(_user_id, 'admin') THEN
    INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
    VALUES (
      _user_id,
      CASE WHEN v_job_exists THEN _job_ref::uuid ELSE NULL END,
      _action_type,
      0,
      jsonb_build_object('source', 'owner', 'job_ref', _job_ref, 'units', _units, 'credits', _credits, 'steps', '[]'::jsonb, 'refunded', false)
    );
    RETURN jsonb_build_object('already_charged', false, 'source', 'owner', 'credits', 0);
  END IF;

  SELECT * INTO v_bal FROM public.token_balances WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No credit balance found for this account';
  END IF;

  v_active := EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active'
  );

  IF _action_type = 'image_generation' AND COALESCE(v_bal.ad_generations_remaining, 0) >= _units THEN
    v_source := 'ad_generations';
    v_amount := _units;
    UPDATE public.token_balances SET ad_generations_remaining = ad_generations_remaining - _units, updated_at = now() WHERE user_id = _user_id;
  ELSIF _action_type = 'image_generation' AND (COALESCE(v_bal.free_tokens_granted, 0) - COALESCE(v_bal.free_tokens_used, 0)) >= _units THEN
    v_source := 'free_tokens';
    v_amount := _units;
    UPDATE public.token_balances SET free_tokens_used = COALESCE(free_tokens_used, 0) + _units, updated_at = now() WHERE user_id = _user_id;
  ELSE
    IF NOT v_active THEN
      IF _action_type = 'image_generation' THEN
        RAISE EXCEPTION 'No free generations left. Choose a plan on the Pricing page to keep creating.';
      END IF;
      RAISE EXCEPTION 'Requires an active plan and enough credits';
    END IF;
    IF v_bal.balance < _credits THEN
      RAISE EXCEPTION 'Not enough credits. You need % credits but have %. Buy a credit pack to continue.', _credits, v_bal.balance;
    END IF;
    v_source := 'paid_tokens';
    v_amount := _credits;
    UPDATE public.token_balances SET balance = balance - _credits, total_spent = total_spent + _credits, updated_at = now() WHERE user_id = _user_id;
  END IF;

  INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
  VALUES (
    _user_id,
    CASE WHEN v_job_exists THEN _job_ref::uuid ELSE NULL END,
    _action_type,
    v_amount,
    jsonb_build_object('source', v_source, 'job_ref', _job_ref, 'units', _units, 'credits', _credits, 'steps', '[]'::jsonb, 'refunded', false)
  );

  RETURN jsonb_build_object('already_charged', false, 'source', v_source, 'credits', v_amount);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_generation(_job_ref text, _reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_log public.usage_logs%ROWTYPE;
  v_source text;
BEGIN
  SELECT * INTO v_log FROM public.usage_logs
  WHERE cost_breakdown->>'job_ref' = _job_ref AND action_type <> 'refund'
    AND COALESCE((cost_breakdown->>'refunded')::boolean, false) = false
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_source := v_log.cost_breakdown->>'source';
  IF v_source = 'owner' THEN
    NULL; -- owner generations moved no app credits
  ELSIF v_source = 'ad_generations' THEN
    UPDATE public.token_balances SET ad_generations_remaining = COALESCE(ad_generations_remaining, 0) + v_log.tokens_used::integer, updated_at = now() WHERE user_id = v_log.user_id;
  ELSIF v_source = 'free_tokens' THEN
    UPDATE public.token_balances SET free_tokens_used = GREATEST(COALESCE(free_tokens_used, 0) - v_log.tokens_used::integer, 0), updated_at = now() WHERE user_id = v_log.user_id;
  ELSE
    UPDATE public.token_balances SET balance = balance + v_log.tokens_used, total_spent = GREATEST(total_spent - v_log.tokens_used, 0), updated_at = now() WHERE user_id = v_log.user_id;
  END IF;

  UPDATE public.usage_logs
  SET cost_breakdown = cost_breakdown || jsonb_build_object('refunded', true, 'refund_reason', _reason)
  WHERE id = v_log.id;

  INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
  VALUES (v_log.user_id, v_log.job_id, 'refund', -v_log.tokens_used,
    jsonb_build_object('source', v_source, 'job_ref', _job_ref, 'reason', _reason));

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.charge_generation(uuid, text, text, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_generation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_generation(uuid, text, text, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_generation(text, text) TO service_role;

-- Real AI provider spend, one row per provider job
CREATE TABLE public.provider_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_ref text,
  provider text NOT NULL DEFAULT 'replicate',
  provider_model text NOT NULL,
  prediction_id text,
  status text NOT NULL DEFAULT 'started',
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  credits_charged numeric NOT NULL DEFAULT 0,
  owner_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_runs TO authenticated;
GRANT ALL ON public.provider_runs TO service_role;
ALTER TABLE public.provider_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own runs" ON public.provider_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all runs" ON public.provider_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_provider_runs_user_created ON public.provider_runs (user_id, created_at DESC);
CREATE INDEX idx_provider_runs_created ON public.provider_runs (created_at DESC);

-- Owner-entered Replicate balance, used for the low-balance warning
CREATE TABLE public.provider_balance (
  provider text PRIMARY KEY,
  balance_usd numeric NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.provider_balance TO authenticated;
GRANT ALL ON public.provider_balance TO service_role;
ALTER TABLE public.provider_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider balance" ON public.provider_balance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Continue-video links between storyboard scenes
ALTER TABLE public.storyboard_scenes ADD COLUMN parent_scene_id uuid;
ALTER TABLE public.storyboard_scenes ADD COLUMN continuation_prompt text;
ALTER TABLE public.storyboard_scenes ADD COLUMN start_frame_url text;