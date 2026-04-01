import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl font-bold text-slate-700">404</div>
        <h2 className="text-xl font-semibold text-slate-200">Page not found</h2>
        <p className="text-slate-400 text-sm">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm transition-colors text-slate-200"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
