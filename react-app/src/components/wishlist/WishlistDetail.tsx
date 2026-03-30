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
      ).then(result => { setSuggestion(result); setLoadingSuggestion(false) })
    }
  }, [item?.id, open])

  if (!item) return null
  const TypeIcon = item.type === 'bug' ? Bug : Leaf

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl p-0">
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

          {item.spotted_at && (
            <div className="flex items-center gap-2 mb-4 text-sm text-ink-mid">
              <MapPin size={14} className="text-sage" /> Spotted at {item.spotted_at}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 text-sm text-ink-mid">
            <Calendar size={14} className="text-sage" />
            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          {item.description && <p className="text-sm text-ink-mid mb-4 leading-relaxed">{item.description}</p>}

          {item.notes && (
            <div className="bg-cream/60 rounded-[--radius-sm] p-3 mb-4 border border-dashed border-sage/30">
              <p className="text-xs text-ink-light mb-1">Notes</p>
              <p className="text-sm text-ink">{item.notes}</p>
            </div>
          )}

          <Separator className="mb-4" />

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
