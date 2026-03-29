# Mobile Polish: Bottom Nav Safe Area + Overscroll UX

**Date:** 2026-03-28
**Scope:** CSS + JS only. No HTML changes. No new files.

---

## Problem 1: Bottom Nav Overlaps iPhone Home Indicator

### Root Cause
`.bottom-nav` has `height: var(--nav-height)` (72px, fixed) plus `padding-bottom: env(safe-area-inset-bottom)`. On iPhone (~34px safe area), the padding eats into the fixed height, leaving only ~38px for button content — below the 44px minimum touch target. Desktop shows 0px safe area inset so it looks fine there.

### Fix — `css/screens.css`

**`.bottom-nav`:** Change `height` to grow with the safe area instead of staying fixed:
```css
height: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px));
padding-bottom: env(safe-area-inset-bottom, 0px);
```

**`.screen`:** Update bottom padding to account for the taller nav so content isn't hidden behind it:
```css
padding: 0 0 calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + var(--space-6));
```

---

## Problem 2: Overscroll Shows White Gap + No Elastic Feel

### 2a — White Gap at Top During Rubber-Band Pull

**Root cause:** iOS reveals the `html` element background when overscrolling past the top. `html` has no background set, so it shows white.

**Fix — `css/base.css`:** Add one line to the existing `html` rule:
```css
html {
    height: 100%;
    background-color: #1c3a2b;
}
```

Forest green continues behind the page edge during top overscroll.

### 2b — Elastic Title Text on Pull-Down

**Goal:** When the user rubber-bands the page down (iOS "pull past top"), the header title + subtitle text scales up smoothly, then springs back when released.

**Fix — `js/app.js`:** Append an IIFE before the `Object.assign(window, {...})` block at the bottom.

```javascript
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

**Behavior:**
- While finger is pulling: `transition: none` so scale tracks the finger instantly
- On release: spring curve `(0.34, 1.56, 0.64, 1)` — slightly overshoots then settles
- Max scale: 1.25 (25% larger), reached at 62.5px of overscroll
- Targets `.screen-title` directly (the H1 heading) — works correctly for both garden tab (title inside wrapper div) and timeline tab (title direct child of `.screen-header`)
- `{ passive: true }` — does not block scrolling, no performance impact

---

## Files Changed

| File | Change |
|------|--------|
| `css/screens.css` | `.bottom-nav` height + `.screen` padding-bottom |
| `css/base.css` | `html` background-color |
| `js/app.js` | Overscroll IIFE appended near bottom |

## Deploy

Bump cache version in `index.html` (`?v=21`) on all three CSS `<link>` tags and the `<script>` tag. Also bump `CACHE_VERSION` in `sw.js`.

## Documentation Updates (final step)

After all code changes are made:
- `PROJECT-STATE.md` — update Design System section to note overscroll behavior and bottom nav safe-area fix; mark "Gesture Support" lesson 8 as partially done (overscroll elastic title)
- `PROJECT-CONTEXT.md` — add gotcha: `html { background-color }` controls overscroll rubber-band color on iOS; note bottom nav height must use `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))` not just padding
