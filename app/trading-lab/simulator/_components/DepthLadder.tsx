'use client';

import type { SimQuote } from '@/lib/simulator/types';

interface Props {
  quote: SimQuote | null;
}

const fmtPrice = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n: number) => n.toLocaleString('en-IN');

/** Five-level bid/ask book with depth bars. */
export default function DepthLadder({ quote }: Props) {
  if (!quote) {
    return <div className="px-3 py-6 text-center text-xs text-slate-500">No depth yet — load and play a session.</div>;
  }

  const maxQty = Math.max(1, ...quote.depth.bids.map((b) => b.quantity), ...quote.depth.asks.map((a) => a.quantity));

  return (
    <div className="text-xs">
      <div className="grid grid-cols-3 px-3 py-1.5 font-medium text-slate-500">
        <span>Bid Qty</span>
        <span className="text-center">Price</span>
        <span className="text-right">Ask Qty</span>
      </div>
      {quote.depth.bids.map((bid, i) => {
        const ask = quote.depth.asks[i];
        return (
          <div key={bid.price} className="grid grid-cols-3 items-center px-3 py-1">
            <div className="relative">
              <div
                className="absolute inset-y-0 right-0 rounded-sm bg-emerald-500/15"
                style={{ width: `${(bid.quantity / maxQty) * 100}%` }}
              />
              <span className="relative font-mono text-emerald-400">{fmtQty(bid.quantity)}</span>
            </div>
            <div className="text-center font-mono">
              <span className="text-emerald-400">{fmtPrice(bid.price)}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span className="text-red-400">{ask ? fmtPrice(ask.price) : '—'}</span>
            </div>
            <div className="relative text-right">
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-red-500/15"
                style={{ width: `${((ask?.quantity ?? 0) / maxQty) * 100}%` }}
              />
              <span className="relative font-mono text-red-400">{ask ? fmtQty(ask.quantity) : '—'}</span>
            </div>
          </div>
        );
      })}
      <div className="mt-1 grid grid-cols-2 border-t border-slate-800 px-3 py-1.5 font-mono">
        <span className="text-emerald-400">Σ {fmtQty(quote.totalBuyQty)}</span>
        <span className="text-right text-red-400">Σ {fmtQty(quote.totalSellQty)}</span>
      </div>
    </div>
  );
}
