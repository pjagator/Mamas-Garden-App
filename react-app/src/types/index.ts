// ── Inventory (existing table — no changes) ──────────────────
export interface InventoryItem {
  id: string
  user_id: string
  nickname: string | null
  common: string | null
  scientific: string | null
  type: 'plant' | 'bug' | null
  category: string | null
  confidence: number | null
  description: string | null
  care: string | null
  bloom: string[] | null
  season: string[] | null
  is_native: boolean
  source: 'Claude AI' | 'Manual' | null
  image_url: string | null
  notes: string
  date: string
  tags: string[]
  location: string
  care_profile: CareProfile | null
  health: HealthStatus | null
  flowering: FloweringStatus | null
  height: string | null
  features: string | null
  linked_plant_id: string | null
  propagation_advice: PropagationAdvice | null
}

export type HealthStatus = 'thriving' | 'healthy' | 'stressed' | 'sick' | 'dormant' | 'new'
export type FloweringStatus = 'yes' | 'budding' | 'no' | 'fruiting'

export interface CareProfile {
  watering: { frequency: string; notes: string }
  sun: string
  soil: string
  fertilizing: { schedule: string; type: string }
  pruning: { timing: string; method: string }
  mature_size: { height: string; spread: string }
  pests_diseases: string
  companions: string
}

export interface PropagationAdvice {
  method: string
  timing: string
  steps: string[]
  garden_tip: string | null
}

export interface Reminder {
  id: string
  user_id: string
  month_key: string
  icon: string
  title: string
  detail: string
  plant: string
  source: 'ai' | 'custom'
  done: boolean
  plant_hash: string
  created_at: string
}

export interface HealthLog {
  id: string
  user_id: string
  inventory_id: string
  health: HealthStatus
  flowering: FloweringStatus | null
  notes: string
  image_url: string | null
  diagnosis: Diagnosis | null
  logged_at: string
}

export interface Diagnosis {
  cause: string
  severity: string
  action: string
  details: string
}

export interface GardenMap {
  id: string
  user_id: string
  name: string
  image_url: string | null
  width: number | null
  height: number | null
  created_at: string
}

export type SunExposure = 'full_sun' | 'partial_sun' | 'partial_shade' | 'full_shade'
export type SoilType = 'sandy' | 'loamy' | 'clay' | 'well_drained' | 'moist'
export type MoistureLevel = 'dry' | 'moderate' | 'wet'
export type WindExposure = 'sheltered' | 'moderate' | 'exposed'
export type ZoneType = 'bed' | 'border' | 'container' | 'lawn' | 'path' | 'water_feature'

export interface BedShape {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export interface GardenBed {
  id: string
  user_id: string
  map_id: string
  name: string | null
  shape: BedShape
  sun_exposure: SunExposure | null
  soil_type: SoilType | null
  moisture_level: MoistureLevel | null
  wind_exposure: WindExposure | null
  zone_type: ZoneType | null
  color: string
  notes: string | null
  created_at: string
}

export interface GardenPlacement {
  id: string
  user_id: string
  map_id: string
  inventory_id: string
  bed_id: string | null
  x: number
  y: number
  placed_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  common: string | null
  scientific: string | null
  type: string
  category: string | null
  confidence: number | null
  description: string | null
  image_url: string | null
  spotted_at: string | null
  notes: string
  is_native: boolean
  bloom: string[] | null
  season: string[] | null
  care_profile: CareProfile | null
  suggested_zones: string[] | null
  sun_needs: string | null
  soil_needs: string | null
  moisture_needs: string | null
  source: 'Claude AI' | 'Manual' | null
  propagation_advice: PropagationAdvice | null
  created_at: string
}

export interface NativePlant {
  name: string
  scientific: string
  aliases: string[]
  bloom: string[]
  type: string
}

export type AuthTab = 'signin' | 'signup' | 'magic' | 'reset'
