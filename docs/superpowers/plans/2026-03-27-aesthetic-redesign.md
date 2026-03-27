# Aesthetic Redesign: "The Botanical Journal" — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the app from functional to world-class with Jony Ive-inspired aesthetics — gradient surfaces, smooth typography, unified card system, literary personality, organic animations, and simplified navigation.

**Architecture:** Pure CSS/HTML/JS changes — no new dependencies, no build tools. CSS variables and gradients for the visual system, vanilla JS for animations and navigation restructure. Changes span all 3 CSS files, all 4 JS modules, and index.html.

**Tech Stack:** Vanilla JS (ES modules), CSS custom properties, HTML5

**Spec:** `docs/superpowers/specs/2026-03-26-aesthetic-redesign-design.md`

---

## Task 0: CSS Foundation — Variables, Text Rendering, Gradients

**Files:**
- Modify: `css/base.css:4-57` (`:root` variables and body styles)

This task updates the design tokens that everything else builds on. No visual breakage — just smoother text and updated variable values.

- [ ] **Step 1: Add text rendering properties to body**

In `css/base.css`, add two properties to the body block (after line 56's existing `-webkit-font-smoothing: antialiased`):

```css
/* Add after -webkit-font-smoothing: antialiased; (line 56) */
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
```

- [ ] **Step 2: Update `:root` shadow values**

In `css/base.css`, update shadow variables (lines 17-19):

```css
/* FROM: */
--shadow-sm: 0 2px 8px rgba(28,58,43,0.10);
--shadow-md: 0 6px 24px rgba(28,58,43,0.14);

/* TO: */
--shadow-sm: 0 2px 10px rgba(28,58,43,0.06);
--shadow-md: 0 3px 14px rgba(28,58,43,0.09);
```
(`--shadow-lg` stays unchanged)

- [ ] **Step 3: Update `:root` radius value**

In `css/base.css`, update radius (line 20):

```css
/* FROM: */
--radius: 16px;

/* TO: */
--radius: 14px;
```

- [ ] **Step 4: Add new gradient and FAB variables to `:root`**

In `css/base.css`, add after the spacing scale (after line 43):

```css
/* Gradients */
--bg-page: linear-gradient(170deg, #f5f0e8 0%, #ece5d6 50%, #e0d8c8 100%);
--bg-header: linear-gradient(135deg, #1c3a2b 0%, #2d5a3d 70%, #3d6a4d 100%);
--bg-welcome: linear-gradient(160deg, #2d5a3d 0%, #1c3a2b 30%, #2a4a38 60%, #3d5a3d 80%, #4a6a4a 100%);
--bg-btn-primary: linear-gradient(135deg, #1c3a2b, #2d5a3d);
--bg-fab: linear-gradient(135deg, #c4622d, #d4723d);

/* FAB */
--fab-size: 56px;
--fab-shadow: 0 6px 20px rgba(196,98,45,0.35);
```

- [ ] **Step 5: Update body background to gradient**

In `css/base.css`, change the body background (line 52):

```css
/* FROM: */
background: var(--cream);

/* TO: */
background: var(--bg-page);
min-height: 100vh;
```

- [ ] **Step 6: Add reduced motion media query**

At the end of `css/base.css`, add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Test and commit**

Hard refresh the app in browser. Verify: text looks smoother, background has subtle gradient, shadows are slightly softer, border radii are slightly tighter. No layout breakage.

```bash
git add css/base.css
git commit -m "feat: update CSS foundation — gradients, smoother text, refined tokens"
```

---

## Task 1: CSS Cleanup — Fix Undefined Variables and Hardcoded Colors

**Files:**
- Modify: `css/components.css` (multiple locations)
- Modify: `css/screens.css` (if needed)

- [ ] **Step 1: Find all undefined `--green` and `--terracotta` references**

Search for `var(--green)` and `var(--terracotta)` in all CSS files. These are undefined — should be `var(--green-deep)` and `var(--terra)`.

- [ ] **Step 2: Replace undefined variables in components.css**

Replace all `var(--green)` with `var(--green-deep)` and `var(--terracotta)` with `var(--terra)` in `css/components.css`.

- [ ] **Step 3: Replace hardcoded colors**

Search for hardcoded `#ddd` in CSS files and replace with `var(--cream-dark)`. Search for inline `rgba(196, 98, 45` and replace with CSS variable-based equivalents.

- [ ] **Step 4: Test and commit**

Verify health pills, diagnosis labels, and reminder tags render with correct colors.

```bash
git add css/components.css css/screens.css
git commit -m "fix: replace undefined CSS variables and hardcoded colors"
```

---

## Task 2: Navigation Restructure — HTML

**Files:**
- Modify: `index.html:226-244` (bottom nav)
- Modify: `index.html:195-224` (settings screen → settings modal)
- Modify: `index.html:88` (capture screen)

This restructures the HTML from 4 tabs to 2 tabs + FAB + settings sheet. The settings screen becomes a modal, the capture tab becomes a modal.

- [ ] **Step 1: Replace bottom nav HTML**

Replace `index.html` lines 226-244 (the `<nav class="bottom-nav">` block) with:

```html
<nav class="bottom-nav">
    <button class="nav-btn active" onclick="showScreen('garden', this)">
        <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></span>
        <span class="nav-label">Garden</span>
    </button>
    <button class="fab" onclick="openCaptureModal()" aria-label="Add to garden">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
    <button class="nav-btn" onclick="showScreen('timeline', this)">
        <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
        <span class="nav-label">Timeline</span>
    </button>
</nav>
```

- [ ] **Step 2: Convert settings screen to a modal**

Replace the settings screen HTML (`index.html` lines 195-224, the `<div id="tab-settings"...>` block) with a settings modal:

```html
<!-- Settings Sheet Modal -->
<div class="modal-overlay" id="settings-modal">
    <div class="modal-sheet">
        <button class="modal-close" onclick="closeModal('settings-modal')">✕</button>
        <h2 class="modal-title">Settings</h2>
        <div style="margin-top:var(--space-4);">
            <button class="btn-secondary" style="width:100%;margin-bottom:var(--space-2);" onclick="exportJSON()">Export JSON</button>
            <button class="btn-secondary" style="width:100%;margin-bottom:var(--space-4);" onclick="exportCSV()">Export CSV</button>
            <button class="btn-danger" style="width:100%;margin-bottom:var(--space-3);" onclick="clearAllData()">Clear all data</button>
            <div style="text-align:center;margin-top:var(--space-4);">
                <span style="font-size:var(--text-sm);color:var(--terra);cursor:pointer;" onclick="handleSignOut()">Sign out</span>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 3: Add capture modal wrapper**

Add a capture modal overlay right before the bottom nav. The existing `#tab-capture` content will be moved into this in a later step. For now, add the empty wrapper:

```html
<!-- Capture Modal -->
<div class="modal-overlay" id="capture-modal">
    <div class="modal-sheet" style="max-height:95vh;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4);">
            <h2 class="modal-title" style="margin:0;padding-right:0;">Add to Garden</h2>
            <button class="modal-close" style="position:static;" onclick="closeCaptureModal()">✕</button>
        </div>
        <div id="capture-modal-body">
            <!-- Capture content will be moved here -->
        </div>
    </div>
</div>
```

- [ ] **Step 4: Commit HTML restructure**

```bash
git add index.html
git commit -m "feat: restructure nav — 2 tabs + FAB, settings as modal"
```

---

## Task 3: Navigation Restructure — CSS

**Files:**
- Modify: `css/screens.css:220-261` (bottom nav styles)
- Modify: `css/components.css` (add FAB styles)

- [ ] **Step 1: Update bottom nav CSS**

In `css/screens.css`, update the `.bottom-nav` styles (lines 220-235):

```css
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--nav-height);
    background: var(--white);
    border-top: 1px solid var(--cream-dark);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 var(--space-4);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 100;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.04);
}
```

- [ ] **Step 2: Update nav button styles for SVG icons**

Update `.nav-btn` styles and add `.nav-icon svg` styling:

```css
.nav-icon { display: flex; align-items: center; justify-content: center; }
.nav-icon svg { transition: transform 0.2s; }
.nav-btn { color: var(--ink-light); }
.nav-btn.active { color: var(--green-deep); }
.nav-btn.active .nav-label { color: var(--green-deep); font-weight: 700; }
.nav-btn.active .nav-icon svg { transform: scale(1.1); }
```

- [ ] **Step 3: Add FAB styles**

Add to `css/components.css`:

```css
/* Floating Action Button */
.fab {
    width: var(--fab-size);
    height: var(--fab-size);
    border-radius: 50%;
    background: var(--bg-fab);
    border: none;
    box-shadow: var(--fab-shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 150ms ease;
    position: relative;
    bottom: 12px;
    z-index: 101;
}
.fab:active {
    transform: scale(0.9);
}
.fab svg {
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes fabPulse {
    0%, 100% { box-shadow: var(--fab-shadow); }
    50% { box-shadow: 0 8px 28px rgba(196,98,45,0.45); }
}
.fab { animation: fabPulse 3s ease-in-out infinite; }
```

- [ ] **Step 4: Test and commit**

Verify: 2-tab nav with FAB in center, terracotta button with pulsing shadow, SVG icons active/inactive states work.

```bash
git add css/screens.css css/components.css
git commit -m "feat: style 2-tab nav with FAB and SVG icons"
```

---

## Task 4: Navigation Restructure — JavaScript

**Files:**
- Modify: `js/app.js:232-247` (`dismissWelcome`, `showScreen`)
- Modify: `js/app.js:310-326` (window bindings)

- [ ] **Step 1: Update `dismissWelcome()` to go to Garden**

In `js/app.js`, change `dismissWelcome()` (lines 232-238):

```javascript
export function dismissWelcome() {
    const welcome = document.getElementById('welcome-screen');
    welcome.style.opacity = '0';
    welcome.style.transition = 'opacity 300ms ease';
    setTimeout(() => {
        welcome.classList.remove('active-screen');
        welcome.style.opacity = '';
        welcome.style.transition = '';
        document.getElementById('tab-garden').classList.add('active-screen');
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.toggle('active', b.querySelector('.nav-label')?.textContent === 'Garden');
        });
    }, 300);
}
```

- [ ] **Step 2: Update `showScreen()` for 2-tab system**

Update `showScreen()` (lines 241-247):

```javascript
export function showScreen(name, btnEl) {
    const current = document.querySelector('.screen.active-screen:not(#welcome-screen)');
    const next = document.getElementById('tab-' + name);
    if (current === next) return;

    // Cross-fade transition
    if (current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        current.style.opacity = '0';
        current.style.transition = 'opacity 200ms ease';
        setTimeout(() => {
            current.classList.remove('active-screen');
            current.style.opacity = '';
            current.style.transition = '';
            next.classList.add('active-screen');
        }, 200);
    } else {
        if (current) current.classList.remove('active-screen');
        next.classList.add('active-screen');
    }

    document.getElementById('welcome-screen').classList.remove('active-screen');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
}
```

- [ ] **Step 3: Add `openCaptureModal()` and `closeCaptureModal()`**

Add new functions in `js/app.js` (before the window bindings):

```javascript
export function openCaptureModal() {
    openModal('capture-modal');
}

export function closeCaptureModal() {
    closeModal('capture-modal');
}

export function openSettingsSheet() {
    openModal('settings-modal');
}
```

- [ ] **Step 4: Update window bindings**

Add `openCaptureModal`, `closeCaptureModal`, and `openSettingsSheet` to the `Object.assign(window, {...})` block (lines 310-326).

- [ ] **Step 5: Test and commit**

Verify: Welcome dismisses to Garden (not Capture). Tab switching cross-fades. FAB opens capture modal. Gear icon opens settings sheet. Back button / close works on both modals.

```bash
git add js/app.js
git commit -m "feat: wire up 2-tab nav, FAB capture modal, settings sheet"
```

---

## Task 5: Welcome Screen Redesign

**Files:**
- Modify: `index.html:71-85` (welcome screen HTML)
- Modify: `css/screens.css:98-181` (welcome styles)

- [ ] **Step 1: Replace welcome screen HTML**

Replace `index.html` welcome screen (lines 71-85) with:

```html
<div id="welcome-screen" class="screen active-screen welcome-screen" onclick="dismissWelcome()">
    <div class="welcome-container">
        <div class="welcome-greeting" id="welcome-greeting">Good morning</div>
        <div class="welcome-divider"></div>
        <div class="welcome-quote">
            <div class="welcome-quote-text" id="welcome-quote-text">"To plant a garden is to believe in tomorrow."</div>
            <div class="welcome-attribution" id="welcome-quote-attr">— Audrey Hepburn</div>
        </div>
    </div>
    <div class="welcome-hint">tap to enter</div>
</div>
```

- [ ] **Step 2: Replace welcome CSS**

Replace all `.welcome-*` styles in `css/screens.css` (lines 98-181) with:

```css
/* Welcome Screen */
.welcome-screen {
    background: var(--bg-welcome);
    min-height: 100vh;
    padding: 0;
    position: relative;
    cursor: pointer;
}
.welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 0 40px;
    text-align: center;
}
.welcome-greeting {
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.75);
    font-weight: 400;
}
.welcome-divider {
    width: 32px;
    height: 1.5px;
    background: linear-gradient(90deg, transparent, var(--terra-light), transparent);
    margin: 20px 0;
}
.welcome-quote {
    max-width: 260px;
}
.welcome-quote-text {
    font-family: var(--font-display);
    font-size: 18px;
    font-style: italic;
    color: #ffffff;
    line-height: 1.7;
    font-weight: 400;
}
.welcome-attribution {
    font-size: 11px;
    color: rgba(255,255,255,0.55);
    margin-top: 10px;
    font-weight: 300;
}
.welcome-hint {
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.1em;
    font-weight: 300;
}
```

- [ ] **Step 3: Hide nav on welcome screen**

Add to `css/screens.css`:

```css
.welcome-screen.active-screen ~ .bottom-nav { display: none; }
```

Note: if CSS sibling selector doesn't work due to DOM structure, handle this in JS inside `dismissWelcome()` by toggling a class on the nav.

- [ ] **Step 4: Update greeting logic and remove dead references in app.js**

Find where the greeting is set (in the initialization code of `app.js`) and ensure it uses time-of-day:

```javascript
function setWelcomeGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('welcome-greeting');
    if (el) el.textContent = greeting;
}
```

Call this on app init.

Also remove or guard the code that populates the old `welcome-fact-text` element (around lines 229-230 of `app.js`). This element no longer exists and will throw a null reference error. Either remove the lines or wrap with `if (el)` guards.

- [ ] **Step 5: Test and commit**

Verify: Welcome screen shows deep forest gradient, white text, greeting changes by time of day, tap anywhere dismisses to Garden, nav is hidden on welcome.

```bash
git add index.html css/screens.css js/app.js
git commit -m "feat: redesign welcome screen — minimal, literary, warm gradient"
```

---

## Task 6: Garden Screen Header Redesign

**Files:**
- Modify: `index.html:127-145` (garden screen header area)
- Modify: `css/screens.css:199-217` (screen header styles)

- [ ] **Step 1: Replace garden screen header HTML**

Replace the garden screen header in `index.html` (the `<div class="screen-header">` inside `#tab-garden`) with:

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

- [ ] **Step 2: Remove old search bar and stats row HTML**

Remove the standalone search input and stats row that currently sit outside the header (find and remove the `stat-plants`, `stat-bugs`, `stat-natives` elements and the old search input).

- [ ] **Step 3: Add garden header CSS**

Add to `css/screens.css`:

```css
/* Garden Header */
.garden-header {
    background: var(--bg-header);
    padding: 48px var(--space-5) var(--space-4);
}
.garden-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
.garden-header .screen-title {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--white);
    letter-spacing: -0.02em;
}
.garden-header .screen-sub {
    font-family: var(--font-display);
    font-size: var(--text-xs);
    color: var(--green-light);
    font-style: italic;
    margin-top: 3px;
}
.gear-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.8);
    cursor: pointer;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}
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
.garden-search-input {
    background: transparent;
    border: none;
    color: white;
    font-family: var(--font-body);
    font-size: var(--text-sm);
    width: 100%;
    outline: none;
}
.garden-search-input::placeholder {
    color: rgba(255,255,255,0.5);
}
.search-icon {
    font-size: 14px;
    opacity: 0.5;
}
```

- [ ] **Step 4: Update subtitle in JS**

In `js/inventory.js`, update `updateStats()` (lines 57-61) to set the subtitle instead of three stat elements:

```javascript
export function updateStats() {
    const plants = getAllInventory().filter(i => i.type === 'plant').length;
    const bugs = getAllInventory().filter(i => i.type === 'bug').length;
    const el = document.getElementById('garden-subtitle');
    if (el) {
        const parts = [];
        if (plants) parts.push(`${plants} species cataloged`);
        if (bugs) parts.push(`${bugs} visitors observed`);
        el.textContent = parts.join(' · ') || 'Your garden awaits';
    }
}
```

- [ ] **Step 5: Test and commit**

Verify: Gradient header, frosted glass search, gear icon opens settings sheet, subtitle shows counts in literary language, old stats row is gone.

```bash
git add index.html css/screens.css js/inventory.js
git commit -m "feat: redesign garden header — gradient, frosted search, gear icon"
```

---

## Task 7: Filter Chips and Sort Redesign

**Files:**
- Modify: `css/components.css` (chip styles)
- Modify: `css/screens.css` (filter row layout)

- [ ] **Step 1: Update filter chip styles**

In `css/components.css`, update `.chip` styles:

```css
.chip {
    font-size: 11px;
    padding: 6px 14px;
    border-radius: 20px;
    background: var(--white);
    color: var(--ink-mid);
    border: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    white-space: nowrap;
    min-height: 32px;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
}
.chip.active {
    background: var(--bg-btn-primary);
    color: var(--white);
    box-shadow: none;
}
```

- [ ] **Step 2: Update sort dropdown styling**

Style the sort select to match the chip aesthetic — white background, subtle shadow, matching size.

- [ ] **Step 3: Test and commit**

```bash
git add css/components.css css/screens.css
git commit -m "feat: redesign filter chips and sort — pill style, gradient active state"
```

---

## Task 8: Plant Cards Redesign

**Files:**
- Modify: `css/components.css:207-250` (garden card styles)
- Modify: `js/inventory.js:107-181` (card rendering)

- [ ] **Step 1: Update garden card CSS**

Replace `.garden-card` styles in `css/components.css`:

```css
.garden-card {
    background: var(--white);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 150ms ease;
    -webkit-user-select: none;
    user-select: none;
}
.garden-card:active { transform: scale(0.97); box-shadow: var(--shadow-lg); }
.garden-card-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
}
.garden-card-info {
    padding: 10px 10px 12px;
}
.garden-card-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--green-deep);
    line-height: 1.2;
}
.garden-card-sci {
    font-size: 10px;
    color: var(--green-sage);
    font-style: italic;
    margin-top: 2px;
}
.garden-card-tags {
    display: flex;
    gap: 4px;
    margin-top: 8px;
    flex-wrap: wrap;
}
.garden-card-tags .tag {
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--green-light), #e8f0e8);
    color: var(--green-mid);
}
.garden-card-tags .tag.bug-tag {
    background: linear-gradient(135deg, #fde8e8, #fef0f0);
    color: var(--terra);
}
```

- [ ] **Step 2: Update card rendering in JS**

In `js/inventory.js`, update the card HTML generation in `renderInventory()` to use the new class names and Playfair Display for plant names. Ensure scientific name uses the new `.garden-card-sci` class. Tags use gradient backgrounds.

- [ ] **Step 3: Add staggered entrance animation**

Add CSS for staggered card entrance:

```css
@keyframes cardIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
.garden-card {
    animation: cardIn 300ms ease backwards;
}
```

In `js/inventory.js`, after rendering cards, add stagger delays:

```javascript
grid.querySelectorAll('.garden-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 40}ms`;
});
```

- [ ] **Step 4: Test and commit**

Verify: Cards have Playfair Display names, sage green italic scientific names, gradient tag pills, staggered entrance animation, proper tap feedback.

```bash
git add css/components.css js/inventory.js
git commit -m "feat: redesign plant cards — serif names, gradient tags, staggered entrance"
```

---

## Task 9: Detail Modal Redesign — Hero Image and About Card

**Files:**
- Modify: `js/inventory.js:183-238` (`showItemDetail`)
- Modify: `css/components.css:252-262` (detail styles)

This is the biggest single change. Breaking the detail modal into two tasks: hero + about (this task) and expandable sections (next task).

- [ ] **Step 1: Add new detail modal CSS**

Add to `css/components.css`, replacing the existing `.detail-*` styles:

```css
/* Detail Modal — Hero */
.detail-hero {
    height: 220px;
    position: relative;
    border-radius: 0 0 20px 20px;
    overflow: hidden;
    margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) 0;
}
.detail-hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.detail-hero-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(28,58,43,0.85));
    padding: 16px 20px 14px;
}
.detail-hero-name {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: white;
    letter-spacing: -0.02em;
}
.detail-hero-sci {
    font-size: var(--text-sm);
    color: var(--green-light);
    font-style: italic;
    margin-top: 2px;
}
.detail-hero-badges {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
}
.detail-hero-badge {
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 12px;
    background: rgba(255,255,255,0.18);
    color: white;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

/* Detail Modal — Content Cards */
.detail-content {
    padding: var(--space-4) 0 0;
}
.detail-card {
    background: var(--white);
    border-radius: var(--radius);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-3);
}
.detail-card-heading {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--green-sage);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--space-2);
}

