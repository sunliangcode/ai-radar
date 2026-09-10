export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface px-4 py-4">
          <div className="skeleton h-3.5 w-1/3" />
          <div className="skeleton mt-2.5 h-3 w-5/6" />
          <div className="skeleton mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}
