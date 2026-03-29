import { useState } from 'react'
import { Upload, Eye, EyeOff, Tag, Tags } from 'lucide-react'
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
              {showLabels ? <Tags size={18} /> : <Tag size={18} />}
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
