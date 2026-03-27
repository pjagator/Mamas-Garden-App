# Efficiency & Resilience Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the garden tracker resilient to flaky WiFi, enable offline browsing of cached data, and improve rendering/load performance on iPhone Safari.

**Architecture:** Three independent workstreams — (1) a new `js/network.js` utility module for resilient fetch + connection awareness, (2) enhanced service worker for image caching + localStorage for inventory data, (3) rendering optimizations in `js/inventory.js` and `index.html`. No build step, no frameworks, vanilla JS ES modules.

**Tech Stack:** Vanilla JS, Supabase JS Client, Service Worker API, localStorage, AbortController, DocumentFragment

---

## File Structure

| File | Role |
|------|------|
| `js/network.js` | **New.** Utility module: `resilientFetch()`, `isOnline()`, `onConnectionChange()`. Imports nothing from app.js. |
| `js/app.js` | Import network.js, add connection toast UI, add inventory localStorage caching to `loadInventory()`, add window bindings. |
| `js/capture.js` | Import network.js, replace `fetch()` with `resilientFetch()`, add offline guard to `identifySpecies()` and `saveSelectedId()`. |
| `js/features.js` | Import network.js, replace `fetch()` with `resilientFetch()`, add offline guards to care profile/reminders/diagnosis. |
| `js/inventory.js` | DocumentFragment batch rendering, data-attribute filter-by-hiding, lazy hero image. |
| `sw.js` | Add image cache with stale-while-revalidate for Supabase Storage URLs. |
| `css/components.css` | Connection toast bar styles. |
| `index.html` | Verify font `display=swap`, move Supabase CDN script position. |

---

### Task 1: Create `js/network.js` — resilientFetch + connection state

**Files:**
- Create: `js/network.js`

- [ ] **Step 1: Create `js/network.js` with `resilientFetch()`**

```javascript
// ── Network resilience utilities ─────────────────────────────
// No imports from app.js — this is a standalone utility module.

let _online = navigator.onLine;
const _connectionListeners = [];

window.addEventListener('online', () => { _online = true; _connectionListeners.forEach(fn => fn(true)); });
window.addEventListener('offline', () => { _online = false; _connectionListeners.forEach(fn => fn(false)); });

export function isOnline() { return _online; }

export function onConnectionChange(fn) {
    _connectionListeners.push(fn);
    return () => {
        const idx = _connectionListeners.indexOf(fn);
        if (idx !== -1) _connectionListeners.splice(idx, 1);
    };
}

export async function resilientFetch(url, options = {}, config = {}) {
    const { retries = 2, timeoutMs = 15000 } = config;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);

            // Retry on 5xx / 529 (not on 4xx — those are real errors)
            if ((response.status === 529 || response.status >= 500) && attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            return response;
        } catch (err) {
            clearTimeout(timer);

            if (err.name === 'AbortError') {
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw new Error('Request timed out. Please check your connection and try again.');
            }

            // Network error (offline, DNS failure, etc.)
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            throw err;
        }
    }
}
```

- [ ] **Step 2: Verify the module loads without errors**

Open the app in Chrome DevTools at 390px width. In the console, run:

```javascript
import('/Mamas-Garden-App/js/network.js').then(m => console.log('network.js loaded', m.isOnline()));
```

Expected: `network.js loaded true`

- [ ] **Step 3: Commit**

```bash
git add js/network.js
git commit -m "feat: add network resilience utility module (resilientFetch, connection state)"
```

---

### Task 2: Connection toast UI

**Files:**
- Modify: `css/components.css` (append styles)
- Modify: `js/app.js:309` (add import), `js/app.js:315-334` (add toast init in auth handler)
- Modify: `index.html:19` (add toast element)

- [ ] **Step 1: Add connection toast HTML to `index.html`**

Add immediately after `<body>` (line 19), before the auth screen div:

