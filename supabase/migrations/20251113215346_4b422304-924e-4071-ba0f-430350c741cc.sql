-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policy: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy: only admins can insert/update/delete roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive, active, canceled, past_due
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create token_balances table
CREATE TABLE public.token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on token_balances
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for token_balances
CREATE POLICY "Users can view their own balance"
ON public.token_balances
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own balance"
ON public.token_balances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only system (via edge functions) can update balances
CREATE POLICY "Service role can update balances"
ON public.token_balances
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'image_generation', 'video_generation', 'vectorization'
  tokens_used NUMERIC NOT NULL DEFAULT 0,
  cost_breakdown JSONB, -- detailed cost info
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs"
ON public.usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert usage logs"
ON public.usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create trigger for updated_at on token_balances
CREATE TRIGGER update_token_balances_updated_at
BEFORE UPDATE ON public.token_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to initialize user subscription and token balance on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create subscription record
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'inactive');
  
  -- Create token balance record
  INSERT INTO public.token_balances (user_id, balance)
  VALUES (NEW.id, 0);
  
  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger to initialize subscription and balance for new users
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to check if user has active subscription or is admin
CREATE OR REPLACE FUNCTION public.can_use_service(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 
      FROM public.subscriptions 
      WHERE user_id = _user_id 
      AND status = 'active'
      AND current_period_end > now()
    )
$$;

-- Function to deduct tokens from user balance
CREATE OR REPLACE FUNCTION public.deduct_tokens(
  _user_id UUID,
  _amount NUMERIC,
  _job_id UUID,
  _action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Admins don't pay
  IF public.has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has active subscription
  IF NOT public.can_use_service(_user_id) THEN
    RAISE EXCEPTION 'No active subscription';
  END IF;
  
  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.token_balances
  WHERE user_id = _user_id;
  
  -- Check if sufficient balance
  IF current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;
  
  -- Deduct tokens
  UPDATE public.token_balances
  SET 
    balance = balance - _amount,
    total_spent = total_spent + _amount,
    updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log usage
  INSERT INTO public.usage_logs (user_id, job_id, action_type, tokens_used)
  VALUES (_user_id, _job_id, _action_type, _amount);
  
  RETURN TRUE;
END;
$$;