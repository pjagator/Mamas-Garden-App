# Project Firebush Phase 4: Capture + Health

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the photo capture flow (camera/gallery → canvas preview → species ID → save to garden or wishlist), manual entry form, and plant health tracking (quick-log, history timeline, AI diagnosis). Also create the Vercel API route for species identification.

**Architecture:** Capture is a full-screen Sheet triggered by the FAB. Photo is drawn to an offscreen canvas for compression, uploaded to Supabase Storage, then sent to the `identify-species` Vercel API route. ID results render as selectable cards. Save writes to `inventory` (or `wishlist` for "Save as Friend") and triggers background care profile generation. Health check is a separate Sheet triggered from PlantCard's pulse icon. Health logs are stored in the `health_logs` table.

**Tech Stack:** React 18, TypeScript, Supabase Storage, Vercel Serverless Functions, Claude Sonnet (species ID), Claude Haiku (care profiles), Canvas API, Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-28-project-firebush-design.md` — Phase 4 section

**Design rules:**
- NO emoji anywhere — Lucide icons or inline SVG only
- 44px minimum touch targets
- Use `toast` from sonner for all user feedback (never `alert()`)
- Literary botanical language
- All colors from theme tokens

---

## File Map

### New files

```
react-app/
├── api/
│   └── identify-species.ts          # Vercel serverless function: species ID via Claude Sonnet
├── src/
│   ├── components/
│   │   ├── capture/
│   │   │   ├── CaptureSheet.tsx      # Full capture flow: photo → preview → ID → save
│   │   │   ├── IdResultCard.tsx      # Single species ID result card
│   │   │   └── ManualEntry.tsx       # Manual entry form sheet
│   │   └── health/
│   │       ├── HealthLogSheet.tsx    # Quick-log health check form
│   │       └── HealthTimeline.tsx    # Health history in item detail
│   └── hooks/
│       └── useHealthLogs.ts         # Health log CRUD
```

### Modified files

```
react-app/src/
├── components/layout/AppShell.tsx    # Wire FAB → CaptureSheet
├── components/garden/PlantCard.tsx   # Add health pulse button
├── components/garden/ItemDetail.tsx  # Add health timeline section
└── hooks/useInventory.ts            # Add insertItem method
```

### New shadcn components to install

```
npx shadcn@latest add textarea toggle-group
```

---

### Task 1: Vercel API route for species identification

**Files:**
- Create: `react-app/api/identify-species.ts`

- [ ] **Step 1: Create the API route**

Write `react-app/api/identify-species.ts`:

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageUrl } = req.body
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' })

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Could not fetch image from storage')
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'

    const claudeResponse = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: `You are a botanist and entomologist specializing in Tampa Bay, Florida (USDA Zone 9b-10a). Identify the species in this photo. Return a JSON array of up to 3 possible identifications, ordered by confidence. Each object must have exactly these fields:
{
  "common": "Common name",
  "scientific": "Scientific binomial",
  "type": "plant" or "bug",
  "category": "Tree", "Shrub", "Wildflower", "Vine", "Grass", "Palm", "Cycad", "Fern", "Herb", "Butterfly", "Moth", "Beetle", "Dragonfly", "Bee", "Spider", or similar,
  "confidence": 0-100 integer,
  "isNative": true/false (native to Florida specifically),
  "description": "One sentence about this species",
  "care": "One brief care tip for Tampa Bay gardens" or null for insects,
  "bloom": ["Spring","Summer","Fall","Winter","Year-round"] or null,
  "season": ["Spring","Summer","Fall","Winter","Year-round"] or null (for insects, active seasons)
}
Return ONLY the JSON array, no other text.`,
            },
          ],
        }],
      }),
    })

    const claudeData = await claudeResponse.json()
    if (claudeData.error) throw new Error(claudeData.error.message)

    const text = claudeData.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No species identified. Try a clearer photo.')

    const identifications = JSON.parse(jsonMatch[0])
    return res.status(200).json({ identifications })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Identification failed' })
  }
}
```

- [ ] **Step 2: Install Vercel Node types (dev dependency)**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm install -D @vercel/node
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

