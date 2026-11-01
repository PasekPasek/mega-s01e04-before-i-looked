import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28')!;

  it('gives 5 jobs, sorted by job, and counts the 1 bad line', () => {
    expect(night.night).toBe('2026-10-28');
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries and keeps the last status', () => {
    const row = night.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(row).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null, owner: 'rook' });
    expect(row.firstAt).toBe('2026-10-29T01:30:00+01:00');
    expect(row.lastAt).toBe('2026-10-29T01:37:00+01:00');
  });

  it('keeps the last error of a failed job', () => {
    const row = night.rows.find((r) => r.job === 'notes/backup')!;
    expect(row).toMatchObject({ runs: 1, fails: 1, lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
  });

  it('keeps a row whose owner is null', () => {
    expect(night.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, '2026-01-01.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-02.jsonl'),
    [
      '{"at":"t1","job":"a","status":"ok","owner":"x"}',
      'not json',
      '{"at":"t2","job":"a","status":"weird","owner":"x"}',
      '{"job":"b","status":"ok","owner":"x"}',
      '',
      '{"at":"t3","job":"a","status":"retry","owner":null,"error":"boom"}',
    ].join('\n') + '\n',
  );

  it('returns null for a night with no file', () => {
    expect(readNight(dir, '2026-01-03')).toBeNull();
  });

  it('returns null for a night that is not a date', () => {
    expect(readNight(dir, '../2026-01-01')).toBeNull();
  });

  it('gives no rows for an empty file', () => {
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts lines that do not parse or lack fields, skips blank lines', () => {
    const night = readNight(dir, '2026-01-02')!;
    expect(night.badLines).toBe(3);
    expect(night.rows).toEqual([
      { job: 'a', owner: null, runs: 2, retries: 1, fails: 0, lastStatus: 'retry', lastError: 'boom', firstAt: 't1', lastAt: 't3' },
    ]);
  });
});
