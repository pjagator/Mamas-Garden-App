# Auth Flash Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the auth screen flash that authenticated users see on every app load by synchronously showing the correct screen before any async JS runs.

**Architecture:** A tiny inline `<script>` added to `index.html` runs synchronously during HTML parsing, reads Supabase's session key from localStorage, and immediately hides the auth screen and shows the correct app screen for returning users — before the CDN scripts or ES modules load. For users without a session, the auth screen now starts at `opacity:0` and fades in gracefully once `onAuthStateChange` confirms there's no session.

**Tech Stack:** Vanilla JS, HTML, CSS — no build step, no dependencies. Supabase stores its session under `sb-itjvgruwvlrrlhsknwiw-auth-token` in localStorage.

---

## Files

| File | Change |
|------|--------|
| `index.html` | Add `style="opacity:0"` to `#auth-screen` (line 24); add pre-check `<script>` before the Supabase CDN script (line 352) |
| `css/screens.css` | Add `transition: opacity 300ms ease` to the existing `#auth-screen` rule (line 2) |
| `js/app.js` | Update the `else` branch of `onAuthStateChange` (lines 413–416) to fade auth screen in |

---

### Task 1: Make auth screen start invisible and add CSS fade-in transition

**Files:**
- Modify: `index.html:24`
- Modify: `css/screens.css:2-9`

- [ ] **Step 1: Add `opacity:0` to `#auth-screen` in index.html**

  Find line 24:
  ```html
  <div id="auth-screen">
  ```
  Change to:
  ```html
  <div id="auth-screen" style="opacity:0">
  ```

- [ ] **Step 2: Add `transition` to the `#auth-screen` CSS rule in `css/screens.css`**

  Find the existing `#auth-screen` rule (lines 2–9):
  ```css
  #auth-screen {
      min-height: 100vh;
      background: linear-gradient(160deg, var(--green-deep) 0%, var(--green-mid) 60%, #3d7a4f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
  }
  ```
  Add `transition: opacity 300ms ease;` as the last property:
  ```css
  #auth-screen {
      min-height: 100vh;
      background: linear-gradient(160deg, var(--green-deep) 0%, var(--green-mid) 60%, #3d7a4f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-6);
      transition: opacity 300ms ease;
  }
  ```

- [ ] **Step 3: Manually verify the auth screen is invisible on load (logged-out test)**

  Open the app in a browser with no active session (incognito or after signing out). The auth screen background should briefly not be visible and then fade in. If it flashes green background and then disappears, check that `opacity:0` was saved correctly. If it never appears, check that the transition is in place.

  > Note: the fade-in JS (Task 2) isn't done yet, so the form won't appear after this step. That's expected.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html css/screens.css
  git commit -m "fix: auth screen starts invisible, fades in via CSS transition"
  ```

---

### Task 2: Update `onAuthStateChange` to fade auth screen in when no session

**Files:**
- Modify: `js/app.js:413-416`

- [ ] **Step 1: Replace the `else` branch in `onAuthStateChange`**

  Find lines 413–416 in `js/app.js`:
  ```javascript
  } else {
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app').style.display = 'none';
  }
  ```
  Replace with:
  ```javascript
  } else {
      document.getElementById('app').style.display = 'none';
      const authEl = document.getElementById('auth-screen');
      authEl.classList.remove('hidden');  // clear if previously added by auth flow
      authEl.style.display = '';          // clear inline style set by pre-check script
      requestAnimationFrame(() => { authEl.style.opacity = '1'; });
  }
  ```

  **Why each line:**
  - `app` is hidden first so it doesn't flash if the pre-check showed it with a stale session
  - `classList.remove('hidden')` clears the CSS `display:none` rule added when a user previously logged in
  - `style.display = ''` clears any inline `display:none` that the pre-check script will set (Task 3)
  - `requestAnimationFrame` lets the browser paint the `opacity:0` starting state before the transition kicks in, ensuring a smooth fade rather than a snap

- [ ] **Step 2: Manually verify auth fade-in (logged-out test)**

  Open the app in incognito or after signing out. The page should briefly show nothing (green background invisible), then the auth card should fade in over ~300ms. If it pops in instantly, check that `opacity:0` is still on `#auth-screen` in the HTML and the CSS transition is present.

- [ ] **Step 3: Commit**

  ```bash
  git add js/app.js
  git commit -m "fix: fade auth screen in when no session instead of snapping in"
  ```

---

### Task 3: Add synchronous pre-check script to eliminate flash for authenticated users

**Files:**
- Modify: `index.html:354` (before `</body>`)

- [ ] **Step 1: Add the pre-check inline script just before `</body>` in `index.html`**

  Find line 352 — the Supabase CDN `<script>` tag. Add the pre-check block **immediately before it** (line 351 is a blank line — insert before line 352):
  ```html
  <script>
  (function() {
    var raw = localStorage.getItem('sb-itjvgruwvlrrlhsknwiw-auth-token');
    if (!raw) return;
    try {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      var lastVisit = parseInt(localStorage.getItem('garden-last-visit') || '0', 10);
      var screenId = Date.now() - lastVisit < 3600000 ? 'tab-garden' : 'welcome-screen';
      document.getElementById(screenId).classList.add('active-screen');
    } catch(e) {}
  })();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script type="module" src="js/app.js?v=19"></script>
  </body>
  ```

  **Why this works:**
  - Placed before `</body>` so all DOM elements exist when it runs
  - Placed **before** the Supabase CDN `<script>` tag — that tag is a synchronous blocking download, so placing the pre-check before it means it runs before the browser even starts fetching Supabase. This is where the speed gain comes from.
  - Runs synchronously — before Supabase loads or any ES modules execute
  - Only checks for session key existence (no parsing/validation); `onAuthStateChange` remains the authoritative auth gate
  - Uses `var` for maximum compatibility in an inline non-module script
  - `try/catch` silences any edge-case DOM errors without breaking the page
  - If session is stale/invalid, `onAuthStateChange` will fire later and correctly hide the app and fade in the auth screen

- [ ] **Step 2: Verify no flash for authenticated users**

  While logged in, hard-refresh the page (Cmd+Shift+R on Mac / Ctrl+Shift+R). The auth screen should not appear at all — garden or welcome screen should be visible from the first painted frame. Test in Chrome DevTools at 390px width and on iPhone Safari.

- [ ] **Step 3: Verify stale session edge case**

  To simulate a revoked session: open DevTools → Application → Local Storage → find `sb-itjvgruwvlrrlhsknwiw-auth-token` → change a character in the access_token value (making it invalid but keeping the key present). Reload. The pre-check will show the app briefly, then `onAuthStateChange` fires with no session, hides the app, and fades in the auth screen. This is acceptable behaviour.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html
  git commit -m "fix: synchronous pre-check eliminates auth screen flash for authenticated users"
  ```

---

## Final Verification Checklist

- [ ] Hard refresh while logged in → no auth screen visible at any point
- [ ] Incognito / logged out → auth card fades in smoothly (~300ms), no blank screen
- [ ] Sign out from settings → redirects to auth form correctly (fade-in)
- [ ] Sign in → transitions to garden/welcome correctly, no double-flash
- [ ] Stale session (manually corrupt token) → app visible briefly, then auth fades in
- [ ] Test on iPhone Safari at 390px (primary device)
- [ ] Bump `?v=` cache-bust query strings in `index.html` for both CSS and JS links (currently `v=19` → `v=20`) and update `CACHE_VERSION` in `sw.js`
