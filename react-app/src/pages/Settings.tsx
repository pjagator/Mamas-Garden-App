import { useState } from 'react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Trash2,
  LogOut,
  Info,
  Leaf,
  X,
} from 'lucide-react'
import type { InventoryItem } from '@/types'

interface SettingsProps {
  email: string
  items: InventoryItem[]
  onSignOut: () => void
  onClose: () => void
}

export function SettingsPage({ email, items, onSignOut, onClose }: SettingsProps) {
  const [clearing, setClearing] = useState(false)

  const exportJSON = () => {
    const data = {
      version: '2.0',
      app: 'Project Firebush',
      date: new Date().toISOString(),
      entries: items,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garden-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCSV = () => {
    const headers = ['common', 'scientific', 'type', 'category', 'date', 'confidence', 'bloom', 'season', 'native', 'notes', 'image_url']
    const rows = items.map((i) =>
      headers.map((h) => {
        const val = i[h as keyof InventoryItem]
        if (Array.isArray(val)) return val.join('; ')
        if (typeof val === 'boolean') return val ? 'Yes' : 'No'
        return String(val ?? '')
      })
    )
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garden-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Settings"
        subtitle="Manage your garden journal"
        action={
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-cream"
          >
            <X className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Account */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-light/30 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-green-deep" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-deep">{email}</p>
                <p className="text-xs text-ink-light">Garden keeper</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-display text-base font-semibold text-green-deep flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Data
            </h3>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={exportJSON}>
                <FileJson className="w-4 h-4 mr-2" /> JSON
              </Button>
              <Button variant="secondary" className="flex-1" onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-display text-base font-semibold text-green-deep flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" /> About
            </h3>
            <p className="text-sm text-ink-mid">
              Project Firebush v1.0 — A Tampa Bay garden journal.
              Species identification powered by Claude AI.
              No API key required.
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Danger zone */}
        <div className="space-y-3">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setClearing(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear all garden data
          </Button>

          {clearing && (
            <Card className="border-terra/30 bg-terra/5">
              <CardContent className="p-4 text-center space-y-3">
                <p className="text-sm text-terra font-medium">
                  This will delete all your plants, insects, and data. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      // TODO: implement clear all
                      setClearing(false)
                    }}
                  >
                    Yes, delete everything
                  </Button>
                  <Button variant="ghost" onClick={() => setClearing(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>

        <p className="text-center text-xs text-ink-light pt-4 pb-8">
          Project Firebush v1.0
        </p>
      </div>
    </div>
  )
}
