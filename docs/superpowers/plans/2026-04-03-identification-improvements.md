# Identification Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve species identification accuracy with a viewfinder overlay, enhanced AI prompt with optional user hints, and manual name entry with photo as a fallback.

**Architecture:** Three independent improvements to the capture flow: (1) ViewfinderOverlay CSS component for camera photos + ImageCropper canvas component for gallery photos, (2) updated identify-species API prompt that accepts optional hints, (3) manual entry inline form in CaptureSheet for both pre-ID and post-ID name entry. All changes stay within the existing capture flow.

**Tech Stack:** React + TypeScript, Tailwind CSS, Canvas API (for crop), Lucide icons

---

### Task 1: Improved Identification Prompt

**Files:**
- Modify: `react-app/api/identify-species.ts`

- [ ] **Step 1: Update the API to accept hints and improve the prompt**

In `react-app/api/identify-species.ts`, update the handler to accept an optional `hints` object and rewrite the prompt.

Replace lines 29-57 (from `const { imageUrl } = req.body` through the end of the `body: JSON.stringify({...})` block):

```typescript
    const { imageUrl, hints } = req.body
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' })

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Could not fetch image from storage')
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'

    let hintsText = ''
    if (hints) {
      const parts: string[] = []
      if (hints.growthForm) parts.push(`- Growth form: ${hints.growthForm}`)
      if (hints.lifeStage) parts.push(`- Life stage: ${hints.lifeStage}`)
      if (hints.partPhotographed) parts.push(`- Part photographed: ${hints.partPhotographed}`)
      if (parts.length > 0) {
        hintsText = `\n\nThe user has provided these hints about the subject:\n${parts.join('\n')}`
      }
    }

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
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: `You are a botanist and entomologist specializing in Tampa Bay, Florida (USDA Zone 9b-10a).

The subject of interest is centered in this photo.

Identification guidelines:
- Focus on the most prominent organism near the center of the image
- Consider the plant's growth form carefully: distinguish trees from shrubs from herbaceous plants from vines from grasses
- Account for life stage: seedlings, juvenile plants, and dormant plants look very different from mature specimens in bloom
- If the photo shows bark, trunk, or canopy of a large plant, it is likely a tree — not an herb or wildflower
- Be conservative with confidence scores: use 90+ only when diagnostic features (flowers, fruit, leaf arrangement) are clearly visible. Use 50-70 when working from foliage alone
- If multiple species are visible, identify only the centered/most prominent one${hintsText}

Identify the species. Return a JSON array of up to 3 possible identifications, ordered by confidence. Each object must have exactly these fields:
{ "common": "Common name", "scientific": "Scientific binomial", "type": "plant" or "bug", "category": "Tree", "Shrub", "Wildflower", etc., "confidence": 0-100 integer, "isNative": true/false (native to Florida), "description": "One sentence", "care": "One care tip for Tampa Bay" or null for insects, "bloom": ["Spring","Summer","Fall","Winter","Year-round"] or null, "season": ["Spring","Summer","Fall","Winter","Year-round"] or null (for insects) }
Return ONLY the JSON array, no other text.` },
          ],
        }],
      }),
    })
```

- [ ] **Step 2: Commit**

```bash
git add react-app/api/identify-species.ts
git commit -m "feat: improve species ID prompt with guidelines and optional user hints"
```

---

### Task 2: ViewfinderOverlay Component (Camera Photos)

**Files:**
- Create: `react-app/src/components/capture/ViewfinderOverlay.tsx`

- [ ] **Step 1: Create the ViewfinderOverlay component**

Create `react-app/src/components/capture/ViewfinderOverlay.tsx`:

```tsx
interface ViewfinderOverlayProps {
  className?: string
}

export default function ViewfinderOverlay({ className = '' }: ViewfinderOverlayProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Darkened edges using 4 overlay strips around a center cutout */}
      {/* Center box is 70% width and 70% height, centered */}
      <div className="absolute inset-0">
        {/* Top strip */}
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/40" />
        {/* Bottom strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/40" />
        {/* Left strip */}
        <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/40" />
        {/* Right strip */}
        <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/40" />
        {/* Center cutout border */}
        <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border-2 border-white/60 rounded-lg" />
      </div>
      {/* Label */}
      <div className="absolute bottom-[8%] left-0 right-0 text-center">
        <span className="text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
          Center your plant
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add react-app/src/components/capture/ViewfinderOverlay.tsx
git commit -m "feat: add ViewfinderOverlay component for camera photo guidance"
```

