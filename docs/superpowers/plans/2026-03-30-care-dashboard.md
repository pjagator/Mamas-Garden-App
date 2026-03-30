# Care Dashboard, Weather, Logo & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the intrusive per-plant care section with a garden-wide Care dashboard featuring seasonal AI tips, weather data, a firebush logo, and simplified settings.

**Architecture:** Garden page gets a "Plants" | "Care" segmented toggle. Plants view is the existing grid. Care view is a new CareDashboard component with WeatherCard (Open-Meteo), seasonal AI summary, and per-plant care cards. A monthly batch Claude Haiku call generates garden-wide tips stored in a new `seasonal_care` table. Logo is a hand-crafted SVG firebush used across PWA icons and branding screens.

**Tech Stack:** React + TypeScript, Tailwind CSS, shadcn/ui, Supabase (DB + auth), Open-Meteo API, Claude Haiku (claude-haiku-4-5-20251001) via Vercel API route, Vite PWA plugin

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `react-app/src/hooks/useWeather.ts` | Fetch 7-day forecast + monthly rainfall from Open-Meteo, cache in localStorage |
| `react-app/src/hooks/useSeasonalCare.ts` | Load/generate/store seasonal care tips from Supabase + API |
| `react-app/src/components/garden/WeatherCard.tsx` | 7-day rain forecast, monthly total, takeaway line |
| `react-app/src/components/garden/RaindropIcon.tsx` | Custom SVG raindrop icon (empty/partial/full variants) |
| `react-app/src/components/garden/PlantCareCard.tsx` | Per-plant seasonal tips card with expandable full care profile |
| `react-app/src/components/garden/CareDashboard.tsx` | Orchestrates weather + seasonal summary + plant cards |
| `react-app/public/logo.svg` | Firebush botanical line art SVG |
| `react-app/public/logo-favicon.svg` | Simplified version for small sizes |

### Modified files
| File | Changes |
|------|---------|
| `react-app/src/pages/Garden.tsx` | Add segmented toggle, remove ReminderList from Plants view, add CareDashboard to Care view, remove Settings sheet, add sign-out to header |
| `react-app/src/components/garden/ItemDetail.tsx` | Remove CareSection component, add sun/water quick-reference badges |
| `react-app/api/garden-assistant.ts` | Add `seasonal_care` action handler |
| `react-app/src/pages/Welcome.tsx` | Add logo above greeting |
| `react-app/src/pages/Auth.tsx` | Add logo above form |
| `react-app/index.html` | Update favicon link |
| `react-app/vite.config.ts` | Update PWA icon paths |

---

### Task 1: Database — Create `seasonal_care` table

**Files:**
- Reference: `docs/superpowers/specs/2026-03-30-care-dashboard-design.md` (section 8)

- [ ] **Step 1: Run SQL migration in Supabase SQL Editor**

```sql
CREATE TABLE seasonal_care (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key text NOT NULL,
  garden_summary text NOT NULL,
  plant_tips jsonb NOT NULL,
  plant_hash text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE seasonal_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their seasonal care" ON seasonal_care FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Verify in Supabase Table Editor**

Go to Table Editor. Confirm `seasonal_care` table exists with 0 rows and RLS enabled (green shield icon).

- [ ] **Step 3: Commit a note**

```bash
git add -A && git commit -m "docs: note seasonal_care table created in Supabase"
```

---

### Task 2: Weather hook — `useWeather.ts`

**Files:**
- Create: `react-app/src/hooks/useWeather.ts`

- [ ] **Step 1: Create the weather hook**

```typescript
import { useState, useEffect, useCallback } from 'react'

const TAMPA_LAT = 27.95
const TAMPA_LNG = -82.46
const CACHE_KEY = 'garden-weather-cache'
const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

export const TAMPA_MONTHLY_AVG_RAIN: Record<string, number> = {
  January: 2.3, February: 2.7, March: 3.0, April: 2.0,
  May: 3.1, June: 7.6, July: 7.5, August: 7.9,
  September: 6.5, October: 2.8, November: 1.6, December: 2.4,
}

export interface DayForecast {
  date: string
  dayName: string
  precipitation: number // inches
}

export interface WeatherData {
  forecast: DayForecast[]
  monthlyTotal: number
  monthName: string
  monthlyAverage: number
  takeaway: string
}