```html
<div id="connection-toast" class="connection-toast" aria-live="polite"></div>
```

- [ ] **Step 2: Add connection toast CSS to `css/components.css`**

Append to end of file:

```css
/* ── Connection toast ──────────────────────────────────────── */
.connection-toast {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    padding: 6px var(--space-4);
    transform: translateY(-100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.connection-toast.visible {
    transform: translateY(0);
}
.connection-toast.offline {
    background: var(--terra);
    color: var(--white);
}
.connection-toast.online {
    background: var(--green-mid);
    color: var(--white);
}
```

- [ ] **Step 3: Wire up connection toast in `js/app.js`**

Add import at the top of `js/app.js`, after existing imports on line 309-313. Add this as a new import line alongside the others:

```javascript
import { isOnline, onConnectionChange, resilientFetch } from './network.js';
```

Then add the toast logic after the FAB scroll behavior block (after line 380), before the window bindings:

```javascript
// ── Connection status toast ─────────────────────────────────
const _toast = document.getElementById('connection-toast');
onConnectionChange((online) => {
    if (online) {
        _toast.textContent = 'Back online';
        _toast.className = 'connection-toast online visible';
        setTimeout(() => { _toast.classList.remove('visible'); }, 2000);
    } else {
        _toast.textContent = "You're offline — browsing cached data";
        _toast.className = 'connection-toast offline visible';
    }
});
```

- [ ] **Step 4: Test connection toast**

In Chrome DevTools, go to Network tab and toggle "Offline" checkbox. Verify:
- Going offline: terracotta bar slides down from top with "You're offline — browsing cached data"
- Going online: green bar slides down with "Back online", auto-dismisses after 2s

- [ ] **Step 5: Commit**

```bash
git add index.html css/components.css js/app.js
git commit -m "feat: add connection status toast for offline/online transitions"
```

---

### Task 3: Migrate `capture.js` to resilientFetch + offline guards

**Files:**
- Modify: `js/capture.js:2` (add import), `:155-182` (identifySpecies), `:220-253` (saveSelectedId)

- [ ] **Step 1: Add import to `capture.js`**

On line 2, change:

```javascript
import { sb, getCurrentUser, SUPABASE_URL, SUPABASE_ANON_KEY, matchNative, confidenceClass, openModal, closeModal, emit, PRESET_TAGS } from './app.js';
```

to:

```javascript
import { sb, getCurrentUser, SUPABASE_URL, SUPABASE_ANON_KEY, matchNative, confidenceClass, openModal, closeModal, emit, PRESET_TAGS } from './app.js';
import { resilientFetch, isOnline } from './network.js';
```

- [ ] **Step 2: Add offline guard and replace fetch in `identifySpecies()`**

In `identifySpecies()`, add an offline check at the top (after the canvas display check on line 157):

```javascript
    if (!isOnline()) {
        alert('Species identification requires an internet connection. Please try again when you\u2019re back online.');
        return;
    }
```

Then replace the `fetch()` call on lines 173-181:

```javascript
      const fnResponse = await fetch(
    SUPABASE_URL + '/functions/v1/identify-species',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageUrl: tempUrl }),
    }
);
```

with:

```javascript
      const fnResponse = await resilientFetch(
    SUPABASE_URL + '/functions/v1/identify-species',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageUrl: tempUrl }),
    },
    { retries: 2, timeoutMs: 30000 }
);
```

Note: 30s timeout for identification since it involves image upload + AI processing.

- [ ] **Step 3: Add offline guard to `saveSelectedId()`**

In `saveSelectedId()`, add an offline check at the top (after the null check on line 221):

```javascript
    if (!isOnline()) {
        alert('Saving requires an internet connection. Your photo is preserved \u2014 try again when connected.');
        return;
    }
```

- [ ] **Step 4: Test offline guards**

