export default function PlantCardSkeleton() {
  return (
    <div className="rounded-[--radius-card] bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-cream-dark" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-cream-dark rounded w-3/4" />
        <div className="h-3 bg-cream-dark rounded w-1/2" />
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 bg-cream-dark rounded-full w-14" />
          <div className="h-5 bg-cream-dark rounded-full w-10" />
        </div>
      </div>
    </div>
  )
}
