import { useState, useRef, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text, Group } from 'react-konva'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Badge imported for future use in plant markers
// import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Hand,
  PenTool,
  Maximize,
  ImagePlus,
  Layers,
  Search,
  ChevronRight,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUN_EXPOSURES, SOIL_TYPES, ZONE_COLORS } from '@/lib/constants'
import type { InventoryItem, GardenBed, GardenPlacement, BedShape } from '@/types'
import type Konva from 'konva'

type MapTool = 'pan' | 'draw' | 'place' | 'edit'

interface MapPageProps {
  items: InventoryItem[]
  mapImageUrl: string | null
  beds: GardenBed[]
  placements: GardenPlacement[]
  onUploadBackground: (file: File) => Promise<void>
  onAddBed: (bed: Partial<GardenBed>) => Promise<void>
  onUpdateBed: (id: string, updates: Partial<GardenBed>) => Promise<void>
  onDeleteBed: (id: string) => Promise<void>
  onPlacePlant: (inventoryId: string, x: number, y: number, bedId?: string) => Promise<void>
  onMovePlant: (placementId: string, x: number, y: number) => Promise<void>
  onRemovePlant: (placementId: string) => Promise<void>
}

export function MapPage({
  items,
  mapImageUrl,
  beds,
  placements,
  onUploadBackground,
  onAddBed,
  onUpdateBed,
  onDeleteBed,
  onPlacePlant,
  onMovePlant,
  onRemovePlant: _onRemovePlant,
}: MapPageProps) {
  void _onRemovePlant; // will be used in marker context menu
  const [tool, setTool] = useState<MapTool>('pan')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [bedEditorOpen, setBedEditorOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState<GardenBed | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [paletteSearch, setPaletteSearch] = useState('')

  // Canvas state
  const stageRef = useRef<Konva.Stage>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null)
  const [newBedShape, setNewBedShape] = useState<BedShape | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load background image
  useEffect(() => {
    if (!mapImageUrl) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = mapImageUrl
    img.onload = () => setBgImage(img)
  }, [mapImageUrl])

  // Fit stage to container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await onUploadBackground(file)
  }

  // Get plant info for a placement
  const getPlantForPlacement = useCallback(
    (placement: GardenPlacement) => items.find((i) => i.id === placement.inventory_id),
    [items]
  )

  // Filter palette items
  const paletteItems = items.filter((item) => {
    if (item.type !== 'plant') return false
    if (paletteSearch) {
      const q = paletteSearch.toLowerCase()
      return (
        item.common?.toLowerCase().includes(q) ||
        item.scientific?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const placedIds = new Set(placements.map((p) => p.inventory_id))

  // Handle canvas interactions
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== 'draw') return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setDrawing({ startX: pos.x, startY: pos.y })
    setNewBedShape({ type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== 'draw' || !drawing) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    setNewBedShape({
      type: 'rect',
      x: Math.min(drawing.startX, pos.x),
      y: Math.min(drawing.startY, pos.y),
      width: Math.abs(pos.x - drawing.startX),
      height: Math.abs(pos.y - drawing.startY),
    })
  }

  const handleStageMouseUp = () => {
    if (tool !== 'draw' || !newBedShape) return
    if ((newBedShape.width ?? 0) > 20 && (newBedShape.height ?? 0) > 20) {
      setSelectedBed(null)
      setBedEditorOpen(true)
    } else {
      setNewBedShape(null)
    }
    setDrawing(null)
  }

  // Handle plant placement from palette
  const handlePlantPlace = async (inventoryId: string) => {
    if (tool === 'place' || selectedPlant === inventoryId) {
      // Place in center of visible canvas
      const centerX = stageSize.width / 2
      const centerY = stageSize.height / 2
      await onPlacePlant(inventoryId, centerX, centerY)
      setSelectedPlant(null)
    } else {
      setSelectedPlant(inventoryId)
      setTool('place')
    }
  }

  // Handle canvas tap for placement
  const handleStageTap = async (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (tool !== 'place' || !selectedPlant) return
    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) return
    await onPlacePlant(selectedPlant, pos.x, pos.y)
    // Keep selectedPlant active for multiple placements
  }

  // Save bed from editor
  const handleSaveBed = async (name: string, sunExposure: string, soilType: string, color: string) => {
    if (!newBedShape && !selectedBed) return

    if (selectedBed) {
      await onUpdateBed(selectedBed.id, { name, sun_exposure: sunExposure as GardenBed['sun_exposure'], soil_type: soilType as GardenBed['soil_type'], color })
    } else if (newBedShape) {
      await onAddBed({ name, shape: newBedShape, sun_exposure: sunExposure as GardenBed['sun_exposure'], soil_type: soilType as GardenBed['soil_type'], color })
    }

    setNewBedShape(null)
    setBedEditorOpen(false)
    setTool('pan')
  }

  // No map uploaded yet
  if (!mapImageUrl) {
    return (
      <div className="flex flex-col min-h-screen">
        <ScreenHeader title="Garden Map" subtitle="Visualize your garden layout" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-light/20 flex items-center justify-center mb-6">
            <ImagePlus className="w-10 h-10 text-green-sage" />
          </div>
          <h2 className="font-display text-xl text-green-deep mb-2">
            Upload your garden
          </h2>
          <p className="text-ink-mid text-sm mb-6 max-w-xs">
            Take an aerial screenshot of your property from Google Maps, then upload it here to start mapping your plants.
          </p>
          <label className="cursor-pointer">
            <Button size="lg">
              <ImagePlus className="w-5 h-5 mr-2" />
              Choose aerial photo
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <div className="mt-8 p-4 bg-white rounded-[14px] border border-green-light/20 max-w-xs">
            <p className="text-xs text-ink-light">
              <strong className="text-green-deep">Tip:</strong> Open Google Maps on your phone, switch to satellite view, zoom into your property, and take a screenshot. Crop it to just your garden area.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Garden Map"
        subtitle={`${beds.length} zones · ${placements.length} plants placed`}
      />

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative bg-cream-dark overflow-hidden">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          draggable={tool === 'pan'}
          onMouseDown={tool === 'draw' ? handleStageMouseDown : undefined}
          onMouseMove={tool === 'draw' ? handleStageMouseMove : undefined}
          onMouseUp={tool === 'draw' ? handleStageMouseUp : undefined}
          onTouchStart={tool === 'draw' ? handleStageMouseDown : undefined}
          onTouchMove={tool === 'draw' ? handleStageMouseMove : undefined}
          onTouchEnd={tool === 'draw' ? handleStageMouseUp : undefined}
          onClick={tool === 'place' ? handleStageTap : undefined}
          onTap={tool === 'place' ? handleStageTap : undefined}
        >
          {/* Background image layer */}
          <Layer>
            {bgImage && (
              <KonvaImage
                image={bgImage}
                width={stageSize.width}
                height={stageSize.height}
              />
            )}
          </Layer>

          {/* Beds layer */}
          <Layer>
            {beds.map((bed) => (
              <Group
                key={bed.id}
                onClick={() => {
                  if (tool === 'edit') {
                    setSelectedBed(bed)
                    setBedEditorOpen(true)
                  }
                }}
                onTap={() => {
                  if (tool === 'edit') {
                    setSelectedBed(bed)
                    setBedEditorOpen(true)
                  }
                }}
              >
                {bed.shape.type === 'rect' && (
                  <>
                    <Rect
                      x={bed.shape.x}
                      y={bed.shape.y}
                      width={bed.shape.width}
                      height={bed.shape.height}
                      fill={bed.color + '40'}
                      stroke={bed.color}
                      strokeWidth={2}
                      cornerRadius={4}
                      draggable={tool === 'edit'}
                    />
                    {bed.name && (
                      <Text
                        x={(bed.shape.x ?? 0) + 8}
                        y={(bed.shape.y ?? 0) + 8}
                        text={bed.name}
                        fontSize={12}
                        fill={bed.color}
                        fontStyle="bold"
                      />
                    )}
                  </>
                )}
              </Group>
            ))}

            {/* New bed being drawn */}
            {newBedShape && (
              <Rect
                x={newBedShape.x}
                y={newBedShape.y}
                width={newBedShape.width}
                height={newBedShape.height}
                fill="#7a9e7e40"
                stroke="#7a9e7e"
                strokeWidth={2}
                dash={[8, 4]}
                cornerRadius={4}
              />
            )}
          </Layer>

          {/* Plants layer */}
          <Layer>
            {placements.map((placement) => {
              const plant = getPlantForPlacement(placement)
              if (!plant) return null

              const isStressed = plant.health === 'stressed' || plant.health === 'sick'
              const markerColor = isStressed ? '#c4622d' : '#2d5a3d'

              return (
                <Group
                  key={placement.id}
                  x={placement.x}
                  y={placement.y}
                  draggable={tool === 'edit'}
                  onDragEnd={async (e) => {
                    await onMovePlant(placement.id, e.target.x(), e.target.y())
                  }}
                >
                  {/* Plant marker circle */}
                  <Circle
                    radius={16}
                    fill={markerColor}
                    stroke="white"
                    strokeWidth={2}
                    shadowColor="rgba(0,0,0,0.2)"
                    shadowBlur={4}
                    shadowOffsetY={2}
                  />
                  {/* Plant initial */}
                  <Text
                    text={(plant.common?.[0] ?? '?').toUpperCase()}
                    fontSize={14}
                    fill="white"
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    offsetX={5}
                    offsetY={7}
                  />
                  {/* Plant name label */}
                  <Text
                    y={22}
                    text={plant.common ?? 'Unknown'}
                    fontSize={10}
                    fill="#1c3a2b"
                    align="center"
                    offsetX={(plant.common ?? 'Unknown').length * 2.5}
                  />
                </Group>
              )
            })}
          </Layer>
        </Stage>

        {/* Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md rounded-full px-2 py-1.5 shadow-lg border border-green-light/20">
          <ToolButton
            icon={Hand}
            label="Pan"
            active={tool === 'pan'}
            onClick={() => { setTool('pan'); setSelectedPlant(null) }}
          />
          <ToolButton
            icon={PenTool}
            label="Draw Zone"
            active={tool === 'draw'}
            onClick={() => { setTool('draw'); setSelectedPlant(null) }}
          />
          <ToolButton
            icon={Plus}
            label="Place Plant"
            active={tool === 'place'}
            onClick={() => { setTool('place'); setPaletteOpen(true) }}
          />
          <ToolButton
            icon={Maximize}
            label="Fit"
            active={false}
            onClick={() => stageRef.current?.scale({ x: 1, y: 1 })}
          />
          <ToolButton
            icon={Layers}
            label="Legend"
            active={legendOpen}
            onClick={() => setLegendOpen(!legendOpen)}
          />
        </div>

        {/* Legend overlay */}
        {legendOpen && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-[14px] p-4 shadow-lg border border-green-light/20 max-w-[200px] animate-fade-in">
            <h3 className="font-display text-sm font-semibold text-green-deep mb-2">Zone Legend</h3>
            {beds.length === 0 ? (
              <p className="text-xs text-ink-light">No zones defined yet. Use the Draw tool to create garden zones.</p>
            ) : (
              <div className="space-y-1.5">
                {beds.map((bed) => (
                  <div key={bed.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: bed.color }}
                    />
                    <span className="text-xs text-ink truncate">{bed.name || 'Unnamed zone'}</span>
                    {bed.sun_exposure && (
                      <span className="text-[10px] text-ink-light ml-auto">
                        {SUN_EXPOSURES.find((s) => s.value === bed.sun_exposure)?.icon}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plant Palette - Side Drawer */}
      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="right" className="w-[300px] p-0">
          <SheetHeader className="px-4 pt-6 pb-3">
            <SheetTitle>Place a Plant</SheetTitle>
            <SheetDescription>
              Tap a plant, then tap on the map to place it
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light" />
              <Input
                placeholder="Search plants..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-2 pb-safe">
            {/* Not yet placed */}
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-medium text-ink-light uppercase tracking-wider">
                Not Yet Placed
              </p>
            </div>
            {paletteItems
              .filter((i) => !placedIds.has(i.id))
              .map((item) => (
                <PaletteItem
                  key={item.id}
                  item={item}
                  selected={selectedPlant === item.id}
                  placed={false}
                  onClick={() => handlePlantPlace(item.id)}
                />
              ))}

            {/* Already placed */}
            {paletteItems.some((i) => placedIds.has(i.id)) && (
              <>
                <div className="px-2 py-1.5 mt-3">
                  <p className="text-[11px] font-medium text-ink-light uppercase tracking-wider">
                    Already Placed
                  </p>
                </div>
                {paletteItems
                  .filter((i) => placedIds.has(i.id))
                  .map((item) => (
                    <PaletteItem
                      key={item.id}
                      item={item}
                      selected={false}
                      placed={true}
                      onClick={() => handlePlantPlace(item.id)}
                    />
                  ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Bed Editor Sheet */}
      <Sheet open={bedEditorOpen} onOpenChange={setBedEditorOpen}>
        <SheetContent side="bottom">
          <BedEditorForm
            bed={selectedBed}
            onSave={handleSaveBed}
            onDelete={selectedBed ? () => { onDeleteBed(selectedBed.id); setBedEditorOpen(false); setSelectedBed(null) } : undefined}
            onClose={() => { setBedEditorOpen(false); setNewBedShape(null); setSelectedBed(null) }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

// === Sub-components ===

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors',
        active ? 'bg-green-deep text-cream' : 'text-ink-mid hover:bg-cream'
      )}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] mt-0.5">{label}</span>
    </button>
  )
}

function PaletteItem({
  item,
  selected,
  placed,
  onClick,
}: {
  item: InventoryItem
  selected: boolean
  placed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors text-left',
        selected
          ? 'bg-green-deep text-cream'
          : placed
          ? 'bg-green-light/10 text-ink-mid'
          : 'hover:bg-cream text-ink'
      )}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-cream-dark">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-green-sage text-sm font-display">
            {item.common?.[0]}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', selected && 'text-cream')}>
          {item.common}
        </p>
        <p className={cn('text-xs truncate', selected ? 'text-cream/70' : 'text-ink-light')}>
          {item.scientific}
        </p>
      </div>

      {placed && !selected && <Check className="w-4 h-4 text-green-sage flex-shrink-0" />}
      {selected && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
    </button>
  )
}

function BedEditorForm({
  bed,
  onSave,
  onDelete,
  onClose,
}: {
  bed: GardenBed | null
  onSave: (name: string, sun: string, soil: string, color: string) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(bed?.name ?? '')
  const [sun, setSun] = useState(bed?.sun_exposure ?? '')
  const [soil, setSoil] = useState(bed?.soil_type ?? '')
  const [color, setColor] = useState(bed?.color ?? ZONE_COLORS[0])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-green-deep">
          {bed ? 'Edit Zone' : 'New Garden Zone'}
        </h2>
        <p className="text-sm text-ink-mid mt-1">
          Set the microclimate for this area
        </p>
      </div>

      <div className="space-y-2">
        <Label>Zone name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Front Bed, Side Border"
        />
      </div>

      <div className="space-y-2">
        <Label>Sun exposure</Label>
        <div className="grid grid-cols-2 gap-2">
          {SUN_EXPOSURES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSun(s.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-sm transition-colors border',
                sun === s.value
                  ? 'bg-green-deep text-cream border-green-deep'
                  : 'bg-white text-ink border-green-light/30 hover:bg-cream'
              )}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Soil type</Label>
        <div className="flex flex-wrap gap-2">
          {SOIL_TYPES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSoil(s.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-colors border',
                soil === s.value
                  ? 'bg-green-deep text-cream border-green-deep'
                  : 'bg-white text-ink-mid border-green-light/30 hover:bg-cream'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Zone color</Label>
        <div className="flex gap-2">
          {ZONE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-transform',
                color === c ? 'border-green-deep scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(name, sun, soil, color)} className="flex-1">
          {bed ? 'Update Zone' : 'Create Zone'}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
