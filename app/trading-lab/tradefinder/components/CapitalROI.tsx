'use client';

import { IndianRupee } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResult } from '../types';
import { fmt, fmtROI } from '../utils';
import { HumanVerifiedBadge, Section, StatCard } from './ui';

interface Props {
  data: AnalyticsResult;
}

export function CapitalROI({ data }: Props) {
  const { capitalAnalysis: ca, actual } = data;

  const distData = Object.entries(ca.roiDistribution).map(([range, count]) => ({ range, count }));

  // Top 10 highest ROI trades
  const top10ROI = actual
    .filter((t) => t.capital_used && t.capital_used > 0)
    .map((t) => ({ trade: t, roi: (t.total_pnl / (t.capital_used as number)) * 100 }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);

  return (
    <Section title="2. Capital & ROI Analysis" icon={IndianRupee} color="text-emerald-400">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
        <StatCard label="Total Capital Deployed" value={fmt(ca.totalCapitalDeployed)} />
        <StatCard label="Avg Capital / Trade" value={fmt(ca.avgCapitalPerTrade)} />
        <StatCard label="Overall ROI" value={fmtROI(ca.overallROI)} positive={ca.overallROI >= 0} />
        <StatCard label="Avg ROI / Trade" value={fmtROI(ca.avgROIPerTrade)} positive={ca.avgROIPerTrade >= 0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <StatCard label="Median ROI" value={fmtROI(ca.medianROIPerTrade)} positive={ca.medianROIPerTrade >= 0} />
        <StatCard
          label="Best ROI Trade"
          value={ca.bestROI ? fmtROI(ca.bestROI.roi) : '—'}
          sub={ca.bestROI ? `${ca.bestROI.trade.stock_name} · ${ca.bestROI.trade.trade_date}` : undefined}
          positive={true}
        />
        <StatCard
          label="Worst ROI Trade"
          value={ca.worstROI ? fmtROI(ca.worstROI.roi) : '—'}
          sub={ca.worstROI ? `${ca.worstROI.trade.stock_name} · ${ca.worstROI.trade.trade_date}` : undefined}
          positive={false}
        />
        <StatCard
          label="Capital Efficiency"
          value={`${ca.capitalEfficiency.toFixed(1)}x`}
          sub="Total P&L / Avg Capital"
        />
      </div>

      {/* ROI Distribution Chart */}
      <div className="mt-5">
        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">ROI Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
            <Bar dataKey="count" fill="#34d399" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 ROI Trades */}
      <div className="mt-5">
        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Top 10 Highest ROI Trades</p>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60">
                {['#', 'Date', 'Stock', 'Type', 'Capital', 'P&L', 'ROI', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top10ROI.map(({ trade: t, roi }, i) => (
                <tr
                  key={`${t.trade_date}-${t.stock_name}`}
                  className="border-b border-slate-800/40 hover:bg-slate-800/30"
                >
                  <td className="py-2 px-3 text-slate-500 text-xs font-mono">#{i + 1}</td>
                  <td className="py-2 px-3 text-slate-300 text-xs">{t.trade_date}</td>
                  <td className="py-2 px-3 text-slate-100 font-mono text-xs font-semibold">{t.stock_name}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-xs font-semibold ${t.instrument_type === 'CE' ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {t.instrument_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-xs">{fmt(t.capital_used ?? 0)}</td>
                  <td className="py-2 px-3">
                    <span className={`font-semibold text-xs ${t.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmt(t.total_pnl)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`font-bold text-xs ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtROI(roi)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <HumanVerifiedBadge show={t.humanReview} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