1. Open DevTools, toggle Network to Offline
2. Take/upload a photo, tap "Identify species" — should show alert about needing internet
3. Toggle back online, identify successfully, toggle offline again, tap "Save to garden" — should show save alert
4. Toggle online, full flow should work normally

- [ ] **Step 5: Commit**

```bash
git add js/capture.js
git commit -m "feat: add network resilience and offline guards to species identification"
```

---

### Task 4: Migrate `features.js` to resilientFetch + offline guards

**Files:**
- Modify: `js/features.js:1-2` (add import), `:329-367` (generateCareProfile), `:609-668` (generateReminders), `:929-963` (runDiagnosis)

- [ ] **Step 1: Add import to `features.js`**

Add after the existing imports at the top of the file:

```javascript
import { resilientFetch, isOnline } from './network.js';
```

- [ ] **Step 2: Replace fetch in `generateCareProfile()`**

In `generateCareProfile()` (line 333), replace:

```javascript
        const response = await fetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

with:

```javascript
        const response = await resilientFetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

The rest of the call stays the same. No offline guard needed here — care profiles are generated in the background after save, and failure is already handled silently.

- [ ] **Step 3: Replace fetch in `generateReminders()`**

In `generateReminders()` (line 614), replace:

```javascript
        const response = await fetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

with:

```javascript
        if (!isOnline()) return [];
        const response = await resilientFetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

The early return prevents unnecessary error UI when offline. Reminders will generate next time the user visits while online.

- [ ] **Step 4: Replace fetch in `runDiagnosis()`**

In `runDiagnosis()` (line 931), replace:

```javascript
        const response = await fetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

with:

```javascript
        if (!isOnline()) {
            alert("Plant diagnosis requires an internet connection. Your health check was saved \u2014 you can request a diagnosis later.");
            return;
        }
        const response = await resilientFetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
```

- [ ] **Step 5: Test**

1. Toggle offline in DevTools
2. Navigate to a plant detail modal — existing care profile should display (cached in inventory data)
3. Tap "Refresh care profile" — should fail silently (background task)
4. Open health check modal, save with photo — diagnosis alert should mention offline
5. Toggle online, verify all AI features work normally

- [ ] **Step 6: Commit**

```bash
git add js/features.js
git commit -m "feat: add network resilience and offline guards to garden assistant features"
```

---

### Task 5: Inventory localStorage caching in `app.js`

**Files:**
- Modify: `js/app.js:296-307` (loadInventory)

- [ ] **Step 1: Rewrite `loadInventory()` with localStorage caching**

Replace the existing `loadInventory()` function (lines 296-307):

```javascript
export async function loadInventory() {
    const { data, error } = await sb.from('inventory')
        .select('*')
        .eq('user_id', getCurrentUser().id)
        .order('date', { ascending: false });
    if (error) { console.error(error); return; }
    _allInventory = data || [];
    updateStats();
    renderInventory();
    renderTimeline();
    loadReminders();
}
```

with:

```javascript
export async function loadInventory() {
    const cacheKey = 'garden-inventory-cache';
    const cacheTimeKey = 'garden-inventory-cache-ts';
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Serve from cache immediately if available and fresh
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const hasFreshCache = cached && cachedTime && (Date.now() - Number(cachedTime) < maxAge);

    if (hasFreshCache && _allInventory.length === 0) {
        try {
            _allInventory = JSON.parse(cached);
            updateStats();
            renderInventory();
            renderTimeline();
            loadReminders();
        } catch (e) { /* corrupt cache, ignore */ }
    }

    // Fetch fresh data from network
    try {
        const { data, error } = await sb.from('inventory')
            .select('*')
            .eq('user_id', getCurrentUser().id)
            .order('date', { ascending: false });

        if (error) throw error;

        const fresh = data || [];
        const changed = JSON.stringify(fresh) !== cached;

        _allInventory = fresh;
        localStorage.setItem(cacheKey, JSON.stringify(fresh));
        localStorage.setItem(cacheTimeKey, String(Date.now()));

        if (changed || !hasFreshCache) {
            updateStats();
            renderInventory();
            renderTimeline();
            loadReminders();
        }
    } catch (err) {
        console.error('loadInventory network error:', err);
        // If we already rendered from cache, that's fine — user sees cached data
        // If no cache, render empty state
        if (!hasFreshCache && _allInventory.length === 0) {
            updateStats();
            renderInventory();
            renderTimeline();
        }
    }
}
```

- [ ] **Step 2: Test cache behavior**

1. Load the app while online — inventory loads normally
2. Open DevTools > Application > Local Storage — verify `garden-inventory-cache` and `garden-inventory-cache-ts` keys exist
3. Toggle offline, reload the page — inventory should render instantly from cache
4. Toggle online — background fetch should update if data changed

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add localStorage inventory caching for instant load and offline browsing"
```

