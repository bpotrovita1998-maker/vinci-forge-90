-- Add past_due status support for subscriptions
-- This allows tracking when subscription payments fail

-- First check if the constraint exists and update it
DO $$ 
BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name LIKE '%subscriptions%status%'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
  END IF;
  
  -- Add new constraint with past_due status
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('active', 'inactive', 'past_due'));
END $$;