/* About grid */
.detail-about-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
}
.detail-about-label {
    font-size: 10px;
    color: var(--ink-light);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
}
.detail-about-value {
    font-size: var(--text-sm);
    color: var(--ink);
    font-weight: 500;
}

/* Notes */
.detail-notes-text {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-style: italic;
    color: var(--ink-mid);
    line-height: 1.6;
}

/* Delete link */
.detail-delete-link {
    display: block;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--terra);
    cursor: pointer;
    padding: var(--space-2);
    margin-top: var(--space-2);
}
```

- [ ] **Step 2: Update `showItemDetail()` — hero and about card**

Rewrite the top portion of `showItemDetail()` in `js/inventory.js` to generate the hero image with overlay and the about card with 2-column grid:

```javascript
export function showItemDetail(item) {
    const body = document.getElementById('item-modal-body');

    // Hero image
    const heroImg = item.image_url
        ? `<img src="${item.image_url}" alt="${item.common}">`
        : `<div style="width:100%;height:100%;background:var(--bg-header);display:flex;align-items:center;justify-content:center;font-size:48px;">🌿</div>`;

    // Status badges
    const badges = [];
    if (item.is_native) badges.push('Native to Florida');
    if (item.health) badges.push(item.health.charAt(0).toUpperCase() + item.health.slice(1));
    if (item.flowering === 'yes') badges.push('Flowering');
    else if (item.flowering === 'budding') badges.push('Budding');

    // About card rows
    const aboutItems = [];
    if (item.type) aboutItems.push(['Type', item.category || item.type]);
    aboutItems.push(['Added', new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })]);
    if (item.location) aboutItems.push(['Location', item.location]);
    if (item.confidence) aboutItems.push(['Confidence', item.confidence + '%']);
    if (item.bloom?.length) aboutItems.push(['Blooming', item.bloom.join(', ')]);
    if (item.season?.length) aboutItems.push(['Active', item.season.join(', ')]);

    body.innerHTML = `
        <div class="detail-hero">
            ${heroImg}
            <div class="detail-hero-overlay">
                <div class="detail-hero-name">${item.common}</div>
                ${item.scientific ? `<div class="detail-hero-sci">${item.scientific}</div>` : ''}
                <div class="detail-hero-badges">
                    ${badges.map(b => `<span class="detail-hero-badge">${b}</span>`).join('')}
                </div>
            </div>
        </div>
        <div class="detail-content">
            <div class="detail-card">
                <div class="detail-card-heading">About</div>
                <div class="detail-about-grid">
                    ${aboutItems.map(([k,v]) => `<div><div class="detail-about-label">${k}</div><div class="detail-about-value">${v}</div></div>`).join('')}
                </div>
            </div>
            ${item.notes ? `<div class="detail-card"><div class="detail-card-heading">Notes</div><div class="detail-notes-text">${item.notes}</div></div>` : ''}
            ${renderTagEditor(item)}
            ${item.type === 'bug' ? renderBugPlantLink(item) : ''}
            ${renderCareProfile(item)}
            ${item.type === 'plant' ? renderHealthHistory(item) : ''}
            ${item.type === 'plant' ? renderPlantStatus(item) : ''}
            ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
            <div class="detail-delete-link" onclick="deleteItem('${item.id}', '${item.image_url || ''}')">Delete this entry</div>
        </div>`;
    openModal('item-modal');
}
```

- [ ] **Step 3: Test and commit**

Verify: Hero image with gradient overlay, name and badges on photo, 2-column about grid, notes in serif italic, delete as subtle text link.

```bash
git add js/inventory.js css/components.css
git commit -m "feat: redesign detail modal — hero image, about grid, unified cards"
```

---

## Task 10: Detail Modal — Unified Expandable Sections

**Files:**
- Modify: `js/features.js` (all render functions)
- Modify: `css/components.css` (section styles)

All expandable sections (tags, plant status, care profile, health history, visitors) get the same white card + chevron pattern.

- [ ] **Step 1: Add expandable card CSS**

Add to `css/components.css`:

```css
/* Expandable detail card */
.detail-card-expandable {
    background: var(--white);
    border-radius: var(--radius);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-3);
}
.detail-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    min-height: 24px;
}
.detail-card-header .detail-card-heading {
    margin-bottom: 0;
}
.detail-card-chevron {
    transition: transform 250ms ease;
    color: var(--ink-light);
}
.detail-card-chevron.open {
    transform: rotate(180deg);
}
.detail-card-body {
    overflow: hidden;
}

