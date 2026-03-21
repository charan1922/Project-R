import schedule from 'node-schedule';

/**
 * Scheduler — cron-based jobs for all data sync operations.
 *
 * Job types:
 * - historify:    Equity OHLCV to Parquet (existing)
 * - bhavcopy:     NSE bhavcopy EOD sync
 * - master:       Dhan master contracts refresh
 * - backtest:     5-min equity + futures + options for TF stocks
 * - rfactor:      R-Factor recomputation trigger
 *
 * Templates:
 * - Post-Market EOD (3:35 PM) — bhavcopy + historify daily
 * - Pre-Market Prep (8:30 AM) — master contracts refresh
 * - Backtest Data (3:45 PM) — 5-min data for TF trade stocks
 * - Market Hours R-Factor (every 5 min) — live R-Factor refresh
 */

export type JobType = 'historify' | 'bhavcopy' | 'master' | 'backtest' | 'backtest-all' | 'rfactor';

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

// In-memory store (survives within process, lost on restart)
const g = globalThis as unknown as {
  __schedulerJobs?: JobState[];
  __schedulerActive?: Record<string, schedule.Job>;
};

function getJobs(): JobState[] {
  if (!g.__schedulerJobs) g.__schedulerJobs = [];
  return g.__schedulerJobs;
}

function getActive(): Record<string, schedule.Job> {
  if (!g.__schedulerActive) g.__schedulerActive = {};
  return g.__schedulerActive;
}

function getCronFromIST(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${minutes} ${hours} * * 1-5`; // Mon-Fri
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
export function createJob(config: JobConfig): JobState {
  const jobs = getJobs();
  const active = getActive();

  // Remove existing job with same ID
  const existingIdx = jobs.findIndex((j) => j.id === config.id);
  if (existingIdx >= 0) {
    active[config.id]?.cancel();
    delete active[config.id];
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

  if (!config.enabled) return state;

  // Build cron expression
  let cronExpr = '';
  if (config.type === 'daily' && config.time) {
    cronExpr = getCronFromIST(config.time);
  } else if (config.type === 'interval' && config.intervalMinutes) {
    cronExpr = `*/${config.intervalMinutes} 9-15 * * 1-5`;
  }

  if (cronExpr) {
    const job = schedule.scheduleJob(cronExpr, async () => {
      console.log(`[Scheduler] Executing: ${config.name} (${config.jobType})`);
      state.lastRun = new Date().toISOString();
      state.status = 'active';

      try {
        state.lastResult = await executeJob(state);
        console.log(`[Scheduler] ${config.name}: ${state.lastResult}`);
      } catch (err) {
        state.status = 'error';
        state.lastResult = `Error: ${(err as Error).message}`;
        console.error(`[Scheduler] ${config.name} failed:`, err);
      }

      const next = active[config.id]?.nextInvocation();
      state.nextRun = next ? next.toISOString() : '';
    });

    active[config.id] = job;
    const next = job.nextInvocation();
    state.nextRun = next ? next.toISOString() : '';
  }

  return state;
}

/** Delete a job */
export function deleteJob(id: string): boolean {
  const jobs = getJobs();
  const active = getActive();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  active[id]?.cancel();
  delete active[id];
  jobs.splice(idx, 1);
  return true;
}

/** Pause/resume a job */
export function toggleJob(id: string): JobState | null {
  const jobs = getJobs();
  const active = getActive();
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;

  if (job.status === 'active' || job.status === 'error') {
    active[id]?.cancel();
    delete active[id];
    job.status = 'paused';
    job.nextRun = '';
  } else {
    // Re-create the schedule
    job.enabled = true;
    createJob(job);
  }
  return job;
}

/** Get all jobs */
export function getAllJobs(): JobState[] {
  return getJobs();
}

/** Run a job immediately (one-shot) */
export async function runJobNow(id: string): Promise<string> {
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
    return job.lastResult;
  }
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
