export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      {/* Top nav skeleton */}
      <div className="hidden lg:flex h-16 border-b border-parchment-200 bg-parchment-100 items-center px-6 gap-4">
        <div className="h-6 w-28 rounded bg-parchment-200 animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-parchment-200 animate-pulse" />
      </div>

      <div className="flex flex-1">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col w-56 border-r border-parchment-200 bg-parchment-100 p-4 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-parchment-200 animate-pulse" />
          ))}
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 p-6 space-y-6">
          {/* Greeting */}
          <div className="h-8 w-48 rounded bg-parchment-200 animate-pulse" />

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-parchment-200 animate-pulse" />
            ))}
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-48 rounded-xl bg-parchment-200 animate-pulse" />
            <div className="h-48 rounded-xl bg-parchment-200 animate-pulse" />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav skeleton */}
      <div className="lg:hidden flex h-16 border-t border-parchment-200 bg-parchment-100 items-center justify-around px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-10 rounded-lg bg-parchment-200 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
