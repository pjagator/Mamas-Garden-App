# Fact of the Day, Text Sizing Fix, and Save Bug — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-add daily garden facts to the welcome screen, fix undersized text and inconsistent spacing throughout, and fix silent save failures on mobile.

**Architecture:** Three independent changes to the existing SPA. Fact feature requires HTML + CSS + 3 lines of JS. Text sizing is a pure CSS pass. Save bug requires adding auth session validation before database writes in `capture.js`.

**Tech Stack:** Vanilla JS, CSS custom properties, Supabase JS client (`sb.auth.getSession()`, `sb.auth.refreshSession()`)

---

### Task 1: Add Fact of the Day to Welcome Screen

**Files:**
- Modify: `index.html:71-82` (welcome screen HTML)
- Modify: `css/screens.css:98-154` (welcome screen styles)
- Modify: `js/app.js:219-230` (`initWelcomeScreen` function)

- [ ] **Step 1: Add fact HTML to welcome screen**

In `index.html`, add the fact block between the `welcome-container` closing `</div>` and the `welcome-hint` div:

```html
<!-- Welcome Screen -->
<div id="welcome-screen" class="screen active-screen welcome-screen" onclick="dismissWelcome()">
    <div class="welcome-container">
        <div class="welcome-greeting" id="welcome-greeting">Good morning</div>
        <div class="welcome-divider"></div>
        <div class="welcome-quote">
            <div class="welcome-quote-text" id="welcome-quote-text">"To plant a garden is to believe in tomorrow."</div>
            <div class="welcome-attribution" id="welcome-quote-attr">— Audrey Hepburn</div>
        </div>
    </div>
    <div class="welcome-fact">
        <div class="welcome-fact-label">Did you know?</div>
        <div class="welcome-fact-text" id="welcome-fact-text"></div>
    </div>
    <div class="welcome-hint">tap to enter</div>
</div>
```

- [ ] **Step 2: Add fact CSS styles**

In `css/screens.css`, add after the `.welcome-attribution` block (after line 143) and before `.welcome-hint`:

```css
.welcome-fact {
    position: absolute;
    bottom: 48px;
    left: 28px;
    right: 28px;
    text-align: center;
}
.welcome-fact-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: 6px;
}
.welcome-fact-text {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    line-height: 1.55;
    font-weight: 300;
    max-width: 300px;
    margin: 0 auto;
}
```

- [ ] **Step 3: Wire up fact in initWelcomeScreen**

In `js/app.js`, update `initWelcomeScreen()` (line 219) to populate the fact element:

```javascript
export function initWelcomeScreen() {
    const qi = getDailyIndex(GARDEN_QUOTES, 0);
    const q = GARDEN_QUOTES[qi];

    setWelcomeGreeting();
    const quoteEl = document.getElementById('welcome-quote-text');
    if (quoteEl) quoteEl.textContent = `\u201c${q.text}\u201d`;
    const attrEl = document.getElementById('welcome-quote-attr');
    if (attrEl) attrEl.textContent = q.source
        ? `\u2014 ${q.author}, ${q.source}`
        : `\u2014 ${q.author}`;

    const fi = getDailyIndex(GARDEN_FACTS, 7);
    const factEl = document.getElementById('welcome-fact-text');
    if (factEl) factEl.textContent = GARDEN_FACTS[fi];
}
```

- [ ] **Step 4: Verify welcome screen displays fact**

Open in browser at 390px width. Confirm:
- Quote is centered vertically as hero
- "Did you know?" label appears near the bottom
- Fact text is readable, muted, centered, below the label
- "tap to enter" hint still visible below the fact
- Tapping anywhere still dismisses the welcome screen

- [ ] **Step 5: Commit**

```bash
git add index.html css/screens.css js/app.js
git commit -m "feat: re-add daily garden fact to welcome screen"
```

---

### Task 2: Fix Welcome Screen Text Sizing

**Files:**
- Modify: `css/screens.css:114-154` (welcome screen styles)

- [ ] **Step 1: Update welcome screen font sizes and spacing**

In `css/screens.css`, update these selectors:

`.welcome-greeting` (line 114):
```css
.welcome-greeting {
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.75);
    font-weight: 400;
}
```

`.welcome-container` (line 105):
```css
.welcome-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 0 var(--space-8);
    text-align: center;
}
```

`.welcome-quote` (line 127):
```css
.welcome-quote {
    max-width: 280px;
}
```

