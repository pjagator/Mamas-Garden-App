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
          <div className="space-y-2">
            <p className="text-xs text-ink-light font-medium">Health status</p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_OPTIONS.map(h => (
                <button
                  key={h.value}
                  onClick={() => setHealth(h.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border-2 transition-colors ${
                    health === h.value ? 'border-primary bg-sage-light/50 text-primary' : 'border-cream-dark text-ink-mid'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${h.color}`} />
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {item.type === 'plant' && (
            <div className="space-y-2">
              <p className="text-xs text-ink-light font-medium">Flowering</p>
              <div className="flex flex-wrap gap-2">
                {FLOWERING_OPTIONS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFlowering(f.value)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border-2 transition-colors ${
                      flowering === f.value ? 'border-primary bg-sage-light/50 text-primary' : 'border-cream-dark text-ink-mid'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations (optional)..." rows={2} />

          <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
            {saving ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</> : 'Log Health Check'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
