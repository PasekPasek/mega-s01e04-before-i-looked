import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (o: Record<string, unknown>) => JSON.stringify(o);

const ZETA = line({ at: '2026-10-28T01:00:00+01:00', job: 'zeta', status: 'ok', owner: null });
const ALPHA_RETRY = line({
  at: '2026-10-28T01:05:00+01:00',
  job: 'alpha',
  status: 'retry',
  owner: 'ana',
  error: 'timeout',
});
const ALPHA_OK = line({ at: '2026-10-28T01:10:00+01:00', job: 'alpha', status: 'ok', owner: 'ana' });

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, '2026-11-01.jsonl'), [ZETA, ALPHA_RETRY, ALPHA_OK].join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-11-03.jsonl'), [ZETA, '{not json', ALPHA_RETRY].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('200 with a table of the jobs', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<table>');
    expect(html).toContain('alpha');
    expect(html).toContain('zeta');
  });

  it('renders a null owner as a dash', async () => {
    const html = await (await app.request('/digest/2026-11-01')).text();
    expect(html).toContain('<td>—</td>');
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-11-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for this night');
  });

  it('empty night: 200 and "nothing ran"', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad line: 200, valid jobs render, the count is shown', async () => {
    const res = await app.request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('alpha');
    expect(html).toContain('zeta');
    expect(html).toContain('timeout');
    expect(html).toContain('1 line in the log didn');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with { night, rows, badLines }, rows sorted by job', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      night: '2026-11-01',
      rows: [
        {
          job: 'alpha',
          owner: 'ana',
          runs: 2,
          retries: 1,
          fails: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T01:05:00+01:00',
          lastAt: '2026-10-28T01:10:00+01:00',
        },
        {
          job: 'zeta',
          owner: null,
          runs: 1,
          retries: 0,
          fails: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T01:00:00+01:00',
          lastAt: '2026-10-28T01:00:00+01:00',
        },
      ],
      badLines: 0,
    });
  });

  it('404 with an error body for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-11-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for this night', night: '2026-11-09' });
  });

  it('empty night: rows [] and badLines 0', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-11-02', rows: [], badLines: 0 });
  });

  it('bad line: badLines 1 and the valid rows', async () => {
    const res = await app.request('/api/digest/2026-11-03');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'zeta']);
  });
});
