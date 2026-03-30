# PROJECT-STATE.md — Full Codebase Audit

**Generated**: 2026-03-28
**Repo**: https://github.com/pjagator/Mamas-Garden-App
**Total files**: 21 (excluding `.git/`)
**Total lines**: ~6,200

---

## 1. File Inventory

### Core Application Files — JavaScript (ES modules in `js/`)

| File | Lines | Purpose |
|------|-------|---------|
| `js/app.js` | ~460 | Entry point. Supabase client, shared state (getters/setters), event system (on/emit), data arrays (65 quotes, 64 facts, 15 native plants, preset tags/locations), helpers, welcome screen (conditional — shown only after 1+ hour absence via `garden-last-visit` localStorage timestamp), SPA navigation, modal helpers, loadInventory, auth state change handler (fades auth screen in via `requestAnimationFrame` when no session; for authenticated users the startup display is handled by the synchronous pre-check script in `index.html` before this module loads), window bindings for all HTML event handlers. connection toast UI, localStorage inventory caching, offline FAB state. |
| `js/auth.js` | 83 | Auth flows: sign in, sign up, magic link OTP, password reset, sign out. Internal: setAuthMsg, otpEmail. |
| `js/capture.js` | ~320 | Photo capture via camera/gallery, canvas preview (max 900px), image upload (temp 0.5 quality, final 0.82 quality), species ID via edge function, ID result cards, manual entry modal, save flow with care profile generation. resilientFetch for API calls, offline guards. |
| `js/inventory.js` | ~400 | Garden grid rendering (2-column), search/filter/sort, item detail modal orchestration, delete, timeline, JSON/CSV export, native DB modal, clear all data. Module-local filter/search/sort state. DocumentFragment batch rendering, filter-by-hiding via data attributes. |
| `js/features.js` | ~770 | Tag editor (preset + custom), bug-plant linking, plant status tracking (health/flowering/height/location/features), care profile generation + display, seasonal care reminders (load/generate/render/check-off/add-custom/delete). Uses event system to avoid circular dependencies with inventory.js. resilientFetch for API calls, offline guards. |
| `js/network.js` | 61 | Standalone network resilience utility. `resilientFetch()` with configurable retries, exponential backoff, AbortController timeout. `isOnline()` and `onConnectionChange()` for connection state. No imports from app.js. |

### Core Application Files — CSS (in `css/`)

| File | Lines | Purpose |
|------|-------|---------|
| `css/base.css` | 226 | Design system: reset, :root custom properties (colors, typography scale, spacing scale, shadows, radii, fonts), body, fields, 5 button variants, divider, checkbox row, spinner (deduplicated), iOS font-size fix. `--font-body` uses system-ui stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`). |
| `css/components.css` | ~660 | Reusable components: ID result cards (deduplicated), confidence badges, tags (all variants), tag editor, filter chips, garden cards, detail view, plant status, linked bugs, care profile, natives list, seasonal care reminders (checklist, checkboxes, add-row). connection toast, FAB offline state, filter-hidden utility. |
| `css/screens.css` | 533 | Screen layouts: auth, welcome (safe-area-inset-top padding), app shell, screens base + animations, bottom nav, capture tab, garden tab (stats/collapsible search overlay/grid), timeline, settings, modals (overlay + sheet + slide-up animation), 360px breakpoint. `#auth-screen` has `transition: opacity 300ms ease` for graceful fade-in when no session. |

### HTML

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~370 | HTML structure: auth screen, 5 screens (Welcome, Capture, Garden, Timeline, Settings), 3 modals, bottom tab nav, seasonal reminders section in Garden tab. Loads 3 CSS files via `<link>`, JS via `<script type="module">`. Cache-busted with `?v=20`. connection toast element. `viewport-fit=cover` in viewport meta for iPhone status bar bleed. Collapsible search: magnifying glass icon button in garden header expands full-width frosted overlay. **Auth flash fix**: `#auth-screen` starts with `style="opacity:0"`. Inline synchronous `<script>` before the Supabase CDN tag reads `sb-itjvgruwvlrrlhsknwiw-auth-token` from localStorage and immediately hides the auth screen and shows the correct app screen for authenticated users — runs before any async JS. |

