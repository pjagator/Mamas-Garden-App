import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useInventory } from '@/hooks/useInventory'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/Auth'
import { GardenPage } from '@/pages/Garden'
import { MapPage } from '@/pages/Map'
import { TimelinePage } from '@/pages/Timeline'
import { CapturePage } from '@/pages/Capture'
import { SettingsPage } from '@/pages/Settings'
import { WishlistPage } from '@/pages/Wishlist'
import { supabase } from '@/lib/supabase'
import type { GardenBed, GardenPlacement, WishlistItem } from '@/types'

function AppRoutes() {
  const { user, loading: authLoading, signIn, signUp, signInWithOtp, verifyOtp, resetPassword, signOut } = useAuth()
  const { items, loading: inventoryLoading, addItem } = useInventory(user?.id)
  const navigate = useNavigate()

  // Map state (will be moved to useGardenMap hook later)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [beds, setBeds] = useState<GardenBed[]>([])
  const [placements, setPlacements] = useState<GardenPlacement[]>([])

  // Wishlist state (will be moved to useWishlist hook later)
  const [wishlistItems] = useState<WishlistItem[]>([])

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Map handlers
  const handleUploadBackground = useCallback(async (file: File) => {
    if (!user) return
    const path = `${user.id}/map_${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('garden-images')
      .upload(path, file, { contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('garden-images').getPublicUrl(path)
    setMapImageUrl(data.publicUrl)
  }, [user])

  const handleAddBed = useCallback(async (bed: Partial<GardenBed>) => {
    const newBed: GardenBed = {
      id: crypto.randomUUID(),
      user_id: user?.id ?? '',
      map_id: '',
      name: bed.name ?? '',
      shape: bed.shape ?? { type: 'rect', x: 0, y: 0, width: 100, height: 100 },
      sun_exposure: bed.sun_exposure ?? null,
      soil_type: bed.soil_type ?? null,
      moisture_level: null,
      wind_exposure: null,
      zone_type: null,
      color: bed.color ?? '#7a9e7e',
      notes: null,
      created_at: new Date().toISOString(),
    }
    setBeds((prev) => [...prev, newBed])
  }, [user])

  const handleUpdateBed = useCallback(async (id: string, updates: Partial<GardenBed>) => {
    setBeds((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }, [])

  const handleDeleteBed = useCallback(async (id: string) => {
    setBeds((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const handlePlacePlant = useCallback(async (inventoryId: string, x: number, y: number, bedId?: string) => {
    const newPlacement: GardenPlacement = {
      id: crypto.randomUUID(),
      user_id: user?.id ?? '',
      map_id: '',
      inventory_id: inventoryId,
      bed_id: bedId ?? null,
      x,
      y,
      placed_at: new Date().toISOString(),
    }
    setPlacements((prev) => [...prev, newPlacement])
  }, [user])

  const handleMovePlant = useCallback(async (placementId: string, x: number, y: number) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === placementId ? { ...p, x, y } : p))
    )
  }, [])

  const handleRemovePlant = useCallback(async (placementId: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== placementId))
  }, [])

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen min-h-dvh bg-gradient-to-b from-green-deep to-green-mid flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
          <p className="text-cream/70 text-sm">Loading your garden...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <AuthPage
        onSignIn={signIn}
        onSignUp={signUp}
        onOtp={signInWithOtp}
        onVerifyOtp={verifyOtp}
        onResetPassword={resetPassword}
      />
    )
  }

  // Settings view
  if (settingsOpen) {
    return (
      <SettingsPage
        email={user.email ?? ''}
        items={items}
        onSignOut={signOut}
        onClose={() => setSettingsOpen(false)}
      />
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <GardenPage
              items={items}
              loading={inventoryLoading}
              onItemClick={(item) => {
                // TODO: open item detail sheet
                console.log('Item clicked:', item.common)
              }}
              onSettingsClick={() => setSettingsOpen(true)}
            />
          }
        />
        <Route
          path="map"
          element={
            <MapPage
              items={items}
              mapImageUrl={mapImageUrl}
              beds={beds}
              placements={placements}
              onUploadBackground={handleUploadBackground}
              onAddBed={handleAddBed}
              onUpdateBed={handleUpdateBed}
              onDeleteBed={handleDeleteBed}
              onPlacePlant={handlePlacePlant}
              onMovePlant={handleMovePlant}
              onRemovePlant={handleRemovePlant}
            />
          }
        />
        <Route
          path="timeline"
          element={<TimelinePage items={items} />}
        />
        <Route
          path="wishlist"
          element={
            <WishlistPage
              items={wishlistItems}
              onAddClick={() => navigate('/capture')}
              onItemClick={() => {}}
              onMoveToGarden={() => {}}
            />
          }
        />
      </Route>
      <Route
        path="capture"
        element={
          <CapturePage
            userId={user.id}
            onSave={addItem}
            onBack={() => navigate('/')}
          />
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
