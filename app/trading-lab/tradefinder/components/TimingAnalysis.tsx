"use client";

import { Clock } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { pct } from "../utils";
import { Section, Table, PnLCell } from "./ui";

interface Props { data: AnalyticsResult }

export function TimingAnalysis({ data: { actual, timeBuckets } }: Props) {
    const noTimeCount = actual.filter(t => !t.trade_time).length;

    const rows = Object.values(timeBuckets)
        .sort((a, b) => b.count - a.count)
        .map(({ bucket, count, totalPnl }) => [
            bucket,
            count,
            <PnLCell key={bucket + "tp"} v={totalPnl} />,
            <PnLCell key={bucket + "avg"} v={totalPnl / count} />,
            pct((count / actual.length) * 100),
        ]);

    return (
        <Section title="6. Trade Timing Analysis" icon={Clock} color="text-cyan-400">
            <div className="mt-2">
                <Table
                    headers={["Time Bucket", "Count", "Total P&L", "Avg P&L", "% of Trades"]}
                    rows={rows}
                />
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                    <strong>⚡ Note:</strong> {noTimeCount} trades (
                    {pct((noTimeCount / actual.length) * 100)}) have no recorded trade time
                    — timing analysis is partial.
                </div>
            </div>
        </Section>
    );
}
