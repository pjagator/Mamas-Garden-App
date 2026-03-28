import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[10px] border border-green-light/40 bg-white px-3 py-2 text-[15px] text-ink transition-colors',
          'placeholder:text-ink-light',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-sage/40 focus-visible:border-green-sage',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
