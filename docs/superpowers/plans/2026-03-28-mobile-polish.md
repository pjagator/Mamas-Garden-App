# Mobile Polish: Bottom Nav + Overscroll UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bottom nav buttons bleeding into the iPhone home indicator, make the overscroll rubber-band show forest green instead of white, and add an elastic title scale effect when pulling past the top.

**Architecture:** Pure CSS + one JS IIFE. No new files. No HTML changes. The nav height grows to fit content + safe area. The `html` background color fills the overscroll gap. A passive scroll listener scales `.screen-title` when `window.scrollY < 0`.

**Tech Stack:** Vanilla CSS custom properties, vanilla JS, iPhone Safari `env(safe-area-inset-bottom)` / `env(safe-area-inset-top)`, service worker cache busting.

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `css/screens.css` | 188, 305, 312 | Nav height + screen padding safe-area fix |
| `css/base.css` | 58 | Add `background-color` to `html` rule |
| `js/app.js` | 489–490 (insert before) | Elastic title IIFE |
| `index.html` | 15, 16, 17, 366 | Bump `?v=20` → `?v=21` |
| `sw.js` | 1 | Bump `CACHE_VERSION` `v20` → `v21` |
| `PROJECT-STATE.md` | Design System section, Lesson 8 row | Doc update |
| `PROJECT-CONTEXT.md` | Gotchas section | Doc update |

---

## Task 1: Fix Bottom Nav Safe Area (`css/screens.css`)

**Files:**
- Modify: `css/screens.css:188` (`.screen` padding)
- Modify: `css/screens.css:305` (`.bottom-nav` height)
- Modify: `css/screens.css:312` (`.bottom-nav` padding-bottom)

**Root cause recap:** `.bottom-nav` has `height: 72px` (fixed) and `padding-bottom: env(safe-area-inset-bottom)`. On iPhone, the ~34px safe area padding eats into the fixed 72px, leaving only ~38px for buttons — below the 44px minimum touch target. Desktop shows 0px safe area so it looks fine there.

- [ ] **Step 1: Fix `.bottom-nav` height**

In `css/screens.css` at line 305, change:
```css
    height: var(--nav-height);
```
to:
```css
    height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
```

- [ ] **Step 2: Fix `.bottom-nav` padding-bottom**

