interface ScreenHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function ScreenHeader({ title, subtitle, actions }: ScreenHeaderProps) {
  return (
    <header
      className="flex items-end justify-between px-4 pb-4"
      style={{
        background: 'linear-gradient(to bottom, var(--color-primary), var(--color-primary-mid))',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-2xl font-bold text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-sage-light)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
