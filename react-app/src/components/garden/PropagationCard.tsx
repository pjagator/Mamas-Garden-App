import { useState } from 'react'
import { ChevronDown, Sprout, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resilientFetch } from '@/lib/api'
import type { InventoryItem, WishlistItem, PropagationAdvice } from '@/types'

interface PropagationCardProps {
  item: InventoryItem | WishlistItem
  table: 'inventory' | 'wishlist'
  zone?: {
    sun_exposure: string | null
    soil_type: string | null
    moisture_level: string | null
    wind_exposure: string | null
  } | null
  onAdviceLoaded: (advice: PropagationAdvice) => void
}

export default function PropagationCard({ item, table, zone, onAdviceLoaded }: PropagationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const advice = item.propagation_advice

  async function generate() {
    setLoading(true)
    setError(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await resilientFetch('/api/garden-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'propagation',
          data: {
            common: item.common,
            scientific: item.scientific,
            type: item.type,
            category: 'category' in item ? item.category : null,
            zone: zone ?? undefined,
          },
        }),
      }, { timeoutMs: 30000 })
      const result = await response.json()
      if (result.propagation) {
        await supabase.from(table).update({ propagation_advice: result.propagation }).eq('id', item.id)
        onAdviceLoaded(result.propagation)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function handleExpand() {
    const willExpand = !expanded
    setExpanded(willExpand)
    if (willExpand && !advice && !loading) {
      generate()
    }
  }

  async function handleRegenerate() {
    await generate()
  }

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm mb-4">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2.5">
          <Sprout size={18} className="text-primary" />
          <span className="text-sm font-semibold text-primary">Propagation</span>
        </div>
        <div className="flex items-center gap-2">
          {advice && !expanded && (
            <span className="text-xs text-sage bg-sage-light/40 px-2.5 py-0.5 rounded-full">{advice.method}</span>
          )}
          <ChevronDown size={16} className={`text-ink-light transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 -mt-1">
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-sage animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-sm text-ink-light">Generating propagation advice...</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-ink-light mb-2">Could not generate advice. Try again later.</p>
              <button onClick={handleRegenerate} className="text-xs text-primary font-medium">Retry</button>
            </div>
          )}

          {advice && !loading && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">Best Method</p>
                <p className="text-sm text-ink font-medium">{advice.method}</p>
              </div>

              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">When to Propagate</p>
                <p className="text-sm text-ink">{advice.timing}</p>
              </div>

              <div>
                <p className="text-[10px] text-ink-light uppercase tracking-wide mb-1">Steps</p>
                <div className="space-y-1">
                  {advice.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 text-sm text-ink">
                      <span className="text-terra font-semibold flex-shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {advice.garden_tip && (
                <div className="bg-cream rounded-[--radius-sm] p-3 border-l-[3px] border-terra">
                  <p className="text-[10px] text-ink-light uppercase tracking-wide mb-0.5">For Your Garden</p>
                  <p className="text-sm text-ink leading-relaxed">{advice.garden_tip}</p>
                </div>
              )}

              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-[10px] text-ink-light hover:text-ink-mid pt-1"
              >
                <RefreshCw size={10} /> Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
