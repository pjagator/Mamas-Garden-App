import { useMemo } from 'react'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flower2, Bug } from 'lucide-react'
import type { InventoryItem } from '@/types'

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const

interface TimelineProps {
  items: InventoryItem[]
}

export function TimelinePage({ items }: TimelineProps) {
  const seasonData = useMemo(() => {
    return SEASONS.map((season) => {
      const plants = items.filter(
        (i) =>
          i.type === 'plant' &&
          (i.bloom?.includes(season) || i.bloom?.includes('Year-round'))
      )
      const bugs = items.filter(
        (i) =>
          i.type === 'bug' &&
          (i.season?.includes(season) || i.season?.includes('Year-round'))
      )
      return { season, plants, bugs }
    })
  }, [items])

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenHeader
        title="Seasonal Timeline"
        subtitle="What blooms and visits throughout the year"
      />

      <div className="flex-1 px-4 py-4 space-y-4">
        {seasonData.map(({ season, plants, bugs }) => (
          <Card key={season}>
            <CardContent className="p-4">
              <h3 className="font-display text-lg font-semibold text-green-deep mb-3">
                {season}
              </h3>

              {plants.length === 0 && bugs.length === 0 ? (
                <p className="text-sm text-ink-light italic">
                  Nothing logged yet for this season.
                </p>
              ) : (
                <div className="space-y-2">
                  {plants.map((plant) => (
                    <div key={plant.id} className="flex items-center gap-3">
                      <Flower2 className="w-4 h-4 text-green-sage flex-shrink-0" />
                      <span className="text-sm text-ink">{plant.common}</span>
                      {plant.is_native && (
                        <Badge variant="native" className="text-[10px] px-1.5 py-0 ml-auto">
                          Native
                        </Badge>
                      )}
                    </div>
                  ))}
                  {bugs.map((bug) => (
                    <div key={bug.id} className="flex items-center gap-3">
                      <Bug className="w-4 h-4 text-terra-light flex-shrink-0" />
                      <span className="text-sm text-ink">{bug.common}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
