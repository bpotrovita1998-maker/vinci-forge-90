-- Update any users with incorrect free token grants to the correct limit of 5
UPDATE public.token_balances
SET free_tokens_granted = 5
WHERE free_tokens_granted != 5;