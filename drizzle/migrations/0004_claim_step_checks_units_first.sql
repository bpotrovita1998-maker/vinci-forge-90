DROP FUNCTION IF EXISTS public.claim_generation_step(uuid, text, text);

CREATE OR REPLACE FUNCTION public.claim_generation_step(_user_id uuid, _job_ref text, _step text, _min_units integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log public.usage_logs%ROWTYPE;
  v_units integer;
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

  v_units := COALESCE((v_log.cost_breakdown->>'units')::integer, 1);
  IF v_units < COALESCE(_min_units, 1) THEN
    RETURN jsonb_build_object('status', 'underpaid', 'units', v_units);
  END IF;

  UPDATE public.usage_logs
  SET cost_breakdown = jsonb_set(cost_breakdown, '{steps}', COALESCE(cost_breakdown->'steps', '[]'::jsonb) || to_jsonb(_step))
  WHERE id = v_log.id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'action_type', v_log.action_type,
    'units', v_units,
    'credits', COALESCE((v_log.cost_breakdown->>'credits')::numeric, v_log.tokens_used)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_generation_step(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_generation_step(uuid, text, text, integer) TO service_role;