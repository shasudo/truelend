// Branded skeleton shown during route transitions so navigation doesn't feel frozen.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="h-9 w-56 rounded-lg bg-navy-800/[0.06]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-navy-800/[0.06]" />
        <div className="h-24 rounded-xl bg-navy-800/[0.06]" />
        <div className="h-24 rounded-xl bg-navy-800/[0.06]" />
      </div>
      <div className="h-64 rounded-xl bg-navy-800/[0.06]" />
    </div>
  );
}
