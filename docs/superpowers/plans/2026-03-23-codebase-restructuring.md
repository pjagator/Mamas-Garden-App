# Codebase Restructuring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic `app.js` (1,471 lines) and `style.css` (1,216 lines) into ES modules and separated CSS files with zero functionality change.

**Architecture:** CSS splits first (safe, independently testable), then atomic JS module split. ES modules with `import`/`export`, no bundler. Event system for loose coupling between modules. All HTML event handler attributes stay as-is, wired through `window` bindings.

**Tech Stack:** Vanilla JS (ES modules), CSS, Supabase JS SDK (CDN), GitHub Pages hosting.

**Spec:** `docs/superpowers/specs/2026-03-23-codebase-restructuring-design.md`

---

## File Structure

### New files to create:
- `css/base.css` — Reset, variables, fields, buttons, spinner, utilities
- `css/components.css` — Cards, tags, badges, detail view, care profile, plant status, linked bugs
- `css/screens.css` — Auth, welcome, capture, garden, timeline, settings, modals, nav
- `js/app.js` — Entry point: Supabase client, state, helpers, event system, welcome screen, nav, window bindings
- `js/auth.js` — All auth flows
- `js/capture.js` — Photo capture, ID, manual entry, save
- `js/inventory.js` — Garden grid, search/filter/sort, detail modal, timeline, export
- `js/features.js` — Tag editor, bug-plant linking, plant status, care profiles

### Files to modify:
- `index.html` — Update `<link>` and `<script>` tags

### Files to delete:
- `style.css` (after CSS split)
- `app.js` (after JS split)

### Files to update:
- `CLAUDE.md` — New file structure and conventions
- `PROJECT-STATE.md` — Reflect restructured codebase

---

## Task 1: Create directories and scaffold

**Files:**
- Create: `css/` directory, `js/` directory

- [ ] **Step 1: Create directories**

```bash
mkdir -p css js
```

- [ ] **Step 2: Commit scaffold**

```bash
git add css js
git commit -m "Add css/ and js/ directories for module restructuring"
```

---

## Task 2: Split style.css into css/base.css

**Files:**
- Create: `css/base.css`
- Source: `style.css:1-261` (reset, root, body, fields, buttons) + `style.css:641-655` (divider) + `style.css:852-862` (small, checkbox-row) + `style.css:1095-1106` (spinner — single definition) + `style.css:1108-1116` (utility/media queries)

- [ ] **Step 1: Create css/base.css**

Extract these sections from `style.css` into `css/base.css` in this order:

