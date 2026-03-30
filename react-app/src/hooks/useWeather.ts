import { useState, useEffect, useCallback } from 'react'

const TAMPA_LAT = 27.95
const TAMPA_LNG = -82.46
const CACHE_KEY = 'garden-weather-cache'
const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

export const TAMPA_MONTHLY_AVG_RAIN: Record<string, number> = {
  January: 2.3, February: 2.7, March: 3.0, April: 2.0,
  May: 3.1, June: 7.6, July: 7.5, August: 7.9,
  September: 6.5, October: 2.8, November: 1.6, December: 2.4,
}

export interface DayForecast {
  date: string
  dayName: string
  precipitation: number
}

export interface WeatherData {
  forecast: DayForecast[]
  monthlyTotal: number
  monthName: string
  monthlyAverage: number
  takeaway: string
}

function getTakeaway(forecast: DayForecast[], monthlyTotal: number, monthlyAverage: number): string {
  const weekTotal = forecast.reduce((sum, d) => sum + d.precipitation, 0)
  if (monthlyTotal > monthlyAverage * 1.5) return 'Wetter than usual this month — watch for root rot'
  if (weekTotal > 1.5) return 'Plenty of rain expected — hold off on watering'
  if (weekTotal > 0.5) return 'Some rain coming — check soil before watering'
  return 'Dry week ahead — keep up with watering'
}

function mmToInches(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch7Day = useCallback(async (): Promise<DayForecast[]> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${TAMPA_LAT}&longitude=${TAMPA_LNG}&daily=precipitation_sum&timezone=America/New_York&forecast_days=7`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Forecast fetch failed')
    const data = await res.json()
    const days: string[] = data.daily.time
    const precip: number[] = data.daily.precipitation_sum
    return days.map((date, i) => ({
      date,
      dayName: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      precipitation: mmToInches(precip[i] ?? 0),
    }))
  }, [])

  const fetchMonthlyTotal = useCallback(async (): Promise<number> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const startDate = `${year}-${month}-01`
    const today = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${TAMPA_LAT}&longitude=${TAMPA_LNG}&start_date=${startDate}&end_date=${today}&daily=precipitation_sum&timezone=America/New_York`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Monthly rain fetch failed')
    const data = await res.json()
    const precip: number[] = data.daily?.precipitation_sum ?? []
    const totalMm = precip.reduce((sum, v) => sum + (v ?? 0), 0)
    return mmToInches(totalMm)
  }, [])

  const load = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
          setWeather(parsed.data)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore bad cache */ }

    try {
      setLoading(true)
      const [forecast, monthlyTotal] = await Promise.all([fetch7Day(), fetchMonthlyTotal()])
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
      const monthlyAverage = TAMPA_MONTHLY_AVG_RAIN[monthName] ?? 3.0
      const takeaway = getTakeaway(forecast, monthlyTotal, monthlyAverage)
      const data: WeatherData = { forecast, monthlyTotal, monthName, monthlyAverage, takeaway }
      setWeather(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetch7Day, fetchMonthlyTotal])

  useEffect(() => { load() }, [load])

  return { weather, loading, error, refresh: load }
}
