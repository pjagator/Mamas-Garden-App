# Tampa Bay Garden Tracker

**Session start**: Before working on any code, read these files to understand current state:
- `PROJECT-STATE.md` — Full codebase audit (files, features, bugs, dependencies)
- `PROJECT-CONTEXT.md` — Supabase config, edge function details, gotchas
- `.claude/docs/architectural_patterns.md` — Code patterns and conventions

A mobile-first web app for tracking native plants and wildlife in a Tampa Bay, Florida garden. Built for my wife -- she's an English teacher who gardens with native Florida species and wants a simple way to catalog what's growing, identify species from photos, and track plant health over time. I use it too, but she's the primary user.

## Users

- **Primary**: My wife. English teacher, loves classic literature, not technical. The app should feel like a garden journal, not a database. She uses an iPhone.
- **Secondary**: Me. I maintain the code and occasionally log plants/insects.

## Tech Stack

- **Frontend**: Vanilla JS / HTML / CSS -- no frameworks, no build step, no bundlers, no npm
- **Backend**: Supabase (auth, Postgres with RLS, Storage, Edge Functions on Deno)
- **Species ID**: Claude Sonnet (claude-sonnet-4-20250514) via `identify-species` edge function -- handles both plants and insects from photos
- **Care Profiles**: Claude Haiku (claude-haiku-4-5-20251001) via `garden-assistant` edge function -- generates Tampa Bay-specific plant care data
- **Seasonal Reminders**: Claude Haiku via `garden-assistant` edge function (action: `"reminders"`) -- generates monthly care tasks based on user's plant inventory
- **Hosting**: GitHub Pages (push to main = deploy)

## Architecture

Single-page app using ES modules. No build step, no bundler.

### Frontend (JS modules in `js/`)
```
js/app.js        -- Entry point. Supabase client, shared state (getters/setters), event system (on/emit), helpers, data arrays (quotes), conditional welcome screen (shown only after 1+ hour absence, tracked via `garden-last-visit` localStorage key), navigation (2 tabs + FAB), modal helpers (including capture modal, settings sheet), loadInventory, localStorage inventory caching, connection toast UI, offline FAB state, FAB scroll behavior, window bindings for all HTML event handlers.
js/auth.js       -- All auth flows: sign in, sign up, OTP, password reset, sign out.
js/capture.js    -- Photo capture, canvas preview, image upload, species ID via edge function using resilientFetch, offline guards, ID result cards, manual entry, save flow. Runs inside capture modal (not a tab).
js/inventory.js  -- Garden grid rendering with DocumentFragment batch rendering, search/filter/sort using filter-by-hiding via data attributes, item detail modal (hero image + unified cards), delete, timeline (vertical track), export, clear data.
js/features.js   -- Tag editor, bug-plant linking, plant status tracking, care profile generation/display using resilientFetch with offline guards, seasonal care reminders, health check logging/history/diagnosis. Shared toggleSection() helper for expandable cards.
js/network.js    -- Standalone network resilience utility. resilientFetch() with retries/timeouts/backoff, isOnline(), onConnectionChange(). No imports from app.js.
```

### Frontend (CSS in `css/`)
```
css/base.css       -- Reset, :root custom properties (colors, typography, spacing, gradients, FAB tokens), fields, buttons, utilities, reduced motion media query.
css/components.css -- Cards, tags, badges, detail view (hero + unified cards), FAB, FAB offline state, care profile, expandable sections, filter chips, filter-hidden utility, loading dots, seasonal reminders, connection toast.
css/screens.css    -- Auth, welcome (forest gradient, safe-area-inset-top padding), garden (gradient header with safe-area-inset-top, collapsible frosted search overlay), timeline (vertical track), modals, bottom nav (2 tabs + FAB).
```

### HTML
```
index.html    -- HTML structure: welcome screen, 2 tab screens (garden, timeline), capture modal, settings modal, item detail modal, health check modal, connection toast element, bottom nav (2 tabs + FAB), auth screen. Loads CSS via 3 <link> tags (?v=18), JS via single <script type="module"> (?v=18). viewport-fit=cover for iPhone status bar bleed.
```

### Edge functions
```
supabase/functions/identify-species/  -- Species ID from photos via Claude Sonnet. Includes server-side fetchWithRetry() for Claude API overloaded errors (529). Edit locally, deploy with supabase functions deploy.
supabase/functions/garden-assistant/  -- Care profile generation + seasonal reminders via Claude Haiku, plant health diagnosis via Claude Sonnet. Includes server-side fetchWithRetry() for Claude API overloaded errors (529). Edit locally, deploy with supabase functions deploy.
```

### Documentation
```
PROJECT-STATE.md        -- Full codebase audit: every file, every feature, every bug, every dependency
PROJECT-CONTEXT.md      -- Supabase config, edge function code, gotchas learned the hard way
CLAUDE-CODE-PROMPT.md   -- Feature roadmap with specs for 5 planned features
LEARNING-PLAN.md        -- 10-lesson curriculum for professional app polish (2 of 10 done)
.claude/docs/architectural_patterns.md -- Code patterns: state management, API calls, modals, data flow
```