/* Care item with icon container */
.care-item-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--green-light), #e8f0e8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
}
```

- [ ] **Step 2: Update `renderTagEditor()` in features.js**

Wrap in `.detail-card` instead of `.tag-editor-section`:

```javascript
export function renderTagEditor(item) {
    // ... existing tag logic ...
    return `<div class="detail-card">
        <div class="detail-card-heading">Tags</div>
        <div class="tag-chips-row">${chips}</div>
        ${customTagInput}
    </div>`;
}
```

- [ ] **Step 3: Update `renderPlantStatus()` in features.js**

Wrap in `.detail-card-expandable` with chevron SVG:

```javascript
export function renderPlantStatus(item) {
    return `<div class="detail-card-expandable">
        <div class="detail-card-header" onclick="togglePlantStatus()">
            <div class="detail-card-heading">Plant Status</div>
            <svg class="detail-card-chevron" id="status-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="detail-card-body" id="plant-status-body" style="height:0;overflow:hidden;">
            <!-- existing form fields -->
        </div>
    </div>`;
}
```

- [ ] **Step 4: Update `renderCareProfile()` in features.js**

Same pattern. Care items get `.care-item-icon` containers for emojis.

- [ ] **Step 5: Update `renderHealthHistory()` in features.js**

Same expandable card pattern.

- [ ] **Step 6: Update `renderLinkedBugs()` in features.js**

Rename heading to "Visitors". Same card pattern:

```javascript
export function renderLinkedBugs(item) {
    const bugs = getAllInventory().filter(i => i.type === 'bug' && i.linked_plant_id === item.id);
    if (!bugs.length) return '';
    return `<div class="detail-card-expandable">
        <div class="detail-card-header" onclick="/* toggle */">
            <div class="detail-card-heading">Visitors</div>
            <svg class="detail-card-chevron" ...></svg>
        </div>
        ...
    </div>`;
}
```

- [ ] **Step 7: Update `renderBugPlantLink()` in features.js**

Same expandable card pattern, replacing the mixed styling.

- [ ] **Step 8: Update toggle functions to use height animation**

Update all toggle functions (`togglePlantStatus`, `toggleCareProfile`, `toggleHealthHistory`, etc.) to use a shared `toggleSection` helper with measured height animation. Each existing toggle function becomes a thin wrapper:

```javascript
// Wrapper functions (keep these exported/window-bound):
export function togglePlantStatus() { toggleSection('plant-status-body', 'status-toggle-icon'); }
export function toggleCareProfile() { toggleSection('care-profile-body', 'care-toggle-icon'); }
export function toggleHealthHistory(itemId) { toggleSection('health-history-body', 'health-history-toggle'); /* load data if needed */ }
export function toggleBugPlantLink() { toggleSection('bug-plant-link-body', 'bug-link-toggle-icon'); }
export function toggleRemindersSection() { toggleSection('reminders-body', 'reminders-chevron'); }

