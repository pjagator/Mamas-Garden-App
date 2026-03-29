# Project Firebush Phase 5: Garden Map

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive garden map where the user uploads an aerial photo of their yard, draws zones with microclimate data, and places plants from their inventory onto the map. This is the star feature of the React rebuild.

**Architecture:** react-konva (Konva.js wrapper) renders a multi-layer canvas: background image (faded aerial photo), zone overlays (colored rectangles), plant markers (circles with initials/thumbnails), and labels. `useGardenMap` hook manages all CRUD against three new Supabase tables (`garden_maps`, `garden_beds`, `garden_placements`). The Map page orchestrates mode switching (view, draw zone, place plant, edit) via a toolbar. Plant placement uses a tap-to-place pattern via a side drawer (PlantPalette).

**Tech Stack:** React 18, TypeScript, react-konva / konva, Supabase (3 new tables), Lucide React, shadcn/ui Sheet

**Spec:** `docs/superpowers/specs/2026-03-28-project-firebush-design.md` — Garden Map Feature section

**Design rules:**
- NO emoji — Lucide icons or inline SVG only
- 44px minimum touch targets
- Aerial photo faded to ~15-20% opacity with warm cream tint by default
- "Show satellite" toggle for full clarity
- Zones color-coded by sun exposure (yellow=full sun, green=partial, blue-green=shade, gray=full shade)
- Plant markers: circles with first 2 letters of name, bordered by health color
- All colors from theme tokens

**DB prerequisite:** Before starting, run the SQL migrations for `garden_maps`, `garden_beds`, and `garden_placements` in Supabase SQL Editor. The SQL is in the spec at `docs/superpowers/specs/2026-03-28-project-firebush-design.md` lines 149-204.

---

## File Map

### New files

```
react-app/src/
├── hooks/
│   └── useGardenMap.ts              # CRUD for maps, beds, placements
├── components/
│   └── map/
│       ├── GardenCanvas.tsx         # Konva Stage with 4 layers
│       ├── MapToolbar.tsx           # Mode switching toolbar
│       ├── BedEditor.tsx            # Rectangle drawing on canvas
│       ├── BedDetailSheet.tsx       # Microclimate settings sheet
│       ├── PlantMarker.tsx          # Single plant marker on canvas
│       ├── PlantPalette.tsx         # Side drawer for placing plants
│       └── ZoneLegend.tsx           # Color key overlay
└── pages/
    └── Map.tsx                      # (replace placeholder) Full map page
```

### Modified files

```
react-app/
├── package.json                     # Add konva + react-konva deps
└── src/pages/Map.tsx                # Replace placeholder
```

---

### Task 1: Install konva + react-konva

**Files:**
- Modify: `react-app/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm install konva react-konva
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): install konva and react-konva for garden map"
```

---

### Task 2: useGardenMap hook

**Files:**
- Create: `react-app/src/hooks/useGardenMap.ts`

- [ ] **Step 1: Write useGardenMap**

