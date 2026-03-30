import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { InventoryItem } from '@/types'
import type { WeatherData } from './useWeather'

export interface PlantTip {
  common: string
  tips: string[]
}

export interface SeasonalCare {
  id: string
  month_key: string
  garden_summary: string
  plant_tips: PlantTip[]
  plant_hash: string
  created_at: string
}

function getMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function computePlantHash(items: InventoryItem[]): string {
  return items
    .filter(i => i.type === 'plant')
    .map(i => i.common ?? i.id)
    .sort()
    .join(',')
}

export function useSeasonalCare(inventory: InventoryItem[], weather: WeatherData | null) {
  const [care, setCare] = useState<SeasonalCare | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const monthKey = getMonthKey()
  const currentHash = computePlantHash(inventory)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('seasonal_care')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) console.error('seasonal_care query failed:', error)
    setCare((data?.[0] as SeasonalCare) ?? null)
    setLoading(false)
  }, [monthKey])

  useEffect(() => { load() }, [load])

  const isStale = useCallback((): boolean => {
    if (!care) return inventory.some(i => i.type === 'plant')
    return care.plant_hash !== currentHash
  }, [care, currentHash, inventory])

  const generate = useCallback(async () => {
    const plants = inventory.filter(i => i.type === 'plant')
    if (plants.length === 0) return

    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'seasonal_care',
          data: {
            month: monthName,
            year: new Date().getFullYear(),
            plants: plants.map(p => ({
              common: p.common,
              scientific: p.scientific,
              type: p.type,
              category: p.category,
              health: p.health,
              location: p.location,
            })),
            weather: weather ? {
              forecast_summary: weather.takeaway,
              monthly_rain_so_far: weather.monthlyTotal,
            } : null,
          },
        }),
      }, { timeoutMs: 30000 })

      const result = await response.json()
      if (!result.garden_summary) throw new Error('Invalid response')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('seasonal_care').delete().eq('user_id', user.id).eq('month_key', monthKey)

      const { data: inserted } = await supabase
        .from('seasonal_care')
        .insert({
          user_id: user.id,
          month_key: monthKey,
          garden_summary: result.garden_summary,
          plant_tips: result.plant_tips ?? [],
          plant_hash: currentHash,
        })
        .select()
        .single()

      if (inserted) setCare(inserted as SeasonalCare)
    } catch (err) {
      console.error('Seasonal care generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }, [inventory, weather, monthKey, currentHash])

  return { care, loading, generating, isStale, generate, refresh: load }
}
