import { useState } from 'react'
import { ChevronDown, Droplets, Sun, Sprout, Calendar, Scissors, Ruler, ShieldAlert, TreePine } from 'lucide-react'
import type { InventoryItem, CareProfile } from '@/types'
import type { PlantTip } from '@/hooks/useSeasonalCare'

interface PlantCareCardProps {
  item: InventoryItem
  tips: PlantTip | null
}

function CareDetail({ care }: { care: CareProfile }) {
  const rows = [
    { icon: Droplets, label: 'Watering', value: care.watering ? `${care.watering.frequency}${care.watering.notes ? ` — ${care.watering.notes}` : ''}` : null },
    { icon: Sun, label: 'Sun', value: care.sun },
    { icon: Sprout, label: 'Soil', value: care.soil },
    { icon: Calendar, label: 'Fertilizing', value: care.fertilizing ? `${care.fertilizing.schedule}${care.fertilizing.type ? ` (${care.fertilizing.type})` : ''}` : null },
    { icon: Scissors, label: 'Pruning', value: care.pruning ? `${care.pruning.timing}${care.pruning.method ? ` — ${care.pruning.method}` : ''}` : null },
    { icon: Ruler, label: 'Mature size', value: care.mature_size ? `${care.mature_size.height} tall, ${care.mature_size.spread} spread` : null },
    { icon: ShieldAlert, label: 'Pests & diseases', value: care.pests_diseases },
    { icon: TreePine, label: 'Companion plants', value: care.companions },
  ]
  return (
    <div className="space-y-1 pt-2 border-t border-cream-dark mt-3">
      {rows.map(r => {
        if (!r.value) return null
        const Icon = r.icon
        return (
          <div key={r.label} className="flex items-start gap-2 py-1">
            <Icon size={14} className="text-sage mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-ink-light">{r.label}</p>
              <p className="text-xs text-ink">{r.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PlantCareCard({ item, tips }: PlantCareCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-[--radius-card] shadow-sm p-4">
      <div className="flex items-start gap-3">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-cream-dark flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-medium text-ink truncate">{item.common ?? 'Unknown'}</h4>
          {item.scientific && <p className="text-[10px] text-ink-light italic truncate">{item.scientific}</p>}
        </div>
      </div>

      {tips && tips.tips.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {tips.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-mid">
              <span className="text-sage mt-0.5 flex-shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      ) : !tips ? (
        <p className="mt-3 text-xs text-ink-light italic">Care info not yet generated</p>
      ) : null}

      {item.care_profile && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-[10px] text-ink-light hover:text-ink-mid"
          >
            Full care reference
            <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && <CareDetail care={item.care_profile} />}
        </>
      )}
    </div>
  )
}
