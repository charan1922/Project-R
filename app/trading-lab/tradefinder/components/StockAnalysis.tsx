"use client";

import { Award } from "lucide-react";
import type { StockStats } from "../types";
import { pct } from "../utils";
import { Section, Table, PnLCell } from "./ui";

interface Props { stockList: StockStats[] }

function StockName({ name }: { name: string }) {
    return <span className="text-slate-200 font-mono text-xs">{name}</span>;
}

export function StockAnalysis({ stockList }: Props) {
    const byCount = [...stockList].sort((a, b) => b.count - a.count);
    const byPnl = [...stockList].sort((a, b) => b.pnl - a.pnl).slice(0, 10);
    const worstPnl = [...stockList].sort((a, b) => a.pnl - b.pnl).slice(0, 10);
    const perfect = stockList.filter(s => s.winRate === 100 && s.count >= 2);
    const bestSingle = [...stockList].sort((a, b) => b.maxPnl - a.maxPnl).slice(0, 5);

    return (
        <Section title="4. Stock-wise Analysis" icon={Award} color="text-amber-400">
            <div className="space-y-5 mt-2">

                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Top 10 Most Traded</p>
                    <Table
                        headers={["Stock", "Trades", "Total P&L", "Wins", "Losses", "Win %"]}
                        rows={byCount.slice(0, 10).map(s => [
                            <StockName key={s.name} name={s.name} />,
                            s.count,
                            <PnLCell key="p" v={s.pnl} />,
                            <span key="w" className="text-emerald-400">{s.wins}</span>,
                            <span key="l" className="text-red-400">{s.losses}</span>,
                            pct(s.winRate),
                        ])}
                    />
                </div>

                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Top 10 Highest P&L Stocks</p>
                    <Table
                        headers={["Stock", "Total P&L", "Trades", "Win %"]}
                        rows={byPnl.map(s => [
                            <StockName key={s.name} name={s.name} />,
                            <PnLCell key="p" v={s.pnl} />,
                            s.count,
                            pct(s.winRate),
                        ])}
                    />
                </div>

                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Top 10 Worst P&L Stocks</p>
                    <Table
                        headers={["Stock", "Total P&L", "Trades", "Win %"]}
                        rows={worstPnl.map(s => [
                            <StockName key={s.name} name={s.name} />,
                            <PnLCell key="p" v={s.pnl} />,
                            s.count,
                            pct(s.winRate),
                        ])}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">100% Win Rate (≥2 trades)</p>
                        {perfect.length === 0 ? (
                            <p className="text-slate-500 text-sm">None with ≥2 trades.</p>
                        ) : (
                            <Table
                                headers={["Stock", "Trades", "Total P&L"]}
                                rows={perfect.slice(0, 8).map(s => [
                                    <span key={s.name} className="text-emerald-400 font-mono text-xs">{s.name}</span>,
                                    s.count,
                                    <PnLCell key="p" v={s.pnl} />,
                                ])}
                            />
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Highest Single-Day P&L</p>
                        <Table
                            headers={["Stock", "Best Day P&L"]}
                            rows={bestSingle.map(s => [
                                <StockName key={s.name} name={s.name} />,
                                <PnLCell key="p" v={s.maxPnl} />,
                            ])}
                        />
                    </div>
                </div>

            </div>
        </Section>
    );
}
