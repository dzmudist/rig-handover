import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (at: string, job: string, status: string, owner: string | null = null) =>
  JSON.stringify({ at, job, status, owner, error: null });

// Written out of order on purpose: both routes must sort by job.
const normal = [
  line('2026-10-29T01:00:00+01:00', 'zeta/cleanup', 'ok'),
  line('2026-10-29T01:05:00+01:00', 'alpha/sync', 'retry', 'rook'),
  line('2026-10-29T01:10:00+01:00', 'alpha/sync', 'ok', 'rook'),
  line('2026-10-29T01:15:00+01:00', 'mid/backup', 'fail'),
];

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '2026-11-01.jsonl'), normal.join('\n') + '\n');
  writeFileSync(join(dir, '2026-11-02.jsonl'), '');
  writeFileSync(join(dir, '2026-11-03.jsonl'), [normal[0], 'not json at all', normal[3]].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const jobs = ['alpha/sync', 'mid/backup', 'zeta/cleanup'];

describe('GET /digest/:night', () => {
  it('200 with the jobs sorted', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    const at = jobs.map((j) => html.indexOf(j));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/1999-01-01')).status).toBe(404);
  });

  it('says nothing ran on an empty night', async () => {
    const res = await app.request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders with a bad line', async () => {
    const res = await app.request('/digest/2026-11-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('zeta/cleanup');
    expect(html).toContain('mid/backup');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with night, rows sorted, badLines 0', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe('2026-11-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(jobs);
  });

  it('404 JSON for a night with no file', async () => {
    const res = await app.request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    await expect(res.json()).resolves.toBeDefined();
  });

  it('empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ night: '2026-11-02', rows: [], badLines: 0 });
  });

  it('counts the bad line', async () => {
    const res = await app.request('/api/digest/2026-11-03');
    const body = (await res.json()) as { rows: unknown[]; badLines: number };
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-11-01')).text();
    const body = (await (await app.request('/api/digest/2026-11-01')).json()) as { rows: { job: string }[] };
    const apiJobs = body.rows.map((r) => r.job);
    const pageJobs = [...apiJobs].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(pageJobs).toEqual(apiJobs);
    expect(apiJobs).toEqual(jobs);
  });
});
