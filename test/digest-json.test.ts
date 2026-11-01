import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest json', () => {
  it('lists the same jobs as the page, in the same order', async () => {
    const app = createApp(config);
    const page = await app.request('/digest/2026-10-28');
    const api = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const html = await page.text();
    const digest = (await api.json()) as NightDigest;
    expect(digest.night).toBe('2026-10-28');
    expect(digest.rows.length).toBeGreaterThan(0);
    const positions = digest.rows.map((r) => html.indexOf(`<td>${r.job}</td>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('answers 404 with an error body for a night without a log', async () => {
    const res = await createApp(config).request('/api/digest/2020-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for this night', night: '2020-01-01' });
  });
});
