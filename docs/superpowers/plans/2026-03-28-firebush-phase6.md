# Project Firebush Phase 6: Friends of the Garden (Wishlist)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the wishlist feature — "Friends of the Garden" — where users save plants spotted elsewhere with AI-powered placement suggestions for their garden zones, and can graduate wishlist items into their inventory.

**Architecture:** New `wishlist` Supabase table (SQL migration run manually). `useWishlist` hook handles CRUD. CaptureSheet's "Save as Friend" button gets a real flow with "where spotted" prompt. Wishlist page shows dreamy cards. Wishlist detail shows AI placement suggestion. "Add to Garden" graduates items from wishlist → inventory. A new Vercel API route (`garden-assistant.ts`) handles the `suggest_placement` action.

**Tech Stack:** React 18, TypeScript, Supabase, Vercel Serverless Functions, Claude Haiku (placement suggestions), Lucide React, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-28-project-firebush-design.md` — Friends of the Garden section

**Design rules:**
- NO emoji — Lucide icons only
- Wishlist cards have a distinct dreamy look: dashed borders, softer styling
- Literary language: "Friends your garden hasn't met yet"
- 44px min touch targets

**DB prerequisite:** Run the `wishlist` table SQL migration in Supabase SQL Editor. The SQL is in the spec at lines 211-236.

---

## File Map

### New files

```
react-app/
├── api/
│   └── garden-assistant.ts          # Vercel serverless: care, reminders, diagnosis, placement suggestions
├── src/
│   ├── hooks/
│   │   └── useWishlist.ts           # Wishlist CRUD + graduation to inventory
│   ├── components/
│   │   └── wishlist/
│   │       ├── WishlistCard.tsx      # Dreamy card for wishlist items
│   │       └── WishlistDetail.tsx    # Detail sheet with AI placement suggestion
│   └── pages/
│       └── Wishlist.tsx             # (replace placeholder) Full wishlist page
```

### Modified files

```
react-app/src/
└── components/capture/
    └── CaptureSheet.tsx             # Real "Save as Friend" flow with spotted_at prompt
```

---

### Task 1: Vercel API route for garden-assistant

**Files:**
- Create: `react-app/api/garden-assistant.ts`

- [ ] **Step 1: Create the API route**

Write `react-app/api/garden-assistant.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.status === 529 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      continue
    }
    return response
  }
  throw new Error('Max retries exceeded')
}

