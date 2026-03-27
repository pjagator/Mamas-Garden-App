# UI Polish: Status Bar, System Font, Font Sizing, Collapsible Search, Conditional Welcome

**Date**: 2026-03-27
**Status**: Approved

---

## 1. Status Bar Bleed

The green header background currently cuts off below the iPhone status bar area. Fix by extending colored backgrounds into the safe area.

### Changes

- **index.html**: Add `viewport-fit=cover` to the viewport meta tag to activate `env(safe-area-inset-top)` in Safari
- **`.garden-header`** (screens.css): Change `padding: 48px ...` to `padding: calc(48px + env(safe-area-inset-top, 0px)) ...`
- **`.screen-header`** (screens.css): Change `padding: 56px ...` to include safe area inset top
- **`.welcome-container`** (screens.css): Add `padding-top: env(safe-area-inset-top, 0px)` so greeting text doesn't sit under the notch
- **Auth screen**: No change needed — card is centered with flexbox, floats in the middle
- `theme-color` meta tag already set to `#1c3a2b`, matches header green

## 2. Body Font Swap

Replace DM Sans with the iOS system font for body text. Keep Playfair Display for headings.

### Changes

- **base.css**: Change `--font-body` from `'DM Sans', -apple-system, sans-serif` to `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- **`--font-display`**: No change — stays `'Playfair Display', Georgia, serif`
- **index.html**: Trim Google Fonts `<link>` to load only Playfair Display (remove DM Sans from the URL). Fewer external requests, faster load.

## 3. Targeted Font Bumps

Increase font sizes only on text that feels small in open, spacious areas. Dense areas (card grids, filter chips, detail modal content, search bar) stay untouched.

| Element | Current | New | Selector |
|---------|---------|-----|----------|
| Garden header subtitle | `text-xs` (12px) | `text-sm` (14px) | `.garden-header .screen-sub` |
| Screen header subtitle (Timeline) | `text-sm` (14px) | `text-base` (16px) | `.screen-sub` |
| Welcome greeting | 13px | 14px | `.welcome-greeting` |
| Welcome quote text | 20px | 22px | `.welcome-quote-text` |
| Welcome attribution | 13px | 14px | `.welcome-attribution` |
| Welcome fact text | 13px | 14px | `.welcome-fact-text` |
| Auth subtitle | `text-sm` (14px) | `text-base` (16px) | `.auth-sub` |
| Settings hints | `text-sm` (14px) | `text-base` (16px) | `.settings-hint` |
| Timeline empty state | `text-sm` (14px) | `text-base` (16px) | `.timeline-empty` |

## 4. Collapsible Search

Replace the always-visible search bar in the garden header with a magnifying glass icon that expands on tap.

### Resting State

Two icon buttons in `.garden-header-top` right side: magnifying glass + gear. Same visual style (32px circle, `rgba(255,255,255,0.12)` background, backdrop blur). The search input is hidden.

### Expanded State

Tapping the magnifying glass shows a full-width search bar that overlays the entire `.garden-header` (absolutely positioned). Same frosted glass style as the current search bar. Magnifying glass icon inside. Input auto-focuses to open keyboard.

### Dismissing

Tap the magnifying glass icon inside the expanded bar, or tap anywhere outside it. Dismissing clears the search text and calls `applyFilters()` to reset the grid. No separate X button.

### Implementation

- Add search icon button next to `.gear-btn` in index.html garden header markup
- Add `.garden-search-overlay` div (absolutely positioned, hidden by default) with the search input inside
- JS: `toggleGardenSearch()` function in app.js toggles visibility class, focuses input. Click-outside listener dismisses. Wire to `window` bindings.
- Existing `oninput` filter logic in inventory.js unchanged
- CSS: fade + slight slide-down transition for the overlay

## 5. Conditional Welcome Screen

Skip the welcome screen if the user was active less than 1 hour ago. Show it as a greeting after longer absences.

### Logic

- On `dismissWelcome()` and on navigation away from welcome: `localStorage.setItem('garden-last-visit', Date.now())`
- In `onAuthStateChange` handler, before showing welcome: check if `garden-last-visit` exists and is less than 3,600,000ms old
  - If recent: skip welcome, call `showScreen('garden', ...)` directly
  - If stale or missing: show welcome as usual
- Add `visibilitychange` listener to update the timestamp when the page becomes hidden (covers app close/switch)

### Edge Cases

- First-ever visit (no timestamp): show welcome
- Sign out and back in within an hour: skip welcome (timestamp still valid)
- localStorage cleared: show welcome (safe default)

---

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | viewport-fit=cover, trim Google Fonts URL, add search icon button + search overlay markup |
| `css/base.css` | `--font-body` system font stack |
| `css/screens.css` | Safe area padding on headers/welcome, font bumps on 9 selectors, collapsible search styles |
| `js/app.js` | `toggleGardenSearch()`, click-outside listener, conditional welcome logic, `visibilitychange` timestamp, window bindings |
