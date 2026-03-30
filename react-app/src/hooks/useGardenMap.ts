import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { GardenMap, GardenBed, GardenPlacement, BedShape } from '@/types'

export function useGardenMap() {
  const [map, setMap] = useState<GardenMap | null>(null)
  const [beds, setBeds] = useState<GardenBed[]>([])
  const [placements, setPlacements] = useState<GardenPlacement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: maps, error: mapsErr } = await supabase
      .from('garden_maps').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1)

    if (mapsErr) console.error('garden_maps query failed:', mapsErr)

    const currentMap = maps?.[0] as GardenMap | undefined
    setMap(currentMap ?? null)

    if (currentMap) {
      const { data: bedsData, error: bedsErr } = await supabase
        .from('garden_beds').select('*').eq('map_id', currentMap.id)
        .order('created_at', { ascending: true })
      if (bedsErr) console.error('garden_beds query failed:', bedsErr)
      setBeds((bedsData as GardenBed[]) ?? [])

      const { data: placementsData, error: placementsErr } = await supabase
        .from('garden_placements').select('*').eq('map_id', currentMap.id)
      if (placementsErr) console.error('garden_placements query failed:', placementsErr)
      setPlacements((placementsData as GardenPlacement[]) ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const createMap = useCallback(async (imageUrl: string, width: number, height: number): Promise<GardenMap | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('garden_maps').insert({ user_id: user.id, name: 'My Garden', image_url: imageUrl, width, height })
      .select().single()
    if (error || !data) return null
    const newMap = data as GardenMap
    setMap(newMap)
    return newMap
  }, [])

  const updateMap = useCallback(async (updates: Partial<Pick<GardenMap, 'name' | 'image_url' | 'width' | 'height'>>) => {
    if (!map) return
    const { data } = await supabase.from('garden_maps').update(updates).eq('id', map.id).select().single()
    if (data) setMap(data as GardenMap)
  }, [map])

  const addBed = useCallback(async (shape: BedShape, name?: string): Promise<GardenBed | null> => {
    if (!map) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('garden_beds').insert({ user_id: user.id, map_id: map.id, shape, name: name ?? null })
      .select().single()
    if (error || !data) return null
    const newBed = data as GardenBed
    setBeds(prev => [...prev, newBed])
    return newBed
  }, [map])

  const updateBed = useCallback(async (id: string, updates: Partial<GardenBed>) => {
    const { data } = await supabase.from('garden_beds').update(updates).eq('id', id).select().single()
    if (data) setBeds(prev => prev.map(b => b.id === id ? data as GardenBed : b))
  }, [])

  const deleteBed = useCallback(async (id: string) => {
    await supabase.from('garden_beds').delete().eq('id', id)
    setBeds(prev => prev.filter(b => b.id !== id))
    setPlacements(prev => prev.map(p => p.bed_id === id ? { ...p, bed_id: null } : p))
  }, [])

  const placeItem = useCallback(async (inventoryId: string, x: number, y: number, bedId?: string): Promise<{ placement?: GardenPlacement; error?: string }> => {
    if (!map) return { error: 'No map loaded' }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('garden_placements').insert({ user_id: user.id, map_id: map.id, inventory_id: inventoryId, bed_id: bedId ?? null, x, y })
      .select().single()
    if (error) {
      if (error.code === '23505') return { error: 'duplicate' }
      console.error('placeItem error:', error)
      return { error: error.message }
    }
    if (!data) return { error: 'No data returned' }
    const newPlacement = data as GardenPlacement
    setPlacements(prev => [...prev, newPlacement])
    return { placement: newPlacement }
  }, [map])

  const movePlacement = useCallback(async (id: string, x: number, y: number) => {
    await supabase.from('garden_placements').update({ x, y }).eq('id', id)
    setPlacements(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }, [])

  const removePlacement = useCallback(async (id: string) => {
    await supabase.from('garden_placements').delete().eq('id', id)
    setPlacements(prev => prev.filter(p => p.id !== id))
  }, [])

  return {
    map, beds, placements, loading,
    createMap, updateMap,
    addBed, updateBed, deleteBed,
    placeItem, movePlacement, removePlacement,
    refresh: load,
  }
}