At line 312 (same rule block), change:
```css
    padding-bottom: env(safe-area-inset-bottom);
```
to:
```css
    padding-bottom: env(safe-area-inset-bottom, 0px);
```
(Adding the `0px` fallback makes the `calc()` above work correctly in environments where the env() variable isn't defined.)

- [ ] **Step 3: Fix `.screen` bottom padding to match the taller nav**

At line 188 (inside the `.screen` rule), change:
```css
    padding: 0 0 calc(var(--nav-height) + var(--space-6));
```
to:
```css
    padding: 0 0 calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + var(--space-6));
```
This ensures content at the bottom of each screen isn't hidden behind the now-taller nav bar.

- [ ] **Step 4: Commit**

```bash
git add css/screens.css
git commit -m "fix: bottom nav height grows with safe-area-inset-bottom on iPhone"
```

---

## Task 2: Fix Overscroll Background Color (`css/base.css`)

**Files:**
- Modify: `css/base.css:58`

**Root cause:** iOS Safari reveals the `html` element background when rubber-banding past the top of the page. The `html` rule has no background set, so it shows white. Setting it to forest green makes the overscroll area match the app header.

- [ ] **Step 1: Add background-color to the `html` rule**

At line 58, change:
```css
html { height: 100%; }
```
to:
```css
html { height: 100%; background-color: #1c3a2b; }
```

- [ ] **Step 2: Commit**

```bash
git add css/base.css
git commit -m "fix: html background-color fills green during iOS overscroll rubber-band"
```

---

## Task 3: Elastic Title on Overscroll (`js/app.js`)

**Files:**
- Modify: `js/app.js:489` (insert before the window bindings comment)

**Behavior:** When `window.scrollY < 0` (iOS rubber-band pulling past the top), the `.screen-title` heading on the active screen scales up proportionally with the pull distance. When the finger releases, a spring curve animates it back. No transition while pulling (follows finger), spring transition on release.

- [ ] **Step 1: Insert the IIFE before the window bindings block**

In `js/app.js`, find this block near line 489–491:
```javascript
// ── Window bindings for HTML onclick/oninput/onchange handlers ──
Object.assign(window, {
```

Insert the following immediately before that comment line:

```javascript
// ── Elastic title on iOS overscroll ─────────────────────────────
(function() {
    let overscrolling = false;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        const header = document.querySelector('.active-screen .garden-header, .active-screen .screen-header');
        const titleEl = header?.querySelector('.screen-title');
        if (!titleEl) return;

        if (y < 0) {
            const scale = 1 + Math.min(-y / 250, 0.25);
            titleEl.style.transition = 'none';
            titleEl.style.transform = `scale(${scale})`;
            titleEl.style.transformOrigin = 'left bottom';
            overscrolling = true;
        } else if (overscrolling) {
            titleEl.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            titleEl.style.transform = '';
            overscrolling = false;
        }
    }, { passive: true });
})();

```

Notes on the implementation:
- `{ passive: true }` — tells the browser this listener never calls `preventDefault()`, so it won't block scroll performance
- `Math.min(-y / 250, 0.25)` — max 25% scale reached at ~62px of overscroll
- `cubic-bezier(0.34, 1.56, 0.64, 1)` — spring curve: slightly overshoots (bounces past 1.0) then settles, feels organic
- Targets `.active-screen` so it only affects the currently visible tab — not the hidden garden/timeline screens

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "feat: elastic screen-title scale on iOS overscroll pull-down"
```

---

## Task 4: Bump Cache Version (`index.html` + `sw.js`)

**Files:**
- Modify: `index.html:15,16,17,366`
- Modify: `sw.js:1`

The service worker caches CSS and JS by URL. Without a version bump, users on the live site will keep getting the old files from cache and see no changes.

- [ ] **Step 1: Bump version in `index.html`**

In `index.html`, replace all four occurrences of `?v=20` with `?v=21`:

Line 15: `<link rel="stylesheet" href="css/base.css?v=21">`
Line 16: `<link rel="stylesheet" href="css/components.css?v=21">`
Line 17: `<link rel="stylesheet" href="css/screens.css?v=21">`
Line 366: `<script type="module" src="js/app.js?v=21"></script>`

- [ ] **Step 2: Bump CACHE_VERSION in `sw.js`**

In `sw.js` at line 1, change:
```javascript
const CACHE_VERSION = 'v20';
```
to:
```javascript
const CACHE_VERSION = 'v21';
```

- [ ] **Step 3: Commit**

```bash
git add index.html sw.js
git commit -m "chore: bump cache to v21 for mobile polish deploy"
```

---

## Task 5: Update Documentation

**Files:**
- Modify: `PROJECT-STATE.md`
- Modify: `PROJECT-CONTEXT.md`

- [ ] **Step 1: Update `PROJECT-STATE.md`**

In the **Design System** section (around line 290), add to the iOS safe area bullet:
> Bottom nav height uses `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))` so buttons sit above the iPhone home indicator; `html { background-color: #1c3a2b }` fills the overscroll rubber-band gap at the top.

In the **Learning Plan** table (around line 388), update Lesson 8:
```
| 8. Gesture Support | **Partially done** — overscroll elastic title (scroll listener scales `.screen-title` when scrollY < 0). No swipe-to-delete or pull-to-refresh yet. |
```

- [ ] **Step 2: Update `PROJECT-CONTEXT.md`**

In the **Key Gotchas** section, add two new bullets:
> - iOS overscroll rubber-band color is controlled by `html { background-color }`, not `body`. Set it to the app's header color (`#1c3a2b`) so pulling past the top shows green rather than white.
> - Bottom nav safe area: use `height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))` — never a fixed height alone. Padding-bottom handles the inset; the height must grow to preserve button space.

- [ ] **Step 3: Commit**

```bash
git add PROJECT-STATE.md PROJECT-CONTEXT.md
git commit -m "docs: update state and context for mobile polish changes"
```

---

## Manual Verification Checklist

Test on a real iPhone (or Chrome DevTools with iPhone 15 Pro preset at 393px, with "Show device frame" enabled to see the home indicator):

- [ ] Garden tab: bottom nav buttons are fully visible above the home indicator with comfortable spacing
- [ ] Timeline tab: same — no button clipping
- [ ] Desktop Safari at 390px: nav looks identical to before (safe area = 0, no visual change)
- [ ] Pull the page down on the Garden tab: green color fills the area above the header (no white gap)
- [ ] Pull harder: "My Garden" title text grows larger
- [ ] Release finger: title springs back with a slight bounce
- [ ] Switch to Timeline tab, pull down: "Timeline" title does the same thing
- [ ] Hard-refresh on the live site after deploy: confirms new cache version loaded (check Network tab — `?v=21` requests should return 200, not from SW cache)
