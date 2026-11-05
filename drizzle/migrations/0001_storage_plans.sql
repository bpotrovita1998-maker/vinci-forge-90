CREATE TABLE public.storage_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  quota_bytes bigint NOT NULL DEFAULT 2147483648,
  status text NOT NULL DEFAULT 'active',
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.storage_subscriptions TO authenticated;
GRANT ALL ON public.storage_subscriptions TO service_role;
ALTER TABLE public.storage_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own storage plan" ON public.storage_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_storage_usage(_user_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects
  WHERE name LIKE _user_id::text || '/%' OR owner = _user_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_storage_usage(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_storage_usage(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_storage_usage()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$ SELECT public.get_storage_usage(auth.uid()) $$;
REVOKE EXECUTE ON FUNCTION public.get_my_storage_usage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_storage_usage() TO authenticated;