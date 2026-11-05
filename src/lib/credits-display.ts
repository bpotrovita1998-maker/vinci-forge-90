export interface FreeGenerationCounts {
  free_tokens_granted?: number | null;
  free_tokens_used?: number | null;
  ad_generations_remaining?: number | null;
}

/** Formats a credit amount the European way, e.g. 1.250 or 12,5. */
export const formatCredits = (value: number): string =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value);

/** Remaining free image generations (welcome gift + any leftover ad generations from the retired ad system). Never negative. */
export const remainingFreeGenerations = (counts: FreeGenerationCounts | null | undefined): number => {
  if (!counts) return 0;
  const welcome = Math.max((counts.free_tokens_granted ?? 0) - (counts.free_tokens_used ?? 0), 0);
  const ads = Math.max(counts.ad_generations_remaining ?? 0, 0);
  return welcome + ads;
};

/** Short label for the top bar, e.g. "7 free images". Empty when none are left. */
export const freeGenerationsLabel = (counts: FreeGenerationCounts | null | undefined): string => {
  const remaining = remainingFreeGenerations(counts);
  if (remaining === 0) return '';
  return `${formatCredits(remaining)} free ${remaining === 1 ? 'image' : 'images'}`;
};
