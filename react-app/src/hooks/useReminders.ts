import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { Reminder, InventoryItem } from '@/types'

function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function computePlantHash(items: InventoryItem[]): string {
  return items.filter(i => i.type === 'plant').map(i => i.common ?? i.id).sort().join(',')
}

export function useReminders(inventory: InventoryItem[]) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const monthKey = getMonthKey()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('reminders').select('*').eq('user_id', user.id).eq('month_key', monthKey)
      .order('done', { ascending: true }).order('created_at', { ascending: true })
    if (data) setReminders(data as Reminder[])
  }, [monthKey])

  useEffect(() => {
    if (inventory.length > 0) load()
  }, [inventory, load])

  const toggle = useCallback(async (id: string, done: boolean) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done } : r))
    await supabase.from('reminders').update({ done }).eq('id', id)
  }, [])

  const addCustom = useCallback(async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('reminders').insert({ user_id: user.id, month_key: monthKey, title, source: 'custom', done: false }).select().single()
    if (data) setReminders(prev => [...prev, data as Reminder])
  }, [monthKey])

  const deleteReminder = useCallback(async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id))
    await supabase.from('reminders').delete().eq('id', id)
  }, [])

  const generate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const plants = inventory.filter(i => i.type === 'plant')
    if (!plants.length) return
    setLoading(true)
    try {
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'reminders',
          month: monthKey,
          plants: plants.map(p => ({ common: p.common, scientific: p.scientific, category: p.category })),
        }),
      }, { timeoutMs: 30000 })
      const result = await response.json()
      if (result.reminders) {
        const hash = computePlantHash(inventory)
        const toInsert = result.reminders.map((r: { icon?: string; title: string; detail?: string; plant?: string }) => ({
          user_id: user.id, month_key: monthKey, icon: r.icon ?? '', title: r.title,
          detail: r.detail ?? '', plant: r.plant ?? '', source: 'ai' as const, done: false, plant_hash: hash,
        }))
        const { data } = await supabase.from('reminders').insert(toInsert).select()
        if (data) setReminders(prev => [...prev, ...(data as Reminder[])])
      }
    } finally {
      setLoading(false)
    }
  }, [inventory, monthKey])

  const isStale = useCallback((): boolean => {
    const aiReminders = reminders.filter(r => r.source === 'ai')
    if (!aiReminders.length) return true
    const currentHash = computePlantHash(inventory)
    return aiReminders.some(r => r.plant_hash !== currentHash)
  }, [reminders, inventory])

  return { reminders, loading, toggle, addCustom, deleteReminder, generate, isStale }
}
