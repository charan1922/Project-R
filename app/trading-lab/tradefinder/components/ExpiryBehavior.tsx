"use client";

import { Target } from "lucide-react";
import type { AnalyticsResult } from "../types";
import { fmt } from "../utils";
import { Section, ProgressRow } from "./ui";

interface Props { data: AnalyticsResult }

export function ExpiryBehavior({ data }: Props) {
    const { actual, otm, itm, atm, unknownMoney } = data;
    const totalMoney = otm + itm + atm + unknownMoney;

    const weekly = actual.filter(t => t.expiry_date && /\d+(st|nd|rd|th)\s+W/i.test(t.expiry_date));
    const monthly = actual.filter(t => t.expiry_date && !/\d+(st|nd|rd|th)\s+W/i.test(t.expiry_date));

    const weeklyPnl = weekly.reduce((s, t) => s + t.total_pnl, 0);
    const monthlyPnl = monthly.reduce((s, t) => s + t.total_pnl, 0);

    return (
        <Section title="5. Strike Price & Expiry Behavior" icon={Target} color="text-violet-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-3">
                        Moneyness (where spot_price available)
                    </p>
                    <div className="space-y-3">
                        <ProgressRow label="OTM (Out of Money)" value={otm} total={totalMoney} color="bg-amber-500/70" />
                        <ProgressRow label="ITM (In the Money)" value={itm} total={totalMoney} color="bg-emerald-500/70" />
                        <ProgressRow label="ATM (At the Money ±1%)" value={atm} total={totalMoney} color="bg-sky-500/70" />
                        <ProgressRow label="Unknown (no spot data)" value={unknownMoney} total={totalMoney} color="bg-slate-600" />
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        ⚠️ Most trades lack spot_price — full moneyness analysis requires complete data.
                    </p>
                </div>

                <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Expiry Type</p>
                    <div className="space-y-3">
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
                            <div className="text-xs text-sky-400 font-semibold uppercase mb-1">Monthly Expiry</div>
                            <div className="text-2xl font-bold text-white">{monthly.length}</div>
                            <div className="text-xs text-slate-400 mt-1">Total P&L: <span className={monthlyPnl >= 0 ? "text-emerald-400" : "text-red-400"}>{fmt(monthlyPnl)}</span></div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                            <div className="text-xs text-purple-400 font-semibold uppercase mb-1">Weekly Expiry</div>
                            <div className="text-2xl font-bold text-white">{weekly.length}</div>
                            <div className="text-xs text-slate-400 mt-1">Total P&L: <span className={weeklyPnl >= 0 ? "text-emerald-400" : "text-red-400"}>{fmt(weeklyPnl)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