---

### Task 6: Enhanced service worker — image caching

**Files:**
- Modify: `sw.js` (full rewrite)

- [ ] **Step 1: Rewrite `sw.js` with image caching**

Replace the entire contents of `sw.js`:

```javascript
const CACHE_VERSION = 'v16';
const STATIC_CACHE = `garden-static-${CACHE_VERSION}`;
const IMAGE_CACHE = 'garden-images-v1';
const IMAGE_CACHE_MAX = 200; // max entries before LRU eviction

const CORE_FILES = [
    '/Mamas-Garden-App/',
    '/Mamas-Garden-App/index.html',
    '/Mamas-Garden-App/css/base.css',
    '/Mamas-Garden-App/css/components.css',
    '/Mamas-Garden-App/css/screens.css',
    '/Mamas-Garden-App/js/app.js',
    '/Mamas-Garden-App/js/network.js',
];

const SUPABASE_STORAGE_ORIGIN = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
const IMAGE_PATH = '/storage/v1/object/public/garden-images/';

function isGardenImage(url) {
    return url.origin === SUPABASE_STORAGE_ORIGIN
        && url.pathname.startsWith(IMAGE_PATH)
        && !url.pathname.includes('/temp_');
}

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
    );
});

// ── Activate — clean old static caches, keep image cache ────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k.startsWith('garden-static-') && k !== STATIC_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── LRU eviction for image cache ─────────────────────────────
async function evictOldImages() {
    const cache = await caches.open(IMAGE_CACHE);
    const keys = await cache.keys();
    if (keys.length > IMAGE_CACHE_MAX) {
        // Delete oldest entries (first in = first out)
        const toDelete = keys.slice(0, keys.length - IMAGE_CACHE_MAX);
        await Promise.all(toDelete.map(k => cache.delete(k)));
    }
}

// ── Fetch handler ─────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    // Garden images: stale-while-revalidate
    if (isGardenImage(url)) {
        e.respondWith(
            caches.open(IMAGE_CACHE).then(async (cache) => {
                const cached = await cache.match(request);

                const networkFetch = fetch(request).then((response) => {
                    if (response.ok) {
                        cache.put(request, response.clone());
                        evictOldImages();
                    }
                    return response;
                }).catch(() => cached); // If network fails and no cache, return undefined

                return cached || networkFetch;
            })
        );
        return;
    }

    // Navigation: network-first with cache fallback
    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache-first
    e.respondWith(
        caches.match(request).then(cached => cached || fetch(request))
    );
});
```

- [ ] **Step 2: Bump cache version in `index.html`**

Update the CSS and JS version query params in `index.html` from `?v=15` to `?v=16` on lines 15-17 and line 344:

Line 15: `css/base.css?v=16`
Line 16: `css/components.css?v=16`
Line 17: `css/screens.css?v=16`
Line 344: `js/app.js?v=16`

- [ ] **Step 3: Test image caching**