1. **Lines 1-57**: Reset (`*`), `:root` (all custom properties), `html`, `body`
2. **Lines 148-261**: Fields (`.field`, `.field-label`, `textarea.field`, `select.field`) and all button variants (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-row`)
3. **Lines 261**: `.btn-row`
4. **Lines 641-655**: `.divider`
5. **Lines 852-862**: `small`, `small a`, `.checkbox-row` (including the label within)
6. **Lines 1095-1106**: `.spinner`, `.spinner-wrap`, `.spinner-label`, `@keyframes spin` — use ONLY the first definition. Do NOT include the duplicate from lines 1205-1216.
7. **Lines 1108-1116**: `@media (max-width: 360px)` is a screen-specific rule — do NOT include it here. Only include `@supports (-webkit-touch-callout)` (lines 1113-1116).

- [ ] **Step 2: Verify base.css is self-contained**

Visually scan: every rule in `css/base.css` should only reference `:root` variables (defined in the same file) or standard CSS properties. No class references to components or screens.

---

## Task 3: Split style.css into css/components.css

**Files:**
- Create: `css/components.css`
- Source: `style.css:523-635` (ID cards, confidence, tags) + `style.css:593-635` (tag editor) + `style.css:746-795` (garden cards, empty state) + `style.css:927-938` (detail view) + `style.css:940-1007` (plant status, linked bugs) + `style.css:1009-1093` (care profile, natives) + `style.css:684-744` (chips, filter dropdown, sort) + parts of duplicate block `style.css:1117-1217`

- [ ] **Step 1: Create css/components.css**

Extract and **deduplicate** these sections:

1. **ID result cards** (from first definition, lines 539-580 + line 555-560 `.id-card-top`):
   - `.id-card`, `.id-card:active`, `.id-card.selected`, `.id-card-top`, `.id-card-name`, `.id-card-sci`, `.id-card-tags`
   - From the duplicate block ONLY, bring in `.id-card-desc` (line 1150) — change `var(--ink-mid, #666)` to `var(--ink-mid)`
   - `.id-notes` from duplicate block (line 1187) — change `var(--cream, #f5f0e8)` to `var(--cream)`
   - `.id-notes:focus` from duplicate block (line 1200) — change `var(--forest, #1c3a2b)` to `var(--green-deep)`

2. **Confidence badges** (from lines 1164-1185):
   - `.confidence-badge`, `.confidence-badge.high`, `.confidence-badge.mid`, `.confidence-badge.low`
   - **DELETE** `.confidence-pill` (lines 565-578) entirely — it is never referenced in JS or HTML

3. **`.id-save-row`** (line 636-639)

4. **Tags** (lines 582-634):
   - `.tag`, `.tag.native`, `.tag.plant-tag`, `.tag.location-tag`, `.tag.plant`, `.tag.bug`, `.tag.season`
   - `.tag.health-good`, `.tag.health-bad`, `.tag.health-neutral` (lines 973-986)

5. **Tag editor** (lines 593-631):
   - `.tag-editor-section`, `.tag-chips-row`, `.tag-chip`, `.tag-chip.active`, `.tag-chip:active`

6. **Garden cards** (lines 753-795):
   - `.garden-card` through `.garden-card-tags`
   - `.garden-card-img-placeholder`

7. **Detail view** (lines 928-938):
   - `.detail-img`, `.detail-name`, `.detail-sci`, `.detail-row`, `.detail-key`, `.detail-val`, `.detail-notes`, `.detail-notes-label`, `.detail-notes-text`, `.detail-delete`

8. **Plant status** (lines 940-986):
   - `.plant-status-section`, `.plant-status-header`, `.plant-status-header:active`, `.plant-status-body`, field overrides within body

9. **Linked bugs** (lines 988-1007):
   - `.linked-bug-row` through `.linked-bug-sci`

10. **Care profile** (lines 1009-1086):
    - `.care-profile-section` through `.care-note`

11. **Natives list** (lines 1088-1093):
    - `.native-item` styles

12. **Filter/sort** (lines 684-744):
    - `.chip`, `.chip:active`, `.chip.active`, `.filter-dropdown`, `.sort-row`, `.sort-select`

13. **Empty state** (lines 788-795)

- [ ] **Step 2: Verify no duplicate rules exist**

Grep `css/components.css` for any class that appears more than once (except variants like `.tag.native`, `.tag.plant`). There should be zero duplicates.

---

## Task 4: Split style.css into css/screens.css

**Files:**
- Create: `css/screens.css`
- Source: `style.css:59-146` (auth) + `style.css:263-435` (app shell, welcome, screens, nav) + `style.css:436-522` (capture) + `style.css:657-683` (garden tab stats/search/filter row) + `style.css:746-752` (garden grid) + `style.css:797-851` (timeline, settings) + `style.css:864-926` (modals) + `style.css:1109-1111` (360px media query)

- [ ] **Step 1: Create css/screens.css**

Extract these sections:

1. **Auth screen** (lines 59-146): `#auth-screen` through `.auth-msg.success`
2. **App shell** (lines 263-268): `#app`
3. **Welcome screen** (lines 270-354): `#welcome-screen` through `.welcome-enter-btn`
4. **Screens base** (lines 356-390): `.screen`, `.active-screen`, `@keyframes screenIn`, `.screen-header`, `.screen-title`, `.screen-sub`
5. **Bottom nav** (lines 392-434): `.bottom-nav` through `.nav-btn.active .nav-icon`
6. **Capture tab** (lines 436-521): `.capture-zone` through `.btn-icon`
7. **Capture results** (lines 523-537): `.results-heading`, `.results-sub`
8. **Garden tab layout** (lines 657-683, 746-752): `.stats-row`, `.stat`, `.search-row`, `.search-input`, `.filter-row`, `.garden-grid`
9. **Timeline** (lines 797-828): `#timeline-content` through `.timeline-empty`
10. **Settings** (lines 830-853): `.settings-group` through `.danger-group`
11. **Modals** (lines 864-925): `.modal-overlay` through `.modal-sub`, all keyframe animations
12. **360px breakpoint** (lines 1109-1111): `@media (max-width: 360px)` garden grid override

- [ ] **Step 2: Verify screen rules don't overlap with components**

Check: no `.garden-card-*`, `.id-card-*`, `.tag-*`, `.care-*`, `.detail-*` rules ended up here. Those belong in `components.css`.

---

## Task 5: Update index.html and delete style.css

**Files:**
- Modify: `index.html:15`
- Delete: `style.css`

- [ ] **Step 1: Update index.html link tags**

Replace line 15:
```html
    <link rel="stylesheet" href="style.css?v=9">
```
With:
```html
    <link rel="stylesheet" href="css/base.css?v=10">
    <link rel="stylesheet" href="css/components.css?v=10">
    <link rel="stylesheet" href="css/screens.css?v=10">
```

- [ ] **Step 2: Delete old style.css**

```bash
rm style.css
```

- [ ] **Step 3: Visual verification**

Open `index.html` in a browser at 390px width. Check:
- Auth screen renders (gradient background, white card, tabs)
- After sign-in: welcome screen renders (quote, fact, button)
- Capture tab: photo zone, buttons visible
- Garden tab: grid, search, filters, sort
- Timeline tab: season blocks
- Settings tab: groups, buttons
- Modals: open item detail, manual entry, natives DB — all slide up correctly
- Tags, badges, care profile sections render correctly

- [ ] **Step 4: Commit CSS split**

```bash
git add css/base.css css/components.css css/screens.css index.html
git rm style.css
git commit -m "Split style.css into css/base.css, css/components.css, css/screens.css

Deduplicate .id-card, .spinner-wrap, .spinner-label rules.
Remove unused .confidence-pill. Fix variable fallbacks to use
canonical :root variables. Single source of truth per CSS class."
```

---

## Task 6: Create js/app.js — entry point with state, helpers, event system

**Files:**
- Create: `js/app.js`
- Source: `app.js:1-4` (Supabase), `app.js:6-28` (data arrays), `app.js:30-63` (state + helpers), `app.js:65-235` (welcome screen), `app.js:238-256` (auth state change), `app.js:339-346` (navigation), `app.js:1462-1471` (modal helpers)

- [ ] **Step 1: Create js/app.js**

This file contains:

```js
// ── Supabase client ─────────────────────────────────────────────
const SUPABASE_URL = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
const SUPABASE_ANON_KEY = '...'; // (full key from app.js:3)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Event system ────────────────────────────────────────────────
const listeners = {};
export function on(event, fn) { (listeners[event] ||= []).push(fn); }
export function emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }

// ── Exports ─────────────────────────────────────────────────────
export { sb, SUPABASE_URL, SUPABASE_ANON_KEY };
```

Then copy in (converting `const`/`let`/`function` to `export` where needed):
- `NATIVE_PLANTS` array (lines 7-23) — `export const`
- `PRESET_TAGS`, `LOCATION_ZONES`, `LOCATION_HABITATS` (lines 26-28) — `export const`
- State variables (lines 31-39) — export as getter/setter functions:
  ```js
  let currentUser = null;
  export function getCurrentUser() { return currentUser; }
  export function setCurrentUser(u) { currentUser = u; }
  // ... same pattern for allInventory, currentFilter, etc.
  // OR: export let (ES modules support mutable exports read-only from importers)
  ```
  **Decision**: Use `export let` for simple state. Importers read the live binding. Only `currentUser` and `allInventory` need setter functions since they're modified from multiple modules.
- Helper functions (lines 42-63): `getSeason`, `getCurrentSeason`, `confidenceClass`, `matchNative` — all `export function`
- Welcome screen: `GARDEN_QUOTES` (lines 66-132), `GARDEN_FACTS` (lines 135-200), `getDailyIndex` (not exported), `getGreeting` (not exported), `initWelcomeScreen` (exported), `dismissWelcome` (exported) — lines 65-235
- Navigation: `showScreen` (lines 340-346) — `export function`
- Modal helpers: `openModal`, `closeModal` (lines 1463-1471) — `export function`
- `loadInventory` function (lines 644-654) — `export function`. This imports `updateStats` and `renderInventory` and `renderTimeline` from `inventory.js` via the event system or direct import.

Then at the bottom — **imports from other modules and window bindings**:
```js
import { showAuthTab, handleSignIn, handleSignUp, handleSendCode, handleVerifyCode, handlePasswordReset, handleSignOut } from './auth.js';
import { handlePhoto, removeImage, identifySpecies, renderIdCards, selectIdCard, saveSelectedId, openManualEntry, saveManualEntry } from './capture.js';
import { renderInventory, updateStats, handleSearch, setFilter, setSort, toggleTagFilter, setLocationFilter, toggleFilterDropdown, showItemDetail, showLinkedBug, deleteItem, renderTimeline, exportJSON, exportCSV, clearAllData, showNativesDB } from './inventory.js';
import { toggleTag, removeTag, addCustomTag, toggleBugPlantLink, saveBugPlantLink, togglePlantStatus, savePlantStatus, setLocationZone, setLocationHabitat, toggleCareProfile, refreshCareProfile } from './features.js';

// Auth state change handler
sb.auth.onAuthStateChange((event, session) => {
    // ... (copy from app.js:238-256, calling imported functions)
});

// Event listeners
on('inventory-changed', async () => {
    await loadInventory();
});

// Window bindings
Object.assign(window, {
    showAuthTab, handleSignIn, handleSignUp, handleSendCode,
    handleVerifyCode, handlePasswordReset, handleSignOut,
    showScreen, dismissWelcome, removeImage, identifySpecies,
    openManualEntry, handlePhoto, handleSearch, setFilter,
    toggleFilterDropdown, setSort, closeModal, clearAllData,
    exportJSON, exportCSV, showNativesDB, selectIdCard,
    saveSelectedId, saveManualEntry, toggleTag, removeTag,
    addCustomTag, toggleBugPlantLink, saveBugPlantLink,
    togglePlantStatus, savePlantStatus, setLocationZone,
    setLocationHabitat, toggleCareProfile, refreshCareProfile,
    deleteItem, showLinkedBug,
});
```

**IMPORTANT**: `js/app.js` imports from child modules. This is fine — ES modules handle circular-free DAGs. The import statements go at the top of the file (static imports) or at the bottom if using dynamic `import()`. Since our modules import from `app.js` AND `app.js` imports from them, use this pattern: `app.js` exports are defined BEFORE the import block. The child module imports will resolve because ES module bindings are live.

**Actually**: To avoid any potential issues with circular-like patterns, structure `app.js` as:
1. Top: all exports (state, helpers, event system, Supabase client, data arrays, nav, modals, welcome, loadInventory)
2. Bottom: imports from child modules + auth state change handler + window bindings

ES modules hoist `import` statements regardless of where you write them, but having the exports defined first makes the intent clear.

- [ ] **Step 2: Verify app.js has no syntax errors**

This will be verified in Task 10 as part of the atomic commit. Do not test in isolation — the module imports will fail until all files exist.

---

## Task 7: Create js/auth.js

**Files:**
- Create: `js/auth.js`
- Source: `app.js:258-337` (auth tab, sign in, sign up, OTP, password reset, sign out)

- [ ] **Step 1: Create js/auth.js**

```js
import { sb } from './app.js';

// ── Internal ────────────────────────────────────────────────────
let otpEmail = '';

function setAuthMsg(text, type) {
    const el = document.getElementById('auth-msg');
    el.textContent = text;
    el.className = 'auth-msg' + (type ? ' ' + type : '');
}

// ── Exports ─────────────────────────────────────────────────────
export function showAuthTab(tab) { /* copy from app.js:258-267 */ }
export async function handleSignIn() { /* copy from app.js:275-283 */ }
export async function handleSignUp() { /* copy from app.js:285-296 */ }
export async function handleSendCode() { /* copy from app.js:300-312 */ }
export async function handleVerifyCode() { /* copy from app.js:314-322 */ }
export async function handlePasswordReset() { /* copy from app.js:324-333 */ }
export async function handleSignOut() { /* copy from app.js:335-337 */ }
```

Copy each function body exactly from the source. Add `export` keyword. No logic changes.

---

## Task 8: Create js/capture.js

**Files:**
- Create: `js/capture.js`
- Source: `app.js:348-581` (photo capture, preview, upload, ID, result cards, manual entry, save, buildEntry)

- [ ] **Step 1: Create js/capture.js**

```js
import {
    sb, SUPABASE_URL, SUPABASE_ANON_KEY,
    getCurrentUser, getAllInventory, matchNative, confidenceClass,
    openModal, closeModal, emit, PRESET_TAGS
} from './app.js';
import { generateCareProfile } from './features.js';

// ── Internal ────────────────────────────────────────────────────
function renderPreview(src) { /* copy from app.js:358-376 */ }
function resetIdResults() { /* copy from app.js:389-394 */ }
async function uploadImage(canvas) { /* copy from app.js:397-407, replace currentUser with getCurrentUser() */ }
async function uploadTempImage(canvas) { /* copy from app.js:410-424, replace currentUser with getCurrentUser() */ }
function buildEntry(result, imageUrl, notes) { /* copy from app.js:558-581, replace currentUser with getCurrentUser() */ }

// ── Exports ─────────────────────────────────────────────────────
export function handlePhoto(event) { /* copy from app.js:349-356 */ }
export function removeImage() { /* copy from app.js:378-387 */ }
export async function identifySpecies() { /* copy from app.js:427-486 */ }
export function renderIdCards(results) { /* copy from app.js:489-516 */ }
export function selectIdCard(index) { /* copy from app.js:518-523 */ }
export async function saveSelectedId() { /* copy from app.js:525-556, add emit('inventory-changed') after success */ }
export function openManualEntry() { /* copy from app.js:584-591 */ }
export async function saveManualEntry() { /* copy from app.js:593-641, add emit('inventory-changed') after success */ }
```

**Key changes during copy:**
- Replace `currentUser.id` with `getCurrentUser().id`
- Replace `allInventory` with `getAllInventory()` where read (only in `saveSelectedId` for the inserted check)
- In `saveSelectedId` and `saveManualEntry`: replace `await loadInventory()` with `emit('inventory-changed')`
- `pendingIdResults` and `selectedIdIndex` — these are capture-local state. Move them into this module as module-level `let` variables instead of importing from app.js. Remove from app.js exports.

---

## Task 9: Create js/inventory.js

**Files:**
- Create: `js/inventory.js`
- Source: `app.js:643-959` (inventory load, stats, search, filter, sort, render, detail modal, delete, timeline, export, natives DB, clear all)

- [ ] **Step 1: Create js/inventory.js**

```js
import {
    sb, getCurrentUser, getAllInventory, setAllInventory,
    getCurrentSeason, openModal, closeModal, emit,
    NATIVE_PLANTS, LOCATION_ZONES, LOCATION_HABITATS
} from './app.js';
import {
    renderTagEditor, renderBugPlantLink, renderLinkedBugs,
    renderPlantStatus, renderCareProfile
} from './features.js';

// ── Internal ────────────────────────────────────────────────────
let currentFilter = 'all';
let currentSearch = '';
let activeTagFilters = [];
let activeLocationFilter = '';
let currentSort = 'date-desc';

function getAllTags() { /* copy from app.js:693-697 */ }
function getAllLocations() { /* copy from app.js:699-703 */ }
function renderTagFilterDropdown() { /* copy from app.js:705-713 */ }
function renderLocationFilterDropdown() { /* copy from app.js:715-723 */ }
function download(blob, name) { /* copy from app.js:929-934 */ }
function today() { /* copy from app.js:936 */ }

// ── Exports ─────────────────────────────────────────────────────
export function updateStats() { /* copy from app.js:656-660 */ }
export function handleSearch(val) { /* copy from app.js:662-665, update currentSearch locally */ }
export function setFilter(filter, btnEl) { /* copy from app.js:667-672 */ }
export function toggleTagFilter(tag) { /* copy from app.js:674-680 */ }
export function setLocationFilter(loc) { /* copy from app.js:682-686 */ }
export function setSort(sort) { /* copy from app.js:688-691 */ }
export function toggleFilterDropdown(id) { /* copy from app.js:725-736 */ }
export function renderInventory() { /* copy from app.js:738-811 */ }
export function showItemDetail(item) { /* copy from app.js:814-868 */ }
export async function deleteItem(id, imageUrl) { /* copy from app.js:870-882, add emit('inventory-changed') */ }
export function renderTimeline() { /* copy from app.js:885-913 */ }
export async function exportJSON() { /* copy from app.js:916-919 */ }
export async function exportCSV() { /* copy from app.js:921-927 */ }
export async function clearAllData() { /* copy from app.js:938-947, add emit('inventory-changed') */ }
export function showNativesDB() { /* copy from app.js:950-959 */ }

// NEW: wrapper for linked bug onclick
export function showLinkedBug(id) {
    const item = getAllInventory().find(i => i.id === id);
    if (item) showItemDetail(item);
}
```

**Key changes during copy:**
- Replace `currentUser` with `getCurrentUser()`
- Replace `allInventory` with `getAllInventory()`
- Move filter/search/sort state variables INTO this module (they're only used here)
- Remove these state variables from `app.js`
- In `deleteItem` and `clearAllData`: replace `await loadInventory()` with `emit('inventory-changed')`
- Add `showLinkedBug` wrapper function

---

## Task 10: Create js/features.js

**Files:**
- Create: `js/features.js`
- Source: `app.js:961-1461` (tags, bug-plant linking, plant status, care profiles)

- [ ] **Step 1: Create js/features.js**

```js
import {
    sb, getCurrentUser, getAllInventory, setAllInventory, emit,
    SUPABASE_URL, SUPABASE_ANON_KEY,
    PRESET_TAGS, LOCATION_ZONES, LOCATION_HABITATS, openModal
} from './app.js';

// ── Tag editor ──────────────────────────────────────────────────
export function renderTagEditor(item) { /* copy from app.js:962-984 */ }
export async function toggleTag(itemId, tag) { /* copy from app.js:986-999 */ }
export async function removeTag(itemId, tag) { /* copy from app.js:1001-1011 */ }
export async function addCustomTag(itemId) { /* copy from app.js:1013-1029 */ }

// ── Bug ↔ Plant linking ────────────────────────────────────────
export function renderBugPlantLink(item) { /* copy from app.js:1032-1059 */ }
export function toggleBugPlantLink() { /* copy from app.js:1061-1068 */ }
export async function saveBugPlantLink(itemId) { /* copy from app.js:1070-1097 */ }
export function renderLinkedBugs(item) {
    /* copy from app.js:1099-1114 BUT fix the onclick:
       CHANGE: onclick="showItemDetail(allInventory.find(i=>i.id==='${b.id}'))"
       TO:     onclick="showLinkedBug('${b.id}')"
    */
}

// ── Plant status tracking ──────────────────────────────────────
export function renderPlantStatus(item) { /* copy from app.js:1117-1163 */ }
export function togglePlantStatus() { /* copy from app.js:1165-1172 */ }
export function parseLocation(loc) { /* copy from app.js:1175-1184 */ }
export function buildLocation(zone, habitat) { /* copy from app.js:1186-1188 */ }
export function setLocationZone(itemId, zone) { /* copy from app.js:1190-1198 */ }
export function setLocationHabitat(itemId, habitat) { /* copy from app.js:1200-1208 */ }
export async function savePlantStatus(itemId) { /* copy from app.js:1210-1248 */ }

// ── Care profiles ──────────────────────────────────────────────
export async function generateCareProfile(itemId, common, scientific, type, category) { /* copy from app.js:1251-1290 */ }
export async function refreshCareProfile(itemId) { /* copy from app.js:1292-1321 */ }
export function renderCareProfile(item) { /* copy from app.js:1323-1451 */ }
export function toggleCareProfile() { /* copy from app.js:1453-1460 */ }
```

**Key changes during copy:**
- Replace `currentUser` with `getCurrentUser()`
- Replace `allInventory` with `getAllInventory()` for reads
- For mutations to `allInventory` (like in `toggleTag` where it does `allInventory[idx].tags = tags`): use `getAllInventory()` to get the array reference — since it's the same array object, mutations work. OR call `setAllInventory()` if replacing.
- In `renderLinkedBugs`: change the onclick to use `showLinkedBug` wrapper
- In tag/status functions that call `renderInventory()` and `showItemDetail()`: replace with `emit('inventory-changed')` for re-render, but `showItemDetail` needs to be called directly. Import `showItemDetail` from `inventory.js`? NO — that creates `features.js` → `inventory.js` dependency which would be circular. Instead: use the event system. Emit an event, have inventory.js listen.

**Actually — simpler approach**: Functions like `toggleTag`, `savePlantStatus` etc. currently call `renderInventory()` and `showItemDetail(allInventory[idx])`. Instead of the event system for these, just call `emit('inventory-changed')` to re-render the grid, and for the detail modal refresh, have the function return and let the caller (window-bound onclick) handle it. But the current UX re-opens the detail modal with updated data...

**Simplest correct approach**: Import `showItemDetail` and `renderInventory` from `inventory.js` in `features.js`. This creates a `features.js` → `inventory.js` dependency. But `inventory.js` also imports from `features.js`. This is a **circular dependency**.

**Resolution**: For functions in `features.js` that need to refresh the detail modal, use the event system:
```js
// features.js
emit('item-updated', { itemId });

// app.js init
on('item-updated', ({ itemId }) => {
    renderInventory();
    const item = getAllInventory().find(i => i.id === itemId);
    if (item) showItemDetail(item);
});
```

This keeps the dependency graph clean: `features.js` → `app.js` only.

---

## Task 11: Update index.html script tag and delete old app.js (ATOMIC)

**Files:**
- Modify: `index.html:289`
- Delete: `app.js`

- [ ] **Step 1: Update index.html script tag**

Replace line 289:
```html
<script src="app.js?v=9"></script>
```
With:
```html
<script type="module" src="js/app.js?v=10"></script>
```

- [ ] **Step 2: Delete old app.js**

```bash
rm app.js
```

- [ ] **Step 3: Full functionality verification**

Open the app in a browser at 390px width. Test EVERY feature:

1. **Auth**: Sign in with email/password. Verify sign out works.
2. **Welcome screen**: Greeting, quote, fact display. "Start exploring" button works.
3. **Capture tab**: Take photo / gallery upload. Canvas preview renders. Remove image works. "Identify species" button calls edge function and shows results. Select a result card. Add notes. "Save to garden" works.
4. **Manual entry**: Open modal, fill fields, save. Verify it appears in garden.
5. **Garden tab**: Stats show correct counts. Search filters results. Type filters (All/Plants/Insects/Natives/Blooming) work. Tag filter dropdown opens and filters. Location filter works. Sort options work.
6. **Item detail**: Tap a garden card. Modal opens with image, name, details. Tag editor: toggle preset tags, add custom tag, remove custom tag. Plant status: expand, set health/flowering/height/location, save. Care profile: expand, view data, refresh works. Bug-plant linking (for insects): expand, select a plant, save. Linked bugs section (for plants): shows associated insects, tap opens that insect's detail.
7. **Timeline tab**: Shows seasons with blooming plants and active insects.
8. **Settings tab**: Export JSON downloads file. Export CSV downloads file. Browse native DB opens modal. Clear all data works (with confirmation). Sign out works.
9. **Console**: Open browser console. Verify NO errors on any action.

- [ ] **Step 4: Commit JS module split (atomic)**

```bash
git add js/app.js js/auth.js js/capture.js js/inventory.js js/features.js index.html
git rm app.js
git commit -m "Split app.js into ES modules: app, auth, capture, inventory, features

Atomic migration from single-file to ES module architecture.
5 JS files with import/export, event system for loose coupling,
window bindings for HTML event handlers. Zero functionality change.

Fixes renderLinkedBugs to use showLinkedBug wrapper instead of
referencing allInventory directly in inline onclick."
```

---

## Task 12: Update documentation

**Files:**
- Modify: `CLAUDE.md`, `PROJECT-STATE.md`

- [ ] **Step 1: Update CLAUDE.md**

Update the Architecture and Project Structure sections to reflect the new file structure:
- Replace three-file rule with new module conventions
- Document `js/` and `css/` directory structure
- Document ES module pattern (import/export, window bindings)
- Document event system (`on`/`emit` pattern)
- Document how to add new features (create new module, import from app.js, bind to window)

- [ ] **Step 2: Update PROJECT-STATE.md**

Update file inventory section with new files, line counts, and purposes. Remove old `app.js` and `style.css` entries.

- [ ] **Step 3: Commit documentation**

```bash
git add CLAUDE.md PROJECT-STATE.md
git commit -m "Update CLAUDE.md and PROJECT-STATE.md for module architecture"
```

---

## Task Dependency Order

```
Task 1 (directories)
  → Task 2 (base.css)
  → Task 3 (components.css)
  → Task 4 (screens.css)
    → Task 5 (update HTML, delete style.css, commit CSS split)
      → Task 6 (js/app.js)
      → Task 7 (js/auth.js)
      → Task 8 (js/capture.js)
      → Task 9 (js/inventory.js)
      → Task 10 (js/features.js)
        → Task 11 (update HTML, delete app.js, verify, commit JS split)
          → Task 12 (documentation)
```

Tasks 2-4 can run in parallel. Tasks 6-10 can run in parallel. Task 11 must wait for all JS files. Task 5 must wait for all CSS files.
