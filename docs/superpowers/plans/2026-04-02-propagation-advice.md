# Propagation Advice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible propagation advice section to plant detail sheets (inventory + wishlist) that generates AI-powered propagation instructions, with placement-aware tips for plants on the garden map.

**Architecture:** New `propagation` action on the existing `garden-assistant` API route calls Claude Haiku with species + zone context. Response is cached in a new `propagation_advice` JSONB column on both `inventory` and `wishlist` tables. A new `PropagationCard` component renders the collapsible UI in both `ItemDetail` and `WishlistDetail`.

**Tech Stack:** React + TypeScript, Tailwind CSS, Lucide icons, shadcn/ui, Supabase Postgres, Vercel API routes, Claude Haiku API

---

### Task 1: Database Migration — Add `propagation_advice` Columns

**Files:**
- Create: `react-app/supabase/migrations/propagation_advice.sql`

- [ ] **Step 1: Write the migration SQL**

Create `react-app/supabase/migrations/propagation_advice.sql`:

```sql
-- Add propagation_advice JSONB column to inventory and wishlist tables
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS propagation_advice jsonb DEFAULT NULL;
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS propagation_advice jsonb DEFAULT NULL;
```

- [ ] **Step 2: Run the migration**

Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New query). Paste the contents of the migration file and execute.

Verify: Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'propagation_advice';` — should return one row with `data_type = jsonb`.

- [ ] **Step 3: Commit**

```bash
git add react-app/supabase/migrations/propagation_advice.sql
git commit -m "feat: add propagation_advice column to inventory and wishlist tables"
```

---

### Task 2: TypeScript Types — Add `PropagationAdvice` Interface

**Files:**
- Modify: `react-app/src/types/index.ts`

- [ ] **Step 1: Add the `PropagationAdvice` interface**

Add after the `CareProfile` interface (after line 42):

```typescript
export interface PropagationAdvice {
  method: string
  timing: string
  steps: string[]
  garden_tip: string | null
}
```

- [ ] **Step 2: Add `propagation_advice` field to `InventoryItem`**

Add after the `linked_plant_id` field (line 28):

```typescript
  propagation_advice: PropagationAdvice | null
```

- [ ] **Step 3: Add `propagation_advice` field to `WishlistItem`**

Add after the `source` field (line 149):

```typescript
  propagation_advice: PropagationAdvice | null