### Edge Functions

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/functions/garden-assistant/index.ts` | ~270 | Deno edge function for care profiles and seasonal reminders. Two actions: `"care_profile"` (accepts plant data, returns structured care JSON) and `"reminders"` (accepts month + plant list, returns 3-5 monthly care tasks). Both call Claude Haiku (claude-haiku-4-5-20251001) with Tampa Bay-specific prompts. CORS enabled, JWT verification disabled. fetchWithRetry for Claude API resilience, plant health diagnosis via Claude Sonnet. |
| `supabase/functions/identify-species/index.ts` | ~120 | Deno edge function for species identification from photos via Claude Sonnet. Includes fetchWithRetry with exponential backoff for overloaded errors. CORS enabled, JWT disabled. |

### Service Worker

| File | Lines | Purpose |
|------|-------|---------|
| `sw.js` | 80 | PWA service worker. Two caches: `garden-static-vN` (core files, cache-first) and `garden-images-v1` (Supabase Storage images, stale-while-revalidate with FIFO eviction at 200 entries). Navigation is network-first. Skips temp images. |

### Database Migrations

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/create_reminders_table.sql` | 17 | Creates `reminders` table with RLS policies for seasonal care reminders feature. Run in Supabase SQL Editor. |

### Documentation

| File | Lines | Purpose |
|------|-------|---------|
| `CLAUDE.md` | 65 | Claude Code project instructions. Tech stack summary, project structure, key rules (3 files, no frameworks, API keys server-side, direct fetch not sb.functions.invoke, target iPhone Safari 390px), database overview, deploy instructions, testing approach. |
| `PROJECT-CONTEXT.md` | 372 | Comprehensive project context. Supabase project URL + anon key, full DB schema, storage config, edge function `identify-species` code (inline), app features list, app.js key functions, design system, all known gotchas (EarlyDrop, storage policies, auth redirects, base64 chunking), native plant database listing, CSS component inventory, planned/in-progress features (tags, locations, sorting, photos on manual entries, bug-plant associations, welcome screen). |
| `CLAUDE-CODE-PROMPT.md` | 192 | Development roadmap. Current features list, 5 planned features with specs: (1) Plant Care Dashboard, (2) Planting Guide and Recommendations, (3) Visual Garden Map, (4) Seasonal Care Reminders, (5) Plant Health Tracking. Includes DB schema for proposed tables (`garden_beds`, `garden_placements`, `health_logs`). Edge function considerations. |
| `LEARNING-PLAN.md` | 371 | 10-lesson curriculum for professional app techniques. Lessons: (1) Typography scale ✅ done, (2) Touch targets ✅ done, (3) Skeleton screens, (4) Transitions/animations, (5) Empty states, (6) Image optimization, (7) Error handling, (8) Gestures, (9) Accessibility, (10) Performance. |
| `.claude/docs/architectural_patterns.md` | 106 | Documents codebase patterns: state management (module-level vars, `allInventory` as source of truth), edge function communication (direct fetch pattern), Supabase SDK usage (auth/db/storage), modal pattern, screen navigation (SPA with class toggling), expandable sections, identification-to-save data flow, error handling tiers, native plant cross-reference, CSS design system. |

### Configuration & Meta

| File | Lines | Purpose |
|------|-------|---------|
| `manifest.json` | 15 | PWA manifest. App name "Tampa Garden", standalone display, cream background, green theme. SVG emoji icon (🌿). Start URL `/Mamas-Garden-App/`. |
| `LICENSE` | 201 | Apache License 2.0. |
| `.claude/settings.local.json` | 15 | Claude Code local permissions. Allows: git add/commit/push/pull, npm/vite/node commands, specific file deletions. |

