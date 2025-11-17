-- Add indexes to improve job query performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_completed_at ON jobs(user_id, completed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Add indexes for user_files queries
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_job_id ON user_files(job_id);
CREATE INDEX IF NOT EXISTS idx_user_files_expires_at ON user_files(expires_at);

-- Function to set admin files to never expire
CREATE OR REPLACE FUNCTION set_admin_files_permanent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set all files for admin user (c71c0c60-42a1-4e9e-958b-372cda709edf) to never expire
  UPDATE user_files
  SET expires_at = NULL
  WHERE user_id = 'c71c0c60-42a1-4e9e-958b-372cda709edf'::uuid;
END;
$$;

-- Execute the function to set admin files as permanent
SELECT set_admin_files_permanent();

-- Create trigger to automatically set admin files to never expire on insert
CREATE OR REPLACE FUNCTION make_admin_files_permanent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin (c71c0c60-42a1-4e9e-958b-372cda709edf)
  IF NEW.user_id = 'c71c0c60-42a1-4e9e-958b-372cda709edf'::uuid THEN
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_make_admin_files_permanent
  BEFORE INSERT OR UPDATE ON user_files
  FOR EACH ROW
  EXECUTE FUNCTION make_admin_files_permanent();