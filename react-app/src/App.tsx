import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/layout/AppShell'
import Garden from '@/pages/Garden'
import Map from '@/pages/Map'
import Wishlist from '@/pages/Wishlist'
import Timeline from '@/pages/Timeline'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Garden />} />
          <Route path="/map" element={<Map />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/timeline" element={<Timeline />} />
        </Route>
      </Routes>
      <Toaster position="bottom-center" />
    </BrowserRouter>
  )
}