```

- [ ] **Step 4: Commit**

```bash
git add react-app/src/types/index.ts
git commit -m "feat: add PropagationAdvice type and fields to InventoryItem and WishlistItem"
```

---

### Task 3: API Route — Add `propagation` Action

**Files:**
- Modify: `react-app/api/garden-assistant.ts`

- [ ] **Step 1: Add the `propagation` action handler**

In `react-app/api/garden-assistant.ts`, add a new `else if` branch after the `seasonal_care` action (after line 127, before the final `else`):

```typescript
    } else if (action === 'propagation') {
      const { common, scientific, type, category, zone } = data
      let zoneContext = ''
      if (zone) {
        const parts = [
          zone.sun_exposure ? `Sun: ${zone.sun_exposure.replace('_', ' ')}` : null,
          zone.soil_type ? `Soil: ${zone.soil_type.replace('_', ' ')}` : null,
          zone.moisture_level ? `Moisture: ${zone.moisture_level}` : null,
          zone.wind_exposure ? `Wind: ${zone.wind_exposure}` : null,
        ].filter(Boolean).join(', ')
        zoneContext = `\n\nThis plant is currently growing in a garden zone with these conditions: ${parts}. Include a "garden_tip" field with a 1-2 sentence tip specific to propagating in these conditions.`
      }
      const text = await callClaude('claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida (USDA Zone 9b-10a) garden propagation expert.',
        `How should a home gardener propagate ${common} (${scientific}), a ${category || type}? Return a JSON object with these exact fields: { "method": "best propagation method (e.g. Stem cuttings, Seed, Division, Layering)", "timing": "best time of year in Tampa Bay", "steps": ["step 1", "step 2", "step 3"], "garden_tip": ${zone ? '"1-2 sentence tip for their specific zone conditions"' : 'null'} }. Provide 3-5 concise steps. Return ONLY the JSON object.${zoneContext}`)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to generate propagation advice')
      return res.status(200).json({ propagation: JSON.parse(jsonMatch[0]) })
```

- [ ] **Step 2: Verify the API route handles the new action**

Test locally with `vercel dev` or deploy and call:

```bash
curl -X POST https://your-app.vercel.app/api/garden-assistant \
  -H "Content-Type: application/json" \
  -d '{"action":"propagation","data":{"common":"Firebush","scientific":"Hamelia patens","type":"plant","category":"Shrub"}}'
```

Expected: JSON response with `{ "propagation": { "method": "...", "timing": "...", "steps": [...], "garden_tip": null } }`

- [ ] **Step 3: Commit**

```bash
git add react-app/api/garden-assistant.ts
git commit -m "feat: add propagation action to garden-assistant API route"
```

---

### Task 4: PropagationCard Component

**Files:**
- Create: `react-app/src/components/garden/PropagationCard.tsx`

- [ ] **Step 1: Create the PropagationCard component**

Create `react-app/src/components/garden/PropagationCard.tsx`:

```tsx
import { useState } from 'react'
import { ChevronDown, Sprout, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { InventoryItem, WishlistItem, PropagationAdvice } from '@/types'

interface PropagationCardProps {
  item: InventoryItem | WishlistItem
  table: 'inventory' | 'wishlist'
  zone?: {
    sun_exposure: string | null
    soil_type: string | null
    moisture_level: string | null
    wind_exposure: string | null
  } | null
  onAdviceLoaded: (advice: PropagationAdvice) => void
}

export default function PropagationCard({ item, table, zone, onAdviceLoaded }: PropagationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const advice = item.propagation_advice

  async function generate() {
    setLoading(true)
    setError(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'propagation',
          data: {
            common: item.common,
            scientific: item.scientific,
            type: item.type,
            category: 'category' in item ? item.category : null,
            zone: zone ?? undefined,
          },
        }),
      }, { timeoutMs: 30000 })
      const result = await response.json()
      if (result.propagation) {
        await supabase.from(table).update({ propagation_advice: result.propagation }).eq('id', item.id)
        onAdviceLoaded(result.propagation)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function handleExpand() {
    const willExpand = !expanded
    setExpanded(willExpand)
    if (willExpand && !advice && !loading) {
      generate()
    }
  }

  async function handleRegenerate() {
    await generate()
  }

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm mb-4">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2.5">
          <Sprout size={18} className="text-primary" />
          <span className="text-sm font-semibold text-primary">Propagation</span>
        </div>
        <div className="flex items-center gap-2">
          {advice && !expanded && (
            <span className="text-xs text-sage bg-sage-light/40 px-2.5 py-0.5 rounded-full">{advice.method}</span>
          )}
          <ChevronDown size={16} className={`text-ink-light transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 -mt-1">
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-sm text-ink-light">Generating propagation advice...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-ink-light mb-2">Could not generate advice. Try again later.</p>
              <button onClick={handleRegenerate} className="text-xs text-primary font-medium">Retry</button>
            </div>
          )}

          {advice && !loading && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">Best Method</p>
                <p className="text-sm text-ink font-medium">{advice.method}</p>
              </div>

              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">When to Propagate</p>
                <p className="text-sm text-ink">{advice.timing}</p>
              </div>

              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-1">Steps</p>
                <div className="space-y-1">
                  {advice.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 text-sm text-ink">
                      <span className="text-terra font-semibold flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {advice.garden_tip && (
                <div className="bg-cream rounded-[--radius-sm] p-3 border-l-[3px] border-terra">
                  <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">For Your Garden</p>
                  <p className="text-sm text-ink leading-relaxed">{advice.garden_tip}</p>
                </div>
              )}

              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-[10px] text-ink-light hover:text-ink-mid pt-1"
              >
                <RefreshCw size={10} /> Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add react-app/src/components/garden/PropagationCard.tsx
git commit -m "feat: add PropagationCard collapsible component"
```

---

### Task 5: Integrate PropagationCard into ItemDetail

**Files:**
- Modify: `react-app/src/components/garden/ItemDetail.tsx`

- [ ] **Step 1: Add imports**

At the top of `react-app/src/components/garden/ItemDetail.tsx`, add these imports:

After the existing lucide-react import line (line 6), the file already imports various icons. No new icons needed.

Add after the `HealthTimeline` import (line 12):

```typescript
import PropagationCard from '@/components/garden/PropagationCard'
import type { GardenBed, GardenPlacement, PropagationAdvice } from '@/types'
```

- [ ] **Step 2: Update the ItemDetailProps interface**

Add new props to `ItemDetailProps` (after line 20, inside the interface):

```typescript
  placements?: GardenPlacement[]
  beds?: GardenBed[]
```

- [ ] **Step 3: Update the component signature**

Update the destructured props (line 42):

```typescript
export default function ItemDetail({ item, open, onClose, onDelete, onUpdate, placements, beds }: ItemDetailProps) {
```

- [ ] **Step 4: Add zone lookup logic**

Inside the component, after the `displayName` declaration (after line 51), add:

```typescript
  const zone = (() => {
    if (!placements || !beds || !item) return null
    const placement = placements.find(p => p.inventory_id === item.id)
    if (!placement?.bed_id) return null
    const bed = beds.find(b => b.id === placement.bed_id)
    if (!bed) return null
    return {
      sun_exposure: bed.sun_exposure,
      soil_type: bed.soil_type,
      moisture_level: bed.moisture_level,
      wind_exposure: bed.wind_exposure,
    }
  })()
```

- [ ] **Step 5: Add PropagationCard to the JSX**

In the JSX, find the second `<Separator>` before the HealthTimeline (line 252). Add the PropagationCard between the care profile badges and that separator. Replace lines 252-253:

```typescript
          {item.type === 'plant' && (
            <PropagationCard
              item={item}
              table="inventory"
              zone={zone}
              onAdviceLoaded={(advice: PropagationAdvice) => {
                onUpdate?.(item.id, { propagation_advice: advice })
              }}
            />
          )}

          <Separator className="mb-4" />
```

This replaces the existing `<Separator className="mb-4" />` that was on line 252 — the PropagationCard now sits above it.

- [ ] **Step 6: Commit**

```bash
git add react-app/src/components/garden/ItemDetail.tsx
git commit -m "feat: integrate PropagationCard into ItemDetail sheet"
```

---

### Task 6: Pass Placement Data from Garden Page to ItemDetail

**Files:**
- Modify: `react-app/src/pages/Garden.tsx`

- [ ] **Step 1: Pass placements and beds to ItemDetail**

In `react-app/src/pages/Garden.tsx`, find the `<ItemDetail>` JSX (line 170). Add the new props:

Replace:
```tsx
      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onUpdate={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
      />
```

With:
```tsx
      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onUpdate={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
        placements={placements}
        beds={beds}
      />
```

The `beds` and `placements` are already destructured from `useGardenMap()` on line 21.

- [ ] **Step 2: Commit**

```bash
git add react-app/src/pages/Garden.tsx
git commit -m "feat: pass placement data to ItemDetail for propagation zone context"
```

---

### Task 7: Integrate PropagationCard into WishlistDetail

**Files:**
- Modify: `react-app/src/components/wishlist/WishlistDetail.tsx`

- [ ] **Step 1: Add imports**

At the top of `react-app/src/components/wishlist/WishlistDetail.tsx`, add after the existing imports (after line 7):

```typescript
import PropagationCard from '@/components/garden/PropagationCard'
import type { PropagationAdvice } from '@/types'
```

- [ ] **Step 2: Add onUpdateItem prop to WishlistDetailProps**

Add to the `WishlistDetailProps` interface (after line 16, inside the interface):

```typescript
  onUpdateItem: (id: string, updates: Partial<WishlistItem>) => void
```

- [ ] **Step 3: Update the component signature**

Update the destructured props (line 29):

```typescript
export default function WishlistDetail({ item, open, onClose, onGraduate, onDelete, onSuggestPlacement, gardenZones, onUpdateItem }: WishlistDetailProps) {
```

- [ ] **Step 4: Add PropagationCard to the JSX**

Find the `<Separator className="mb-4" />` before the "Where would this friend thrive?" section (line 96). Add the PropagationCard before it. Insert before line 96:

```tsx
          {item.type !== 'bug' && (
            <PropagationCard
              item={item}
              table="wishlist"
              onAdviceLoaded={(advice: PropagationAdvice) => {
                onUpdateItem(item.id, { propagation_advice: advice })
              }}
            />
          )}
```

- [ ] **Step 5: Commit**

```bash
git add react-app/src/components/wishlist/WishlistDetail.tsx
git commit -m "feat: integrate PropagationCard into WishlistDetail sheet"
```

---

### Task 8: Pass onUpdateItem from Wishlist Page to WishlistDetail

**Files:**
- Modify: `react-app/src/pages/Wishlist.tsx`

- [ ] **Step 1: Destructure updateItem from useWishlist**

In `react-app/src/pages/Wishlist.tsx`, update line 13 to include `updateItem`:

```typescript
  const { items, loading, deleteItem, updateItem, suggestPlacement, graduateToGarden } = useWishlist()
```

- [ ] **Step 2: Pass onUpdateItem to WishlistDetail**

Find the `<WishlistDetail>` JSX (line 64). Add the new prop:

Replace:
```tsx
      <WishlistDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onGraduate={handleGraduate}
        onDelete={handleDelete}
        onSuggestPlacement={suggestPlacement}
        gardenZones={beds}
      />
```

With:
```tsx
      <WishlistDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onGraduate={handleGraduate}
        onDelete={handleDelete}
        onSuggestPlacement={suggestPlacement}
        gardenZones={beds}
        onUpdateItem={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
      />
```

- [ ] **Step 3: Commit**

```bash
git add react-app/src/pages/Wishlist.tsx
git commit -m "feat: pass updateItem handler to WishlistDetail for propagation caching"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PROJECT-STATE.md`

- [ ] **Step 1: Update CLAUDE.md**

In `CLAUDE.md`, update the `inventory` table documentation to add the new column. Find the `linked_plant_id` row and add after it:

```
| `propagation_advice` | jsonb | | AI propagation advice (method, timing, steps, garden_tip) |
```

In the `wishlist` table section (under the React App section in the deployment guide or wherever wishlist schema is documented), add the same column if documented there.

Update the `garden-assistant` API route actions list to include:
- **`propagation`**: Generates species-specific propagation advice via Claude Haiku, with optional zone-aware tips

- [ ] **Step 2: Update PROJECT-STATE.md**

Add the PropagationCard component to the component listing. Add the `propagation_advice` column to any table documentation. Note the new `propagation` action on the API route.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md PROJECT-STATE.md
git commit -m "docs: update documentation for propagation advice feature"
```
