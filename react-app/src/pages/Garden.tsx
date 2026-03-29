import { useState, useMemo } from 'react'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import ScreenHeader from '@/components/layout/ScreenHeader'
import SettingsSheet from '@/pages/Settings'
import SearchBar from '@/components/garden/SearchBar'
import FilterBar, { applyFilter, applyLocationFilter, applySearch, applySort } from '@/components/garden/FilterBar'
import type { FilterType, SortType } from '@/components/garden/FilterBar'
import PlantCard from '@/components/garden/PlantCard'
import PlantCardSkeleton from '@/components/garden/PlantCardSkeleton'
import ItemDetail from '@/components/garden/ItemDetail'
import HealthLogSheet from '@/components/health/HealthLogSheet'
import ReminderList from '@/components/reminders/ReminderList'
import { useInventory } from '@/hooks/useInventory'
import { useReminders } from '@/hooks/useReminders'
import type { InventoryItem } from '@/types'

export default function Garden() {
  const { items, loading, stats, deleteItem, refresh } = useInventory()
  const { reminders, loading: remindersLoading, toggle, addCustom, deleteReminder, generate, isStale } = useReminders(items)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('date-desc')
  const [location, setLocation] = useState('')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [healthItem, setHealthItem] = useState<InventoryItem | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const filteredItems = useMemo(() => {
    let result = applyFilter(items, filter)
    result = applyLocationFilter(result, location)
    result = applySearch(result, search)
    result = applySort(result, sort)
    return result
  }, [items, filter, location, search, sort])

  const hasPlants = items.some(i => i.type === 'plant')

  async function handleDelete(id: string, imageUrl?: string | null) {
    const ok = window.confirm('Remove this from your garden? This cannot be undone.')
    if (!ok) return
    const success = await deleteItem(id, imageUrl)
    if (success) {
      setSelectedItem(null)
      toast.success('Removed from garden')
    } else {
      toast.error('Failed to remove. Please try again.')
    }
  }

  const subtitle = [
    stats.plants > 0 ? `${stats.plants} species cataloged` : null,
    stats.insects > 0 ? `${stats.insects} visitors observed` : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <ScreenHeader
        title="My Garden"
        subtitle={subtitle || undefined}
        actions={
          <div className="flex items-center gap-1">
            <SearchBar value={search} onChange={setSearch} />
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={20} />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {hasPlants && (
          <ReminderList
            reminders={reminders}
            loading={remindersLoading}
            isStale={isStale()}
            onToggle={toggle}
            onAddCustom={addCustom}
            onDelete={deleteReminder}
            onGenerate={generate}
          />
        )}

        {items.length > 0 && (
          <FilterBar
            items={items}
            activeFilter={filter}
            activeSort={sort}
            activeLocation={location}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onLocationChange={setLocation}
          />
        )}

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PlantCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, i) => (
              <PlantCard
                key={item.id}
                item={item}
                index={i}
                onClick={() => setSelectedItem(item)}
                onHealthClick={() => setHealthItem(item)}
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-light text-sm">No matches for your current filters.</p>
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <h3 className="font-display text-lg text-primary">Every garden begins with a single planting</h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto">
              Tap the camera button to photograph and identify your first species.
            </p>
          </div>
        )}
      </div>

      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
      />
      <HealthLogSheet
        item={healthItem}
        open={!!healthItem}
        onClose={() => setHealthItem(null)}
        onSaved={() => refresh()}
      />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