// Shared helper (not exported, internal to features.js):
function toggleSection(bodyId, chevronId) {
    const body = document.getElementById(bodyId);
    const chevron = document.getElementById(chevronId);
    if (!body) return;

    if (body.style.height && body.style.height !== '0px') {
        body.style.height = body.scrollHeight + 'px';
        requestAnimationFrame(() => {
            body.style.transition = 'height 300ms ease';
            body.style.height = '0px';
        });
        chevron?.classList.remove('open');
    } else {
        body.style.transition = 'height 300ms ease';
        body.style.height = body.scrollHeight + 'px';
        chevron?.classList.add('open');
        body.addEventListener('transitionend', () => {
            if (body.style.height !== '0px') {
                body.style.height = 'auto';
            }
        }, { once: true });
    }
}
```

- [ ] **Step 9: Test and commit**

Verify: All sections use identical white cards. Chevrons rotate on expand. Height animates smoothly. Tags, care profile, health history, plant status, visitors all look consistent.

```bash
git add js/features.js css/components.css
git commit -m "feat: unify all detail modal sections — consistent cards, chevrons, animations"
```

---

## Task 11: Capture Flow — Tab to Modal

**Files:**
- Modify: `index.html` (move capture content into modal)
- Modify: `css/screens.css` (capture modal styles)
- Modify: `js/capture.js` (update references if needed)

- [ ] **Step 1: Move capture screen content into capture modal**

Move the inner content of `#tab-capture` (the capture zone, buttons, results area) into the `#capture-modal-body` div created in Task 2. **Remove the old `#tab-capture` div entirely** from `index.html` — it is no longer a screen. Also update any JS in `js/capture.js` that references the `#tab-capture` parent container. Key references to check:
- Any `document.getElementById('tab-capture')` calls
- Any `querySelector` scoped to `#tab-capture`
- The `showScreen('capture')` call path is already removed (FAB calls `openCaptureModal()` instead)
- Element IDs inside the capture content (`preview-canvas`, `capture-zone`, `photo-preview`, `id-results`, etc.) remain the same — only the parent container changes.

