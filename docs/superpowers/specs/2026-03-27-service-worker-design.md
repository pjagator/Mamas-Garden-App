# Service Worker for PWA Cache Updates

**Date:** 2026-03-27
**Status:** Approved

## Overview

Add a service worker so the home screen PWA version of the app updates when new code is deployed, instead of serving stale cached files indefinitely.

## Files

- **Create:** `sw.js` — service worker with versioned cache
- **Modify:** `js/app.js` — register the service worker

## Service Worker (`sw.js`)

- Define `CACHE_VERSION` constant (e.g., `'v14'`) matching the current cache bust version
- **Install event:** Pre-cache core files: `index.html`, `css/base.css`, `css/components.css`, `css/screens.css`, `js/app.js`. Use `skipWaiting()` to activate immediately.
- **Activate event:** Delete all caches that don't match `CACHE_VERSION`. Use `clients.claim()` to take control of open pages.
- **Fetch event:**
  - Navigation requests (HTML): network-first with cache fallback (online users always get fresh content)
  - Static assets (CSS/JS/images): cache-first with network fallback (fast loads, updated when cache version bumps)

## Registration (`js/app.js`)

Add service worker registration at the end of the module, guarded by `'serviceWorker' in navigator`. Register with scope `/Mamas-Garden-App/`. No error handling needed beyond a console.error on failure.

## Update Flow

When deploying new code:
1. Bump `CACHE_VERSION` in `sw.js` (alongside the `?v=` bump in `index.html`)
2. Push to main
3. Browser detects changed `sw.js`, installs new service worker, deletes old cache
4. Next visit loads fresh files
