-- Update storage limit from 8GB to 32GB
-- 32GB = 34359738368 bytes

-- Update the default value for new users
ALTER TABLE public.token_balances 
ALTER COLUMN storage_limit_bytes SET DEFAULT 34359738368;

-- Update existing users to have 32GB storage
UPDATE public.token_balances 
SET storage_limit_bytes = 34359738368 
WHERE storage_limit_bytes = 8589934592;