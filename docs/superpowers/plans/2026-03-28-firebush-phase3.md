# Project Firebush Phase 3: Garden Inventory

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Garden Inventory page — the core screen showing the user's plant/insect collection with search, filters, sorting, item detail, care profiles, and seasonal reminders. This is the first feature with real data and where the "noticeably more enjoyable" design bar must be hit.

**Architecture:** `useInventory` hook handles Supabase CRUD + localStorage caching. Garden page renders a 2-column card grid with stagger animations and skeleton loading. Filtering/sorting is client-side on the cached data. Item detail is a shadcn Sheet (bottom sheet on mobile). Reminders section lives at the top of the Garden page with its own `useReminders` hook.

**Tech Stack:** React 18, TypeScript, Tailwind v4, shadcn/ui (Sheet, Badge, Collapsible, Checkbox, ScrollArea), Supabase JS SDK, Lucide React icons (already installed via shadcn)

**Spec:** `docs/superpowers/specs/2026-03-28-project-firebush-design.md` — Phase 3 section

**Design rules:**
- NO emoji as icons anywhere — use Lucide React or inline SVG
- 44px minimum touch targets
- Stagger animations on card grid load
- Skeleton loading placeholders while data loads
- Literary botanical language ("species cataloged", "visitors observed")
- Playfair Display for headings, system-ui for body
- All colors from the theme tokens, never hardcoded hex

---

## File Map

### New files

```
react-app/src/
├── hooks/
│   ├── useInventory.ts          # Inventory CRUD + localStorage cache + cache-first render
│   └── useReminders.ts          # Reminders fetch/toggle/add/delete + staleness detection
├── components/
│   ├── garden/
│   │   ├── PlantCard.tsx         # Inventory card with image, name, tags, health pulse
│   │   ├── PlantCardSkeleton.tsx # Skeleton loading placeholder (matches PlantCard shape)
│   │   ├── ItemDetail.tsx        # Detail sheet — hero image, info rows, care profile, tags
│   │   ├── SearchBar.tsx         # Collapsible frosted search overlay
│   │   └── FilterBar.tsx         # Type chips + tag/location/sort dropdowns
│   └── reminders/
│       └── ReminderList.tsx      # Collapsible monthly checklist with check-off + add custom
└── pages/
    └── Garden.tsx                # (modify) Full garden page with all components wired up
```

### Modified files

```
react-app/src/
├── components/layout/
│   └── Sidebar.tsx              # Replace emoji with Lucide icons
└── pages/
    └── Garden.tsx               # Replace placeholder with full implementation
```

### New shadcn components to install

```
npx shadcn@latest add badge
npx shadcn@latest add collapsible
npx shadcn@latest add checkbox
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add select
```

---

### Task 1: Install additional shadcn components + fix Sidebar emoji

**Files:**
- Modify: `react-app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Install shadcn components needed for Phase 3**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app
npx shadcn@latest add badge collapsible checkbox scroll-area separator select
```

- [ ] **Step 2: Replace Sidebar emoji with Lucide icons**

Replace the emoji-based nav items in `react-app/src/components/layout/Sidebar.tsx`. Change the imports and NAV_ITEMS to use Lucide React icons:

```tsx
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium text-sm transition-opacity hover:opacity-90 active:scale-97"
        >
          <Camera size={18} />
          <span>Capture</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build passes. No emoji in Sidebar.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(firebush): install Phase 3 shadcn components, replace Sidebar emoji with Lucide icons"
```

---

### Task 2: useInventory hook

**Files:**
- Create: `react-app/src/hooks/useInventory.ts`
- Create: `react-app/tests/hooks/useInventory.test.ts`

- [ ] **Step 1: Write the test**

