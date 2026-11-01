// The digest of one night's run log (plan: morning-digest, § 1).
// Every part of § 2 builds against this file only.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in runs/<night>.jsonl.
export type DigestRow = {
  job: string;
  /** Owner on the job's last line. `null` is kept; views show it as `—`. */
  owner: string | null;
  /** Lines for this job. */
  runs: number;
  /** Lines for this job with status `retry`. */
  retries: number;
  /** Lines for this job with status `fail`. */
  fails: number;
  lastStatus: JobStatus;
  /** `error` of the job's last line, `null` when it has none. */
  lastError: string | null;
  /** `at` of the job's first and last line, as written in the log. */
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  /** Sorted by job, so the page and the JSON share one order (ADR 0001). */
  rows: DigestRow[];
  /** Lines that didn't parse as a run line. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads `<runsDir>/<night>.jsonl`. `night` is `YYYY-MM-DD`.
 * Returns `null` when the night has no file (or `night` isn't a date): routes answer 404.
 * An empty file gives `rows: []`.
 */
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
