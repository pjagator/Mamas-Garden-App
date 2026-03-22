# Architectural Patterns

## Client-Side State Management

All app state lives in module-level variables (`app.js:25-31`). `allInventory` is the single source of truth for inventory data -- loaded once from Supabase, patched locally on mutations, then re-rendered. There is no database polling; every write triggers `loadInventory()` which refreshes the cache and calls `renderInventory()` + `renderTimeline()`.

Pattern: mutate DB -> `loadInventory()` -> re-render all dependent views.

## Edge Function Communication

All edge functions are called via direct `fetch()` with the anon key in the Authorization header -- NOT `sb.functions.invoke()`. This was a deliberate decision after persistent JWT/EarlyDrop failures with the SDK method.

Pattern used everywhere (`app.js:219-229`, `app.js:630-644`):
```
fetch(SUPABASE_URL + '/functions/v1/<name>', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ... }),
})
```

Edge functions themselves follow a shared structure:
1. CORS preflight handler
2. Parse JSON body
3. Load secrets from `Deno.env.get()`
4. Call external API(s)
5. Return JSON with `corsHeaders`
6. Catch block returns `{ error: message }` with status 500

See `supabase/functions/garden-assistant/index.ts` for the canonical example.

## Supabase SDK Usage

Three distinct patterns for the three Supabase services:

- **Auth**: `sb.auth.*` methods directly (`app.js:58-112`)
- **Database**: `sb.from('inventory')` query builder with `.eq('user_id', currentUser.id)` for RLS (`app.js:403-412`, `app.js:530-541`)
- **Storage**: `sb.storage.from('garden-images').upload()` / `.getPublicUrl()` (`app.js:171-198`)

Database inserts that need the inserted row use `.select().single()` chained after `.insert()` (`app.js:316`, `app.js:392`).

## Modal Pattern

All modals share this structure:
- HTML: `.modal-overlay` > `.modal-sheet` with `onclick="closeModal('id')"` on overlay, `event.stopPropagation()` on sheet (`index.html:182-234`)
- Open: `openModal(id)` adds `.open` class, sets `body.overflow = 'hidden'`
- Close: `closeModal(id)` removes `.open` class, restores overflow
- Content: populated dynamically via `innerHTML` (not pre-rendered)

## Screen Navigation (SPA)

Single-page app with tab switching (`app.js:115-120`):
- Each screen is a `.screen` div, toggled by `.active-screen` class
- `showScreen(name, btnEl)` removes all active states, then activates the target
- Bottom nav buttons track active state independently
- CSS animation `screenIn` provides fade+slide transition (`style.css:242-245`)

## Expandable Sections Pattern

Used for Care Profile and Plant Status in the item detail modal:
1. Header div with title + toggle icon (arrow), clickable
2. Body div with `display:none` initially
3. Toggle function flips display and rotates icon text

Instances: `toggleCareProfile()` (`app.js:733`), `togglePlantStatus()` (`app.js:671`)

## Identification-to-Save Data Flow

```
Photo -> Canvas preview (max 900px)
  -> uploadTempImage (0.5 quality JPEG)
  -> Edge function: Plant.id -> [insect.id fallback] -> Claude enrichment
  -> renderIdCards (3 selectable cards, first auto-selected)
  -> User selects + adds notes
  -> saveSelectedId: uploadImage (0.82 quality) -> buildEntry -> DB insert
  -> Background: generateCareProfile (non-blocking)
```

Key: temp images use low quality for fast identification; final images use higher quality for the gallery.

## Error Handling

Three tiers:
1. **User-facing**: `alert()` for save/delete/auth errors with friendly messages
2. **Console**: `console.error()` for non-blocking failures (care profile generation, image deletion)
3. **UI state**: Error cards rendered inline for identification failures (`app.js:251-255`)

All async operations wrap in try/catch with button state management (disable + text change during operation, restore in `finally`).

## Native Plant Cross-Reference

`matchNative()` (`app.js:49-55`) checks both common and scientific names against the hardcoded `NATIVE_PLANTS` array. Used at two points:
1. During identification result processing (`app.js:235-244`) -- supplements API data
2. During manual entry (`app.js:366-377`) -- auto-fills missing fields

This is supplementary, not authoritative -- Plant.id/Claude results take precedence when available.

## CSS Design System

All colors, radii, fonts, and spacing defined as CSS custom properties (`style.css:4-25`). Components reference variables, never raw values. The three brand colors are:
- `--green-deep` (#1c3a2b): primary actions, headers, nav active state
- `--cream` (#f5f0e8): page background, card backgrounds
- `--terra` (#c4622d): errors, warnings, danger actions
