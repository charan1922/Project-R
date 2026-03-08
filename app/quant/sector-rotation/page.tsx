"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Compass, RefreshCcw, Info, ChevronDown } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface RRGPoint { date: string; rsRatio: number; rsMomentum: number }
interface SectorRRG {
    symbol: string; name: string; color: string;
    tail: RRGPoint[]; current: RRGPoint | null;
    quadrant: "Leading" | "Weakening" | "Lagging" | "Improving" | "Unknown";
}
interface RRGResult {
    benchmark: string; benchmarkName: string;
    tailLength: number; latestDate: string | null;
    computedAt: string; sectors: Record<string, SectorRRG>;
}

const BENCHMARKS = [
    { symbol: "NIFTY", name: "Nifty 50" },
    { symbol: "BANKNIFTY", name: "Bank Nifty" },
    { symbol: "NIFTY500", name: "Nifty 500" },
    { symbol: "NIFTYNXT50", name: "Nifty Next 50" },
];

const QUADRANT_COLORS: Record<string, string> = {
    Leading: "rgba(34, 197, 94, 0.08)",
    Weakening: "rgba(234, 179, 8, 0.08)",
    Lagging: "rgba(239, 68, 68, 0.08)",
    Improving: "rgba(59, 130, 246, 0.08)",
};
const QUADRANT_BORDER: Record<string, string> = {
    Leading: "#22c55e",
    Weakening: "#eab308",
    Lagging: "#ef4444",
    Improving: "#3b82f6",
};

