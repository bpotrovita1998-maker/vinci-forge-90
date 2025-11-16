-- Update the handle_new_user_subscription function to grant 5 free tokens for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create subscription record
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'inactive')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Grant 5 free tokens to new users (for image generation)
  INSERT INTO public.token_balances (
    user_id, 
    balance, 
    free_tokens_granted,
    free_tokens_used
  )
  VALUES (NEW.id, 0, 5, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;