Write `react-app/tests/hooks/useInventory.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInventory } from '@/hooks/useInventory'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}))

// Mock localStorage
const localStorageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStorageMock[key] ?? null,
  setItem: (key: string, value: string) => { localStorageMock[key] = value },
  removeItem: (key: string) => { delete localStorageMock[key] },
})

describe('useInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('starts with empty inventory and loading true', () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())
    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('loads items from Supabase and caches to localStorage', async () => {
    const mockItems = [
      { id: '1', common: 'Firebush', type: 'plant', is_native: true, tags: [], notes: '', location: '' },
    ]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockItems, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.items).toEqual(mockItems)
    expect(localStorageMock['garden-inventory-cache']).toBeDefined()
  })

  it('renders from cache first if available', async () => {
    const cachedItems = [{ id: 'cached-1', common: 'Cached Plant' }]
    localStorageMock['garden-inventory-cache'] = JSON.stringify({
      data: cachedItems,
      timestamp: Date.now(),
    })

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: cachedItems, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())

    // Should immediately have cached data
    expect(result.current.items).toEqual(cachedItems)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run tests/hooks/useInventory.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write useInventory hook**

Write `react-app/src/hooks/useInventory.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types'

const CACHE_KEY = 'garden-inventory-cache'
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  data: InventoryItem[]
  timestamp: number
}

function readCache(): InventoryItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_MAX_AGE) return null
    return entry.data
  } catch {
    return null
  }
}

function writeCache(data: InventoryItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (err) {
      setError(err.message)
    } else if (data) {
      setItems(data as InventoryItem[])
      writeCache(data as InventoryItem[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async () => {
    setLoading(true)
    await load()
  }, [load])

  const deleteItem = useCallback(async (id: string, imageUrl?: string | null) => {
    const { error: err } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (err) {
      setError(err.message)
      return false
    }

    // Delete image from storage if present
    if (imageUrl) {
      const path = imageUrl.split('/garden-images/')[1]
      if (path) {
        await supabase.storage.from('garden-images').remove([path])
      }
    }

    // Optimistic local update
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      writeCache(next)
      return next
    })
    return true
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const { data, error: err } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }

    // Optimistic local update
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...data } : i)
      writeCache(next)
      return next
    })
    return data as InventoryItem
  }, [])

  const stats = {
    plants: items.filter(i => i.type === 'plant').length,
    insects: items.filter(i => i.type === 'bug').length,
    natives: items.filter(i => i.is_native).length,
  }

  return { items, loading, error, stats, refresh, deleteItem, updateItem }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/hooks/useInventory.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(firebush): add useInventory hook with Supabase CRUD and localStorage cache"
