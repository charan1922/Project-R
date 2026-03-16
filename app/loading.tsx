export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="space-y-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300 mx-auto" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
