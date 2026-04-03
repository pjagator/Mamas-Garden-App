interface ViewfinderOverlayProps {
  className?: string
}

export default function ViewfinderOverlay({ className = '' }: ViewfinderOverlayProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Darkened edges using 4 overlay strips around a center cutout */}
      {/* Center box is 70% width and 70% height, centered */}
      <div className="absolute inset-0">
        {/* Top strip */}
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/40" />
        {/* Bottom strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/40" />
        {/* Left strip */}
        <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/40" />
        {/* Right strip */}
        <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/40" />
        {/* Center cutout border */}
        <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border-2 border-white/60 rounded-lg" />
      </div>
      {/* Label */}
      <div className="absolute bottom-[8%] left-0 right-0 text-center">
        <span className="text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
          Center your plant
        </span>
      </div>
    </div>
  )
}
