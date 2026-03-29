import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Download, Trash2, LogOut, BookOpen, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useInventory } from '@/hooks/useInventory'
import { NATIVE_PLANTS } from '@/lib/constants'
import type { InventoryItem } from '@/types'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

function NativePlantsList() {
  return (
    <div className="space-y-2">
      {NATIVE_PLANTS.map(p => (
        <div key={p.name} className="flex items-start gap-3 py-1.5">
          <Leaf size={14} className="text-sage mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">{p.name}</p>
            <p className="text-xs text-ink-light italic">{p.scientific}</p>
            <p className="text-[10px] text-ink-light mt-0.5">{p.type} · Blooms: {p.bloom.join(', ')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { user, signOut } = useAuth()
  const { items, refresh } = useInventory()
  const [showNatives, setShowNatives] = useState(false)

  function exportJSON() {
    const data = { version: 1, exported: new Date().toISOString(), entries: items }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `garden-export-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Garden data exported as JSON')
  }

  function exportCSV() {
    const headers = ['Common Name', 'Scientific Name', 'Type', 'Category', 'Date', 'Confidence', 'Bloom Seasons', 'Active Seasons', 'Native', 'Notes']
    const rows = items.map((i: InventoryItem) => [
      i.common ?? '', i.scientific ?? '', i.type ?? '', i.category ?? '',
      i.date ? new Date(i.date).toLocaleDateString() : '', i.confidence?.toString() ?? '',
      (i.bloom ?? []).join('; '), (i.season ?? []).join('; '), i.is_native ? 'Yes' : 'No', (i.notes ?? '').replace(/"/g, '""'),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `garden-export-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Garden data exported as CSV')
  }

  async function handleClearAll() {
    if (!window.confirm('Delete ALL garden data? This cannot be undone.')) return
    if (!window.confirm('Are you absolutely sure?')) return
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    await supabase.from('health_logs').delete().eq('user_id', u.id)
    await supabase.from('garden_placements').delete().eq('user_id', u.id)
    await supabase.from('garden_beds').delete().eq('user_id', u.id)
    await supabase.from('garden_maps').delete().eq('user_id', u.id)
    await supabase.from('reminders').delete().eq('user_id', u.id)
    await supabase.from('wishlist').delete().eq('user_id', u.id)
    await supabase.from('inventory').delete().eq('user_id', u.id)
    localStorage.removeItem('garden-inventory-cache')
    refresh()
    toast.success('All garden data cleared')
    onClose()
  }

  async function handleSignOut() { await signOut(); onClose() }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4"><SheetTitle className="font-display">Settings</SheetTitle></SheetHeader>
        <div className="space-y-5">
          <div className="bg-cream rounded-[--radius-sm] p-3">
            <p className="text-xs text-ink-light">Signed in as</p>
            <p className="text-sm text-ink font-medium">{user?.email}</p>
          </div>
          <div className="bg-cream rounded-[--radius-sm] p-3">
            <p className="text-xs text-ink-light">Species identification</p>
            <p className="text-sm text-ink">Powered by Claude AI — no API key needed</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs text-ink-light font-medium">Export garden data</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportJSON} className="flex-1"><Download size={14} className="mr-1.5" /> JSON</Button>
              <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1"><Download size={14} className="mr-1.5" /> CSV</Button>
            </div>
          </div>
          <Separator />
          <div>
            <Button variant="outline" size="sm" onClick={() => setShowNatives(!showNatives)} className="w-full">
              <BookOpen size={14} className="mr-1.5" /> {showNatives ? 'Hide' : 'Browse'} native plant database
            </Button>
            {showNatives && <div className="mt-3 max-h-60 overflow-y-auto"><NativePlantsList /></div>}
          </div>
          <Separator />
          <div className="space-y-2">
            <Button variant="destructive" size="sm" onClick={handleClearAll} className="w-full"><Trash2 size={14} className="mr-1.5" /> Clear all garden data</Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full text-ink-mid"><LogOut size={14} className="mr-1.5" /> Sign out</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
