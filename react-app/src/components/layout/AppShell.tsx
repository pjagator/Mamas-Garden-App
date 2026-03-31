import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnection } from '@/hooks/useConnection'
import { shouldShowWelcome, markVisit } from '@/lib/constants'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import Auth from '@/pages/Auth'
import Welcome from '@/pages/Welcome'
import CaptureSheet from '@/components/capture/CaptureSheet'
import ConnectionToast from './ConnectionToast'

const DESKTOP_BREAKPOINT = 768

export default function AppShell() {
  const { user, loading } = useAuth()
  const { online, showToast, toastMessage, toastType } = useConnection()
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

  const [captureOpen, setCaptureOpen] = useState(false)
  const handleFabClick = () => setCaptureOpen(true)

  if (loading) {
    return <div className="min-h-screen bg-primary" />
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className={isDesktop ? 'min-h-screen bg-cream' : 'h-dvh flex flex-col bg-cream overflow-hidden'}>
      <ConnectionToast visible={showToast} message={toastMessage} type={toastType} />
      {showWelcome && <Welcome onDismiss={handleDismissWelcome} />}
      <CaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} />

      {isDesktop ? (
        <>
          <Sidebar onFabClick={handleFabClick} />
          <main className="ml-56">
            <Outlet />
          </main>
        </>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <Outlet />
          </main>
          <BottomNav onFabClick={handleFabClick} offline={!online} />
        </>
      )}
    </div>
  )
}
