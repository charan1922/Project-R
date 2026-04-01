'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md px-6">
          <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
          <p className="text-slate-400 text-sm">{error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
