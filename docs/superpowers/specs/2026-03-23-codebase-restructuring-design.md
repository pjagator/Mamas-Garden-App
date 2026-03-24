# Codebase Restructuring Design

**Date**: 2026-03-23
**Status**: Approved
**Goal**: Split the monolithic three-file frontend into ES modules and separated CSS files without losing any functionality. Position the codebase for future features (health history, garden map, plant arrangement, planting guide, reminders).

---

## Context

The app is a mobile-first Tampa Bay garden tracker. Three frontend files:

- `app.js` (1,471 lines) — all JS logic
- `style.css` (1,216 lines) — all styles, with duplicate rule blocks
- `index.html` (291 lines) — HTML structure

This works but `app.js` handles 10+ concerns in a single file, and `style.css` has conflicting duplicate CSS rules. The roadmap adds 5+ features. Continuing in a monolith will make development increasingly painful.

## Constraints

- No build tools, no npm, no bundler
- ES modules via `<script type="module">` (no framework)
- iPhone Safari is the target device
- Zero functionality change — this is a restructuring, not a rewrite
- All `onclick` attributes in HTML stay as-is (wired through `window` bindings)

---

## JS File Structure

All files in `js/` directory. ES module `import`/`export` between files.

### js/app.js (~300 lines) — Entry Point

**Responsibility**: Supabase client, shared state, navigation, helpers, event system, welcome screen.

**Exports**:
- `sb` — Supabase client instance
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — connection constants
- State: `currentUser` (get/set), `allInventory` (get/set), `currentFilter`, `currentSearch`, `activeTagFilters`, `activeLocationFilter`, `currentSort`, `pendingIdResults`, `selectedIdIndex`
- Data arrays: `NATIVE_PLANTS`, `PRESET_TAGS`, `LOCATION_ZONES`, `LOCATION_HABITATS`, `GARDEN_QUOTES`, `GARDEN_FACTS`
- Helpers: `getSeason()`, `getCurrentSeason()`, `confidenceClass()`, `matchNative()`
- Navigation: `showScreen()`, `openModal()`, `closeModal()`
- Event system: `on(event, fn)`, `emit(event, data)`
- Inventory: `loadInventory()`, `updateStats()`
- Welcome: `initWelcomeScreen()`, `dismissWelcome()`
- `window` bindings for all HTML `onclick` handlers across all modules

**Imports from**: No other project modules (this is the root).

**Init flow**:
1. Create Supabase client
2. Import all modules (auth, capture, inventory, features)
3. Register `sb.auth.onAuthStateChange` — on auth success: init welcome screen, load inventory, render timeline
4. Bind all `onclick` functions to `window`

### js/auth.js (~120 lines)

**Responsibility**: All authentication flows.

**Exports**: `initAuth`, `showAuthTab`, `handleSignIn`, `handleSignUp`, `handleSendCode`, `handleVerifyCode`, `handlePasswordReset`, `handleSignOut`

**Imports from**: `app.js` (sb)

### js/capture.js (~250 lines)

**Responsibility**: Photo capture, canvas preview, image upload (temp + final), species identification via edge function, ID result card rendering, manual entry modal, save flow.

**Exports**: `handlePhoto`, `removeImage`, `identifySpecies`, `renderIdCards`, `selectIdCard`, `saveSelectedId`, `openManualEntry`, `saveManualEntry`

**Imports from**: `app.js` (sb, currentUser, SUPABASE_URL, SUPABASE_ANON_KEY, matchNative, confidenceClass, openModal, closeModal, loadInventory, emit, PRESET_TAGS), `features.js` (generateCareProfile)

**On save**: calls `emit('inventory-changed')` so other modules can react.

### js/inventory.js (~300 lines)

**Responsibility**: Garden grid rendering, search/filter/sort, item detail modal orchestration, delete, timeline, export, native DB modal, clear all data.

**Exports**: `renderInventory`, `updateStats`, `handleSearch`, `setFilter`, `setSort`, `toggleTagFilter`, `setLocationFilter`, `toggleFilterDropdown`, `showItemDetail`, `deleteItem`, `renderTimeline`, `exportJSON`, `exportCSV`, `clearAllData`, `showNativesDB`

**Imports from**: `app.js` (sb, currentUser, allInventory, state getters, getCurrentSeason, openModal, closeModal, loadInventory, NATIVE_PLANTS, LOCATION_ZONES, LOCATION_HABITATS), `features.js` (renderTagEditor, renderBugPlantLink, renderLinkedBugs, renderPlantStatus, renderCareProfile)

**Note**: `showItemDetail` builds the detail modal by calling render functions from `features.js` for each enrichment section.

### js/features.js (~350 lines)

