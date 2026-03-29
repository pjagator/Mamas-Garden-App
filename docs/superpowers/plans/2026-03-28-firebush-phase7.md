# Project Firebush Phase 7: Timeline + Settings + PWA + Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the React app with the Timeline page, Settings sheet, offline handling, PWA setup (installable on home screen), and final polish — making it production-ready for Vercel deployment.

**Architecture:** Timeline page reads from `useInventory` and groups items by season. Settings is a Sheet (not a page) with export, native DB browser, clear data, and sign out. PWA uses `vite-plugin-pwa` for service worker and manifest generation. Offline handling uses a connection hook that disables write operations and shows a toast. The FAB dims when offline.

**Tech Stack:** React 18, TypeScript, vite-plugin-pwa, Lucide React, shadcn/ui, sonner

**Spec:** `docs/superpowers/specs/2026-03-28-project-firebush-design.md` — Phase 7 + PWA & Offline sections

**Design rules:**
- NO emoji — Lucide icons only
- 44px min touch targets
- Literary botanical language
- All colors from theme tokens

---

## File Map

### New files

```
react-app/src/
├── hooks/
│   └── useConnection.ts             # Online/offline state + connection toast
├── components/
│   └── layout/
│       └── ConnectionToast.tsx       # Fixed toast bar for online/offline transitions
└── pages/
    ├── Timeline.tsx                  # (replace placeholder) Seasonal timeline
    └── Settings.tsx                  # (replace placeholder) Settings sheet content

react-app/public/
├── icon-192.svg                     # PWA icon 192px
└── icon-512.svg                     # PWA icon 512px
```

### Modified files

```
react-app/
├── vite.config.ts                   # Add vite-plugin-pwa
├── src/index.css                    # Seasonal background tint utility
├── src/components/layout/AppShell.tsx  # Add ConnectionToast + offline FAB state
├── src/components/layout/BottomNav.tsx # FAB offline dimming
└── index.html                       # Apple meta tags
```

---

### Task 1: Timeline page

**Files:**
- Modify: `react-app/src/pages/Timeline.tsx`

- [ ] **Step 1: Rewrite Timeline.tsx**

Read the current placeholder, then replace with:

```tsx
import { useMemo } from 'react'
import { Flower2, Bug } from 'lucide-react'
import ScreenHeader from '@/components/layout/ScreenHeader'
import { useInventory } from '@/hooks/useInventory'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { InventoryItem } from '@/types'

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const

function getSeasonItems(items: InventoryItem[], season: string) {
  const plants = items.filter(i =>
    i.type === 'plant' && i.bloom &&
    (i.bloom.includes(season) || i.bloom.includes('Year-round'))
  )
  const insects = items.filter(i =>
    i.type === 'bug' && i.season &&
    (i.season.includes(season) || i.season.includes('Year-round'))
  )
  return { plants, insects }
}

function TimelineEntry({ item }: { item: InventoryItem }) {
  const isPlant = item.type === 'plant'
  const Icon = isPlant ? Flower2 : Bug
  const dotColor = isPlant ? 'bg-terra-light' : 'bg-sage'
  const dateStr = item.date
    ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  return (
    <div className="relative pl-8 pb-5 last:pb-0">
      {/* Dot on the track */}
      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow-sm flex items-center justify-center`}>
        <Icon size={8} className="text-white" />
      </div>

      <div className="bg-white rounded-[--radius-sm] p-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-sm font-medium text-ink truncate">
              {item.common ?? 'Unknown'}
            </h4>
            {item.scientific && (
              <p className="text-[11px] text-ink-light italic truncate">{item.scientific}</p>
            )}
          </div>
          <span className="text-[10px] text-ink-light ml-2 flex-shrink-0">{dateStr}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.is_native && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-sage-light text-primary border-0">
              Native
            </Badge>
          )}
          {item.category && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              {item.category}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Timeline() {
  const { items } = useInventory()
  const year = new Date().getFullYear()

  const hasAnyItems = useMemo(() =>
    SEASONS.some(s => {
      const { plants, insects } = getSeasonItems(items, s)
      return plants.length > 0 || insects.length > 0
    }),
    [items]
  )

  return (
    <>
      <ScreenHeader title="Seasonal Timeline" subtitle={hasAnyItems ? `${year} garden calendar` : undefined} />

      <div className="p-4 space-y-6">
        {items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4">
              <Flower2 size={28} className="text-sage" />
            </div>
            <h3 className="font-display text-lg text-primary">Your timeline awaits</h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto">
              As you catalog species, they'll appear here organized by their active seasons.
            </p>
          </div>
        ) : (
          SEASONS.map(season => {
            const { plants, insects } = getSeasonItems(items, season)
            const allItems = [...plants, ...insects]

            return (
              <div key={season}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="font-display text-base font-medium text-primary">
                    {season} {year}
                  </h2>
                  <Separator className="flex-1" />
                </div>

                {allItems.length === 0 ? (
                  <p className="text-sm text-ink-light italic pl-8 py-2">
                    Nothing cataloged for this season yet.
                  </p>
                ) : (
                  <div className="relative">
                    {/* Vertical track line */}
                    <div className="absolute left-[7px] top-3 bottom-3 w-px bg-cream-dark" />
                    {allItems.map(item => (
                      <TimelineEntry key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add Timeline page with seasonal grouping and vertical track"
```

---

### Task 2: Settings sheet

**Files:**
- Modify: `react-app/src/pages/Settings.tsx`

- [ ] **Step 1: Rewrite Settings.tsx**

Read the current placeholder, then replace with:

```tsx
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Download, Trash2, LogOut, BookOpen, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useInventory } from '@/hooks/useInventory'
import { NATIVE_PLANTS } from '@/lib/constants'
import type { InventoryItem } from '@/types'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

function NativePlantsList() {
  return (
    <div className="space-y-2">
      {NATIVE_PLANTS.map(p => (
        <div key={p.name} className="flex items-start gap-3 py-1.5">
          <Leaf size={14} className="text-sage mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">{p.name}</p>
            <p className="text-xs text-ink-light italic">{p.scientific}</p>
            <p className="text-[10px] text-ink-light mt-0.5">
              {p.type} · Blooms: {p.bloom.join(', ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { user, signOut } = useAuth()
  const { items, refresh } = useInventory()
  const [showNatives, setShowNatives] = useState(false)

  function exportJSON() {
    const data = {
      version: 1,
      exported: new Date().toISOString(),
      entries: items,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garden-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Garden data exported as JSON')
  }

  function exportCSV() {
    const headers = ['Common Name', 'Scientific Name', 'Type', 'Category', 'Date', 'Confidence', 'Bloom Seasons', 'Active Seasons', 'Native', 'Notes']
    const rows = items.map((i: InventoryItem) => [
      i.common ?? '', i.scientific ?? '', i.type ?? '', i.category ?? '',
      i.date ? new Date(i.date).toLocaleDateString() : '',
      i.confidence?.toString() ?? '',
      (i.bloom ?? []).join('; '), (i.season ?? []).join('; '),
      i.is_native ? 'Yes' : 'No',
      (i.notes ?? '').replace(/"/g, '""'),
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garden-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Garden data exported as CSV')
  }

  async function handleClearAll() {
    const ok = window.confirm('Delete ALL garden data? This cannot be undone.')
    if (!ok) return
    const doubleCheck = window.confirm('Are you absolutely sure? All plants, insects, and health logs will be permanently deleted.')
    if (!doubleCheck) return

    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return

    await supabase.from('health_logs').delete().eq('user_id', u.id)
    await supabase.from('garden_placements').delete().eq('user_id', u.id)
    await supabase.from('garden_beds').delete().eq('user_id', u.id)
    await supabase.from('garden_maps').delete().eq('user_id', u.id)
    await supabase.from('reminders').delete().eq('user_id', u.id)
    await supabase.from('wishlist').delete().eq('user_id', u.id)
    await supabase.from('inventory').delete().eq('user_id', u.id)

    localStorage.removeItem('garden-inventory-cache')
    refresh()
    toast.success('All garden data cleared')
    onClose()
  }

  async function handleSignOut() {
    await signOut()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* User info */}
          <div className="bg-cream rounded-[--radius-sm] p-3">
            <p className="text-xs text-ink-light">Signed in as</p>
            <p className="text-sm text-ink font-medium">{user?.email}</p>
          </div>

          {/* Species ID info */}
          <div className="bg-cream rounded-[--radius-sm] p-3">
            <p className="text-xs text-ink-light">Species identification</p>
            <p className="text-sm text-ink">Powered by Claude AI — no API key needed</p>
          </div>

          <Separator />

          {/* Export */}
          <div className="space-y-2">
            <p className="text-xs text-ink-light font-medium">Export garden data</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportJSON} className="flex-1">
                <Download size={14} className="mr-1.5" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1">
                <Download size={14} className="mr-1.5" /> CSV
              </Button>
            </div>
          </div>

          <Separator />

          {/* Native plants DB */}
          <div>
            <Button variant="outline" size="sm" onClick={() => setShowNatives(!showNatives)} className="w-full">
              <BookOpen size={14} className="mr-1.5" />
              {showNatives ? 'Hide' : 'Browse'} native plant database
            </Button>
            {showNatives && (
              <div className="mt-3 max-h-60 overflow-y-auto">
                <NativePlantsList />
              </div>
            )}
          </div>

          <Separator />

          {/* Danger zone */}
          <div className="space-y-2">
            <Button variant="destructive" size="sm" onClick={handleClearAll} className="w-full">
              <Trash2 size={14} className="mr-1.5" /> Clear all garden data
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full text-ink-mid">
              <LogOut size={14} className="mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

Note: Settings is exported as `SettingsSheet` (a component, not a page) since it's opened from the gear icon in the Garden header, not from a route.

- [ ] **Step 2: Wire Settings into Garden page**

Read `react-app/src/pages/Garden.tsx`. Add import:
```tsx
import SettingsSheet from '@/pages/Settings'
```

Add state:
```tsx
const [settingsOpen, setSettingsOpen] = useState(false)
```

Replace the settings button `onClick` (currently `toast.info('Settings coming soon')`) with:
```tsx
onClick={() => setSettingsOpen(true)}
```

Add the sheet at the bottom of the JSX (after HealthLogSheet):
```tsx
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add Settings sheet with export, native DB, clear data, and sign out"
```

---

### Task 3: Connection hook + offline handling

**Files:**
- Create: `react-app/src/hooks/useConnection.ts`
- Create: `react-app/src/components/layout/ConnectionToast.tsx`
- Modify: `react-app/src/components/layout/AppShell.tsx`
- Modify: `react-app/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Create useConnection hook**

Write `react-app/src/hooks/useConnection.ts`:

```typescript
import { useState, useEffect } from 'react'

export function useConnection() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'offline' | 'online'>('offline')

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      setToastMessage('Back online')
      setToastType('online')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    }

    function handleOffline() {
      setOnline(false)
      setToastMessage("You're offline — browsing cached data")
      setToastType('offline')
      setShowToast(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { online, showToast, toastMessage, toastType }
}
```

- [ ] **Step 2: Create ConnectionToast**

Write `react-app/src/components/layout/ConnectionToast.tsx`:

```tsx
import { WifiOff, Wifi } from 'lucide-react'

interface ConnectionToastProps {
  visible: boolean
  message: string
  type: 'offline' | 'online'
}

export default function ConnectionToast({ visible, message, type }: ConnectionToastProps) {
  if (!visible) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-transform ${
        type === 'offline' ? 'bg-terra' : 'bg-sage'
      }`}
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      role="status"
      aria-live="polite"
    >
      {type === 'offline' ? <WifiOff size={16} /> : <Wifi size={16} />}
      {message}
    </div>
  )
}
```

- [ ] **Step 3: Wire into AppShell**

Read `react-app/src/components/layout/AppShell.tsx`. Add imports:
```tsx
import { useConnection } from '@/hooks/useConnection'
import ConnectionToast from './ConnectionToast'
```

Inside the component, add:
```tsx
const { online, showToast, toastMessage, toastType } = useConnection()
```

Add `ConnectionToast` at the very top of the authenticated return JSX (before `{showWelcome && ...}`):
```tsx
      <ConnectionToast visible={showToast} message={toastMessage} type={toastType} />
```

Pass `online` to BottomNav:
```tsx
<BottomNav onFabClick={handleFabClick} offline={!online} />
```

- [ ] **Step 4: Add offline FAB state to BottomNav**

Read `react-app/src/components/layout/BottomNav.tsx`. Add `offline` prop:

```tsx
interface BottomNavProps {
  onFabClick: () => void
  offline?: boolean
}
```

Update the FAB button to dim when offline:
```tsx
          <button
            onClick={offline ? undefined : onFabClick}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg -mt-5 transition-opacity ${
              offline ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ backgroundColor: 'var(--color-primary)' }}
            aria-label="Capture new species"
            disabled={offline}
          >
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 6: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add connection handling with offline toast and FAB dimming"
```

---

### Task 4: PWA setup with vite-plugin-pwa

**Files:**
- Modify: `react-app/package.json` (new dep)
- Modify: `react-app/vite.config.ts`
- Modify: `react-app/index.html`
- Create: `react-app/public/icon-192.svg`
- Create: `react-app/public/icon-512.svg`

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Create PWA icons**

Write `react-app/public/icon-192.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="32" fill="#1c3a2b"/>
  <g transform="translate(40, 30)" fill="none" stroke="#c8dfc9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M56 110A42 42 0 0 1 48.8 26.6C82 22 92 18.9 104 6c6 12 12 25 12 48 0 33-28.7 60-60 60z"/>
    <path d="M6 120c0-18 11.1-32.2 30.5-36C46 80.7 61 71.7 67 65.7"/>
  </g>
</svg>
```

Copy the same content to `react-app/public/icon-512.svg` but change `viewBox="0 0 512 512"` and `width="512" height="512"`, with transforms scaled proportionally:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#1c3a2b"/>
  <g transform="translate(106, 80) scale(2.67)" fill="none" stroke="#c8dfc9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M56 110A42 42 0 0 1 48.8 26.6C82 22 92 18.9 104 6c6 12 12 25 12 48 0 33-28.7 60-60 60z"/>
    <path d="M6 120c0-18 11.1-32.2 30.5-36C46 80.7 61 71.7 67 65.7"/>
  </g>
</svg>
```

- [ ] **Step 3: Configure vite-plugin-pwa**

Read `react-app/vite.config.ts`. Add the PWA plugin. Add to imports:
```typescript
import { VitePWA } from 'vite-plugin-pwa'
```

Add `VitePWA(...)` to the plugins array:
```typescript
VitePWA({
  registerType: 'prompt',
  includeAssets: ['fonts/**/*.woff2', 'icon-192.svg', 'icon-512.svg'],
  manifest: {
    name: 'Tampa Garden',
    short_name: 'Garden',
    description: 'A botanical journal for Tampa Bay native plants and wildlife',
    theme_color: '#1c3a2b',
    background_color: '#f5f0e8',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*supabase.*\/storage\/.*garden-images/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'garden-images',
          expiration: { maxEntries: 200 },
        },
      },
    ],
  },
})
```

- [ ] **Step 4: Add Apple meta tags to index.html**

Read `react-app/index.html`. Add these tags in `<head>`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#1c3a2b" />
<link rel="apple-touch-icon" href="/icon-192.svg" />
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

Expected: Build succeeds and generates `dist/sw.js`, `dist/manifest.webmanifest`.

- [ ] **Step 6: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add PWA setup with manifest, icons, service worker, and apple meta tags"
```

---

### Task 5: Final verification and push

- [ ] **Step 1: Run all tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 2: Verify production build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Manual QA at 390px**

1. Timeline page: 4 seasonal sections with vertical track, plant/insect entries grouped by season
2. Settings: gear icon in Garden header → sheet with email, export buttons, native plant browser, clear data, sign out
3. Export JSON → downloads file. Export CSV → downloads file.
4. Sign out → auth page
5. Go offline (Chrome DevTools Network → Offline) → connection toast appears "You're offline", FAB dims to 50%
6. Go back online → "Back online" toast, auto-dismisses, FAB restores
7. No emoji anywhere in the UI
8. All pages work: Garden, Map, Wishlist, Timeline
9. `npm run build` produces sw.js and manifest.webmanifest

- [ ] **Step 4: Push**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git push
```
