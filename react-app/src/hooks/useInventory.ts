import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types'

const CACHE_KEY = 'garden-inventory-cache'
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

interface CachedData {
  items: InventoryItem[]
  timestamp: number
}

function readCache(): InventoryItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedData = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_MAX_AGE) return null
    return cached.items
  } catch {
    return null
  }
}

function writeCache(items: InventoryItem[]) {
  try {
    const data: CachedData = { items, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function useInventory(userId: string | undefined) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadInventory = useCallback(async () => {
    if (!userId) return

    // Cache-first render
    const cached = readCache()
    if (cached) {
      setItems(cached)
      setLoading(false)
    }

    // Background refresh from Supabase
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (!error && data) {
      setItems(data as InventoryItem[])
      writeCache(data as InventoryItem[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const addItem = useCallback(
    async (item: Partial<InventoryItem>) => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('inventory')
        .insert({ ...item, user_id: userId })
        .select()
        .single()

      if (error) throw error
      await loadInventory()
      return data as InventoryItem
    },
    [userId, loadInventory]
  )

  const updateItem = useCallback(
    async (id: string, updates: Partial<InventoryItem>) => {
      const { error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await loadInventory()
    },
    [loadInventory]
  )

  const deleteItem = useCallback(
    async (id: string) => {
      // Delete image from storage if exists
      const item = items.find((i) => i.id === id)
      if (item?.image_url) {
        const path = item.image_url.split('/garden-images/')[1]
        if (path) {
          await supabase.storage.from('garden-images').remove([path])
        }
      }

      const { error } = await supabase.from('inventory').delete().eq('id', id)
      if (error) throw error
      await loadInventory()
    },
    [items, loadInventory]
  )

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refresh: loadInventory,
  }
}
