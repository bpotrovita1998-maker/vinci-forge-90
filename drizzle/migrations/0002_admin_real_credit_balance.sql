CREATE OR REPLACE FUNCTION public.deduct_tokens(_user_id uuid, _amount numeric, _job_id uuid, _action_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  free_remaining INTEGER;
  ad_remaining INTEGER;
  v_subscription_status TEXT;
  job_exists BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.has_role(_user_id, 'admin');

  SELECT balance, (free_tokens_granted - free_tokens_used), COALESCE(ad_generations_remaining, 0)
  INTO current_balance, free_remaining, ad_remaining
  FROM public.token_balances
  WHERE user_id = _user_id;

  SELECT status INTO v_subscription_status
  FROM public.subscriptions
  WHERE user_id = _user_id;

  -- Admins keep access to every feature, but spend real credits like any user
  IF v_is_admin THEN
    v_subscription_status := 'active';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.jobs WHERE id = _job_id) INTO job_exists;

  IF _action_type = 'image_generation' THEN
    IF ad_remaining >= _amount THEN
      UPDATE public.token_balances
      SET ad_generations_remaining = ad_generations_remaining - _amount::integer, updated_at = now()
      WHERE user_id = _user_id;
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'ad_generations'));
      RETURN TRUE;
    END IF;

    IF free_remaining >= _amount THEN
      UPDATE public.token_balances
      SET free_tokens_used = free_tokens_used + _amount::integer, updated_at = now()
      WHERE user_id = _user_id;
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'free_tokens'));
      RETURN TRUE;
    END IF;

    IF v_subscription_status = 'active' AND current_balance >= _amount THEN
      UPDATE public.token_balances
      SET balance = balance - _amount, total_spent = total_spent + _amount, updated_at = now()
      WHERE user_id = _user_id;
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'paid_tokens'));
      RETURN TRUE;
    END IF;

    IF v_subscription_status = 'active' THEN
      RAISE EXCEPTION 'Insufficient credit balance. Please buy more credits.';
    ELSE
      RAISE EXCEPTION 'No generations available. Watch an ad to get 5 free image generations, or upgrade to PRO!';
    END IF;
  END IF;

  IF v_subscription_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Requires PRO subscription and sufficient credit balance';
  END IF;
  IF COALESCE(current_balance, 0) < _amount THEN
    RAISE EXCEPTION 'Insufficient credit balance. Please buy more credits.';
  END IF;

  UPDATE public.token_balances
  SET balance = balance - _amount, total_spent = total_spent + _amount, updated_at = now()
  WHERE user_id = _user_id;
  INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
  VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'paid_tokens'));
  RETURN TRUE;
END;
$function$;