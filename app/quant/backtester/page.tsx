"use client";

import { useState, useRef, useEffect } from "react";
import { FlaskConical, Play, TrendingUp, TrendingDown, BarChart2, ArrowRight } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Trade {
    entryDate: string; entryPrice: number;
    exitDate: string; exitPrice: number;
    shares: number; pnl: number; pnlPercent: number; fees: number;
}
interface BacktestResult {
    strategy: string; symbol: string;
    totalReturn: number; sharpeRatio: number; maxDrawdown: number;
    cagr: number; winRate: number; totalTrades: number; profitFactor: number;
    trades: Trade[];
    equityCurve: { date: string; value: number }[];
    benchmarkCurve: { date: string; value: number }[];
}

const STRATEGIES = [
    { value: "ema_crossover", label: "EMA Crossover", desc: "Buy when fast EMA crosses above slow EMA" },
    { value: "rsi_accumulation", label: "RSI Accumulation", desc: "Slab-wise buying at oversold RSI levels" },
    { value: "buy_hold_75_25", label: "Buy & Hold 75/25", desc: "75% equity + 25% gold, annual rebalance" },
] as const;

export default function BacktesterPage() {
    // ── Form state ───────────────────────────────────────────────────────────
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const [strategy, setStrategy] = useState("ema_crossover");
    const [symbol, setSymbol] = useState("SBIN");
    const [startDate, setStartDate] = useState(oneYearAgo.toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
    const [initialCash, setInitialCash] = useState(1_000_000);
    const [allocation, setAllocation] = useState(0.75);
    const [fastPeriod, setFastPeriod] = useState(10);
    const [slowPeriod, setSlowPeriod] = useState(20);
    const [rsiPeriod, setRsiPeriod] = useState(14);

    // ── Result state ─────────────────────────────────────────────────────────
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const chartRef = useRef<HTMLCanvasElement>(null);

    // ── Run backtest ─────────────────────────────────────────────────────────
    const run = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch("/api/quant/backtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    strategy, symbol: symbol.toUpperCase(), interval: "Daily",
                    startDate, endDate, initialCash, allocation,
                    params: {
                        fastPeriod, slowPeriod, rsiPeriod,
                    },
                }),
            });
            if (!res.ok) { const t = await res.text(); throw new Error(t); }
            setResult(await res.json());
        } catch (e: any) {
            setError(e.message || "Backtest failed");
        } finally {
            setLoading(false);
        }
    };

    // ── Equity curve chart ───────────────────────────────────────────────────
    useEffect(() => {
        if (!result || !chartRef.current) return;
        const canvas = chartRef.current;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        const W = rect.width, H = rect.height;

        const eq = result.equityCurve;
        const bm = result.benchmarkCurve;
        const allVals = [...eq.map(p => p.value), ...bm.map(p => p.value)];
        let minV = Math.min(...allVals), maxV = Math.max(...allVals);
        const pad = (maxV - minV) * 0.1;
        minV -= pad; maxV += pad;

        const toX = (i: number) => (i / (eq.length - 1)) * (W - 60) + 40;
        const toY = (v: number) => H - ((v - minV) / (maxV - minV)) * (H - 40) - 20;

        ctx.clearRect(0, 0, W, H);

        // Grid
        ctx.strokeStyle = "rgba(148,163,184,0.1)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const y = 20 + (H - 40) * i / 4;
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 20, y); ctx.stroke();
            const val = maxV - (maxV - minV) * i / 4;
            ctx.fillStyle = "#64748b";
            ctx.font = "9px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`₹${(val / 1000).toFixed(0)}K`, 36, y + 3);
        }

        // Benchmark line
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        bm.forEach((p, i) => { i === 0 ? ctx.moveTo(toX(i), toY(p.value)) : ctx.lineTo(toX(i), toY(p.value)); });
        ctx.stroke();
        ctx.setLineDash([]);

        // Equity line
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "#8b5cf6");
        grad.addColorStop(1, "#06b6d4");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        eq.forEach((p, i) => { i === 0 ? ctx.moveTo(toX(i), toY(p.value)) : ctx.lineTo(toX(i), toY(p.value)); });
        ctx.stroke();

        // Fill under equity
        ctx.lineTo(toX(eq.length - 1), H - 20);
        ctx.lineTo(toX(0), H - 20);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
        fillGrad.addColorStop(0, "rgba(139, 92, 246, 0.15)");
        fillGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Legend
        ctx.font = "11px Inter, sans-serif";
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(W - 200, 10, 10, 3);
        ctx.fillText("Strategy", W - 186, 15);
        ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
        ctx.fillRect(W - 110, 10, 10, 3);
        ctx.fillText("Buy & Hold", W - 96, 15);
    }, [result]);

    const fmt = (v: number) => v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
    const fmtCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <FlaskConical className="w-7 h-7 text-violet-400" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                        Backtester
                    </h1>
                    <span className="text-[10px] font-semibold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                        QUANT
                    </span>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Test trading strategies against historical data with realistic Indian market fees
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Configuration Panel ─────────────────────────────────── */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Configuration</h2>

                        {/* Strategy */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Strategy</label>
                            <select value={strategy} onChange={e => setStrategy(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {STRATEGIES.find(s => s.value === strategy)?.desc}
                            </p>
                        </div>

                        {/* Symbol */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Symbol</label>
                            <input value={symbol} onChange={e => setSymbol(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white uppercase"
                                placeholder="SBIN" />
                        </div>

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Start</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">End</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                            </div>
                        </div>

                        {/* Capital */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Initial Capital (₹)</label>
                            <input type="number" value={initialCash} onChange={e => setInitialCash(+e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                        </div>

                        {/* Strategy-specific params */}
                        {strategy === "ema_crossover" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Fast EMA</label>
                                    <input type="number" value={fastPeriod} onChange={e => setFastPeriod(+e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Slow EMA</label>
                                    <input type="number" value={slowPeriod} onChange={e => setSlowPeriod(+e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                </div>
                            </div>
                        )}
                        {strategy === "rsi_accumulation" && (
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">RSI Period</label>
                                <input type="number" value={rsiPeriod} onChange={e => setRsiPeriod(+e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                            </div>
                        )}

                        {/* Allocation slider */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">
                                Position Size: {(allocation * 100).toFixed(0)}%
                            </label>
                            <input type="range" min={0.1} max={1} step={0.05} value={allocation}
                                onChange={e => setAllocation(+e.target.value)}
                                className="w-full accent-violet-500" />
                        </div>

                        {/* Run button */}
                        <button onClick={run} disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 rounded-lg text-sm font-bold transition-all">
                            <Play className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
                            {loading ? "Running Backtest..." : "Run Backtest"}
                        </button>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-xs">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* ── Results Panel ────────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        {!result && !loading && (
                            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                                <FlaskConical className="w-12 h-12 text-slate-700 mb-4" />
                                <h3 className="text-lg font-medium text-slate-500 mb-2">Configure & Run</h3>
                                <p className="text-sm text-slate-600 max-w-md">
                                    Select a strategy, enter a symbol, and click "Run Backtest" to test against historical data
                                    with realistic Indian brokerage fees.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
                                <p className="text-slate-400 text-sm">Running backtest on {symbol}...</p>
                            </div>
                        )}

                        {result && (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: "Total Return", value: `${fmt(result.totalReturn)}%`, color: result.totalReturn >= 0 ? "text-green-400" : "text-red-400", icon: result.totalReturn >= 0 ? TrendingUp : TrendingDown },
                                        { label: "CAGR", value: `${fmt(result.cagr)}%`, color: result.cagr >= 0 ? "text-green-400" : "text-red-400", icon: BarChart2 },
                                        { label: "Sharpe Ratio", value: result.sharpeRatio.toFixed(2), color: result.sharpeRatio >= 1 ? "text-green-400" : result.sharpeRatio >= 0 ? "text-yellow-400" : "text-red-400", icon: BarChart2 },
                                        { label: "Max Drawdown", value: `${result.maxDrawdown.toFixed(2)}%`, color: "text-red-400", icon: TrendingDown },
                                        { label: "Win Rate", value: `${result.winRate.toFixed(1)}%`, color: result.winRate >= 50 ? "text-green-400" : "text-yellow-400", icon: BarChart2 },
                                        { label: "Total Trades", value: String(result.totalTrades), color: "text-sky-400", icon: ArrowRight },
                                        { label: "Profit Factor", value: result.profitFactor === null ? "∞" : result.profitFactor.toFixed(2), color: result.profitFactor === null || result.profitFactor >= 1.5 ? "text-green-400" : "text-yellow-400", icon: BarChart2 },
                                        { label: "Strategy", value: STRATEGIES.find(s => s.value === result.strategy)?.label || result.strategy, color: "text-violet-400", icon: FlaskConical },
                                    ].map((kpi, i) => (
                                        <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <kpi.icon className="w-3 h-3 text-slate-500" />
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                                            </div>
                                            <span className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Equity Curve */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        Equity Curve — {result.symbol}
                                    </h3>
                                    <canvas ref={chartRef} className="w-full" style={{ height: 300 }} />
                                </div>

                                {/* Trade Log */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                        Trade Log ({result.trades.length} trades)
                                    </h3>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-slate-500 border-b border-slate-800">
                                                <th className="text-left py-2 pr-3">#</th>
                                                <th className="text-left py-2 pr-3">Entry</th>
                                                <th className="text-right py-2 pr-3">Price</th>
                                                <th className="text-left py-2 pr-3">Exit</th>
                                                <th className="text-right py-2 pr-3">Price</th>
                                                <th className="text-right py-2 pr-3">Shares</th>
                                                <th className="text-right py-2 pr-3">P&L</th>
                                                <th className="text-right py-2">Fees</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.trades.slice(0, 50).map((t, i) => (
                                                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                    <td className="py-1.5 pr-3 text-slate-500">{i + 1}</td>
                                                    <td className="py-1.5 pr-3 text-slate-300">{t.entryDate}</td>
                                                    <td className="py-1.5 pr-3 text-right text-slate-300">₹{t.entryPrice.toFixed(2)}</td>
                                                    <td className="py-1.5 pr-3 text-slate-300">{t.exitDate}</td>
                                                    <td className="py-1.5 pr-3 text-right text-slate-300">₹{t.exitPrice.toFixed(2)}</td>
                                                    <td className="py-1.5 pr-3 text-right text-slate-400">{t.shares}</td>
                                                    <td className={`py-1.5 pr-3 text-right font-medium ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                        {fmtCurrency(t.pnl)}
                                                    </td>
                                                    <td className="py-1.5 text-right text-slate-500">{fmtCurrency(t.fees)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {result.trades.length > 50 && (
                                        <p className="text-[10px] text-slate-500 mt-2">Showing 50 of {result.trades.length} trades</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
