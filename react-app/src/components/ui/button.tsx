import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] font-medium transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-green-deep text-cream hover:bg-green-mid',
        secondary: 'bg-cream-dark text-green-deep hover:bg-cream border border-green-light/30',
        destructive: 'bg-terra text-white hover:bg-terra/90',
        outline: 'border-2 border-green-sage text-green-deep bg-transparent hover:bg-green-light/20',
        ghost: 'text-green-deep hover:bg-green-light/20',
        link: 'text-green-mid underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2 text-[15px]',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-12 px-8 text-[16px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