Write `react-app/src/hooks/useGardenMap.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { GardenMap, GardenBed, GardenPlacement, BedShape } from '@/types'

export function useGardenMap() {
  const [map, setMap] = useState<GardenMap | null>(null)
  const [beds, setBeds] = useState<GardenBed[]>([])
  const [placements, setPlacements] = useState<GardenPlacement[]>([])
  const [loading, setLoading] = useState(true)

  // Load map + beds + placements
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Load map (one per user for now)
    const { data: maps } = await supabase
      .from('garden_maps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const currentMap = maps?.[0] as GardenMap | undefined
    setMap(currentMap ?? null)

    if (currentMap) {
      // Load beds
      const { data: bedsData } = await supabase
        .from('garden_beds')
        .select('*')
        .eq('map_id', currentMap.id)
        .order('created_at', { ascending: true })

      setBeds((bedsData as GardenBed[]) ?? [])

      // Load placements
      const { data: placementsData } = await supabase
        .from('garden_placements')
        .select('*')
        .eq('map_id', currentMap.id)

      setPlacements((placementsData as GardenPlacement[]) ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Map CRUD ──────────────────────────────────────────────

  const createMap = useCallback(async (imageUrl: string, width: number, height: number): Promise<GardenMap | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('garden_maps')
      .insert({ user_id: user.id, name: 'My Garden', image_url: imageUrl, width, height })
      .select()
      .single()

    if (error || !data) return null
    const newMap = data as GardenMap
    setMap(newMap)
    return newMap
  }, [])

  const updateMap = useCallback(async (updates: Partial<Pick<GardenMap, 'name' | 'image_url' | 'width' | 'height'>>) => {
    if (!map) return
    const { data } = await supabase
      .from('garden_maps')
      .update(updates)
      .eq('id', map.id)
      .select()
      .single()

    if (data) setMap(data as GardenMap)
  }, [map])

  // ── Bed CRUD ──────────────────────────────────────────────

  const addBed = useCallback(async (shape: BedShape, name?: string): Promise<GardenBed | null> => {
    if (!map) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('garden_beds')
      .insert({ user_id: user.id, map_id: map.id, shape, name: name ?? null })
      .select()
      .single()

    if (error || !data) return null
    const newBed = data as GardenBed
    setBeds(prev => [...prev, newBed])
    return newBed
  }, [map])

  const updateBed = useCallback(async (id: string, updates: Partial<GardenBed>) => {
    const { data } = await supabase
      .from('garden_beds')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setBeds(prev => prev.map(b => b.id === id ? data as GardenBed : b))
    }
  }, [])

  const deleteBed = useCallback(async (id: string) => {
    await supabase.from('garden_beds').delete().eq('id', id)
    setBeds(prev => prev.filter(b => b.id !== id))
    // Placements in this bed get bed_id set to null (DB cascade)
    setPlacements(prev => prev.map(p => p.bed_id === id ? { ...p, bed_id: null } : p))
  }, [])

  // ── Placement CRUD ────────────────────────────────────────

  const placeItem = useCallback(async (inventoryId: string, x: number, y: number, bedId?: string): Promise<GardenPlacement | null> => {
    if (!map) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('garden_placements')
      .insert({
        user_id: user.id,
        map_id: map.id,
        inventory_id: inventoryId,
        bed_id: bedId ?? null,
        x, y,
      })
      .select()
      .single()

    if (error || !data) return null
    const newPlacement = data as GardenPlacement
    setPlacements(prev => [...prev, newPlacement])
    return newPlacement
  }, [map])

  const movePlacement = useCallback(async (id: string, x: number, y: number) => {
    await supabase.from('garden_placements').update({ x, y }).eq('id', id)
    setPlacements(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }, [])

  const removePlacement = useCallback(async (id: string) => {
    await supabase.from('garden_placements').delete().eq('id', id)
    setPlacements(prev => prev.filter(p => p.id !== id))
  }, [])

  return {
    map, beds, placements, loading,
    createMap, updateMap,
    addBed, updateBed, deleteBed,
    placeItem, movePlacement, removePlacement,
    refresh: load,
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add useGardenMap hook with CRUD for maps, beds, and placements"
```

---

### Task 3: GardenCanvas — the core Konva Stage

**Files:**
- Create: `react-app/src/components/map/GardenCanvas.tsx`
- Create: `react-app/src/components/map/PlantMarker.tsx`

- [ ] **Step 1: Create PlantMarker**

Write `react-app/src/components/map/PlantMarker.tsx`:

