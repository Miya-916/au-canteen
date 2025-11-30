export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-zinc-800 dark:border-t-indigo-500"></div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading shop data...</p>
      </div>
    </div>
  );
}
