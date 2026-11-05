CREATE INDEX IF NOT EXISTS idx_usage_logs_job_ref ON public.usage_logs ((cost_breakdown->>'job_ref'));

-- Charge a generation once per job reference. Prices are decided by the caller (server code only).
CREATE OR REPLACE FUNCTION public.charge_generation(_user_id uuid, _job_ref text, _action_type text, _credits numeric, _units integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  SELECT * INTO v_bal FROM public.token_balances WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No credit balance found for this account';
  END IF;

  v_active := public.has_role(_user_id, 'admin') OR EXISTS (
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
        RAISE EXCEPTION 'No generations available. Watch an ad to get 5 free image generations, or upgrade to PRO!';
      END IF;
      RAISE EXCEPTION 'Requires PRO subscription and sufficient credit balance';
    END IF;
    IF v_bal.balance < _credits THEN
      RAISE EXCEPTION 'Not enough credits. You need % credits but have %. Buy a credit pack to continue.', _credits, v_bal.balance;
    END IF;
    v_source := 'paid_tokens';
    v_amount := _credits;
    UPDATE public.token_balances SET balance = balance - _credits, total_spent = total_spent + _credits, updated_at = now() WHERE user_id = _user_id;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id::text = _job_ref) INTO v_job_exists;

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
$$;

-- Mark one generation step as used for a paid job. Each step can run only once.
CREATE OR REPLACE FUNCTION public.claim_generation_step(_user_id uuid, _job_ref text, _step text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log public.usage_logs%ROWTYPE;
BEGIN
  SELECT * INTO v_log FROM public.usage_logs
  WHERE user_id = _user_id AND cost_breakdown->>'job_ref' = _job_ref AND action_type <> 'refund'
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'missing');
  END IF;
  IF COALESCE((v_log.cost_breakdown->>'refunded')::boolean, false) THEN
    RETURN jsonb_build_object('status', 'refunded');
  END IF;
  IF COALESCE(v_log.cost_breakdown->'steps', '[]'::jsonb) ? _step THEN
    RETURN jsonb_build_object('status', 'used');
  END IF;

  UPDATE public.usage_logs
  SET cost_breakdown = jsonb_set(cost_breakdown, '{steps}', COALESCE(cost_breakdown->'steps', '[]'::jsonb) || to_jsonb(_step))
  WHERE id = v_log.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'action_type', v_log.action_type,
    'units', COALESCE((v_log.cost_breakdown->>'units')::integer, 1),
    'credits', COALESCE((v_log.cost_breakdown->>'credits')::numeric, v_log.tokens_used)
  );
END;
$$;

-- Give back the credits of a failed generation to the place they came from. Safe to call twice.
CREATE OR REPLACE FUNCTION public.refund_generation(_job_ref text, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  IF v_source = 'ad_generations' THEN
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
$$;

REVOKE ALL ON FUNCTION public.charge_generation(uuid, text, text, numeric, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_generation_step(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_generation(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_generation(uuid, text, text, numeric, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_generation_step(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_generation(text, text) TO service_role;

-- Old client-priced deduction is no longer callable by app users
REVOKE ALL ON FUNCTION public.deduct_tokens(uuid, numeric, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_tokens(uuid, numeric, uuid, text) TO service_role;