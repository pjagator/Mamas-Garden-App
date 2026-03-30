import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Leaf, Bug } from 'lucide-react'
import { toast } from 'sonner'
import type { GardenBed, GardenPlacement, InventoryItem, SunExposure, SoilType, MoistureLevel, WindExposure, ZoneType } from '@/types'

interface BedDetailSheetProps {
  bed: GardenBed | null
  open: boolean
  onClose: () => void
  onSave: (id: string, updates: Partial<GardenBed>) => void
  onDelete: (id: string) => void
  placements: GardenPlacement[]
  inventory: InventoryItem[]
}

const SUN_OPTIONS: { value: SunExposure; label: string }[] = [
  { value: 'full_sun', label: 'Full Sun' }, { value: 'partial_sun', label: 'Partial Sun' },
  { value: 'partial_shade', label: 'Partial Shade' }, { value: 'full_shade', label: 'Full Shade' },
]
const SOIL_OPTIONS: { value: SoilType; label: string }[] = [
  { value: 'sandy', label: 'Sandy' }, { value: 'loamy', label: 'Loamy' }, { value: 'clay', label: 'Clay' },
  { value: 'well_drained', label: 'Well-drained' }, { value: 'moist', label: 'Moist' },
]
const MOISTURE_OPTIONS: { value: MoistureLevel; label: string }[] = [
  { value: 'dry', label: 'Dry' }, { value: 'moderate', label: 'Moderate' }, { value: 'wet', label: 'Wet' },
]
const WIND_OPTIONS: { value: WindExposure; label: string }[] = [
  { value: 'sheltered', label: 'Sheltered' }, { value: 'moderate', label: 'Moderate' }, { value: 'exposed', label: 'Exposed' },
]
const ZONE_TYPES: { value: ZoneType; label: string }[] = [
  { value: 'bed', label: 'Bed' }, { value: 'border', label: 'Border' }, { value: 'container', label: 'Container' },
  { value: 'lawn', label: 'Lawn' }, { value: 'path', label: 'Path' }, { value: 'water_feature', label: 'Water' },
]

function PillGroup<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T | null) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-ink-light font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(value === o.value ? null : o.value)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value === o.value ? 'border-primary bg-sage-light/50 text-primary' : 'border-cream-dark text-ink-mid hover:border-sage'
            }`}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export default function BedDetailSheet({ bed, open, onClose, onSave, onDelete, placements, inventory }: BedDetailSheetProps) {
  const [name, setName] = useState('')
  const [sun, setSun] = useState<SunExposure | null>(null)
  const [soil, setSoil] = useState<SoilType | null>(null)
  const [moisture, setMoisture] = useState<MoistureLevel | null>(null)
  const [wind, setWind] = useState<WindExposure | null>(null)
  const [zoneType, setZoneType] = useState<ZoneType | null>(null)

  useEffect(() => {
    if (bed) {
      setName(bed.name ?? ''); setSun(bed.sun_exposure); setSoil(bed.soil_type)
      setMoisture(bed.moisture_level); setWind(bed.wind_exposure); setZoneType(bed.zone_type)
    }
  }, [bed])

  function handleSave() {
    if (!bed) return
    onSave(bed.id, { name: name.trim() || null, sun_exposure: sun, soil_type: soil, moisture_level: moisture, wind_exposure: wind, zone_type: zoneType })
    toast.success('Zone updated')
    onClose()
  }

  function handleDelete() {
    if (!bed) return
    if (!window.confirm('Delete this zone? Plants placed in it will remain on the map.')) return
    onDelete(bed.id)
    toast.success('Zone removed')
    onClose()
  }

  if (!bed) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4"><SheetTitle className="font-display">Zone Settings</SheetTitle></SheetHeader>
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

          {bed && (() => {
            const zonePlants = placements
              .filter(p => p.bed_id === bed.id)
              .map(p => inventory.find(i => i.id === p.inventory_id))
              .filter(Boolean) as InventoryItem[]
            return zonePlants.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-light font-medium">Plants in this zone ({zonePlants.length})</p>
                <div className="space-y-1">
                  {zonePlants.map(item => {
                    const Icon = item.type === 'bug' ? Bug : Leaf
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-cream-dark/50">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-ink-light" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-ink">{item.common ?? 'Unknown'}</p>
                          {item.scientific && <p className="text-[10px] text-ink-light italic truncate">{item.scientific}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-ink-light font-medium">Plants in this zone</p>
                <p className="text-xs text-ink-light/70 italic">No plants placed in this zone yet</p>
              </div>
            )
          })()}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1" size="lg">Save Zone</Button>
            <Button onClick={handleDelete} variant="destructive" size="lg"><Trash2 size={16} /></Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
