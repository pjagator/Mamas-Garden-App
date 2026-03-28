import type { NativePlant } from '@/types'

// === Native Plant Database (matches vanilla app) ===
export const NATIVE_PLANTS: NativePlant[] = [
  { name: 'Coontie', scientific: 'Zamia integrifolia', aliases: ['coontie', 'florida arrowroot', 'zamia'], bloom: ['Spring', 'Summer'], type: 'Cycad' },
  { name: 'Beautyberry', scientific: 'Callicarpa americana', aliases: ['beautyberry', 'callicarpa'], bloom: ['Summer', 'Fall'], type: 'Shrub' },
  { name: 'Firebush', scientific: 'Hamelia patens', aliases: ['firebush', 'hamelia', 'scarlet bush'], bloom: ['Spring', 'Summer', 'Fall'], type: 'Shrub' },
  { name: 'Wild Coffee', scientific: 'Psychotria nervosa', aliases: ['wild coffee', 'psychotria'], bloom: ['Spring', 'Summer'], type: 'Shrub' },
  { name: "Simpson's Stopper", scientific: 'Myrcianthes fragrans', aliases: ['simpson', 'stopper', 'myrcianthes'], bloom: ['Spring', 'Summer'], type: 'Tree' },
  { name: 'Blanket Flower', scientific: 'Gaillardia pulchella', aliases: ['blanket flower', 'gaillardia', 'indian blanket'], bloom: ['Spring', 'Summer', 'Fall'], type: 'Wildflower' },
  { name: 'Beach Sunflower', scientific: 'Helianthus debilis', aliases: ['beach sunflower', 'helianthus debilis'], bloom: ['Year-round'], type: 'Wildflower' },
  { name: 'Coral Honeysuckle', scientific: 'Lonicera sempervirens', aliases: ['coral honeysuckle', 'lonicera'], bloom: ['Spring', 'Summer', 'Fall'], type: 'Vine' },
  { name: 'Passion Vine', scientific: 'Passiflora incarnata', aliases: ['passion vine', 'passionflower', 'maypop', 'passiflora'], bloom: ['Summer', 'Fall'], type: 'Vine' },
  { name: 'Muhly Grass', scientific: 'Muhlenbergia capillaris', aliases: ['muhly', 'muhlenbergia', 'pink muhly'], bloom: ['Fall'], type: 'Grass' },
  { name: 'Saw Palmetto', scientific: 'Serenoa repens', aliases: ['saw palmetto', 'serenoa'], bloom: ['Spring'], type: 'Palm' },
  { name: 'Cabbage Palm', scientific: 'Sabal palmetto', aliases: ['cabbage palm', 'sabal', 'cabbage palmetto'], bloom: ['Summer'], type: 'Palm' },
  { name: 'Southern Magnolia', scientific: 'Magnolia grandiflora', aliases: ['magnolia', 'southern magnolia'], bloom: ['Spring', 'Summer'], type: 'Tree' },
  { name: 'Live Oak', scientific: 'Quercus virginiana', aliases: ['live oak', 'quercus virginiana'], bloom: ['Spring'], type: 'Tree' },
  { name: 'Bald Cypress', scientific: 'Taxodium distichum', aliases: ['bald cypress', 'taxodium'], bloom: ['Spring'], type: 'Tree' },
  { name: "Walter's Viburnum", scientific: 'Viburnum obovatum', aliases: ["walter's viburnum", 'viburnum obovatum', 'small viburnum', 'walter viburnum', 'small-leaf viburnum'], bloom: ['Spring'], type: 'Shrub' },
]

// === Preset Tags ===
export const PRESET_TAGS = ['Grass', 'Vine', 'Shrub', 'Wildflower', 'Tree', 'Palm', 'Cycad', 'Fern', 'Herb']

// === Location Zones & Habitats ===
export const LOCATION_ZONES = ['Front', 'Back', 'Side', 'Pot']
export const LOCATION_HABITATS = ['Hammock', 'Sandhill']

// === Seasons ===
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-round']

// === Health Statuses ===
export const HEALTH_STATUSES = ['thriving', 'healthy', 'stressed', 'sick', 'dormant', 'new'] as const
export const FLOWERING_STATUSES = ['yes', 'budding', 'no', 'fruiting'] as const

// === Microclimate Options ===
export const SUN_EXPOSURES = [
  { value: 'full_sun', label: 'Full Sun', icon: '☀️' },
  { value: 'partial_sun', label: 'Partial Sun', icon: '🌤️' },
  { value: 'partial_shade', label: 'Partial Shade', icon: '⛅' },
  { value: 'full_shade', label: 'Full Shade', icon: '🌥️' },
] as const

export const SOIL_TYPES = [
  { value: 'sandy', label: 'Sandy' },
  { value: 'loamy', label: 'Loamy' },
  { value: 'clay', label: 'Clay' },
  { value: 'well_drained', label: 'Well-drained' },
  { value: 'moist', label: 'Moist' },
] as const

export const MOISTURE_LEVELS = [
  { value: 'dry', label: 'Dry' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'wet', label: 'Wet' },
] as const

export const WIND_EXPOSURES = [
  { value: 'sheltered', label: 'Sheltered' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'exposed', label: 'Exposed' },
] as const

export const ZONE_TYPES = [
  { value: 'bed', label: 'Bed' },
  { value: 'border', label: 'Border' },
  { value: 'container', label: 'Container' },
  { value: 'lawn', label: 'Lawn' },
  { value: 'path', label: 'Path' },
  { value: 'water_feature', label: 'Water Feature' },
] as const

// === Zone Color Palette ===
export const ZONE_COLORS = [
  '#7a9e7e', // sage (default)
  '#4a7c59', // forest
  '#c4622d', // terracotta
  '#d4a574', // sandy
  '#6b8e9b', // water blue
  '#9b7ab8', // lavender
  '#c7956d', // warm brown
  '#8fbc8f', // dark sea green
]

/** Match a plant name against the native plant database */
export function matchNative(commonName: string, scientificName?: string): NativePlant | null {
  const lower = (commonName || '').toLowerCase()
  const sciLower = (scientificName || '').toLowerCase()

  return NATIVE_PLANTS.find((p) => {
    if (sciLower && p.scientific.toLowerCase() === sciLower) return true
    return p.aliases.some((a) => lower.includes(a))
  }) ?? null
}

/** Get current season based on month */
export function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

/** Parse location string into zone and habitat */
export function parseLocation(loc: string): { zone: string; habitat: string } {
  if (!loc) return { zone: '', habitat: '' }
  const parts = loc.split(',').map((s) => s.trim())
  return { zone: parts[0] || '', habitat: parts[1] || '' }
}

/** Build location string from zone and habitat */
export function buildLocation(zone: string, habitat: string): string {
  return [zone, habitat].filter(Boolean).join(', ')
}
