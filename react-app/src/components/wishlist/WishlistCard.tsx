import { Leaf, Bug, Heart, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { WishlistItem } from '@/types'

interface WishlistCardProps {
  item: WishlistItem
  index: number
  onClick: () => void
}

function PlaceholderIcon({ type }: { type: string | null }) {
  if (type === 'bug') return <Bug size={28} className="text-ink-light/40" />
  return <Leaf size={28} className="text-ink-light/40" />
}

export default function WishlistCard({ item, index, onClick }: WishlistCardProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-[--radius-card] border-2 border-dashed border-sage/40 bg-white/70 overflow-hidden text-left transition-transform active:scale-[0.98] w-full opacity-0 animate-[fadeSlideIn_0.3s_ease_forwards]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[4/3] bg-cream/50 relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.common ?? 'Plant photo'} className="w-full h-full object-cover opacity-85" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><PlaceholderIcon type={item.type} /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm font-medium text-ink leading-tight truncate">{item.common ?? 'Unknown species'}</h3>
        {item.scientific && <p className="text-xs text-ink-light italic truncate mt-0.5">{item.scientific}</p>}
        <div className="flex flex-wrap gap-1 mt-2">
          {item.is_native && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light/60 text-primary border-0">
              <Heart size={10} className="mr-0.5" fill="currentColor" /> Native
            </Badge>
          )}
          {item.spotted_at && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-dashed">
              <MapPin size={9} className="mr-0.5" /> {item.spotted_at}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