`.welcome-quote-text` (line 130):
```css
.welcome-quote-text {
    font-family: var(--font-display);
    font-size: 20px;
    font-style: italic;
    color: #ffffff;
    line-height: 1.7;
    font-weight: 400;
}
```

`.welcome-attribution` (line 138):
```css
.welcome-attribution {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    margin-top: 10px;
    font-weight: 300;
}
```

`.welcome-hint` (line 144):
```css
.welcome-hint {
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.1em;
    font-weight: 300;
}
```

- [ ] **Step 2: Verify welcome screen sizing**

Open in browser at 390px width. Confirm all text is legible — greeting, quote, attribution, fact, and hint are all readable without squinting.

- [ ] **Step 3: Commit**

```bash
git add css/screens.css
git commit -m "fix: increase welcome screen text sizes for readability"
```

---

### Task 3: Fix Garden Card and Filter Text Sizing

**Files:**
- Modify: `css/components.css:248-278` (garden cards)
- Modify: `css/components.css:155-200` (chips and sort)

- [ ] **Step 1: Update garden card font sizes and padding**

In `css/components.css`:

`.garden-card-info` (line 248):
```css
.garden-card-info { padding: var(--space-3); }
```

`.garden-card-sci` (line 256):
```css
.garden-card-sci {
    font-size: var(--text-sm);
    color: var(--green-sage);
    font-style: italic;
    margin-top: 2px;
}
```

`.garden-card-tags` (line 262):
```css
.garden-card-tags {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
}
```

`.garden-card-tags .tag` (line 268):
```css
.garden-card-tags .tag {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--green-light), #e8f0e8);
    color: var(--green-mid);
}
```

- [ ] **Step 2: Update filter chip and sort select font sizes**

In `css/components.css`:

`.chip` (line 155):
```css
.chip {
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 20px;
```
(Only change the `font-size` line; leave the rest of the `.chip` rule as-is.)

`.sort-select` (line 197) — change font-size only:
```css
.sort-select {
    font-family: var(--font-body);
    font-size: 13px;
    min-height: 32px;
```

- [ ] **Step 3: Verify card and filter sizing**

Open garden tab at 390px width. Confirm:
- Scientific names on cards are readable (not 10px)
- Tags on cards are readable (not 9px)
- Filter chips text is legible
- Sort dropdown text is legible
- No overflow or bleed between card elements

- [ ] **Step 4: Commit**

```bash
git add css/components.css
git commit -m "fix: increase garden card and filter text sizes"
```

---

### Task 4: Fix Detail Modal and Other Text Sizing

**Files:**
- Modify: `css/components.css:876-882` (detail hero overlay)
- Modify: `css/components.css:903-906` (detail hero badge)
- Modify: `css/components.css:940-943` (detail about label)
- Modify: `css/components.css:578-580` (reminder plant tag)
- Modify: `css/screens.css:414-417` (capture divider)

- [ ] **Step 1: Update detail modal font sizes**

In `css/components.css`:

`.detail-hero-overlay` (line 876):
```css
.detail-hero-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(28,58,43,0.85));
    padding: var(--space-4) var(--space-5);
}
```

`.detail-hero-badge` (line 903):
```css
.detail-hero-badge {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 12px;
```

`.detail-about-label` (line 940):
```css
.detail-about-label {
    font-size: 12px;
    color: var(--ink-light);
    text-transform: uppercase;
```

- [ ] **Step 2: Update reminder tag and capture divider font sizes**

In `css/components.css`:

`.reminder-plant-tag` (line 578):
```css
.reminder-plant-tag {
    display: inline-block;
    font-size: var(--text-sm);
    color: var(--terra);
```

In `css/screens.css`:

`.capture-divider span` (line 414):
```css
.capture-divider span {
    font-size: 13px;
    color: var(--ink-light);
    text-transform: uppercase;
```

- [ ] **Step 3: Verify detail modal and other sizing**

Open a plant detail modal at 390px. Confirm:
- Hero overlay padding is consistent
- Badge text on hero is readable
- "About" grid labels are readable
- Open capture modal — divider text is readable
- Check reminders section — plant tags are readable

- [ ] **Step 4: Commit**

```bash
git add css/components.css css/screens.css
git commit -m "fix: increase detail modal, reminder, and capture text sizes"
```

---

### Task 5: Fix Silent Save Failure on Mobile