```tsx
import { Group, Circle, Text } from 'react-konva'
import type { InventoryItem, HealthStatus } from '@/types'

interface PlantMarkerProps {
  item: InventoryItem
  x: number
  y: number
  placementId: string
  draggable: boolean
  onDragEnd: (id: string, x: number, y: number) => void
  onTap: (id: string) => void
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  thriving: '#22c55e',
  healthy: '#4ade80',
  stressed: '#f59e0b',
  sick: '#ef4444',
  dormant: '#94a3b8',
  new: '#3b82f6',
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const words = name.split(' ')
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function PlantMarker({ item, x, y, placementId, draggable, onDragEnd, onTap }: PlantMarkerProps) {
  const borderColor = item.health ? HEALTH_COLORS[item.health] : '#7a9e7e'
  const initials = getInitials(item.common)

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e) => {
        onDragEnd(placementId, e.target.x(), e.target.y())
      }}
      onTap={() => onTap(placementId)}
      onClick={() => onTap(placementId)}
    >
      {/* Outer ring (health color) */}
      <Circle radius={18} fill={borderColor} />
      {/* Inner circle (white) */}
      <Circle radius={15} fill="white" />
      {/* Initials */}
      <Text
        text={initials}
        fontSize={10}
        fontFamily="system-ui, sans-serif"
        fontStyle="bold"
        fill="#1c3a2b"
        align="center"
        verticalAlign="middle"
        width={30}
        height={30}
        offsetX={15}
        offsetY={15}
      />
    </Group>
  )
}
```

- [ ] **Step 2: Create GardenCanvas**

Write `react-app/src/components/map/GardenCanvas.tsx`:

```tsx
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
  selectedPlant: string | null  // inventory_id being placed
  onBedDrawn: (shape: BedShape) => void
  onPlantPlaced: (x: number, y: number) => void
  onPlacementMoved: (id: string, x: number, y: number) => void
  onPlacementTapped: (id: string) => void
  onBedTapped: (id: string) => void
}

const SUN_COLORS: Record<string, string> = {
  full_sun: 'rgba(250, 204, 21, 0.3)',      // yellow
  partial_sun: 'rgba(132, 204, 22, 0.3)',    // lime
  partial_shade: 'rgba(34, 197, 94, 0.25)',  // green
  full_shade: 'rgba(148, 163, 184, 0.25)',   // slate
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

  // Drawing state
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawRect, setDrawRect] = useState<BedShape | null>(null)

  // Fit stage to container
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

  // Load background image
  useEffect(() => {
    if (!map.image_url) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setBgImage(img)
      // Fit image to stage
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        const fitScale = width / img.width
        setScale(fitScale)
      }
    }
    img.src = map.image_url
  }, [map.image_url])

  function getPointerPos(e: any): { x: number; y: number } {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    return {
      x: (pointer.x - position.x) / scale,
      y: (pointer.y - position.y) / scale,
    }
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
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
      })
    }
  }

  function handleStageMouseUp() {
    if (mode === 'draw' && drawing && drawRect) {
      setDrawing(false)
      if (drawRect.width > 20 && drawRect.height > 20) {
        onBedDrawn(drawRect)
      }
      setDrawRect(null)
    }
  }

  function handleStageTap(e: any) {
    if (mode === 'place' && selectedPlant) {
      const pos = getPointerPos(e)
      onPlantPlaced(pos.x, pos.y)
    }
  }

  // Zoom via pinch/wheel
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

  function fitView() {
    if (!bgImage || !containerRef.current) return
    const { width } = containerRef.current.getBoundingClientRect()
    setScale(width / bgImage.width)
    setPosition({ x: 0, y: 0 })
  }

  const imageOpacity = showSatellite ? 1 : 0.18

  return (
    <div ref={containerRef} className="flex-1 bg-cream-dark relative overflow-hidden touch-none">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={mode === 'view' || mode === 'edit'}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        onClick={handleStageTap}
        onTap={handleStageTap}
        onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
      >
        {/* Layer 1: Background image */}
        <Layer>
          {bgImage && (
            <>
              {/* Cream tint underlay */}
              <Rect
                width={bgImage.width}
                height={bgImage.height}
                fill="#f5f0e8"
              />
              <KonvaImage
                image={bgImage}
                width={bgImage.width}
                height={bgImage.height}
                opacity={imageOpacity}
              />
            </>
          )}
        </Layer>

        {/* Layer 2: Zone overlays */}
        <Layer>
          {beds.map(bed => (
            <Group key={bed.id}>
              <Rect
                x={bed.shape.x}
                y={bed.shape.y}
                width={bed.shape.width}
                height={bed.shape.height}
                fill={SUN_COLORS[bed.sun_exposure ?? ''] ?? 'rgba(122, 158, 126, 0.25)'}
                stroke={bed.color || '#7a9e7e'}
                strokeWidth={2}
                cornerRadius={4}
                onClick={() => onBedTapped(bed.id)}
                onTap={() => onBedTapped(bed.id)}
              />
              {showLabels && bed.name && (
                <Text
                  x={bed.shape.x + 4}
                  y={bed.shape.y + 4}
                  text={bed.name}
                  fontSize={12}
                  fontFamily="system-ui, sans-serif"
                  fontStyle="bold"
                  fill="#1c3a2b"
                />
              )}
            </Group>
          ))}

          {/* Drawing preview */}
          {drawRect && (
            <Rect
              x={drawRect.x}
              y={drawRect.y}
              width={drawRect.width}
              height={drawRect.height}
              fill="rgba(122, 158, 126, 0.2)"
              stroke="#7a9e7e"
              strokeWidth={2}
              dash={[8, 4]}
              cornerRadius={4}
            />
          )}
        </Layer>

        {/* Layer 3: Plant markers */}
        <Layer>
          {placements.map(p => {
            const item = inventory.find(i => i.id === p.inventory_id)
            if (!item) return null
            return (
              <PlantMarker
                key={p.id}
                item={item}
                x={p.x}
                y={p.y}
                placementId={p.id}
                draggable={mode === 'edit'}
                onDragEnd={onPlacementMoved}
                onTap={onPlacementTapped}
              />
            )
          })}
        </Layer>

        {/* Layer 4: Labels (plant names when zoomed in) */}
        {showLabels && (
          <Layer>
            {placements.map(p => {
              const item = inventory.find(i => i.id === p.inventory_id)
              if (!item) return null
              return (
                <Text
                  key={`label-${p.id}`}
                  x={p.x - 30}
                  y={p.y + 22}
                  text={item.common ?? '?'}
                  fontSize={9}
                  fontFamily="system-ui, sans-serif"
                  fill="#1c3a2b"
                  align="center"
                  width={60}
                />
              )
            })}
          </Layer>
        )}
      </Stage>

      {/* Expose fitView for parent */}
      <button id="fit-view-trigger" className="hidden" onClick={fitView} />
    </div>
  )
}
```