1. Hard refresh the app to install new service worker
2. Browse the garden grid — images load from network
3. Open DevTools > Application > Cache Storage — verify `garden-images-v1` contains Supabase Storage URLs
4. Toggle offline — images should still display from cache
5. Temp images (`temp_*`) should NOT appear in the cache

- [ ] **Step 4: Commit**

```bash
git add sw.js index.html
git commit -m "feat: add service worker image caching with stale-while-revalidate"
```

---

### Task 7: Batch DOM rendering with DocumentFragment

**Files:**
- Modify: `js/inventory.js:173-207` (renderInventory), `:297-357` (renderTimeline)

- [ ] **Step 1: Refactor `renderInventory()` to use DocumentFragment**

Replace lines 173-207 (the `grid.innerHTML = ''; items.forEach(...)` block through end of animation delays) with:

```javascript
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'garden-card';
        card.dataset.type = item.type || '';
        card.dataset.native = item.is_native ? 'true' : 'false';
        card.dataset.tags = (item.tags || []).join(',').toLowerCase();
        card.dataset.location = (item.location || '').toLowerCase();
        card.onclick = () => showItemDetail(item);

        const imgEl = item.image_url
            ? `<img class="garden-card-img" src="${item.image_url}" alt="${item.common}" loading="lazy">`
            : `<div class="garden-card-img-placeholder">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

        const isBug = item.type === 'bug';
        const tagClass = isBug ? 'tag bug-tag' : 'tag';
        const tags = [];
        if (item.is_native) tags.push(`<span class="${tagClass}">⭐ Native</span>`);
        if (item.tags && item.tags.length) tags.push(...item.tags.slice(0,2).map(t => `<span class="${tagClass}">${t}</span>`));
        if (item.bloom)     tags.push(`<span class="${tagClass}">🌸 ${item.bloom.slice(0,2).join(', ')}</span>`);
        if (item.location)  tags.push(`<span class="${tagClass}">${item.location}</span>`);
        if (item.health && (item.health === 'stressed' || item.health === 'sick')) tags.push(`<span class="tag health-bad">${item.health}</span>`);

        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>
            ${item.type === 'plant' ? `<button class="health-pulse-btn" onclick="event.stopPropagation();openHealthLog('${item.id}')" aria-label="Health check">💓</button>` : ''}`;

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            card.style.animationDelay = `${i * 40}ms`;
        }

        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
```

- [ ] **Step 2: Refactor `renderTimeline()` to use DocumentFragment**

In `renderTimeline()`, replace the timeline track building (lines 322-351) within the `seasonDefs.forEach` callback. Change:

```javascript
        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.innerHTML = '<div class="timeline-line"></div>';

        [...bloomingPlants, ...activeInsects].forEach(item => {
```

to use a fragment for entries:

```javascript
        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.innerHTML = '<div class="timeline-line"></div>';

        const trackFragment = document.createDocumentFragment();
        [...bloomingPlants, ...activeInsects].forEach(item => {
```

And change the `track.appendChild(entry);` (line 351) to `trackFragment.appendChild(entry);`.

Then after the forEach loop, add:

```javascript
        track.appendChild(trackFragment);
```

Before `section.innerHTML = header;` (line 354).

- [ ] **Step 3: Test rendering**

1. Load the app with inventory items
2. Verify garden grid renders correctly — all cards, images, tags visible
3. Verify timeline renders correctly — season sections, entries, click-to-detail
4. Open DevTools Performance tab, record while scrolling — confirm no layout thrashing

- [ ] **Step 4: Commit**

```bash
git add js/inventory.js
git commit -m "perf: batch DOM updates with DocumentFragment in grid and timeline rendering"
```

---

### Task 8: Filter-by-hiding (avoid full re-render on filter change)

**Files:**
- Modify: `js/inventory.js:74-98` (setFilter, toggleTagFilter, setLocationFilter, handleSearch)
- Modify: `css/components.css` (add `.hidden` utility)

