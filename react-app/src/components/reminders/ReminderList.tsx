import { useState } from 'react'
import { ChevronDown, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Reminder } from '@/types'

interface ReminderListProps {
  reminders: Reminder[]
  loading: boolean
  isStale: boolean
  onToggle: (id: string, done: boolean) => void
  onAddCustom: (title: string) => void
  onDelete: (id: string) => void
  onGenerate: () => void
}

export default function ReminderList({ reminders, loading, isStale, onToggle, onAddCustom, onDelete, onGenerate }: ReminderListProps) {
  const [expanded, setExpanded] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  const sorted = [...reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return 0
  })

  function handleAdd() {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onAddCustom(trimmed)
    setNewTitle('')
  }

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <h2 className="font-display text-sm font-medium text-primary">{monthName} in Your Garden</h2>
        <ChevronDown size={18} className={`text-ink-light transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {reminders.length === 0 && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-ink-light mb-3">No care tasks for {monthName} yet.</p>
              <Button size="sm" onClick={onGenerate} disabled={loading} className="text-xs">
                <Sparkles size={14} className="mr-1.5" /> Generate care tasks
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4 gap-2 text-sm text-ink-light">
              <Loader2 size={16} className="animate-spin" /> Generating tasks...
            </div>
          )}

          {sorted.map(r => (
            <div key={r.id} className={`flex items-start gap-3 py-1.5 ${r.done ? 'opacity-50' : ''}`}>
              <Checkbox checked={r.done} onCheckedChange={(checked) => onToggle(r.id, checked as boolean)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${r.done ? 'line-through text-ink-light' : 'text-ink'}`}>{r.title}</p>
                {r.detail && !r.done && <p className="text-xs text-ink-light mt-0.5">{r.detail}</p>}
                {r.plant && !r.done && <p className="text-xs text-sage italic mt-0.5">{r.plant}</p>}
              </div>
              {r.source === 'custom' && (
                <button onClick={() => onDelete(r.id)} className="text-ink-light hover:text-terra p-3" aria-label="Delete reminder">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {reminders.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cream-dark">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} placeholder="Add a task..." className="h-8 text-xs" />
              <button onClick={handleAdd} disabled={!newTitle.trim()} className="flex-shrink-0 w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30">
                <Plus size={16} />
              </button>
            </div>
          )}

          {isStale && reminders.length > 0 && (
            <button onClick={onGenerate} disabled={loading} className="w-full text-xs text-sage hover:text-primary py-2.5">
              <Sparkles size={12} className="inline mr-1" /> Your garden has changed \u2014 refresh tasks
            </button>
          )}
        </div>
      )}
    </div>
  )
}