function getTakeaway(forecast: DayForecast[], monthlyTotal: number, monthlyAverage: number): string {
  const weekTotal = forecast.reduce((sum, d) => sum + d.precipitation, 0)
  if (monthlyTotal > monthlyAverage * 1.5) return 'Wetter than usual this month — watch for root rot'
  if (weekTotal > 1.5) return 'Plenty of rain expected — hold off on watering'
  if (weekTotal > 0.5) return 'Some rain coming — check soil before watering'
  return 'Dry week ahead — keep up with watering'
}

function mmToInches(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch7Day = useCallback(async (): Promise<DayForecast[]> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${TAMPA_LAT}&longitude=${TAMPA_LNG}&daily=precipitation_sum&timezone=America/New_York&forecast_days=7`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Forecast fetch failed')
    const data = await res.json()
    const days: string[] = data.daily.time
    const precip: number[] = data.daily.precipitation_sum
    return days.map((date, i) => ({
      date,
      dayName: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      precipitation: mmToInches(precip[i] ?? 0),
    }))
  }, [])

  const fetchMonthlyTotal = useCallback(async (): Promise<number> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const startDate = `${year}-${month}-01`
    const today = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${TAMPA_LAT}&longitude=${TAMPA_LNG}&start_date=${startDate}&end_date=${today}&daily=precipitation_sum&timezone=America/New_York`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Monthly rain fetch failed')
    const data = await res.json()
    const precip: number[] = data.daily?.precipitation_sum ?? []
    const totalMm = precip.reduce((sum, v) => sum + (v ?? 0), 0)
    return mmToInches(totalMm)
  }, [])

  const load = useCallback(async () => {
    // Check cache
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
          setWeather(parsed.data)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore bad cache */ }

    try {
      setLoading(true)
      const [forecast, monthlyTotal] = await Promise.all([fetch7Day(), fetchMonthlyTotal()])
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
      const monthlyAverage = TAMPA_MONTHLY_AVG_RAIN[monthName] ?? 3.0
      const takeaway = getTakeaway(forecast, monthlyTotal, monthlyAverage)
      const data: WeatherData = { forecast, monthlyTotal, monthName, monthlyAverage, takeaway }
      setWeather(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetch7Day, fetchMonthlyTotal])

  useEffect(() => { load() }, [load])

  return { weather, loading, error, refresh: load }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/hooks/useWeather.ts
git commit -m "feat: add useWeather hook with Open-Meteo forecast and monthly rainfall"
```

---

### Task 3: Raindrop icon component

**Files:**
- Create: `react-app/src/components/garden/RaindropIcon.tsx`

- [ ] **Step 1: Create the raindrop SVG component**

```tsx
interface RaindropIconProps {
  level: 'none' | 'light' | 'heavy'
  size?: number
  className?: string
}

export default function RaindropIcon({ level, size = 20, className = '' }: RaindropIconProps) {
  const dropPath = 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z'

  if (level === 'none') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`text-ink-light/30 ${className}`}>
        <line x1="8" y1="19" x2="16" y2="19" strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`${level === 'heavy' ? 'text-primary' : 'text-sage'} ${className}`}>
      <path d={dropPath} fill={level === 'heavy' ? 'currentColor' : 'none'}
        fillOpacity={level === 'heavy' ? 0.2 : 0} />
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/components/garden/RaindropIcon.tsx
git commit -m "feat: add RaindropIcon component with empty/light/heavy variants"
```

---

### Task 4: Weather card component

**Files:**
- Create: `react-app/src/components/garden/WeatherCard.tsx`

- [ ] **Step 1: Create the WeatherCard component**

```tsx
import RaindropIcon from './RaindropIcon'
import type { WeatherData } from '@/hooks/useWeather'

interface WeatherCardProps {
  weather: WeatherData
}

