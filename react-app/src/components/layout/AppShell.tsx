import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { shouldShowWelcome, markVisit } from '@/lib/constants'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Auth from '@/pages/Auth'
import Welcome from '@/pages/Welcome'

const DESKTOP_BREAKPOINT = 768

export default function AppShell() {
  const { user, loading } = useAuth()
  const [isDesktop, setIsDesktop] = useState(
    () => window.innerWidth >= DESKTOP_BREAKPOINT
  )
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (user && !loading) {
      setShowWelcome(shouldShowWelcome())
    }
  }, [user, loading])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) markVisit()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleDismissWelcome = () => {
    markVisit()
    setShowWelcome(false)
  }

  const handleFabClick = () => {
    console.log('FAB clicked — capture modal coming in Phase 4')
  }

  if (loading) {
    return <div className="min-h-screen bg-primary" />
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-cream">
      {showWelcome && <Welcome onDismiss={handleDismissWelcome} />}

      {isDesktop ? (
        <>
          <Sidebar onFabClick={handleFabClick} />
          <main className="ml-56">
            <Outlet />
          </main>
        </>
      ) : (
        <>
          <main className="pb-20">
            <Outlet />
          </main>
          <BottomNav onFabClick={handleFabClick} />
        </>
      )}
    </div>
  )
}
