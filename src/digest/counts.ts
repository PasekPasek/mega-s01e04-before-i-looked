import type { DigestRow } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Run lines per status. Bad lines are not in rows, so they are in none of the three.
export function countRows(rows: readonly DigestRow[]): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) {
    counts.retry += r.retries;
    counts.fail += r.fails;
    counts.ok += r.runs - r.retries - r.fails;
  }
  return counts;
}
