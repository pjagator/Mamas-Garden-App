import { useLocation, useNavigate } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface BottomNavProps {
  onFabClick: () => void
}

function LeafIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'var(--color-ink-light)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function CompassIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'var(--color-ink-light)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'var(--color-ink-light)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'var(--color-ink-light)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Garden', path: '/', icon: null },
  { label: 'Map', path: '/map', icon: null },
  { label: 'Wishlist', path: '/wishlist', icon: null },
  { label: 'Timeline', path: '/timeline', icon: null },
]

export default function BottomNav({ onFabClick }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(path: string) {
    return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  }

  function renderIcon(path: string) {
    const active = isActive(path)
    if (path === '/') return <LeafIcon active={active} />
    if (path === '/map') return <CompassIcon active={active} />
    if (path === '/wishlist') return <HeartIcon active={active} />
    if (path === '/timeline') return <CalendarIcon active={active} />
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-cream-dark z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex items-end h-16 relative">
        {/* Left two items */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] pt-2"
            aria-label={item.label}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            {renderIcon(item.path)}
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-ink-light)' }}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* Center FAB */}
        <div className="flex-shrink-0 flex flex-col items-center justify-end pb-2" style={{ width: '80px' }}>
          <button
            onClick={onFabClick}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg -mt-5"
            style={{ backgroundColor: 'var(--color-primary)' }}
            aria-label="Capture new species"
          >
            <CameraIcon />
          </button>
        </div>

        {/* Right two items */}
        {NAV_ITEMS.slice(2).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] pt-2"
            aria-label={item.label}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            {renderIcon(item.path)}
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive(item.path) ? 'var(--color-primary)' : 'var(--color-ink-light)' }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