- [ ] **Step 1: Add hidden utility class to `css/components.css`**

Append:

```css
/* ── Filter utility ────────────────────────────────────────── */
.garden-card.filter-hidden { display: none !important; }
```

- [ ] **Step 2: Create `applyFilters()` helper in `js/inventory.js`**

Add after the `renderLocationFilterDropdown()` function (after line 44), before `download()`:

```javascript
function applyFilters() {
    const grid = document.getElementById('garden-grid');
    const cards = grid.querySelectorAll('.garden-card');
    if (!cards.length) { renderInventory(); return; }

    const season = getCurrentSeason();
    let visibleCount = 0;

    cards.forEach(card => {
        let show = true;

        // Type/status filter
        if (currentFilter === 'plant' && card.dataset.type !== 'plant') show = false;
        if (currentFilter === 'bug' && card.dataset.type !== 'bug') show = false;
        if (currentFilter === 'native' && card.dataset.native !== 'true') show = false;
        if (currentFilter === 'blooming') {
            const item = getAllInventory().find(i => i.common === card.querySelector('.garden-card-name')?.textContent);
            if (!item?.bloom || (!item.bloom.includes(season) && !item.bloom.includes('Year-round'))) show = false;
        }

        // Tag filters (AND)
        if (show && activeTagFilters.length) {
            const cardTags = card.dataset.tags ? card.dataset.tags.split(',') : [];
            if (!activeTagFilters.every(t => cardTags.includes(t.toLowerCase()))) show = false;
        }

        // Location filter
        if (show && activeLocationFilter) {
            if (card.dataset.location !== activeLocationFilter.toLowerCase()) show = false;
        }

        // Search
        if (show && currentSearch) {
            const text = card.textContent.toLowerCase();
            if (!text.includes(currentSearch)) show = false;
        }

        card.classList.toggle('filter-hidden', !show);
        if (show) visibleCount++;
    });

    // Show empty state if nothing visible
    const emptyEl = grid.querySelector('.empty-state');
    if (visibleCount === 0 && !emptyEl && (currentSearch || currentFilter !== 'all' || activeTagFilters.length || activeLocationFilter)) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<p>No matching entries.</p>';
        grid.appendChild(empty);
    } else if (visibleCount > 0 && emptyEl) {
        emptyEl.remove();
    }
}
```

- [ ] **Step 3: Update filter/search functions to use `applyFilters()`**

Replace the bodies of `setFilter()`, `toggleTagFilter()`, `setLocationFilter()`, and `handleSearch()`:

```javascript
export function handleSearch(val) {
    currentSearch = val.toLowerCase().trim();
    applyFilters();
}

export function setFilter(filter, btnEl) {
    currentFilter = filter;
    document.querySelectorAll('.filter-row .chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    applyFilters();
}

export function toggleTagFilter(tag) {
    const idx = activeTagFilters.indexOf(tag);
    if (idx === -1) activeTagFilters.push(tag);
    else activeTagFilters.splice(idx, 1);
    renderTagFilterDropdown();
    applyFilters();
}

export function setLocationFilter(loc) {
    activeLocationFilter = activeLocationFilter === loc ? '' : loc;
    renderLocationFilterDropdown();
    applyFilters();
}
```

`setSort()` stays as-is — sorting requires a full re-render since DOM order changes.

- [ ] **Step 4: Test filtering**

1. Load garden with multiple items
2. Tap filter chips (Plants, Bugs, Native, Blooming) — cards should hide/show without flicker
3. Search by name — cards filter in real time
4. Combine filters (e.g., Native + search) — should work together
5. Clear all filters — all cards visible again
6. Sort by name — full re-render, still works

- [ ] **Step 5: Commit**

```bash
git add js/inventory.js css/components.css
git commit -m "perf: filter garden grid by toggling visibility instead of full re-render"
```

---

### Task 9: Detail modal lazy image + font loading

