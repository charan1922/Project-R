'use client';

import { Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { formatOI } from '@/lib/dhan/option-chain-types';
import { OIChart } from './_components/oi-chart';
import { StrikeControls } from './_components/strike-controls';
import { useOptionChain } from './_hooks/use-option-chain';

type Tab = 'oi-change' | 'open-interest' | 'multistrike' | 'oi-vs-time' | 'fut-oi-vs-time';

const TABS: { key: Tab; label: string }[] = [
  { key: 'oi-change', label: 'OI Change' },
  { key: 'open-interest', label: 'Open Interest' },
  { key: 'multistrike', label: 'Multistrike OI' },
  { key: 'oi-vs-time', label: 'Option OI vs Time' },
  { key: 'fut-oi-vs-time', label: 'Fut OI vs Time' },
];

export default function OptionChainPage() {
  const [activeTab, setActiveTab] = useState<Tab>('oi-change');
  const [showOverlay, setShowOverlay] = useState(false);
  const oc = useOptionChain('RELIANCE');

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {oc.data && (
            <span>
              PCR <span className="text-white font-mono">{oc.data.summary.pcr.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-6 p-6">
        {/* Left sidebar */}
        <StrikeControls
          symbol={oc.symbol}
          onSymbolChange={oc.setSymbol}
          price={oc.data?.underlying.lastPrice ?? 0}
          changePct={0}
          expiries={oc.data?.expiries ?? []}
          selectedExpiry={oc.expiry}
          onExpiryChange={oc.setExpiry}
          strikesAround={oc.strikesAround}
          onStrikesChange={oc.setStrikesAround}
          loading={oc.loading}
        />

        {/* Main chart area */}
        <div className="flex-1 min-w-0">
          {/* Chart header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {activeTab === 'oi-change' ? 'OI Change' : 'Open Interest'} on {todayStr}
              </h2>
              <button type="button" onClick={oc.refresh} className="text-xs text-slate-500 hover:text-slate-300">
                <RefreshCw className={`w-3.5 h-3.5 ${oc.loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-slate-400">{activeTab === 'oi-change' ? 'Show OI' : 'Show OI change'}</span>
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-[9px] font-bold text-sky-400 bg-sky-500/20 px-1 py-0.5 rounded">New</span>
            </label>
          </div>

          {/* Loading */}
          {oc.loading && !oc.data && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 text-slate-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading option chain for {oc.symbol}...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {oc.error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {oc.error}
            </div>
          )}

          {/* Chart */}
          {oc.data && oc.filteredStrikes.length > 0 && (activeTab === 'oi-change' || activeTab === 'open-interest') && (
            <>
              <OIChart
                strikes={oc.filteredStrikes}
                atmStrike={oc.data.summary.atmStrike}
                underlyingPrice={oc.data.underlying.lastPrice}
                mode={activeTab}
                showOverlay={showOverlay}
              />

              {/* Summary footer */}
              <div className="mt-4 flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                <span className="text-slate-400 font-medium">
                  {activeTab === 'oi-change' ? `Change on ${todayStr}` : `Open Interest on ${todayStr}`}
                </span>
                <div className="flex items-center gap-6">
                  {activeTab === 'oi-change' ? (
                    <>
                      <span>
                        Call OI change{' '}
                        <span
                          className={`font-mono font-bold ${oc.data.summary.callOiChange < 0 ? 'text-red-400' : 'text-emerald-400'}`}
                        >
                          {oc.data.summary.callOiChange >= 0 ? '+' : ''}
                          {formatOI(oc.data.summary.callOiChange)}
                        </span>
                      </span>
                      <span>
                        Put OI change{' '}
                        <span
                          className={`font-mono font-bold ${oc.data.summary.putOiChange < 0 ? 'text-red-400' : 'text-emerald-400'}`}
                        >
                          {oc.data.summary.putOiChange >= 0 ? '+' : ''}
                          {formatOI(oc.data.summary.putOiChange)}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Total Call OI{' '}
                        <span className="font-mono font-bold text-white">{formatOI(oc.data.summary.totalCallOi)}</span>
                      </span>
                      <span>
                        Total Put OI{' '}
                        <span className="font-mono font-bold text-white">{formatOI(oc.data.summary.totalPutOi)}</span>
                      </span>
                      <span>
                        PCR <span className="font-mono font-bold text-white">{oc.data.summary.pcr.toFixed(1)}</span>
                      </span>
                    </>
                  )}
                </div>
                <span className="text-slate-500">
                  {oc.data.underlying.symbol}{' '}
                  <span className="text-white font-mono">{oc.data.underlying.lastPrice.toFixed(1)}</span>
                </span>
              </div>
            </>
          )}

          {/* Placeholder for future tabs */}
          {(activeTab === 'multistrike' || activeTab === 'oi-vs-time' || activeTab === 'fut-oi-vs-time') && (
            <div className="flex items-center justify-center h-96 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-center">
                <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {activeTab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
                <p className="text-xs text-slate-600 mt-1">Coming in Phase 2 — requires intraday per-contract data</p>
              </div>
            </div>
          )}

          {/* Info bar */}
          {oc.data && (
            <div className="mt-4 px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-lg text-[11px] text-slate-500">
              <p className="font-medium text-slate-400 mb-1">
                OI last refreshed —{' '}
                {new Date(oc.data.refreshedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
              <p>
                Data is refreshed every minute. Open Interest data is updated by the exchange every 3 minutes in many
                strikes, and every minute in some strikes. Real-time data on OI is not released by the exchange and no
                vendor or broker has real-time OI data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
