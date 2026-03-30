import RaindropIcon from './RaindropIcon'
import type { WeatherData } from '@/hooks/useWeather'

interface WeatherCardProps {
  weather: WeatherData
}

function getRaindropLevel(inches: number): 'none' | 'light' | 'heavy' {
  if (inches <= 0) return 'none'
  if (inches < 0.25) return 'light'
  return 'heavy'
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  const { forecast, monthlyTotal, monthName, monthlyAverage, takeaway } = weather
  const progress = Math.min(monthlyTotal / monthlyAverage, 1.5)
  const progressPercent = Math.round((progress / 1.5) * 100)

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm p-4 space-y-4">
      <div className="flex justify-between">
        {forecast.map(day => (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-ink-light font-medium">{day.dayName}</span>
            <RaindropIcon level={getRaindropLevel(day.precipitation)} size={20} />
            <span className="text-[10px] text-ink-mid">
              {day.precipitation > 0 ? `${day.precipitation}"` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-ink-mid">{monthName} rainfall</span>
          <span className="text-ink font-medium">{monthlyTotal}" of {monthlyAverage}" avg</span>
        </div>
        <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-sage rounded-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-ink-mid italic">{takeaway}</p>
    </div>
  )
}
