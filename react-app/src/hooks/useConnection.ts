import { useState, useEffect } from 'react'

export function useConnection() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'offline' | 'online'>('offline')

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      setToastMessage('Back online')
      setToastType('online')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    }
    function handleOffline() {
      setOnline(false)
      setToastMessage("You're offline — browsing cached data")
      setToastType('offline')
      setShowToast(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [])

  return { online, showToast, toastMessage, toastType }
}
