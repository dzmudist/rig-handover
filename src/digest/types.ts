export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // render null as "—"
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string; // `at` as written in the log, offset kept
  last: string;
};

export type Digest = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted not thrown
};

// Reads <runsDir>/<night>.jsonl. Returns null when the file does not exist.
export type ReadNight = (runsDir: string, night: string) => Digest | null;
