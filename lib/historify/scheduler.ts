import schedule from 'node-schedule';

/**
 * Scheduler — cron-based jobs for all data sync operations.
 *
 * Job types:
 * - historify:    Equity OHLCV to Parquet (existing)
 * - bhavcopy:     NSE bhavcopy EOD sync
 * - dhan-daily:   Dhan historical cache warmup from bhavcopy-backed dates
 * - master:       Dhan master contracts refresh
 * - backtest:     5-min equity + futures + options for TF stocks
 * - rfactor:      R-Factor recomputation trigger
 *
 * Templates:
 * - Post-Market EOD (3:35 PM) — bhavcopy + historify daily
 * - Dhan Daily Cache (3:50 PM) — scalable Dhan catch-up for missing bhavcopy dates
 * - Pre-Market Prep (8:30 AM) — master contracts refresh
 * - Backtest Data (3:45 PM) — 5-min data for TF trade stocks
 * - Market Hours R-Factor (every 5 min) — live R-Factor refresh
 */

export type JobType = 'historify' | 'bhavcopy' | 'master' | 'backtest' | 'backtest-all' | 'rfactor' | 'dhan-daily';

export type JobConfig = {
  id: string;
  name: string;
  type: 'daily' | 'interval';
  jobType: JobType;
  time?: string; // IST time "HH:MM"
  intervalMinutes?: number;
  dataInterval?: string; // For historify: "Daily" | "5min"
  symbols?: string[]; // For historify: specific symbols
  enabled: boolean;
};

export type JobState = JobConfig & {
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  lastResult: string;
  nextRun: string;
};

// In-memory runtime cache backed by SQLite persistence.
const g = globalThis as unknown as {
  __schedulerJobs?: JobState[];
  __schedulerActive?: Record<string, schedule.Job>;
  __schedulerLoaded?: boolean;
  __schedulerInitPromise?: Promise<void>;
};

function getJobs(): JobState[] {
  if (!g.__schedulerJobs) g.__schedulerJobs = [];
  return g.__schedulerJobs;
}

function getActive(): Record<string, schedule.Job> {
  if (!g.__schedulerActive) g.__schedulerActive = {};
  return g.__schedulerActive;
}

function isLoaded(): boolean {
  return g.__schedulerLoaded === true;
}

function markLoaded(): void {
  g.__schedulerLoaded = true;
}

function getCronFromIST(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${minutes} ${hours} * * 1-5`; // Mon-Fri
}

const ENSURE_SCHEDULER_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    jobType TEXT NOT NULL,
    time TEXT,
    intervalMinutes INTEGER,
    dataInterval TEXT,
    symbolsJson TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    lastRun TEXT NOT NULL DEFAULT 'Never',
    lastResult TEXT NOT NULL DEFAULT '',
    nextRun TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

async function ensureSchedulerTable() {
  const { prisma } = await import('@/lib/db');
  await prisma.$executeRawUnsafe(ENSURE_SCHEDULER_TABLE_SQL);
}

function serializeJob(state: JobState) {
  return {
    id: state.id,
    name: state.name,
    type: state.type,
    jobType: state.jobType,
    time: state.time ?? null,
    intervalMinutes: state.intervalMinutes ?? null,
    dataInterval: state.dataInterval ?? null,
    symbolsJson: JSON.stringify(state.symbols ?? []),
    enabled: state.enabled ? 1 : 0,
    status: state.status,
    lastRun: state.lastRun,
    lastResult: state.lastResult,
    nextRun: state.nextRun,
  };
}

type SchedulerJobRow = {
  id: string;
  name: string;
  type: JobConfig['type'];
  jobType: JobType;
  time: string | null;
  intervalMinutes: number | null;
  dataInterval: string | null;
  symbolsJson: string | null;
  enabled: number;
  status: JobState['status'];
  lastRun: string;
  lastResult: string;
  nextRun: string;
};

function deserializeJob(row: SchedulerJobRow): JobState {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    jobType: row.jobType,
    time: row.time ?? undefined,
    intervalMinutes: row.intervalMinutes ?? undefined,
    dataInterval: row.dataInterval ?? undefined,
    symbols: row.symbolsJson ? (JSON.parse(row.symbolsJson) as string[]) : undefined,
    enabled: row.enabled === 1,
    status: row.enabled === 1 ? row.status : 'paused',
    lastRun: row.lastRun,
    lastResult: row.lastResult,
    nextRun: row.nextRun,
  };
}

async function persistJob(state: JobState): Promise<void> {
  await ensureSchedulerTable();
  const { prisma } = await import('@/lib/db');
  const data = serializeJob(state);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO scheduler_jobs
        (id, name, type, jobType, time, intervalMinutes, dataInterval, symbolsJson, enabled, status, lastRun, lastResult, nextRun, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        jobType = excluded.jobType,
        time = excluded.time,
        intervalMinutes = excluded.intervalMinutes,
        dataInterval = excluded.dataInterval,
        symbolsJson = excluded.symbolsJson,
        enabled = excluded.enabled,
        status = excluded.status,
        lastRun = excluded.lastRun,
        lastResult = excluded.lastResult,
        nextRun = excluded.nextRun,
        updatedAt = CURRENT_TIMESTAMP
    `,
    data.id,
    data.name,
    data.type,
    data.jobType,
    data.time,
    data.intervalMinutes,
    data.dataInterval,
    data.symbolsJson,
    data.enabled,
    data.status,
    data.lastRun,
    data.lastResult,
    data.nextRun,
  );
}

