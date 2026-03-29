import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      onChange('')
    }
  }, [open, onChange])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-search-overlay]') && !target.closest('[data-search-toggle]')) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <>
      <button
        data-search-toggle
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
        aria-label={open ? 'Close search' : 'Search'}
      >
        {open ? <X size={20} /> : <Search size={20} />}
      </button>
      {open && (
        <div
          data-search-overlay
          className="absolute inset-x-0 top-0 bottom-0 flex items-center px-4 backdrop-blur-md bg-primary/80 rounded-b-lg z-10"
        >
          <Search size={18} className="text-white/60 mr-2 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search plants, insects, notes..."
            className="bg-transparent border-0 text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
          {value && (
            <button onClick={() => onChange('')} className="text-white/60 hover:text-white ml-1 min-h-0 min-w-0">
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </>
  )
}
