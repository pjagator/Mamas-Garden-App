import { GARDEN_QUOTES, GARDEN_FACTS, getDailyIndex, getTimeOfDayGreeting, getCurrentSeason } from '@/lib/constants'

interface WelcomeProps {
  onDismiss: () => void
}

const SEASONAL_MESSAGES: Record<string, string> = {
  Spring: 'The garden is waking up — new growth everywhere.',
  Summer: 'Long days, warm rain, and everything in bloom.',
  Fall: 'The muhly grass is putting on its show.',
  Winter: 'A quiet season — time to plan next year\'s beds.',
}

export default function Welcome({ onDismiss }: WelcomeProps) {
  const quote = GARDEN_QUOTES[getDailyIndex(GARDEN_QUOTES.length, 0)]
  const fact = GARDEN_FACTS[getDailyIndex(GARDEN_FACTS.length, 7)]
  const greeting = getTimeOfDayGreeting()
  const season = getCurrentSeason()
  const seasonalNote = SEASONAL_MESSAGES[season] ?? ''

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-b from-primary via-primary-mid to-sage flex flex-col items-center justify-center p-8 text-center"
      style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-sm mx-auto flex flex-col items-center gap-8">
        <div>
          <p className="text-sage-light text-sm mb-1">{greeting}</p>
          <h1 className="font-display text-3xl font-bold text-white">Tampa Garden</h1>
          {seasonalNote && (
            <p className="text-sage-light text-xs italic font-display mt-2">{seasonalNote}</p>
          )}
        </div>

        <blockquote className="space-y-2">
          <p className="font-display text-lg italic text-white/90 leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          <footer className="text-sage-light text-xs">
            &mdash; {quote.author}{quote.source ? `, ${quote.source}` : ''}
          </footer>
        </blockquote>

        <div className="bg-white/10 rounded-[--radius-card] p-4">
          <p className="text-white/80 text-sm leading-relaxed">{fact}</p>
        </div>

        <button
          onClick={onDismiss}
          className="bg-white text-primary font-display font-medium px-8 py-3 rounded-full transition-transform active:scale-95 shadow-md"
        >
          Start exploring
        </button>
      </div>
    </div>
  )
}