Note: The API route is a Vercel serverless function — it won't be tested locally in `npm run dev`. It deploys when pushed to Vercel. For local testing, the capture flow will fall back to the existing Supabase edge function URL (we'll handle this with a config flag).

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add Vercel API route for species identification via Claude Sonnet"
```

---

### Task 2: Install shadcn components + add insertItem to useInventory

**Files:**
- Modify: `react-app/src/hooks/useInventory.ts`

- [ ] **Step 1: Install shadcn components**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx shadcn@latest add textarea toggle-group
```

- [ ] **Step 2: Add insertItem to useInventory**

Add this method to `react-app/src/hooks/useInventory.ts`, inside the `useInventory` function, after the `updateItem` callback:

```typescript
  const insertItem = useCallback(async (entry: Omit<InventoryItem, 'id' | 'date'>) => {
    const { data, error: err } = await supabase
      .from('inventory')
      .insert(entry)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }

    setItems(prev => {
      const next = [data as InventoryItem, ...prev]
      writeCache(next)
      return next
    })
    return data as InventoryItem
  }, [])
```

Also add `insertItem` to the return object:

```typescript
  return { items, loading, error, stats, refresh, deleteItem, updateItem, insertItem }
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add insertItem to useInventory, install textarea and toggle-group"
```

---

### Task 3: IdResultCard component

**Files:**
- Create: `react-app/src/components/capture/IdResultCard.tsx`

- [ ] **Step 1: Create IdResultCard**

Write `react-app/src/components/capture/IdResultCard.tsx`:

```tsx
import { Heart, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { confidenceClass } from '@/lib/constants'

interface IdResult {
  common: string
  scientific: string
  type: string
  category: string
  confidence: number
  isNative: boolean
  description: string
  care: string | null
  bloom: string[] | null
  season: string[] | null
}

interface IdResultCardProps {
  result: IdResult
  selected: boolean
  onSelect: () => void
}

export type { IdResult }

export default function IdResultCard({ result, selected, onSelect }: IdResultCardProps) {
  const level = confidenceClass(result.confidence)
  const confidenceColors = {
    high: 'bg-sage-light text-primary',
    mid: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-[--radius-card] border-2 p-4 transition-colors ${
        selected ? 'border-primary bg-sage-light/30' : 'border-cream-dark bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-medium text-ink truncate">{result.common}</h3>
            {selected && <Check size={16} className="text-primary flex-shrink-0" />}
          </div>
          {result.scientific && (
            <p className="text-xs text-ink-light italic truncate mt-0.5">{result.scientific}</p>
          )}
        </div>
        <Badge variant="secondary" className={`text-[10px] flex-shrink-0 ${confidenceColors[level]} border-0`}>
          {result.confidence}%
        </Badge>
      </div>

      {result.description && (
        <p className="text-xs text-ink-mid mt-2 line-clamp-2">{result.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {result.isNative && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-sage-light text-primary border-0">
            <Heart size={10} className="mr-0.5" fill="currentColor" /> Native
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{result.category || result.type}</Badge>
        {result.bloom && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-cream border-0">
            {result.bloom.join(', ')}
          </Badge>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add IdResultCard component for species identification results"
```

---

### Task 4: CaptureSheet — the full capture flow

**Files:**
- Create: `react-app/src/components/capture/CaptureSheet.tsx`

This is the largest component in this phase. It handles: photo input (camera/gallery), canvas preview with compression, image upload, species ID call, result card selection, notes, and save flow with "Add to Garden" vs "Save as Friend" fork.

- [ ] **Step 1: Create CaptureSheet**

Write `react-app/src/components/capture/CaptureSheet.tsx`:

