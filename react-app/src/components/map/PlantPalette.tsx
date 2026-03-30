import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Search, Check, Leaf, Bug, MapPin } from 'lucide-react'
import type { InventoryItem, GardenPlacement, GardenBed } from '@/types'

interface PlantPaletteProps {
  open: boolean
  onClose: () => void
  inventory: InventoryItem[]
  placements: GardenPlacement[]
  beds: GardenBed[]
  selectedPlant: string | null
  onSelectPlant: (inventoryId: string | null) => void
}

export default function PlantPalette({ open, onClose, inventory, placements, beds, selectedPlant, onSelectPlant }: PlantPaletteProps) {
  const [search, setSearch] = useState('')

  const placementMap = new Map(placements.map(p => [p.inventory_id, p]))
  const bedMap = new Map(beds.map(b => [b.id, b]))

  const filtered = inventory.filter(i => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (i.common?.toLowerCase().includes(q)) || (i.scientific?.toLowerCase().includes(q))
  })

  const notPlaced = filtered.filter(i => !placementMap.has(i.id))

  // Group placed plants by zone
  const placedByZone = new Map<string, InventoryItem[]>()
  const placedNoZone: InventoryItem[] = []

  for (const item of filtered) {
    const placement = placementMap.get(item.id)
    if (!placement) continue
    if (placement.bed_id) {
      const list = placedByZone.get(placement.bed_id) ?? []
      list.push(item)
      placedByZone.set(placement.bed_id, list)
    } else {
      placedNoZone.push(item)
    }
  }

  const hasPlaced = placedByZone.size > 0 || placedNoZone.length > 0

  function handleSelect(id: string) {
    onSelectPlant(selectedPlant === id ? null : id)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="font-display text-base">Place Plants</SheetTitle>
          <p className="text-xs text-ink-light">Tap a plant, then tap on the map</p>
        </SheetHeader>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {notPlaced.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-light font-medium uppercase tracking-wide mb-2">Not yet placed ({notPlaced.length})</p>
              <div className="space-y-1">
                {notPlaced.map(item => (
                  <PlantRow key={item.id} item={item} selected={selectedPlant === item.id} placed={false} onSelect={() => handleSelect(item.id)} />
                ))}
              </div>
            </div>
          )}

          {hasPlaced && (
            <div className="space-y-3">
              {Array.from(placedByZone.entries()).map(([bedId, items]) => {
                const bed = bedMap.get(bedId)
                return (
                  <div key={bedId}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <MapPin size={10} className="text-sage" />
                      <p className="text-[10px] text-ink-light font-medium uppercase tracking-wide">
                        {bed?.name ?? 'Unnamed zone'} ({items.length})
                      </p>
                    </div>
                    <div className="space-y-1">
                      {items.map(item => (
                        <PlantRow key={item.id} item={item} selected={selectedPlant === item.id} placed onSelect={() => handleSelect(item.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}

              {placedNoZone.length > 0 && (
                <div>
                  <p className="text-[10px] text-ink-light font-medium uppercase tracking-wide mb-2">
                    Placed outside zones ({placedNoZone.length})
                  </p>
                  <div className="space-y-1">
                    {placedNoZone.map(item => (
                      <PlantRow key={item.id} item={item} selected={selectedPlant === item.id} placed onSelect={() => handleSelect(item.id)} />
                    ))}
                  </div>
                </div>
              )}
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
  item: InventoryItem; selected: boolean; placed: boolean; onSelect: () => void
}) {
  const Icon = item.type === 'bug' ? Bug : Leaf
  return (
    <button onClick={onSelect}
      className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
        selected ? 'bg-sage-light/50 border border-primary' : 'hover:bg-cream-dark border border-transparent'
      }`}>
      {item.image_url ? (
        <img src={item.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-ink-light" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${placed ? 'text-ink-light' : 'text-ink'}`}>{item.common ?? 'Unknown'}</p>
        {item.scientific && <p className="text-[10px] text-ink-light italic truncate">{item.scientific}</p>}
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