---

## 2. Supabase Schema

### Project

- **URL**: `https://itjvgruwvlrrlhsknwiw.supabase.co`
- **Anon key**: Embedded in `app.js` line 3 (JWT, role=anon, expires 2036)

### Table: `inventory`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK → `auth.users(id)` ON DELETE CASCADE |
| `common` | text | | Common name (e.g. "Firebush") |
| `scientific` | text | | Scientific name (e.g. "Hamelia patens") |
| `type` | text | | `'plant'` or `'bug'` |
| `category` | text | | e.g. "Shrub", "Butterfly", "Tree" |
| `confidence` | integer | | 0–100 ID confidence score |
| `description` | text | | One-sentence description from AI |
| `care` | text | | Brief care tip from AI identification |
| `bloom` | text[] | | Blooming seasons, e.g. `['Spring','Summer']` |
| `season` | text[] | | Active seasons for insects |
| `is_native` | boolean | `false` | Native to Florida specifically |
| `source` | text | | `'Claude AI'` or `'Manual'` |
| `image_url` | text | | Public URL in Supabase Storage |
| `notes` | text | `''` | User-entered notes |
| `date` | timestamptz | `now()` | Date added |
| `tags` | text[] | `'{}'` | Array of tag strings (preset + custom) |
| `location` | text | `''` | Location string, e.g. "Front, Hammock" |
| `care_profile` | jsonb | | Structured care data from Claude Haiku |
| `health` | text | | `'thriving'`, `'healthy'`, `'stressed'`, `'sick'`, `'dormant'`, `'new'` |
| `flowering` | text | | `'yes'`, `'budding'`, `'no'`, `'fruiting'` |
| `height` | text | | Free text, e.g. "3 feet" |
| `features` | text | | Free text observations |
| `linked_plant_id` | uuid or text | | FK → `inventory(id)` ON DELETE SET NULL, or `'ground'` |

**RLS**: Enabled. Users can only read/write/delete rows where `user_id` = their own ID.

### Table: `reminders`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK → `auth.users(id)` ON DELETE CASCADE |
| `month_key` | text | NOT NULL | e.g. `"2026-03"` |
| `icon` | text | `''` | Emoji icon for the reminder |
| `title` | text | NOT NULL | Short task description |
| `detail` | text | `''` | 1-2 sentence explanation |
| `plant` | text | `''` | Which plant this applies to, or empty for general |
| `source` | text | `'ai'` | `'ai'` (Claude-generated) or `'custom'` (user-added) |
| `done` | boolean | `false` | Whether the user has checked it off |
| `plant_hash` | text | `''` | Sorted comma-joined plant names at generation time (staleness detection) |
| `created_at` | timestamptz | `now()` | Date created |

**RLS**: Enabled. Users can only read/write/delete rows where `user_id` = their own ID.

**Migration file**: `supabase/migrations/create_reminders_table.sql`

### Storage: `garden-images` bucket

- **Visibility**: Public
- **Upload path**: `{user_id}/{timestamp}.jpg` (final images at 0.82 JPEG quality)
- **Temp path**: `{user_id}/temp_{timestamp}.jpg` (identification images at 0.5 JPEG quality)
- **Upload policy**: Any authenticated user can upload (folder restriction removed)

### Edge Functions

| Function | URL | Auth | Model |
|----------|-----|------|-------|
| `identify-species` | `.../functions/v1/identify-species` | JWT disabled, anon key only | Claude Sonnet (claude-sonnet-4-20250514) |
| `garden-assistant` | `.../functions/v1/garden-assistant` | JWT disabled, anon key only | Claude Haiku (claude-haiku-4-5-20251001) |

### Secrets

- `ANTHROPIC_API_KEY` — stored in Supabase Edge Functions environment

---

## 3. Working Features