Note: The `fitView` function is exposed via a hidden button — the parent Map page will call `document.getElementById('fit-view-trigger')?.click()`. This avoids needing to pass refs through layers. A more React-idiomatic approach would use `useImperativeHandle`, but this is simpler for now.

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add GardenCanvas with Konva layers and PlantMarker"
```

---

### Task 4: MapToolbar + ZoneLegend

**Files:**
- Create: `react-app/src/components/map/MapToolbar.tsx`
- Create: `react-app/src/components/map/ZoneLegend.tsx`

- [ ] **Step 1: Create MapToolbar**

Write `react-app/src/components/map/MapToolbar.tsx`:

```tsx
import { PenTool, Flower2, Hand, Maximize, Map, Settings } from 'lucide-react'

export type MapMode = 'view' | 'draw' | 'place' | 'edit'

interface MapToolbarProps {
  mode: MapMode
  onModeChange: (mode: MapMode) => void
  onFitView: () => void
  onToggleLegend: () => void
  onSettings: () => void
}

const TOOLS: { mode: MapMode; icon: typeof Hand; label: string }[] = [
  { mode: 'draw', icon: PenTool, label: 'Add Zone' },
  { mode: 'place', icon: Flower2, label: 'Place Plant' },
  { mode: 'edit', icon: Hand, label: 'Edit' },
]

