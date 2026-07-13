export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-8 w-56 rounded-lg bg-navy-800/[0.06]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-navy-800/[0.06]" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-navy-800/[0.06]" />
    </div>
  );
}
