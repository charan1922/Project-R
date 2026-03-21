import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import type { StockHistoryEntry } from '../_hooks/use-history-data';

export function HistoryChart({ data }: { data: StockHistoryEntry[] }) {
  // Prepare chart data with ADX
  const chartData = data.map((d) => ({
    ...d,
    spread: d.zScores.spread,
    adxValue: d.adx ?? null,
  }));

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <div className="flex items-center gap-4 mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider">R-Factor + ADX + Spread</p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-400 inline-block" /> R-Factor</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Spread</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block border-t border-dashed border-amber-400" /> ADX</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 4, right: 40, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: '#64748b', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 10 }} domain={[0, 60]} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(v: unknown, name: unknown) => {
              const val = typeof v === 'number' ? v.toFixed(1) : String(v ?? '');
              return [val, String(name ?? '')];
            }}
          />
          {/* Blast threshold */}
          <ReferenceLine
            yAxisId="left"
            y={2.8}
            stroke="#34d399"
            strokeDasharray="4 4"
            label={{ value: 'Blast 2.8', fill: '#34d399', fontSize: 10, position: 'right' }}
          />
          {/* ADX trend threshold */}
          <ReferenceLine
            yAxisId="right"
            y={28}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: 'ADX 28', fill: '#f59e0b', fontSize: 10, position: 'left' }}
          />
          {/* R-Factor line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="compositeRFactor"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const cx = (props.cx as number) ?? 0;
              const cy = (props.cy as number) ?? 0;
              const payload = props.payload as Record<string, unknown> | undefined;
              const rFactor = (payload?.compositeRFactor as number) ?? 0;
              const adxVal = (payload?.adxValue as number) ?? 0;
              const pct = (payload?.pctChange as number) ?? 0;
              const isHot = rFactor >= 2.0 && adxVal >= 28 && Math.abs(pct) >= 1;
              if (!isHot) return <circle key={cx} cx={cx} cy={cy} r={0} />;
              return <circle key={cx} cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fbbf24" strokeWidth={2} />;
            }}
            name="R-Factor"
          />
          {/* Spread line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="spread"
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
            name="Spread"
          />
          {/* ADX line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="adxValue"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            name="ADX"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
