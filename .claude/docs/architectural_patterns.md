# Architectural Patterns

## Client-Side State Management

All app state lives in module-level variables (`app.js:25-31`). `allInventory` is the single source of truth for inventory data -- loaded once from Supabase, patched locally on mutations, then re-rendered. There is no database polling; every write triggers `loadInventory()` which refreshes the cache and calls `renderInventory()` + `renderTimeline()`.

Inventory data is also cached in localStorage (`garden-inventory-cache`). On app load, `loadInventory()` renders from cache first (instant), then refreshes from Supabase in background. Cache is invalidated automatically after writes.

Pattern: mutate DB -> `loadInventory()` -> re-render all dependent views.

## Edge Function Communication

All edge functions are called via direct `fetch()` with the anon key in the Authorization header -- NOT `sb.functions.invoke()`. This was a deliberate decision after persistent JWT/EarlyDrop failures with the SDK method.

Pattern used everywhere:
```
resilientFetch(SUPABASE_URL + '/functions/v1/<name>', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ... }),
}, { retries: 2, timeoutMs: 15000 })
```

All edge function calls go through `resilientFetch()` from `network.js` — configurable retries, exponential backoff, AbortController timeout. The edge functions themselves also have `fetchWithRetry()` for Claude API calls.

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
  -> resilientFetch to identify-species edge function (30s timeout, 2 retries)
  -> renderIdCards (3 selectable cards, first auto-selected)
  -> User selects + adds notes
  -> saveSelectedId: uploadImage (0.82 quality) -> buildEntry -> DB insert
  -> Background: generateCareProfile via resilientFetch (non-blocking)
```

Key: temp images use low quality for fast identification; final images use higher quality for the gallery.

## Error Handling

Four tiers:
1. **User-facing**: `alert()` for save/delete/auth errors with friendly messages
2. **Console**: `console.error()` for non-blocking failures (care profile generation, image deletion)
3. **UI state**: Error cards rendered inline for identification failures (`app.js:251-255`)
4. **Connection awareness**: `isOnline()` check before write operations shows friendly offline messages. Connection toast bar for online/offline transitions.

All async operations wrap in try/catch with button state management (disable + text change during operation, restore in `finally`).

Edge function errors are mapped to friendly messages in `capture.js` via `friendlyError()` — overloaded, no species found, image issues, and session errors get human-readable explanations.

## Native Plant Cross-Reference

`matchNative()` (`app.js:49-55`) checks both common and scientific names against the hardcoded `NATIVE_PLANTS` array. Used at two points:
1. During identification result processing (`app.js:235-244`) -- supplements API data
2. During manual entry (`app.js:366-377`) -- auto-fills missing fields

This is supplementary, not authoritative -- Plant.id/Claude results take precedence when available.

## Network Resilience

`js/network.js` is a standalone utility (no imports from app.js):
- `resilientFetch(url, options, config)` — drop-in `fetch()` replacement with retries (default 2), exponential backoff (1s, 2s, 4s, max 8s), and AbortController timeout (default 15s)
- `isOnline()` — tracks `navigator.onLine` state
- `onConnectionChange(fn)` — subscribe to online/offline events, returns unsubscribe function

Offline behavior:
- Write operations (identify, save, diagnose): check `isOnline()`, show friendly alert, return early
- Read operations: work from localStorage cache + service worker image cache
- FAB: disabled via `.fab-offline` CSS class (not inline styles, to avoid scroll handler conflicts)

## React App: Shared Inventory State via Context

`useInventory()` is a **context-backed hook**, not a standalone hook. The module in `react-app/src/hooks/useInventory.ts` exports:

- `useInventoryState()` — private, the actual `useState` + Supabase loader + CRUD callbacks
- `InventoryProvider` — wraps children, calls `useInventoryState()` once, publishes via `InventoryContext`
- `useInventory()` — calls `useContext(InventoryContext)`, throws if no provider

`AppShell.tsx` wraps everything below the auth gate in `<InventoryProvider>`. That means `CaptureSheet` (rendered at shell level) and the route pages (Garden, Map, Timeline, Wishlist, Settings) all share **one** items array. An insert from CaptureSheet is immediately visible to Garden without a refetch; similarly for updates and deletes from ItemDetail.

**Why this pattern exists:** early versions had each consumer call `useInventory()` directly, which gave each its own isolated `useState`. CaptureSheet's inserts only updated its own throwaway state — the DB row was written fine, but Garden's separate state never learned about it until a hard reload. The context lift was the minimal fix and requires no call-site changes at any consumer.

**When adding a new consumer:** just call `useInventory()`. Make sure the component is rendered inside the `InventoryProvider` subtree (everything under `AppShell` already is). Don't call `useInventoryState` directly — it's intentionally not exported.

## React App: Garden Page Filter Data Flow

The Garden page combines data from two hooks to power zone filtering:
- `useInventory()` — provides plant/insect items with their `location` field (shared via context, see above)
- `useGardenMap()` — provides `beds` (garden zones) and `placements` (which items are placed in which zones)

Filter chain in `Garden.tsx` via `useMemo`:
```
items → applyFilter(type) → applyLocationFilter(location) → applyZoneFilter(zone, placements, beds) → applySearch(query) → applySort(sort)
```

`applyZoneFilter()` works by finding all placements with matching `bed_id`, collecting their `inventory_id` values, and filtering items to that set. This bridges the map's spatial data with the inventory list.

Zone filter state (`zone`) is ephemeral — resets on page reload, not persisted to localStorage.

## React App: GardenCanvas Ref Pattern

GardenCanvas uses `forwardRef`/`useImperativeHandle` to expose imperative methods to Map.tsx:
- `focusBed(bedId)` — calculates the bed's center and scale to fit it in view, then sets scale and position
- `fitView()` — resets to contain-fit of the full aerial image with centering

This replaces the previous hidden button trigger pattern (`#fit-view-trigger`).

## React App: Care Dashboard Data Flow

The Garden page has a "Plants" | "Care" segmented toggle (`view` state). The Care view renders CareDashboard which orchestrates three data sources:

1. **Weather** (`useWeather`): Open-Meteo API → localStorage cache (4hr TTL) → `WeatherData` with forecast, monthly total, takeaway line
2. **Seasonal care** (`useSeasonalCare`): Supabase `seasonal_care` table → monthly AI tips. Generation: fetch weather first → call `/api/garden-assistant` action `seasonal_care` with all plants + weather context → store response with `plant_hash` for staleness detection
3. **Reminders** (`useReminders`): Passed as props from Garden.tsx (same hook as before, just rendered in CareDashboard instead of Plants view)

Dependency chain for generation: weather loads → user clicks generate → weather data passed to AI call → AI returns tips → stored in Supabase

The `seasonal_care` API action follows the same pattern as `reminders`: system prompt with Tampa Bay expertise, user prompt with plant list + month + weather, Claude Haiku model, JSON response parsed via regex.

## CSS Design System

All colors, radii, fonts, and spacing defined as CSS custom properties (`style.css:4-25`). Components reference variables, never raw values. The three brand colors are:
- `--green-deep` (#1c3a2b): primary actions, headers, nav active state
- `--cream` (#f5f0e8): page background, card backgrounds
- `--terra` (#c4622d): errors, warnings, danger actions
