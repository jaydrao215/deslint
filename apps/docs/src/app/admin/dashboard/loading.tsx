export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-24 animate-pulse rounded bg-surface-300" />
          <div className="h-5 w-12 animate-pulse rounded bg-surface-300" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-300" />
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-300 bg-white p-5"
          >
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-surface-300" />
            <div className="h-8 w-16 animate-pulse rounded bg-surface-300" />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface-300" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-200" />
      </div>

      <div>
        <div className="mb-3 h-6 w-36 animate-pulse rounded bg-surface-300" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-200" />
      </div>
    </div>
  );
}
