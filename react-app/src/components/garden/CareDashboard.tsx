import { RefreshCw, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WeatherCard from './WeatherCard'
import PlantCareCard from './PlantCareCard'
import ReminderList from '@/components/reminders/ReminderList'
import { useWeather } from '@/hooks/useWeather'
import { useSeasonalCare } from '@/hooks/useSeasonalCare'
import type { InventoryItem, Reminder } from '@/types'

interface CareDashboardProps {
  inventory: InventoryItem[]
  reminders: Reminder[]
  remindersLoading: boolean
  isStaleReminders: boolean
  onToggleReminder: (id: string, done: boolean) => void
  onAddCustomReminder: (title: string) => void
  onDeleteReminder: (id: string) => void
  onGenerateReminders: () => void
}

export default function CareDashboard({
  inventory, reminders, remindersLoading, isStaleReminders,
  onToggleReminder, onAddCustomReminder, onDeleteReminder, onGenerateReminders,
}: CareDashboardProps) {
  const { weather, loading: weatherLoading } = useWeather()
  const { care, generating, isStale, generate } = useSeasonalCare(inventory, weather)

  const plants = inventory.filter(i => i.type === 'plant').sort((a, b) => (a.common ?? '').localeCompare(b.common ?? ''))

  if (plants.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-sage-light mx-auto flex items-center justify-center mb-4">
          <Leaf size={32} className="text-sage" />
        </div>
        <h3 className="font-display text-lg text-primary">Add your first plant</h3>
        <p className="text-sm text-ink-light max-w-xs mx-auto">
          Personalized care guidance will appear here once you've cataloged some plants.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {weather && !weatherLoading && <WeatherCard weather={weather} />}

      <ReminderList
        reminders={reminders}
        loading={remindersLoading}
        isStale={isStaleReminders}
        onToggle={onToggleReminder}
        onAddCustom={onAddCustomReminder}
        onDelete={onDeleteReminder}
        onGenerate={onGenerateReminders}
      />

      {care?.garden_summary && (
        <div className="bg-cream rounded-[--radius-card] p-4">
          <p className="text-sm text-ink leading-relaxed italic">{care.garden_summary}</p>
        </div>
      )}

      {(!care || isStale()) && !generating && (
        <Button onClick={generate} variant="outline" size="sm" className="w-full">
          <RefreshCw size={14} className="mr-2" />
          {care ? 'Refresh seasonal tips' : "Generate this month's care tips"}
        </Button>
      )}
      {generating && (
        <div className="text-center py-4">
          <p className="text-xs text-ink-light animate-pulse">Generating seasonal care tips...</p>
        </div>
      )}

      {plants.map(plant => {
        const tips = care?.plant_tips?.find(
          (t: any) => t.common?.toLowerCase() === plant.common?.toLowerCase()
        ) ?? null
        return <PlantCareCard key={plant.id} item={plant} tips={tips} />
      })}
    </div>
  )
}
