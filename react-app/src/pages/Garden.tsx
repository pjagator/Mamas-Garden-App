import { useState, useMemo } from 'react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Settings, Flower2, Bug, Leaf, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentSeason } from '@/lib/constants'
import type { InventoryItem } from '@/types'

interface GardenProps {
  items: InventoryItem[]
  loading: boolean
  onItemClick: (item: InventoryItem) => void
  onSettingsClick: () => void
}

type FilterType = 'all' | 'plants' | 'insects' | 'natives' | 'blooming'

export function GardenPage({ items, loading, onItemClick, onSettingsClick }: GardenProps) {
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  const currentSeason = getCurrentSeason()

  const filteredItems = useMemo(() => {
    let result = items

    // Apply type filter
    switch (filter) {
      case 'plants':
        result = result.filter((i) => i.type === 'plant')
        break
      case 'insects':
        result = result.filter((i) => i.type === 'bug')
        break
      case 'natives':
        result = result.filter((i) => i.is_native)
        break
      case 'blooming':
        result = result.filter(
          (i) =>
            i.type === 'plant' &&
            (i.bloom?.includes(currentSeason) || i.bloom?.includes('Year-round'))
        )
        break
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.common?.toLowerCase().includes(q) ||
          i.scientific?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q)) ||
          i.location?.toLowerCase().includes(q)
      )
    }

    return result
  }, [items, filter, search, currentSeason])

  const plantCount = items.filter((i) => i.type === 'plant').length
  const bugCount = items.filter((i) => i.type === 'bug').length
  const nativeCount = items.filter((i) => i.is_native).length

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: items.length },
    { key: 'plants', label: 'Plants', count: plantCount },
    { key: 'insects', label: 'Insects', count: bugCount },
    { key: 'natives', label: 'Native', count: nativeCount },
    { key: 'blooming', label: 'Blooming Now' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Your Garden"
        subtitle={`${plantCount} species cataloged · ${bugCount} visitors observed`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-cream hover:bg-white/20 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onSettingsClick}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-cream hover:bg-white/20 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Search overlay */}
      {searchOpen && (
        <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-b border-green-light/20 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light" />
            <Input
              placeholder="Search your garden..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all',
              filter === f.key
                ? 'bg-green-deep text-cream shadow-sm'
                : 'bg-white text-ink-mid hover:bg-cream-dark border border-green-light/20'
            )}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={cn('ml-1.5', filter === f.key ? 'text-cream/70' : 'text-ink-light')}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plant grid */}
      <div className="flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-green-sage/30 border-t-green-deep rounded-full animate-spin" />
              <p className="text-ink-light text-sm">Loading your garden...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Leaf className="w-12 h-12 text-green-light mb-4" />
            <p className="font-display text-lg text-green-deep mb-2">
              {items.length === 0 ? 'Your garden awaits' : 'No matches found'}
            </p>
            <p className="text-ink-light text-sm">
              {items.length === 0
                ? 'Tap the + button to identify your first species'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <PlantCard key={item.id} item={item} onClick={() => onItemClick(item)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PlantCard({ item, onClick }: { item: InventoryItem; onClick: () => void }) {
  const TypeIcon = item.type === 'plant' ? Flower2 : Bug

  return (
    <Card
      className="overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-150"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-square bg-cream-dark relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.common}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-10 h-10 text-green-light" />
          </div>
        )}

        {/* Health indicator */}
        {item.health && (item.health === 'stressed' || item.health === 'sick') && (
          <div className="absolute top-2 right-2">
            <Heart className="w-4 h-4 text-terra fill-terra" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-display text-sm font-semibold text-green-deep truncate">
          {item.common || 'Unknown species'}
        </h3>
        {item.scientific && (
          <p className="text-xs text-ink-light italic truncate mt-0.5">
            {item.scientific}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {item.is_native && (
            <Badge variant="native" className="text-[10px] px-1.5 py-0">
              Native
            </Badge>
          )}
          {item.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}
