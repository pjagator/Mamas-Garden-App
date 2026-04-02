# Propagation Advice Feature — Design Spec

## Overview

A collapsible propagation advice section in both ItemDetail (garden plants) and WishlistDetail (friends). AI-generated advice tells the user the best way to propagate a given species, with contextual tips based on the plant's garden placement when available.

## User Stories

- As a gardener viewing a plant, I want to see how to propagate it so I can grow more of it.
- As a gardener with a mapped garden, I want propagation advice that accounts for where my plant is placed (sun, soil, moisture, wind).
- As a gardener browsing friends (wishlist), I want generic propagation advice for species I'm interested in growing.

## UI Design

### Placement

- **ItemDetail**: Below the Care Quick Reference section, above Health History.
- **WishlistDetail**: Below the description/notes, above "Where would this friend thrive?"

### Collapsed State (default)

A single-row card matching the app's white card system (14px radius, consistent shadow):
- Left: Lucide `Sprout` icon + "Propagation" label
- Right: Badge previewing the best method (e.g. "Stem cuttings") + Lucide `ChevronDown` icon
- If no cached data yet: badge shows "Tap to learn" instead of method name

### Expanded State

On tap, the card expands (with animation) to show:

1. **Best Method** — e.g. "Stem cuttings", "Seed", "Division", "Layering"
2. **When to Propagate** — timing advice specific to Tampa Bay climate, e.g. "Late spring through early summer, when new growth is actively pushing"
3. **Steps** — 3-5 numbered steps with terracotta (#c4622d) step numbers
4. **For Your Garden** (inventory plants with map placement only) — a warm cream callout box (background: #f0ebe3, left border: 3px solid #c4622d) with contextual advice based on the plant's zone properties. Omitted for friends and for plants not placed on the map.

### Loading State

When generating for the first time, the expanded area shows the app's existing loading dots pattern with text "Generating propagation advice..."

### Regenerate

A small "Regenerate" text button (not prominent) at the bottom of the expanded section. Useful when a plant has been moved to a different zone. Overwrites the cached data.

## Data Model

### New TypeScript Interface

```typescript
export interface PropagationAdvice {
  method: string           // e.g. "Stem cuttings"
  timing: string           // e.g. "Late spring through early summer"
  steps: string[]          // 3-5 step strings
  garden_tip: string | null // Placement-aware tip, null if no placement
}
```

### Database Changes

**`inventory` table** — add column:
- `propagation_advice` JSONB, nullable, default null

**`wishlist` table** — add column:
- `propagation_advice` JSONB, nullable, default null

No new RLS policies needed — existing row-level policies on both tables already cover read/write for the user's own rows.

### Caching Strategy

- First expand of the propagation section triggers an API call if `propagation_advice` is null.
- Response is saved to the `propagation_advice` column on the item.
- Subsequent views read from the cached column — no API call.
- "Regenerate" button clears the cache and re-fetches.
- When a plant is moved to a different zone on the map, the cached advice is NOT automatically invalidated (user can tap Regenerate if they want updated zone-aware tips).

## API Design

### New Action on `garden-assistant` API Route

**Action**: `propagation`

**Request body**:
```json
{
  "action": "propagation",
  "data": {
    "common": "Firebush",
    "scientific": "Hamelia patens",
    "type": "plant",
    "category": "Shrub",
    "zone": {
      "sun_exposure": "full_sun",
      "soil_type": "sandy",
      "moisture_level": "dry",
      "wind_exposure": "moderate"
    }
  }
}
```

The `zone` field is included only for inventory plants that have a map placement with a bed. For friends and unplaced plants, `zone` is omitted.

**Response**:
```json
{
  "propagation": {
    "method": "Stem cuttings",
    "timing": "Late spring through early summer, when new growth is actively pushing",
    "steps": [
      "Take 4-6 inch cuttings from semi-hardwood stems",
      "Remove lower leaves, dip in rooting hormone",
      "Plant in moist perlite/sand mix, keep humid",
      "Roots in 3-4 weeks; transplant when established"
    ],
    "garden_tip": "Your firebush is in a full-sun bed with sandy soil — cuttings will root faster with partial shade while establishing. Move to full sun once roots are 2 inches long."
  }
}
```

**Model**: Claude Haiku (`claude-haiku-4-5-20251001`) — same as care profiles and reminders.

**System prompt**: "You are a Tampa Bay, Florida (USDA Zone 9b-10a) garden propagation expert."

**User prompt** includes: species name, scientific name, category/type, and zone properties if available. Instructs the model to return JSON matching the `PropagationAdvice` shape.

## Component Design

### New Component: `PropagationCard`

**File**: `react-app/src/components/garden/PropagationCard.tsx`

**Props**:
```typescript
interface PropagationCardProps {
  item: InventoryItem | WishlistItem
  zone?: {  // Only passed for placed inventory items
    sun_exposure: SunExposure | null
    soil_type: SoilType | null
    moisture_level: MoistureLevel | null
    wind_exposure: WindExposure | null
  }
  onUpdate: (advice: PropagationAdvice) => void  // Saves to DB
}
```

**Behavior**:
- Only renders for plants (`item.type === 'plant'`). Hidden for bugs/insects.
- Renders collapsed by default
- On first expand: if `item.propagation_advice` is null, calls the API, shows loading state, saves result via `onUpdate`
- On subsequent expands: reads from `item.propagation_advice`
- Chevron rotates on expand/collapse (matches existing PlantCareCard pattern)
- "For Your Garden" callout only renders when `propagation_advice.garden_tip` is not null

### Integration Points

**ItemDetail.tsx**: Add `<PropagationCard>` below Care Quick Reference. Pass the item, zone data (looked up from placements + beds), and an `onUpdate` handler that calls `updateItem`.

**WishlistDetail.tsx**: Add `<PropagationCard>` below description/notes section. Pass the wishlist item (no zone), and an `onUpdate` handler that calls the wishlist update function.

**Zone Lookup for Inventory Items**: When rendering PropagationCard in ItemDetail, look up the plant's placement → bed → zone properties. This data is already available through `useGardenMap` (placements and beds are loaded). Pass the bed's zone properties as the `zone` prop.

## Files Changed

1. `react-app/src/types/index.ts` — add `PropagationAdvice` interface, add `propagation_advice` field to `InventoryItem` and `WishlistItem`
2. `react-app/api/garden-assistant.ts` — add `propagation` action handler
3. `react-app/src/components/garden/PropagationCard.tsx` — new component
4. `react-app/src/components/garden/ItemDetail.tsx` — integrate PropagationCard
5. `react-app/src/components/wishlist/WishlistDetail.tsx` — integrate PropagationCard
6. SQL migration — add `propagation_advice` JSONB column to `inventory` and `wishlist` tables

## Out of Scope

- Auto-invalidating cache when a plant is moved to a different zone
- Propagation advice for bugs/insects (only plants)
- Propagation tracking or logging (e.g. "I took 5 cuttings on March 1")