```tsx
import { useState, useRef, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Image as ImageIcon, X, Loader2, Leaf, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import { matchNative, PRESET_TAGS } from '@/lib/constants'
import { useInventory } from '@/hooks/useInventory'
import IdResultCard from './IdResultCard'
import type { IdResult } from './IdResultCard'
import type { InventoryItem } from '@/types'

interface CaptureSheetProps {
  open: boolean
  onClose: () => void
}

type CaptureStep = 'photo' | 'identifying' | 'results' | 'saving'

function friendlyError(msg: string): { title: string; message: string } {
  const lower = msg.toLowerCase()
  if (lower.includes('overloaded')) return { title: 'Identification service is busy', message: 'Please wait a moment and try again.' }
  if (lower.includes('no species identified') || lower.includes('empty array')) return { title: 'No species found', message: 'Try a closer, well-lit shot of the leaves or flowers.' }
  if (lower.includes('could not fetch image')) return { title: 'Photo upload issue', message: 'Please try taking or selecting the photo again.' }
  if (lower.includes('session') || lower.includes('sign')) return { title: 'Session expired', message: 'Please sign out and sign back in.' }
  return { title: 'Identification failed', message: msg }
}

export default function CaptureSheet({ open, onClose }: CaptureSheetProps) {
  const { insertItem } = useInventory()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<CaptureStep>('photo')
  const [hasImage, setHasImage] = useState(false)
  const [results, setResults] = useState<IdResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  const reset = useCallback(() => {
    setStep('photo')
    setHasImage(false)
    setResults([])
    setSelectedIndex(0)
    setNotes('')
    setError(null)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }, [])

  function handleClose() {
    reset()
    onClose()
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type && !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const max = 900
        let w = img.width, h = img.height
        if (w > h) { if (w > max) { h = h * max / w; w = max } }
        else { if (h > max) { w = w * max / h; h = max } }

        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        setHasImage(true)
        setResults([])
        setError(null)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setHasImage(false)
    setResults([])
    setError(null)
    setStep('photo')
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  async function uploadToStorage(canvas: HTMLCanvasElement, quality: number, prefix: string): Promise<string> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { reject(new Error('Failed to create image blob')); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { reject(new Error('Not authenticated')); return }
        const path = `${user.id}/${prefix}${Date.now()}.jpg`
        const { error } = await supabase.storage.from('garden-images').upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: prefix.startsWith('temp'),
        })
        if (error) { reject(error); return }
        const { data: { publicUrl } } = supabase.storage.from('garden-images').getPublicUrl(path)
        resolve(publicUrl)
      }, 'image/jpeg', quality)
    })
  }

  async function handleIdentify() {
    if (!canvasRef.current || !hasImage) return
    setStep('identifying')
    setError(null)

    try {
      const tempUrl = await uploadToStorage(canvasRef.current, 0.5, 'temp_')

      const response = await resilientFetch('/api/identify-species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: tempUrl }),
      }, { retries: 2, timeoutMs: 30000 })

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      if (!data.identifications?.length) throw new Error('No species identified. Try a clearer photo.')

      const top3: IdResult[] = data.identifications.slice(0, 3).map((r: any) => {
        const nativeMatch = matchNative(r.common, r.scientific)
        return {
          ...r,
          common: nativeMatch?.name || r.common,
          bloom: r.bloom || nativeMatch?.bloom || null,
          category: r.category || nativeMatch?.type || (r.type === 'plant' ? 'Plant' : 'Insect'),
          isNative: r.isNative || !!nativeMatch,
        }
      })

      setResults(top3)
      setSelectedIndex(0)
      setStep('results')
    } catch (err: any) {
      setError(friendlyError(err.message))
      setStep('photo')
    }
  }

  async function handleSave(target: 'garden' | 'wishlist') {
    if (!canvasRef.current || selectedIndex === null || !results.length) return
    setStep('saving')

    try {
      const result = results[selectedIndex]
      const imageUrl = await uploadToStorage(canvasRef.current, 0.82, '')

      const autoTags: string[] = []
      if (result.category && (PRESET_TAGS as readonly string[]).includes(result.category)) {
        autoTags.push(result.category)
      }

      if (target === 'garden') {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const entry: Omit<InventoryItem, 'id' | 'date'> = {
          user_id: user.id,
          common: result.common,
          scientific: result.scientific,
          type: result.type as 'plant' | 'bug',
          category: result.category,
          confidence: result.confidence,
          description: result.description,
          care: result.care,
          bloom: result.bloom,
          season: result.season,
          is_native: result.isNative,
          source: 'Claude AI',
          image_url: imageUrl,
          notes: notes,
          tags: autoTags,
          location: '',
          care_profile: null,
          health: null,
          flowering: null,
          height: null,
          features: null,
          linked_plant_id: null,
        }

        const inserted = await insertItem(entry)
        if (!inserted) throw new Error('Failed to save')

        toast.success(`${result.common} added to your garden`)

        // Background care profile generation
        if (inserted.type === 'plant') {
          generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category)
        }
      } else {
        // Save as Friend (wishlist) — Phase 6 will implement the full wishlist table
        // For now, save to inventory with a toast noting this
        toast.info('Wishlist saving coming in a future update — saved to garden instead')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const entry: Omit<InventoryItem, 'id' | 'date'> = {
          user_id: user.id,
          common: result.common,
          scientific: result.scientific,
          type: result.type as 'plant' | 'bug',
          category: result.category,
          confidence: result.confidence,
          description: result.description,
          care: result.care,
          bloom: result.bloom,
          season: result.season,
          is_native: result.isNative,
          source: 'Claude AI',
          image_url: imageUrl,
          notes: notes,
          tags: autoTags,
          location: '',
          care_profile: null,
          health: null,
          flowering: null,
          height: null,
          features: null,
          linked_plant_id: null,
        }

        await insertItem(entry)
        toast.success(`${result.common} saved`)
      }

      handleClose()
    } catch (err: any) {
      toast.error('Error saving: ' + err.message)
      setStep('results')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">
            {step === 'photo' && 'Capture a Species'}
            {step === 'identifying' && 'Identifying...'}
            {step === 'results' && 'Species Identified'}
            {step === 'saving' && 'Saving...'}
          </SheetTitle>
        </SheetHeader>

        {/* Photo input */}
        {step === 'photo' && !hasImage && (
          <div className="space-y-4">
            <div className="aspect-[4/3] bg-cream-dark rounded-[--radius-card] flex flex-col items-center justify-center gap-4">
              <Leaf size={48} className="text-ink-light/30" />
              <p className="text-sm text-ink-light">Take a photo or choose from your gallery</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => cameraRef.current?.click()} className="flex-1" size="lg">
                <Camera size={20} className="mr-2" /> Camera
              </Button>
              <Button onClick={() => galleryRef.current?.click()} variant="outline" className="flex-1" size="lg">
                <ImageIcon size={20} className="mr-2" /> Gallery
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
        )}

        {/* Canvas preview */}
        {hasImage && step !== 'saving' && (
          <div className="space-y-4">
            <div className="relative">
              <canvas ref={canvasRef} className="w-full rounded-[--radius-card]" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center min-h-0 min-w-0"
              >
                <X size={16} />
              </button>
            </div>

            {step === 'photo' && (
              <Button onClick={handleIdentify} className="w-full" size="lg">
                <Leaf size={20} className="mr-2" /> Identify species
              </Button>
            )}
          </div>
        )}

        {/* Hidden canvas for when not visible */}
        {!hasImage && <canvas ref={canvasRef} className="hidden" />}

        {/* Loading state */}
        {step === 'identifying' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-ink-mid">Analyzing with Claude AI...</p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-[--radius-card] border-2 border-terra p-4 mt-4">
            <p className="text-sm font-medium text-terra">{error.title}</p>
            <p className="text-xs text-ink-mid mt-1">{error.message}</p>
          </div>
        )}

        {/* Results */}
        {step === 'results' && results.length > 0 && (
          <div className="space-y-3 mt-4">
            {results.map((r, i) => (
              <IdResultCard
                key={i}
                result={r}
                selected={selectedIndex === i}
                onSelect={() => setSelectedIndex(i)}
              />
            ))}

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={2}
              className="mt-3"
            />

            <div className="flex gap-3 mt-3">
              <Button onClick={() => handleSave('garden')} className="flex-1" size="lg">
                <Leaf size={18} className="mr-2" /> Add to Garden
              </Button>
              <Button onClick={() => handleSave('wishlist')} variant="outline" className="flex-1" size="lg">
                <Heart size={18} className="mr-2" /> Save as Friend
              </Button>
            </div>
          </div>
        )}

        {/* Saving state */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-ink-mid">Saving to your garden...</p>
          </div>
        )}

        {/* Hidden file inputs (always rendered) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </SheetContent>
    </Sheet>
  )
}

// Background care profile generation (non-blocking)
async function generateCareProfile(itemId: string, common: string | null, scientific: string | null, type: string | null, category: string | null) {
  if (type !== 'plant') return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await resilientFetch('/api/garden-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'care_profile',
        data: { common, scientific, type, category },
      }),
    })
    const result = await response.json()
    if (result.care_profile) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('inventory')
        .update({ care_profile: result.care_profile })
        .eq('id', itemId)
        .eq('user_id', user!.id)
    }
  } catch (err) {
    console.error('Care profile generation failed:', err)
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add CaptureSheet with photo capture, species ID, and save flow"
```