---

### Task 3: ImageCropper Component (Gallery Photos)

**Files:**
- Create: `react-app/src/components/capture/ImageCropper.tsx`

- [ ] **Step 1: Create the ImageCropper component**

Create `react-app/src/components/capture/ImageCropper.tsx`. This component shows the image with a fixed viewfinder box, letting the user drag and zoom the image behind it. On "done," it crops to the viewfinder area.

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
  imageDataUrl: string
  onCrop: (croppedCanvas: HTMLCanvasElement) => void
  onCancel: () => void
}

export default function ImageCropper({ imageDataUrl, onCrop, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.width, h: img.height })
      // Fit image so the shorter side fills the container
      if (containerRef.current) {
        const container = containerRef.current.getBoundingClientRect()
        const scaleX = container.width / img.width
        const scaleY = container.height / img.height
        setScale(Math.max(scaleX, scaleY))
      }
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [offset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  function handleZoom(delta: number) {
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)))
  }

  function handleCrop() {
    if (!imgRef.current || !containerRef.current) return
    const container = containerRef.current.getBoundingClientRect()

    // The viewfinder box is 70% centered
    const boxLeft = container.width * 0.15
    const boxTop = container.height * 0.15
    const boxWidth = container.width * 0.7
    const boxHeight = container.height * 0.7

    // Calculate which part of the original image is in the viewfinder
    const imgDisplayW = imgSize.w * scale
    const imgDisplayH = imgSize.h * scale
    const imgLeft = (container.width - imgDisplayW) / 2 + offset.x
    const imgTop = (container.height - imgDisplayH) / 2 + offset.y

    const srcX = (boxLeft - imgLeft) / scale
    const srcY = (boxTop - imgTop) / scale
    const srcW = boxWidth / scale
    const srcH = boxHeight / scale

    const canvas = document.createElement('canvas')
    const max = 900
    let outW = srcW, outH = srcH
    if (outW > outH) { if (outW > max) { outH = outH * max / outW; outW = max } }
    else { if (outH > max) { outW = outW * max / outH; outH = max } }
    canvas.width = outW
    canvas.height = outH

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    onCrop(canvas)
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] bg-black rounded-[--radius-card] overflow-hidden touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {imgSize.w > 0 && (
          <img
            src={imageDataUrl}
            alt=""
            className="absolute pointer-events-none"
            style={{
              width: imgSize.w * scale,
              height: imgSize.h * scale,
              left: `calc(50% - ${(imgSize.w * scale) / 2 - offset.x}px)`,
              top: `calc(50% - ${(imgSize.h * scale) / 2 - offset.y}px)`,
            }}
            draggable={false}
          />
        )}
        {/* Viewfinder overlay — same layout as ViewfinderOverlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/50" />
          <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/50" />
          <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/50" />
          <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/50" />
          <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border-2 border-white/70 rounded-lg" />
        </div>
        <div className="absolute bottom-[8%] left-0 right-0 text-center pointer-events-none">
          <span className="text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
            Drag to position
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => handleZoom(-0.15)} className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center text-ink-mid">
          <ZoomOut size={18} />
        </button>
        <div className="w-20 text-center text-xs text-ink-light">{Math.round(scale * 100)}%</div>
        <button onClick={() => handleZoom(0.15)} className="w-11 h-11 rounded-full bg-cream-dark flex items-center justify-center text-ink-mid">
          <ZoomIn size={18} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 h-11 rounded-md border border-cream-dark text-ink text-sm font-medium">
          Cancel
        </button>
        <button onClick={handleCrop} className="flex-1 h-11 rounded-md bg-primary text-white text-sm font-medium">
          Use this crop
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add react-app/src/components/capture/ImageCropper.tsx
git commit -m "feat: add ImageCropper component for gallery photo positioning"
```

---

### Task 4: Hint Pills UI in CaptureSheet

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Add hint state variables**

In `react-app/src/components/capture/CaptureSheet.tsx`, add state variables after the existing state declarations (after line 69):

```typescript
  const [growthForm, setGrowthForm] = useState<string | null>(null)
  const [lifeStage, setLifeStage] = useState<string | null>(null)
  const [partPhotographed, setPartPhotographed] = useState<string | null>(null)
```

- [ ] **Step 2: Add hint constants**

Add constants at the top of the file, after the `friendlyError` function (after line 31):

```typescript
const GROWTH_FORMS = ['Tree', 'Shrub', 'Vine', 'Wildflower', 'Grass/Sedge', 'Fern', 'Palm'] as const
const LIFE_STAGES = ['Seedling', 'Mature', 'Dormant', 'In bloom', 'Fruiting'] as const
const PARTS_PHOTOGRAPHED = ['Whole plant', 'Leaves', 'Flower', 'Bark', 'Fruit/seed'] as const
```

- [ ] **Step 3: Reset hints in the reset function**

Update the `reset` callback (line 71) to also reset hint state. Add these lines inside the reset function body:

```typescript
    setGrowthForm(null)
    setLifeStage(null)
    setPartPhotographed(null)
```

- [ ] **Step 4: Pass hints to the identify API call**

In the `handleIdentify` function, update the `resilientFetch` call (around line 152-156) to include hints in the request body:

Replace:
```typescript
        body: JSON.stringify({ imageUrl: tempUrl }),
```

With:
```typescript
        body: JSON.stringify({
          imageUrl: tempUrl,
          hints: (growthForm || lifeStage || partPhotographed) ? {
            growthForm: growthForm ?? undefined,
            lifeStage: lifeStage ?? undefined,
            partPhotographed: partPhotographed ?? undefined,
          } : undefined,
        }),
```

- [ ] **Step 5: Add the HintPills inline component**

Add a helper component inside the file, before the `export default function CaptureSheet` line:

```tsx
function HintPills({ label, options, value, onChange }: {
  label: string
  options: readonly string[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <div>
      <p className="text-[10px] text-ink-light uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} type="button"
            onClick={() => onChange(value === opt ? null : opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              value === opt ? 'bg-sage text-white' : 'bg-cream-dark text-ink-mid'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add hint pills to the photo screen JSX**

Find the `{step === 'photo' && (` section that shows the "Identify species" button (around line 328-332). Replace it with:

```tsx
          {step === 'photo' && (
            <div className="space-y-3 mt-3">
              <div className="space-y-2.5">
                <HintPills label="What is it?" options={GROWTH_FORMS} value={growthForm} onChange={setGrowthForm} />
                <HintPills label="Life stage" options={LIFE_STAGES} value={lifeStage} onChange={setLifeStage} />
                <HintPills label="Photographing" options={PARTS_PHOTOGRAPHED} value={partPhotographed} onChange={setPartPhotographed} />
              </div>
              <Button onClick={handleIdentify} className="w-full" size="lg">
                <Leaf size={20} className="mr-2" /> Identify species
              </Button>
            </div>
          )}
```

- [ ] **Step 7: Commit**

```bash
git add react-app/src/components/capture/CaptureSheet.tsx
git commit -m "feat: add optional hint pills for species identification"
```

---

### Task 5: Viewfinder Overlay + Gallery Cropper in CaptureSheet

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Add imports for ViewfinderOverlay and ImageCropper**

At the top of `CaptureSheet.tsx`, add imports after the existing component imports:

```typescript
import ViewfinderOverlay from './ViewfinderOverlay'
import ImageCropper from './ImageCropper'
```

- [ ] **Step 2: Add state for gallery cropping**

Add state after the existing state variables:

```typescript
  const [galleryDataUrl, setGalleryDataUrl] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)
```

- [ ] **Step 3: Reset gallery state in the reset function**

Add inside the `reset` callback:

```typescript
    setGalleryDataUrl(null)
    setIsCropping(false)
```

- [ ] **Step 4: Update handlePhoto to detect gallery uploads and show cropper**

The current `handlePhoto` function draws the image directly to the canvas. We need to distinguish camera vs. gallery. Camera inputs have `capture` attribute, gallery inputs don't. However, both fire the same handler. We can detect by checking which input triggered it.

Replace the `handlePhoto` function with:

```typescript
  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type && !file.type.startsWith('image/')) return

    const isGallery = event.target.id === 'capture-gallery'

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (isGallery) {
        // Gallery: show cropper
        setGalleryDataUrl(dataUrl)
        setIsCropping(true)
      } else {
        // Camera: draw directly to canvas
        drawImageToCanvas(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  function drawImageToCanvas(dataUrl: string) {
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
      setIsCropping(false)
      setGalleryDataUrl(null)
    }
    img.src = dataUrl
  }
```

- [ ] **Step 5: Add a handler for when the cropper finishes**

Add after the `drawImageToCanvas` function:

```typescript
  function handleCropDone(croppedCanvas: HTMLCanvasElement) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = croppedCanvas.width
    canvas.height = croppedCanvas.height
    ctx.drawImage(croppedCanvas, 0, 0)
    setHasImage(true)
    setResults([])
    setError(null)
    setIsCropping(false)
    setGalleryDataUrl(null)
  }
```

- [ ] **Step 6: Add the ImageCropper to the JSX**

After the photo buttons section and before the `{hasImage && step !== 'saving'` section, add:

```tsx
        {isCropping && galleryDataUrl && (
          <ImageCropper
            imageDataUrl={galleryDataUrl}
            onCrop={handleCropDone}
            onCancel={() => { setIsCropping(false); setGalleryDataUrl(null) }}
          />
        )}
```

- [ ] **Step 7: Add ViewfinderOverlay to the camera photo preview**

Find the canvas display section (the `<div className="relative">` wrapping the canvas, around line 322). Add the ViewfinderOverlay inside that relative div, after the canvas and before the remove button:

```tsx
            {step === 'photo' && <ViewfinderOverlay />}
```

So the structure becomes:
```tsx
          <div className="relative">
            <canvas ref={canvasRef} className="w-full rounded-[--radius-card]" />
            {step === 'photo' && <ViewfinderOverlay />}
            <button onClick={removeImage} className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
```

- [ ] **Step 8: Hide camera photo section while cropping**

Update the condition for the camera photo display section. The current condition is:

```tsx
        <div className={hasImage && step !== 'saving' ? 'space-y-4' : 'hidden'}>
```

Change to:

```tsx
        <div className={hasImage && step !== 'saving' && !isCropping ? 'space-y-4' : 'hidden'}>
```

- [ ] **Step 9: Commit**

```bash
git add react-app/src/components/capture/CaptureSheet.tsx
git commit -m "feat: add viewfinder overlay for camera and image cropper for gallery"
```

---

### Task 6: Manual Entry with Photo in CaptureSheet

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Add manual entry state**

Add state variables after the existing state:

```typescript
  const [manualMode, setManualMode] = useState(false)
  const [manualCommon, setManualCommon] = useState('')
  const [manualScientific, setManualScientific] = useState('')
```

- [ ] **Step 2: Reset manual state in the reset function**

Add inside the `reset` callback:

```typescript
    setManualMode(false)
    setManualCommon('')
    setManualScientific('')
```

- [ ] **Step 3: Add the manual save handler**

Add a new function for saving manually-entered species with the photo:

```typescript
  async function handleManualSave(target: 'garden' | 'wishlist') {
    if (!canvasRef.current || !manualCommon.trim()) return

    if (target === 'wishlist') {
      setShowSpottedPrompt(true)
      return
    }
    setStep('saving')

    try {
      const imageUrl = await uploadToStorage(canvasRef.current, 0.82, '')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const common = manualCommon.trim()
      const scientific = manualScientific.trim() || null
      const nativeMatch = matchNative(common, scientific ?? '')
      const finalCommon = nativeMatch?.name || common
      const finalScientific = scientific || nativeMatch?.scientific || null
      const finalCategory = nativeMatch?.type || ''
      const autoTags: string[] = []
      if (finalCategory && (PRESET_TAGS as readonly string[]).includes(finalCategory)) {
        autoTags.push(finalCategory)
      }

      const inserted = await insertItem({
        user_id: user.id,
        common: finalCommon,
        scientific: finalScientific,
        type: 'plant' as const,
        category: finalCategory,
        confidence: null,
        description: null,
        care: null,
        bloom: nativeMatch?.bloom || null,
        season: null,
        is_native: !!nativeMatch,
        source: 'Manual',
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
        nickname: null,
        propagation_advice: null,
      })

      if (!inserted) throw new Error('Failed to save')
      toast.success(`${finalCommon} added to your garden`)

      if (inserted.type === 'plant') {
        generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category)
      }

      handleClose()
    } catch (err: any) {
      toast.error('Error saving: ' + err.message)
      setStep('results')
    }
  }

  async function handleManualSaveToWishlist() {
    if (!canvasRef.current || !manualCommon.trim()) return
    setStep('saving')
    setShowSpottedPrompt(false)

    try {
      const imageUrl = await uploadToStorage(canvasRef.current, 0.82, '')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const common = manualCommon.trim()
      const scientific = manualScientific.trim() || null
      const nativeMatch = matchNative(common, scientific ?? '')

      await addToWishlist({
        user_id: user.id,
        common: nativeMatch?.name || common,
        scientific: scientific || nativeMatch?.scientific || null,
        type: 'plant',
        category: nativeMatch?.type || '',
        confidence: null,
        description: null,
        image_url: imageUrl,
        spotted_at: spottedAt.trim() || null,
        notes: notes,
        is_native: !!nativeMatch,
        bloom: nativeMatch?.bloom || null,
        season: null,
        care_profile: null,
        suggested_zones: null,
        sun_needs: null,
        soil_needs: null,
        moisture_needs: null,
        source: 'Manual',
        propagation_advice: null,
      })

      toast.success(`${nativeMatch?.name || common} saved as a friend of the garden`)
      handleClose()
    } catch (err: any) {
      toast.error('Error saving: ' + err.message)
      setStep('results')
    }
  }
```

- [ ] **Step 4: Add "I know what this is" button on the photo screen**

Find the hint pills + identify button section added in Task 4 Step 6. Add a "I know what this is" link below the Identify button, inside the same `{step === 'photo' && (` block:

After the `</Button>` for "Identify species", add:

```tsx
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full text-center text-xs text-ink-light hover:text-ink-mid py-1"
              >
                I know what this is
              </button>
```

- [ ] **Step 5: Add manual entry form that replaces hints when active**

Wrap the hints + identify section in a condition so it only shows when `!manualMode`. Then add the manual form for when `manualMode` is true. The full replacement for the `{step === 'photo' && (` block becomes:

```tsx
          {step === 'photo' && !manualMode && (
            <div className="space-y-3 mt-3">
              <div className="space-y-2.5">
                <HintPills label="What is it?" options={GROWTH_FORMS} value={growthForm} onChange={setGrowthForm} />
                <HintPills label="Life stage" options={LIFE_STAGES} value={lifeStage} onChange={setLifeStage} />
                <HintPills label="Photographing" options={PARTS_PHOTOGRAPHED} value={partPhotographed} onChange={setPartPhotographed} />
              </div>
              <Button onClick={handleIdentify} className="w-full" size="lg">
                <Leaf size={20} className="mr-2" /> Identify species
              </Button>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full text-center text-xs text-ink-light hover:text-ink-mid py-1"
              >
                I know what this is
              </button>
            </div>
          )}

          {step === 'photo' && manualMode && (
            <div className="space-y-3 mt-3">
              <div className="space-y-2">
                <Input
                  value={manualCommon}
                  onChange={e => setManualCommon(e.target.value)}
                  placeholder="Common name *"
                  className="text-sm"
                  autoFocus
                />
                <Input
                  value={manualScientific}
                  onChange={e => setManualScientific(e.target.value)}
                  placeholder="Scientific name (optional)"
                  className="text-sm"
                />
              </div>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} />
              <div className="flex gap-3">
                <Button onClick={() => handleManualSave('garden')} className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                  <Leaf size={18} className="mr-2" /> Add to Garden
                </Button>
                <Button onClick={() => handleManualSave('wishlist')} variant="outline" className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                  <Heart size={18} className="mr-2" /> Save as Friend
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="w-full text-center text-xs text-ink-light hover:text-ink-mid py-1"
              >
                Back to identification
              </button>
            </div>
          )}
```

- [ ] **Step 6: Add "Not right? Enter manually" on the results screen**

Find the results section (`{step === 'results' && results.length > 0 && !showSpottedPrompt && (`). Add a manual entry link and manual form at the end. Replace the entire results block:

```tsx
        {step === 'results' && results.length > 0 && !showSpottedPrompt && !manualMode && (
          <div className="space-y-3 mt-4">
            {results.map((r, i) => (
              <IdResultCard key={i} result={r} selected={selectedIndex === i} onSelect={() => setSelectedIndex(i)} />
            ))}
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} className="mt-3" />
            <div className="flex gap-3 mt-3">
              <Button onClick={() => handleSave('garden')} className="flex-1" size="lg">
                <Leaf size={18} className="mr-2" /> Add to Garden
              </Button>
              <Button onClick={() => handleSave('wishlist')} variant="outline" className="flex-1" size="lg">
                <Heart size={18} className="mr-2" /> Save as Friend
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="w-full text-center text-xs text-ink-light hover:text-ink-mid py-2"
            >
              Not right? Enter name manually
            </button>
          </div>
        )}

        {step === 'results' && manualMode && !showSpottedPrompt && (
          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <Input
                value={manualCommon}
                onChange={e => setManualCommon(e.target.value)}
                placeholder="Common name *"
                className="text-sm"
                autoFocus
              />
              <Input
                value={manualScientific}
                onChange={e => setManualScientific(e.target.value)}
                placeholder="Scientific name (optional)"
                className="text-sm"
              />
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} />
            <div className="flex gap-3">
              <Button onClick={() => handleManualSave('garden')} className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                <Leaf size={18} className="mr-2" /> Add to Garden
              </Button>
              <Button onClick={() => handleManualSave('wishlist')} variant="outline" className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                <Heart size={18} className="mr-2" /> Save as Friend
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="w-full text-center text-xs text-ink-light hover:text-ink-mid py-1"
            >
              Back to results
            </button>
          </div>
        )}
```

- [ ] **Step 7: Update the spotted prompt to work with manual mode**

The `showSpottedPrompt` section needs to call the right save function. Find the spotted prompt section and update the save button to call the right handler:

Replace:
```tsx
            <Button onClick={handleSaveToWishlist} className="w-full" size="lg">
```

With:
```tsx
            <Button onClick={manualMode ? handleManualSaveToWishlist : handleSaveToWishlist} className="w-full" size="lg">
```

- [ ] **Step 8: Update the SheetTitle to reflect manual mode**

Find the `<SheetTitle>` section. Add a line for manual mode:

```tsx
          <SheetTitle className="font-display">
            {step === 'photo' && !manualMode && 'Capture a Species'}
            {step === 'photo' && manualMode && 'Name This Species'}
            {step === 'identifying' && 'Identifying...'}
            {step === 'results' && !manualMode && 'Species Identified'}
            {step === 'results' && manualMode && 'Name This Species'}
            {step === 'saving' && 'Saving...'}
          </SheetTitle>
```

- [ ] **Step 9: Commit**

```bash
git add react-app/src/components/capture/CaptureSheet.tsx
git commit -m "feat: add manual entry with photo as ID fallback"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PROJECT-STATE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add to the React App section:
- `identify-species` API now accepts optional `hints` object with `growthForm`, `lifeStage`, `partPhotographed`
- CaptureSheet has a viewfinder overlay for camera photos and an interactive cropper for gallery photos
- Manual entry with photo: "I know what this is" on photo screen + "Not right? Enter manually" on results screen
- Manual entries with photos get background care profile generation, same as AI-identified plants

- [ ] **Step 2: Update PROJECT-STATE.md**

Add new components to the listing:
- `ViewfinderOverlay.tsx` — CSS overlay with darkened edges guiding photo framing
- `ImageCropper.tsx` — interactive drag/zoom crop for gallery photos

Note the improved identification prompt and hint system.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md PROJECT-STATE.md
git commit -m "docs: document identification improvements and manual entry with photo"
```
