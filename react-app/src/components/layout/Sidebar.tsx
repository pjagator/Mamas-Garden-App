import { useLocation, useNavigate } from 'react-router-dom'

interface SidebarProps {
  onFabClick: () => void
}

interface NavItem {
  label: string
  path: string
  emoji: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Garden', path: '/', emoji: '🌿' },
  { label: 'Map', path: '/map', emoji: '🧭' },
  { label: 'Wishlist', path: '/wishlist', emoji: '💚' },
  { label: 'Timeline', path: '/timeline', emoji: '📅' },
]

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export default function Sidebar({ onFabClick }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(path: string) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-cream-dark flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-cream-dark">
        <span className="font-display text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          Tampa Garden
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mx-2 transition-colors"
              style={{
                width: 'calc(100% - 16px)',
                backgroundColor: active ? 'var(--color-sage-light)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-ink-mid)',
              }}
              aria-current={active ? 'page' : undefined}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-cream-dark)'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              }}
            >
              <span className="text-lg leading-none" aria-hidden="true">{item.emoji}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Capture button */}
      <div className="p-4 border-t border-cream-dark">
        <button
          onClick={onFabClick}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <CameraIcon />
          <span>Capture</span>
        </button>
      </div>
    </aside>
  )
}
