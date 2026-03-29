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
      body: JSON.stringify({ action: 'care_profile', data: { common, scientific, type, category } }),
    })
    const result = await response.json()
    if (result.care_profile) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('inventory').update({ care_profile: result.care_profile }).eq('id', itemId).eq('user_id', user!.id)
    }
  } catch (err) {
    console.error('Care profile generation failed:', err)
  }
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

  function handleClose() { reset(); onClose() }

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
          contentType: 'image/jpeg', upsert: prefix.startsWith('temp'),
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
    if (!canvasRef.current || !results.length) return
    setStep('saving')

    try {
      const result = results[selectedIndex]
      const imageUrl = await uploadToStorage(canvasRef.current, 0.82, '')

      const autoTags: string[] = []
      if (result.category && (PRESET_TAGS as readonly string[]).includes(result.category)) {
        autoTags.push(result.category)
      }

      if (target === 'wishlist') {
        toast.info('Wishlist saving coming in a future update — saved to garden instead')
      }

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

      if (inserted.type === 'plant') {
        generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category)
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
          </div>
        )}

        {hasImage && step !== 'saving' && (
          <div className="space-y-4">
            <div className="relative">
              <canvas ref={canvasRef} className="w-full rounded-[--radius-card]" />
              <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center min-h-0 min-w-0">
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

        {!hasImage && <canvas ref={canvasRef} className="hidden" />}

        {step === 'identifying' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-ink-mid">Analyzing with Claude AI...</p>
          </div>
        )}

        {error && (
          <div className="rounded-[--radius-card] border-2 border-terra p-4 mt-4">
            <p className="text-sm font-medium text-terra">{error.title}</p>
            <p className="text-xs text-ink-mid mt-1">{error.message}</p>
          </div>
        )}

        {step === 'results' && results.length > 0 && (
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
          </div>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-ink-mid">Saving to your garden...</p>
          </div>
        )}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </SheetContent>
    </Sheet>
  )
}
