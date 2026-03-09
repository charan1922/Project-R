import schedule from "node-schedule";

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
                    // Trigger the existing DuckDB Parquet ingestion route
                    const res = await fetch("http://localhost:5000/api/historify/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            symbols: [sym],
                            interval: config.dataInterval,
                            exchange: "NSE"
                        })
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`[Scheduler] Sync API failed for ${sym}:`, errText);
                    }
                } catch (err) {
                    console.error(`[Scheduler] Failed to ping sync route for ${sym}:`, err);
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
