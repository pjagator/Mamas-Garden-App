import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: Function) => {
        mockOnAuthStateChange(cb)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      signInWithPassword: (params: any) => mockSignInWithPassword(params),
      signUp: (params: any) => mockSignUp(params),
      signOut: () => mockSignOut(),
      signInWithOtp: (params: any) => mockSignInWithOtp(params),
      verifyOtp: (params: any) => mockVerifyOtp(params),
      resetPasswordForEmail: (email: string, opts: any) => mockResetPasswordForEmail(email, opts),
    },
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('starts with no user and loading true', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('calls signInWithPassword and returns error on failure', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const { result } = renderHook(() => useAuth())

    let error: string | null = null
    await act(async () => {
      error = await result.current.signIn('test@test.com', 'wrong')
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'wrong' })
    expect(error).toBe('Invalid credentials')
  })

  it('calls signUp and returns null on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth())

    let error: string | null = null
    await act(async () => {
      error = await result.current.signUp('test@test.com', 'password123')
    })

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
    expect(error).toBeNull()
  })

  it('calls signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})
