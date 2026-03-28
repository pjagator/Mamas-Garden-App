import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Plus, MapPin, Sparkles, ArrowRight } from 'lucide-react'
import type { WishlistItem } from '@/types'
import { SUN_EXPOSURES } from '@/lib/constants'

interface WishlistProps {
  items: WishlistItem[]
  onAddClick: () => void
  onItemClick: (item: WishlistItem) => void
  onMoveToGarden: (item: WishlistItem) => void
}

export function WishlistPage({ items, onAddClick, onItemClick, onMoveToGarden }: WishlistProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Friends of the Garden"
        subtitle="Plants you've admired and hope to grow"
        action={
          <button
            onClick={onAddClick}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-cream hover:bg-white/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 px-4 py-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-green-light/10 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-green-light" />
            </div>
            <h2 className="font-display text-xl text-green-deep mb-2">
              No friends yet
            </h2>
            <p className="text-ink-mid text-sm max-w-xs mb-6">
              Spot a beautiful plant at a garden center, botanical garden, or a neighbor's yard?
              Capture it here as a "friend" — a plant your garden hasn't met yet.
            </p>
            <Button onClick={onAddClick}>
              <Plus className="w-5 h-5 mr-2" />
              Add your first friend
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer active:scale-[0.97] transition-transform duration-150 border-dashed border-green-sage/30"
                onClick={() => onItemClick(item)}
              >
                {/* Image with wishlist overlay */}
                <div className="aspect-square bg-cream-dark relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.common ?? ''}
                      className="w-full h-full object-cover opacity-90"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-10 h-10 text-green-light" />
                    </div>
                  )}
                  {/* Dreamy overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
                </div>

                <div className="p-3">
                  <h3 className="font-display text-sm font-semibold text-green-deep truncate">
                    {item.common || 'Unknown friend'}
                  </h3>
                  {item.scientific && (
                    <p className="text-xs text-ink-light italic truncate mt-0.5">
                      {item.scientific}
                    </p>
                  )}

                  {item.spotted_at && (
                    <p className="text-xs text-ink-light flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3" />
                      {item.spotted_at}
                    </p>
                  )}

                  {item.suggested_zones && item.suggested_zones.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-terra" />
                      <span className="text-[10px] text-terra">
                        Best in: {item.suggested_zones[0]}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.is_native && (
                      <Badge variant="native" className="text-[10px] px-1.5 py-0">
                        Native
                      </Badge>
                    )}
                    {item.sun_needs && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {SUN_EXPOSURES.find((s) => s.value === item.sun_needs)?.icon}{' '}
                        {SUN_EXPOSURES.find((s) => s.value === item.sun_needs)?.label}
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveToGarden(item)
                    }}
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Add to garden
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
