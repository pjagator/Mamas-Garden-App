import { useState, useEffect, useRef } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Text, Group } from 'react-konva'
import PlantMarker from './PlantMarker'
import type { GardenMap, GardenBed, GardenPlacement, BedShape, InventoryItem } from '@/types'

interface GardenCanvasProps {
  map: GardenMap
  beds: GardenBed[]
  placements: GardenPlacement[]
  inventory: InventoryItem[]
  mode: 'view' | 'draw' | 'place' | 'edit'
  showSatellite: boolean
  showLabels: boolean
  selectedPlant: string | null
  onBedDrawn: (shape: BedShape) => void
  onPlantPlaced: (x: number, y: number) => void
  onPlacementMoved: (id: string, x: number, y: number) => void
  onPlacementTapped: (id: string) => void
  onBedTapped: (id: string) => void
}

const SUN_COLORS: Record<string, string> = {
  full_sun: 'rgba(250, 204, 21, 0.3)',
  partial_sun: 'rgba(132, 204, 22, 0.3)',
  partial_shade: 'rgba(34, 197, 94, 0.25)',
  full_shade: 'rgba(148, 163, 184, 0.25)',
}

export default function GardenCanvas({
  map, beds, placements, inventory, mode, showSatellite, showLabels,
  selectedPlant, onBedDrawn, onPlantPlaced, onPlacementMoved, onPlacementTapped, onBedTapped,
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 390, height: 500 })
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawRect, setDrawRect] = useState<BedShape | null>(null)

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setStageSize({ width, height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (!map.image_url) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setBgImage(img)
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setScale(width / img.width)
      }
    }
    img.src = map.image_url
  }, [map.image_url])

  function getPointerPos(e: any): { x: number; y: number } {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    return { x: (pointer.x - position.x) / scale, y: (pointer.y - position.y) / scale }
  }

  function handleStageMouseDown(e: any) {
    if (mode === 'draw') {
      const pos = getPointerPos(e)
      setDrawing(true)
      setDrawStart(pos)
      setDrawRect({ type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 })
    }
  }

  function handleStageMouseMove(e: any) {
    if (mode === 'draw' && drawing) {
      const pos = getPointerPos(e)
      setDrawRect({
        type: 'rect',
        x: Math.min(drawStart.x, pos.x), y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x), height: Math.abs(pos.y - drawStart.y),
      })
    }
  }

  function handleStageMouseUp() {
    if (mode === 'draw' && drawing && drawRect) {
      setDrawing(false)
      if (drawRect.width > 20 && drawRect.height > 20) onBedDrawn(drawRect)
      setDrawRect(null)
    }
  }

  function handleStageTap(e: any) {
    if (mode === 'place' && selectedPlant) {
      const pos = getPointerPos(e)
      onPlantPlaced(pos.x, pos.y)
    }
  }

  function handleWheel(e: any) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const oldScale = scale
    const pointer = stage.getPointerPosition()
    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))
    setScale(clampedScale)
    setPosition({
      x: pointer.x - (pointer.x - position.x) * (clampedScale / oldScale),
      y: pointer.y - (pointer.y - position.y) * (clampedScale / oldScale),
    })
  }

  const imageOpacity = showSatellite ? 1 : 0.18

  return (
    <div ref={containerRef} className="flex-1 bg-cream-dark relative overflow-hidden touch-none">
      <Stage
        width={stageSize.width} height={stageSize.height}
        scaleX={scale} scaleY={scale} x={position.x} y={position.y}
        draggable={mode === 'view' || mode === 'edit'}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown} onTouchMove={handleStageMouseMove} onTouchEnd={handleStageMouseUp}
        onClick={handleStageTap} onTap={handleStageTap}
        onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
      >
        <Layer>
          {bgImage && (
            <>
              <Rect width={bgImage.width} height={bgImage.height} fill="#f5f0e8" />
              <KonvaImage image={bgImage} width={bgImage.width} height={bgImage.height} opacity={imageOpacity} />
            </>
          )}
        </Layer>

        <Layer>
          {beds.map(bed => (
            <Group key={bed.id}>
              <Rect
                x={bed.shape.x} y={bed.shape.y} width={bed.shape.width} height={bed.shape.height}
                fill={SUN_COLORS[bed.sun_exposure ?? ''] ?? 'rgba(122, 158, 126, 0.25)'}
                stroke={bed.color || '#7a9e7e'} strokeWidth={2} cornerRadius={4}
                onClick={() => onBedTapped(bed.id)} onTap={() => onBedTapped(bed.id)}
              />
              {showLabels && bed.name && (
                <Text x={bed.shape.x + 4} y={bed.shape.y + 4} text={bed.name}
                  fontSize={12} fontFamily="system-ui, sans-serif" fontStyle="bold" fill="#1c3a2b" />
              )}
            </Group>
          ))}
          {drawRect && (
            <Rect x={drawRect.x} y={drawRect.y} width={drawRect.width} height={drawRect.height}
              fill="rgba(122, 158, 126, 0.2)" stroke="#7a9e7e" strokeWidth={2} dash={[8, 4]} cornerRadius={4} />
          )}
        </Layer>

        <Layer>
          {placements.map(p => {
            const item = inventory.find(i => i.id === p.inventory_id)
            if (!item) return null
            return (
              <PlantMarker key={p.id} item={item} x={p.x} y={p.y} placementId={p.id}
                draggable={mode === 'edit'} onDragEnd={onPlacementMoved} onTap={onPlacementTapped} />
            )
          })}
        </Layer>

        {showLabels && (
          <Layer>
            {placements.map(p => {
              const item = inventory.find(i => i.id === p.inventory_id)
              if (!item) return null
              return (
                <Text key={`label-${p.id}`} x={p.x - 30} y={p.y + 22} text={item.common ?? '?'}
                  fontSize={9} fontFamily="system-ui, sans-serif" fill="#1c3a2b" align="center" width={60} />
              )
            })}
          </Layer>
        )}
      </Stage>

      <button id="fit-view-trigger" className="hidden" onClick={() => {
        if (!bgImage || !containerRef.current) return
        const { width } = containerRef.current.getBoundingClientRect()
        setScale(width / bgImage.width)
        setPosition({ x: 0, y: 0 })
      }} />
    </div>
  )
}
