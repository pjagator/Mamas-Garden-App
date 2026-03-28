import { useState, useRef, useCallback } from 'react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, X, Leaf, Sparkles, ArrowRight, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { callEdgeFunction, isOnline } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { SpeciesIdResult, InventoryItem } from '@/types'

interface CaptureProps {
  userId: string
  onSave: (item: Partial<InventoryItem>) => Promise<InventoryItem | null>
  onBack: () => void
}

export function CapturePage({ userId, onSave, onBack }: CaptureProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [results, setResults] = useState<SpeciesIdResult[] | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate it's an image
    if (file.type && !file.type.startsWith('image/')) return

    setImageFile(file)
    setResults(null)
    setError('')

    // Create preview via canvas (max 900px)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const maxDim = 900
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = (h / w) * maxDim; w = maxDim }
          else { w = (w / h) * maxDim; h = maxDim }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        setImagePreview(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setResults(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const identifySpecies = useCallback(async () => {
    if (!canvasRef.current || !imageFile) return

    if (!isOnline()) {
      setError("You're offline. Species identification requires an internet connection.")
      return
    }

    setIdentifying(true)
    setError('')

    try {
      // Upload temp image
      const blob = await new Promise<Blob>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/jpeg', 0.5)
      )
      const tempPath = `${userId}/temp_${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('garden-images')
        .upload(tempPath, blob, { contentType: 'image/jpeg' })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('garden-images')
        .getPublicUrl(tempPath)

      // Call species ID edge function
      const response = await callEdgeFunction<{ identifications: SpeciesIdResult[] }>(
        'identify-species',
        { imageUrl: urlData.publicUrl },
        { timeoutMs: 30000 }
      )

      setResults(response.identifications)
      setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed')
    } finally {
      setIdentifying(false)
    }
  }, [imageFile, userId])

  const saveIdentified = useCallback(async () => {
    if (!results || !canvasRef.current) return

    setSaving(true)
    setError('')

    try {
      // Upload final image
      const blob = await new Promise<Blob>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/jpeg', 0.82)
      )
      const finalPath = `${userId}/${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('garden-images')
        .upload(finalPath, blob, { contentType: 'image/jpeg' })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from('garden-images')
        .getPublicUrl(finalPath)

      const selected = results[selectedIndex]
      await onSave({
        common: selected.common,
        scientific: selected.scientific,
        type: selected.type,
        category: selected.category,
        confidence: selected.confidence,
        description: selected.description,
        care: selected.care,
        bloom: selected.bloom,
        season: selected.season,
        is_native: selected.is_native,
        source: 'Claude AI',
        image_url: urlData.publicUrl,
        notes,
        tags: selected.category ? [selected.category] : [],
      })

      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [results, selectedIndex, notes, userId, onSave, onBack])

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Identify Species"
        subtitle="Snap a photo to identify plants and insects"
        action={
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-cream"
          >
            <X className="w-5 h-5" />
          </button>
        }
      />

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Photo capture area */}
        {!imagePreview ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 rounded-full bg-green-light/20 flex items-center justify-center mb-6">
              <Camera className="w-16 h-16 text-green-sage" />
            </div>

            <div className="flex gap-3">
              <label className="cursor-pointer">
                <Button size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Take photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <label className="cursor-pointer">
                <Button variant="secondary" size="lg">
                  <Upload className="w-5 h-5 mr-2" />
                  Gallery
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => setShowManual(!showManual)}
              className="mt-6 text-sm text-green-mid hover:text-green-deep transition-colors"
            >
              Or add manually without a photo
            </button>
          </div>
        ) : (
          <>
            {/* Image preview */}
            <div className="relative rounded-[14px] overflow-hidden shadow-md">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-[300px] object-cover"
              />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Identify button */}
            {!results && (
              <Button
                onClick={identifySpecies}
                disabled={identifying}
                className="w-full"
                size="lg"
              >
                {identifying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                    Identifying species...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Identify this species
                  </span>
                )}
              </Button>
            )}

            {/* Results */}
            {results && (
              <div className="space-y-3 animate-slide-up">
                <h3 className="font-display text-lg text-green-deep">
                  Species identified
                </h3>

                {results.map((result, i) => (
                  <Card
                    key={i}
                    className={cn(
                      'cursor-pointer transition-all duration-200',
                      selectedIndex === i
                        ? 'ring-2 ring-green-deep shadow-md'
                        : 'opacity-70 hover:opacity-100'
                    )}
                    onClick={() => setSelectedIndex(i)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-display font-semibold text-green-deep">
                            {result.common}
                          </h4>
                          <p className="text-xs text-ink-light italic">
                            {result.scientific}
                          </p>
                        </div>
                        <Badge
                          variant="confidence"
                          className={cn(
                            'text-[11px]',
                            result.confidence >= 80
                              ? 'bg-green-mid'
                              : result.confidence >= 50
                              ? 'bg-terra-light'
                              : 'bg-ink-light'
                          )}
                        >
                          {result.confidence}%
                        </Badge>
                      </div>

                      <p className="text-sm text-ink-mid mb-2">
                        {result.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {result.is_native && (
                          <Badge variant="native" className="text-[10px]">
                            <Leaf className="w-3 h-3 mr-0.5" /> Native
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {result.category}
                        </Badge>
                        {result.bloom?.map((s) => (
                          <Badge key={s} variant="default" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Add notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Where in the garden, observations..."
                  />
                </div>

                {/* Save buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={saveIdentified}
                    disabled={saving}
                    className="flex-1"
                    size="lg"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Save to Garden
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                  <Button variant="secondary" size="lg">
                    <Heart className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-terra/10 text-terra text-sm rounded-[10px] p-3 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
