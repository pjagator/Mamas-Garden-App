import type { NativePlant } from '@/types'

export const NATIVE_PLANTS: NativePlant[] = [
  { name: "Coontie", scientific: "Zamia integrifolia", aliases: ["coontie", "florida arrowroot", "zamia"], bloom: ["Spring", "Summer"], type: "Cycad" },
  { name: "Beautyberry", scientific: "Callicarpa americana", aliases: ["beautyberry", "callicarpa"], bloom: ["Summer", "Fall"], type: "Shrub" },
  { name: "Firebush", scientific: "Hamelia patens", aliases: ["firebush", "hamelia", "scarlet bush"], bloom: ["Spring", "Summer", "Fall"], type: "Shrub" },
  { name: "Wild Coffee", scientific: "Psychotria nervosa", aliases: ["wild coffee", "psychotria"], bloom: ["Spring", "Summer"], type: "Shrub" },
  { name: "Simpson's Stopper", scientific: "Myrcianthes fragrans", aliases: ["simpson", "stopper", "myrcianthes"], bloom: ["Spring", "Summer"], type: "Tree" },
  { name: "Blanket Flower", scientific: "Gaillardia pulchella", aliases: ["blanket flower", "gaillardia", "indian blanket"], bloom: ["Spring", "Summer", "Fall"], type: "Wildflower" },
  { name: "Beach Sunflower", scientific: "Helianthus debilis", aliases: ["beach sunflower", "helianthus debilis"], bloom: ["Year-round"], type: "Wildflower" },
  { name: "Coral Honeysuckle", scientific: "Lonicera sempervirens", aliases: ["coral honeysuckle", "lonicera"], bloom: ["Spring", "Summer", "Fall"], type: "Vine" },
  { name: "Passion Vine", scientific: "Passiflora incarnata", aliases: ["passion vine", "passionflower", "maypop", "passiflora"], bloom: ["Summer", "Fall"], type: "Vine" },
  { name: "Muhly Grass", scientific: "Muhlenbergia capillaris", aliases: ["muhly", "muhlenbergia", "pink muhly"], bloom: ["Fall"], type: "Grass" },
  { name: "Saw Palmetto", scientific: "Serenoa repens", aliases: ["saw palmetto", "serenoa"], bloom: ["Spring"], type: "Palm" },
  { name: "Cabbage Palm", scientific: "Sabal palmetto", aliases: ["cabbage palm", "sabal", "cabbage palmetto"], bloom: ["Summer"], type: "Palm" },
  { name: "Southern Magnolia", scientific: "Magnolia grandiflora", aliases: ["magnolia", "southern magnolia"], bloom: ["Spring", "Summer"], type: "Tree" },
  { name: "Live Oak", scientific: "Quercus virginiana", aliases: ["live oak", "quercus virginiana"], bloom: ["Spring"], type: "Tree" },
  { name: "Bald Cypress", scientific: "Taxodium distichum", aliases: ["bald cypress", "taxodium"], bloom: ["Spring"], type: "Tree" },
]

export const PRESET_TAGS = ['Grass', 'Vine', 'Shrub', 'Wildflower', 'Tree', 'Palm', 'Cycad', 'Fern', 'Herb'] as const
export const LOCATION_ZONES = ['Front', 'Back', 'Side', 'Pot'] as const
export const LOCATION_HABITATS = ['Hammock', 'Sandhill'] as const

export function getSeason(monthIndex: number): string {
  if (monthIndex >= 2 && monthIndex <= 4) return 'Spring'
  if (monthIndex >= 5 && monthIndex <= 7) return 'Summer'
  if (monthIndex >= 8 && monthIndex <= 10) return 'Fall'
  return 'Winter'
}

export function getCurrentSeason(): string {
  return getSeason(new Date().getMonth())
}

export function confidenceClass(pct: number): 'high' | 'mid' | 'low' {
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'mid'
  return 'low'
}

export function matchNative(commonName = '', scientificName = ''): NativePlant | null {
  const haystack = (commonName + ' ' + scientificName).toLowerCase()
  return NATIVE_PLANTS.find(p => {
    if (haystack.includes(p.scientific.toLowerCase())) return true
    return p.aliases.some(a => haystack.includes(a))
  }) ?? null
}

export interface Quote {
  text: string
  author: string
  source: string
}

