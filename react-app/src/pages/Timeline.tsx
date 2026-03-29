import { useMemo } from 'react'
import { Flower2, Bug } from 'lucide-react'
import ScreenHeader from '@/components/layout/ScreenHeader'
import { useInventory } from '@/hooks/useInventory'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { InventoryItem } from '@/types'

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const

function getSeasonItems(items: InventoryItem[], season: string) {
  const plants = items.filter(i => i.type === 'plant' && i.bloom && (i.bloom.includes(season) || i.bloom.includes('Year-round')))
  const insects = items.filter(i => i.type === 'bug' && i.season && (i.season.includes(season) || i.season.includes('Year-round')))
  return { plants, insects }
}

function TimelineEntry({ item }: { item: InventoryItem }) {
  const isPlant = item.type === 'plant'
  const Icon = isPlant ? Flower2 : Bug
  const dotColor = isPlant ? 'bg-terra-light' : 'bg-sage'
  const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="relative pl-8 pb-5 last:pb-0">
      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow-sm flex items-center justify-center`}>
        <Icon size={8} className="text-white" />
      </div>
      <div className="bg-white rounded-[--radius-sm] p-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-sm font-medium text-ink truncate">{item.common ?? 'Unknown'}</h4>
            {item.scientific && <p className="text-[11px] text-ink-light italic truncate">{item.scientific}</p>}
          </div>
          <span className="text-[10px] text-ink-light ml-2 flex-shrink-0">{dateStr}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.is_native && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-sage-light text-primary border-0">Native</Badge>}
          {item.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{item.category}</Badge>}
        </div>
      </div>
    </div>
  )
}

export default function Timeline() {
  const { items } = useInventory()
  const year = new Date().getFullYear()
  const hasAnyItems = useMemo(() => SEASONS.some(s => { const { plants, insects } = getSeasonItems(items, s); return plants.length > 0 || insects.length > 0 }), [items])

  return (
    <>
      <ScreenHeader title="Seasonal Timeline" subtitle={hasAnyItems ? `${year} garden calendar` : undefined} />
      <div className="p-4 space-y-6">
        {items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4"><Flower2 size={28} className="text-sage" /></div>
            <h3 className="font-display text-lg text-primary">Your timeline awaits</h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto">As you catalog species, they'll appear here organized by their active seasons.</p>
          </div>
        ) : (
          SEASONS.map(season => {
            const { plants, insects } = getSeasonItems(items, season)
            const allItems = [...plants, ...insects]
            return (
              <div key={season}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="font-display text-base font-medium text-primary">{season} {year}</h2>
                  <Separator className="flex-1" />
                </div>
                {allItems.length === 0 ? (
                  <p className="text-sm text-ink-light italic pl-8 py-2">Nothing cataloged for this season yet.</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[7px] top-3 bottom-3 w-px bg-cream-dark" />
                    {allItems.map(item => <TimelineEntry key={item.id} item={item} />)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
