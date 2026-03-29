import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { HealthLog, HealthStatus, FloweringStatus, Diagnosis } from '@/types'

const PAGE_SIZE = 10

export function useHealthLogs(inventoryId: string | null) {
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (offset = 0) => {
    if (!inventoryId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('logged_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error && data) {
      if (offset === 0) {
        setLogs(data as HealthLog[])
      } else {
        setLogs(prev => [...prev, ...(data as HealthLog[])])
      }
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [inventoryId])

  const loadMore = useCallback(() => {
    load(logs.length)
  }, [load, logs.length])

  const save = useCallback(async (
    health: HealthStatus,
    flowering: FloweringStatus | null,
    notes: string,
    imageUrl: string | null
  ): Promise<HealthLog | null> => {
    if (!inventoryId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('health_logs')
      .insert({
        user_id: user.id,
        inventory_id: inventoryId,
        health,
        flowering,
        notes,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (error || !data) return null

    await supabase.from('inventory')
      .update({ health, flowering })
      .eq('id', inventoryId)
      .eq('user_id', user.id)

    setLogs(prev => [data as HealthLog, ...prev])
    return data as HealthLog
  }, [inventoryId])

  const diagnose = useCallback(async (
    plant: { common: string | null; scientific: string | null },
    health: HealthStatus,
    imageUrl: string
  ): Promise<Diagnosis | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'diagnosis',
          data: { common: plant.common, scientific: plant.scientific, health, imageUrl },
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      if (result.diagnosis) {
        if (logs.length > 0) {
          await supabase.from('health_logs')
            .update({ diagnosis: result.diagnosis })
            .eq('id', logs[0].id)
          setLogs(prev => prev.map((l, i) => i === 0 ? { ...l, diagnosis: result.diagnosis } : l))
        }
        return result.diagnosis as Diagnosis
      }
      return null
    } catch {
      return null
    }
  }, [logs])

  return { logs, loading, hasMore, load, loadMore, save, diagnose }
}
