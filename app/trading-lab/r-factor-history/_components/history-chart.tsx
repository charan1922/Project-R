import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { shortDate } from '@/app/trading-lab/_lib/r-factor-ui';
import type { StockHistoryEntry } from '../_hooks/use-history-data';

export function HistoryChart({ data }: { data: StockHistoryEntry[] }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">R-Factor + Spread Over Time</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: '#64748b', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(v, name) => [typeof v === 'number' ? v.toFixed(2) : String(v ?? ''), String(name ?? '')]}
          />
          <ReferenceLine
            y={2.8}
            stroke="#34d399"
            strokeDasharray="4 4"
            label={{ value: 'Blast 2.8', fill: '#34d399', fontSize: 10, position: 'right' }}
          />
          <Line
            type="monotone"
            dataKey="compositeRFactor"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            name="R-Factor"
          />
          <Line
            type="monotone"
            dataKey={(d: StockHistoryEntry) => d.zScores.spread}
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
            name="Spread"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