---

### Task 5: ManualEntry sheet

**Files:**
- Create: `react-app/src/components/capture/ManualEntry.tsx`

- [ ] **Step 1: Create ManualEntry**

Write `react-app/src/components/capture/ManualEntry.tsx`:

```tsx
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { matchNative, PRESET_TAGS } from '@/lib/constants'
import { useInventory } from '@/hooks/useInventory'

interface ManualEntryProps {
  open: boolean
  onClose: () => void
}

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const

export default function ManualEntry({ open, onClose }: ManualEntryProps) {
  const { insertItem } = useInventory()
  const [common, setCommon] = useState('')
  const [scientific, setScientific] = useState('')
  const [type, setType] = useState<'plant' | 'bug'>('plant')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [bloom, setBloom] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function reset() {
    setCommon(''); setScientific(''); setType('plant')
    setCategory(''); setNotes(''); setBloom([])
  }

  function handleClose() { reset(); onClose() }

  function toggleBloom(season: string) {
    setBloom(prev => prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!common.trim()) { toast.error('Common name is required.'); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const nativeMatch = matchNative(common, scientific)
      const autoTags: string[] = []
      const finalCategory = category || nativeMatch?.type || ''
      if (finalCategory && (PRESET_TAGS as readonly string[]).includes(finalCategory)) {
        autoTags.push(finalCategory)
      }

      const inserted = await insertItem({
        user_id: user.id,
        common: nativeMatch?.name || common.trim(),
        scientific: scientific.trim() || nativeMatch?.scientific || null,
        type,
        category: finalCategory,
        confidence: null,
        description: null,
        care: null,
        bloom: bloom.length > 0 ? bloom : nativeMatch?.bloom || null,
        season: type === 'bug' && bloom.length > 0 ? bloom : null,
        is_native: !!nativeMatch,
        source: 'Manual',
        image_url: null,
        notes: notes.trim(),
        tags: autoTags,
        location: '',
        care_profile: null,
        health: null,
        flowering: null,
        height: null,
        features: null,
        linked_plant_id: null,
      })

      if (!inserted) throw new Error('Failed to save')
      toast.success(`${nativeMatch?.name || common} added to your garden`)
      handleClose()
    } catch (err: any) {
      toast.error('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">Add Manually</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-common">Common name *</Label>
            <Input id="manual-common" value={common} onChange={e => setCommon(e.target.value)} placeholder="e.g. Firebush" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-scientific">Scientific name</Label>
            <Input id="manual-scientific" value={scientific} onChange={e => setScientific(e.target.value)} placeholder="e.g. Hamelia patens" />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button type="button" variant={type === 'plant' ? 'default' : 'outline'} size="sm" onClick={() => setType('plant')}>Plant</Button>
              <Button type="button" variant={type === 'bug' ? 'default' : 'outline'} size="sm" onClick={() => setType('bug')}>Insect</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-category">Category</Label>
            <Input id="manual-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Shrub, Butterfly" />
          </div>

          <div className="space-y-2">
            <Label>{type === 'bug' ? 'Active seasons' : 'Blooming seasons'}</Label>
            <div className="flex gap-3">
              {SEASONS.map(s => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={bloom.includes(s)} onCheckedChange={() => toggleBloom(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-notes">Notes</Label>
            <Textarea id="manual-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Where you found it, observations..." rows={2} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? 'Saving...' : 'Add to Garden'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add ManualEntry sheet for adding species without photos"
```

