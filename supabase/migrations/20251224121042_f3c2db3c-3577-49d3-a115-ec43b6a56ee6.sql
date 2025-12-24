-- Add ad_generations columns to token_balances table
ALTER TABLE public.token_balances 
ADD COLUMN IF NOT EXISTS ad_generations_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_generations_total_earned INTEGER DEFAULT 0;

-- Update the deduct_tokens function to handle ad-based generations
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
BEGIN
  -- Admins have unlimited access
  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Get current token balance, free tokens, and ad generations
  SELECT balance, (free_tokens_granted - free_tokens_used), COALESCE(ad_generations_remaining, 0)
  INTO current_balance, free_remaining, ad_remaining
  FROM public.token_balances
  WHERE user_id = _user_id;
  
  -- Get subscription status
  SELECT status INTO v_subscription_status
  FROM public.subscriptions
  WHERE user_id = _user_id;
  
  -- Check if job exists in jobs table
  SELECT EXISTS(SELECT 1 FROM public.jobs WHERE id = _job_id)
  INTO job_exists;
  
  -- For image generation, check multiple sources in priority order
  IF _action_type = 'image_generation' THEN
    -- Priority 1: Use ad generations if available (from watching ads)
    IF ad_remaining >= _amount THEN
      UPDATE public.token_balances
      SET ad_generations_remaining = ad_generations_remaining - _amount::integer,
          updated_at = now()
      WHERE user_id = _user_id;
      
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'ad_generations'));
      
      RETURN TRUE;
    END IF;
    
    -- Priority 2: Use free tokens if available
    IF free_remaining >= _amount THEN
      UPDATE public.token_balances
      SET free_tokens_used = free_tokens_used + _amount::integer,
          updated_at = now()
      WHERE user_id = _user_id;
      
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'free_tokens'));
      
      RETURN TRUE;
    END IF;
    
    -- Priority 3: Use paid balance if PRO user
    IF v_subscription_status = 'active' AND current_balance >= _amount THEN
      UPDATE public.token_balances
      SET 
        balance = balance - _amount,
        total_spent = total_spent + _amount,
        updated_at = now()
      WHERE user_id = _user_id;
      
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'paid_tokens'));
      
      RETURN TRUE;
    END IF;
    
    -- No tokens available - show helpful message
    IF v_subscription_status = 'active' THEN
      RAISE EXCEPTION 'Insufficient token balance. Please purchase more tokens.';
    ELSE
      RAISE EXCEPTION 'No generations available. Watch an ad to get 3 free image generations, or upgrade to PRO!';
    END IF;
  END IF;
  
  -- For paid features (video, 3D, CAD), require active subscription
  IF v_subscription_status != 'active' OR current_balance < _amount THEN
    RAISE EXCEPTION 'Requires PRO subscription and sufficient token balance';
  END IF;
  
  -- Deduct from paid balance
  UPDATE public.token_balances
  SET 
    balance = balance - _amount,
    total_spent = total_spent + _amount,
    updated_at = now()
  WHERE user_id = _user_id;
  
  INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
  VALUES (_user_id, CASE WHEN job_exists THEN _job_id ELSE NULL END, _action_type, _amount, jsonb_build_object('source', 'paid_tokens'));
  
  RETURN TRUE;
END;
$function$;

-- Create a function to grant ad generations
CREATE OR REPLACE FUNCTION public.grant_ad_generations(_user_id uuid, _amount integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert or update token_balances with ad generations
  INSERT INTO public.token_balances (user_id, ad_generations_remaining, ad_generations_total_earned)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    ad_generations_remaining = token_balances.ad_generations_remaining + _amount,
    ad_generations_total_earned = token_balances.ad_generations_total_earned + _amount,
    updated_at = now();
  
  RETURN TRUE;
END;
$function$;