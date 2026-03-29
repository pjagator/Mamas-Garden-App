import { Heart, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { confidenceClass } from '@/lib/constants'

interface IdResult {
  common: string
  scientific: string
  type: string
  category: string
  confidence: number
  isNative: boolean
  description: string
  care: string | null
  bloom: string[] | null
  season: string[] | null
}

interface IdResultCardProps {
  result: IdResult
  selected: boolean
  onSelect: () => void
}

export type { IdResult }

export default function IdResultCard({ result, selected, onSelect }: IdResultCardProps) {
  const level = confidenceClass(result.confidence)
  const confidenceColors = {
    high: 'bg-sage-light text-primary',
    mid: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-[--radius-card] border-2 p-4 transition-colors ${
        selected ? 'border-primary bg-sage-light/30' : 'border-cream-dark bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-medium text-ink truncate">{result.common}</h3>
            {selected && <Check size={16} className="text-primary flex-shrink-0" />}
          </div>
          {result.scientific && (
            <p className="text-xs text-ink-light italic truncate mt-0.5">{result.scientific}</p>
          )}
        </div>
        <Badge variant="secondary" className={`text-[10px] flex-shrink-0 ${confidenceColors[level]} border-0`}>
          {result.confidence}%
        </Badge>
      </div>

      {result.description && (
        <p className="text-xs text-ink-mid mt-2 line-clamp-2">{result.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {result.isNative && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light text-primary border-0">
            <Heart size={10} className="mr-0.5" fill="currentColor" /> Native
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{result.category || result.type}</Badge>
        {result.bloom && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-cream border-0">
            {result.bloom.join(', ')}
          </Badge>
        )}
      </div>
    </button>
  )
}