- [ ] **Step 2: Update capture zone styling**

Update capture styles in `css/screens.css` to work inside a modal context:

```css
.capture-zone-card {
    background: var(--white);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-4);
}
.capture-preview {
    height: 200px;
    background: linear-gradient(135deg, var(--cream-dark), #e0d8c8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.capture-actions-row {
    display: flex;
    border-top: 1px solid var(--cream);
}
.capture-actions-row label,
.capture-actions-row button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 14px;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--green-deep);
    cursor: pointer;
    background: transparent;
    border: none;
}
.capture-actions-row label:first-child {
    border-right: 1px solid var(--cream);
}
```

- [ ] **Step 3: Style identify and manual entry buttons**

```css
.btn-identify {
    width: 100%;
    padding: 14px;
    background: var(--bg-btn-primary);
    color: var(--white);
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    font-family: var(--font-body);
    box-shadow: 0 4px 16px rgba(28,58,43,0.25);
    letter-spacing: 0.02em;
}
.capture-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: var(--space-4) 0;
}
.capture-divider::before,
.capture-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--cream-dark);
}
.capture-divider span {
    font-size: 11px;
    color: var(--ink-light);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}
```

- [ ] **Step 4: Add "or" divider and literary quote to capture modal**

Between the identify button and manual entry button, add:

```html
<div class="capture-divider"><span>or</span></div>
```

At the bottom of the capture modal content, add a rotating garden quote:

```html
<div style="text-align:center;margin-top:var(--space-6);padding:0 var(--space-4);">
    <div style="font-family:var(--font-display);font-size:var(--text-sm);font-style:italic;color:var(--green-sage);line-height:1.5;" id="capture-quote-text"></div>
    <div style="font-size:11px;color:var(--ink-light);margin-top:4px;" id="capture-quote-attr"></div>
</div>
```

In `js/app.js` or `js/capture.js`, populate the quote from the `GARDEN_QUOTES` array when the capture modal opens (inside `openCaptureModal()`).

- [ ] **Step 5: Test and commit**

Verify: FAB opens capture as a full-screen modal. Camera and gallery buttons work. Identify button has gradient. Manual entry below divider. Close button returns to garden. All existing capture functionality (photo, canvas, ID results, save) still works.

```bash
git add index.html css/screens.css js/capture.js js/app.js
git commit -m "feat: convert capture from tab to FAB-triggered modal"
```

---

## Task 12: Timeline Screen Redesign

**Files:**
- Modify: `js/inventory.js` (timeline rendering)
- Modify: `css/screens.css` (timeline styles)
- Modify: `index.html` (timeline header)

