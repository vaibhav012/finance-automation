function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function endOfStatementDay(year: number, month: number, billingDay: number): Date {
  const dim = daysInMonth(year, month);
  const d = Math.min(billingDay, dim);
  return new Date(year, month, d, 23, 59, 59, 999);
}

/** Most recent statement closing date (end of that calendar day) on or before `now`. */
export function lastStatementOnOrBefore(now: Date, billingDay: number): Date {
  const bd = Math.max(1, Math.min(31, billingDay));
  const y = now.getFullYear();
  const m = now.getMonth();
  for (let back = 0; back < 48; back++) {
    const mm = m - back;
    const yy = y + Math.floor(mm / 12);
    const month = ((mm % 12) + 12) % 12;
    const candidate = endOfStatementDay(yy, month, bd);
    if (candidate <= now) return candidate;
  }
  return endOfStatementDay(y, m, bd);
}

export function nextStatementAfter(lastStmt: Date, billingDay: number): Date {
  const bd = Math.max(1, Math.min(31, billingDay));
  let y = lastStmt.getFullYear();
  let m = lastStmt.getMonth() + 1;
  if (m > 11) {
    m = 0;
    y++;
  }
  return endOfStatementDay(y, m, bd);
}

function prevStatementBefore(stmt: Date, billingDay: number): Date {
  const bd = Math.max(1, Math.min(31, billingDay));
  let y = stmt.getFullYear();
  let m = stmt.getMonth() - 1;
  if (m < 0) {
    m = 11;
    y--;
  }
  return endOfStatementDay(y, m, bd);
}

function startOfDayAfter(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function getCurrentCycleRange(
  now: Date,
  billingDay: number
): { start: Date; end: Date } {
  const lastClosed = lastStatementOnOrBefore(now, billingDay);
  const cycleEnd = nextStatementAfter(lastClosed, billingDay);
  const cycleStart = startOfDayAfter(lastClosed);
  return { start: cycleStart, end: cycleEnd };
}

export function getLastCycleRange(
  now: Date,
  billingDay: number
): { start: Date; end: Date } {
  const lastClosed = lastStatementOnOrBefore(now, billingDay);
  const prevClosed = prevStatementBefore(lastClosed, billingDay);
  const cycleEnd = lastClosed;
  const cycleStart = startOfDayAfter(prevClosed);
  return { start: cycleStart, end: cycleEnd };
}
