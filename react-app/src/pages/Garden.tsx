import { useState, useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import ScreenHeader from '@/components/layout/ScreenHeader'
import CareDashboard from '@/components/garden/CareDashboard'
import SearchBar from '@/components/garden/SearchBar'
import FilterBar, { applyFilter, applyLocationFilter, applyZoneFilter, applySearch, applySort } from '@/components/garden/FilterBar'
import type { FilterType, SortType } from '@/components/garden/FilterBar'
import PlantCard from '@/components/garden/PlantCard'
import PlantCardSkeleton from '@/components/garden/PlantCardSkeleton'
import ItemDetail from '@/components/garden/ItemDetail'
import HealthLogSheet from '@/components/health/HealthLogSheet'
import { useInventory } from '@/hooks/useInventory'
import { useGardenMap } from '@/hooks/useGardenMap'
import { useReminders } from '@/hooks/useReminders'
import { useAuth } from '@/hooks/useAuth'
import type { InventoryItem } from '@/types'

export default function Garden() {
  const { items, loading, stats, deleteItem, updateItem, refresh } = useInventory()
  const { beds, placements, placeItem, removePlacement } = useGardenMap()
  const { reminders, loading: remindersLoading, toggle, addCustom, deleteReminder, generate, isStale } = useReminders(items)
  const { signOut } = useAuth()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('date-desc')
  const [location, setLocation] = useState('')
  const [zone, setZone] = useState('')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [healthItem, setHealthItem] = useState<InventoryItem | null>(null)
  const [view, setView] = useState<'plants' | 'care'>('plants')

  const filteredItems = useMemo(() => {
    let result = applyFilter(items, filter)
    result = applyLocationFilter(result, location)
    result = applyZoneFilter(result, zone, placements, beds)
    result = applySearch(result, search)
    result = applySort(result, sort)
    return result
  }, [items, filter, location, zone, placements, beds, search, sort])

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
              aria-label="Sign out"
              onClick={() => { if (window.confirm('Sign out?')) signOut() }}
            >
              <LogOut size={20} />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-3">
        <div className="flex bg-cream-dark rounded-full p-0.5">
          <button
            onClick={() => setView('plants')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
              view === 'plants' ? 'bg-primary text-white' : 'text-ink-mid'
            }`}
          >
            Plants
          </button>
          <button
            onClick={() => setView('care')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
              view === 'care' ? 'bg-primary text-white' : 'text-ink-mid'
            }`}
          >
            Care
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {view === 'care' ? (
          <CareDashboard
            inventory={items}
            reminders={reminders}
            remindersLoading={remindersLoading}
            isStaleReminders={isStale()}
            onToggleReminder={toggle}
            onAddCustomReminder={addCustom}
            onDeleteReminder={deleteReminder}
            onGenerateReminders={generate}
          />
        ) : (
        <>
        {items.length > 0 && (
          <FilterBar
            items={items}
            activeFilter={filter}
            activeSort={sort}
            activeLocation={location}
            activeZone={zone}
            beds={beds}
            placements={placements}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onLocationChange={setLocation}
            onZoneChange={setZone}
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
        </>
        )}
      </div>

      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onUpdate={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
        placements={placements}
        beds={beds}
        onPlaceInZone={async (inventoryId, bedId, x, y) => {
          const result = await placeItem(inventoryId, x, y, bedId)
          if (result.error && result.error !== 'duplicate') {
            toast.error('Failed to place in zone')
          }
          return { error: result.error }
        }}
        onRemovePlacement={async (placementId) => {
          await removePlacement(placementId)
        }}
      />
      <HealthLogSheet
        item={healthItem}
        open={!!healthItem}
        onClose={() => setHealthItem(null)}
        onSaved={() => refresh()}
      />
    </>
  )
}
