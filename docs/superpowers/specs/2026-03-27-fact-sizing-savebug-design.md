# Fact of the Day, Text Sizing Fix, and Save Bug

**Date:** 2026-03-27
**Status:** Approved

## Overview

Three changes: re-add the daily garden fact to the welcome screen, fix undersized text and inconsistent box sizing throughout the app, and fix a bug where saving entries (both AI and manual) silently fails on mobile.

---

## 1. Welcome Screen — Fact of the Day

### What
Re-add the "fact of the day" feature that was removed during the aesthetic redesign (commit `fdbc73e`). The `GARDEN_FACTS` array (64 facts) and `getDailyIndex()` helper are still in the codebase.

### Design (Option B — Anchored to Bottom)
- Fact block positioned absolutely near the bottom of the welcome screen, above the "tap to enter" hint
- "Did you know?" label: small uppercase, same letter-spacing style as the greeting
- Fact text: 13–14px, muted white (`rgba(255,255,255,0.55)`), max-width 300px, centered
- Quote stays vertically centered as the hero element — fact does not compete

### Implementation
- **HTML** (`index.html`): Add `welcome-fact` div inside `welcome-screen`, between `welcome-container` and `welcome-hint`
- **CSS** (`screens.css`): Position absolutely, bottom ~48px, left/right padding
- **JS** (`app.js`): In `initWelcomeScreen()`, populate fact via `getDailyIndex(GARDEN_FACTS, 7)` (offset 7 so fact and quote rotate independently)

---

## 2. Text Sizing & Box Sizing Fix

### What
12 elements have text below 14px (some as low as 9px). Multiple elements use hardcoded pixel values instead of the `--text-*` and `--space-*` design system variables. This makes text unreadable on mobile and creates visual inconsistency.

### Changes

**Welcome screen** (`screens.css`):
| Selector | Before | After |
|----------|--------|-------|
| `.welcome-greeting` | 11px | 13px |
| `.welcome-quote-text` | 18px | 20px |
| `.welcome-quote` max-width | 260px | 280px |
| `.welcome-attribution` | 11px | 13px |
| `.welcome-hint` | 10px | 12px |
| `.welcome-container` padding | 0 40px | 0 var(--space-8) |

**Garden cards** (`components.css`):
| Selector | Before | After |
|----------|--------|-------|
| `.garden-card-sci` | 10px | var(--text-sm) |
| `.garden-card-tags .tag` | 9px | 11px |
| `.garden-card-info` padding | 10px 10px 12px | var(--space-3) |

**Detail modal** (`components.css`):
| Selector | Before | After |
|----------|--------|-------|
| `.detail-about-label` | 10px | 12px |
| `.detail-hero-badge` | 10px | 12px |
| `.detail-hero-overlay` padding | 16px 20px 14px | var(--space-4) var(--space-5) |

**Filter/sort UI** (`components.css`):
| Selector | Before | After |
|----------|--------|-------|
| `.chip` | 11px | 13px |
| `.sort-select` | 11px | 13px |

**Other** (`components.css` / `screens.css`):
| Selector | Before | After |
|----------|--------|-------|
| `.capture-divider span` | 11px | 13px |
| `.reminder-plant-tag` | 0.6875rem | var(--text-sm) |

### Scope
No layout changes, no redesign. Only size bumps and variable substitutions.

---

## 3. Save Bug — Silent Insert Failure on Mobile

### Symptom
Both AI identification and manual entry flows appear to succeed (no error alert), but data never reaches the database. Items don't appear even after hard refresh.

### Hypothesis
The Supabase JS client on mobile Safari loses its auth session (JWT stored in localStorage) after the phone sleeps or between navigations. The `.insert()` call returns without error but with null data because RLS silently blocks the unauthenticated request.

### Investigation & Fix
1. Add `console.error` / `console.log` around insert calls to capture actual response on mobile
2. Before any write operation, call `sb.auth.getSession()` to verify the JWT is valid
3. If session is expired/missing, call `sb.auth.refreshSession()` before proceeding
4. Add explicit check: if `!inserted && !error`, treat as auth failure and show a meaningful error
5. Apply the same session-check pattern to both `saveSelectedId()` and `saveManualEntry()` in `capture.js`

### Fallback
If session is valid but inserts still fail, investigate whether `.select().single()` is masking the error — test with just `.insert(entry)` without chaining.
