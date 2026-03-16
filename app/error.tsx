"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">⚠</div>
        <h2 className="text-xl font-semibold text-slate-200">Something went wrong</h2>
        <p className="text-slate-400 text-sm">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm transition-colors text-slate-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
