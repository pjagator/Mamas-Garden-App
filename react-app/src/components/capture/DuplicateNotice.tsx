import { Sprout } from 'lucide-react'
import type { InventoryItem } from '@/types'

function relativeDate(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) { const m = Math.round(days / 30); return `${m} month${m > 1 ? 's' : ''} ago` }
  const y = Math.round(days / 365); return `${y} year${y > 1 ? 's' : ''} ago`
}

export default function DuplicateNotice({ matches }: { matches: InventoryItem[] }) {
  if (!matches.length) return null
  const common = matches[0].common || 'this species'
  const count = matches.length
  const when = count === 1 ? relativeDate(matches[0].date) : ''
  const detail = count === 1
    ? `1 in your garden${when ? ` · added ${when}` : ''}`
    : `${count} in your garden`

  return (
    <div className="flex items-start gap-2 rounded-[--radius-card] border border-terra/40 bg-terra/10 p-4 mb-3">
      <Sprout size={18} className="text-terra flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-terra">You already grow {common}</p>
        <p className="text-xs text-ink-mid mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
