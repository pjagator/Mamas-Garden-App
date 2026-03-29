import { WifiOff, Wifi } from 'lucide-react'

interface ConnectionToastProps {
  visible: boolean
  message: string
  type: 'offline' | 'online'
}

export default function ConnectionToast({ visible, message, type }: ConnectionToastProps) {
  if (!visible) return null
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-transform ${
        type === 'offline' ? 'bg-terra' : 'bg-sage'
      }`}
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      role="status" aria-live="polite"
    >
      {type === 'offline' ? <WifiOff size={16} /> : <Wifi size={16} />}
      {message}
    </div>
  )
}
