export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="motion-safe:animate-pulse motion-reduce:animate-none h-7 w-24 rounded bg-surface-300" />
          <div className="motion-safe:animate-pulse motion-reduce:animate-none h-5 w-12 rounded bg-surface-300" />
        </div>
        <div className="motion-safe:animate-pulse motion-reduce:animate-none h-8 w-20 rounded-lg bg-surface-300" />
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-surface-300 bg-white p-5"
          >
            <div className="motion-safe:animate-pulse motion-reduce:animate-none mb-3 h-4 w-24 rounded bg-surface-300" />
            <div className="motion-safe:animate-pulse motion-reduce:animate-none h-8 w-16 rounded bg-surface-300" />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="motion-safe:animate-pulse motion-reduce:animate-none mb-3 h-6 w-40 rounded bg-surface-300" />
        <div className="motion-safe:animate-pulse motion-reduce:animate-none h-48 rounded-xl bg-surface-200" />
      </div>

      <div>
        <div className="motion-safe:animate-pulse motion-reduce:animate-none mb-3 h-6 w-36 rounded bg-surface-300" />
        <div className="motion-safe:animate-pulse motion-reduce:animate-none h-48 rounded-xl bg-surface-200" />
      </div>
    </div>
  );
}
