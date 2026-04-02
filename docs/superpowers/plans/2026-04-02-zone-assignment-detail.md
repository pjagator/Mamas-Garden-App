# Zone Assignment from Detail View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users assign a plant to a garden zone via pill buttons in the ItemDetail sheet, creating a map placement at the center of the selected bed.

**Architecture:** Add zone pill selector UI to ItemDetail (matching existing location editor pattern). Garden page passes `placeItem` and `removePlacement` callbacks from `useGardenMap`. Zone tap handler manages place/move/remove logic with confirmation for moves.

**Tech Stack:** React + TypeScript, Tailwind CSS, Lucide icons

---

### Task 1: Add Zone Selector UI and Callbacks to ItemDetail

**Files:**
- Modify: `react-app/src/components/garden/ItemDetail.tsx`

- [ ] **Step 1: Add new props to ItemDetailProps**

In `react-app/src/components/garden/ItemDetail.tsx`, update the `ItemDetailProps` interface (lines 16-24). Add two new optional callback props after the `beds` prop:

```typescript
interface ItemDetailProps {
  item: InventoryItem | null
  open: boolean
  onClose: () => void
  onDelete: (id: string, imageUrl?: string | null) => void
  onUpdate?: (id: string, updates: Partial<InventoryItem>) => void
  placements?: GardenPlacement[]
  beds?: GardenBed[]
  onPlaceInZone?: (inventoryId: string, bedId: string, x: number, y: number) => Promise<{ error?: string }>
  onRemovePlacement?: (placementId: string) => Promise<void>
}
```

- [ ] **Step 2: Update the component signature**

Update line 45 to destructure the new props:

```typescript
export default function ItemDetail({ item, open, onClose, onDelete, onUpdate, placements, beds, onPlaceInZone, onRemovePlacement }: ItemDetailProps) {
```

- [ ] **Step 3: Add a `currentPlacement` derived value**

After the existing `zone` IIFE (line 68), add a derived value to find the plant's current placement and current bed:

```typescript
  const currentPlacement = placements?.find(p => p.inventory_id === item.id) ?? null
  const currentBed = currentPlacement?.bed_id ? beds?.find(b => b.id === currentPlacement.bed_id) ?? null : null
```

- [ ] **Step 4: Add the zone tap handler**

After the `toggleLocation` function (after line 95), add:

```typescript
  async function handleZoneTap(bed: GardenBed) {
    if (!item) return
    const centerX = bed.shape.x + bed.shape.width / 2
    const centerY = bed.shape.y + bed.shape.height / 2

    if (currentPlacement && currentPlacement.bed_id === bed.id) {
      // Tapping current zone — unassign
      await onRemovePlacement?.(currentPlacement.id)
      return
    }

    if (currentPlacement) {
      // Already placed elsewhere — confirm move
      const bedName = bed.name || 'this zone'
      if (!window.confirm(`Move ${displayName} to ${bedName}?`)) return
      await onRemovePlacement?.(currentPlacement.id)
    }

    // Place in new zone
    const result = await onPlaceInZone?.(item.id, bed.id, centerX, centerY)
    if (result?.error === 'duplicate') {
      // Already placed (race condition) — ignore silently
    }
  }
```

- [ ] **Step 5: Add the Garden Zone pill selector row in the JSX**

In the JSX, find the Location section (around lines 175-206). After the closing of the Location section (after line 206, before the `<InfoRow icon={Calendar}` on line 208), add the garden zone selector:

```tsx
            {/* Garden zone selector */}
            {beds && beds.length > 0 && onPlaceInZone && (
              <div className="py-2">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-sage flex-shrink-0" />
                  <p className="text-xs text-ink-light">Garden Zone</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {beds.map(bed => {
                    const active = currentBed?.id === bed.id
                    return (
                      <button key={bed.id} onClick={() => handleZoneTap(bed)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          active ? 'bg-sage text-white' : 'bg-cream-dark text-ink-mid'
                        }`}>
                        {bed.name || 'Unnamed zone'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
```

- [ ] **Step 6: Commit**

```bash
git add react-app/src/components/garden/ItemDetail.tsx
git commit -m "feat: add garden zone pill selector to ItemDetail sheet"
```

---

### Task 2: Wire Up Zone Callbacks in Garden Page

**Files:**
- Modify: `react-app/src/pages/Garden.tsx`

- [ ] **Step 1: Destructure `placeItem` and `removePlacement` from `useGardenMap`**

In `react-app/src/pages/Garden.tsx`, update line 21 to destructure the additional methods:

```typescript
  const { beds, placements, placeItem, removePlacement } = useGardenMap()
```

- [ ] **Step 2: Pass the new callbacks to ItemDetail**

Find the `<ItemDetail>` JSX (lines 170-181). Add the two new props:

```tsx
      <ItemDetail
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        onUpdate={(id, updates) => {
          updateItem(id, updates)
          if (selectedItem && selectedItem.id === id) setSelectedItem({ ...selectedItem, ...updates })
        }}
        placements={placements}
        beds={beds}
        onPlaceInZone={async (inventoryId, bedId, x, y) => {
          const result = await placeItem(inventoryId, x, y, bedId)
          if (result.error && result.error !== 'duplicate') {
            toast.error('Failed to place in zone')
          }
          return { error: result.error }
        }}
        onRemovePlacement={async (placementId) => {
          await removePlacement(placementId)
        }}
      />
```

- [ ] **Step 3: Commit**

```bash
git add react-app/src/pages/Garden.tsx
git commit -m "feat: wire zone assignment callbacks from Garden page to ItemDetail"
```

---

### Task 3: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PROJECT-STATE.md`

- [ ] **Step 1: Update CLAUDE.md**

In the React App section or wherever ItemDetail features are documented, note:
- ItemDetail now has a Garden Zone pill selector that lets users assign plants to garden beds
- Placing via the detail view creates a map placement at the center of the selected bed
- Plants can be moved between zones with confirmation, or unassigned by tapping the current zone

- [ ] **Step 2: Update PROJECT-STATE.md**

Add the zone assignment feature to the ItemDetail component description. Note that `onPlaceInZone` and `onRemovePlacement` are new optional props.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md PROJECT-STATE.md
git commit -m "docs: document zone assignment from detail view feature"
```