### Authentication
- Email/password sign in
- Email/password sign up (with email confirmation)
- Magic link / OTP sign in (6-digit code via email)
- Password reset via email
- Sign out
- Auth state listener auto-shows/hides app

### Welcome Screen
- **Conditional display**: Only shown after 1+ hour absence. Recent visits (within 1 hour) skip directly to garden tab. Absence tracked via `garden-last-visit` in localStorage; timestamp saved on navigation away, dismiss button, and page hide (`visibilitychange`).
- Time-of-day greeting ("Good morning" / "Good afternoon" / "Good evening")
- Daily literary quote from array of 66 quotes (rotated by day-of-year)
- Daily gardening fact from array of 64 facts (rotated with offset)
- "Start exploring" button dismisses to Capture tab
- Bottom nav visible during welcome so users can skip to any tab
- Uses `env(safe-area-inset-top)` for iPhone status bar padding

### Capture & Identification
- Take photo via device camera (`capture="environment"`)
- Upload from gallery
- Canvas preview with max 900px dimension
- Remove image button
- Species identification via Claude Sonnet edge function:
  - Uploads temp image (0.5 quality) to Supabase Storage
  - Sends image URL to `identify-species` edge function
  - Claude analyzes image with Tampa Bay botanist/entomologist prompt
  - Returns top 3 matches with: common name, scientific name, type (plant/bug), category, confidence score, native status, bloom/active seasons, care tip, description
- ID result cards: 3 selectable cards with confidence badges (high/mid/low color-coded), native badge, category tag, bloom season tag
- First card auto-selected
- Notes textarea before saving
- Save to garden with final image upload (0.82 quality)

### Manual Entry
- Modal with fields: common name (required), scientific name, type (plant/bug), category, blooming season (multi-select checkboxes), notes
- Auto-matches against 16-species native plant database for name correction and native status
- Saves to inventory with `source: 'Manual'`
- If a photo is loaded in the capture preview canvas, it is uploaded and saved with the entry (same upload path as identified entries)

### Garden Inventory
- 2-column card grid (1-column below 360px)
- Each card shows: image or emoji placeholder, common name, scientific name, tags (native badge, plant tags, bloom season, location, health status)
- Stats header: plant count, insect count, native count
- **Collapsible search**: Garden header shows a magnifying glass icon button instead of an always-visible search bar. Tapping the icon expands a full-width frosted search overlay. Dismissed by tapping the icon again, tapping outside, or navigating away. Uses CSS opacity/pointer-events transition.
- Live search across: common name, scientific name, category, notes, tags, location

### Filtering
- Type filters: All, Plants, Insects, Natives, Blooming Now (checks current season)
- Tag filter: dropdown showing all tags in use, multi-select (AND logic — item must have all selected tags)
- Location filter: dropdown showing all locations in use, single-select
- Filters are combinable

### Sorting
- Newest first (default, from DB)
- Oldest first
- Name A-Z
- Name Z-A
- Location

### Item Detail Modal
- Bottom sheet with slide-up animation
- Image or placeholder
- Name, scientific name, native badge
- Status badges (health, flowering, height)
- Detail rows: type/category, location, found on (for bugs), date added, ID confidence, bloom/active season, care tip, source
- Notes display
- **Tag Editor**: preset tag chips (Grass, Vine, Shrub, Wildflower, Tree, Palm, Cycad, Fern, Herb) as toggleable chips + custom tag input with add button. Tags persist to DB immediately on toggle.
- **Bug-Plant Linking** (bugs only): expandable "Found On" section with dropdown listing all plants in inventory + "Ground" option. Saves linked_plant_id.
- **Plant Status** (plants only): expandable section with health dropdown (thriving/healthy/stressed/sick/dormant/new), flowering dropdown (yes/budding/no/fruiting), height text input, location zone chips (Front/Back/Side/Pot), habitat chips (Hammock/Sandhill), features/observations textarea. All persisted on Save.
- **Linked Bugs** (plants only): shows insects whose `linked_plant_id` matches this plant. Each bug is tappable to open its detail.
- **Care Profile** (plants only): expandable section showing structured care data — watering (frequency + notes), sun, soil, fertilizing (schedule + type), pruning (timing + method), mature size (height + spread), pests/diseases, companion plants. "Refresh care info" button regenerates via Claude Haiku.
- Delete entry (with confirmation, also deletes image from storage)

