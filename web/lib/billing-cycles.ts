/** Statement close times (end of billing day) around `now` for a given statement day of month. */
function statementCloseTimes(now: Date, billingDay: number, span = 8): number[] {
  const day = Math.min(31, Math.max(1, billingDay));
  const out: number[] = [];
  for (let i = -span; i <= span; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const dom = Math.min(day, last);
    out.push(new Date(y, m, dom, 23, 59, 59, 999).getTime());
  }
  return out.sort((a, b) => a - b);
}

/**
 * While `now` falls strictly after one statement close and on/before the next,
 * returns open cycle (lastClose, nextClose] and the prior billing cycle.
 */
export function getCycleRanges(
  now: Date,
  billingDay: number
): {
  current: { start: number; end: number };
  last: { start: number; end: number };
} | null {
  const closes = statementCloseTimes(now, billingDay);
  const t = now.getTime();
  for (let i = 0; i < closes.length - 1; i++) {
    if (t > closes[i] && t <= closes[i + 1]) {
      const current = { start: closes[i], end: closes[i + 1] };
      const last =
        i > 0 ? { start: closes[i - 1], end: closes[i] } : current;
      return { current, last };
    }
  }
  return null;
}