---

### Task 6: Wire CaptureSheet + ManualEntry into AppShell

**Files:**
- Modify: `react-app/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Update AppShell to manage capture state**

Read the current `AppShell.tsx`, then add state for the capture sheet and manual entry, and pass the handlers to BottomNav/Sidebar:

Add to imports:
```tsx
import CaptureSheet from '@/components/capture/CaptureSheet'
import ManualEntry from '@/components/capture/ManualEntry'
```

Replace the `handleFabClick` placeholder:
```tsx
  const [captureOpen, setCaptureOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  const handleFabClick = () => setCaptureOpen(true)
```

Add the sheets to the JSX return, inside the authenticated view (after the `{showWelcome && ...}` line, before the layout branches):

```tsx
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <ManualEntry open={manualOpen} onClose={() => setManualOpen(false)} />
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): wire CaptureSheet and ManualEntry into AppShell FAB"
```

---

### Task 7: useHealthLogs hook

**Files:**
- Create: `react-app/src/hooks/useHealthLogs.ts`

- [ ] **Step 1: Write useHealthLogs**

Write `react-app/src/hooks/useHealthLogs.ts`:

```typescript
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { HealthLog, HealthStatus, FloweringStatus, Diagnosis } from '@/types'

const PAGE_SIZE = 10

