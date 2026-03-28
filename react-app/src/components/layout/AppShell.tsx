import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  const navigate = useNavigate()
  const [_captureOpen, setCaptureOpen] = useState(false)

  const handleCapture = () => {
    setCaptureOpen(true)
    navigate('/capture')
  }

  return (
    <div className="min-h-screen min-h-dvh bg-cream flex flex-col">
      <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>
      <BottomNav onCapture={handleCapture} />
    </div>
  )
}
