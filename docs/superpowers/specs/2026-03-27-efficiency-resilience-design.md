# Efficiency & Resilience Refactor — Design Spec

**Date:** 2026-03-27
**Approach:** Hybrid (Network Resilience + Smart Caching + Key Rendering Fixes)
**Scope:** Moderate — impactful changes without architectural overhaul
**Target:** iPhone Safari, 20-50 item inventory, flaky WiFi in garden

---

## 1. Network Resilience Layer

### 1.1 New module: `js/network.js`

A shared `resilientFetch()` wrapper used by all client-side API calls.

**Exports:**
- `resilientFetch(url, options, retryConfig)` — wraps `fetch()` with:
  - **Retries:** Configurable, default 2 retries for 5xx/network errors
  - **Exponential backoff:** 1s, 2s, 4s (matches edge function retry timing)
  - **Timeout:** Default 15s via `AbortController`. Currently no timeout exists — a hung Supabase request blocks forever
  - **Returns:** Standard `Response` object (drop-in replacement for `fetch()`)
- `isOnline()` — returns current connection state
- `onConnectionChange(callback)` — subscribe to online/offline events

**Module convention:** Imports nothing from `app.js` (it's a utility). Other modules import from it.

### 1.2 Connection status UI

- Listen for `online`/`offline` events on `window`
- When offline: show a subtle fixed toast bar at top of screen — "You're offline — browsing cached data"
- When back online: show "Back online" briefly (2s), then dismiss
- Styled as a thin bar with the botanical design system colors (forest green background when online, terracotta when offline)
- CSS goes in `css/components.css`

### 1.3 Migrate existing fetch calls

All direct `fetch()` calls to Supabase endpoints in these files switch to `resilientFetch()`:

- `js/capture.js` — `identifySpecies()` (line 141), `uploadImage()`, `uploadTempImage()`
- `js/features.js` — `generateCareProfile()` (line 334), `generateReminders()` (line 615), `runDiagnosis()` (line 929)
- `js/app.js` — `loadInventory()` (wherever the Supabase query lives)

Storage uploads (`sb.storage.from().upload()`) go through the Supabase client which handles its own retries — leave those as-is.

### 1.4 Offline behavior for write operations

When offline and user attempts to:
- **Identify species:** Show "Species identification requires an internet connection. Please try again when you're back online."
- **Save to garden:** Show "Saving requires an internet connection. Your photo is preserved — try again when connected."
- **Health check / care profile:** Same pattern — friendly message, no silent failure.

No offline write queue. This is a deliberate scope decision to keep complexity low.

---

## 2. Enhanced Service Worker & Offline Browsing

### 2.1 Image caching strategy

**Scope:** Intercept requests to Supabase Storage URLs matching:
`https://itjvgruwvlrrlhsknwiw.supabase.co/storage/v1/object/public/garden-images/*`

**Strategy:** Stale-while-revalidate
- If cached: serve from cache immediately, fetch update in background
- If not cached: fetch from network, cache the response
- Skip `temp_` prefixed images (identification temps, not worth caching)

**Storage limit:** LRU eviction when cache exceeds 50MB. Track entries in a simple cache manifest in `localStorage`.

### 2.2 Inventory data caching

Inventory data is cached in `localStorage` (not the service worker cache). This keeps the caching logic in application code where it's easy to control invalidation, while the service worker handles binary assets (images, static files).

**On successful `loadInventory()`:**
- Save the full inventory array to `localStorage` under key `garden-inventory-cache`
- Save timestamp under `garden-inventory-cache-ts`

**On app load:**
1. Read from `localStorage` immediately
2. If cache exists and is < 24h old, render the grid from cache (instant)
3. Fetch fresh data from Supabase in background
4. If fresh data differs from cache, re-render and update cache
5. If network fails, keep showing cached data (with offline toast)

**Cache invalidation:**
- After any write operation (save plant, delete, update status), invalidate and re-fetch
- `emit('inventory-changed')` already triggers `loadInventory()` — the cache updates naturally

**Separation of concerns:** `localStorage` = structured data (inventory JSON). Service worker cache = binary assets (images) and static files (CSS/JS/HTML). No overlap.

### 2.3 Offline browsing mode

When offline, the following work from cache:
- Garden grid (cards + images)
- Item detail modals (all previously viewed)
- Timeline view
- Previously loaded care profiles and reminders
- Health check history (previously loaded)

When offline, the following are disabled:
- FAB capture button — dimmed with "Available online" label
- "Identify species" button
- "Save to garden" / "Save health check" buttons
- "Generate care profile" / "Refresh reminders" buttons
- Manual entry modal — can open but save is disabled

### 2.4 Service worker changes to `sw.js`

Expand the existing service worker:

- Add a named cache for images: `garden-images-v1`
- Route matching:
  - Static assets (CSS, JS, HTML): cache-first (existing behavior)
  - Supabase Storage images: stale-while-revalidate (new)
  - Supabase REST API: pass through (inventory data cached in localStorage by app code)
  - Edge function calls: pass through (no caching for AI responses)

Keep the existing cache version bumping approach for static assets.

---

## 3. Rendering & Load Performance

### 3.1 Batch DOM updates

**`renderInventory()` in `js/inventory.js`:**
- Replace the `forEach` + `appendChild` loop with a `DocumentFragment`
- Build all cards into the fragment, then append once
- This eliminates N layout recalculations (one per card) down to 1

**`renderTimeline()` in `js/inventory.js`:**
- Same DocumentFragment pattern

### 3.2 Non-blocking script loading

**`index.html`:**
- Move `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` from `<head>` to end of `<body>`, or add `async` attribute
- The ES module `<script type="module" src="js/app.js">` already defers naturally, but it depends on Supabase being loaded first — so move the CDN script to just before the module script at end of body

### 3.3 Font loading optimization

**`index.html`:**
- Ensure `&display=swap` is present in the Google Fonts URL
- This is partially there but verify the parameter is applied to both font families

### 3.4 Detail modal lazy image

**`showItemDetail()` in `js/inventory.js`:**
- Add `loading="lazy"` to the hero `<img>` tag
- Grid cards already have this; detail modal is missing it

### 3.5 Filter without full re-render

**`setFilter()`, `toggleTagFilter()`, `setLocationFilter()` in `js/inventory.js`:**
- Instead of calling `renderInventory()` on every filter change:
  - On initial render, tag each card element with `data-type`, `data-native`, `data-tags`, `data-location`
  - On filter change, iterate existing DOM cards and toggle a `.hidden` CSS class
  - Only call full `renderInventory()` when the underlying data changes (inventory-changed event)
- `setSort()` still requires re-render (order changes), but filters don't

---

## 4. File Changes Summary

| File | Changes |
|------|---------|
| `js/network.js` | **New** — resilientFetch, connection state, offline helpers |
| `js/capture.js` | Import network.js, use resilientFetch, offline guards |
| `js/features.js` | Import network.js, use resilientFetch, offline guards |
| `js/inventory.js` | DocumentFragment rendering, filter-by-hiding, lazy hero image |
| `js/app.js` | Import network.js, connection toast UI, inventory cache logic, window bindings |
| `sw.js` | Image cache, API data cache, route-based strategies |
| `index.html` | Move Supabase script to body end, verify font display swap |
| `css/components.css` | Connection toast bar styles, offline state styles |

---

## 5. What's Explicitly Out of Scope

- **Offline write queue / background sync** — too complex for vanilla JS, no build step
- **Virtual scrolling** — overkill for 20-50 items
- **Self-hosting fonts / Supabase JS** — diminishing returns
- **Caching querySelectorAll results** — marginal gain
- **Detail modal lazy sections** — fast enough as-is
- **Service worker push notifications** — not needed

---

## 6. Testing Plan

All manual (no automated test framework):

- **Network resilience:** Throttle to Slow 3G in DevTools, verify retries work and timeouts fire
- **Offline browsing:** Toggle airplane mode in DevTools after loading inventory, verify grid/detail/timeline work from cache
- **Connection toast:** Toggle online/offline, verify toast appears/dismisses
- **Image caching:** Load garden grid, go offline, verify images still display
- **Inventory cache:** Load app, kill network, reload — verify cached data renders
- **Render performance:** With 30+ items, filter rapidly and verify no jank
- **Script loading:** Check DevTools waterfall — Supabase JS should not block first paint
- **iPhone Safari:** Test on real device or 390px viewport
