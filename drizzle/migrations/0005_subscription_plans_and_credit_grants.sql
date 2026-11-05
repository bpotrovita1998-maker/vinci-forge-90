ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

CREATE TABLE public.credit_grants (
  ref text PRIMARY KEY,
  user_id uuid NOT NULL,
  credits numeric NOT NULL CHECK (credits > 0),
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_grants TO authenticated;
GRANT ALL ON public.credit_grants TO service_role;
ALTER TABLE public.credit_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own credit grants" ON public.credit_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _ref text, _credits numeric, _kind text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _credits IS NULL OR _credits <= 0 OR _ref IS NULL OR length(_ref) = 0 THEN
    RAISE EXCEPTION 'Invalid credit grant';
  END IF;
  INSERT INTO public.credit_grants (ref, user_id, credits, kind)
  VALUES (_ref, _user_id, _credits, _kind)
  ON CONFLICT (ref) DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO public.token_balances (user_id, balance, total_purchased)
  VALUES (_user_id, _credits, _credits)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = token_balances.balance + _credits,
      total_purchased = token_balances.total_purchased + _credits,
      updated_at = now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_credits(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, text, numeric, text) TO service_role;

COMMENT ON TABLE public.storage_subscriptions IS 'DEPRECATED: storage is now included in subscriptions.plan';