**Responsibility**: All item-detail enrichment sections — tag editor, bug-plant linking, plant status tracking, care profile generation and display.

**Exports**: `renderTagEditor`, `toggleTag`, `removeTag`, `addCustomTag`, `renderBugPlantLink`, `toggleBugPlantLink`, `saveBugPlantLink`, `renderLinkedBugs`, `renderPlantStatus`, `togglePlantStatus`, `savePlantStatus`, `parseLocation`, `buildLocation`, `setLocationZone`, `setLocationHabitat`, `renderCareProfile`, `toggleCareProfile`, `refreshCareProfile`, `generateCareProfile`

**Imports from**: `app.js` (sb, currentUser, allInventory, emit, SUPABASE_URL, SUPABASE_ANON_KEY, PRESET_TAGS, LOCATION_ZONES, LOCATION_HABITATS, openModal)

---

## Event System

Simple pub/sub in `app.js` to decouple modules:

```js
const listeners = {};
export function on(event, fn) { (listeners[event] ||= []).push(fn); }
export function emit(event, data) { (listeners[event] || []).forEach(fn => fn(data)); }
```

**Events**:
- `inventory-changed` — emitted after save/delete/update. Listeners: inventory.js (re-render grid + timeline), future garden-map.js, future health.js.

Modules that modify inventory call `emit('inventory-changed')` instead of directly calling `loadInventory()` + `renderInventory()` + `renderTimeline()`. The `app.js` init registers the listener that calls those functions.

---

## Dependency Rules

```
js/app.js          ← imports from nothing (root)
js/auth.js         ← imports from app.js only
js/capture.js      ← imports from app.js + features.js
js/inventory.js    ← imports from app.js + features.js
js/features.js     ← imports from app.js only
```

No circular dependencies. If two non-root modules need to communicate, they use the event system.

---

## CSS File Structure

All files in `css/` directory. Loaded via `<link>` tags in `index.html`.

### css/base.css (~300 lines) — Design System

- Reset, box-sizing, `-webkit-tap-highlight-color`
- `:root` custom properties: all colors, typography scale (7 steps), spacing scale (8 steps), shadows (3 levels), radii, font stacks, nav height
- `html`, `body` base styles
- `.field`, `.field-label`, `textarea.field`, `select.field`
- All button variants: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `label.btn-capture`, `.btn-row`
- `.checkbox-row`
- `small`, `small a`
- `.divider`
- `.spinner`, `.spinner-wrap`, `.spinner-label` (SINGLE definition — deduplicated)
- `@media (prefers-reduced-motion)` (when added)
- `@supports (-webkit-touch-callout)` iOS font-size fix

### css/components.css (~400 lines) — Reusable Pieces

- ID result cards: `.id-card`, `.id-card-name`, `.id-card-sci`, `.id-card-desc`, `.id-card-tags` (SINGLE definition — deduplicated, using canonical `--green-deep` variable)
- `.confidence-badge` + variants `.high`, `.mid`, `.low` (chosen over `.confidence-pill` — deduplicated)
- `.id-notes`, `.id-save-row`
- Tags: `.tag` + all variants (`.native`, `.plant-tag`, `.location-tag`, `.plant`, `.bug`, `.season`, `.health-good`, `.health-bad`, `.health-neutral`)
- Tag editor: `.tag-editor-section`, `.tag-chips-row`, `.tag-chip`, `.tag-chip.active`
- Garden cards: `.garden-card`, `.garden-card-img`, `.garden-card-img-placeholder`, `.garden-card-info`, `.garden-card-name`, `.garden-card-sci`, `.garden-card-tags`
- Detail view: `.detail-img`, `.detail-name`, `.detail-sci`, `.detail-row`, `.detail-key`, `.detail-val`, `.detail-notes`, `.detail-notes-label`, `.detail-notes-text`, `.detail-delete`
- Care profile: `.care-profile-section`, `.care-profile-header`, `.care-profile-title`, `.care-toggle`, `.care-profile-body`, `.care-item`, `.care-icon`, `.care-label`, `.care-value`, `.care-note`
- Plant status: `.plant-status-section`, `.plant-status-header`, `.plant-status-body`
- Linked bugs: `.linked-bug-row`, `.linked-bug-icon`, `.linked-bug-name`, `.linked-bug-sci`
- Native items: `.native-item`, `.native-item-name`, `.native-item-sci`, `.native-item-detail`
- Filter/sort: `.chip`, `.filter-dropdown`, `.sort-row`, `.sort-select`

### css/screens.css (~500 lines) — Screen Layouts

