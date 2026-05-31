import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Safety net: if getSession() never settles (e.g. the Supabase project is
    // paused or the network hangs while refreshing an expired token), fall
    // through to the auth screen instead of hanging on the green loading
    // placeholder forever.
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setUser(null)
        setLoading(false)
      }
    }, 8000)

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        // A rejected getSession() (bad/expired token, backend down) must still
        // clear loading, otherwise the app hangs on the loading placeholder.
        if (cancelled) return
        setUser(null)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  async function sendOtp(email: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return error?.message ?? null
  }

  async function verifyOtp(email: string, token: string): Promise<string | null> {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    return error?.message ?? null
  }

  async function resetPassword(email: string): Promise<string | null> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    return error?.message ?? null
  }

  return { user, loading, signIn, signUp, signOut, sendOtp, verifyOtp, resetPassword }
}
