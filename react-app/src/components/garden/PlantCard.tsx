import { Leaf, Bug, Heart, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCurrentSeason } from '@/lib/constants'
import type { InventoryItem, HealthStatus } from '@/types'

interface PlantCardProps {
  item: InventoryItem
  index: number
  onClick: () => void
  onHealthClick?: () => void
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  thriving: '#22c55e',
  healthy: '#4ade80',
  stressed: '#f59e0b',
  sick: '#ef4444',
  dormant: '#94a3b8',
  new: '#3b82f6',
}

function PlaceholderIcon({ type }: { type: string | null }) {
  if (type === 'bug') return <Bug size={32} className="text-ink-light" />
  return <Leaf size={32} className="text-ink-light" />
}

export default function PlantCard({ item, index, onClick, onHealthClick }: PlantCardProps) {
  const season = getCurrentSeason()
  const isBlooming = item.bloom?.includes(season) || item.bloom?.includes('Year-round')

  return (
    <button
      onClick={onClick}
      className="rounded-[--radius-card] bg-white shadow-sm overflow-hidden text-left transition-transform active:scale-[0.98] w-full opacity-0 animate-[fadeSlideIn_0.3s_ease_forwards]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[4/3] bg-cream relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.common ?? 'Plant photo'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-cream-dark">
            <PlaceholderIcon type={item.type} />
          </div>
        )}
        {item.health && (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: HEALTH_COLORS[item.health] }}
            title={item.health}
          />
        )}
        {item.type === 'plant' && onHealthClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onHealthClick() }}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center min-h-0 min-w-0"
            title="Log health check"
          >
            <Activity size={14} className="text-sage" />
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display text-sm font-medium text-ink leading-tight truncate">
          {item.nickname ?? item.common ?? 'Unknown species'}
        </h3>
        {item.nickname && item.common && (
          <p className="text-xs text-ink-light truncate mt-0.5">{item.common}</p>
        )}
        {item.scientific && (
          <p className="text-xs text-ink-light italic truncate mt-0.5">{item.scientific}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {item.is_native && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light text-primary border-0">
              <Heart size={10} className="mr-0.5" fill="currentColor" /> Native
            </Badge>
          )}
          {isBlooming && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-terra-light text-terra border-0">
              Blooming
            </Badge>
          )}
          {item.location && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{item.location}</Badge>
          )}
        </div>
      </div>
    </button>
  )
}
