'use client';

interface DownloadProgressProps {
  isDownloading: boolean;
  currentSymbol: string;
  currentStep: string;
  completedCount: number;
  totalCount: number;
  totalRows: number;
  log: string[];
  errors: string[];
  onCancel: () => void;
}

export function DownloadProgress({
  isDownloading,
  currentSymbol,
  currentStep,
  completedCount,
  totalCount,
  totalRows,
  log,
  errors,
  onCancel,
}: DownloadProgressProps) {
  if (!isDownloading && log.length === 0) return null;

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Progress header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          {isDownloading ? (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white font-medium">
                  Downloading {currentSymbol} <span className="text-slate-500 font-normal">{currentStep}</span>
                </span>
                <span className="text-slate-400 font-mono text-xs">
                  {completedCount}/{totalCount} symbols &middot; {totalRows.toLocaleString()} rows
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-emerald-400 font-medium">
              Download complete &mdash; {totalRows.toLocaleString()} rows
              {errors.length > 0 && <span className="text-amber-400 ml-2">({errors.length} errors)</span>}
            </div>
          )}
        </div>
        {isDownloading && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shrink-0"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <details className="border-t border-slate-800">
          <summary className="px-4 py-2 text-[10px] text-slate-500 uppercase cursor-pointer hover:text-slate-400">
            Log ({log.length} entries)
          </summary>
          <div className="px-4 pb-3 max-h-40 overflow-y-auto text-[11px] font-mono text-slate-600 space-y-0.5">
            {log.map((line) => (
              <div key={line} className={line.startsWith('ERROR') ? 'text-red-400' : ''}>
                {line}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
