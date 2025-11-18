-- Remove storage limit by setting it to a very high value (1 TB = 1099511627776 bytes)
-- Or effectively unlimited for admin users
UPDATE token_balances 
SET storage_limit_bytes = 1099511627776
WHERE user_id = 'c71c0c60-42a1-4e9e-958b-372cda709edf';