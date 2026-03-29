import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
