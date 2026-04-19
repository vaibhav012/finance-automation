import fs from 'fs/promises';
import path from 'path';
import type { PatternAccount, Report } from './types';

const PROJECT_ROOT =
  process.env.FINANCE_PROJECT_ROOT ?? path.join(process.cwd(), '..');

export async function loadReport(): Promise<Report | null> {
  const file = path.join(PROJECT_ROOT, 'db', 'parsed_transactions.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as Report;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'ENOENT') return null;
    throw e;
  }
}

export async function loadPatterns(): Promise<PatternAccount[]> {
  const file = path.join(PROJECT_ROOT, 'db', 'patterns.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as PatternAccount[];
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'ENOENT') return [];
    throw e;
  }
}
