# UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend header colors into the iPhone status bar, swap body font to the system font, bump font sizes on text in open spaces, replace the always-visible search bar with a collapsible magnifying glass, and skip the welcome screen if the user visited less than an hour ago.

**Architecture:** Pure CSS/HTML/JS changes across 4 files. No new modules, no backend changes. The collapsible search adds a small amount of JS to app.js and new CSS to screens.css. The conditional welcome adds a localStorage timestamp check to the existing auth state handler.

**Tech Stack:** Vanilla JS, CSS custom properties, HTML meta tags

**Spec:** `docs/superpowers/specs/2026-03-27-ui-polish-design.md`

---

### Task 1: Status Bar Bleed

**Files:**
- Modify: `index.html:5` (viewport meta tag)
- Modify: `css/screens.css:198-202` (`.screen-header` padding)
- Modify: `css/screens.css:221-222` (`.garden-header` padding)
- Modify: `css/screens.css:108-116` (`.welcome-container` padding)

- [ ] **Step 1: Add `viewport-fit=cover` to the viewport meta tag**

In `index.html`, change line 5 from:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

- [ ] **Step 2: Add safe area top padding to `.screen-header`**

In `css/screens.css`, change:

```css
.screen-header {
    background: var(--bg-header);
    color: var(--white);
    padding: 56px var(--space-6) 28px;
}
```

to:

```css
.screen-header {
    background: var(--bg-header);
    color: var(--white);
    padding: calc(56px + env(safe-area-inset-top, 0px)) var(--space-6) 28px;
}
```

- [ ] **Step 3: Add safe area top padding to `.garden-header`**

In `css/screens.css`, change:

```css
.garden-header {
    background: var(--bg-header);
    padding: 48px var(--space-5) var(--space-4);
}
```

to:

```css
.garden-header {
    background: var(--bg-header);
    padding: calc(48px + env(safe-area-inset-top, 0px)) var(--space-5) var(--space-4);
}
```

- [ ] **Step 4: Add safe area top padding to `.welcome-container`**

In `css/screens.css`, change:

```css
.welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 var(--space-8);
    text-align: center;
}
```

to:

```css
.welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: env(safe-area-inset-top, 0px) var(--space-8) 0;
    text-align: center;
}
```

- [ ] **Step 5: Commit**

```bash
git add index.html css/screens.css
git commit -m "feat: extend header colors into iPhone status bar area"
```

---

### Task 2: Body Font Swap

**Files:**
- Modify: `index.html:14` (Google Fonts link)
- Modify: `css/base.css:25` (`--font-body` custom property)

- [ ] **Step 1: Change `--font-body` to system font stack**

In `css/base.css`, change:

```css
    --font-body:    'DM Sans', -apple-system, sans-serif;
```

to:

```css
    --font-body:    -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
```

- [ ] **Step 2: Remove DM Sans from Google Fonts link**

