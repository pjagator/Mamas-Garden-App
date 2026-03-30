import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Leaf, Bug, Heart, MapPin, Calendar, Sparkles, Sun, Droplets,
  Trash2, Pencil, Check, X
} from 'lucide-react'
import { confidenceClass } from '@/lib/constants'
import HealthTimeline from '@/components/health/HealthTimeline'
import type { InventoryItem } from '@/types'

interface ItemDetailProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onDelete: (id: string, imageUrl?: string | null) => void
  onUpdate?: (id: string, updates: Partial<InventoryItem>) => void
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | null | undefined }) {
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidenceClass(confidence)
  const colors = { high: 'bg-sage-light text-primary', mid: 'bg-amber-100 text-amber-800', low: 'bg-red-100 text-red-800' }
  return <Badge variant="secondary" className={`text-[10px] ${colors[level]} border-0`}>{confidence}% match</Badge>
}

export default function ItemDetail({ item, open, onClose, onDelete, onUpdate }: ItemDetailProps) {
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameValue, setNicknameValue] = useState('')

  if (!item) return null
  const TypeIcon = item.type === 'bug' ? Bug : Leaf
  const displayName = item.nickname ?? item.common ?? 'Unknown species'

  function startEditNickname() {
    setNicknameValue(item!.nickname ?? '')
    setEditingNickname(true)
  }

  function saveNickname() {
    const trimmed = nicknameValue.trim()
    onUpdate?.(item!.id, { nickname: trimmed || null })
    setEditingNickname(false)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setEditingNickname(false); onClose() } }}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl p-0">
        {item.image_url ? (
          <div className="relative h-56">
            <img src={item.image_url} alt={item.common ?? 'Species photo'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-cream-dark flex items-center justify-center">
            <TypeIcon size={48} className="text-ink-light/30" />
          </div>
        )}

        <div className="px-5 pb-8 -mt-6 relative">
          <SheetHeader className="mb-4">
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nicknameValue}
                  onChange={e => setNicknameValue(e.target.value)}
                  placeholder="Nickname (e.g. Front Coffee)"
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') setEditingNickname(false) }}
                />
                <button onClick={saveNickname} className="w-7 h-7 flex items-center justify-center rounded-full bg-sage-light text-primary min-h-0 min-w-0">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingNickname(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-cream-dark text-ink-light min-h-0 min-w-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <SheetTitle className="font-display text-xl text-left">{displayName}</SheetTitle>
                  {item.nickname && item.common && <p className="text-sm text-ink-mid">{item.common}</p>}
                  {item.scientific && <p className="text-sm text-ink-light italic">{item.scientific}</p>}
                </div>
                {onUpdate && (
                  <button onClick={startEditNickname} className="mt-1 w-7 h-7 flex items-center justify-center rounded-full text-ink-light hover:text-ink-mid min-h-0 min-w-0" title="Add nickname">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.is_native && (
              <Badge variant="secondary" className="bg-sage-light text-primary border-0 text-xs">
                <Heart size={12} className="mr-1" fill="currentColor" /> Native
              </Badge>
            )}
            {item.confidence && <ConfidenceBadge confidence={item.confidence} />}
            {item.health && <Badge variant="outline" className="text-xs capitalize">{item.health}</Badge>}
            {item.flowering && item.flowering !== 'no' && <Badge variant="outline" className="text-xs capitalize">{item.flowering}</Badge>}
          </div>

          <Separator className="mb-4" />

          <div className="space-y-1 mb-4">
            <InfoRow icon={TypeIcon} label="Type" value={item.category ? `${item.type === 'bug' ? 'Insect' : 'Plant'} \u2014 ${item.category}` : (item.type === 'bug' ? 'Insect' : 'Plant')} />
            <InfoRow icon={MapPin} label="Location" value={item.location} />
            <InfoRow icon={Calendar} label="Added" value={item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
            <InfoRow icon={Sparkles} label="Source" value={item.source} />
          </div>

          {item.description && <p className="text-sm text-ink-mid mb-4 leading-relaxed">{item.description}</p>}

          {item.notes && (
            <div className="bg-cream rounded-[--radius-sm] p-3 mb-4">
              <p className="text-xs text-ink-light mb-1">Notes</p>
              <p className="text-sm text-ink">{item.notes}</p>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
            </div>
          )}

          {(item.bloom?.length || item.season?.length) ? (
            <div className="mb-4">
              <p className="text-xs text-ink-light mb-1">{item.type === 'bug' ? 'Active seasons' : 'Bloom seasons'}</p>
              <div className="flex gap-1.5">
                {(item.bloom ?? item.season ?? []).map(s => <Badge key={s} variant="secondary" className="text-xs bg-cream border-0">{s}</Badge>)}
              </div>
            </div>
          ) : null}

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

          <Separator className="mb-4" />

          {item.type === 'plant' && (
            <>
              <HealthTimeline inventoryId={item.id} />
              <Separator className="my-4" />
            </>
          )}

          <Button variant="destructive" size="sm" onClick={() => onDelete(item.id, item.image_url)} className="w-full">
            <Trash2 size={16} className="mr-2" /> Remove from garden
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
