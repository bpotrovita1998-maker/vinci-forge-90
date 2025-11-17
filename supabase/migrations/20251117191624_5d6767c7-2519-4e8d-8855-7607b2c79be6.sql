-- Fix security: Set search_path on functions
CREATE OR REPLACE FUNCTION set_admin_files_permanent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set all files for admin user (c71c0c60-42a1-4e9e-958b-372cda709edf) to never expire
  UPDATE user_files
  SET expires_at = NULL
  WHERE user_id = 'c71c0c60-42a1-4e9e-958b-372cda709edf'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION make_admin_files_permanent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin (c71c0c60-42a1-4e9e-958b-372cda709edf)
  IF NEW.user_id = 'c71c0c60-42a1-4e9e-958b-372cda709edf'::uuid THEN
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;