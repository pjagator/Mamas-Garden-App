interface RaindropIconProps {
  level: 'none' | 'light' | 'heavy'
  size?: number
  className?: string
}

export default function RaindropIcon({ level, size = 20, className = '' }: RaindropIconProps) {
  const dropPath = 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z'

  if (level === 'none') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`text-ink-light/30 ${className}`}>
        <line x1="8" y1="19" x2="16" y2="19" strokeWidth="1.5" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`${level === 'heavy' ? 'text-primary' : 'text-sage'} ${className}`}>
      <path d={dropPath} fill={level === 'heavy' ? 'currentColor' : 'none'}
        fillOpacity={level === 'heavy' ? 0.2 : 0} />
    </svg>
  )
}
