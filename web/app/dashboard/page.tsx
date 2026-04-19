import { loadPatterns, loadReport } from '@/lib/finance-data';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const [report, patterns] = await Promise.all([loadReport(), loadPatterns()]);

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">No data</h1>
        <p className="mt-2 text-neutral-600">
          Run the sync script from the project root (
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">
            npm start
          </code>
          ) to populate{' '}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">
            db/parsed_transactions.json
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <DashboardClient report={report} patterns={patterns} />
  );
}