In `index.html`, change line 14 from:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
```

to:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Commit**

```bash
git add css/base.css index.html
git commit -m "feat: swap body font from DM Sans to iOS system font"
```

---

### Task 3: Targeted Font Bumps

**Files:**
- Modify: `css/screens.css` (9 selectors)

- [ ] **Step 1: Bump garden header subtitle**

In `css/screens.css`, change:

```css
.garden-header .screen-sub {
    font-family: var(--font-display);
    font-size: var(--text-xs);
```

to:

```css
.garden-header .screen-sub {
    font-family: var(--font-display);
    font-size: var(--text-sm);
```

- [ ] **Step 2: Bump screen header subtitle (Timeline)**

In `css/screens.css`, change:

```css
.screen-sub {
    color: var(--green-light);
    font-size: var(--text-sm);
    font-weight: 300;
}
```

to:

```css
.screen-sub {
    color: var(--green-light);
    font-size: var(--text-base);
    font-weight: 300;
}
```

- [ ] **Step 3: Bump welcome screen text sizes**

In `css/screens.css`, change `.welcome-greeting` font-size from `13px` to `14px`:

```css
.welcome-greeting {
    font-size: 14px;
```

Change `.welcome-quote-text` font-size from `20px` to `22px`:

```css
.welcome-quote-text {
    font-family: var(--font-display);
    font-size: 22px;
```

Change `.welcome-attribution` font-size from `13px` to `14px`:

```css
.welcome-attribution {
    font-size: 14px;
```

Change `.welcome-fact-text` font-size from `13px` to `14px`:

```css
.welcome-fact-text {
    font-size: 14px;
```

- [ ] **Step 4: Bump auth subtitle**

In `css/screens.css`, change:

```css
.auth-sub {
    text-align: center;
    color: var(--ink-light);
    font-size: var(--text-sm);
```

to:

```css
.auth-sub {
    text-align: center;
    color: var(--ink-light);
    font-size: var(--text-base);
```

- [ ] **Step 5: Bump settings hints**

In `css/screens.css`, change:

```css
.settings-hint { font-size: var(--text-sm); color: var(--ink-light); margin-bottom: var(--space-3); line-height: 1.5; }
```

to:

```css
.settings-hint { font-size: var(--text-base); color: var(--ink-light); margin-bottom: var(--space-3); line-height: 1.5; }
```

- [ ] **Step 6: Bump timeline empty state**

In `css/screens.css`, change:

```css
.timeline-empty { color: var(--ink-light); font-size: var(--text-sm); padding: var(--space-2) 0; font-style: italic; }
```

to:

```css
.timeline-empty { color: var(--ink-light); font-size: var(--text-base); padding: var(--space-2) 0; font-style: italic; }
```

- [ ] **Step 7: Commit**

```bash
git add css/screens.css
git commit -m "feat: bump font sizes on text in open/spacious areas"
```

---

### Task 4: Collapsible Search — HTML

**Files:**
- Modify: `index.html:92-106` (garden header markup)

- [ ] **Step 1: Replace the inline search bar with icon button + overlay**

In `index.html`, replace the garden header section (lines 92-106):

```html
        <div class="screen-header garden-header">
            <div class="garden-header-top">
                <div>
                    <h1 class="screen-title">My Garden</h1>
                    <p class="screen-sub" id="garden-subtitle"></p>
                </div>
                <button class="gear-btn" onclick="openSettingsSheet()" aria-label="Settings">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
            </div>
            <div class="garden-search">
                <span class="search-icon">🔍</span>
                <input type="text" class="garden-search-input" id="search-input" placeholder="Search your garden..." oninput="handleSearch(this.value)">
            </div>
        </div>
```

with:

```html
        <div class="screen-header garden-header">
            <div class="garden-header-top">
                <div>
                    <h1 class="screen-title">My Garden</h1>
                    <p class="screen-sub" id="garden-subtitle"></p>
                </div>
                <div class="garden-header-actions">
                    <button class="gear-btn" onclick="toggleGardenSearch()" aria-label="Search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </button>
                    <button class="gear-btn" onclick="openSettingsSheet()" aria-label="Settings">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    </button>
                </div>
            </div>
            <div class="garden-search-overlay" id="garden-search-overlay">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5;flex-shrink:0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" class="garden-search-input" id="search-input" placeholder="Search your garden..." oninput="handleSearch(this.value)">
            </div>
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: replace inline search bar with collapsible search markup"
```

---

### Task 5: Collapsible Search — CSS

**Files:**
- Modify: `css/screens.css` (replace `.garden-search` styles, add overlay + actions styles)

- [ ] **Step 1: Add `.garden-header-actions` flex container**

In `css/screens.css`, after the `.gear-btn` styles (after line 255), add:

```css
.garden-header-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
}
```

- [ ] **Step 2: Replace `.garden-search` styles with `.garden-search-overlay`**

In `css/screens.css`, replace the existing `.garden-search` block (lines 256-266):

```css
.garden-search {
    margin-top: var(--space-3);
    background: rgba(255,255,255,0.12);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}
```

with:

```css
.garden-search-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(28, 58, 43, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    align-items: center;
    padding: calc(48px + env(safe-area-inset-top, 0px)) var(--space-5) var(--space-4);
    gap: 10px;
    opacity: 0;
    display: flex;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity 200ms ease, transform 200ms ease;
}
.garden-search-overlay.open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}
```

- [ ] **Step 3: Make `.garden-header` position relative**

In `css/screens.css`, add `position: relative;` to the `.garden-header` rule:

```css
.garden-header {
    background: var(--bg-header);
    padding: calc(48px + env(safe-area-inset-top, 0px)) var(--space-5) var(--space-4);
    position: relative;
}
```

- [ ] **Step 4: Remove the `.search-icon` rule**

In `css/screens.css`, delete:

```css
.search-icon {
    font-size: 14px;
    opacity: 0.5;
}
```

- [ ] **Step 5: Commit**

```bash
git add css/screens.css
git commit -m "feat: add collapsible search overlay CSS"
```

---

### Task 6: Collapsible Search — JavaScript

**Files:**
- Modify: `js/app.js` (add `toggleGardenSearch` function and window binding)

- [ ] **Step 1: Add `toggleGardenSearch` function**

In `js/app.js`, add this function after the `dismissWelcome` function (after line 257):

```javascript
// ── Collapsible garden search ───────────────────────────────────
export function toggleGardenSearch() {
    const overlay = document.getElementById('garden-search-overlay');
    const input = document.getElementById('search-input');
    const isOpen = overlay.classList.contains('open');

    if (isOpen) {
        overlay.classList.remove('open');
        input.value = '';
        handleSearch('');
    } else {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 50);
    }
}

// Close search when tapping outside the input area
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('garden-search-overlay');
    if (!overlay || !overlay.classList.contains('open')) return;
    // If click is inside the overlay (input or icon), do nothing
    if (overlay.contains(e.target)) return;
    // If click is on the search toggle button, let toggleGardenSearch handle it
    const toggleBtn = e.target.closest('[aria-label="Search"]');
    if (toggleBtn) return;
    // Otherwise close
    overlay.classList.remove('open');
    document.getElementById('search-input').value = '';
    handleSearch('');
});
```

- [ ] **Step 2: Add `toggleGardenSearch` to window bindings**

In `js/app.js`, in the `Object.assign(window, { ... })` block, add `toggleGardenSearch` to the Navigation line:

```javascript
    // Navigation
    showScreen, dismissWelcome, openCaptureModal, closeCaptureModal, openSettingsSheet, toggleGardenSearch,
```

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add collapsible search toggle and click-outside dismiss"
```

---

### Task 7: Conditional Welcome Screen

**Files:**
- Modify: `js/app.js` (auth state handler + dismissWelcome + visibilitychange listener)

- [ ] **Step 1: Update `dismissWelcome` to save timestamp**

In `js/app.js`, at the top of the `dismissWelcome` function (line 236), add the timestamp save as the first line inside the function:

```javascript
export function dismissWelcome() {
    localStorage.setItem('garden-last-visit', Date.now().toString());
    const welcome = document.getElementById('welcome-screen');
```

- [ ] **Step 2: Update `showScreen` to save timestamp**

In `js/app.js`, at the top of the `showScreen` function (line 260), add the timestamp save as the first line inside the function:

```javascript
export function showScreen(name, btnEl) {
    localStorage.setItem('garden-last-visit', Date.now().toString());
    const current = document.querySelector('.screen.active-screen:not(#welcome-screen)');
```

- [ ] **Step 3: Add conditional logic in auth state handler**

In `js/app.js`, replace the block that unconditionally shows the welcome screen (lines 365-369):

```javascript
        // Show welcome screen, hide all tab screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('welcome-screen').classList.add('active-screen');
        initWelcomeScreen();
```

with:

```javascript
        // Show welcome screen or skip to garden if visited recently
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const lastVisit = parseInt(localStorage.getItem('garden-last-visit') || '0', 10);
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - lastVisit < oneHour) {
            document.getElementById('tab-garden').classList.add('active-screen');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.toggle('active', b.querySelector('.nav-label')?.textContent === 'Garden');
            });
        } else {
            document.getElementById('welcome-screen').classList.add('active-screen');
            initWelcomeScreen();
        }
```

- [ ] **Step 4: Add visibilitychange listener to save timestamp on page hide**

In `js/app.js`, add this after the service worker registration block (after line 469):

```javascript
// ── Save last visit timestamp when leaving ───────────────────
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && getCurrentUser()) {
        localStorage.setItem('garden-last-visit', Date.now().toString());
    }
});
```

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: skip welcome screen if user visited within the last hour"
```

---

### Task 8: Cache Bust and Final Verification

**Files:**
- Modify: `index.html:15-17,346` (bump `?v=` query strings)
- Modify: `sw.js` (bump CACHE_VERSION)

- [ ] **Step 1: Bump cache version in index.html**

In `index.html`, change all `?v=17` to `?v=18` on lines 15, 16, 17, and 346:

```html
    <link rel="stylesheet" href="css/base.css?v=18">
    <link rel="stylesheet" href="css/components.css?v=18">
    <link rel="stylesheet" href="css/screens.css?v=18">
```

```html
<script type="module" src="js/app.js?v=18"></script>
```

- [ ] **Step 2: Bump CACHE_VERSION in sw.js**

In `sw.js`, change the CACHE_VERSION constant from `17` to `18`.

- [ ] **Step 3: Manual verification checklist**

Test in Chrome DevTools at 390px width (iPhone):
1. Status bar area: green header extends to the very top of the viewport
2. Body font: text should look like native iOS (SF Pro), not DM Sans
3. Font sizes: garden subtitle, welcome greeting/quote/attribution/fact, auth subtitle, settings hints, timeline empty state should all be noticeably larger
4. Search: garden header shows magnifying glass icon next to gear. Tap to expand full-width overlay. Tap again or outside to dismiss. Search filtering still works.
5. Welcome screen: first load shows welcome. Dismiss, reload within a minute — should skip to garden. Wait 1+ hour (or manually set `garden-last-visit` to an old timestamp in DevTools localStorage) — should show welcome again.

- [ ] **Step 4: Commit**

```bash
git add index.html sw.js
git commit -m "chore: bump cache version to v18"
```