async function removePersistedJob(id: string): Promise<void> {
  await ensureSchedulerTable();
  const { prisma } = await import('@/lib/db');
  await prisma.$executeRawUnsafe('DELETE FROM scheduler_jobs WHERE id = ?', id);
}

function scheduleState(state: JobState): void {
  const active = getActive();
  active[state.id]?.cancel();
  delete active[state.id];

  if (!state.enabled) {
    state.status = 'paused';
    state.nextRun = '';
    return;
  }

  let cronExpr = '';
  if (state.type === 'daily' && state.time) {
    cronExpr = getCronFromIST(state.time);
  } else if (state.type === 'interval' && state.intervalMinutes) {
    cronExpr = `*/${state.intervalMinutes} 9-15 * * 1-5`;
  }

  if (!cronExpr) {
    state.nextRun = '';
    return;
  }

  const job = schedule.scheduleJob(cronExpr, async () => {
    console.log(`[Scheduler] Executing: ${state.name} (${state.jobType})`);
    state.lastRun = new Date().toISOString();
    state.status = 'active';

    try {
      state.lastResult = await executeJob(state);
      console.log(`[Scheduler] ${state.name}: ${state.lastResult}`);
    } catch (err) {
      state.status = 'error';
      state.lastResult = `Error: ${(err as Error).message}`;
      console.error(`[Scheduler] ${state.name} failed:`, err);
    }

    const next = active[state.id]?.nextInvocation();
    state.nextRun = next ? next.toISOString() : '';
    await persistJob(state);
  });

  active[state.id] = job;
  const next = job.nextInvocation();
  state.nextRun = next ? next.toISOString() : '';
}

export async function ensureSchedulerLoaded(): Promise<void> {
  if (isLoaded()) return;
  if (!g.__schedulerInitPromise) {
    g.__schedulerInitPromise = (async () => {
      await ensureSchedulerTable();
      const { prisma } = await import('@/lib/db');
      const rows = await prisma.$queryRawUnsafe<SchedulerJobRow[]>(
        'SELECT id, name, type, jobType, time, intervalMinutes, dataInterval, symbolsJson, enabled, status, lastRun, lastResult, nextRun FROM scheduler_jobs ORDER BY createdAt ASC, id ASC',
      );

      const jobs = getJobs();
      jobs.splice(0, jobs.length);

      for (const row of rows) {
        const state = deserializeJob(row);
        jobs.push(state);
        scheduleState(state);
      }

      markLoaded();
    })();
  }

  await g.__schedulerInitPromise;
}