export function useHealthLogs(inventoryId: string | null) {
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (offset = 0) => {
    if (!inventoryId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('logged_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error && data) {
      if (offset === 0) {
        setLogs(data as HealthLog[])
      } else {
        setLogs(prev => [...prev, ...(data as HealthLog[])])
      }
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [inventoryId])

  const loadMore = useCallback(() => {
    load(logs.length)
  }, [load, logs.length])

  const save = useCallback(async (
    health: HealthStatus,
    flowering: FloweringStatus | null,
    notes: string,
    imageUrl: string | null
  ): Promise<HealthLog | null> => {
    if (!inventoryId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Insert health log
    const { data, error } = await supabase
      .from('health_logs')
      .insert({
        user_id: user.id,
        inventory_id: inventoryId,
        health,
        flowering,
        notes,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (error || !data) return null

    // Update inventory item's health + flowering
    await supabase.from('inventory')
      .update({ health, flowering })
      .eq('id', inventoryId)
      .eq('user_id', user.id)

    setLogs(prev => [data as HealthLog, ...prev])
    return data as HealthLog
  }, [inventoryId])

  const diagnose = useCallback(async (
    plant: { common: string | null; scientific: string | null },
    health: HealthStatus,
    imageUrl: string
  ): Promise<Diagnosis | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'diagnosis',
          data: {
            common: plant.common,
            scientific: plant.scientific,
            health,
            imageUrl,
          },
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      if (result.diagnosis) {
        // Update the most recent log with diagnosis
        if (logs.length > 0) {
          await supabase.from('health_logs')
            .update({ diagnosis: result.diagnosis })
            .eq('id', logs[0].id)
          setLogs(prev => prev.map((l, i) => i === 0 ? { ...l, diagnosis: result.diagnosis } : l))
        }
        return result.diagnosis as Diagnosis
      }
      return null
    } catch {
      return null
    }
  }, [logs])

  return { logs, loading, hasMore, load, loadMore, save, diagnose }
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add useHealthLogs hook with save, pagination, and AI diagnosis"
```

---

### Task 8: HealthLogSheet + HealthTimeline

**Files:**
- Create: `react-app/src/components/health/HealthLogSheet.tsx`
- Create: `react-app/src/components/health/HealthTimeline.tsx`

- [ ] **Step 1: Create HealthLogSheet**

Write `react-app/src/components/health/HealthLogSheet.tsx`:

```tsx
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useHealthLogs } from '@/hooks/useHealthLogs'
import type { InventoryItem, HealthStatus, FloweringStatus } from '@/types'

interface HealthLogSheetProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const HEALTH_OPTIONS: { value: HealthStatus; label: string; color: string }[] = [
  { value: 'thriving', label: 'Thriving', color: 'bg-emerald-500' },
  { value: 'healthy', label: 'Healthy', color: 'bg-green-400' },
  { value: 'stressed', label: 'Stressed', color: 'bg-amber-400' },
  { value: 'sick', label: 'Sick', color: 'bg-red-500' },
  { value: 'dormant', label: 'Dormant', color: 'bg-slate-400' },
  { value: 'new', label: 'New', color: 'bg-blue-400' },
]

const FLOWERING_OPTIONS: { value: FloweringStatus; label: string }[] = [
  { value: 'yes', label: 'Flowering' },
  { value: 'budding', label: 'Budding' },
  { value: 'no', label: 'No flowers' },
  { value: 'fruiting', label: 'Fruiting' },
]

export default function HealthLogSheet({ item, open, onClose, onSaved }: HealthLogSheetProps) {
  const { save } = useHealthLogs(item?.id ?? null)
  const [health, setHealth] = useState<HealthStatus | null>(item?.health ?? null)
  const [flowering, setFlowering] = useState<FloweringStatus | null>(item?.flowering ?? null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!health) { toast.error('Please select a health status.'); return }
    setSaving(true)
    const result = await save(health, flowering, notes, null)
    setSaving(false)
    if (result) {
      toast.success('Health check logged')
      setNotes('')
      onSaved()
      onClose()
    } else {
      toast.error('Failed to save health check')
    }
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display">{item.common}</SheetTitle>
          <p className="text-sm text-ink-light">Quick health check</p>
        </SheetHeader>

        <div className="space-y-5">
          {/* Health pills */}
          <div className="space-y-2">
            <p className="text-xs text-ink-light font-medium">Health status</p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_OPTIONS.map(h => (
                <button
                  key={h.value}
                  onClick={() => setHealth(h.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border-2 transition-colors ${
                    health === h.value
                      ? 'border-primary bg-sage-light/50 text-primary'
                      : 'border-cream-dark text-ink-mid'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${h.color}`} />
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flowering pills */}
          {item.type === 'plant' && (
            <div className="space-y-2">
              <p className="text-xs text-ink-light font-medium">Flowering</p>
              <div className="flex flex-wrap gap-2">
                {FLOWERING_OPTIONS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFlowering(f.value)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border-2 transition-colors ${
                      flowering === f.value
                        ? 'border-primary bg-sage-light/50 text-primary'
                        : 'border-cream-dark text-ink-mid'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations (optional)..."
            rows={2}
          />

          <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
            {saving ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : 'Log Health Check'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create HealthTimeline**

Write `react-app/src/components/health/HealthTimeline.tsx`:

```tsx
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { useHealthLogs } from '@/hooks/useHealthLogs'
import type { HealthStatus } from '@/types'

interface HealthTimelineProps {
  inventoryId: string
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  thriving: 'bg-emerald-500',
  healthy: 'bg-green-400',
  stressed: 'bg-amber-400',
  sick: 'bg-red-500',
  dormant: 'bg-slate-400',
  new: 'bg-blue-400',
}

export default function HealthTimeline({ inventoryId }: HealthTimelineProps) {
  const { logs, loading, hasMore, load, loadMore } = useHealthLogs(inventoryId)

  useEffect(() => { load() }, [load])

  if (logs.length === 0 && !loading) return null

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-medium text-primary">Health History</h3>

      <div className="relative pl-6">
        {/* Vertical track line */}
        <div className="absolute left-2 top-1 bottom-1 w-px bg-cream-dark" />

        {logs.map(log => (
          <div key={log.id} className="relative pb-4 last:pb-0">
            {/* Node dot */}
            <div className={`absolute left-[-16px] top-1 w-3 h-3 rounded-full border-2 border-white ${HEALTH_COLORS[log.health]}`} />

            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink capitalize">{log.health}</span>
                {log.flowering && log.flowering !== 'no' && (
                  <span className="text-ink-light capitalize">· {log.flowering}</span>
                )}
                <span className="text-ink-light ml-auto">
                  {new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {log.notes && <p className="text-ink-mid mt-0.5">{log.notes}</p>}
              {log.diagnosis && (
                <div className="mt-1.5 p-2 rounded bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1 text-amber-800 font-medium">
                    <AlertTriangle size={12} /> {log.diagnosis.cause}
                  </div>
                  <p className="text-amber-700 mt-0.5">{log.diagnosis.action}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading} className="w-full text-xs">
          <ChevronDown size={14} className="mr-1" />
          {loading ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): add HealthLogSheet and HealthTimeline components"
```

---

### Task 9: Wire health into PlantCard + ItemDetail

**Files:**
- Modify: `react-app/src/components/garden/PlantCard.tsx`
- Modify: `react-app/src/components/garden/ItemDetail.tsx`
- Modify: `react-app/src/pages/Garden.tsx`

- [ ] **Step 1: Add health pulse button to PlantCard**

In `react-app/src/components/garden/PlantCard.tsx`, add a tappable health pulse icon that opens the health log sheet. Add an `onHealthClick` prop:

Change the interface:
```tsx
interface PlantCardProps {
  item: InventoryItem
  index: number
  onClick: () => void
  onHealthClick?: () => void
}
```

Add the prop to the function signature and render a health button overlay on plant cards. After the health indicator dot (the existing `{item.health && ...}` block inside the image div), add:

```tsx
        {item.type === 'plant' && onHealthClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onHealthClick() }}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center min-h-0 min-w-0"
            title="Log health check"
          >
            <Activity size={14} className="text-sage" />
          </button>
        )}
```

Add `Activity` to the lucide-react imports.

- [ ] **Step 2: Add HealthTimeline to ItemDetail**

In `react-app/src/components/garden/ItemDetail.tsx`, import `HealthTimeline` and render it after the care profile section (before the delete button):

```tsx
import HealthTimeline from '@/components/health/HealthTimeline'
```

Add before the delete button:
```tsx
          {item.type === 'plant' && (
            <>
              <HealthTimeline inventoryId={item.id} />
              <Separator className="my-4" />
            </>
          )}
```

- [ ] **Step 3: Wire HealthLogSheet into Garden page**

In `react-app/src/pages/Garden.tsx`, add state for the health sheet and pass `onHealthClick` to PlantCard:

Add imports:
```tsx
import HealthLogSheet from '@/components/health/HealthLogSheet'
```

Add state:
```tsx
  const [healthItem, setHealthItem] = useState<InventoryItem | null>(null)
```

Update the PlantCard rendering to include onHealthClick:
```tsx
              <PlantCard
                key={item.id}
                item={item}
                index={i}
                onClick={() => setSelectedItem(item)}
                onHealthClick={() => setHealthItem(item)}
              />
```

Add the HealthLogSheet at the bottom of the JSX (after ItemDetail):
```tsx
      <HealthLogSheet
        item={healthItem}
        open={!!healthItem}
        onClose={() => setHealthItem(null)}
        onSaved={() => refresh()}
      />
```

Add `refresh` to the useInventory destructure at the top.

- [ ] **Step 4: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 5: Run all tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git add -A && git commit -m "feat(firebush): wire health tracking into PlantCard and ItemDetail"
```

---

### Task 10: Final verification and push

**Files:** None new — verification only.

- [ ] **Step 1: Run all tests**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npx vitest run
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/patrickalberts/Mamas-Garden-App/react-app && npm run build
```

- [ ] **Step 3: Manual QA at 390px**

1. Sign in → Garden loads with existing data
2. Tap FAB → CaptureSheet opens with camera/gallery buttons
3. Select a photo → canvas preview renders, "Identify species" button appears
4. (Species ID requires Vercel deployment — test the UI flow, not the API call)
5. Manual entry: test adding a plant manually
6. Tap health pulse on a plant card → HealthLogSheet opens with health/flowering pills
7. Log a health check → toast confirms, health dot updates on card
8. Open a plant's detail → HealthTimeline shows logged entries
9. No emoji anywhere

- [ ] **Step 4: Push**

```bash
cd /Users/patrickalberts/Mamas-Garden-App && git push
```
