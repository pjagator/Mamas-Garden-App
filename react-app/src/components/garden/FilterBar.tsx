import { MapPin, X, Map } from 'lucide-react'
import { getCurrentSeason, LOCATION_ZONES, LOCATION_HABITATS } from '@/lib/constants'
import type { InventoryItem, GardenBed, GardenPlacement } from '@/types'

export type FilterType = 'all' | 'plant' | 'bug' | 'native' | 'blooming'
export type SortType = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'location'

interface FilterBarProps {
  items: InventoryItem[]
  activeFilter: FilterType
  activeSort: SortType
  activeLocation: string
  activeZone: string
  beds: GardenBed[]
  placements: GardenPlacement[]
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortType) => void
  onLocationChange: (location: string) => void
  onZoneChange: (zone: string) => void
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'plant', label: 'Plants' },
  { value: 'bug', label: 'Insects' },
  { value: 'native', label: 'Natives' },
  { value: 'blooming', label: 'Blooming' },
]

const SORTS: { value: SortType; label: string }[] = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'location', label: 'Location' },
]

// Parse "Front, Hammock" into { zone: "Front", habitat: "Hammock" }
export function parseLocation(loc: string): { zone: string; habitat: string } {
  if (!loc) return { zone: '', habitat: '' }
  const parts = loc.split(',').map(s => s.trim())
  let zone = '', habitat = ''
  for (const p of parts) {
    if ((LOCATION_ZONES as readonly string[]).includes(p)) zone = p
    else if ((LOCATION_HABITATS as readonly string[]).includes(p)) habitat = p
  }
  return { zone, habitat }
}

// Get all unique location parts (zones + habitats) that are actually in use
function getLocationParts(items: InventoryItem[]): string[] {
  const parts = new Set<string>()
  for (const item of items) {
    if (!item.location) continue
    const { zone, habitat } = parseLocation(item.location)
    if (zone) parts.add(zone)
    if (habitat) parts.add(habitat)
  }
  return [...parts].sort()
}

function getFilterCount(items: InventoryItem[], filter: FilterType): number {
  const season = getCurrentSeason()
  switch (filter) {
    case 'all': return items.length
    case 'plant': return items.filter(i => i.type === 'plant').length
    case 'bug': return items.filter(i => i.type === 'bug').length
    case 'native': return items.filter(i => i.is_native).length
    case 'blooming': return items.filter(i => i.bloom?.includes(season) || i.bloom?.includes('Year-round')).length
  }
}

function getLocationCount(items: InventoryItem[], loc: string): number {
  return items.filter(i => {
    if (!i.location) return false
    const { zone, habitat } = parseLocation(i.location)
    return zone === loc || habitat === loc
  }).length
}

export function applyFilter(items: InventoryItem[], filter: FilterType): InventoryItem[] {
  const season = getCurrentSeason()
  switch (filter) {
    case 'all': return items
    case 'plant': return items.filter(i => i.type === 'plant')
    case 'bug': return items.filter(i => i.type === 'bug')
    case 'native': return items.filter(i => i.is_native)
    case 'blooming': return items.filter(i => i.bloom?.includes(season) || i.bloom?.includes('Year-round'))
  }
}

export function applyLocationFilter(items: InventoryItem[], location: string): InventoryItem[] {
  if (!location) return items
  return items.filter(i => {
    if (!i.location) return false
    const { zone, habitat } = parseLocation(i.location)
    return zone === location || habitat === location
  })
}

export function applyZoneFilter(items: InventoryItem[], zone: string, placements: GardenPlacement[], beds: GardenBed[]): InventoryItem[] {
  if (!zone) return items
  const bed = beds.find(b => b.id === zone)
  if (!bed) return items
  const placedIds = new Set(placements.filter(p => p.bed_id === zone).map(p => p.inventory_id))
  return items.filter(i => placedIds.has(i.id))
}

export function applySearch(items: InventoryItem[], query: string): InventoryItem[] {
  if (!query.trim()) return items
  const q = query.toLowerCase()
  return items.filter(i =>
    (i.common?.toLowerCase().includes(q)) ||
    (i.scientific?.toLowerCase().includes(q)) ||
    (i.category?.toLowerCase().includes(q)) ||
    (i.notes?.toLowerCase().includes(q)) ||
    (i.tags?.some(t => t.toLowerCase().includes(q))) ||
    (i.location?.toLowerCase().includes(q))
  )
}

export function applySort(items: InventoryItem[], sort: SortType): InventoryItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'date-desc': return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    case 'date-asc': return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    case 'name-asc': return sorted.sort((a, b) => (a.common ?? '').localeCompare(b.common ?? ''))
    case 'name-desc': return sorted.sort((a, b) => (b.common ?? '').localeCompare(a.common ?? ''))
    case 'location': return sorted.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''))
  }
}

export default function FilterBar({ items, activeFilter, activeSort, activeLocation, activeZone, beds, placements, onFilterChange, onSortChange, onLocationChange, onZoneChange }: FilterBarProps) {
  const locationParts = getLocationParts(items)

  function getZonePlantCount(bedId: string): number {
    return placements.filter(p => p.bed_id === bedId).length
  }

  return (
    <div className="space-y-3">
      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => {
          const count = getFilterCount(items, f.value)
          const active = activeFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active ? 'bg-primary text-white' : 'bg-white text-ink-mid border border-cream-dark hover:border-sage'
              }`}
            >
              {f.label}
              <span className={`ml-1 ${active ? 'text-white/70' : 'text-ink-light'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Garden zone filter chips */}
      {beds.length > 0 && (
        <div className="flex items-center gap-2">
          <Map size={14} className="text-ink-light flex-shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {beds.map(bed => {
              const active = activeZone === bed.id
              const count = getZonePlantCount(bed.id)
              return (
                <button
                  key={bed.id}
                  onClick={() => onZoneChange(active ? '' : bed.id)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    active ? 'bg-sage text-white' : 'bg-white text-ink-mid border border-cream-dark hover:border-sage'
                  }`}
                >
                  {bed.name ?? 'Unnamed'}
                  <span className={`ml-1 ${active ? 'text-white/70' : 'text-ink-light'}`}>{count}</span>
                </button>
              )
            })}
            {activeZone && (
              <button
                onClick={() => onZoneChange('')}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-cream-dark text-ink-light flex items-center justify-center hover:text-ink min-h-0 min-w-0"
                aria-label="Clear zone filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Location filter chips */}
      {locationParts.length > 0 && (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-ink-light flex-shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {locationParts.map(loc => {
              const active = activeLocation === loc
              const count = getLocationCount(items, loc)
              return (
                <button
                  key={loc}
                  onClick={() => onLocationChange(active ? '' : loc)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    active ? 'bg-sage text-white' : 'bg-white text-ink-mid border border-cream-dark hover:border-sage'
                  }`}
                >
                  {loc}
                  <span className={`ml-1 ${active ? 'text-white/70' : 'text-ink-light'}`}>{count}</span>
                </button>
              )
            })}
            {activeLocation && (
              <button
                onClick={() => onLocationChange('')}
                className="flex-shrink-0 w-6 h-6 rounded-full bg-cream-dark text-ink-light flex items-center justify-center hover:text-ink min-h-0 min-w-0"
                aria-label="Clear location filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-light">Sort:</span>
        <div className="flex gap-1.5">
          {SORTS.map(s => (
            <button
              key={s.value}
              onClick={() => onSortChange(s.value)}
              className={`text-xs px-2 py-1 rounded transition-colors min-h-0 min-w-0 ${
                activeSort === s.value ? 'text-primary font-medium' : 'text-ink-light hover:text-ink-mid'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
