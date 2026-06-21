# Duplicate-Species Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a calm, info-only banner at capture time when the species being saved is already in the garden, so duplicates are a deliberate choice rather than an accident.

**Architecture:** One pure matching helper (`findExistingMatches`) and one shared presentational banner (`DuplicateNotice`), wired into the three save surfaces: the AI-results screen and the in-sheet manual mode (both in `CaptureSheet.tsx`), and the standalone `ManualEntry.tsx`. No DB, API, or edge-function changes.

**Tech Stack:** React + TypeScript + Vite, Tailwind, lucide-react icons, shadcn/ui. Tests with vitest (already configured in `react-app/package.json`).

**Spec:** `docs/superpowers/specs/2026-06-20-duplicate-species-awareness-design.md`

**Working directory:** All paths are relative to `react-app/`. Run all commands from `react-app/`.

---

### Task 1: `findExistingMatches` matching helper (TDD)

Matches a candidate species against the garden inventory by normalized scientific OR common name. Generic over the item type so tests can pass minimal objects while callers pass full `InventoryItem`s.

**Files:**
- Modify: `react-app/src/lib/constants.ts` (add export at end, after `matchNative`)
- Test: `react-app/src/lib/constants.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `react-app/src/lib/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { findExistingMatches } from './constants'

type TestItem = { common?: string | null; scientific?: string | null }

const garden: TestItem[] = [
  { common: 'Firebush', scientific: 'Hamelia patens' },
  { common: 'Coontie', scientific: 'Zamia integrifolia' },
]