- [ ] **Step 1: Update timeline header HTML**

Update the timeline screen header in `index.html`:

```html
<div class="screen-header">
    <h1 class="screen-title">Timeline</h1>
    <p class="screen-sub" style="font-family:var(--font-display);font-style:italic;">Your garden's story</p>
</div>
```

- [ ] **Step 2: Add timeline CSS**

Add to `css/screens.css`:

```css
/* Timeline */
.timeline-season-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: var(--space-3);
}
.timeline-season-title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--green-deep);
    white-space: nowrap;
}
.timeline-season-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--green-light), transparent);
}
.timeline-track {
    position: relative;
    padding-left: 20px;
}
.timeline-line {
    position: absolute;
    left: 5px;
    top: 8px;
    bottom: 8px;
    width: 1.5px;
    background: linear-gradient(180deg, var(--green-light), var(--cream-dark));
}
.timeline-entry {
    position: relative;
    margin-bottom: var(--space-3);
}
.timeline-dot {
    position: absolute;
    left: -18px;
    top: 6px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--cream);
}
.timeline-dot.plant { background: linear-gradient(135deg, var(--green-mid), var(--green-sage)); }
.timeline-dot.bug { background: linear-gradient(135deg, var(--terra), var(--terra-light)); }
.timeline-entry-card {
    background: var(--white);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: transform 150ms ease;
}
.timeline-entry-card:active { transform: scale(0.98); }
```

- [ ] **Step 3: Update timeline rendering in JS**

Update the timeline rendering in `js/inventory.js` to use the new classes and structure — season headers with gradient rules, vertical timeline with dots, white entry cards.

- [ ] **Step 4: Update screen header CSS for gradient**

Ensure the `.screen-header` base class uses `var(--bg-header)` for the gradient background.

- [ ] **Step 5: Test and commit**

Verify: Timeline has gradient header, season chapters with rule lines, vertical timeline connector, green/terracotta dots, white entry cards, tappable entries open detail modal.

```bash
git add js/inventory.js css/screens.css index.html
git commit -m "feat: redesign timeline — vertical track, season chapters, gradient header"
```

---

## Task 13: Reminders Section Redesign

**Files:**
- Modify: `js/features.js:521-671` (reminders rendering)
- Modify: `css/components.css` (reminder styles)
- Modify: `index.html` (reminders section in garden)

- [ ] **Step 1: Update reminders section HTML structure**

The reminders section in `index.html` (inside `#tab-garden`) should use the unified card system:

```html
<div class="detail-card-expandable" id="reminders-section" style="display:none;margin:var(--space-3) var(--space-5);">
    <div class="detail-card-header" onclick="toggleRemindersSection()">
        <div class="detail-card-heading">This Month</div>
        <svg class="detail-card-chevron" id="reminders-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div id="reminders-body" class="detail-card-body">
        <div id="reminders-list"></div>
        <div style="display:flex;gap:6px;margin-top:var(--space-2);">
            <input class="field" id="custom-reminder-input" placeholder="Add a custom reminder..." style="flex:1;">
            <button class="btn-secondary" onclick="addCustomReminder()">Add</button>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Update reminder item styles**

Replace old reminder styles with ones matching the care profile item pattern.

- [ ] **Step 3: Update `renderReminders()` in features.js**

Update the HTML generation to use the new card/item patterns.

- [ ] **Step 4: Test and commit**

Verify: Reminders section appears above garden grid, uses white card with chevron, items are styled consistently with care profile items.

```bash
git add js/features.js css/components.css index.html
git commit -m "feat: redesign reminders section — unified card, consistent item styling"
```

---

## Task 14: Remaining Animations and Polish

**Files:**
- Modify: `css/components.css` (animation keyframes)
- Modify: `css/screens.css` (screen transitions)
- Modify: `js/app.js` (JS-driven animations)

- [ ] **Step 1: Add modal spring animation**

Update the modal sheet animation in `css/components.css`:

```css
@keyframes sheetIn {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
.modal-sheet {
    animation: sheetIn 400ms cubic-bezier(0.32, 0.72, 0, 1);
}
```

- [ ] **Step 2: Add loading dots animation and replace spinner**

Replace the spinner with pulsing dots. Add the CSS:

```css
.loading-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    padding: var(--space-4);
}
.loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green-sage);
    animation: dotPulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotPulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
}
```

Then find the spinner HTML in `js/capture.js` (the `identifySpecies` function shows a loading state) and `js/features.js` (care profile generation, health diagnosis). Replace spinner markup like `<div class="spinner"></div>` with:

```html
<div class="loading-dots"><span></span><span></span><span></span></div>
```

- [ ] **Step 3: Add save confirmation animation**

```css
@keyframes checkBounce {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}
.save-check {
    animation: checkBounce 300ms ease forwards;
}
```

- [ ] **Step 4: Add FAB scroll behavior in JS**

In `js/app.js`, add scroll listener to shrink/fade FAB on scroll down:

```javascript
let lastScrollY = 0;
const fab = document.querySelector('.fab');
if (fab) {
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        if (scrollY > lastScrollY && scrollY > 50) {
            fab.style.transform = 'scale(0.8)';
            fab.style.opacity = '0.6';
        } else {
            fab.style.transform = '';
            fab.style.opacity = '';
        }
        lastScrollY = scrollY;
    }, { passive: true });
}
```

- [ ] **Step 5: Add reduced motion JS check**

Add a utility that animation code can reference:

```javascript
export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Use this to skip JS-driven animations (stagger delays, FAB scroll, etc.) when true.

- [ ] **Step 6: Test and commit**

Verify: Modal slides up with spring curve, loading uses pulsing dots, FAB shrinks on scroll, save shows checkmark bounce, all animations respect reduced motion.

```bash
git add css/components.css css/screens.css js/app.js
git commit -m "feat: add micro-animations — spring modals, pulsing dots, FAB scroll behavior"
```

---

## Task 15: Literary Language and Empty States

**Files:**
- Modify: `js/inventory.js` (empty states, labels)
- Modify: `js/features.js` (section labels)
- Modify: `js/app.js` (quotes for empty states)

- [ ] **Step 1: Update empty state messages**

In `js/inventory.js`, replace generic empty states with literary quotes:

```javascript
// Garden empty state
const emptyState = `
    <div style="text-align:center;padding:var(--space-8) var(--space-6);">
        <div style="font-family:var(--font-display);font-size:15px;font-style:italic;color:var(--green-deep);line-height:1.5;">
            "In every walk with nature,<br>one receives far more than he seeks."
        </div>
        <div style="font-size:11px;color:var(--ink-light);margin-top:6px;">— John Muir</div>
        <div style="font-size:var(--text-sm);color:var(--green-sage);margin-top:var(--space-4);">
            Tap + to catalog your first species.
        </div>
    </div>`;
```

- [ ] **Step 2: Update label language**

Ensure all labels use the literary language defined in the spec:
- "species cataloged" not "plants"
- "visitors observed" not "bugs"
- "Visitors" not "Linked bugs" / "Insects found on this plant"

- [ ] **Step 3: Test and commit**

```bash
git add js/inventory.js js/features.js js/app.js
git commit -m "feat: add literary language and garden-quote empty states"
```

---

## Task 16: Cache Busting and Final Verification

**Files:**
- Modify: `index.html:15-17, 349` (version bump on CSS/JS links)

- [ ] **Step 1: Bump cache version**

In `index.html`, update all `?v=12` to `?v=13` on the CSS and JS links.

- [ ] **Step 2: Full manual test**

Test the complete flow on iPhone Safari (or 390px Chrome DevTools):
1. Welcome screen — gradient, quote, tap to enter
2. Garden screen — gradient header, frosted search, gear icon, filter chips
3. Plant cards — serif names, gradient tags, stagger animation
4. Detail modal — hero image, about grid, unified sections, smooth expand/collapse
5. FAB — pulsing shadow, opens capture modal, shrinks on scroll
6. Capture modal — camera/gallery card, identify button, manual entry
7. Timeline — season chapters, vertical track, gradient dots
8. Settings sheet — export, clear, sign out
9. Animations — smooth transitions, spring modals, reduced motion respected

- [ ] **Step 3: Final commit**

```bash
git add index.html
git commit -m "chore: bump cache version to v13 for aesthetic redesign"
```
