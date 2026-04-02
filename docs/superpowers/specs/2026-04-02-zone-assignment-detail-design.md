# Zone Assignment from Plant Detail — Design Spec

## Overview

Add pill-style zone selector buttons to the plant detail sheet (ItemDetail), letting users assign a plant to a garden bed directly from the detail view. This creates or moves a map placement at the center of the selected bed, so the plant also appears on the garden map canvas.

## User Stories

- As a gardener viewing a plant, I want to assign it to a garden zone without leaving the detail sheet.
- As a gardener who assigned a plant to the wrong zone, I want to move it to a different zone with a confirmation step.
- As a gardener, I want to unassign a plant from a zone by tapping the currently-selected zone pill.

## UI Design

### Placement

In the Info Rows section of ItemDetail, near the existing Location row. A new "Garden Zone" row with pill-style toggle buttons showing the user's garden bed names.

### Behavior

- **No placement yet:** Tapping a zone pill immediately creates a new placement at the center of the bed.
- **Already placed, tapping a different zone:** Shows `window.confirm("Move [plant name] to [new zone]?")` before moving the plant to the center of the new bed.
- **Tapping the currently-selected zone:** Removes the placement (unassigns the plant from the map). No confirmation needed.
- **No map or no beds:** The zone selector row is hidden entirely.

### Visual Pattern

Matches the existing location editor in ItemDetail — pill-shaped buttons with active/inactive states:
- Active: `bg-sage text-white`
- Inactive: `bg-cream-dark text-ink-mid`

The zone row is always visible (not behind an edit toggle) since this is a primary action, not metadata editing.

### Center-of-bed Positioning

When placing or moving a plant, the (x, y) coordinates are calculated as the center of the bed's shape:
- `x = bed.shape.x + bed.shape.width / 2`
- `y = bed.shape.y + bed.shape.height / 2`

## Data Flow

### Read

- `placements` and `beds` are already passed to ItemDetail as props.
- The current zone is derived by finding the plant's placement in `placements` and looking up its `bed_id`.

### Write

Three operations, passed as callbacks from the Garden page:

1. **Place in zone** — calls `useGardenMap.placeItem(inventoryId, centerX, centerY, bedId)` to create a new `garden_placements` row.
2. **Move to zone** — calls `useGardenMap.removePlacement(oldPlacementId)` then `useGardenMap.placeItem(inventoryId, centerX, centerY, newBedId)` to relocate.
3. **Remove from zone** — calls `useGardenMap.removePlacement(placementId)` to delete the placement.

## Interface Changes

### ItemDetailProps — New Callbacks

```typescript
onPlaceInZone?: (inventoryId: string, bedId: string, x: number, y: number) => Promise<void>
onRemovePlacement?: (placementId: string) => Promise<void>
```

### Garden.tsx — Wiring

Garden page already has `useGardenMap()` with `placeItem`, `movePlacement`, and `removePlacement`. Wire these into the new ItemDetail callbacks. The move operation is a remove + place sequence, handled inside ItemDetail's zone tap handler.

## Files Changed

1. `react-app/src/components/garden/ItemDetail.tsx` — add zone pill selector UI, zone tap handler with place/move/remove logic
2. `react-app/src/pages/Garden.tsx` — pass new callbacks to ItemDetail

## Out of Scope

- Zone assignment for wishlist/friends (they're not on the map)
- Creating new beds from the detail view
- Showing bed properties (sun, soil) in the pills — just bed names
- Drag-to-reposition from the detail view (use the Map page for that)