### Module Conventions

- **Dependency direction**: `app.js` is the root (imports from nothing). All other modules import from `app.js`. `capture.js` and `inventory.js` also import from `features.js`. No circular dependencies. Exception: `network.js` is a standalone utility — it imports nothing. All other modules that need network resilience import from `network.js`.
- **State access**: `getCurrentUser()` and `getAllInventory()` getters in `app.js`. Never access `_currentUser` or `_allInventory` directly from other modules.
- **Event system**: `on(event, fn)` and `emit(event, data)` in `app.js`. Events: `'inventory-changed'` (triggers loadInventory), `'item-updated'` (triggers renderInventory + detail modal refresh).
- **Window bindings**: All functions referenced in HTML `onclick`/`oninput`/`onchange` attributes are bound to `window` via `Object.assign(window, {...})` at the bottom of `app.js`.
- **Network calls**: All `fetch()` calls to edge functions use `resilientFetch()` from `network.js` (retries, timeouts, backoff). Supabase SDK calls (`sb.from()`, `sb.storage`) go through the SDK directly.
- **Offline behavior**: Write operations (save, identify, diagnose) check `isOnline()` and show friendly messages when offline. Read operations work from localStorage cache.
- **Adding new features**: Create a new `js/<feature>.js` file, import from `app.js`, export functions, add window bindings in `app.js`. Listen for `'inventory-changed'` to stay in sync. New screens use `showScreen()`. New modals use `openModal()`/`closeModal()`. New CSS goes in the appropriate file (components vs screens). Use the unified card system (`.detail-card` or `.detail-card-expandable`) for content sections.
- **Navigation**: 2 tabs (Garden home, Timeline) + floating action button (FAB) for capture. No settings tab — gear icon in garden header opens settings sheet modal. Capture is a modal, not a screen. Garden header has a collapsible search: magnifying glass icon expands a full-width frosted overlay; dismissed by tapping icon again, tapping outside, or navigating away.

## Design Constraints