**Files:**
- Modify: `js/inventory.js:214-215` (showItemDetail hero image)
- Modify: `index.html:14` (font URL), `:343` (script position)

- [ ] **Step 1: Add `loading="lazy"` to detail modal hero image**

In `showItemDetail()` (line 214-215), change:

```javascript
    const heroImg = item.image_url
        ? `<img src="${item.image_url}" alt="${item.common}">`
```

to:

```javascript
    const heroImg = item.image_url
        ? `<img src="${item.image_url}" alt="${item.common}" loading="lazy">`
```

- [ ] **Step 2: Verify font `display=swap` in `index.html`**

Check line 14. The current Google Fonts URL is:

```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@300;400;500&display=swap
```

`&display=swap` is already present. No change needed. Confirm and move on.

- [ ] **Step 3: Verify Supabase script position in `index.html`**

Check line 343. The Supabase CDN script is already at the end of `<body>`, just before the module script:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="js/app.js?v=16"></script>
</body>
```

This is already the optimal position — it doesn't block initial paint since it's at the bottom of the body. No change needed.

- [ ] **Step 4: Commit**

```bash
git add js/inventory.js
git commit -m "perf: add lazy loading to detail modal hero image"
```

---

### Task 10: Offline UI — disable write actions when offline

**Files:**
- Modify: `js/app.js` (FAB offline state, window bindings)

- [ ] **Step 1: Add FAB offline state**

In the connection toast handler we added in Task 2, extend the `onConnectionChange` callback to also toggle the FAB:

```javascript
// ── Connection status toast ─────────────────────────────────
const _toast = document.getElementById('connection-toast');
onConnectionChange((online) => {
    // Toast
    if (online) {
        _toast.textContent = 'Back online';
        _toast.className = 'connection-toast online visible';
        setTimeout(() => { _toast.classList.remove('visible'); }, 2000);
    } else {
        _toast.textContent = "You're offline — browsing cached data";
        _toast.className = 'connection-toast offline visible';
    }
    // FAB state
    const fab = document.querySelector('.fab');
    if (fab) {
        fab.style.opacity = online ? '' : '0.5';
        fab.style.pointerEvents = online ? '' : 'none';
    }
});
// Set initial state if starting offline
if (!isOnline()) {
    const fab = document.querySelector('.fab');
    if (fab) { fab.style.opacity = '0.5'; fab.style.pointerEvents = 'none'; }
}
```

- [ ] **Step 2: Test FAB offline state**

1. Toggle offline — FAB should dim to 50% opacity and become non-tappable
2. Toggle online — FAB returns to normal, tapping opens capture modal

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: disable capture FAB when offline"
```

---

### Task 11: Final verification

**Files:** None (testing only)

- [ ] **Step 1: Full online flow test**

1. Load app fresh (hard refresh to install new service worker)
2. Sign in — welcome screen, dismiss to garden
3. Capture a photo, identify species, save — full flow works
4. Browse garden grid, open detail modal, check care profile
5. Switch to timeline — renders correctly
6. Filter by type, search, sort — all responsive
7. Verify no console errors

- [ ] **Step 2: Full offline flow test**

1. With inventory loaded, toggle to offline in DevTools
2. Connection toast appears: "You're offline — browsing cached data"
3. FAB is dimmed and non-tappable
4. Garden grid still shows all cards with images (from cache)
5. Tap a card — detail modal opens with hero image
6. Timeline still works
7. Toggle online — toast shows "Back online" and dismisses
8. FAB becomes active again
9. Full capture+identify+save flow works

- [ ] **Step 3: Cold start with cache test**

1. Load app while online, browse around (populates caches)
2. Close the browser tab entirely
3. Toggle offline
4. Open the app again — should render from localStorage cache + service worker
5. Garden grid and images should all display

- [ ] **Step 4: Commit any final fixes**

If any issues found during testing, fix and commit individually.
