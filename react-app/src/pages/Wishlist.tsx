import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import ScreenHeader from '@/components/layout/ScreenHeader'
import WishlistCard from '@/components/wishlist/WishlistCard'
import WishlistDetail from '@/components/wishlist/WishlistDetail'
import { useWishlist } from '@/hooks/useWishlist'
import { useGardenMap } from '@/hooks/useGardenMap'
import { useInventory } from '@/hooks/useInventory'
import type { WishlistItem } from '@/types'

export default function Wishlist() {
  const { items, loading, deleteItem, updateItem, suggestPlacement, graduateToGarden } = useWishlist()
  const { beds } = useGardenMap()
  const { refresh: refreshInventory } = useInventory()
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  async function handleGraduate(id: string) {
    const item = items.find(i => i.id === id)
    const success = await graduateToGarden(id)
    if (success) {
      setSelectedItem(null)
      refreshInventory()
      toast.success(`${item?.common ?? 'Plant'} has joined your garden`)
    } else {
      toast.error('Failed to add to garden. Please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remove this friend? This cannot be undone.')) return
    await deleteItem(id)
    setSelectedItem(null)
    toast.success('Removed from wishlist')
  }

  return (
    <>
      <ScreenHeader
        title="Friends of the Garden"
        subtitle={items.length > 0 ? `${items.length} friends waiting` : undefined}
      />
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12"><p className="text-ink-light text-sm">Loading...</p></div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, i) => (
              <WishlistCard key={item.id} item={item} index={i} onClick={() => setSelectedItem(item)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light/40 mx-auto flex items-center justify-center mb-4">
              <Heart size={28} className="text-sage" />
            </div>
            <h3 className="font-display text-lg text-primary">You haven't met any new friends yet</h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto italic font-display">
              Take a walk and see who catches your eye. Snap a photo of any plant you admire and save it as a friend.
            </p>
          </div>
        )}
      </div>
      <WishlistDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onGraduate={handleGraduate}
        onDelete={handleDelete}
        onSuggestPlacement={suggestPlacement}
        gardenZones={beds}
        onUpdateItem={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
      />
    </>
  )
}