- **No build tools**. No npm, no webpack, no Vite, no React, no TypeScript on the frontend. Raw files served from GitHub Pages.
- **Mobile-first, iPhone-optimized**. Target device is iPhone Safari. Test at 390px width. 44px minimum touch targets everywhere.
- **ES modules, no bundler**. JS files in `js/`, CSS files in `css/`, loaded directly by `index.html`. New features get their own module file.
- **API keys stay server-side**. Only the Supabase anon key appears in client code. All AI calls go through edge functions.
- **Edge functions use direct `fetch()`**, NOT `sb.functions.invoke()`. The SDK method had persistent JWT/EarlyDrop failures. This is a settled decision -- see PROJECT-CONTEXT.md for the full story.
- **Design system**: "The Botanical Journal" aesthetic. Playfair Display headings (Google Fonts), system-ui / SF Pro body (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif` — DM Sans removed), forest green (#1c3a2b), warm cream (#f5f0e8), terracotta (#c4622d). Gradient backgrounds (not flat solids). Typography scale from 0.75rem to 1.875rem. Spacing scale in 4px increments. Unified white card system with 14px radius and consistent shadow. Literary language throughout ("species cataloged", "visitors observed"). SVG icons (not emoji). Smooth text rendering. Organic animations with cubic-bezier easing. Respects `prefers-reduced-motion`. `viewport-fit=cover` + `env(safe-area-inset-top)` for iPhone status bar.

## Supabase

- **Project URL**: `https://itjvgruwvlrrlhsknwiw.supabase.co`
- **Anon key**: In `app.js` line 3

### Table: `inventory`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK to `auth.users(id)` ON DELETE CASCADE |
| `common` | text | | Common name |
| `scientific` | text | | Scientific name |
| `type` | text | | `'plant'` or `'bug'` |
| `category` | text | | e.g. "Shrub", "Butterfly", "Tree" |
| `confidence` | integer | | 0-100 ID confidence from AI |
| `description` | text | | One-sentence description from AI |
| `care` | text | | Brief care tip from AI identification |
| `bloom` | text[] | | Blooming seasons array |
| `season` | text[] | | Active seasons for insects |
| `is_native` | boolean | `false` | Native to Florida |
| `source` | text | | `'Claude AI'` or `'Manual'` |
| `image_url` | text | | Public URL in Supabase Storage |
| `notes` | text | `''` | User notes |
| `date` | timestamptz | `now()` | Date added |
| `tags` | text[] | `'{}'` | Preset + custom tags |
| `location` | text | `''` | e.g. "Front, Hammock" |
| `care_profile` | jsonb | | Structured care data from Claude Haiku |
| `health` | text | | thriving, healthy, stressed, sick, dormant, new |
| `flowering` | text | | yes, budding, no, fruiting |
| `height` | text | | Free text |
| `features` | text | | Free text observations |
| `linked_plant_id` | uuid/text | | FK to inventory(id) or `'ground'` for bugs |

RLS enabled: users can only read/write/delete their own rows.

### Table: `reminders`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK to `auth.users(id)` ON DELETE CASCADE |
| `month_key` | text | NOT NULL | e.g. `"2026-03"` |
| `icon` | text | `''` | Emoji icon for the reminder |
| `title` | text | NOT NULL | Short task description |
| `detail` | text | `''` | 1-2 sentence explanation |
| `plant` | text | `''` | Which plant this applies to, or empty for general |
| `source` | text | `'ai'` | `'ai'` or `'custom'` |
| `done` | boolean | `false` | Whether the user has checked it off |
| `plant_hash` | text | `''` | Hash of plant list at generation time (staleness detection) |
| `created_at` | timestamptz | `now()` | Date created |

RLS enabled: users can only read/write/delete their own rows.

### Table: `health_logs`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK to `auth.users(id)` ON DELETE CASCADE |
| `inventory_id` | uuid | NOT NULL | FK to `inventory(id)` ON DELETE CASCADE |
| `health` | text | NOT NULL | thriving, healthy, stressed, sick, dormant, new |
| `flowering` | text | | yes, budding, no, fruiting |
| `notes` | text | `''` | Free text |
| `image_url` | text | | Photo in Supabase Storage |
| `diagnosis` | jsonb | | AI diagnosis result (cause, severity, action, details) |
| `logged_at` | timestamptz | `now()` | Timestamp |

RLS enabled: users can only read/write/delete their own rows.

### Storage

Bucket `garden-images` (public). Final images at `{user_id}/{timestamp}.jpg`. Temp images for ID at `{user_id}/temp_{timestamp}.jpg`.

### Edge Function Secrets

- `ANTHROPIC_API_KEY`

## React App (Firebush Branch)

A React/TypeScript rewrite lives on the `firebush` branch under `react-app/`. Deployed to Vercel separately from the vanilla app.

- **Stack**: React + TypeScript + Vite + shadcn/ui + Tailwind + Konva (garden map canvas)
- **Deploy**: `git push` to `firebush` (Vercel auto-deploys)
- **Shares**: Same Supabase project and database as the vanilla app
- **Extra tables**: `garden_maps`, `garden_beds`, `garden_placements`, `wishlist` (SQL in `docs/firebush-deployment-guide.md`)
- **API routes**: Uses Vercel API routes (in `react-app/api/`) instead of Supabase Edge Functions
- **Setup guide**: `docs/firebush-deployment-guide.md`

### React App Gotchas
- shadcn Sheet overlays block canvas events — close sheets before expecting taps to reach Konva canvas
- `useGardenMap.placeItem()` returns `{ placement, error }` (not null) — always check `result.error` for real error messages

## Deploy

- **Vanilla frontend**: `git push` to main (GitHub Pages auto-deploys)
- **React frontend**: `git push` to firebush (Vercel auto-deploys)
- **Edge functions**: `supabase functions deploy <function-name>` or paste in dashboard
- **DB migrations**: Run SQL directly in Supabase SQL Editor
- **Cache busting**: Manually increment `?v=N` (currently v21) on CSS and app.js links in index.html. Also bump CACHE_VERSION in sw.js to match.

## Testing

No automated tests. Manual verification:
- iPhone Safari or 390px Chrome DevTools viewport
- Verify RLS works (user isolation)
- Hard refresh to bust cached JS/CSS
- Edge function logs in Supabase dashboard

## Key Gotchas

- Edge function request bodies have a size limit. Upload images to Storage first, pass the URL -- never send raw base64 in the request body.
- Base64 conversion in Deno must use 8KB chunked approach. Spread operator on large arrays blows the call stack.
- `sb.functions.invoke()` has persistent JWT issues. Use direct `fetch()` with anon key in Authorization header.
- Supabase Storage upload policies use `storage.foldername(name)[1]` -- a `temp/` prefix in the path will be blocked unless the policy allows it.
- Supabase email confirmation redirects to `localhost` by default. Fix in Authentication > URL Configuration > Site URL.
- Both edge functions include `fetchWithRetry()` for Claude API overloaded errors (529). These are deployed separately from the frontend -- edit locally in `supabase/functions/`, then run `supabase functions deploy <function-name>`. GitHub push does NOT deploy edge functions.
- Service worker has two caches: `garden-static-vN` (core files, versioned) and `garden-images-v1` (Supabase Storage images, persistent). Bump CACHE_VERSION in sw.js and `?v=N` in index.html together when deploying frontend changes.
- Inventory data is cached in localStorage (not service worker). App does a cache-first render on load, then refreshes from Supabase in the background. The cache is invalidated automatically by `loadInventory()` after any write operation.
- `renderInventory()` renders ALL items to the DOM; filtering is handled by `applyFilters()` which toggles the `.filter-hidden` CSS class via data attributes. Never filter inside `renderInventory()` — doing so breaks the filter chip counts and causes stale state.
