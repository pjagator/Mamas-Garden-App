# Tampa Bay Garden Tracker

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
js/app.js        -- Entry point. Supabase client, shared state (getters/setters), event system (on/emit), helpers, data arrays (quotes, facts, native plants), welcome screen, navigation, modal helpers, loadInventory, window bindings for all HTML event handlers.
js/auth.js       -- All auth flows: sign in, sign up, OTP, password reset, sign out.
js/capture.js    -- Photo capture, canvas preview, image upload, species ID via edge function, ID result cards, manual entry, save flow.
js/inventory.js  -- Garden grid rendering, search/filter/sort, item detail modal, delete, timeline, export, native DB modal, clear data.
js/features.js   -- Tag editor, bug-plant linking, plant status tracking, care profile generation/display, seasonal care reminders.
```

### Frontend (CSS in `css/`)
```
css/base.css       -- Reset, :root custom properties (colors, typography, spacing), fields, buttons, spinner, utilities.
css/components.css -- Cards, tags, badges, detail view, care profile, plant status, linked bugs, filter chips, seasonal reminders.
css/screens.css    -- Auth, welcome, capture, garden, timeline, settings, modals, bottom nav.
```

### HTML
```
index.html    -- HTML structure: welcome screen, 4 tab screens, 3 modals, bottom tab nav, auth screen. Loads CSS via 3 <link> tags, JS via single <script type="module">.
```

### Edge functions
```
supabase/functions/identify-species/  -- Species ID from photos via Claude Sonnet
supabase/functions/garden-assistant/  -- Care profile generation + seasonal reminders via Claude Haiku
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

- **Dependency direction**: `app.js` is the root (imports from nothing). All other modules import from `app.js`. `capture.js` and `inventory.js` also import from `features.js`. No circular dependencies.
- **State access**: `getCurrentUser()` and `getAllInventory()` getters in `app.js`. Never access `_currentUser` or `_allInventory` directly from other modules.
- **Event system**: `on(event, fn)` and `emit(event, data)` in `app.js`. Events: `'inventory-changed'` (triggers loadInventory), `'item-updated'` (triggers renderInventory + detail modal refresh).
- **Window bindings**: All functions referenced in HTML `onclick`/`oninput`/`onchange` attributes are bound to `window` via `Object.assign(window, {...})` at the bottom of `app.js`.
- **Adding new features**: Create a new `js/<feature>.js` file, import from `app.js`, export functions, add window bindings in `app.js`. Listen for `'inventory-changed'` to stay in sync. New screens use `showScreen()`. New CSS goes in the appropriate file (components vs screens).

## Design Constraints

- **No build tools**. No npm, no webpack, no Vite, no React, no TypeScript on the frontend. Raw files served from GitHub Pages.
- **Mobile-first, iPhone-optimized**. Target device is iPhone Safari. Test at 390px width. 44px minimum touch targets everywhere.
- **ES modules, no bundler**. JS files in `js/`, CSS files in `css/`, loaded directly by `index.html`. New features get their own module file.
- **API keys stay server-side**. Only the Supabase anon key appears in client code. All AI calls go through edge functions.
- **Edge functions use direct `fetch()`**, NOT `sb.functions.invoke()`. The SDK method had persistent JWT/EarlyDrop failures. This is a settled decision -- see PROJECT-CONTEXT.md for the full story.
- **Design system**: Playfair Display headings, DM Sans body, forest green (#1c3a2b), warm cream (#f5f0e8), terracotta (#c4622d). Typography scale from 0.75rem to 1.875rem. Spacing scale in 4px increments.

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

### Storage

Bucket `garden-images` (public). Final images at `{user_id}/{timestamp}.jpg`. Temp images for ID at `{user_id}/temp_{timestamp}.jpg`.

### Edge Function Secrets

- `ANTHROPIC_API_KEY`

## Deploy

- **Frontend**: `git push` to main (GitHub Pages auto-deploys)
- **Edge functions**: `supabase functions deploy <function-name>` or paste in dashboard
- **DB migrations**: Run SQL directly in Supabase SQL Editor
- **Cache busting**: Manually increment `?v=N` on style.css and app.js links in index.html

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
