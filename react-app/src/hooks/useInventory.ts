import { useState, useEffect, useCallback, createContext, useContext, createElement, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types'

const CACHE_KEY = 'garden-inventory-cache'
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000

interface CacheEntry {
  data: InventoryItem[]
  timestamp: number
}

function readCache(): InventoryItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_MAX_AGE) return null
    return entry.data
  } catch {
    return null
  }
}

function writeCache(data: InventoryItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // localStorage full or unavailable
  }
}

function useInventoryState() {
  const [items, setItems] = useState<InventoryItem[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (err) {
      setError(err.message)
    } else if (data) {
      setItems(data as InventoryItem[])
      writeCache(data as InventoryItem[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async () => {
    setLoading(true)
    await load()
  }, [load])

  const deleteItem = useCallback(async (id: string, imageUrl?: string | null) => {
    const { error: err } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (err) {
      setError(err.message)
      return false
    }

    if (imageUrl) {
      const path = imageUrl.split('/garden-images/')[1]
      if (path) {
        await supabase.storage.from('garden-images').remove([path])
      }
    }

    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      writeCache(next)
      return next
    })
    return true
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const { data, error: err } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }

    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...data } : i)
      writeCache(next)
      return next
    })
    return data as InventoryItem
  }, [])

  const insertItem = useCallback(async (entry: Omit<InventoryItem, 'id' | 'date'>) => {
    const { data, error: err } = await supabase
      .from('inventory')
      .insert(entry)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }

    setItems(prev => {
      const next = [data as InventoryItem, ...prev]
      writeCache(next)
      return next
    })
    return data as InventoryItem
  }, [])

  const stats = {
    plants: items.filter(i => i.type === 'plant').length,
    insects: items.filter(i => i.type === 'bug').length,
    natives: items.filter(i => i.is_native).length,
  }

  return { items, loading, error, stats, refresh, deleteItem, updateItem, insertItem }
}

type InventoryContextValue = ReturnType<typeof useInventoryState>

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const value = useInventoryState()
  return createElement(InventoryContext.Provider, { value }, children)
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) {
    throw new Error('useInventory must be used within an InventoryProvider')
  }
  return ctx
}
