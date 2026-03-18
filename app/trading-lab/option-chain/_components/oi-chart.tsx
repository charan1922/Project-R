'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StrikeData } from '@/lib/dhan/option-chain-types';

interface OIChartProps {
  strikes: StrikeData[];
  atmStrike: number;
  underlyingPrice: number;
  mode: 'oi-change' | 'open-interest';
  showOverlay: boolean;
}

function formatOI(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(0)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

// Colors
const PE_BASE = '#34d399'; // emerald-400
const PE_INCREASE = 'rgba(52, 211, 153, 0.45)';
const PE_DECREASE = 'rgba(52, 211, 153, 0.15)';
const CE_BASE = '#f87171'; // red-400
const CE_INCREASE = 'rgba(248, 113, 113, 0.45)';
const CE_DECREASE = 'rgba(248, 113, 113, 0.15)';

export function OIChart({ strikes, atmStrike, underlyingPrice, mode, showOverlay }: OIChartProps) {
  const showStacked = (mode === 'oi-change' && showOverlay) || (mode === 'open-interest' && showOverlay);
  const showSimpleOI = mode === 'open-interest' && !showOverlay;
  const showOIChange = mode === 'oi-change' && !showOverlay;

  const chartData = strikes.map((s) => {
    const peOi = s.pe?.oi ?? 0;
    const pePrev = s.pe?.previousOi ?? peOi;
    const ceOi = s.ce?.oi ?? 0;
    const cePrev = s.ce?.previousOi ?? ceOi;

    if (showOIChange) {
      // OI Change mode — positive/negative bars
      return {
        strike: s.strike,
        putOiChange: s.pe?.oiChange ?? 0,
        callOiChange: -(s.ce?.oiChange ?? 0),
      };
    }

    if (showStacked) {
      // Stacked composition: base + increase + decrease
      return {
        strike: s.strike,
        peBase: Math.min(peOi, pePrev),
        peIncrease: Math.max(0, peOi - pePrev),
        peDecrease: Math.max(0, pePrev - peOi),
        ceBase: Math.min(ceOi, cePrev),
        ceIncrease: Math.max(0, ceOi - cePrev),
        ceDecrease: Math.max(0, cePrev - ceOi),
      };
    }

    // Simple absolute OI
    return {
      strike: s.strike,
      putOi: peOi,
      callOi: ceOi,
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="strike" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => String(v)} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatOI} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 12 }}
            formatter={(value, name) => [
              typeof value === 'number' ? formatOI(value) : String(value ?? ''),
              String(name ?? ''),
            ]}
            labelFormatter={(label) => `Strike: ${label}`}
          />

          {/* ATM reference line */}
          <ReferenceLine
            x={atmStrike}
            stroke="#64748b"
            strokeDasharray="4 4"
            label={{ value: `${underlyingPrice.toFixed(1)}`, position: 'top', fill: '#94a3b8', fontSize: 11 }}
          />

          {showOIChange && (
            <>
              <Bar dataKey="putOiChange" fill={PE_BASE} name="Put OI Chg" radius={[2, 2, 0, 0]} />
              <Bar dataKey="callOiChange" fill={CE_BASE} name="Call OI Chg" radius={[2, 2, 0, 0]} />
            </>
          )}

          {showStacked && (
            <>
              {/* Put side — stacked green */}
              <Bar dataKey="peBase" stackId="pe" fill={PE_BASE} name="Put OI" radius={[0, 0, 0, 0]} />
              <Bar dataKey="peIncrease" stackId="pe" fill={PE_INCREASE} name="Put Increase" radius={[2, 2, 0, 0]} />
              <Bar dataKey="peDecrease" stackId="pe" fill={PE_DECREASE} name="Put Decrease" radius={[2, 2, 0, 0]} />
              {/* Call side — stacked red */}
              <Bar dataKey="ceBase" stackId="ce" fill={CE_BASE} name="Call OI" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ceIncrease" stackId="ce" fill={CE_INCREASE} name="Call Increase" radius={[2, 2, 0, 0]} />
              <Bar dataKey="ceDecrease" stackId="ce" fill={CE_DECREASE} name="Call Decrease" radius={[2, 2, 0, 0]} />
            </>
          )}

          {showSimpleOI && (
            <>
              <Bar dataKey="putOi" fill={PE_BASE} name="Put OI" radius={[2, 2, 0, 0]} />
              <Bar dataKey="callOi" fill={CE_BASE} name="Call OI" radius={[2, 2, 0, 0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="flex items-center justify-center gap-5 mt-2 text-xs text-slate-400">
        {showStacked ? (
          <>
            <LegendItem color={PE_BASE} label="Put OI" />
            <LegendItem color={PE_INCREASE} label="Increase" />
            <LegendItem color={PE_DECREASE} label="Decrease" />
            <LegendItem color={CE_BASE} label="Call OI" />
            <LegendItem color={CE_INCREASE} label="Increase" />
            <LegendItem color={CE_DECREASE} label="Decrease" />
          </>
        ) : showOIChange ? (
          <>
            <LegendItem color={PE_BASE} label="Put OI chg" />
            <LegendItem color={CE_BASE} label="Call OI chg" />
          </>
        ) : (
          <>
            <LegendItem color={PE_BASE} label="Put OI" />
            <LegendItem color={CE_BASE} label="Call OI" />
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
