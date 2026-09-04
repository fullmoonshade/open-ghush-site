const HOT_AGE_OFFSET_HOURS = 2;
const HOT_GRAVITY = 1.5;

/**
 * Ranks reports by confirmation activity while allowing older reports to cool.
 * The +1 gives unconfirmed new reports a chance to surface; the age offset
 * prevents brand-new reports from receiving an infinite score.
 */
export function calculateHotScore(
  confirmationCount: number,
  createdAt: string,
  nowMs = Date.now(),
): number {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return Number.NEGATIVE_INFINITY;

  const confirmations = Number.isFinite(confirmationCount)
    ? Math.max(0, confirmationCount)
    : 0;
  const ageHours = Math.max(0, (nowMs - createdAtMs) / 3_600_000);

  return (confirmations + 1) / Math.pow(ageHours + HOT_AGE_OFFSET_HOURS, HOT_GRAVITY);
}
