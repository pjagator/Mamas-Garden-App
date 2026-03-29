import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useInventory } from '@/hooks/useInventory'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: () => ({ remove: vi.fn().mockResolvedValue({}) }),
    },
  },
}))

const localStorageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStorageMock[key] ?? null,
  setItem: (key: string, value: string) => { localStorageMock[key] = value },
  removeItem: (key: string) => { delete localStorageMock[key] },
})

describe('useInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('starts with empty inventory and loading true', () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())
    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('loads items from Supabase and caches to localStorage', async () => {
    const mockItems = [
      { id: '1', common: 'Firebush', type: 'plant', is_native: true, tags: [], notes: '', location: '' },
    ]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockItems, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.items).toEqual(mockItems)
    expect(localStorageMock['garden-inventory-cache']).toBeDefined()
  })

  it('renders from cache first if available', () => {
    const cachedItems = [{ id: 'cached-1', common: 'Cached Plant' }]
    localStorageMock['garden-inventory-cache'] = JSON.stringify({
      data: cachedItems,
      timestamp: Date.now(),
    })

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: cachedItems, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useInventory())
    expect(result.current.items).toEqual(cachedItems)
  })
})
