import schedule from "node-schedule";
import { dhanAPI } from "./dhan-client";
import { insertOHLC, getLastSync } from "./db";
import { ExchangeSegment } from "../../dhanv2/src/types";

// In-memory job store for simple persistence in this iteration
// A full production deployment might move this to SQLite or DuckDB
let jobs: any[] = [];

type JobConfig = {
    id: string;
    name: string;
    type: "daily" | "interval";
    time?: string; // IST Time like "15:35"
    intervalMinutes?: number;
    dataInterval: string;
    symbols: string[]; // e.g. ["RELIANCE", "HDFCBANK"]
};

// Global ref to keep node-schedule jobs
const activeSchedules: Record<string, schedule.Job> = {};

function getCronFromIST(time: string) {
    const [hours, minutes] = time.split(':');
    // For simplicity, running locally in IST or assuming system TZ is IST.
    return `${minutes} ${hours} * * 1-5`; // Mon-Fri
}

export function createJob(config: JobConfig) {
    jobs.push({ ...config, status: "active", nextRun: "Calculated...", lastRun: "Never" });

    // Setup cron logic
    let cronExpr = "";
    if (config.type === "daily" && config.time) {
        cronExpr = getCronFromIST(config.time);
    } else if (config.type === "interval" && config.intervalMinutes) {
        cronExpr = `*/${config.intervalMinutes} 9-15 * * 1-5`; // Run every N minutes during market hours
    }

    if (cronExpr) {
        const job = schedule.scheduleJob(cronExpr, async () => {
            console.log(`[Scheduler] Executing Job: ${config.name}`);

            // Update last run time
            const jobIdx = jobs.findIndex(j => j.id === config.id);
            if (jobIdx > -1) jobs[jobIdx].lastRun = new Date().toISOString();

            for (const sym of config.symbols) {
                try {
                    const lastSync = await getLastSync(sym, "NSE", config.dataInterval);
                    const fromDate = lastSync ? new Date(lastSync * 1000).toISOString() : "2020-01-01T00:00:00.000Z";

                    const req = {
                        securityId: "UNKNOWN", // In complete implementation, map symbol to securityId from master list
                        exchangeSegment: ExchangeSegment.NSE_EQ,
                        instrument: "EQUITY" as any,
                        fromDate: fromDate.split('T')[0],
                        toDate: new Date().toISOString().split('T')[0]
                    };

                    let data;
                    if (config.dataInterval === "Daily") {
                        data = await dhanAPI.fetchDaily(req);
                    } else {
                        data = await dhanAPI.fetchIntradayChunked({ ...req, interval: 5 as any }); // hardcoded to 5 for now
                    }

                    if (data && data.timestamp && data.timestamp.length > 0) {
                        await insertOHLC(sym, "NSE", config.dataInterval, data as any);
                    }
                } catch (err) {
                    console.error(`[Scheduler] Failed to sync ${sym}:`, err);
                }
            }

            if (jobIdx > -1) {
                const next = activeSchedules[config.id]?.nextInvocation();
                jobs[jobIdx].nextRun = next ? next.toISOString() : "Unknown";
            }
        });

        activeSchedules[config.id] = job;
    }
}

export function getJobs() {
    return jobs;
}