/** Execute a job based on its type */
async function executeJob(config: JobState): Promise<string> {
  const baseUrl = 'http://localhost:5000';

  switch (config.jobType) {
    case 'historify': {
      // Sync equity OHLCV to Parquet
      const symbols = config.symbols ?? ['RELIANCE', 'HDFCBANK', 'TCS', 'INFY', 'SBIN'];
      let totalRows = 0;
      for (const sym of symbols) {
        const res = await fetch(`${baseUrl}/api/historify/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [sym], interval: config.dataInterval ?? 'Daily', exchange: 'NSE' }),
        });
        if (res.ok) {
          const data = await res.json();
          totalRows += data.totalRows ?? 0;
        }
      }
      return `Synced ${totalRows} rows for ${symbols.length} symbols`;
    }

    case 'bhavcopy': {
      // Trigger NSE bhavcopy download
      const res = await fetch(`${baseUrl}/api/bhavcopy/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`Bhavcopy sync failed: ${res.status}`);
      const data = await res.json();
      return `Bhavcopy: ${data.message ?? 'synced'}`;
    }

    case 'master': {
      // Re-sync Dhan master contracts
      const res = await fetch(`${baseUrl}/api/master-contracts/sync`, { method: 'POST' });
      if (!res.ok) throw new Error(`Master sync failed: ${res.status}`);
      const data = await res.json();
      return `Master contracts: ${data.count ?? 0} rows in ${data.elapsed ?? '?'}`;
    }

    case 'dhan-daily': {
      // Cache scalable Dhan history for any bhavcopy dates not yet computed
      const res = await fetch(`${baseUrl}/api/bhav-dhan-compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compute-dhan-missing' }),
      });
      if (!res.ok) throw new Error(`Dhan daily sync failed: ${res.status}`);
      const data = await res.json();
      return `Dhan cache: ${data.processedDates ?? 0} dates, ${data.computed ?? 0} rows, ${data.failed ?? 0} failures`;
    }

    case 'backtest': {
      // Download 5-min backtest data for TF stocks
      const res = await fetch(`${baseUrl}/api/backtest/tf-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' }),
      });
      if (!res.ok) throw new Error(`Backtest download failed: ${res.status}`);
      const data = await res.json();
      return `Backtest: ${data.totalRows ?? 0} rows, ${data.errors?.length ?? 0} errors`;
    }

    case 'backtest-all': {
      // Download ALL TF stocks (158 symbols) — equity + futures + options
      const res = await fetch(`${baseUrl}/api/backtest/tf-validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download-all-tf' }),
      });
      if (!res.ok) throw new Error(`Backtest-all download failed: ${res.status}`);
      const data = await res.json();
      return `All TF stocks: ${data.downloaded ?? 0} symbols, ${data.total ?? 0} rows, ${data.errors?.length ?? 0} errors`;
    }

    case 'rfactor': {
      // Trigger R-Factor recomputation (just hit the API to warm cache)
      const res = await fetch(`${baseUrl}/api/r-factor?mode=past`);
      if (!res.ok) throw new Error(`R-Factor refresh failed: ${res.status}`);
      const data = await res.json();
      return `R-Factor: ${data.count ?? 0} stocks computed`;
    }

    default:
      return `Unknown job type: ${config.jobType}`;
  }
}

/** Create and schedule a job */
export async function createJob(config: JobConfig): Promise<JobState> {
  await ensureSchedulerLoaded();
  const jobs = getJobs();

  // Remove existing job with same ID
  const existingIdx = jobs.findIndex((j) => j.id === config.id);
  if (existingIdx >= 0) {
    getActive()[config.id]?.cancel();
    delete getActive()[config.id];
    jobs.splice(existingIdx, 1);
  }

  const state: JobState = {
    ...config,
    status: config.enabled ? 'active' : 'paused',
    lastRun: 'Never',
    lastResult: '',
    nextRun: '',
  };

  jobs.push(state);

  scheduleState(state);
  await persistJob(state);
  return state;
}

/** Delete a job */
export async function deleteJob(id: string): Promise<boolean> {
  await ensureSchedulerLoaded();
  const jobs = getJobs();
  const active = getActive();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  active[id]?.cancel();
  delete active[id];
  jobs.splice(idx, 1);
  await removePersistedJob(id);
  return true;
}

/** Pause/resume a job */
export async function toggleJob(id: string): Promise<JobState | null> {
  await ensureSchedulerLoaded();
  const jobs = getJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;

  if (job.status === 'active' || job.status === 'error') {
    getActive()[id]?.cancel();
    delete getActive()[id];
    job.enabled = false;
    job.status = 'paused';
    job.nextRun = '';
  } else {
    job.enabled = true;
    job.status = 'active';
    scheduleState(job);
  }
  await persistJob(job);
  return job;
}

/** Get all jobs */
export async function getAllJobs(): Promise<JobState[]> {
  await ensureSchedulerLoaded();
  return getJobs();
}

/** Run a job immediately (one-shot) */
export async function runJobNow(id: string): Promise<string> {
  await ensureSchedulerLoaded();
  const jobs = getJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) return 'Job not found';

  job.lastRun = new Date().toISOString();
  try {
    job.lastResult = await executeJob(job);
    return job.lastResult;
  } catch (err) {
    job.status = 'error';
    job.lastResult = `Error: ${(err as Error).message}`;
  }
  await persistJob(job);
  return job.lastResult;
}

// ─── Pre-built Templates ──────────────────────────────────────────────────

export const JOB_TEMPLATES: { name: string; description: string; config: Omit<JobConfig, 'id'> }[] = [
  {
    name: 'Post-Market EOD Sync',
    description: 'Sync NSE bhavcopy after market close (3:35 PM IST)',
    config: {
      name: 'Post-Market EOD Sync',
      type: 'daily',
      jobType: 'bhavcopy',
      time: '15:35',
      enabled: true,
    },
  },
  {
    name: 'Pre-Market Instruments',
    description: 'Refresh Dhan master contracts before market open (8:30 AM IST)',
    config: {
      name: 'Pre-Market Instruments',
      type: 'daily',
      jobType: 'master',
      time: '08:30',
      enabled: true,
    },
  },
  {
    name: 'Dhan Historical Cache',
    description: 'Fill missing Dhan daily history for bhavcopy dates after EOD sync (3:50 PM IST)',
    config: {
      name: 'Dhan Historical Cache',
      type: 'daily',
      jobType: 'dhan-daily',
      time: '15:50',
      enabled: false,
    },
  },
  {
    name: 'Backtest Data Sync',
    description: 'Download 5-min equity + futures + options for TF stocks (3:45 PM IST)',
    config: {
      name: 'Backtest Data Sync',
      type: 'daily',
      jobType: 'backtest',
      time: '15:45',
      enabled: true,
    },
  },
  {
    name: 'Daily Historify Sync',
    description: 'Sync daily OHLCV to Parquet for watchlist (4:00 PM IST)',
    config: {
      name: 'Daily Historify Sync',
      type: 'daily',
      jobType: 'historify',
      time: '16:00',
      dataInterval: 'Daily',
      enabled: true,
    },
  },
  {
    name: 'Intraday 5-min Sync',
    description: 'Sync 5-min candles to Parquet for watchlist (3:40 PM IST)',
    config: {
      name: 'Intraday 5-min Sync',
      type: 'daily',
      jobType: 'historify',
      time: '15:40',
      dataInterval: '5min',
      enabled: true,
    },
  },
  {
    name: 'All TF Stocks Download',
    description: 'Download 5-min data for ALL 158 TF trade stocks (equity + futures + options). ~30 min.',
    config: {
      name: 'All TF Stocks Download',
      type: 'daily',
      jobType: 'backtest-all',
      time: '16:30',
      enabled: false, // Manual trigger recommended — takes 30+ min
    },
  },
  {
    name: 'R-Factor Refresh',
    description: 'Recompute R-Factor rankings every 5 min during market hours',
    config: {
      name: 'R-Factor Refresh',
      type: 'interval',
      jobType: 'rfactor',
      intervalMinutes: 5,
      enabled: false, // Disabled by default — only enable if needed
    },
  },
];