export default function MapToolbar({ mode, onModeChange, onFitView, onToggleLegend, onSettings }: MapToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-cream-dark">
      <div className="flex gap-1">
        {TOOLS.map(t => {
          const Icon = t.icon
          const active = mode === t.mode
          return (
            <button
              key={t.mode}
              onClick={() => onModeChange(active ? 'view' : t.mode)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                active ? 'bg-sage-light text-primary' : 'text-ink-mid'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1">
        <button
          onClick={onFitView}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary min-h-0 min-w-0"
          title="Fit view"
        >
          <Maximize size={18} />
        </button>
        <button
          onClick={onToggleLegend}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary min-h-0 min-w-0"
          title="Legend"
        >
          <Map size={18} />
        </button>
        <button
          onClick={onSettings}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary min-h-0 min-w-0"
          title="Map settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ZoneLegend**

Write `react-app/src/components/map/ZoneLegend.tsx`:

```tsx
import { X } from 'lucide-react'

interface ZoneLegendProps {
  onClose: () => void
}

const LEGEND_ITEMS = [
  { label: 'Full Sun', color: 'rgba(250, 204, 21, 0.5)' },
  { label: 'Partial Sun', color: 'rgba(132, 204, 22, 0.5)' },
  { label: 'Partial Shade', color: 'rgba(34, 197, 94, 0.4)' },
  { label: 'Full Shade', color: 'rgba(148, 163, 184, 0.4)' },
  { label: 'Default (no setting)', color: 'rgba(122, 158, 126, 0.4)' },
]

export default function ZoneLegend({ onClose }: ZoneLegendProps) {
  return (
    <div className="absolute top-3 right-3 bg-white rounded-[--radius-card] shadow-md p-3 z-10 min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-primary">Zone Legend</h3>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-ink-light hover:text-ink min-h-0 min-w-0">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border border-cream-dark" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-ink-mid">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add MapToolbar and ZoneLegend components"
```

---

### Task 5: BedDetailSheet — microclimate settings

**Files:**
- Create: `react-app/src/components/map/BedDetailSheet.tsx`

- [ ] **Step 1: Create BedDetailSheet**

Write `react-app/src/components/map/BedDetailSheet.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { GardenBed, SunExposure, SoilType, MoistureLevel, WindExposure, ZoneType } from '@/types'

interface BedDetailSheetProps {
  bed: GardenBed | null
  open: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<GardenBed>) => void
  onDelete: (id: string) => void
}

const SUN_OPTIONS: { value: SunExposure; label: string }[] = [
  { value: 'full_sun', label: 'Full Sun' },
  { value: 'partial_sun', label: 'Partial Sun' },
  { value: 'partial_shade', label: 'Partial Shade' },
  { value: 'full_shade', label: 'Full Shade' },
]

const SOIL_OPTIONS: { value: SoilType; label: string }[] = [
  { value: 'sandy', label: 'Sandy' },
  { value: 'loamy', label: 'Loamy' },
  { value: 'clay', label: 'Clay' },
  { value: 'well_drained', label: 'Well-drained' },
  { value: 'moist', label: 'Moist' },
]

const MOISTURE_OPTIONS: { value: MoistureLevel; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'wet', label: 'Wet' },
]

const WIND_OPTIONS: { value: WindExposure; label: string }[] = [
  { value: 'sheltered', label: 'Sheltered' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'exposed', label: 'Exposed' },
]

const ZONE_TYPES: { value: ZoneType; label: string }[] = [
  { value: 'bed', label: 'Bed' },
  { value: 'border', label: 'Border' },
  { value: 'container', label: 'Container' },
  { value: 'lawn', label: 'Lawn' },
  { value: 'path', label: 'Path' },
  { value: 'water_feature', label: 'Water' },
]

function PillGroup<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T | null) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-ink-light font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value === o.value
                ? 'border-primary bg-sage-light/50 text-primary'
                : 'border-cream-dark text-ink-mid hover:border-sage'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BedDetailSheet({ bed, open, onClose, onSave, onDelete }: BedDetailSheetProps) {
  const [name, setName] = useState('')
  const [sun, setSun] = useState<SunExposure | null>(null)
  const [soil, setSoil] = useState<SoilType | null>(null)
  const [moisture, setMoisture] = useState<MoistureLevel | null>(null)
  const [wind, setWind] = useState<WindExposure | null>(null)
  const [zoneType, setZoneType] = useState<ZoneType | null>(null)

  useEffect(() => {
    if (bed) {
      setName(bed.name ?? '')
      setSun(bed.sun_exposure)
      setSoil(bed.soil_type)
      setMoisture(bed.moisture_level)
      setWind(bed.wind_exposure)
      setZoneType(bed.zone_type)
    }
  }, [bed])

  function handleSave() {
    if (!bed) return
    onSave(bed.id, {
      name: name.trim() || null,
      sun_exposure: sun,
      soil_type: soil,
      moisture_level: moisture,
      wind_exposure: wind,
      zone_type: zoneType,
    })
    toast.success('Zone updated')
    onClose()
  }

  function handleDelete() {
    if (!bed) return
    const ok = window.confirm('Delete this zone? Plants placed in it will remain on the map.')
    if (!ok) return
    onDelete(bed.id)
    toast.success('Zone removed')
    onClose()
  }

  if (!bed) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">Zone Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bed-name">Zone name</Label>
            <Input id="bed-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front Bed, Side Border" />
          </div>

          <PillGroup label="Sun exposure" options={SUN_OPTIONS} value={sun} onChange={setSun} />
          <PillGroup label="Soil type" options={SOIL_OPTIONS} value={soil} onChange={setSoil} />
          <PillGroup label="Moisture level" options={MOISTURE_OPTIONS} value={moisture} onChange={setMoisture} />
          <PillGroup label="Wind exposure" options={WIND_OPTIONS} value={wind} onChange={setWind} />
          <PillGroup label="Zone type" options={ZONE_TYPES} value={zoneType} onChange={setZoneType} />

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1" size="lg">Save Zone</Button>
            <Button onClick={handleDelete} variant="destructive" size="lg">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add BedDetailSheet with microclimate settings"
```

---

### Task 6: PlantPalette — side drawer for placing plants

**Files:**
- Create: `react-app/src/components/map/PlantPalette.tsx`

- [ ] **Step 1: Create PlantPalette**

Write `react-app/src/components/map/PlantPalette.tsx`:

```tsx
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Search, Check, Leaf, Bug } from 'lucide-react'
import type { InventoryItem, GardenPlacement } from '@/types'

interface PlantPaletteProps {
  open: boolean
  onClose: () => void
  inventory: InventoryItem[]
  placements: GardenPlacement[]
  selectedPlant: string | null
  onSelectPlant: (inventoryId: string | null) => void
}

export default function PlantPalette({ open, onClose, inventory, placements, selectedPlant, onSelectPlant }: PlantPaletteProps) {
  const [search, setSearch] = useState('')

  const placedIds = new Set(placements.map(p => p.inventory_id))

  const filtered = inventory.filter(i => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (i.common?.toLowerCase().includes(q)) || (i.scientific?.toLowerCase().includes(q))
  })

  const notPlaced = filtered.filter(i => !placedIds.has(i.id))
  const placed = filtered.filter(i => placedIds.has(i.id))

  function handleSelect(id: string) {
    if (selectedPlant === id) {
      onSelectPlant(null)
    } else {
      onSelectPlant(id)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onSelectPlant(null); onClose() } }}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="font-display text-base">Place Plants</SheetTitle>
          <p className="text-xs text-ink-light">Tap a plant, then tap on the map</p>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {/* Not yet placed */}
          {notPlaced.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-light font-medium uppercase tracking-wide mb-2">
                Not yet placed ({notPlaced.length})
              </p>
              <div className="space-y-1">
                {notPlaced.map(item => (
                  <PlantRow
                    key={item.id}
                    item={item}
                    selected={selectedPlant === item.id}
                    placed={false}
                    onSelect={() => handleSelect(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Already placed */}
          {placed.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-light font-medium uppercase tracking-wide mb-2">
                Already placed ({placed.length})
              </p>
              <div className="space-y-1">
                {placed.map(item => (
                  <PlantRow
                    key={item.id}
                    item={item}
                    selected={selectedPlant === item.id}
                    placed={true}
                    onSelect={() => handleSelect(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-xs text-ink-light text-center py-4">
              {inventory.length === 0 ? 'No plants in your garden yet.' : 'No matches.'}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PlantRow({ item, selected, placed, onSelect }: {
  item: InventoryItem
  selected: boolean
  placed: boolean
  onSelect: () => void
}) {
  const Icon = item.type === 'bug' ? Bug : Leaf
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
        selected ? 'bg-sage-light/50 border border-primary' : 'hover:bg-cream-dark border border-transparent'
      }`}
    >
      {item.image_url ? (
        <img src={item.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-ink-light" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${placed ? 'text-ink-light' : 'text-ink'}`}>
          {item.common ?? 'Unknown'}
        </p>
        {item.scientific && (
          <p className="text-[10px] text-ink-light italic truncate">{item.scientific}</p>
        )}
      </div>
      {placed && <Check size={14} className="text-sage flex-shrink-0" />}
      {selected && !placed && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Leaf size={10} className="text-white" />
        </div>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add PlantPalette side drawer for placing plants on map"
```

---

### Task 7: Map page — wire everything together

**Files:**
- Modify: `react-app/src/pages/Map.tsx`

- [ ] **Step 1: Rewrite Map.tsx**

Replace the placeholder `react-app/src/pages/Map.tsx` with:

```tsx
import { useState } from 'react'
import { Upload, Eye, EyeOff, Tag, TagOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import ScreenHeader from '@/components/layout/ScreenHeader'
import GardenCanvas from '@/components/map/GardenCanvas'
import MapToolbar from '@/components/map/MapToolbar'
import type { MapMode } from '@/components/map/MapToolbar'
import BedDetailSheet from '@/components/map/BedDetailSheet'
import PlantPalette from '@/components/map/PlantPalette'
import ZoneLegend from '@/components/map/ZoneLegend'
import { useGardenMap } from '@/hooks/useGardenMap'
import { useInventory } from '@/hooks/useInventory'
import type { GardenBed, BedShape } from '@/types'

export default function Map() {
  const { map, beds, placements, loading, createMap, addBed, updateBed, deleteBed, placeItem, movePlacement, removePlacement } = useGardenMap()
  const { items: inventory } = useInventory()

  const [mode, setMode] = useState<MapMode>('view')
  const [showSatellite, setShowSatellite] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showLegend, setShowLegend] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [selectedBed, setSelectedBed] = useState<GardenBed | null>(null)

  async function handleUploadAerial() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      toast.info('Uploading aerial photo...')

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const path = `${user.id}/map_${Date.now()}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('garden-images')
          .upload(path, file, { contentType: file.type })

        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage.from('garden-images').getPublicUrl(path)

        // Get image dimensions
        const img = new window.Image()
        img.onload = async () => {
          await createMap(publicUrl, img.width, img.height)
          toast.success('Garden map created')
        }
        img.src = publicUrl
      } catch (err: any) {
        toast.error('Upload failed: ' + err.message)
      }
    }
    input.click()
  }

  async function handleBedDrawn(shape: BedShape) {
    const bed = await addBed(shape, `Zone ${beds.length + 1}`)
    if (bed) {
      setSelectedBed(bed)
      setMode('view')
      toast.success('Zone added — set its properties')
    }
  }

  async function handlePlantPlaced(x: number, y: number) {
    if (!selectedPlant) return
    const result = await placeItem(selectedPlant, x, y)
    if (result) {
      const item = inventory.find(i => i.id === selectedPlant)
      toast.success(`${item?.common ?? 'Plant'} placed on map`)
      setSelectedPlant(null)
    } else {
      toast.error('This plant is already on the map')
    }
  }

  function handleModeChange(newMode: MapMode) {
    setMode(newMode)
    if (newMode === 'place') {
      setPaletteOpen(true)
    } else {
      setPaletteOpen(false)
      setSelectedPlant(null)
    }
  }

  function handlePlacementTapped(placementId: string) {
    if (mode === 'edit') {
      const ok = window.confirm('Remove this plant from the map?')
      if (ok) {
        removePlacement(placementId)
        toast.success('Removed from map')
      }
    }
  }

  function handleBedTapped(bedId: string) {
    const bed = beds.find(b => b.id === bedId)
    if (bed) setSelectedBed(bed)
  }

  if (loading) {
    return (
      <>
        <ScreenHeader title="Garden Map" />
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-ink-light text-sm">Loading map...</p>
        </div>
      </>
    )
  }

  // Empty state — no map yet
  if (!map) {
    return (
      <>
        <ScreenHeader title="Garden Map" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <h3 className="font-display text-xl text-primary mb-2">Map your garden</h3>
          <p className="text-sm text-ink-light max-w-xs mb-6">
            Upload an aerial screenshot of your yard — Google Maps satellite view works perfectly. Then draw zones and place your plants.
          </p>
          <Button onClick={handleUploadAerial} size="lg">
            <Upload size={20} className="mr-2" /> Upload aerial photo
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen">
      <ScreenHeader
        title={map.name}
        subtitle={`${beds.length} zones · ${placements.length} plants placed`}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSatellite(!showSatellite)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white"
              title={showSatellite ? 'Fade satellite' : 'Show satellite'}
            >
              {showSatellite ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white"
              title={showLabels ? 'Hide labels' : 'Show labels'}
            >
              {showLabels ? <TagOff size={18} /> : <Tag size={18} />}
            </button>
          </div>
        }
      />

      <div className="relative flex-1">
        <GardenCanvas
          map={map}
          beds={beds}
          placements={placements}
          inventory={inventory}
          mode={mode}
          showSatellite={showSatellite}
          showLabels={showLabels}
          selectedPlant={selectedPlant}
          onBedDrawn={handleBedDrawn}
          onPlantPlaced={handlePlantPlaced}
          onPlacementMoved={movePlacement}
          onPlacementTapped={handlePlacementTapped}
          onBedTapped={handleBedTapped}
        />

        {showLegend && <ZoneLegend onClose={() => setShowLegend(false)} />}

        {mode === 'draw' && (
          <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-primary font-medium shadow-sm">
            Draw a rectangle to create a zone
          </div>
        )}

        {mode === 'place' && selectedPlant && (
          <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-primary font-medium shadow-sm">
            Tap on the map to place
          </div>
        )}
      </div>

      <MapToolbar
        mode={mode}
        onModeChange={handleModeChange}
        onFitView={() => document.getElementById('fit-view-trigger')?.click()}
        onToggleLegend={() => setShowLegend(!showLegend)}
        onSettings={() => toast.info('Map settings coming soon')}
      />

      <PlantPalette
        open={paletteOpen}
        onClose={() => { setPaletteOpen(false); setMode('view') }}
        inventory={inventory}
        placements={placements}
        selectedPlant={selectedPlant}
        onSelectPlant={setSelectedPlant}
      />

      <BedDetailSheet
        bed={selectedBed}
        open={!!selectedBed}
        onClose={() => setSelectedBed(null)}
        onSave={(id, updates) => updateBed(id, updates)}
        onDelete={deleteBed}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): wire Map page with canvas, toolbar, zones, plant placement, and palette"
```

---

### Task 8: Final verification and push

- [ ] **Step 1: Run all tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Manual QA at 390px**

1. Navigate to Map tab → empty state with "Upload aerial photo" button and inviting copy
2. Upload an image → map renders with faded background + cream tint
3. Toggle "Show satellite" → image goes full opacity
4. Toggle labels on/off
5. Tap "Add Zone" in toolbar → draw a rectangle on the canvas → BedDetailSheet opens
6. Set zone name + sun exposure → save → zone appears with color overlay
7. Tap "Place Plant" → PlantPalette opens from right
8. Tap a plant → tap on map → plant marker appears with initials
9. Switch to "Edit" mode → drag a marker → position updates
10. Tap a marker in edit mode → confirm remove
11. Tap a zone → BedDetailSheet opens with saved settings
12. Pinch to zoom, drag to pan
13. "Fit view" resets zoom
14. Legend shows color key

- [ ] **Step 4: Push**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git push
```

- [ ] **Step 5: Commit any fixes**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "fix(firebush): address Phase 5 QA feedback" && git push
```
