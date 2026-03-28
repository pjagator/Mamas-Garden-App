import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function ScreenHeader({ title, subtitle, action, className }: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-b from-green-deep to-green-mid px-6 pb-7 pt-safe',
        'relative',
        className
      )}
      style={{ paddingTop: `calc(56px + env(safe-area-inset-top, 0px))` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-cream">{title}</h1>
          {subtitle && (
            <p className="text-green-light/80 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