async function callClaude(model: string, systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.[0]?.text ?? ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, data, month, plants } = req.body

    if (action === 'care_profile') {
      const { common, scientific, type, category } = data
      const text = await callClaude(
        'claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida (USDA Zone 9b-10a) garden care expert.',
        `Generate a care profile for ${common} (${scientific}), a ${category || type} in Tampa Bay, FL. Return a JSON object with these exact fields:
{ "watering": { "frequency": "...", "notes": "..." }, "sun": "...", "soil": "...", "fertilizing": { "schedule": "...", "type": "..." }, "pruning": { "timing": "...", "method": "..." }, "mature_size": { "height": "...", "spread": "..." }, "pests_diseases": "...", "companions": "..." }
Return ONLY the JSON object, no other text.`
      )
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to generate care profile')
      return res.status(200).json({ care_profile: JSON.parse(jsonMatch[0]) })

    } else if (action === 'reminders') {
      const text = await callClaude(
        'claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida garden care expert.',
        `It's ${month}. The user has these plants: ${plants.map((p: any) => p.common).join(', ')}. Generate 3-5 care tasks for this month. Return a JSON array where each object has: { "title": "short task", "detail": "1-2 sentence explanation", "plant": "which plant or empty for general" }. Return ONLY the JSON array.`
      )
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Failed to generate reminders')
      return res.status(200).json({ reminders: JSON.parse(jsonMatch[0]) })

    } else if (action === 'diagnosis') {
      const { common, scientific, health, imageUrl } = data
      const messages: any[] = [{
        role: 'user',
        content: [
          { type: 'text', text: `This ${common} (${scientific}) is showing signs of being ${health}. Diagnose the issue. Return a JSON object: { "cause": "likely cause", "severity": "low/medium/high", "action": "recommended action", "details": "2-3 sentence explanation" }. Return ONLY the JSON.` },
        ],
      }]
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString('base64')
        const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'
        messages[0].content.unshift({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        })
      }
      const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: 'You are a plant pathologist specializing in Tampa Bay, Florida gardens.',
          messages,
        }),
      })
      const claudeData = await response.json()
      if (claudeData.error) throw new Error(claudeData.error.message)
      const text = claudeData.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to diagnose')
      return res.status(200).json({ diagnosis: JSON.parse(jsonMatch[0]) })

    } else if (action === 'suggest_placement') {
      const { plant, zones } = data
      const zoneDescriptions = zones.map((z: any) =>
        `"${z.name || 'Unnamed zone'}": ${z.sun_exposure || 'unknown sun'}, ${z.soil_type || 'unknown soil'}, ${z.moisture_level || 'unknown moisture'}, ${z.wind_exposure || 'unknown wind'}`
      ).join('\n')

      const text = await callClaude(
        'claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida garden placement expert. Write in a warm, conversational tone.',
        `The user wants to plant ${plant.common} (${plant.scientific}, a ${plant.category || plant.type}) in their Tampa Bay garden. Their garden zones are:\n${zoneDescriptions}\n\nSuggest which zone(s) would be best for this plant and why. Also mention any zones to avoid. Keep it to 2-3 sentences, conversational and helpful. Return a JSON object: { "suggestion": "your conversational recommendation", "best_zones": ["zone name 1", "zone name 2"], "avoid_zones": ["zone name"] }. Return ONLY the JSON.`
      )
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to generate placement suggestion')
      return res.status(200).json({ placement: JSON.parse(jsonMatch[0]) })

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Request failed' })
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add Vercel API route for garden-assistant (care, reminders, diagnosis, placement)"
```

---

### Task 2: useWishlist hook

**Files:**
- Create: `react-app/src/hooks/useWishlist.ts`

- [ ] **Step 1: Write useWishlist**

Write `react-app/src/hooks/useWishlist.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { WishlistItem, GardenBed } from '@/types'

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setItems(data as WishlistItem[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addItem = useCallback(async (entry: Omit<WishlistItem, 'id' | 'created_at'>): Promise<WishlistItem | null> => {
    const { data, error } = await supabase
      .from('wishlist')
      .insert(entry)
      .select()
      .single()

    if (error || !data) return null
    const item = data as WishlistItem
    setItems(prev => [item, ...prev])
    return item
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<WishlistItem>) => {
    const { data } = await supabase
      .from('wishlist')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setItems(prev => prev.map(i => i.id === id ? data as WishlistItem : i))
    }
  }, [])

  const suggestPlacement = useCallback(async (
    plant: { common: string | null; scientific: string | null; category: string | null; type: string | null },
    zones: GardenBed[]
  ): Promise<{ suggestion: string; best_zones: string[]; avoid_zones: string[] } | null> => {
    if (!zones.length) return null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'suggest_placement',
          data: {
            plant: { common: plant.common, scientific: plant.scientific, category: plant.category, type: plant.type },
            zones: zones.map(z => ({
              name: z.name,
              sun_exposure: z.sun_exposure,
              soil_type: z.soil_type,
              moisture_level: z.moisture_level,
              wind_exposure: z.wind_exposure,
            })),
          },
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      return result.placement ?? null
    } catch {
      return null
    }
  }, [])

  // Graduate: move wishlist item to inventory
  const graduateToGarden = useCallback(async (wishlistId: string): Promise<boolean> => {
    const item = items.find(i => i.id === wishlistId)
    if (!item) return false

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Insert into inventory
    const { error } = await supabase.from('inventory').insert({
      user_id: user.id,
      common: item.common,
      scientific: item.scientific,
      type: item.type,
      category: item.category,
      confidence: item.confidence,
      description: item.description,
      image_url: item.image_url,
      notes: item.notes,
      is_native: item.is_native,
      bloom: item.bloom,
      season: item.season,
      care_profile: item.care_profile,
      source: item.source,
      tags: [],
      location: '',
    })

    if (error) return false

    // Delete from wishlist
    await supabase.from('wishlist').delete().eq('id', wishlistId)
    setItems(prev => prev.filter(i => i.id !== wishlistId))
    return true
  }, [items])

  return { items, loading, addItem, deleteItem, updateItem, suggestPlacement, graduateToGarden, refresh: load }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add useWishlist hook with CRUD, AI placement suggestions, and graduation"
```

---

### Task 3: Update CaptureSheet for real wishlist saving

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Read CaptureSheet and update the handleSave function**

Read `react-app/src/components/capture/CaptureSheet.tsx`. Replace the `handleSave` function's wishlist branch. The current code has:

```tsx
if (target === 'wishlist') {
  toast.info('Wishlist saving coming in a future update — saved to garden instead')
}
```

Replace the entire `handleSave` function to handle the wishlist flow properly. The new flow:
1. When target is 'wishlist', show a prompt for "where spotted"
2. Save to the wishlist table via `useWishlist().addItem`
3. Trigger background AI placement suggestion

Add to imports:
```tsx
import { useWishlist } from '@/hooks/useWishlist'
```

Add to the component (after the existing `useInventory` call):
```tsx
const { addItem: addToWishlist } = useWishlist()
```

Add new state:
```tsx
const [showSpottedPrompt, setShowSpottedPrompt] = useState(false)
const [spottedAt, setSpottedAt] = useState('')
```

Add suggested chips for spotted locations. Add this component inside the sheet JSX, after the "Save as Friend" button area, conditionally rendered:

The key changes to `handleSave`:
- When target is 'wishlist', set `showSpottedPrompt(true)` instead of saving immediately
- Add a new `handleSaveToWishlist` function that:
  1. Uploads the image
  2. Creates the wishlist entry with `spotted_at`
  3. Shows success toast
  4. Closes the sheet

Also add the "where spotted" UI that shows when `showSpottedPrompt` is true — suggested chips (Leu Gardens, Garden center, Neighbor's yard, Botanical garden, Hiking trail) + free text input.

Here is the complete updated section. Read the current file first, then make these specific changes:

In the `handleSave` function, replace the wishlist branch:
```tsx
    if (target === 'wishlist') {
      setShowSpottedPrompt(true)
      return
    }
```

Remove the `setStep('saving')` line from the top of handleSave — move it into each branch after validation.

Add a new function `handleSaveToWishlist`:
```tsx
  async function handleSaveToWishlist() {
    if (!canvasRef.current || !results.length) return
    setStep('saving')
    setShowSpottedPrompt(false)

    try {
      const result = results[selectedIndex]
      const imageUrl = await uploadToStorage(canvasRef.current, 0.82, '')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await addToWishlist({
        user_id: user.id,
        common: result.common,
        scientific: result.scientific,
        type: result.type,
        category: result.category,
        confidence: result.confidence,
        description: result.description,
        image_url: imageUrl,
        spotted_at: spottedAt.trim() || null,
        notes: notes,
        is_native: result.isNative,
        bloom: result.bloom,
        season: result.season,
        care_profile: null,
        suggested_zones: null,
        sun_needs: null,
        soil_needs: null,
        moisture_needs: null,
        source: 'Claude AI',
      })

      toast.success(`${result.common} saved as a friend of the garden`)
      handleClose()
    } catch (err: any) {
      toast.error('Error saving: ' + err.message)
      setStep('results')
    }
  }
```

Add the "where spotted" UI in the JSX, right before the `{step === 'saving' && ...}` block:
```tsx
        {showSpottedPrompt && (
          <div className="space-y-3 mt-4">
            <p className="font-display text-sm text-primary">Where did you spot this friend?</p>
            <div className="flex flex-wrap gap-2">
              {['Leu Gardens', 'Garden center', "Neighbor's yard", 'Botanical garden', 'Hiking trail'].map(place => (
                <button
                  key={place}
                  onClick={() => setSpottedAt(place)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    spottedAt === place ? 'border-primary bg-sage-light/50 text-primary' : 'border-cream-dark text-ink-mid'
                  }`}
                >
                  {place}
                </button>
              ))}
            </div>
            <Input
              value={spottedAt}
              onChange={(e) => setSpottedAt(e.target.value)}
              placeholder="Or type a location..."
              className="text-sm"
            />
            <Button onClick={handleSaveToWishlist} className="w-full" size="lg">
              <Heart size={18} className="mr-2" /> Save as Friend
            </Button>
          </div>
        )}
```

Also add `Input` to the shadcn imports if not already there.

Update the `reset` function to also reset `showSpottedPrompt` and `spottedAt`.

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): update CaptureSheet with real wishlist saving and spotted-at prompt"
```

---

### Task 4: WishlistCard + WishlistDetail components

**Files:**
- Create: `react-app/src/components/wishlist/WishlistCard.tsx`
- Create: `react-app/src/components/wishlist/WishlistDetail.tsx`

- [ ] **Step 1: Create WishlistCard**

Write `react-app/src/components/wishlist/WishlistCard.tsx`:

```tsx
import { Leaf, Bug, Heart, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { WishlistItem } from '@/types'

interface WishlistCardProps {
  item: WishlistItem
  index: number
  onClick: () => void
}

function PlaceholderIcon({ type }: { type: string | null }) {
  if (type === 'bug') return <Bug size={28} className="text-ink-light/40" />
  return <Leaf size={28} className="text-ink-light/40" />
}

export default function WishlistCard({ item, index, onClick }: WishlistCardProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-[--radius-card] border-2 border-dashed border-sage/40 bg-white/70 overflow-hidden text-left transition-transform active:scale-[0.98] w-full opacity-0 animate-[fadeSlideIn_0.3s_ease_forwards]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="aspect-[4/3] bg-cream/50 relative overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.common ?? 'Plant photo'}
            className="w-full h-full object-cover opacity-85"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaceholderIcon type={item.type} />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-display text-sm font-medium text-ink leading-tight truncate">
          {item.common ?? 'Unknown species'}
        </h3>
        {item.scientific && (
          <p className="text-xs text-ink-light italic truncate mt-0.5">{item.scientific}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {item.is_native && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light/60 text-primary border-0">
              <Heart size={10} className="mr-0.5" fill="currentColor" /> Native
            </Badge>
          )}
          {item.spotted_at && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-dashed">
              <MapPin size={9} className="mr-0.5" /> {item.spotted_at}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Create WishlistDetail**

Write `react-app/src/components/wishlist/WishlistDetail.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Leaf, Bug, Heart, MapPin, Calendar, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { confidenceClass } from '@/lib/constants'
import type { WishlistItem, GardenBed } from '@/types'

interface WishlistDetailProps {
  item: WishlistItem | null
  open: boolean
  onClose: () => void
  onGraduate: (id: string) => void
  onDelete: (id: string) => void
  onSuggestPlacement: (
    plant: { common: string | null; scientific: string | null; category: string | null; type: string | null },
    zones: GardenBed[]
  ) => Promise<{ suggestion: string; best_zones: string[]; avoid_zones: string[] } | null>
  gardenZones: GardenBed[]
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidenceClass(confidence)
  const colors = { high: 'bg-sage-light text-primary', mid: 'bg-amber-100 text-amber-800', low: 'bg-red-100 text-red-800' }
  return <Badge variant="secondary" className={`text-[10px] ${colors[level]} border-0`}>{confidence}% match</Badge>
}

export default function WishlistDetail({ item, open, onClose, onGraduate, onDelete, onSuggestPlacement, gardenZones }: WishlistDetailProps) {
  const [suggestion, setSuggestion] = useState<{ suggestion: string; best_zones: string[]; avoid_zones: string[] } | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  useEffect(() => {
    setSuggestion(null)
    if (item && gardenZones.length > 0 && open) {
      setLoadingSuggestion(true)
      onSuggestPlacement(
        { common: item.common, scientific: item.scientific, category: item.category, type: item.type },
        gardenZones
      ).then(result => {
        setSuggestion(result)
        setLoadingSuggestion(false)
      })
    }
  }, [item?.id, open])

  if (!item) return null
  const TypeIcon = item.type === 'bug' ? Bug : Leaf

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl p-0">
        {item.image_url ? (
          <div className="relative h-56">
            <img src={item.image_url} alt={item.common ?? 'Species photo'} className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-cream/50 flex items-center justify-center">
            <TypeIcon size={48} className="text-ink-light/20" />
          </div>
        )}

        <div className="px-5 pb-8 -mt-6 relative">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-xl text-left">{item.common ?? 'Unknown species'}</SheetTitle>
            {item.scientific && <p className="text-sm text-ink-light italic">{item.scientific}</p>}
          </SheetHeader>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.is_native && (
              <Badge variant="secondary" className="bg-sage-light text-primary border-0 text-xs">
                <Heart size={12} className="mr-1" fill="currentColor" /> Native
              </Badge>
            )}
            {item.confidence && <ConfidenceBadge confidence={item.confidence} />}
          </div>

          {/* Where spotted */}
          {item.spotted_at && (
            <div className="flex items-center gap-2 mb-4 text-sm text-ink-mid">
              <MapPin size={14} className="text-sage" />
              <span>Spotted at {item.spotted_at}</span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 mb-4 text-sm text-ink-mid">
            <Calendar size={14} className="text-sage" />
            <span>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {item.description && <p className="text-sm text-ink-mid mb-4 leading-relaxed">{item.description}</p>}

          {item.notes && (
            <div className="bg-cream/60 rounded-[--radius-sm] p-3 mb-4 border border-dashed border-sage/30">
              <p className="text-xs text-ink-light mb-1">Notes</p>
              <p className="text-sm text-ink">{item.notes}</p>
            </div>
          )}

          <Separator className="mb-4" />

          {/* AI Placement Suggestion */}
          <div className="mb-4">
            <h3 className="font-display text-sm font-medium text-primary mb-3 flex items-center gap-1.5">
              <Sparkles size={14} /> Where would this friend thrive?
            </h3>

            {loadingSuggestion && (
              <div className="flex items-center gap-2 py-4 text-sm text-ink-light">
                <Loader2 size={16} className="animate-spin" /> Analyzing your garden zones...
              </div>
            )}

            {suggestion && (
              <div className="bg-sage-light/20 rounded-[--radius-card] p-4 border border-sage/20">
                <p className="text-sm text-ink leading-relaxed italic font-display">{suggestion.suggestion}</p>
                {suggestion.best_zones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {suggestion.best_zones.map(z => (
                      <Badge key={z} variant="secondary" className="text-[10px] bg-sage-light text-primary border-0">{z}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loadingSuggestion && !suggestion && gardenZones.length === 0 && (
              <p className="text-sm text-ink-light">Set up your garden map to get personalized placement suggestions.</p>
            )}

            {!loadingSuggestion && !suggestion && gardenZones.length > 0 && (
              <p className="text-sm text-ink-light">Could not generate a suggestion. Try again later.</p>
            )}
          </div>

          <Separator className="mb-4" />

          {/* Actions */}
          <div className="space-y-2">
            <Button onClick={() => onGraduate(item.id)} className="w-full" size="lg">
              <Leaf size={18} className="mr-2" /> Add to Garden
            </Button>
            <Button onClick={() => onDelete(item.id)} variant="ghost" size="sm" className="w-full text-terra hover:text-terra">
              <Trash2 size={14} className="mr-1" /> Remove from wishlist
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add WishlistCard and WishlistDetail with AI placement suggestions"
```

---

### Task 5: Wishlist page

**Files:**
- Modify: `react-app/src/pages/Wishlist.tsx`

- [ ] **Step 1: Rewrite Wishlist.tsx**

Read the current placeholder, then replace with:

```tsx
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import ScreenHeader from '@/components/layout/ScreenHeader'
import WishlistCard from '@/components/wishlist/WishlistCard'
import WishlistDetail from '@/components/wishlist/WishlistDetail'
import { useWishlist } from '@/hooks/useWishlist'
import { useGardenMap } from '@/hooks/useGardenMap'
import { useInventory } from '@/hooks/useInventory'
import type { WishlistItem } from '@/types'

export default function Wishlist() {
  const { items, loading, deleteItem, suggestPlacement, graduateToGarden } = useWishlist()
  const { beds } = useGardenMap()
  const { refresh: refreshInventory } = useInventory()
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  async function handleGraduate(id: string) {
    const item = items.find(i => i.id === id)
    const success = await graduateToGarden(id)
    if (success) {
      setSelectedItem(null)
      refreshInventory()
      toast.success(`${item?.common ?? 'Plant'} has joined your garden`)
    } else {
      toast.error('Failed to add to garden. Please try again.')
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm('Remove this friend? This cannot be undone.')
    if (!ok) return
    await deleteItem(id)
    setSelectedItem(null)
    toast.success('Removed from wishlist')
  }

  return (
    <>
      <ScreenHeader
        title="Friends of the Garden"
        subtitle={items.length > 0 ? `${items.length} friends waiting` : undefined}
      />

      <div className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-ink-light text-sm">Loading...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, i) => (
              <WishlistCard
                key={item.id}
                item={item}
                index={i}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-sage-light/40 mx-auto flex items-center justify-center mb-4">
              <Heart size={28} className="text-sage" />
            </div>
            <h3 className="font-display text-lg text-primary">
              You haven't met any new friends yet
            </h3>
            <p className="text-sm text-ink-light max-w-xs mx-auto italic font-display">
              Take a walk and see who catches your eye. Snap a photo of any plant you admire and save it as a friend.
            </p>
          </div>
        )}
      </div>

      <WishlistDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onGraduate={handleGraduate}
        onDelete={handleDelete}
        onSuggestPlacement={suggestPlacement}
        gardenZones={beds}
      />
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): wire Wishlist page with dreamy cards, detail sheet, and graduation flow"
```

---

### Task 6: Final verification and push

- [ ] **Step 1: Run tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Manual QA**

1. Tap FAB → capture → identify → "Save as Friend" → "where spotted" chips appear
2. Select a location or type one → save → toast confirms
3. Navigate to Wishlist tab → dreamy dashed-border cards with spotted location
4. Tap a card → WishlistDetail opens with spotted location, description, AI placement suggestion (if garden map has zones)
5. "Add to Garden" → item appears in garden inventory, removed from wishlist
6. Empty wishlist shows literary empty state
7. No emoji anywhere

- [ ] **Step 4: Push**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git push
```
