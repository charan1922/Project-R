'use client';

interface Metrics {
  matched: number;
  spearman: number;
  top10: number;
  top20: number;
  rmse: number;
}

export function CompareStats({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;

  return (
    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
      <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Bhavcopy vs Dhan Daily</h3>
      <div className="grid grid-cols-5 gap-2 text-center">
        <Stat label="Spearman" value={metrics.spearman.toFixed(2)} good={metrics.spearman > 0.8} />
        <Stat label="Top-10" value={`${metrics.top10}/10`} good={metrics.top10 >= 7} />
        <Stat label="Top-20" value={`${metrics.top20}/20`} good={metrics.top20 >= 14} />
        <Stat label="RMSE" value={metrics.rmse.toFixed(2)} good={metrics.rmse < 0.5} />
        <Stat label="Matched" value={String(metrics.matched)} />
      </div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-slate-600 uppercase">{label}</div>
      <div
        className={`text-sm font-mono font-bold ${good === true ? 'text-emerald-400' : good === false ? 'text-red-400' : 'text-white'}`}
      >
        {value}
      </div>
    </div>
  );
}
