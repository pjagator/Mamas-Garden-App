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
        nickname: null,
        propagation_advice: null,
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
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl">
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
