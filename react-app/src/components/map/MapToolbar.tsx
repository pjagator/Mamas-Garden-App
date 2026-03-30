import { PenTool, Flower2, Hand, Maximize, Map, Settings } from 'lucide-react'

export type MapMode = 'view' | 'draw' | 'place' | 'edit'

interface MapToolbarProps {
  mode: MapMode
  onModeChange: (mode: MapMode) => void
  onFitView: () => void
  onToggleLegend: () => void
  onSettings: () => void
}

const TOOLS: { mode: MapMode; icon: typeof Hand; label: string }[] = [
  { mode: 'draw', icon: PenTool, label: 'Add Zone' },
  { mode: 'place', icon: Flower2, label: 'Place Plant' },
  { mode: 'edit', icon: Hand, label: 'Edit' },
]

export default function MapToolbar({ mode, onModeChange, onFitView, onToggleLegend, onSettings }: MapToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-cream-dark">
      <div className="flex gap-1">
        {TOOLS.map(t => {
          const Icon = t.icon
          const active = mode === t.mode
          return (
            <button key={t.mode} onClick={() => onModeChange(active ? 'view' : t.mode)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                active ? 'bg-sage-light text-primary' : 'text-ink-mid'
              }`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {t.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1">
        <button onClick={onFitView} className="w-11 h-11 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary" title="Fit view">
          <Maximize size={18} />
        </button>
        <button onClick={onToggleLegend} className="w-11 h-11 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary" title="Legend">
          <Map size={18} />
        </button>
        <button onClick={onSettings} className="w-11 h-11 flex items-center justify-center rounded-lg text-ink-mid hover:text-primary" title="Map settings">
          <Settings size={18} />
        </button>
      </div>
    </div>
  )
}
