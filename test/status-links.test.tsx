import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board links', () => {
  it('links every night to a digest that renders, with counts', async () => {
    const app = createApp(config);
    const html = await (await app.request('/')).text();
    const hrefs = [...html.matchAll(/href="(\/digest\/[^"]+)"/g)].map((m) => m[1] as string);
    expect(hrefs).toHaveLength(2);
    for (const href of hrefs) {
      expect((await app.request(href)).status).toBe(200);
    }
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toContain('2026-10-28 ok 10 · retry 4 · fail 1');
    expect(text).toContain('2026-10-27 ok 7 · retry 0 · fail 0');
  });
});
