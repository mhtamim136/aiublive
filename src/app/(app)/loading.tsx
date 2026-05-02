export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