```

---

### Task 3: PlantCard and PlantCardSkeleton

**Files:**
- Create: `react-app/src/components/garden/PlantCard.tsx`
- Create: `react-app/src/components/garden/PlantCardSkeleton.tsx`

- [ ] **Step 1: Create PlantCardSkeleton**

Write `react-app/src/components/garden/PlantCardSkeleton.tsx`:

```tsx
export default function PlantCardSkeleton() {
  return (
    <div className="rounded-[--radius-card] bg-white shadow-sm overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-[4/3] bg-cream-dark" />
      {/* Text placeholders */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-cream-dark rounded w-3/4" />
        <div className="h-3 bg-cream-dark rounded w-1/2" />
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 bg-cream-dark rounded-full w-14" />
          <div className="h-5 bg-cream-dark rounded-full w-10" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PlantCard**

Write `react-app/src/components/garden/PlantCard.tsx`:

```tsx
import { Leaf, Bug, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCurrentSeason } from '@/lib/constants'
import type { InventoryItem, HealthStatus } from '@/types'

interface PlantCardProps {
  item: InventoryItem
  index: number
  onClick: () => void
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

export default function PlantCard({ item, index, onClick }: PlantCardProps) {
  const season = getCurrentSeason()
  const isBlooming = item.bloom?.includes(season) || item.bloom?.includes('Year-round')

  return (
    <button
      onClick={onClick}
      className="rounded-[--radius-card] bg-white shadow-sm overflow-hidden text-left transition-transform active:scale-[0.98] w-full opacity-0 animate-[fadeSlideIn_0.3s_ease_forwards]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image or placeholder */}
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
        {/* Health pulse indicator */}
        {item.health && (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: HEALTH_COLORS[item.health] }}
            title={item.health}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-display text-sm font-medium text-ink leading-tight truncate">
          {item.common ?? 'Unknown species'}
        </h3>
        {item.scientific && (
          <p className="text-xs text-ink-light italic truncate mt-0.5">
            {item.scientific}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1 mt-2">
          {item.is_native && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light text-primary border-0">
              <Heart size={10} className="mr-0.5" fill="currentColor" />
              Native
            </Badge>
          )}
          {isBlooming && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-terra-light text-terra border-0">
              Blooming
            </Badge>
          )}
          {item.location && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {item.location}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 3: Add the stagger animation keyframe to index.css**

Add to `react-app/src/index.css` (at the end, before the reduced-motion media query):

```css
/* ── Card stagger animation ────────────────────────────────── */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(firebush): add PlantCard with stagger animation and skeleton loading placeholder"
```

---

### Task 4: SearchBar and FilterBar

**Files:**
- Create: `react-app/src/components/garden/SearchBar.tsx`
- Create: `react-app/src/components/garden/FilterBar.tsx`

- [ ] **Step 1: Create SearchBar**

Write `react-app/src/components/garden/SearchBar.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      onChange('')
    }
  }, [open, onChange])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-search-overlay]') && !target.closest('[data-search-toggle]')) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <>
      {/* Toggle button */}
      <button
        data-search-toggle
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
        aria-label={open ? 'Close search' : 'Search'}
      >
        {open ? <X size={20} /> : <Search size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          data-search-overlay
          className="absolute inset-x-0 top-0 bottom-0 flex items-center px-4 backdrop-blur-md bg-primary/80 rounded-b-lg z-10"
        >
          <Search size={18} className="text-white/60 mr-2 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search plants, insects, notes..."
            className="bg-transparent border-0 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-white/60 hover:text-white ml-1 min-h-0 min-w-0"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Create FilterBar**

Write `react-app/src/components/garden/FilterBar.tsx`:

```tsx
import { getCurrentSeason } from '@/lib/constants'
import type { InventoryItem } from '@/types'

export type FilterType = 'all' | 'plant' | 'bug' | 'native' | 'blooming'
export type SortType = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'location'

interface FilterBarProps {
  items: InventoryItem[]
  activeFilter: FilterType
  activeSort: SortType
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortType) => void
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'plant', label: 'Plants' },
  { value: 'bug', label: 'Insects' },
  { value: 'native', label: 'Natives' },
  { value: 'blooming', label: 'Blooming' },
]

const SORTS: { value: SortType; label: string }[] = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'location', label: 'Location' },
]

function getFilterCount(items: InventoryItem[], filter: FilterType): number {
  const season = getCurrentSeason()
  switch (filter) {
    case 'all': return items.length
    case 'plant': return items.filter(i => i.type === 'plant').length
    case 'bug': return items.filter(i => i.type === 'bug').length
    case 'native': return items.filter(i => i.is_native).length
    case 'blooming': return items.filter(i =>
      i.bloom?.includes(season) || i.bloom?.includes('Year-round')
    ).length
  }
}

export function applyFilter(items: InventoryItem[], filter: FilterType): InventoryItem[] {
  const season = getCurrentSeason()
  switch (filter) {
    case 'all': return items
    case 'plant': return items.filter(i => i.type === 'plant')
    case 'bug': return items.filter(i => i.type === 'bug')
    case 'native': return items.filter(i => i.is_native)
    case 'blooming': return items.filter(i =>
      i.bloom?.includes(season) || i.bloom?.includes('Year-round')
    )
  }
}

export function applySearch(items: InventoryItem[], query: string): InventoryItem[] {
  if (!query.trim()) return items
  const q = query.toLowerCase()
  return items.filter(i =>
    (i.common?.toLowerCase().includes(q)) ||
    (i.scientific?.toLowerCase().includes(q)) ||
    (i.category?.toLowerCase().includes(q)) ||
    (i.notes?.toLowerCase().includes(q)) ||
    (i.tags?.some(t => t.toLowerCase().includes(q))) ||
    (i.location?.toLowerCase().includes(q))
  )
}

export function applySort(items: InventoryItem[], sort: SortType): InventoryItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'date-desc': return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    case 'date-asc': return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    case 'name-asc': return sorted.sort((a, b) => (a.common ?? '').localeCompare(b.common ?? ''))
    case 'name-desc': return sorted.sort((a, b) => (b.common ?? '').localeCompare(a.common ?? ''))
    case 'location': return sorted.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''))
  }
}

export default function FilterBar({ items, activeFilter, activeSort, onFilterChange, onSortChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Filter chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => {
          const count = getFilterCount(items, f.value)
          const active = activeFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-white text-ink-mid border border-cream-dark hover:border-sage'
              }`}
            >
              {f.label}
              <span className={`ml-1 ${active ? 'text-white/70' : 'text-ink-light'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sort selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-light">Sort:</span>
        <div className="flex gap-1.5">
          {SORTS.map(s => (
            <button
              key={s.value}
              onClick={() => onSortChange(s.value)}
              className={`text-xs px-2 py-1 rounded transition-colors min-h-0 min-w-0 ${
                activeSort === s.value
                  ? 'text-primary font-medium'
                  : 'text-ink-light hover:text-ink-mid'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(firebush): add SearchBar and FilterBar with type chips and sort options"
```

---

### Task 5: ItemDetail sheet

**Files:**
- Create: `react-app/src/components/garden/ItemDetail.tsx`

This is the largest single component. It renders as a shadcn Sheet (slides up from bottom on mobile). Contains: hero image with gradient fade, info rows, care profile with SVG icons, tags, health status, notes.

- [ ] **Step 1: Create ItemDetail**

Write `react-app/src/components/garden/ItemDetail.tsx`:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Leaf, Bug, Heart, MapPin, Calendar, Sparkles, Sun, Droplets,
  Sprout, Scissors, Ruler, ShieldAlert, TreePine, Trash2
} from 'lucide-react'
import { confidenceClass } from '@/lib/constants'
import type { InventoryItem, CareProfile } from '@/types'

interface ItemDetailProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onDelete: (id: string, imageUrl?: string | null) => void
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-sage mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-ink-light">{label}</p>
        <p className="text-sm text-ink">{value}</p>
      </div>
    </div>
  )
}

function CareSection({ care }: { care: CareProfile }) {
  const sections = [
    { icon: Droplets, label: 'Watering', value: care.watering ? `${care.watering.frequency}${care.watering.notes ? ` — ${care.watering.notes}` : ''}` : null },
    { icon: Sun, label: 'Sun', value: care.sun },
    { icon: Sprout, label: 'Soil', value: care.soil },
    { icon: Calendar, label: 'Fertilizing', value: care.fertilizing ? `${care.fertilizing.schedule}${care.fertilizing.type ? ` (${care.fertilizing.type})` : ''}` : null },
    { icon: Scissors, label: 'Pruning', value: care.pruning ? `${care.pruning.timing}${care.pruning.method ? ` — ${care.pruning.method}` : ''}` : null },
    { icon: Ruler, label: 'Mature size', value: care.mature_size ? `${care.mature_size.height} tall, ${care.mature_size.spread} spread` : null },
    { icon: ShieldAlert, label: 'Pests & diseases', value: care.pests_diseases },
    { icon: TreePine, label: 'Companion plants', value: care.companions },
  ]

  return (
    <div className="space-y-1">
      <h3 className="font-display text-sm font-medium text-primary mb-2">Tampa Bay Care Guide</h3>
      {sections.map(s => (
        <InfoRow key={s.label} icon={s.icon} label={s.label} value={s.value} />
      ))}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidenceClass(confidence)
  const colors = {
    high: 'bg-sage-light text-primary',
    mid: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  }
  return (
    <Badge variant="secondary" className={`text-[10px] ${colors[level]} border-0`}>
      {confidence}% match
    </Badge>
  )
}

export default function ItemDetail({ item, open, onClose, onDelete }: ItemDetailProps) {
  if (!item) return null

  const TypeIcon = item.type === 'bug' ? Bug : Leaf

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl p-0">
        {/* Hero image with gradient fade */}
        {item.image_url ? (
          <div className="relative h-56">
            <img
              src={item.image_url}
              alt={item.common ?? 'Species photo'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-cream-dark flex items-center justify-center">
            <TypeIcon size={48} className="text-ink-light/30" />
          </div>
        )}

        <div className="px-5 pb-8 -mt-6 relative">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-xl text-left">
              {item.common ?? 'Unknown species'}
            </SheetTitle>
            {item.scientific && (
              <p className="text-sm text-ink-light italic">{item.scientific}</p>
            )}
          </SheetHeader>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.is_native && (
              <Badge variant="secondary" className="bg-sage-light text-primary border-0 text-xs">
                <Heart size={12} className="mr-1" fill="currentColor" /> Native
              </Badge>
            )}
            {item.confidence && <ConfidenceBadge confidence={item.confidence} />}
            {item.health && (
              <Badge variant="outline" className="text-xs capitalize">{item.health}</Badge>
            )}
            {item.flowering && item.flowering !== 'no' && (
              <Badge variant="outline" className="text-xs capitalize">{item.flowering}</Badge>
            )}
          </div>

          <Separator className="mb-4" />

          {/* Info rows */}
          <div className="space-y-1 mb-4">
            <InfoRow icon={TypeIcon} label="Type" value={item.category ? `${item.type === 'bug' ? 'Insect' : 'Plant'} — ${item.category}` : (item.type === 'bug' ? 'Insect' : 'Plant')} />
            <InfoRow icon={MapPin} label="Location" value={item.location} />
            <InfoRow icon={Calendar} label="Added" value={item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
            <InfoRow icon={Sparkles} label="Source" value={item.source} />
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-ink-mid mb-4 leading-relaxed">{item.description}</p>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="bg-cream rounded-[--radius-sm] p-3 mb-4">
              <p className="text-xs text-ink-light mb-1">Notes</p>
              <p className="text-sm text-ink">{item.notes}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Bloom / Active seasons */}
          {(item.bloom?.length || item.season?.length) ? (
            <div className="mb-4">
              <p className="text-xs text-ink-light mb-1">{item.type === 'bug' ? 'Active seasons' : 'Bloom seasons'}</p>
              <div className="flex gap-1.5">
                {(item.bloom ?? item.season ?? []).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs bg-cream border-0">{s}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          <Separator className="mb-4" />

          {/* Care Profile */}
          {item.care_profile && (
            <>
              <CareSection care={item.care_profile} />
              <Separator className="my-4" />
            </>
          )}

          {/* Delete button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(item.id, item.image_url)}
            className="w-full"
          >
            <Trash2 size={16} className="mr-2" />
            Remove from garden
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(firebush): add ItemDetail sheet with hero image, care profile, and SVG icons"
```

---

### Task 6: useReminders hook + ReminderList

**Files:**
- Create: `react-app/src/hooks/useReminders.ts`
- Create: `react-app/src/components/reminders/ReminderList.tsx`

- [ ] **Step 1: Write useReminders hook**

Write `react-app/src/hooks/useReminders.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { Reminder, InventoryItem } from '@/types'

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function computePlantHash(items: InventoryItem[]): string {
  return items
    .filter(i => i.type === 'plant')
    .map(i => i.common ?? i.id)
    .sort()
    .join(',')
}

export function useReminders(inventory: InventoryItem[]) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const monthKey = getMonthKey()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .order('done', { ascending: true })
      .order('created_at', { ascending: true })

    if (data) setReminders(data as Reminder[])
  }, [monthKey])

  useEffect(() => {
    if (inventory.length > 0) load()
  }, [inventory, load])

  const toggle = useCallback(async (id: string, done: boolean) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done } : r))
    await supabase.from('reminders').update({ done }).eq('id', id)
  }, [])

  const addCustom = useCallback(async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        month_key: monthKey,
        title,
        source: 'custom',
        done: false,
      })
      .select()
      .single()

    if (data) setReminders(prev => [...prev, data as Reminder])
  }, [monthKey])

  const deleteReminder = useCallback(async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id))
    await supabase.from('reminders').delete().eq('id', id)
  }, [])

  const generate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const plants = inventory.filter(i => i.type === 'plant')
    if (!plants.length) return

    setLoading(true)
    try {
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'reminders',
          month: monthKey,
          plants: plants.map(p => ({ common: p.common, scientific: p.scientific, category: p.category })),
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      if (result.reminders) {
        const hash = computePlantHash(inventory)
        const toInsert = result.reminders.map((r: any) => ({
          user_id: user.id,
          month_key: monthKey,
          icon: r.icon ?? '',
          title: r.title,
          detail: r.detail ?? '',
          plant: r.plant ?? '',
          source: 'ai' as const,
          done: false,
          plant_hash: hash,
        }))

        const { data } = await supabase.from('reminders').insert(toInsert).select()
        if (data) setReminders(prev => [...prev, ...(data as Reminder[])])
      }
    } finally {
      setLoading(false)
    }
  }, [inventory, monthKey])

  const isStale = useCallback((): boolean => {
    const aiReminders = reminders.filter(r => r.source === 'ai')
    if (!aiReminders.length) return true
    const currentHash = computePlantHash(inventory)
    return aiReminders.some(r => r.plant_hash !== currentHash)
  }, [reminders, inventory])

  return { reminders, loading, toggle, addCustom, deleteReminder, generate, isStale }
}
```

- [ ] **Step 2: Create ReminderList**

Write `react-app/src/components/reminders/ReminderList.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Reminder } from '@/types'

interface ReminderListProps {
  reminders: Reminder[]
  loading: boolean
  isStale: boolean
  onToggle: (id: string, done: boolean) => void
  onAddCustom: (title: string) => void
  onDelete: (id: string) => void
  onGenerate: () => void
}

export default function ReminderList({
  reminders, loading, isStale, onToggle, onAddCustom, onDelete, onGenerate,
}: ReminderListProps) {
  const [expanded, setExpanded] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  // Sort: unchecked first, then checked
  const sorted = [...reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return 0
  })

  function handleAdd() {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onAddCustom(trimmed)
    setNewTitle('')
  }

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="font-display text-sm font-medium text-primary">
          {monthName} in Your Garden
        </h2>
        <ChevronDown
          size={18}
          className={`text-ink-light transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {reminders.length === 0 && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-ink-light mb-3">
                No care tasks for {monthName} yet.
              </p>
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={loading}
                className="text-xs"
              >
                <Sparkles size={14} className="mr-1.5" />
                Generate care tasks
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-sm text-ink-light">
              <Loader2 size={16} className="animate-spin" />
              Generating tasks...
            </div>
          )}

          {sorted.map(r => (
            <div
              key={r.id}
              className={`flex items-start gap-3 py-1.5 ${r.done ? 'opacity-50' : ''}`}
            >
              <Checkbox
                checked={r.done}
                onCheckedChange={(checked) => onToggle(r.id, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${r.done ? 'line-through text-ink-light' : 'text-ink'}`}>
                  {r.title}
                </p>
                {r.detail && !r.done && (
                  <p className="text-xs text-ink-light mt-0.5">{r.detail}</p>
                )}
                {r.plant && !r.done && (
                  <p className="text-xs text-sage italic mt-0.5">{r.plant}</p>
                )}
              </div>
              {r.source === 'custom' && (
                <button
                  onClick={() => onDelete(r.id)}
                  className="text-ink-light hover:text-terra min-h-0 min-w-0 p-1"
                  aria-label="Delete reminder"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {/* Add custom row */}
          {reminders.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cream-dark">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                placeholder="Add a task..."
                className="h-8 text-xs"
              />
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30 min-h-0 min-w-0"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          {/* Stale indicator */}
          {isStale && reminders.length > 0 && (
            <button
              onClick={onGenerate}
              disabled={loading}
              className="w-full text-xs text-sage hover:text-primary py-1 min-h-0"
            >
              <Sparkles size={12} className="inline mr-1" />
              Your garden has changed — refresh tasks
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(firebush): add useReminders hook and ReminderList with check-off and custom tasks"
```

---

### Task 7: Wire everything into the Garden page

**Files:**
- Modify: `react-app/src/pages/Garden.tsx`

- [ ] **Step 1: Rewrite Garden.tsx**

Replace the placeholder `react-app/src/pages/Garden.tsx` with the full implementation:

```tsx
import { useState, useMemo } from 'react'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import ScreenHeader from '@/components/layout/ScreenHeader'
import SearchBar from '@/components/garden/SearchBar'
import FilterBar, { applyFilter, applySearch, applySort } from '@/components/garden/FilterBar'
import type { FilterType, SortType } from '@/components/garden/FilterBar'
import PlantCard from '@/components/garden/PlantCard'
import PlantCardSkeleton from '@/components/garden/PlantCardSkeleton'
import ItemDetail from '@/components/garden/ItemDetail'
import ReminderList from '@/components/reminders/ReminderList'
import { useInventory } from '@/hooks/useInventory'
import { useReminders } from '@/hooks/useReminders'
import type { InventoryItem } from '@/types'

export default function Garden() {
  const { items, loading, stats, deleteItem } = useInventory()
  const { reminders, loading: remindersLoading, toggle, addCustom, deleteReminder, generate, isStale } = useReminders(items)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('date-desc')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const filteredItems = useMemo(() => {
    let result = applyFilter(items, filter)
    result = applySearch(result, search)
    result = applySort(result, sort)
    return result
  }, [items, filter, search, sort])

  const hasPlants = items.some(i => i.type === 'plant')

  async function handleDelete(id: string, imageUrl?: string | null) {
    const ok = window.confirm('Remove this from your garden? This cannot be undone.')
    if (!ok) return
    const success = await deleteItem(id, imageUrl)
    if (success) {
      setSelectedItem(null)
      toast.success('Removed from garden')
    } else {
      toast.error('Failed to remove. Please try again.')
    }
  }

  // Stats subtitle
  const subtitle = [
    stats.plants > 0 ? `${stats.plants} species cataloged` : null,
    stats.insects > 0 ? `${stats.insects} visitors observed` : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <ScreenHeader
        title="My Garden"
        subtitle={subtitle || undefined}
        actions={
          <div className="flex items-center gap-1">
            <SearchBar value={search} onChange={setSearch} />
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
              aria-label="Settings"
              onClick={() => toast.info('Settings coming soon')}
            >
              <Settings size={20} />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Seasonal reminders */}
        {hasPlants && (
          <ReminderList
            reminders={reminders}
            loading={remindersLoading}
            isStale={isStale()}
            onToggle={toggle}
            onAddCustom={addCustom}
            onDelete={deleteReminder}
            onGenerate={generate}
          />
        )}

        {/* Filters */}
        {items.length > 0 && (
          <FilterBar
            items={items}
            activeFilter={filter}
            activeSort={sort}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />
        )}

        {/* Card grid */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PlantCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, i) => (
              <PlantCard
                key={item.id}
                item={item}
                index={i}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          /* Has items but filter/search returned nothing */
          <div className="text-center py-12">
            <p className="text-ink-light text-sm">No matches for your current filters.</p>
          </div>
        ) : (
          /* Empty garden */
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <h3 className="font-display text-lg text-primary">Every garden begins with a single planting</h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto">
              Tap the camera button to photograph and identify your first species.
            </p>
          </div>
        )}
      </div>

      {/* Item detail sheet */}
      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (api, useAuth, useInventory).

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

At 390px viewport:
1. Sign in → Garden page loads
2. If you have inventory data: 2-column card grid with stagger animation, skeleton placeholders during load, filter chips, sort options, search icon in header
3. Tap a card → ItemDetail sheet slides up from bottom with hero image and gradient fade
4. Empty garden shows the literary empty state
5. Reminders section appears above filters if there are plants

At 768px+: Same content, wider layout via Sidebar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(firebush): wire Garden page with inventory grid, filters, search, detail sheet, and reminders"
```

---

### Task 8: Final polish and verification

**Files:** None new — verification and small fixes.

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Verify production build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Manual QA at 390px**

Open Chrome DevTools at 390px:
1. Auth → sign in → welcome (if absent > 1hr) → garden
2. Skeleton loading shows during data fetch
3. Cards stagger in with fade+slide animation
4. Filter chips show correct counts, tapping filters the grid
5. Sort changes card order
6. Search icon expands frosted overlay, typing filters live
7. Tap card → detail sheet with hero image, gradient fade, info rows, care profile with SVG icons, delete button
8. Reminders section: collapsible, check-off works, add custom works
9. Empty garden shows literary message
10. No emoji anywhere in the UI

- [ ] **Step 4: Push**

```bash
git push
```

- [ ] **Step 5: Commit any fixes**

If any fixes were needed during QA:

```bash
git add -A
git commit -m "fix(firebush): address Phase 3 QA feedback"
git push
```
