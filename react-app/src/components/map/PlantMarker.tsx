import { Group, Circle, Text } from 'react-konva'
import type { InventoryItem, HealthStatus } from '@/types'

interface PlantMarkerProps {
  item: InventoryItem
  x: number
  y: number
  placementId: string
  draggable: boolean
  onDragEnd: (id: string, x: number, y: number) => void
  onTap: (id: string) => void
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  thriving: '#22c55e',
  healthy: '#4ade80',
  stressed: '#f59e0b',
  sick: '#ef4444',
  dormant: '#94a3b8',
  new: '#3b82f6',
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const words = name.split(' ')
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function PlantMarker({ item, x, y, placementId, draggable, onDragEnd, onTap }: PlantMarkerProps) {
  const borderColor = item.health ? HEALTH_COLORS[item.health] : '#7a9e7e'
  const initials = getInitials(item.common)

  return (
    <Group
      x={x} y={y} draggable={draggable}
      onDragEnd={(e) => onDragEnd(placementId, e.target.x(), e.target.y())}
      onTap={() => onTap(placementId)}
      onClick={() => onTap(placementId)}
    >
      <Circle radius={18} fill={borderColor} />
      <Circle radius={15} fill="white" />
      <Text
        text={initials} fontSize={10} fontFamily="system-ui, sans-serif" fontStyle="bold"
        fill="#1c3a2b" align="center" verticalAlign="middle"
        width={30} height={30} offsetX={15} offsetY={15}
      />
    </Group>
  )
}