### Care Profile Generation
- Automatically generated in background when a plant is saved (both from identification and manual entry)
- Calls `garden-assistant` edge function with plant details
- Claude Haiku generates Tampa Bay-specific care data
- Stored as JSONB in `care_profile` column
- "Generate care profile" button if none exists
- "Refresh care info" button to regenerate
- Shows loading spinner during generation

### Seasonal Care Reminders
- Collapsible "This Month in Your Garden" section at top of Garden tab (between stats header and search bar)
- AI-generated via Claude Haiku: 3-5 monthly care tasks personalized to the user's plant inventory
- Called via `garden-assistant` edge function with `action: "reminders"`, passing current month + plant list
- Stored in Supabase `reminders` table (syncs across devices)
- **Check off**: Each reminder has a checkbox. Checked items get strikethrough + muted style and sort to the bottom. State persists in DB.
- **Add custom**: Inline input with "+" button to add user-created reminders (stored with `source: 'custom'`)
- **Delete custom**: Custom reminders can be removed; AI-generated ones can only be checked off
- **Staleness detection**: Reminders regenerate when the month changes or when the plant inventory changes (tracked via `plant_hash` column)
- **Collapsible**: Header toggles section open/closed with chevron rotation
- Hidden when inventory has no plants
- HTML escaping via `escapeHtml()` prevents XSS in reminder content

### Plant Health Tracking
- **Plant Health Tracking** -- Quick-log health checks from pulse icon on plant cards. Bottom sheet with health/flowering status pills, optional photo. Health history timeline in detail modal with pagination. AI-powered diagnosis via Claude Sonnet for stressed/sick plants with photos. Data stored in `health_logs` table.

### Network Resilience & Offline Browsing
- **resilientFetch**: All edge function calls use `resilientFetch()` wrapper with configurable retries (default 2), exponential backoff (1s, 2s, 4s), and AbortController timeout (default 15s, 30s for identification)
- **Connection toast**: Fixed bar at top of screen shows "You're offline — browsing cached data" (terracotta) when offline, "Back online" (green, auto-dismisses 2s) when reconnected. `aria-live="polite"` for accessibility.
- **Offline guards**: Write operations (identify species, save to garden, health diagnosis) check `isOnline()` and show friendly messages when offline. Read operations work from cache.
- **FAB offline state**: Capture button dims to 50% opacity and becomes non-interactive when offline (via CSS class, not inline styles)
- **Inventory caching**: `loadInventory()` saves to localStorage. On next load, renders from cache immediately, then refreshes from Supabase in background. 24-hour max age. Invalidated on writes.
- **Image caching**: Service worker intercepts Supabase Storage image requests with stale-while-revalidate strategy. Cached images served instantly, background refresh when online. Temp images excluded.
- **Batch DOM rendering**: `renderInventory()` and `renderTimeline()` use DocumentFragment to batch all DOM insertions into a single append
- **Filter-by-hiding**: Garden grid cards have `data-type`, `data-native`, `data-tags`, `data-location` attributes. `applyFilters()` toggles `.filter-hidden` CSS class instead of rebuilding DOM. Sort still triggers full re-render.
- **Lazy hero image**: Detail modal hero image uses `loading="lazy"` (grid cards already had this)

### Timeline
- Seasonal view: Spring, Summer, Fall, Winter
- Lists blooming plants (🌸) and active insects (🦋) per season
- Includes "Year-round" items in all seasons
- Empty state per season: "Nothing logged yet for this season."