- Auth: `#auth-screen`, `.auth-card`, `.auth-logo`, `.auth-title`, `.auth-sub`, `.auth-tabs`, `.auth-tab`, `.auth-msg`
- App shell: `#app`
- Welcome: `#welcome-screen`, `.welcome-container`, `.welcome-greeting`, `.welcome-quote-block`, `.welcome-quote`, `.welcome-attribution`, `.welcome-fact-block`, `.welcome-fact-label`, `.welcome-fact`, `.welcome-enter-btn`
- Screens: `.screen`, `.active-screen`, `@keyframes screenIn`, `.screen-header`, `.screen-title`, `.screen-sub`
- Bottom nav: `.bottom-nav`, `.nav-btn`, `.nav-icon`, `.nav-label`
- Capture: `.capture-zone`, `.capture-placeholder`, `.capture-icon`, `#preview-canvas`, `.remove-btn`, `.capture-actions`, `.btn-identify`, `.btn-icon`, `.results-heading`, `.results-sub`
- Garden: `.stats-row`, `.stat`, `.search-row`, `.search-input`, `.filter-row`, `.garden-grid`, `.empty-state`
- Timeline: `#timeline-content`, `.season-block`, `.season-title`, `.timeline-entry`, `.timeline-icon`, `.timeline-name`, `.timeline-sci`, `.timeline-empty`
- Settings: `.settings-group`, `.settings-label`, `.settings-hint`, `.settings-feedback`, `.danger-group`
- Modals: `.modal-overlay`, `.modal-sheet`, `.modal-close`, `.modal-title`, `.modal-sub`, `@keyframes overlayIn`, `@keyframes sheetIn`
- `@media (max-width: 360px)` garden grid override

---

## CSS Cleanup During Split

| Issue | Fix |
|-------|-----|
| `.id-card` defined twice (lines ~539 and ~1119) with conflicting values | Keep first definition's structure, use canonical `--green-deep` variable. Remove duplicate block. |
| `.spinner-wrap` and `.spinner-label` defined twice | Single definition in `base.css` |
| `.confidence-pill` vs `.confidence-badge` both exist | Keep `.confidence-badge`. Update any HTML references from `.confidence-pill` to `.confidence-badge`. |
| `var(--forest, #1c3a2b)` fallbacks in duplicate block | Remove. Canonical variable is `--green-deep`, defined in `:root`. |
| `var(--cream, #f5f0e8)` fallbacks in duplicate block | Remove. Canonical variable is `--cream`, defined in `:root`. |
| `var(--ink-mid, #666)` fallbacks in duplicate block | Remove. Canonical variable is `--ink-mid`, defined in `:root` as `#4a4a4a`. |

---

## index.html Changes

Replace:
```html
<link rel="stylesheet" href="style.css?v=9">
```
With:
```html
<link rel="stylesheet" href="css/base.css?v=10">
<link rel="stylesheet" href="css/components.css?v=10">
<link rel="stylesheet" href="css/screens.css?v=10">
```

Replace:
```html
<script src="app.js?v=9"></script>
```
With:
```html
<script type="module" src="js/app.js?v=10"></script>
```

No other HTML changes. All `onclick` attributes stay as-is.

---

## Migration Strategy

### Step 1: Create directories
Create `js/` and `css/` folders.

### Step 2: CSS split (lower risk)
- Split `style.css` into three files with deduplication
- Update `index.html` link tags
- Delete old `style.css`
- **Checkpoint**: app should look identical. Commit.

### Step 3: JS modules
- Create all 5 JS files with proper `import`/`export`
- Add event system to `app.js`
- Add `window` bindings for all HTML `onclick` handlers
- Update `index.html` script tag to `type="module"`
- Delete old `app.js`
- **Checkpoint**: all features should work identically. Commit.

### Step 4: Documentation
- Update `CLAUDE.md` with new file structure and module conventions
- Update `PROJECT-STATE.md`

---

## Extensibility

Future features slot in cleanly:

| Feature | New Files | Imports From |
|---------|-----------|-------------|
| Health history timeline | `js/health.js`, extends `css/components.css` | `app.js` |
| Garden map | `js/garden-map.js`, `css/garden-map.css` | `app.js` |
| Plant arrangement views | Extends `js/inventory.js` | — |
| Seasonal reminders | Extends `features.js` or new `js/reminders.js` | `app.js` |
| Planting guide | `js/guide.js`, extends `css/screens.css` | `app.js` |

New modules listen for `'inventory-changed'` events to stay in sync. New screens register through the existing `showScreen()` mechanism.

---

## What Does NOT Change

- `index.html` structure (screens, modals, nav) — only link/script tags change
- All Supabase queries — moved to new homes, logic unchanged
- Edge functions — not touched
- All `onclick` attributes in HTML — wired through `window` bindings
- Feature behavior — zero additions, zero removals
- `manifest.json`, `LICENSE`, documentation files (except CLAUDE.md and PROJECT-STATE.md updates)
