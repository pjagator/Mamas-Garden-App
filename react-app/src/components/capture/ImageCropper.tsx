import { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
  imageDataUrl: string
  onCrop: (croppedCanvas: HTMLCanvasElement) => void
  onCancel: () => void
}

export default function ImageCropper({ imageDataUrl, onCrop, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.width, h: img.height })
      // Fit image so the shorter side fills the container
      if (containerRef.current) {
        const container = containerRef.current.getBoundingClientRect()
        const scaleX = container.width / img.width
        const scaleY = container.height / img.height
        setScale(Math.max(scaleX, scaleY))
      }
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [offset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  function handleZoom(delta: number) {
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)))
  }

  function handleCrop() {
    if (!imgRef.current || !containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()

    // The viewfinder box is 70% centered
    const boxLeft = container.width * 0.15
    const boxTop = container.height * 0.15
    const boxWidth = container.width * 0.7
    const boxHeight = container.height * 0.7

    // Calculate which part of the original image is in the viewfinder
    const imgDisplayW = imgSize.w * scale
    const imgDisplayH = imgSize.h * scale
    const imgLeft = (container.width - imgDisplayW) / 2 + offset.x
    const imgTop = (container.height - imgDisplayH) / 2 + offset.y

    const srcX = (boxLeft - imgLeft) / scale
    const srcY = (boxTop - imgTop) / scale
    const srcW = boxWidth / scale
    const srcH = boxHeight / scale

    const canvas = document.createElement('canvas')
    const max = 900
    let outW = srcW, outH = srcH
    if (outW > outH) { if (outW > max) { outH = outH * max / outW; outW = max } }
    else { if (outH > max) { outW = outW * max / outH; outH = max } }
    canvas.width = outW
    canvas.height = outH

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    onCrop(canvas)
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] bg-black rounded-[--radius-card] overflow-hidden touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {imgSize.w > 0 && (
          <img
            src={imageDataUrl}
            alt=""
            className="absolute pointer-events-none"
            style={{
              width: imgSize.w * scale,
              height: imgSize.h * scale,
              left: `calc(50% - ${(imgSize.w * scale) / 2 - offset.x}px)`,
              top: `calc(50% - ${(imgSize.h * scale) / 2 - offset.y}px)`,
            }}
            draggable={false}
          />
        )}
        {/* Viewfinder overlay — same layout as ViewfinderOverlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/50" />
          <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/50" />
          <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/50" />
          <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/50" />
          <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border-2 border-white/70 rounded-lg" />
        </div>
        <div className="absolute bottom-[8%] left-0 right-0 text-center pointer-events-none">
          <span className="text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
            Drag to position
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => handleZoom(-0.15)} className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center text-ink-mid">
          <ZoomOut size={18} />
        </button>
        <div className="w-20 text-center text-xs text-ink-light">{Math.round(scale * 100)}%</div>
        <button onClick={() => handleZoom(0.15)} className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center text-ink-mid">
          <ZoomIn size={18} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 h-11 rounded-md border border-cream-dark text-ink text-sm font-medium">
          Cancel
        </button>
        <button onClick={handleCrop} className="flex-1 h-11 rounded-md bg-primary text-white text-sm font-medium">
          Use this crop
        </button>
      </div>
    </div>
  )
}
