'use client';

import { useMemo, useState } from 'react';
import { accountDerivedId } from '@/lib/derive';
import { getCurrentCycleRange, getLastCycleRange } from '@/lib/billing';
import type { PatternAccount, Report, Transaction } from '@/lib/types';

type TimeRange = 'all' | 'current' | 'last';

function txEpochMs(t: Transaction): number | null {
  if (t.dateEpoch != null && String(t.dateEpoch).trim() !== '') {
    const n = Number(t.dateEpoch);
    if (!Number.isNaN(n)) return n;
  }
  if (t.dateParsed) {
    const ms = Date.parse(t.dateParsed);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

function billingDayForAccount(
  accountIdLower: string,
  patterns: PatternAccount[]
): number {
  const p = patterns.find((a) => accountDerivedId(a) === accountIdLower);
  const raw = p?.billing_date;
  const n = raw != null ? parseInt(String(raw), 10) : NaN;
  if (!Number.isNaN(n) && n >= 1 && n <= 31) return n;
  return 1;
}

function chipClasses(active: boolean) {
  return active
    ? 'border-neutral-900 bg-neutral-900 text-white'
    : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50';
}

export default function DashboardClient({
  report,
  patterns
}: {
  report: Report;
  patterns: PatternAccount[];
}) {
  const [accountId, setAccountId] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const now = useMemo(() => new Date(), []);

  const cycleHint = useMemo(() => {
    if (timeRange === 'all') return '';
    const bd =
      accountId === 'ALL'
        ? patterns[0]
          ? billingDayForAccount(accountDerivedId(patterns[0]), patterns)
          : 1
        : billingDayForAccount(accountId, patterns);
    if (timeRange === 'current') {
      const { start, end } = getCurrentCycleRange(now, bd);
      return `Current cycle: ${start.toLocaleDateString()} – ${end.toLocaleDateString()} (billing day ${bd}).`;
    }
    const { start, end } = getLastCycleRange(now, bd);
    return `Last cycle: ${start.toLocaleDateString()} – ${end.toLocaleDateString()} (billing day ${bd}).`;
  }, [timeRange, accountId, patterns, now]);

  const visible = useMemo(() => {
    return report.transactions.filter((t) => {
      const id = `${t.accountId}`.toLowerCase();
      if (accountId !== 'ALL' && id !== accountId) return false;

      if (timeRange === 'all') return true;

      const ms = txEpochMs(t);
      if (ms == null) return false;

      const bd = billingDayForAccount(id, patterns);
      const range =
        timeRange === 'current'
          ? getCurrentCycleRange(now, bd)
          : getLastCycleRange(now, bd);
      return ms >= range.start.getTime() && ms <= range.end.getTime();
    });
  }, [report.transactions, accountId, timeRange, patterns, now]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Transaction Ledger
        </h1>
        <p className="text-right text-sm text-neutral-500">
          Last updated:{' '}
          {new Date(report.reportDate).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </p>
      </div>

      <section className="mb-4">
        <h2 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-neutral-500">
          Time range
        </h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'All'],
              ['current', 'Current Billing Cycle'],
              ['last', 'Last Billing Cycle']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeRange(key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${chipClasses(timeRange === key)}`}
            >
              {label}
            </button>
          ))}
        </div>
        {cycleHint ? (
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">{cycleHint}</p>
        ) : null}
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-neutral-500">
          Filter by account
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAccountId('ALL')}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${chipClasses(accountId === 'ALL')}`}
          >
            All Transactions
          </button>
          {patterns.map((acc, idx) => {
            const id = accountDerivedId(acc);
            return (
              <button
                key={`${id}-${idx}`}
                type="button"
                onClick={() => setAccountId(id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${chipClasses(accountId === id)}`}
              >
                {acc.name} ({acc.type})
              </button>
            );
          })}
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((t, i) => {
                const rowId = `${t.accountId}`.toLowerCase();
                return (
                  <tr
                    key={`${rowId}-${i}-${t.date ?? t.dateEpoch ?? ''}`}
                    className="transition-opacity hover:bg-neutral-50/80"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-800">
                        {t.bank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          t.type === 'Spent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">
                      {t.amount ? `₹${t.amount}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {t.merchant || t.account || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {t.date ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {t.card ? `xx${t.card}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            No transactions match the selected filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
