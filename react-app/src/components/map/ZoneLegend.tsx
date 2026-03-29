import { X } from 'lucide-react'

interface ZoneLegendProps { onClose: () => void }

const LEGEND_ITEMS = [
  { label: 'Full Sun', color: 'rgba(250, 204, 21, 0.5)' },
  { label: 'Partial Sun', color: 'rgba(132, 204, 22, 0.5)' },
  { label: 'Partial Shade', color: 'rgba(34, 197, 94, 0.4)' },
  { label: 'Full Shade', color: 'rgba(148, 163, 184, 0.4)' },
  { label: 'Default', color: 'rgba(122, 158, 126, 0.4)' },
]

export default function ZoneLegend({ onClose }: ZoneLegendProps) {
  return (
    <div className="absolute top-3 right-3 bg-white rounded-[--radius-card] shadow-md p-3 z-10 min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-primary">Zone Legend</h3>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-ink-light hover:text-ink min-h-0 min-w-0">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border border-cream-dark" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-ink-mid">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