export const GARDEN_QUOTES: Quote[] = [
  { text: "One is nearer God's heart in a garden than anywhere else on earth.", author: "Dorothy Frances Gurney", source: "God's Garden" },
  { text: "We must cultivate our garden.", author: "Voltaire", source: "Candide" },
  { text: "The glory of gardening: hands in the dirt, head in the sun, heart with nature.", author: "Alfred Austin", source: "The Garden That I Love" },
  { text: "To plant a garden is to believe in tomorrow.", author: "Audrey Hepburn", source: "" },
  { text: "In the spring, at the end of the day, you should smell like dirt.", author: "Margaret Atwood", source: "Bluebeard's Egg" },
  { text: "What is a weed? A plant whose virtues have not yet been discovered.", author: "Ralph Waldo Emerson", source: "Fortune of the Republic" },
  { text: "Where you tend a rose, my lad, a thistle cannot grow.", author: "Frances Hodgson Burnett", source: "The Secret Garden" },
  { text: "If you have a garden and a library, you have everything you need.", author: "Cicero", source: "Ad Familiares IX, 4" },
  { text: "The earth laughs in flowers.", author: "Ralph Waldo Emerson", source: "Hamatreya" },
  { text: "A garden is a grand teacher. It teaches patience and careful watchfulness.", author: "Gertrude Jekyll", source: "Wood and Garden" },
  { text: "I know a bank where the wild thyme blows, / Where oxlips and the nodding violet grows.", author: "William Shakespeare", source: "A Midsummer Night's Dream" },
  { text: "Nature never did betray the heart that loved her.", author: "William Wordsworth", source: "Tintern Abbey" },
  { text: "To see a World in a Grain of Sand / And a Heaven in a Wild Flower.", author: "William Blake", source: "Auguries of Innocence" },
  { text: "I think that I shall never see / A poem lovely as a tree.", author: "Joyce Kilmer", source: "Trees" },
  { text: "All my hurts my garden spade can heal.", author: "Ralph Waldo Emerson", source: "Musketaquid" },
  { text: "God Almighty first planted a garden. And indeed it is the purest of human pleasures.", author: "Francis Bacon", source: "Of Gardens" },
  { text: "My garden is my most beautiful masterpiece.", author: "Claude Monet", source: "" },
  { text: "The love of gardening is a seed once sown that never dies.", author: "Gertrude Jekyll", source: "Wood and Garden" },
  { text: "When the world wearies and society fails to satisfy, there is always the garden.", author: "Minnie Aumonier", source: "" },
  { text: "The garden suggests there might be a place where we can meet nature halfway.", author: "Michael Pollan", source: "Second Nature" },
  { text: "Come forth into the light of things, let nature be your teacher.", author: "William Wordsworth", source: "The Tables Turned" },
  { text: "With freedom, flowers, books, and the moon, who could not be perfectly happy?", author: "Oscar Wilde", source: "De Profundis" },
  { text: "In every walk with nature one receives far more than he seeks.", author: "John Muir", source: "Steep Trails" },
  { text: "Life begins the day you start a garden.", author: "Chinese Proverb", source: "" },
  { text: "Where flowers bloom so does hope.", author: "Lady Bird Johnson", source: "" },
]

export const GARDEN_FACTS: string[] = [
  "Tampa Bay sits in USDA Hardiness Zone 9b\u201310a, meaning average winter lows rarely dip below 30\u00b0F \u2014 perfect for tropical and subtropical plants year-round.",
  "Coontie (Zamia integrifolia) is the only native cycad in North America and the sole host plant for the rare Atala butterfly.",
  "Tampa Bay's sandy, acidic soil drains quickly. Most native plants here have adapted to thrive in nutrient-poor conditions.",
  "The Southern magnolia can live for over 120 years and its flowers are among the most ancient on Earth.",
  "Florida has more native plant species (about 4,200) than any other state east of the Mississippi River.",
  "Saw palmettos can live for 500 to 700 years, making them among the longest-lived plants in the southeastern United States.",
  "Pollinators are responsible for one out of every three bites of food we eat.",
  "Tampa Bay's live oaks are semi-evergreen: they drop their old leaves in spring just as new ones emerge.",
  "The firebush (Hamelia patens) is one of the top butterfly-attracting plants in Florida, visited by at least 18 species of butterflies.",
  "Muhly grass puts on its spectacular pink-purple display in October and November.",
  "Lightning fixes atmospheric nitrogen into a form plants can absorb. Florida gets a natural fertilizer boost with every storm.",
  "A single mature live oak can transpire over 40,000 gallons of water per year.",
  "Native plants typically require 60% less water than non-native ornamentals once established.",
  "The average garden soil contains more living organisms in a single tablespoon than there are people on Earth.",
  "Coral honeysuckle is one of the best hummingbird plants for Tampa Bay \u2014 it blooms for months and never becomes invasive.",
  "Dragonflies are among the most efficient predators on Earth \u2014 they catch up to 95% of the prey they pursue.",
  "Butterfly gardens in Tampa should include both nectar plants (for adults) and host plants (for caterpillars).",
  "Tampa Bay receives about 46 inches of rain per year, with 60% falling between June and September.",
  "The term 'hammock' in Florida ecology refers to a dense stand of hardwood trees, not a hanging bed.",
  "Florida's native Beautyberry produces vivid purple fruit clusters that can be made into jelly.",
]

export function getDailyIndex(arrayLength: number, offset: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return (dayOfYear + offset) % arrayLength
}

export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const LAST_VISIT_KEY = 'garden-last-visit'
const ONE_HOUR_MS = 60 * 60 * 1000

export function shouldShowWelcome(): boolean {
  const last = localStorage.getItem(LAST_VISIT_KEY)
  if (!last) return true
  return Date.now() - parseInt(last, 10) > ONE_HOUR_MS
}

export function markVisit(): void {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString())
}
