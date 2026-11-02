import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type NightCounts = { ok: number; retry: number; fail: number };

// Log lines per status in one night. Same parse rules as readNight:
// valid JSON with string at/job and a known status; anything else is ignored.
// Returns null when the night has no file.
export function countNight(runsDir: string, night: string): NightCounts | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim() === '') continue;
    let v: unknown;
    try {
      v = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof v !== 'object' || v === null) continue;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') continue;
    if (o.status === 'ok' || o.status === 'retry' || o.status === 'fail') counts[o.status]++;
  }
  return counts;
}
