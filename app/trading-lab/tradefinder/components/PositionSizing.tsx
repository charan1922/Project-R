'use client';

import { Layers } from 'lucide-react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsResult } from '../types';
import { fmt, fmtROI, pct } from '../utils';
import { PnLCell, Section, StatCard, Table } from './ui';

interface Props {
  data: AnalyticsResult;
}

export function PositionSizing({ data }: Props) {
  const { positionSize: ps } = data;

  const lotRows = ps.lotDistribution.map((g) => [
    `${g.lots} lot${g.lots > 1 ? 's' : ''}`,
    g.count.toString(),
    <PnLCell key={`pnl-${g.lots}`} v={g.pnl} />,
    <span
      key={`wr-${g.lots}`}
      className={`font-semibold ${g.winRate >= 60 ? 'text-emerald-400' : g.winRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}
    >
      {pct(g.winRate)}
    </span>,
    <span key={`roi-${g.lots}`} className={`font-semibold ${g.avgROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {fmtROI(g.avgROI)}
    </span>,
  ]);

  const winScatter = ps.scatterData.filter((d) => d.pnl > 0);
  const loseScatter = ps.scatterData.filter((d) => d.pnl <= 0);

  return (
    <Section title="4. Position Sizing Patterns" icon={Layers} color="text-orange-400">
      {/* Capital comparison */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <StatCard label="Avg Capital — Winners" value={fmt(ps.avgCapitalWinners)} positive={true} />
        <StatCard label="Avg Capital — Losers" value={fmt(ps.avgCapitalLosers)} positive={false} />
      </div>

      {/* Lot distribution table */}
      <div className="mt-4">
        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Performance by Lot Count</p>
        <Table headers={['Lots', 'Trades', 'Total P&L', 'Win Rate', 'Avg ROI']} rows={lotRows} />
      </div>

      {/* Scatter: Capital vs P&L */}
      {ps.scatterData.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Capital Deployed vs P&L</p>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="capital"
                name="Capital"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}K`}
              />
              <YAxis
                dataKey="pnl"
                name="P&L"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}K`}
              />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              <Scatter name="Winners" data={winScatter} fill="#34d399" opacity={0.7} />
              <Scatter name="Losers" data={loseScatter} fill="#f87171" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}
