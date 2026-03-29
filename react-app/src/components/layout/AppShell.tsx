import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function AppShell() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    function handleChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  function handleFabClick() {
    console.log('FAB clicked — capture modal coming in Phase 4')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      {isDesktop ? (
        <>
          <Sidebar onFabClick={handleFabClick} />
          <main className="ml-56 min-h-screen">
            <Outlet />
          </main>
        </>
      ) : (
        <>
          <main className="pb-20 min-h-screen">
            <Outlet />
          </main>
          <BottomNav onFabClick={handleFabClick} />
        </>
      )}
    </div>
  )
}