describe('findExistingMatches', () => {
  it('matches on exact scientific name', () => {
    const result = findExistingMatches({ common: 'Scarlet bush', scientific: 'Hamelia patens' }, garden)
    expect(result).toHaveLength(1)
    expect(result[0].common).toBe('Firebush')
  })

  it('matches on common name when scientific differs', () => {
    const result = findExistingMatches({ common: 'Firebush', scientific: '' }, garden)
    expect(result).toHaveLength(1)
    expect(result[0].scientific).toBe('Hamelia patens')
  })

  it('normalizes case and whitespace', () => {
    const result = findExistingMatches({ common: '  fire  bush ', scientific: 'HAMELIA   PATENS' }, garden)
    // common "fire bush" != "firebush", but scientific normalizes to "hamelia patens"
    expect(result).toHaveLength(1)
  })

  it('returns empty when nothing matches', () => {
    expect(findExistingMatches({ common: 'Beautyberry', scientific: 'Callicarpa americana' }, garden)).toHaveLength(0)
  })

  it('never matches on empty/blank names', () => {
    const withBlank: TestItem[] = [{ common: '', scientific: '' }]
    expect(findExistingMatches({ common: '', scientific: '' }, withBlank)).toHaveLength(0)
    expect(findExistingMatches({ common: '   ', scientific: null }, garden)).toHaveLength(0)
  })

  it('returns all matches when several exist', () => {
    const dupes: TestItem[] = [
      { common: 'Firebush', scientific: 'Hamelia patens' },
      { common: 'Firebush', scientific: 'Hamelia patens' },
    ]
    expect(findExistingMatches({ common: 'Firebush', scientific: 'Hamelia patens' }, dupes)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/constants.test.ts`
Expected: FAIL — `findExistingMatches` is not exported from `./constants`.

- [ ] **Step 3: Write minimal implementation**

Append to the end of `react-app/src/lib/constants.ts`:

```ts
function normalizeName(name?: string | null): string {
  return (name ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function findExistingMatches<T extends { common?: string | null; scientific?: string | null }>(
  candidate: { common?: string | null; scientific?: string | null },
  items: T[],
): T[] {
  const cSci = normalizeName(candidate.scientific)
  const cCommon = normalizeName(candidate.common)
  return items.filter(item => {
    const iSci = normalizeName(item.scientific)
    const iCommon = normalizeName(item.common)
    if (cSci && iSci && cSci === iSci) return true
    if (cCommon && iCommon && cCommon === iCommon) return true
    return false
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/constants.test.ts`
Expected: PASS — 6 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/lib/constants.test.ts
git commit -m "feat: findExistingMatches helper for duplicate-species detection"
```

---

### Task 2: `DuplicateNotice` banner component

Shared, dumb presentational banner. Renders nothing when there are no matches.

**Files:**
- Create: `react-app/src/components/capture/DuplicateNotice.tsx`

- [ ] **Step 1: Create the component**

Create `react-app/src/components/capture/DuplicateNotice.tsx`:

```tsx
import { Sprout } from 'lucide-react'
import type { InventoryItem } from '@/types'

function relativeDate(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) { const m = Math.round(days / 30); return `${m} month${m > 1 ? 's' : ''} ago` }
  const y = Math.round(days / 365); return `${y} year${y > 1 ? 's' : ''} ago`
}

export default function DuplicateNotice({ matches }: { matches: InventoryItem[] }) {
  if (!matches.length) return null
  const common = matches[0].common || 'this species'
  const count = matches.length
  const when = count === 1 ? relativeDate(matches[0].date) : ''
  const detail = count === 1
    ? `1 in your garden${when ? ` · added ${when}` : ''}`
    : `${count} in your garden`

  return (
    <div className="flex items-start gap-2 rounded-[--radius-card] border border-terra/40 bg-terra/10 p-4 mb-3">
      <Sprout size={18} className="text-terra flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-terra">You already grow {common}</p>
        <p className="text-xs text-ink-mid mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc -b`
Expected: no errors. (If `InventoryItem` has no `date` field, confirm the field name in `src/types` and adjust `matches[0].date` accordingly — per the schema it is `date`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/capture/DuplicateNotice.tsx
git commit -m "feat: DuplicateNotice banner component"
```

---

### Task 3: Wire banner into the AI-results screen (`CaptureSheet.tsx`)

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Add imports**

On line 10, change:

```ts
import { matchNative, PRESET_TAGS } from '@/lib/constants'
```
to:
```ts
import { matchNative, PRESET_TAGS, findExistingMatches } from '@/lib/constants'
```

After the `import ImageCropper from './ImageCropper'` line (line 17), add:

```ts
import DuplicateNotice from './DuplicateNotice'
```

- [ ] **Step 2: Pull `items` from the inventory hook**

On line 118, change:

```ts
  const { insertItem } = useInventory()
```
to:
```ts
  const { insertItem, items } = useInventory()
```

- [ ] **Step 3: Compute derived matches before the return**

Immediately before the `return (` of the component's JSX (the `return` that renders `<Sheet ...>`), add these derived values:

```ts
  const aiCandidate = results[selectedIndex]
  const aiMatches = aiCandidate ? findExistingMatches(aiCandidate, items) : []
  const manualMatches = (manualCommon.trim() || manualScientific.trim())
    ? findExistingMatches({ common: manualCommon, scientific: manualScientific }, items)
    : []
```

- [ ] **Step 4: Render the banner + relabel the Garden button in the AI-results block**

In the block beginning `{step === 'results' && results.length > 0 && !showSpottedPrompt && !manualMode && (` (line 634), replace:

```tsx
          <div className="space-y-3 mt-4">
            {results.map((r, i) => (
              <IdResultCard key={i} result={r} selected={selectedIndex === i} onSelect={() => setSelectedIndex(i)} />
            ))}
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} className="mt-3" />
            <div className="flex gap-3 mt-3">
              <Button onClick={() => handleSave('garden')} className="flex-1" size="lg">
                <Leaf size={18} className="mr-2" /> Add to Garden
              </Button>
```
with:
```tsx
          <div className="space-y-3 mt-4">
            <DuplicateNotice matches={aiMatches} />
            {results.map((r, i) => (
              <IdResultCard key={i} result={r} selected={selectedIndex === i} onSelect={() => setSelectedIndex(i)} />
            ))}
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} className="mt-3" />
            <div className="flex gap-3 mt-3">
              <Button onClick={() => handleSave('garden')} className="flex-1" size="lg">
                <Leaf size={18} className="mr-2" /> {aiMatches.length ? 'Add another to Garden' : 'Add to Garden'}
              </Button>
```

(Leave the "Save as Friend" / wishlist button unchanged.)

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/capture/CaptureSheet.tsx
git commit -m "feat: duplicate banner + smart Garden button on AI results"
```

---

### Task 4: Wire banner into the in-sheet manual mode (`CaptureSheet.tsx`)

**Files:**
- Modify: `react-app/src/components/capture/CaptureSheet.tsx`

- [ ] **Step 1: Render the banner + relabel in the manual-mode results block**

In the block beginning `{step === 'results' && manualMode && !showSpottedPrompt && (` (line 658), replace:

```tsx
          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <Input
                value={manualCommon}
                onChange={e => setManualCommon(e.target.value)}
                placeholder="Common name *"
                className="text-sm"
                autoFocus
              />
              <Input
                value={manualScientific}
                onChange={e => setManualScientific(e.target.value)}
                placeholder="Scientific name (optional)"
                className="text-sm"
              />
            </div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} />
            <div className="flex gap-3">
              <Button onClick={() => handleManualSave('garden')} className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                <Leaf size={18} className="mr-2" /> Add to Garden
              </Button>
```
with:
```tsx
          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <Input
                value={manualCommon}
                onChange={e => setManualCommon(e.target.value)}
                placeholder="Common name *"
                className="text-sm"
                autoFocus
              />
              <Input
                value={manualScientific}
                onChange={e => setManualScientific(e.target.value)}
                placeholder="Scientific name (optional)"
                className="text-sm"
              />
            </div>
            <DuplicateNotice matches={manualMatches} />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes (optional)..." rows={2} />
            <div className="flex gap-3">
              <Button onClick={() => handleManualSave('garden')} className="flex-1" size="lg" disabled={!manualCommon.trim()}>
                <Leaf size={18} className="mr-2" /> {manualMatches.length ? 'Add another to Garden' : 'Add to Garden'}
              </Button>
```

(Leave the "Save as Friend" / wishlist button unchanged.)

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/capture/CaptureSheet.tsx
git commit -m "feat: duplicate banner in CaptureSheet manual mode"
```

---

### Task 5: Wire banner into the standalone `ManualEntry.tsx`

**Files:**
- Modify: `react-app/src/components/capture/ManualEntry.tsx`

- [ ] **Step 1: Add imports**

On line 10, change:

```ts
import { matchNative, PRESET_TAGS } from '@/lib/constants'
```
to:
```ts
import { matchNative, PRESET_TAGS, findExistingMatches } from '@/lib/constants'
```

After line 11 (`import { useInventory } from '@/hooks/useInventory'`), add:

```ts
import DuplicateNotice from './DuplicateNotice'
```

- [ ] **Step 2: Pull `items` from the inventory hook**

On line 21, change:

```ts
  const { insertItem } = useInventory()
```
to:
```ts
  const { insertItem, items } = useInventory()
```

- [ ] **Step 3: Compute matches before the return**

Immediately before the `return (` (line 94, the one rendering `<Sheet ...>`), add:

```ts
  const matches = (common.trim() || scientific.trim())
    ? findExistingMatches({ common, scientific }, items)
    : []
```

- [ ] **Step 4: Render the banner and relabel the submit button**

Replace the submit button (lines 136-138):

```tsx
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? 'Saving...' : 'Add to Garden'}
          </Button>
```
with:
```tsx
          <DuplicateNotice matches={matches} />
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? 'Saving...' : matches.length ? 'Add another to Garden' : 'Add to Garden'}
          </Button>
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/capture/ManualEntry.tsx
git commit -m "feat: duplicate banner in standalone manual entry"
```

---

### Task 6: Full build, manual verification, and docs

**Files:**
- Modify: `PROJECT-STATE.md`, `CLAUDE.md` (repo root)

- [ ] **Step 1: Run the full test + build**

Run: `npx vitest run && npx tsc -b && npm run build`
Expected: tests pass, no type errors, build succeeds.

- [ ] **Step 2: Manual verification (390px viewport / iPhone Safari)**

Run `npm run dev`, open at a 390px width, sign in, and confirm:
- Capture a photo of a species already in the garden → results screen shows the terracotta "You already grow {name}" banner and the Garden button reads "Add another to Garden".
- Tap a different (non-duplicate) candidate → banner disappears and the button reverts to "Add to Garden".
- In capture, tap "Not right? Enter name manually", type the name of an existing plant → banner appears; type a novel name → banner clears.
- Open the standalone "Add Manually" sheet, type an existing name → banner appears.
- Saving a duplicate still works and adds a second copy (no block).

- [ ] **Step 3: Update documentation**

In `PROJECT-STATE.md`, add `DuplicateNotice.tsx` to the capture components list and note `findExistingMatches` in `lib/constants.ts`. In `CLAUDE.md`, under "Capture & Identification (React App)", add a bullet:

```
- **Duplicate awareness**: When the selected ID candidate (or a typed manual name) matches an existing garden item by normalized scientific OR common name, a terracotta `DuplicateNotice` banner appears ("You already grow X — N in your garden") and the Garden save button relabels to "Add another to Garden". Matching is `findExistingMatches()` in `lib/constants.ts`; multiples are still allowed. Banner shows on the AI-results screen, in-sheet manual mode, and the standalone ManualEntry sheet.
```

- [ ] **Step 4: Commit**

```bash
git add PROJECT-STATE.md CLAUDE.md
git commit -m "docs: document duplicate-species awareness feature"
```

---

## Self-Review Notes

- **Spec coverage:** matching helper (Task 1), banner component (Task 2), AI-results surface (Task 3), in-sheet manual surface (Task 4), standalone manual surface (Task 5), wishlist saves show banner via shared component on each screen (the "Save as Friend" buttons sit below the banner, unchanged — banner is target-agnostic), testing + docs (Tasks 1 & 6). Garden-vs-wishlist: banner renders regardless of which save button is pressed because it's placed above both buttons on every surface. ✓
- **Placeholders:** none — all code shown in full.
- **Type consistency:** `findExistingMatches` is generic; `DuplicateNotice` takes `{ matches: InventoryItem[] }`; both consumers pass `InventoryItem[]` from `useInventory().items`. The candidate arg accepts `{ common?, scientific? }`, satisfied by both `IdResult` and the manual `{ common, scientific }` literals. ✓
- **Risk note:** confirm `InventoryItem` has a `date` field (per DB schema it does); if the type uses a different property name, adjust `matches[0].date` in `DuplicateNotice`.
