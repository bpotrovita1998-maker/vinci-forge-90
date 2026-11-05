COMMENT ON COLUMN public.token_balances.ad_generations_remaining IS 'DEPRECATED: ad system removed; leftover balance still spent by charge_generation until 0';
COMMENT ON COLUMN public.token_balances.ad_generations_total_earned IS 'DEPRECATED: ad system removed';
COMMENT ON FUNCTION public.grant_ad_generations(uuid, integer) IS 'DEPRECATED: ad system removed';
REVOKE EXECUTE ON FUNCTION public.grant_ad_generations(uuid, integer) FROM PUBLIC, anon, authenticated;