### Data Export
- Export as JSON (structured with version, date, entries array)
- Export as CSV (common, scientific, type, category, date, confidence, bloom, season, native, notes, image URL)
- Both trigger browser download

### Settings
- Shows user email
- Species identification info (no API key needed)
- Export JSON/CSV buttons
- Browse native plant database (modal showing 16 species with name, scientific name, type, bloom seasons)
- Clear all garden data (with confirmation)
- Sign out

### Native Plant Database
- 16 Florida native species hardcoded in `app.js`: Coontie, Beautyberry, Firebush, Wild Coffee, Simpson's Stopper, Blanket Flower, Beach Sunflower, Coral Honeysuckle, Passion Vine, Muhly Grass, Saw Palmetto, Cabbage Palm, Southern Magnolia, Live Oak, Bald Cypress, Walter's Viburnum
- Each has: common name, scientific name, aliases array, bloom seasons, type
- Used for cross-referencing during identification and manual entry
- Browsable from Settings

### Design System
- Typography scale: 7 steps (xs 12px → 3xl 30px), ratio ~1.125 major second
- Spacing scale: 8 steps based on 4px unit (space-1 4px → space-12 48px)
- Colors: green-deep (#1c3a2b), green-mid (#2d5a3d), green-sage (#7a9e7e), green-light (#c8dfc9), cream (#f5f0e8), cream-dark (#ece5d6), terra (#c4622d), terra-light (#e8a882), ink (#1a1a1a), ink-mid (#4a4a4a), ink-light (#9a9a9a)
- Fonts: Playfair Display (headings), system-ui stack / SF Pro on iPhone (body — DM Sans removed)
- Shadows: 3 levels (sm, md, lg)
- Border radius: 16px (default), 10px (small)
- 44px minimum touch targets on all interactive elements
- Active/pressed states on all buttons and cards (scale transforms)
- `user-select: none` on all interactive elements
- `-webkit-tap-highlight-color: transparent` global reset
- iOS safe area inset support on bottom nav and modal sheets. Bottom nav height uses `calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))` so buttons clear the iPhone home indicator. `html { background-color: #1c3a2b }` fills the overscroll rubber-band zone green.

---

## 4. External Dependencies

### CDN Libraries
| Library | URL | Version | Used For |
|---------|-----|---------|----------|
| Supabase JS SDK | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | v2 (latest) | Auth, database queries, storage uploads |

### Google Fonts
| Font | Weights | Used For |
|------|---------|----------|
| Playfair Display | 500, 700, italic 500 | Headings, screen titles, modal titles, card names, welcome quote |

DM Sans was removed. Body text now uses the system-ui font stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`) — renders as SF Pro on iPhone, which matches native iOS aesthetics and eliminates the Google Fonts network request for body text.

### External APIs (via Edge Functions)
| API | Model/Endpoint | Used For | Called From |
|-----|---------------|----------|------------|
| Anthropic Claude API | claude-sonnet-4-20250514 | Species identification from photos (plants + insects) | `identify-species` edge function |
| Anthropic Claude API | claude-haiku-4-5-20251001 | Care profile generation + seasonal reminders (Tampa Bay-specific) | `garden-assistant` edge function |

### Services
| Service | Used For |
|---------|----------|
| Supabase Auth | Email/password auth, magic link OTP, password reset |
| Supabase Postgres | `inventory` and `reminders` tables with RLS |
| Supabase Storage | `garden-images` bucket for plant/insect photos |
| Supabase Edge Functions | `identify-species`, `garden-assistant` (Deno runtime) |
| GitHub Pages | Static hosting (push to main = deploy) |

### Previously Used & Abandoned
| API | Reason Abandoned |
|-----|-----------------|
| Plant.id (Kindwise) v3 | Free tier too limited (100/day) |
| PlantNet | Compatibility issues with Supabase Edge Functions |
| `sb.functions.invoke()` | Persistent JWT/EarlyDrop errors; replaced with direct `fetch()` |

---

## 5. Known Bugs and Incomplete Features

### Bugs / Code Issues

1. **Duplicate CSS rules**: `.id-card`, `.id-card-name`, `.id-card-sci`, `.id-card-desc`, `.id-card-tags`, `.confidence-badge`, `.spinner-wrap`, `.spinner-label` are all defined twice in `style.css` — once around lines 539–606 and again at lines 1117–1216. The second definitions use slightly different values (e.g., different variable fallbacks like `var(--forest, #1c3a2b)` vs `var(--green-deep)`), which will override the first set. This likely happened during iterative development.

2. **`linked_plant_id` type mismatch**: The column is described as `uuid references inventory(id)` in PROJECT-CONTEXT.md, but the app also stores the string `'ground'` as a value (`app.js:1040`), which would violate a UUID foreign key constraint. Either the FK constraint was removed or this causes errors when saving "Ground" as the found-on location.

3. **Variable shadowing in `savePlantStatus`**: `const idx` is declared twice in the same function scope (`app.js:1215` and `app.js:1231`). The second `const idx` shadows the first. This works because they're in different block scopes (function body vs try block), but it's confusing.

4. **XSS via innerHTML**: Multiple places construct HTML from database data using string interpolation into `innerHTML` without escaping: item names, scientific names, descriptions, notes, tags (`app.js:491-516`, `app.js:802-808`, `app.js:850-865`). If a user enters HTML/script in notes or names, it could execute. Low risk since it's user-own data with RLS, but still a code quality issue.

5. **Temp images not cleaned up**: Temp images uploaded for identification (`temp_{timestamp}.jpg`) are never deleted from Supabase Storage after identification completes. They accumulate over time.

6. **`alert()` used everywhere for user feedback**: Error messages, success confirmations, and validation all use `alert()` (`app.js:429,542,551,595,625-626,873,941,946,995,1007`). LEARNING-PLAN.md Lesson 7 plans to replace these with a toast notification system, but that hasn't been implemented yet.

7. ~~**No offline handling**~~ **FIXED** — Connection toast, offline guards, localStorage inventory cache, service worker image cache.

8. **No loading state on Garden tab**: When inventory loads on auth, there's no skeleton or spinner — the grid is just empty until data arrives.

9. **Export CSV doesn't escape quotes**: If a note contains double quotes, the CSV output will be malformed (`app.js:924`).

10. ~~**No service worker**~~ **FIXED** — sw.js with dual-cache strategy (static + images), all JS modules in CORE_FILES for offline startup.

11. ~~**Auth screen flash on load**~~ **FIXED** — Synchronous inline `<script>` in `index.html` runs before Supabase CDN loads, reads session from localStorage, immediately shows correct screen. Auth screen starts at `opacity:0` and fades in via CSS transition for unauthenticated users.

12. ~~**iOS Collections photo selection does nothing**~~ **FIXED** — iOS Safari returns `file.type` as `""` when selecting photos from the Collections/Albums view. The `file.type.startsWith('image/')` guard was silently bailing out. Fixed in `capture.js:handlePhoto` to only reject files with a non-empty type that isn't an image.

### Incomplete / Not Yet Built Features

From CLAUDE-CODE-PROMPT.md roadmap:

| Feature | Status | Notes |
|---------|--------|-------|
| Plant Care Dashboard | **Done** | Care profiles generate and display in item detail modal |
| Planting Guide / Recommendations | **Not started** | New tab with seasonal recommendations |
| Visual Garden Map | **Not started** | Canvas-based garden layout with drag-and-drop |
| Seasonal Care Reminders | **Done** | Collapsible checklist at top of Garden tab, AI-generated + user-custom, synced via Supabase `reminders` table |
| Plant Health Tracking (history) | **Partially done** | Current health status saves, but no health *history* log table or timeline. The `health_logs` table from the spec was never created. |

From LEARNING-PLAN.md:

| Lesson | Status |
|--------|--------|
| 1. Typography Scale | **Done** — CSS custom properties for type and spacing scales |
| 2. Touch Targets | **Done** — 44px min targets, active states, user-select:none |
| 3. Skeleton Screens | **Not started** |
| 4. Smooth Transitions | **Partially done** — screen fade-in, modal slide-up exist; no card stagger, no filter transitions |
| 5. Empty States | **Partially done** — basic empty states exist but lack personality/illustrations |
| 6. Image Optimization | **Not started** — no thumbnails, no blur-up loading, no `thumbnail_url` column |
| 7. Error Handling | **Partially done** — resilientFetch with retries/timeouts, friendly error messages, connection toast, offline guards. Still using alert() for some messages (no toast system yet). |
| 8. Gesture Support | **Partially done** — overscroll elastic title (scroll listener scales `.screen-title` when `scrollY < 0`, respects `prefers-reduced-motion`). No swipe-to-delete or pull-to-refresh yet. |
| 9. Accessibility | **Not started** — no ARIA labels, no focus management, no focus trapping in modals, no screen reader announcements |
| 10. Performance | **Partially done** — DocumentFragment batch rendering, filter-by-hiding, lazy loading on detail hero image. No Lighthouse audit yet. |

### Other Missing Pieces

- **No data validation on server**: Edge functions don't validate input structure
- **`found_on_plant_id` column naming**: Code uses `linked_plant_id` in the client (`app.js:821,1034,1078,1084`), but PROJECT-CONTEXT.md spec calls it `found_on_plant_id`. The actual DB column name is unclear — likely `linked_plant_id` since that's what the working code uses.

---

## 6. React App (Firebush Branch)

A React/TypeScript rewrite lives on the `firebush` branch under `react-app/`. Deployed to Vercel (separate from the vanilla app on GitHub Pages). Both apps share the same Supabase database.

### Additional Supabase Tables (React app only)

| Table | Purpose |
|-------|---------|
| `garden_maps` | Garden map metadata (aerial photo, dimensions) |
| `garden_beds` | Garden zones with shapes, sun/soil/moisture properties |
| `garden_placements` | Plant placement coordinates on the map (unique per map+plant) |
| `wishlist` | Plants the user wants to add to their garden |

All have RLS enabled (users own their rows). SQL in `docs/firebush-deployment-guide.md`.

### React App Stack
- React + TypeScript + Vite (in `react-app/`)
- shadcn/ui components + Tailwind CSS
- Konva (react-konva) for garden map canvas
- Vercel API routes (instead of Supabase Edge Functions)
- Vercel deployment from `firebush` branch

### Known Issues Fixed
- **Map plant placement**: The PlantPalette Sheet overlay intercepted canvas taps. Fixed by auto-closing the palette when a plant is selected, keeping placement mode active. `useGardenMap.placeItem()` now returns structured `{ placement, error }` with real error messages instead of silently returning null.

---

## 7. Deployment Setup

| Component | Platform | Method |
|-----------|----------|--------|
| Frontend (HTML/CSS/JS) | GitHub Pages | Auto-deploy on `git push` to `main` branch |
| Edge Functions | Supabase | `supabase functions deploy <name>` or paste in dashboard |
| Database Migrations | Supabase | Run SQL directly in Supabase SQL Editor |
| Repository | GitHub | `https://github.com/pjagator/Mamas-Garden-App` |
| Live URL | GitHub Pages | `https://pjagator.github.io/Mamas-Garden-App/` |

### Cache Busting
- CSS and JS files in `index.html` use `?v=N` query strings — manually incremented on deploys (currently `?v=20`)

### No Build Step
- No bundler, no transpilation, no minification
- Raw vanilla JS/HTML/CSS served directly
- Supabase JS SDK loaded from CDN at runtime
