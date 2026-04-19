import type { PatternAccount } from './types';

export function accountDerivedId(acc: PatternAccount): string {
  return `${acc.name}_${acc.type}_${acc.ending_number}`.toLowerCase();
}