export default function SectorRotationPage() {
    const [data, setData] = useState<RRGResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [benchmark, setBenchmark] = useState("NIFTY");
    const [tail, setTail] = useState(8);
    const [hoveredSector, setHoveredSector] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const fetchRRG = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/quant/rrg?benchmark=${benchmark}&tail=${tail}`);
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message || "Failed to load RRG data");
        } finally {
            setLoading(false);
        }
    }, [benchmark, tail]);

    useEffect(() => { fetchRRG(); }, [fetchRRG]);

    // ── Canvas Drawing ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!data || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        const W = rect.width, H = rect.height;

        // Find data range for axis scaling
        let minX = 96, maxX = 104, minY = 96, maxY = 104;
        Object.values(data.sectors).forEach(s => {
            s.tail.forEach(p => {
                if (p.rsRatio < minX) minX = p.rsRatio;
                if (p.rsRatio > maxX) maxX = p.rsRatio;
                if (p.rsMomentum < minY) minY = p.rsMomentum;
                if (p.rsMomentum > maxY) maxY = p.rsMomentum;
            });
        });
        const pad = 1.5;
        minX -= pad; maxX += pad; minY -= pad; maxY += pad;

        const toX = (v: number) => ((v - minX) / (maxX - minX)) * (W - 80) + 50;
        const toY = (v: number) => H - (((v - minY) / (maxY - minY)) * (H - 60) + 30);

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background quadrants
        const cx = toX(100), cy = toY(100);
        const quadrants = [
            { x: 50, y: 0, w: cx - 50, h: cy, label: "Improving", color: QUADRANT_COLORS.Improving },
            { x: cx, y: 0, w: W - cx - 30, h: cy, label: "Leading", color: QUADRANT_COLORS.Leading },
            { x: 50, y: cy, w: cx - 50, h: H - cy - 30, label: "Lagging", color: QUADRANT_COLORS.Lagging },
            { x: cx, y: cy, w: W - cx - 30, h: H - cy - 30, label: "Weakening", color: QUADRANT_COLORS.Weakening },
        ];
        quadrants.forEach(q => {
            ctx.fillStyle = q.color;
            ctx.fillRect(q.x, q.y, q.w, q.h);
            ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(q.label, q.x + q.w / 2, q.y + q.h / 2);
        });

        // Center lines at 100
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50, cy); ctx.lineTo(W - 30, cy); ctx.stroke();
        ctx.setLineDash([]);

        // Axis labels
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("RS-Ratio →", W / 2, H - 5);
        ctx.save();
        ctx.translate(12, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("RS-Momentum →", 0, 0);
        ctx.restore();

        // Tick marks
        for (let v = Math.ceil(minX); v <= Math.floor(maxX); v++) {
            const x = toX(v);
            ctx.fillStyle = "#64748b";
            ctx.font = "9px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(v), x, H - 15);
        }
        for (let v = Math.ceil(minY); v <= Math.floor(maxY); v++) {
            const y = toY(v);
            ctx.fillStyle = "#64748b";
            ctx.font = "9px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(String(v), 45, y + 3);
        }

        // Draw sectors
        Object.values(data.sectors).forEach(sector => {
            if (sector.tail.length === 0) return;
            const isHovered = hoveredSector === sector.symbol;
            const alpha = hoveredSector && !isHovered ? 0.2 : 1;

            // Draw tail line
            ctx.strokeStyle = sector.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = isHovered ? 3 : 1.5;
            ctx.beginPath();
            sector.tail.forEach((pt, i) => {
                const x = toX(pt.rsRatio), y = toY(pt.rsMomentum);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw trailing dots (fading)
            sector.tail.forEach((pt, i) => {
                const x = toX(pt.rsRatio), y = toY(pt.rsMomentum);
                const r = i === sector.tail.length - 1 ? (isHovered ? 7 : 5) : 2.5;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = sector.color;
                ctx.globalAlpha = alpha * (0.3 + 0.7 * (i / sector.tail.length));
                ctx.fill();
            });

            // Label at current point
            const last = sector.tail[sector.tail.length - 1];
            ctx.globalAlpha = alpha;
            ctx.fillStyle = sector.color;
            ctx.font = `${isHovered ? "bold " : ""}10px Inter, sans-serif`;
            ctx.textAlign = "left";
            ctx.fillText(sector.name, toX(last.rsRatio) + 8, toY(last.rsMomentum) - 6);

            ctx.globalAlpha = 1;
        });
    }, [data, hoveredSector]);

    // ── Sector hover from list ───────────────────────────────────────────────
    const sectors = data ? Object.values(data.sectors) : [];
    const grouped: Record<string, SectorRRG[]> = { Leading: [], Weakening: [], Lagging: [], Improving: [] };
    sectors.forEach(s => { if (grouped[s.quadrant]) grouped[s.quadrant].push(s); });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <Compass className="w-7 h-7 text-violet-400" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
                        Sector Rotation Map
                    </h1>
                    <span className="text-[10px] font-semibold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                        RRG
                    </span>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Relative Rotation Graph showing sector momentum vs relative strength against{" "}
                    <span className="text-sky-400 font-medium">{data?.benchmarkName || "benchmark"}</span>
                </p>

                {/* Controls */}
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                    <div className="relative">
                        <select
                            value={benchmark}
                            onChange={e => setBenchmark(e.target.value)}
                            className="appearance-none bg-slate-800/80 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 pr-8 focus:ring-violet-500 focus:border-violet-500"
                        >
                            {BENCHMARKS.map(b => (
                                <option key={b.symbol} value={b.symbol}>{b.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>Tail:</span>
                        <input
                            type="range" min={4} max={20} value={tail}
                            onChange={e => setTail(+e.target.value)}
                            className="w-24 accent-violet-500"
                        />
                        <span className="text-white font-medium w-6">{tail}</span>
                    </div>
                    <button
                        onClick={fetchRRG}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Computing..." : "Refresh"}
                    </button>
                    {data?.latestDate && (
                        <span className="text-xs text-slate-500">
                            Data as of {data.latestDate}
                        </span>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Chart */}
                    <div className="lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <canvas
                            ref={canvasRef}
                            className="w-full"
                            style={{ height: 520 }}
                        />
                    </div>

                    {/* Quadrant Summary */}
                    <div className="space-y-4">
                        {(["Leading", "Improving", "Weakening", "Lagging"] as const).map(q => (
                            <div
                                key={q}
                                className="rounded-xl border p-3"
                                style={{
                                    borderColor: QUADRANT_BORDER[q] + "40",
                                    background: QUADRANT_COLORS[q],
                                }}
                            >
                                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: QUADRANT_BORDER[q] }}>
                                    {q} ({grouped[q]?.length || 0})
                                </h3>
                                <div className="space-y-1">
                                    {(grouped[q] || []).map(s => (
                                        <div
                                            key={s.symbol}
                                            className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity py-1"
                                            onMouseEnter={() => setHoveredSector(s.symbol)}
                                            onMouseLeave={() => setHoveredSector(null)}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                                            <span className="text-white font-medium">{s.name}</span>
                                            {s.current && (
                                                <span className="text-slate-500 ml-auto text-[10px]">
                                                    {s.current.rsRatio.toFixed(1)} / {s.current.rsMomentum.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {(grouped[q] || []).length === 0 && (
                                        <span className="text-slate-500 text-[10px]">No sectors</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Info card */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">How to Read</span>
                            </div>
                            <ul className="text-[10px] text-slate-400 space-y-1">
                                <li>• <span className="text-green-400">Leading</span>: outperforming with rising momentum</li>
                                <li>• <span className="text-blue-400">Improving</span>: gaining momentum, potential uptrend</li>
                                <li>• <span className="text-yellow-400">Weakening</span>: still ahead but losing steam</li>
                                <li>• <span className="text-red-400">Lagging</span>: underperforming and falling</li>
                                <li>• Sectors rotate clockwise through quadrants</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
