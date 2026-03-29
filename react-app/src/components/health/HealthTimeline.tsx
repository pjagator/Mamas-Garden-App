import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { useHealthLogs } from '@/hooks/useHealthLogs'
import type { HealthStatus } from '@/types'

interface HealthTimelineProps {
  inventoryId: string
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  thriving: 'bg-emerald-500',
  healthy: 'bg-green-400',
  stressed: 'bg-amber-400',
  sick: 'bg-red-500',
  dormant: 'bg-slate-400',
  new: 'bg-blue-400',
}

export default function HealthTimeline({ inventoryId }: HealthTimelineProps) {
  const { logs, loading, hasMore, load, loadMore } = useHealthLogs(inventoryId)

  useEffect(() => { load() }, [load])

  if (logs.length === 0 && !loading) return null

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-medium text-primary">Health History</h3>

      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-cream-dark" />

        {logs.map(log => (
          <div key={log.id} className="relative pb-4 last:pb-0">
            <div className={`absolute left-[-16px] top-1 w-3 h-3 rounded-full border-2 border-white ${HEALTH_COLORS[log.health]}`} />

            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink capitalize">{log.health}</span>
                {log.flowering && log.flowering !== 'no' && (
                  <span className="text-ink-light capitalize">· {log.flowering}</span>
                )}
                <span className="text-ink-light ml-auto">
                  {new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {log.notes && <p className="text-ink-mid mt-0.5">{log.notes}</p>}
              {log.diagnosis && (
                <div className="mt-1.5 p-2 rounded bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1 text-amber-800 font-medium">
                    <AlertTriangle size={12} /> {log.diagnosis.cause}
                  </div>
                  <p className="text-amber-700 mt-0.5">{log.diagnosis.action}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading} className="w-full text-xs">
          <ChevronDown size={14} className="mr-1" />
          {loading ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
