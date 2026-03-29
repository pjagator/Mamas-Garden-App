import { getCurrentSeason } from '@/lib/constants'
import type { InventoryItem } from '@/types'

export type FilterType = 'all' | 'plant' | 'bug' | 'native' | 'blooming'
export type SortType = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'location'

interface FilterBarProps {
  items: InventoryItem[]
  activeFilter: FilterType
  activeSort: SortType
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortType) => void
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
  { value: 'name-asc', label: 'A \u2192 Z' },
  { value: 'name-desc', label: 'Z \u2192 A' },
  { value: 'location', label: 'Location' },
]

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

export default function FilterBar({ items, activeFilter, activeSort, onFilterChange, onSortChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
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
