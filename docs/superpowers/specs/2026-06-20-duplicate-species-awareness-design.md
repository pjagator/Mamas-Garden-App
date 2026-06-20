# Duplicate-Species Awareness at Capture — Design

**Date:** 2026-06-20
**App:** React app (`firebush` branch, `react-app/`)
**Status:** Approved design, pending implementation plan

## Problem

When cataloging plants, it's easy to add a species that's already in the garden without realizing it. The primary user (an English teacher, non-technical) experiences the app as a garden journal, not a database, and has no quick signal that "you already grow this." The goal is to make duplication a **deliberate choice rather than an accident** — multiples are still allowed and common (she may genuinely have three firebushes).

## Goal & Non-Goals

**Goal:** At the moment of saving a newly captured/identified plant, surface a calm, journal-like notice when that species is already in the garden.

**Non-goals:**
- Not a hard block — saving multiples remains a one-tap action.
- No navigation to the existing plant ("View it" was considered and dropped for simplicity).
- No inline "peek" preview of the existing plant.
- No wishlist-duplicate detection (matching is against garden inventory only).
- No database or API/edge-function changes.
- No Garden-list grouping/counts (capture-time only; a possible future enhancement).

## User Decisions (captured during brainstorming)

1. **Primary moment:** Warn at capture time (not Garden-list counts).
2. **Match key:** Scientific name **OR** common name.
3. **Warning style:** Banner with a short note (option B), refined to **info-only** (no action buttons).
4. **"View it" behavior:** Dropped — info-only banner, no navigation.
5. **Manual entry:** Banner appears in **both** the AI-results flow and the manual-entry flow.
6. **Wishlist:** Banner appears for **both** garden and wishlist saves.

## Matching Logic

A pure helper added alongside `matchNative` in `react-app/src/lib/constants.ts`:

```
findExistingMatches(candidate, items) -> InventoryItem[]
```

- **Normalize** a name with: lowercase, trim, collapse internal whitespace to a single space.
- A candidate matches an existing item when:
  - normalized `scientific` names are equal AND both are non-empty, **OR**
  - normalized `common` names are equal AND both are non-empty.
- Returns **all** matching inventory items (gives both the count and the earliest/representative record for its `date`).
- Matches against the garden inventory only (`items` from `useInventory()`), regardless of save target.
- Empty/whitespace-only names never match (guard against `'' === ''`).

This helper is the single source of truth for "is this already in the garden" and is consumed by both surfaces below.

## Surfaces

### 1. AI identification results (`CaptureSheet.tsx`)

- Compute matches for the **currently selected** candidate (`results[selectedIndex]`) against `items`.
- When matches exist, render the banner directly above the result cards.
- The banner updates dynamically as the user taps between candidates; it disappears if the selected candidate is not a duplicate.
- **Save button:** when the selected candidate is a duplicate, the Garden save button relabels from "Add to Garden" → **"Add another to Garden"**. The Wishlist button keeps its label (the banner already carries the signal).

### 2. Manual entry (`ManualEntry.tsx`)

- As the user types/edits the common or scientific name, compute matches against `items`.
- Render the same banner component within the manual-entry form when a match is found (evaluated on the current field values; re-checks as they type).
- Save proceeds normally; the relabel behavior is optional here and may be omitted if the manual-entry save control doesn't share the results-screen button.

## Banner Component

A small, reusable presentational component (e.g. `DuplicateNotice`) so both surfaces share identical look and copy.

- **Style:** soft terracotta/amber callout consistent with the "Botanical Journal" aesthetic (forest green text accents, cream/terracotta tokens, 14px-ish radius, card padding ≥16px). Mobile-first, full-width within the sheet, no horizontal overflow at 390px.
- **Icon:** lucide-react `Sprout` (SVG). **No emoji** — per project standard, the brainstorm mockup's ♥/✓ glyphs are replaced with SVG icons.
- **Copy:**
  - Title: `You already grow {common}` (uses the matched item's common name; falls back to the candidate's).
  - Detail, one match: `1 in your garden · added {relative date}` (relative date derived from the matched item's `date`).
  - Detail, multiple matches: `{n} in your garden`.
- **Props:** `matches: InventoryItem[]` (and/or a precomputed `{ commonName, count, addedDate }`), keeping the component dumb and testable.
- Touch/readability: body text ≥16px where it's primary copy; ≥14px for secondary detail; line-height ≥1.5.

## Data Flow

1. `CaptureSheet` / `ManualEntry` already have access to garden inventory via `useInventory()` (`items`).
2. On candidate selection (or name edit), call `findExistingMatches(candidate, items)`.
3. If non-empty → render `DuplicateNotice` with the matches; adjust the Garden save label.
4. Save flow is unchanged — the existing `handleSave('garden' | 'wishlist')` path runs as today.

## Edge Cases

- **Case/whitespace variants** ("Firebush " vs "firebush") — handled by normalization.
- **Empty names** — never match.
- **Scientific match but different common name** (AI drift) — still flagged via the scientific-name branch; banner shows the existing item's common name for familiarity.
- **Multiple existing matches** — count reflects all; date detail omitted (only shown for the single-match case).
- **Switching candidates** — banner and button label recompute from the selected candidate each render.

## Testing

The project currently has **no test runner**. `findExistingMatches` is a pure function, which makes it the one piece worth a real test.

**Plan:** add a minimal `vitest` setup scoped to this helper (or, if we want to avoid adding tooling, verify manually). Cases to cover:
- exact scientific match → found
- exact common match (different scientific) → found
- whitespace/case variant → found (normalization)
- no match → empty
- empty candidate names → empty (no false match)

Manual end-to-end verification on a 390px viewport: capture a species already in the garden, confirm the banner + relabel; switch to a non-duplicate candidate, confirm both clear; repeat via manual entry and via a wishlist save.

## Files Touched

- `react-app/src/lib/constants.ts` — add `findExistingMatches` (pure helper).
- `react-app/src/components/capture/DuplicateNotice.tsx` — new shared banner component.
- `react-app/src/components/capture/CaptureSheet.tsx` — compute matches for selected candidate, render banner, relabel Garden save button.
- `react-app/src/components/capture/ManualEntry.tsx` — compute matches on entered name, render banner.
- (Optional) `react-app/src/lib/constants.test.ts` + `vitest` dev setup — helper tests.

No changes to Supabase tables, RLS, edge functions, or Vercel API routes.