**Files:**
- Modify: `js/capture.js:210-241` (`saveSelectedId` function)
- Modify: `js/capture.js:252-300` (`saveManualEntry` function)

- [ ] **Step 1: Add session validation helper to capture.js**

At the top of `js/capture.js`, after the existing imports (line 3), add a helper function:

```javascript
async function ensureSession() {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) {
        const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
            throw new Error('Your session has expired. Please sign out and sign back in.');
        }
    }
}
```

- [ ] **Step 2: Add session check to saveSelectedId**

In `js/capture.js`, update `saveSelectedId()` (line 210). Add `await ensureSession();` as the first line inside the `try` block, and add an explicit check for null insert:

```javascript
export async function saveSelectedId() {
    if (selectedIdIndex === null || !pendingIdResults.length) return;

    const result = pendingIdResults[selectedIdIndex];
    const notes = (document.getElementById('id-notes')?.value || '').trim();
    const canvas = document.getElementById('preview-canvas');

    const btn = document.querySelector('#id-results .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        await ensureSession();
        const imageUrl = await uploadImage(canvas);
        const entry = buildEntry(result, imageUrl, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;
        if (!inserted) throw new Error('Save failed — no data returned. Please try signing out and back in.');

        alert(`${result.common} added to your garden!`);
        removeImage();
        emit('inventory-changed');

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Save to garden';
    }
}
```

- [ ] **Step 3: Add session check to saveManualEntry**

In `js/capture.js`, update `saveManualEntry()` (line 252). Add `await ensureSession();` as the first line inside the `try` block, and add an explicit check for null insert:

```javascript
export async function saveManualEntry() {
    const common = document.getElementById('manual-common').value.trim();
    if (!common) { alert('Common name is required.'); return; }

    const scientific = document.getElementById('manual-scientific').value.trim();
    const type       = document.getElementById('manual-type').value;
    const category   = document.getElementById('manual-category').value.trim();
    const notes      = document.getElementById('manual-notes').value.trim();
    const bloom      = [...document.querySelectorAll('.bloom-check:checked')].map(cb => cb.value);

    const nativeMatch = matchNative(common, scientific);

    const result = {
        common:     nativeMatch?.name || common,
        scientific: scientific || nativeMatch?.scientific || '',
        type,
        category:   category || nativeMatch?.type || (type === 'plant' ? 'Plant' : 'Insect'),
        bloom:      bloom.length ? bloom : (nativeMatch?.bloom || null),
        season:     type === 'bug' ? ['Year-round'] : null,
        isNative:   !!nativeMatch,
        source:     'Manual'
    };

    const btn = document.querySelector('#manual-modal .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        await ensureSession();
        const entry = buildEntry(result, null, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;
        if (!inserted) throw new Error('Save failed — no data returned. Please try signing out and back in.');

        if (nativeMatch) alert(`Saved! ${result.common} is a Florida native plant.`);
        else alert(`${result.common} added to your garden.`);

        closeModal('manual-modal');
        emit('inventory-changed');

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save entry';
    }
}
```

- [ ] **Step 4: Verify save flow works**

Test in browser:
1. Sign in
2. Open capture modal → Manual entry → fill in common name → Save
3. Confirm alert shows success message
4. Confirm item appears in garden grid
5. If error alert appears, note the message — it should now be descriptive

- [ ] **Step 5: Commit**

```bash
git add js/capture.js
git commit -m "fix: add session validation before save to prevent silent failures on mobile"
```

---

### Task 6: Bump Cache Version and Final Verification

**Files:**
- Modify: `index.html:15-17,340` (cache bust version)

- [ ] **Step 1: Bump cache version from v13 to v14**

In `index.html`, update all four `?v=` references:

Line 15: `css/base.css?v=13` → `css/base.css?v=14`
Line 16: `css/components.css?v=13` → `css/components.css?v=14`
Line 17: `css/screens.css?v=13` → `css/screens.css?v=14`
Line 340: `js/app.js?v=13` → `js/app.js?v=14`

- [ ] **Step 2: Full verification pass**

At 390px viewport:
1. Welcome screen: greeting, quote, fact, hint all readable. Fact rotates daily.
2. Garden tab: card names, scientific names, tags all readable. Filter chips and sort legible.
3. Item detail: hero badges, about labels, overlay padding all correct.
4. Capture modal: divider text readable.
5. Reminders: plant tags readable.
6. Manual save: creates entry, appears in grid.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: bump cache version to v14 for fact, sizing, and save fixes"
```