function getRaindropLevel(inches: number): 'none' | 'light' | 'heavy' {
  if (inches <= 0) return 'none'
  if (inches < 0.25) return 'light'
  return 'heavy'
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  const { forecast, monthlyTotal, monthName, monthlyAverage, takeaway } = weather
  const progress = Math.min(monthlyTotal / monthlyAverage, 1.5) // cap at 150%
  const progressPercent = Math.round((progress / 1.5) * 100)

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm p-4 space-y-4">
      {/* 7-day forecast */}
      <div className="flex justify-between">
        {forecast.map(day => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-ink-light font-medium">{day.dayName}</span>
            <RaindropIcon level={getRaindropLevel(day.precipitation)} size={20} />
            <span className="text-[10px] text-ink-mid">
              {day.precipitation > 0 ? `${day.precipitation}"` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Monthly rainfall */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-ink-mid">{monthName} rainfall</span>
          <span className="text-ink font-medium">{monthlyTotal}" of {monthlyAverage}" avg</span>
        </div>
        <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-sage rounded-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Takeaway */}
      <p className="text-xs text-ink-mid italic">{takeaway}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/components/garden/WeatherCard.tsx
git commit -m "feat: add WeatherCard component with forecast, monthly total, and takeaway"
```

---

### Task 5: Seasonal care hook — `useSeasonalCare.ts`

**Files:**
- Create: `react-app/src/hooks/useSeasonalCare.ts`

- [ ] **Step 1: Create the seasonal care hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { InventoryItem } from '@/types'
import type { WeatherData } from './useWeather'

export interface PlantTip {
  common: string
  tips: string[]
}

export interface SeasonalCare {
  id: string
  month_key: string
  garden_summary: string
  plant_tips: PlantTip[]
  plant_hash: string
  created_at: string
}

function getMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function computePlantHash(items: InventoryItem[]): string {
  return items
    .filter(i => i.type === 'plant')
    .map(i => i.common ?? i.id)
    .sort()
    .join(',')
}

export function useSeasonalCare(inventory: InventoryItem[], weather: WeatherData | null) {
  const [care, setCare] = useState<SeasonalCare | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const monthKey = getMonthKey()
  const currentHash = computePlantHash(inventory)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('seasonal_care')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) console.error('seasonal_care query failed:', error)
    setCare((data?.[0] as SeasonalCare) ?? null)
    setLoading(false)
  }, [monthKey])

  useEffect(() => { load() }, [load])

  const isStale = useCallback((): boolean => {
    if (!care) return inventory.some(i => i.type === 'plant')
    return care.plant_hash !== currentHash
  }, [care, currentHash, inventory])

  const generate = useCallback(async () => {
    const plants = inventory.filter(i => i.type === 'plant')
    if (plants.length === 0) return

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'seasonal_care',
          data: {
            month: monthName,
            year: new Date().getFullYear(),
            plants: plants.map(p => ({
              common: p.common,
              scientific: p.scientific,
              type: p.type,
              category: p.category,
              health: p.health,
              location: p.location,
            })),
            weather: weather ? {
              forecast_summary: weather.takeaway,
              monthly_rain_so_far: weather.monthlyTotal,
            } : null,
          },
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      if (!result.garden_summary) throw new Error('Invalid response')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete old entries for this month
      await supabase.from('seasonal_care').delete().eq('user_id', user.id).eq('month_key', monthKey)

      // Insert new
      const { data: inserted } = await supabase
        .from('seasonal_care')
        .insert({
          user_id: user.id,
          month_key: monthKey,
          garden_summary: result.garden_summary,
          plant_tips: result.plant_tips ?? [],
          plant_hash: currentHash,
        })
        .select()
        .single()

      if (inserted) setCare(inserted as SeasonalCare)
    } catch (err) {
      console.error('Seasonal care generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [inventory, weather, monthKey, currentHash])

  return { care, loading, generating, isStale, generate, refresh: load }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/hooks/useSeasonalCare.ts
git commit -m "feat: add useSeasonalCare hook with batch generation and staleness detection"
```

---

### Task 6: API route — Add `seasonal_care` action

**Files:**
- Modify: `react-app/api/garden-assistant.ts`

- [ ] **Step 1: Read current garden-assistant.ts**

Read the file fully to understand the existing action handler structure.

- [ ] **Step 2: Add the `seasonal_care` action case**

Add a new case in the action switch/if-else block. The handler should:

```typescript
// Add this case alongside existing 'care_profile', 'reminders', 'diagnosis' cases:

if (action === 'seasonal_care') {
  const { month, year, plants, weather } = data
  const plantList = plants.map((p: any) => `${p.common} (${p.scientific ?? 'unknown'}) — ${p.category ?? 'plant'}, health: ${p.health ?? 'unknown'}`).join('\n')

  const weatherContext = weather
    ? `\nCurrent weather: ${weather.forecast_summary}. Monthly rainfall so far: ${weather.monthly_rain_so_far} inches.`
    : ''

  const prompt = `You are an expert Tampa Bay, Florida gardener. It is ${month} ${year}.${weatherContext}

The gardener has these plants:
${plantList}

Generate a seasonal care guide. Return JSON with this exact structure:
{
  "garden_summary": "2-3 sentence overview of what's happening in Tampa Bay gardens this month",
  "plant_tips": [
    {
      "common": "Plant Name",
      "tips": ["tip 1", "tip 2", "tip 3"]
    }
  ]
}

For each plant, provide 2-3 specific, actionable tips for this month in Tampa Bay. Consider the weather, season, and each plant's needs. Tips should be concise (one sentence each).`

  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const result = await response.json()
  const text = result.content?.[0]?.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return new Response(JSON.stringify({ error: 'Failed to parse response' }), { status: 500, headers: corsHeaders })

  const parsed = JSON.parse(jsonMatch[0])
  return new Response(JSON.stringify(parsed), { status: 200, headers: corsHeaders })
}
```

- [ ] **Step 3: Verify the build**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add react-app/api/garden-assistant.ts
git commit -m "feat: add seasonal_care action to garden-assistant API route"
```

---

### Task 7: Plant care card component

**Files:**
- Create: `react-app/src/components/garden/PlantCareCard.tsx`

- [ ] **Step 1: Create the PlantCareCard component**

```tsx
import { useState } from 'react'
import { ChevronDown, Droplets, Sun, Sprout, Calendar, Scissors, Ruler, ShieldAlert, TreePine } from 'lucide-react'
import type { InventoryItem, CareProfile } from '@/types'
import type { PlantTip } from '@/hooks/useSeasonalCare'

interface PlantCareCardProps {
  item: InventoryItem
  tips: PlantTip | null
}

function CareDetail({ care }: { care: CareProfile }) {
  const rows = [
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
    <div className="space-y-1 pt-2 border-t border-cream-dark mt-3">
      {rows.map(r => {
        if (!r.value) return null
        const Icon = r.icon
        return (
          <div key={r.label} className="flex items-start gap-2 py-1">
            <Icon size={14} className="text-sage mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-ink-light">{r.label}</p>
              <p className="text-xs text-ink">{r.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PlantCareCard({ item, tips }: PlantCareCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm p-4">
      <div className="flex items-start gap-3">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-cream-dark flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-medium text-ink truncate">{item.common ?? 'Unknown'}</h4>
          {item.scientific && <p className="text-[10px] text-ink-light italic truncate">{item.scientific}</p>}
        </div>
      </div>

      {tips && tips.tips.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {tips.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-mid">
              <span className="text-sage mt-0.5 flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      ) : !tips ? (
        <p className="mt-3 text-xs text-ink-light italic">Care info not yet generated</p>
      ) : null}

      {item.care_profile && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-[10px] text-ink-light hover:text-ink-mid"
          >
            Full care reference
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && <CareDetail care={item.care_profile} />}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/components/garden/PlantCareCard.tsx
git commit -m "feat: add PlantCareCard with seasonal tips and expandable care reference"
```

---

### Task 8: Care dashboard component

**Files:**
- Create: `react-app/src/components/garden/CareDashboard.tsx`

- [ ] **Step 1: Create the CareDashboard component**

```tsx
import { RefreshCw, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WeatherCard from './WeatherCard'
import PlantCareCard from './PlantCareCard'
import ReminderList from '@/components/reminders/ReminderList'
import { useWeather } from '@/hooks/useWeather'
import { useSeasonalCare } from '@/hooks/useSeasonalCare'
import type { InventoryItem, Reminder } from '@/types'

interface CareDashboardProps {
  inventory: InventoryItem[]
  reminders: Reminder[]
  remindersLoading: boolean
  isStaleReminders: boolean
  onToggleReminder: (id: string) => void
  onAddCustomReminder: (title: string) => void
  onDeleteReminder: (id: string) => void
  onGenerateReminders: () => void
}

export default function CareDashboard({
  inventory, reminders, remindersLoading, isStaleReminders,
  onToggleReminder, onAddCustomReminder, onDeleteReminder, onGenerateReminders,
}: CareDashboardProps) {
  const { weather, loading: weatherLoading } = useWeather()
  const { care, loading: careLoading, generating, isStale, generate } = useSeasonalCare(inventory, weather)

  const plants = inventory.filter(i => i.type === 'plant').sort((a, b) => (a.common ?? '').localeCompare(b.common ?? ''))

  if (plants.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4">
          <Leaf size={32} className="text-sage" />
        </div>
        <h3 className="font-display text-lg text-primary">Add your first plant</h3>
        <p className="text-sm text-ink-light max-w-xs mx-auto">
          Personalized care guidance will appear here once you've cataloged some plants.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Weather */}
      {weather && !weatherLoading && <WeatherCard weather={weather} />}

      {/* Reminders */}
      <ReminderList
        reminders={reminders}
        loading={remindersLoading}
        isStale={isStaleReminders}
        onToggle={onToggleReminder}
        onAddCustom={onAddCustomReminder}
        onDelete={onDeleteReminder}
        onGenerate={onGenerateReminders}
      />

      {/* Seasonal summary */}
      {care?.garden_summary && (
        <div className="bg-cream rounded-[--radius-card] p-4">
          <p className="text-sm text-ink leading-relaxed italic">{care.garden_summary}</p>
        </div>
      )}

      {/* Generate / refresh button */}
      {(!care || isStale()) && !generating && (
        <Button onClick={generate} variant="outline" size="sm" className="w-full">
          <RefreshCw size={14} className="mr-2" />
          {care ? 'Refresh seasonal tips' : "Generate this month's care tips"}
        </Button>
      )}
      {generating && (
        <div className="text-center py-4">
          <p className="text-xs text-ink-light animate-pulse">Generating seasonal care tips...</p>
        </div>
      )}

      {/* Per-plant care cards */}
      {plants.map(plant => {
        const tips = care?.plant_tips?.find(
          (t: any) => t.common?.toLowerCase() === plant.common?.toLowerCase()
        ) ?? null
        return <PlantCareCard key={plant.id} item={plant} tips={tips} />
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add react-app/src/components/garden/CareDashboard.tsx
git commit -m "feat: add CareDashboard with weather, seasonal summary, and plant care cards"
```

---

### Task 9: Garden page — segmented toggle + settings simplification

**Files:**
- Modify: `react-app/src/pages/Garden.tsx`

- [ ] **Step 1: Read current Garden.tsx**

Read the full file to understand all imports and state.

- [ ] **Step 2: Update Garden.tsx**

Key changes:
1. Add `view` state: `'plants' | 'care'`, default `'plants'`
2. Add `CareDashboard` import
3. Remove `SettingsSheet` import and `settingsOpen` state
4. Replace gear icon with sign-out icon (LogOut from lucide-react)
5. Add segmented toggle between ScreenHeader and content
6. Remove `ReminderList` from Plants view
7. Conditionally render Plants view or Care view based on `view` state

The segmented toggle UI:
```tsx
<div className="px-4 pt-3">
  <div className="flex bg-cream-dark rounded-full p-0.5">
    <button
      onClick={() => setView('plants')}
      className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
        view === 'plants' ? 'bg-primary text-white' : 'text-ink-mid'
      }`}
    >
      Plants
    </button>
    <button
      onClick={() => setView('care')}
      className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-colors ${
        view === 'care' ? 'bg-primary text-white' : 'text-ink-mid'
      }`}
    >
      Care
    </button>
  </div>
</div>
```

The header actions (replace gear with sign-out):
```tsx
actions={
  <div className="flex items-center gap-1">
    <SearchBar value={search} onChange={setSearch} />
    <button
      className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
      aria-label="Sign out"
      onClick={() => { if (window.confirm('Sign out?')) signOut() }}
    >
      <LogOut size={20} />
    </button>
  </div>
}
```

The content area: wrap the existing Plants content and the CareDashboard in a conditional:
```tsx
{view === 'plants' ? (
  <>
    {/* Existing FilterBar, PlantCard grid, empty states */}
  </>
) : (
  <CareDashboard
    inventory={items}
    reminders={reminders}
    remindersLoading={remindersLoading}
    isStaleReminders={isStale()}
    onToggleReminder={toggle}
    onAddCustomReminder={addCustom}
    onDeleteReminder={deleteReminder}
    onGenerateReminders={generate}
  />
)}
```

Add `useAuth` import and destructure `signOut`:
```tsx
import { useAuth } from '@/hooks/useAuth'
// in component:
const { signOut } = useAuth()
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify build succeeds**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vite build`
Expected: Build completes without errors

- [ ] **Step 5: Commit**

```bash
git add react-app/src/pages/Garden.tsx
git commit -m "feat: add Plants/Care segmented toggle, integrate CareDashboard, simplify settings to sign-out"
```

---

### Task 10: Slim down ItemDetail — remove CareSection, add badges

**Files:**
- Modify: `react-app/src/components/garden/ItemDetail.tsx`

- [ ] **Step 1: Read current ItemDetail.tsx**

Read the full file to confirm current structure.

- [ ] **Step 2: Update ItemDetail.tsx**

Key changes:
1. Remove the `CareSection` component entirely (lines ~34-62)
2. Remove unused imports: `ChevronDown`, `Scissors`, `Ruler`, `ShieldAlert`, `TreePine`, `Sprout`, `Calendar` (keep Calendar if used for date row)
3. Remove the `{item.care_profile && (<><CareSection ... /><Separator ... /></>)}` block
4. Add sun/water quick-reference badges after the bloom/season section, before the final Separator:

```tsx
{item.care_profile && (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {item.care_profile.sun && (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-cream border-0">
        <Sun size={10} className="mr-0.5" /> {item.care_profile.sun}
      </Badge>
    )}
    {item.care_profile.watering?.frequency && (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-cream border-0">
        <Droplets size={10} className="mr-0.5" /> {item.care_profile.watering.frequency}
      </Badge>
    )}
  </div>
)}
```

5. Keep imports: `Sun`, `Droplets` (for badges), remove `Sprout`, `Scissors`, `Ruler`, `ShieldAlert`, `TreePine` if no longer used
6. Remove the `useState` import if CareSection was the only user (check if anything else uses it — HealthTimeline doesn't)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add react-app/src/components/garden/ItemDetail.tsx
git commit -m "feat: slim down ItemDetail — remove care section, add sun/water quick-reference badges"
```

---

### Task 11: Firebush logo SVG

**Files:**
- Create: `react-app/public/logo.svg`
- Modify: `react-app/public/favicon.svg`

- [ ] **Step 1: Create the firebush logo SVG**

Create `react-app/public/logo.svg` with a hand-crafted botanical line drawing of a Hamelia patens flower cluster:
- `viewBox="0 0 64 64"`
- Forest green (#1c3a2b) for stem and leaves
- Terracotta (#c4622d) for tubular flowers
- 2px stroke weight (scaled to 64px viewBox)
- Simple, clean paths — a stem with 2-3 leaves and a cluster of 3-5 tubular flowers at top
- Transparent background

The firebush has distinctive features: opposite leaves with red-tinged stems, and clusters of small tubular red-orange flowers. Simplify to: a curved stem, 2 pairs of opposite oval leaves, and a cluster of 4 tubular shapes at the top.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <!-- Stem -->
  <path d="M32 58 C32 48, 30 38, 32 28 C34 18, 32 14, 32 10"
    stroke="#1c3a2b" stroke-width="2" stroke-linecap="round"/>
  <!-- Lower leaves (pair) -->
  <path d="M32 44 C26 42, 20 38, 18 34 C20 36, 26 38, 32 40"
    stroke="#1c3a2b" stroke-width="1.5" stroke-linecap="round" fill="#1c3a2b" fill-opacity="0.1"/>
  <path d="M32 44 C38 42, 44 38, 46 34 C44 36, 38 38, 32 40"
    stroke="#1c3a2b" stroke-width="1.5" stroke-linecap="round" fill="#1c3a2b" fill-opacity="0.1"/>
  <!-- Upper leaves (pair) -->
  <path d="M32 32 C27 30, 22 27, 21 24 C23 26, 27 28, 32 29"
    stroke="#1c3a2b" stroke-width="1.5" stroke-linecap="round" fill="#1c3a2b" fill-opacity="0.1"/>
  <path d="M32 32 C37 30, 42 27, 43 24 C41 26, 37 28, 32 29"
    stroke="#1c3a2b" stroke-width="1.5" stroke-linecap="round" fill="#1c3a2b" fill-opacity="0.1"/>
  <!-- Flower cluster - tubular flowers -->
  <path d="M32 10 C32 10, 30 4, 28 2" stroke="#c4622d" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 10 C32 10, 32 3, 32 1" stroke="#c4622d" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 10 C32 10, 34 4, 36 2" stroke="#c4622d" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 12 C32 12, 27 7, 25 5" stroke="#c4622d" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 12 C32 12, 37 7, 39 5" stroke="#c4622d" stroke-width="2" stroke-linecap="round"/>
  <!-- Flower tips (small circles at tube ends) -->
  <circle cx="28" cy="2" r="1.5" fill="#c4622d"/>
  <circle cx="32" cy="1" r="1.5" fill="#c4622d"/>
  <circle cx="36" cy="2" r="1.5" fill="#c4622d"/>
  <circle cx="25" cy="5" r="1.5" fill="#c4622d"/>
  <circle cx="39" cy="5" r="1.5" fill="#c4622d"/>
</svg>
```

- [ ] **Step 2: Replace favicon.svg**

Overwrite `react-app/public/favicon.svg` with the same logo SVG content (it works at small sizes due to the simple line art).

- [ ] **Step 3: Update icon-192.svg and icon-512.svg**

Replace `react-app/public/icon-192.svg` and `react-app/public/icon-512.svg` with the logo SVG. These are referenced by vite.config.ts PWA manifest.

- [ ] **Step 4: Commit**

```bash
git add react-app/public/logo.svg react-app/public/favicon.svg react-app/public/icon-192.svg react-app/public/icon-512.svg
git commit -m "feat: add firebush botanical logo SVG, update PWA and favicon icons"
```

---

### Task 12: Add logo to Welcome and Auth screens

**Files:**
- Modify: `react-app/src/pages/Welcome.tsx`
- Modify: `react-app/src/pages/Auth.tsx`

- [ ] **Step 1: Read Welcome.tsx and Auth.tsx**

Read both files to understand current layout.

- [ ] **Step 2: Update Welcome.tsx**

Add the logo above the greeting. Import the SVG and render it:

```tsx
// At the top of the welcome content, before the greeting text:
<img src="/logo.svg" alt="" className="w-16 h-16 mx-auto mb-4 opacity-90" />
```

Place this after the safe-area padding div and before the greeting `<p>` tag.

- [ ] **Step 3: Update Auth.tsx**

Add the logo above the "Tampa Garden" heading:

```tsx
// Before the heading:
<img src="/logo.svg" alt="" className="w-20 h-20 mx-auto mb-2" />
```

- [ ] **Step 4: Verify build succeeds**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vite build`
Expected: Build completes without errors

- [ ] **Step 5: Commit**

```bash
git add react-app/src/pages/Welcome.tsx react-app/src/pages/Auth.tsx
git commit -m "feat: add firebush logo to Welcome and Auth screens"
```

---

### Task 13: Final verification and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Full TypeScript check**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Full production build**

Run: `cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vite build`
Expected: Build completes, PWA generates with new icons

- [ ] **Step 3: Remove Settings.tsx import from any remaining files**

Search for any remaining imports of Settings or SettingsSheet:
```bash
grep -r "Settings" react-app/src/ --include="*.tsx" --include="*.ts"
```
Remove any unused imports found.

- [ ] **Step 4: Update documentation**

Update these files to reflect the changes:
- `PROJECT-STATE.md`: Add Care Dashboard section under React App, update ItemDetail description, note Settings simplification
- `PROJECT-CONTEXT.md`: Add Care Dashboard architecture, useWeather/useSeasonalCare hooks, Open-Meteo integration, seasonal_care table
- `.claude/docs/architectural_patterns.md`: Add Care Dashboard data flow section
- `docs/firebush-deployment-guide.md`: Add seasonal_care table to SQL migrations, add verification checklist items

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "docs: update documentation for care dashboard, weather, logo, and settings changes"
```

- [ ] **Step 6: Push**

```bash
git push origin firebush
```
