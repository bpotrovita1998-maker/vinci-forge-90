-- Add free tier support to token_balances
ALTER TABLE public.token_balances
ADD COLUMN IF NOT EXISTS free_tokens_granted integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS free_tokens_used integer DEFAULT 0;

-- Update existing users to have free tokens
UPDATE public.token_balances
SET free_tokens_granted = 10,
    free_tokens_used = 0
WHERE free_tokens_granted IS NULL;

-- Update the deduct_tokens function to handle free tier
CREATE OR REPLACE FUNCTION public.deduct_tokens(_user_id uuid, _amount numeric, _job_id uuid, _action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  free_remaining INTEGER;
  v_subscription_status TEXT;
BEGIN
  -- Admins have unlimited access
  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Get current token balance and free tokens
  SELECT balance, (free_tokens_granted - free_tokens_used)
  INTO current_balance, free_remaining
  FROM public.token_balances
  WHERE user_id = _user_id;
  
  -- Get subscription status
  SELECT status INTO v_subscription_status
  FROM public.subscriptions
  WHERE user_id = _user_id;
  
  -- For image generation (2 tokens), allow if free tokens available OR has active subscription with paid tokens
  IF _action_type = 'image' THEN
    -- Use free tokens first if available
    IF free_remaining >= _amount THEN
      UPDATE public.token_balances
      SET free_tokens_used = free_tokens_used + _amount::integer,
          updated_at = now()
      WHERE user_id = _user_id;
      
      INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used, cost_breakdown)
      VALUES (_user_id, _job_id, _action_type, _amount, jsonb_build_object('source', 'free_tokens'));
      
      RETURN TRUE;
    END IF;
  END IF;
  
  -- For paid features (video, 3D, CAD) or when free tokens exhausted, require active subscription
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
  VALUES (_user_id, _job_id, _action_type, _amount, jsonb_build_object('source', 'paid_tokens'));
  
  RETURN TRUE;
END;
$function$;