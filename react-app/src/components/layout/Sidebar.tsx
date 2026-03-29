import { useLocation, useNavigate } from 'react-router-dom'
import { Leaf, Compass, Heart, Calendar, Camera } from 'lucide-react'

interface SidebarProps {
  onFabClick: () => void
}

const NAV_ITEMS = [
  { label: 'Garden', path: '/', icon: Leaf },
  { label: 'Map', path: '/map', icon: Compass },
  { label: 'Wishlist', path: '/wishlist', icon: Heart },
  { label: 'Timeline', path: '/timeline', icon: Calendar },
] as const

export default function Sidebar({ onFabClick }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(path: string) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-cream-dark flex flex-col z-50">
      <div className="px-5 py-6 border-b border-cream-dark">
        <span className="font-display text-xl font-bold text-primary">Tampa Garden</span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-[calc(100%-16px)] flex items-center gap-3 px-4 py-3 text-left rounded-lg mx-2 transition-colors ${
                active
                  ? 'bg-sage-light text-primary'
                  : 'text-ink-mid hover:bg-cream-dark'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-cream-dark">
        <button
          onClick={onFabClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
        >
          <Camera size={18} />
          <span>Capture</span>
        </button>
      </div>
    </aside>
  )
}
