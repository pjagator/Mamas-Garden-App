# Auth Flash Fix — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Problem

Authenticated users see the login screen linger briefly every time the app loads before being redirected to the garden or welcome screen. This happens because `#auth-screen` is visible by default in the HTML, and Supabase's `onAuthStateChange` callback fires asynchronously after the JS module loads and initializes — causing a noticeable flash of the wrong screen.

## Solution: Optimistic localStorage Pre-Check

Add a small synchronous inline `<script>` in `<head>` that runs during HTML parsing — before any external scripts or modules load. It reads Supabase's session from localStorage directly and immediately hides the auth screen and shows the correct app screen for returning authenticated users.

For unauthenticated users (no session in localStorage), the auth screen fades in gracefully once `onAuthStateChange` confirms no session.

## Changes

### 1. `index.html` — Inline pre-check script before `</body>`

Add just before the closing `</body>` tag (after all HTML elements are defined, so `getElementById` can find them):

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
```

Uses `var` (not `const`/`let`) for maximum compatibility. Wrapped in try/catch so any DOM timing edge case fails silently. Does not parse or validate the session token — just checks existence; `onAuthStateChange` remains the authoritative auth gate.

### 2. `index.html` — Auth screen starts invisible for unauthenticated users

Add `style="opacity:0"` to `#auth-screen` so that when there's no session, the auth form fades in rather than snapping in:

```html
<div id="auth-screen" style="opacity:0">
```

### 3. `css/screens.css` — Auth screen fade-in transition

Add a CSS transition to `#auth-screen`:

```css
#auth-screen {
  transition: opacity 300ms ease;
}
```

(Add to the existing `#auth-screen` rule, don't create a duplicate.)

### 4. `js/app.js` — Fade auth screen in when no session

In the `else` branch of `onAuthStateChange` (no user), replace the current show logic with a fade-in:

```javascript
// Before (current):
document.getElementById('auth-screen').classList.remove('hidden');
document.getElementById('app').style.display = 'none';

// After:
document.getElementById('app').style.display = 'none';
const authEl = document.getElementById('auth-screen');
authEl.classList.remove('hidden');   // in case it was hidden by auth flow
authEl.style.display = '';           // clear inline style set by pre-check script
requestAnimationFrame(() => { authEl.style.opacity = '1'; });
```

The `requestAnimationFrame` ensures the `opacity:0` starting state has been painted before the transition begins. Clearing `style.display` is necessary because the pre-check script uses `authEl.style.display = 'none'` (inline style), which would still hide the element even after removing the `hidden` class.

## Edge Cases

**Stale/revoked session:** If the pre-check shows the app but Supabase can't refresh the token, `onAuthStateChange` fires with `session = null`. The existing `else` branch already hides the app — we're just adding the fade-in to that path.

**First-time user / logged out:** No session in localStorage, pre-check returns early. Auth screen fades in once `onAuthStateChange` fires. Delay is the same as before but now feels intentional (fade) rather than broken (flash).

**DOM not ready:** The inline script is placed just before `</body>` so all elements are defined when it runs. The try/catch ensures silent failure if anything is missing.

## Verification

1. Hard refresh while logged in → no auth screen flash, garden or welcome appears immediately
2. Open in incognito (no session) → auth screen fades in smoothly, no blank screen
3. Let session expire or revoke token manually → app shows briefly, then auth screen fades in
4. Test on iPhone Safari at 390px width (primary target device)
