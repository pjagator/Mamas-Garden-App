import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { WishlistItem, GardenBed } from '@/types'

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('wishlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setItems(data as WishlistItem[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addItem = useCallback(async (entry: Omit<WishlistItem, 'id' | 'created_at'>): Promise<WishlistItem | null> => {
    const { data, error } = await supabase.from('wishlist').insert(entry).select().single()
    if (error || !data) return null
    const item = data as WishlistItem
    setItems(prev => [item, ...prev])
    return item
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<WishlistItem>) => {
    const { data } = await supabase.from('wishlist').update(updates).eq('id', id).select().single()
    if (data) setItems(prev => prev.map(i => i.id === id ? data as WishlistItem : i))
  }, [])

  const suggestPlacement = useCallback(async (
    plant: { common: string | null; scientific: string | null; category: string | null; type: string | null },
    zones: GardenBed[]
  ): Promise<{ suggestion: string; best_zones: string[]; avoid_zones: string[] } | null> => {
    if (!zones.length) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'suggest_placement',
          data: {
            plant: { common: plant.common, scientific: plant.scientific, category: plant.category, type: plant.type },
            zones: zones.map(z => ({ name: z.name, sun_exposure: z.sun_exposure, soil_type: z.soil_type, moisture_level: z.moisture_level, wind_exposure: z.wind_exposure })),
          },
        }),
      }, { timeoutMs: 30000 })
      const result = await response.json()
      return result.placement ?? null
    } catch { return null }
  }, [])

  const graduateToGarden = useCallback(async (wishlistId: string): Promise<boolean> => {
    const item = items.find(i => i.id === wishlistId)
    if (!item) return false
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('inventory').insert({
      user_id: user.id, common: item.common, scientific: item.scientific, type: item.type,
      category: item.category, confidence: item.confidence, description: item.description,
      image_url: item.image_url, notes: item.notes, is_native: item.is_native,
      bloom: item.bloom, season: item.season, care_profile: item.care_profile,
      source: item.source, tags: [], location: '',
    })
    if (error) return false
    await supabase.from('wishlist').delete().eq('id', wishlistId)
    setItems(prev => prev.filter(i => i.id !== wishlistId))
    return true
  }, [items])

  return { items, loading, addItem, deleteItem, updateItem, suggestPlacement, graduateToGarden, refresh: load }
}
