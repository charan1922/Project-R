"use client";

import { TrendingUp } from "lucide-react";
import type { AnalyticsResult, StockStats } from "../types";
import { fmt, pct } from "../utils";
import { Section, StatCard } from "./ui";

interface Props {
    data: AnalyticsResult;
    sortedStocksByCount: StockStats[];
}

export function OverallPerformance({ data, sortedStocksByCount }: Props) {
    const {
        actual, noTrade, wins, losses,
        totalPnl, grossProfit, grossLoss, months,
    } = data;

    const bestDay = actual.reduce((a, b) => a.total_pnl > b.total_pnl ? a : b, actual[0]);
    const worstDay = actual.reduce((a, b) => a.total_pnl < b.total_pnl ? a : b, actual[0]);
    const topStock = [...sortedStocksByCount].sort((a, b) => b.maxPnl - a.maxPnl)[0];

    return (
        <Section title="1. Overall Performance" icon={TrendingUp}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                <StatCard label="Total P&L" value={fmt(totalPnl)} positive={totalPnl >= 0} />
                <StatCard label="Trade Days" value={actual.length.toString()} sub={`${noTrade.length} No-Trade Days`} />
                <StatCard label="Win Rate" value={pct((wins.length / actual.length) * 100)} sub={`${wins.length}W · ${losses.length}L`} />
                <StatCard label="Avg P&L / Trade" value={fmt(totalPnl / actual.length)} positive={totalPnl >= 0} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <StatCard label="Avg Win" value={fmt(grossProfit / wins.length)} positive={true} />
                <StatCard label="Avg Loss" value={fmt(-grossLoss / losses.length)} positive={false} />
                <StatCard label="Best Single Day" value={fmt(bestDay?.total_pnl ?? 0)} sub={bestDay?.trade_date} positive={true} />
                <StatCard label="Worst Single Day" value={fmt(worstDay?.total_pnl ?? 0)} sub={worstDay?.trade_date} positive={false} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <StatCard label="Total Months" value={months.length.toString()} />
                <StatCard label="Avg Monthly P&L" value={fmt(totalPnl / months.length)} positive={totalPnl >= 0} />
                <StatCard label="Best Stock Day" value={fmt(topStock?.maxPnl ?? 0)} sub={topStock?.name} positive={true} />
                <StatCard label="Gross Profit" value={fmt(grossProfit)} positive={true} />
            </div>
        </Section>
    );
}
