import { useLocation, useNavigate } from 'react-router-dom'
import { Flower2, Map, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: 'Garden', icon: Flower2 },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/timeline', label: 'Timeline', icon: Clock },
]

interface BottomNavProps {
  onCapture: () => void
}

export function BottomNav({ onCapture }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-green-light/20 pb-safe"
      style={{ height: `calc(72px + env(safe-area-inset-bottom, 0px))` }}
    >
      <div className="flex items-center justify-around h-[72px] max-w-lg mx-auto relative">
        {/* Garden tab */}
        <NavButton
          tab={tabs[0]}
          active={location.pathname === '/'}
          onClick={() => navigate('/')}
        />

        {/* Map tab */}
        <NavButton
          tab={tabs[1]}
          active={location.pathname === '/map'}
          onClick={() => navigate('/map')}
        />

        {/* FAB (centered) */}
        <button
          onClick={onCapture}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 -top-5',
            'w-14 h-14 rounded-full bg-green-deep text-cream',
            'shadow-lg flex items-center justify-center',
            'active:scale-95 transition-transform duration-150',
            'hover:bg-green-mid'
          )}
          aria-label="Capture species"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Timeline tab */}
        <NavButton
          tab={tabs[2]}
          active={location.pathname === '/timeline'}
          onClick={() => navigate('/timeline')}
        />
      </div>
    </nav>
  )
}

function NavButton({
  tab,
  active,
  onClick,
}: {
  tab: (typeof tabs)[0]
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
        active ? 'text-green-deep' : 'text-ink-light'
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-medium">{tab.label}</span>
    </button>
  )
}
