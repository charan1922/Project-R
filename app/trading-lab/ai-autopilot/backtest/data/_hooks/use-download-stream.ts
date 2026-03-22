import { useCallback, useRef, useState } from 'react';
import type { DownloadEvent, TradeDataStatus } from '../_lib/types';

interface DownloadState {
  isDownloading: boolean;
  currentSymbol: string;
  currentStep: string;
  completedCount: number;
  totalCount: number;
  totalRows: number;
  log: string[];
  errors: string[];
}

export function useDownloadStream(onComplete?: () => void) {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    currentSymbol: '',
    currentStep: '',
    completedCount: 0,
    totalCount: 0,
    totalRows: 0,
    log: [],
    errors: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (items: TradeDataStatus[]) => {
      const symbols = items.map((s) => ({
        symbol: s.symbol,
        optionType: s.optionType,
        strike: s.strike,
        date: s.date,
      }));
      if (symbols.length === 0) return;

      abortRef.current = new AbortController();
      setState({
        isDownloading: true,
        currentSymbol: symbols[0].symbol,
        currentStep: 'equity',
        completedCount: 0,
        totalCount: symbols.length,
        totalRows: 0,
        log: [],
        errors: [],
      });

      try {
        const res = await fetch('/api/backtest/download-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
          signal: abortRef.current.signal,
        });

        if (!res.body) throw new Error('No response stream');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)) as DownloadEvent;

              if (event.type === 'progress') {
                setState((prev) => ({
                  ...prev,
                  currentSymbol: event.symbol ?? prev.currentSymbol,
                  currentStep: event.step ?? prev.currentStep,
                }));
              } else if (event.type === 'step-done') {
                setState((prev) => ({
                  ...prev,
                  totalRows: prev.totalRows + (event.rows ?? 0),
                  log: [...prev.log, `${event.symbol} ${event.step}: ${event.rows} rows`],
                }));
              } else if (event.type === 'symbol-done') {
                setState((prev) => ({
                  ...prev,
                  completedCount: (event.symbolIndex ?? 0) + 1,
                }));
              } else if (event.type === 'error') {
                setState((prev) => ({
                  ...prev,
                  errors: [...prev.errors, event.message ?? 'Unknown error'],
                  log: [...prev.log, `ERROR: ${event.message}`],
                }));
              } else if (event.type === 'complete') {
                setState((prev) => ({
                  ...prev,
                  isDownloading: false,
                  totalRows: event.totalRows ?? prev.totalRows,
                }));
                onComplete?.();
              }
            } catch {
              /* skip malformed events */
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            isDownloading: false,
            errors: [...prev.errors, (e as Error).message],
          }));
        }
      } finally {
        setState((prev) => ({ ...prev, isDownloading: false }));
        abortRef.current = null;
      }
    },
    [onComplete],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isDownloading: false }));
  }, []);

  return { ...state, start, cancel };
}
