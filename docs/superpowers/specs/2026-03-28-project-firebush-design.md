# Project Firebush — React Rebuild Design Spec

**Date**: 2026-03-28
**Status**: Approved
**Branch**: `firebush` (Vercel deploys from here; `main` stays vanilla app)

---

## Overview

A ground-up rebuild of the Tampa Bay Garden Tracker in React, living in a `/react-app` subfolder. Mirrors all existing features, adds two new ones (Garden Map and Friends of the Garden wishlist), and elevates the UI with thoughtful micro-interactions and polish. The existing vanilla JS app remains completely untouched until deliberate cutover.

### Goals

1. **Learn React** — first React project, built with time and care
2. **Richer features** — Garden Map with aerial photo + zones + plant placement; wishlist for plants spotted elsewhere
3. **Elevated UX** — same botanical journal soul, noticeably more enjoyable (animations, toasts, skeleton loading, blur-up images, seasonal awareness)
4. **Unified deployment** — `git push` deploys everything (frontend + API routes) via Vercel

### Users

- **Primary**: Wife (English teacher, iPhone user, not technical)
- **Secondary**: The developer (maintains code, occasionally logs plants)
- No public users, no onboarding for strangers

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 + Vite + TypeScript | SPA with fast builds, type safety |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility CSS + themed component library |
| Routing | React Router v7 | Client-side page navigation |
| Database | Supabase Postgres (existing project) | Same tables + new ones, RLS |
| Auth | Supabase Auth (existing) | Same accounts, same sessions |
| Storage | Supabase Storage (existing) | Same `garden-images` bucket |
| AI API routes | Vercel Serverless Functions | Replace Supabase Edge Functions |
| Garden Map | react-konva (Konva.js) | Canvas layers, zoom/pan, drag/drop |
| PWA | vite-plugin-pwa | Service worker, manifest, offline |
| Deployment | Vercel | Auto-deploy from `firebush` branch |

### Backend Split

- **Supabase stays for**: Postgres DB, Auth, Storage
- **Vercel replaces Edge Functions for**: All Claude API calls (species ID, care profiles, reminders, diagnosis, placement suggestions)
- **Existing Supabase Edge Functions**: Untouched. Vanilla app keeps using them.

### Environment Variables (`.env.local`, not committed)

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `ANTHROPIC_API_KEY` — Server-side only (Vercel env), never exposed to client

---

## Project Structure

```
react-app/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json              # shadcn/ui config
├── vercel.json
├── .env.local                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── api/
│   ├── identify-species.ts      # Vercel serverless: species ID via Claude Sonnet
│   └── garden-assistant.ts      # Vercel serverless: care, reminders, diagnosis, placement
├── public/
│   └── fonts/                   # Playfair Display (self-hosted for offline PWA)
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Router + layout
│   ├── index.css                # Tailwind imports + custom botanical theme
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   ├── utils.ts             # shadcn cn() utility
│   │   ├── api.ts               # resilientFetch (retries, backoff, timeout)
│   │   └── constants.ts         # Native plants DB, preset tags, locations, quotes, facts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useInventory.ts      # CRUD + localStorage cache
│   │   ├── useReminders.ts
│   │   ├── useHealthLogs.ts
│   │   ├── useGardenMap.ts      # Map, beds, placements CRUD
│   │   └── useWishlist.ts
│   ├── types/
│   │   └── index.ts             # TypeScript types for all DB tables
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx    # Mobile: 4 tabs + FAB
│   │   │   ├── Sidebar.tsx      # Desktop: sidebar nav
│   │   │   ├── ScreenHeader.tsx
│   │   │   └── AppShell.tsx     # Auth gate + responsive layout
│   │   ├── garden/
│   │   │   ├── PlantCard.tsx
│   │   │   ├── ItemDetail.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── capture/
│   │   │   ├── PhotoCapture.tsx
│   │   │   ├── IdResult.tsx
│   │   │   └── ManualEntry.tsx
│   │   ├── map/
│   │   │   ├── GardenCanvas.tsx
│   │   │   ├── MapToolbar.tsx
│   │   │   ├── BedEditor.tsx
│   │   │   ├── PlantMarker.tsx
│   │   │   ├── PlantPalette.tsx
│   │   │   ├── BedDetailSheet.tsx
│   │   │   └── ZoneLegend.tsx
│   │   ├── wishlist/
│   │   │   ├── WishlistCard.tsx
│   │   │   ├── WishlistDetail.tsx
│   │   │   └── WishlistCapture.tsx
│   │   ├── health/
│   │   │   ├── HealthLogForm.tsx
│   │   │   └── HealthTimeline.tsx
│   │   └── reminders/
│   │       └── ReminderList.tsx
│   └── pages/
│       ├── Auth.tsx
│       ├── Garden.tsx
│       ├── Timeline.tsx
│       ├── Map.tsx
│       ├── Wishlist.tsx
│       ├── Capture.tsx          # Modal/sheet, not a routed page
│       └── Settings.tsx
```

---

## Database Schema

### Existing Tables (unchanged)

The React app reads/writes the exact same columns. No modifications to `inventory`, `reminders`, or `health_logs`.

### New Tables

#### `garden_maps`

One map per user (expandable to multiple later).

```sql
CREATE TABLE garden_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text DEFAULT 'My Garden',
  image_url text,              -- Aerial screenshot in Supabase Storage
  width numeric,               -- Image natural width
  height numeric,              -- Image natural height
  created_at timestamptz DEFAULT now()
);
ALTER TABLE garden_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their maps" ON garden_maps FOR ALL USING (auth.uid() = user_id);
```

#### `garden_beds`

Zones drawn on the map, each with microclimate data.

```sql
CREATE TABLE garden_beds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  map_id uuid REFERENCES garden_maps(id) ON DELETE CASCADE NOT NULL,
  name text,
  shape jsonb NOT NULL,           -- {type: "rect", x, y, width, height}
  sun_exposure text,              -- full_sun, partial_sun, partial_shade, full_shade
  soil_type text,                 -- sandy, loamy, clay, well_drained, moist
  moisture_level text,            -- dry, moderate, wet
  wind_exposure text,             -- sheltered, moderate, exposed
  zone_type text,                 -- bed, border, container, lawn, path, water_feature
  color text DEFAULT '#7a9e7e',   -- Bed overlay color
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE garden_beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their beds" ON garden_beds FOR ALL USING (auth.uid() = user_id);
```

#### `garden_placements`

Links inventory items to positions on the map. Does NOT modify the `inventory` table.

```sql
CREATE TABLE garden_placements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  map_id uuid REFERENCES garden_maps(id) ON DELETE CASCADE NOT NULL,
  inventory_id uuid REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  bed_id uuid REFERENCES garden_beds(id) ON DELETE SET NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  placed_at timestamptz DEFAULT now(),
  UNIQUE (map_id, inventory_id)    -- Each plant can only be placed once per map
);
ALTER TABLE garden_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their placements" ON garden_placements FOR ALL USING (auth.uid() = user_id);
```

#### `wishlist`

Friends of the Garden — plants spotted elsewhere.

```sql
CREATE TABLE wishlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  common text,
  scientific text,
  type text DEFAULT 'plant',
  category text,
  confidence integer,             -- 0-100 ID confidence from AI
  description text,
  image_url text,                -- Photo from where they spotted it
  spotted_at text,               -- "Leu Gardens", "Garden center", etc.
  notes text DEFAULT '',
  is_native boolean DEFAULT false,
  bloom text[],                  -- Blooming seasons (carried over on graduation to inventory)
  season text[],                 -- Active seasons for insects
  care_profile jsonb,            -- AI-generated care data
  suggested_zones text[],        -- Which bed types suit this plant
  sun_needs text,
  soil_needs text,
  moisture_needs text,
  source text,                   -- 'Claude AI' or 'Manual'
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their wishlist" ON wishlist FOR ALL USING (auth.uid() = user_id);
```

### Key Design Choice

The map does not modify `inventory`. The relationship between a plant and its map position lives entirely in `garden_placements`. The vanilla app's reads/writes to `inventory` are completely unaffected.

---

## Vercel API Routes

Two serverless functions replace Supabase Edge Functions for the React app.

### `api/identify-species.ts`

- Accepts: `{ imageUrl: string }`
- Fetches image from Supabase Storage URL, converts to base64
- Sends to Claude Sonnet (`claude-sonnet-4-20250514`) with Tampa Bay botanist/entomologist prompt
- Returns: top 3 species matches with confidence scores
- Includes `fetchWithRetry` for Claude API 529 (overloaded) errors
- `ANTHROPIC_API_KEY` from Vercel env vars (server-side only)

### `api/garden-assistant.ts`

Multi-action pattern:

| Action | Model | Input | Output |
|--------|-------|-------|--------|
| `care_profile` | Claude Haiku | Plant data | Structured care JSON |
| `reminders` | Claude Haiku | Month + plant list | 3-5 monthly care tasks |
| `diagnosis` | Claude Sonnet | Plant data + health photo | Cause, severity, action, details |
| `suggest_placement` (NEW) | Claude Haiku | Plant species + user's garden zones with microclimate data | Ranked zone suggestions with conversational reasoning |

### Auth on API Routes

Each route reads the Supabase access token from the `Authorization` header and verifies it server-side to get the user ID. More secure than the vanilla app's "JWT disabled, anon key only" approach.

### Client-Side Calls

`lib/api.ts` uses `resilientFetch` (retries, exponential backoff, AbortController timeout) pointed at `/api/identify-species` and `/api/garden-assistant` (relative paths — Vercel handles routing).

---

## Navigation & Pages

### Bottom Nav (mobile < 768px)

| Position | Icon | Page |
|----------|------|------|
| Left 1 | Leaf | Garden (inventory grid) |
| Left 2 | Compass | Map (garden canvas) |
| Center | **FAB** (camera) | Capture modal |
| Right 1 | Heart | Wishlist (Friends of the Garden) |
| Right 2 | Calendar | Timeline (seasonal view) |

### Sidebar Nav (desktop >= 768px)

Same items, vertical layout with labels.

### Routes

```
/           → Garden (default)
/map        → Garden Map
/wishlist   → Friends of the Garden
/timeline   → Seasonal Timeline
```

- **Capture** is a modal (FAB trigger), not a routed page
- **Settings** is a sheet modal (gear icon in garden header), not a tab
- **Auth** renders when no session — gate in `AppShell.tsx`, no route needed
- **Welcome screen** conditional (1+ hour absence), dismisses to Garden

---

## Garden Map Feature

### Canvas Architecture (react-konva)

Four layers on the Konva Stage:

1. **Background**: Aerial screenshot, faded to ~15-20% opacity with warm cream tint. "Show satellite" toggle restores full clarity for reference.
2. **Zones**: Semi-transparent colored overlays (rectangles initially, polygons later). Color-coded by sun exposure or zone type.
3. **Plant markers**: Circles with thumbnails/initials, bordered by health status color.
4. **Labels**: Plant names and bed names, togglable on/off.

### Zoom-Adaptive Display

| Zoom Level | Display |
|------------|---------|
| Zoomed out (full garden) | Zone overlays + plant count badges ("Front Bed: 12 plants"). Individual markers hidden or collapsed into cluster dots. |
| Mid zoom | Zone overlays + individual markers as small health-colored dots. Names hidden. |
| Zoomed in (bed level) | Full markers with thumbnails/initials, names visible, health borders. Placement and arrangement zone. |

Transitions are smooth — markers fade/scale with zoom level changes.

### First-Time Setup

1. User taps Map tab → "Upload your garden" prompt (inviting, not setup-step feeling)
2. Upload aerial screenshot → saved to Supabase Storage
3. Image renders as canvas background (styled: faded + warm tint)
4. Draw rectangular zones → name them, set microclimate properties

### PlantPalette Side Drawer

Swipe-out drawer from right edge (or toolbar button):

- Scrollable inventory list with thumbnails, names, health badges
- Sections: "Not Yet Placed" (top) and "Already Placed" (with checkmarks)
- Search/filter within the drawer
- **Tap-to-place** (primary): Tap plant in drawer to select → tap on map to place. Reliable on mobile, avoids scroll-vs-drag conflicts.
- Drag-and-drop for repositioning markers already on the map
- Drawer stays open for placing multiple plants in sequence

### Placement Warnings

Soft orange outline on markers when a plant's needs conflict with the zone's microclimate (e.g., shade plant in full-sun zone). Non-blocking — user can place anyway.

### Map Toolbar (bottom of map, above nav)

- Add Zone (draw mode — rectangle)
- Place Plant (opens side drawer)
- Edit (select zones/plants for moving/editing)
- Fit View (zoom to fit entire garden)
- Legend (toggle microclimate color key)
- Settings (upload new background, rename map)

### Zone Microclimate Settings (BedDetailSheet)

Each zone has:
- Sun exposure: Full Sun / Partial Sun / Partial Shade / Full Shade
- Soil type: Sandy / Loamy / Clay / Well-drained / Moist
- Moisture level: Dry / Moderate / Wet
- Wind exposure: Sheltered / Moderate / Exposed
- Zone type: Bed / Border / Container / Lawn / Path / Water Feature

Used for: color-coding zones, filtering inventory by microclimate match, wishlist placement suggestions, placement warnings.

---

## Friends of the Garden (Wishlist)

### Concept

Plants spotted outside the garden that the user admires. "Friends your garden hasn't met yet." Aspirational, dreamy visual treatment — distinct from the main inventory.

### Visual Treatment

- Cards: softer look — slightly desaturated, dashed/dotted border, subtle watercolor wash background
- Page header: literary language, italic Playfair Display
- Distinct from inventory's confident "this is in my garden" feel

### Capture Flow

1. Tap FAB → same photo capture / species ID flow
2. After ID results: **"Add to Garden"** and **"Save as Friend"** buttons
3. "Save as Friend" prompts for: **"Where did you spot this?"** — free text with suggested chips (Leu Gardens, Garden center, Neighbor's yard, Botanical garden, Hiking trail)
4. Saved to `wishlist` table

### AI Placement Suggestion

- After saving, calls `garden-assistant` with `"suggest_placement"` action
- Input: plant species data + user's garden zones with microclimate data
- Output: ranked zone suggestions with conversational reasoning
- Displayed as a card in wishlist detail:
  > *"This Coontie would love your Side Border — partial shade with sandy soil is exactly what this cycad wants. Avoid the Front Bed; too much afternoon sun."*
- If no garden map exists: generic care advice instead

### "Add to Garden" (Graduation) Flow

1. Tap "Add to Garden" on wishlist card
2. Plant data copies to `inventory` table
3. If garden map exists → prompt to place on map, pre-highlighting suggested zone
4. Wishlist entry deleted (graduated to the garden)

### Wishlist Detail View

- "Where spotted" instead of "Date added"
- AI zone suggestion card (prominent)
- "Add to Garden" button (primary action)
- No tags/location/health — those belong to plants in the garden

---

## Enhanced Filters

Existing filters (kept): Type (All / Plants / Insects / Natives / Blooming Now), Tag, Location, Sort.

New filters (added in Phase 5):
- **Zone**: Filter by garden bed name ("Front Bed", "Side Border", "Not Placed")
- **Microclimate**: Filter by sun exposure, soil type
- **Placement**: "Mapped" vs "Unmapped"
- **Health**: Filter by health status

### Filter UI

- Horizontal scrollable chip bar (primary filters)
- Expandable filter sheet (tap filter icon → bottom sheet with all filters)
- Active filters shown as dismissible chips below search bar
- Filter counts on each chip ("Shade (4)", "Front Bed (7)")

### Cross-Linking

- Item detail shows which zone the plant is in (tappable → jumps to map)
- Map view: tapping a zone shows the zone's inventory with microclimate match scores

---

## Theme & Design System

### Tailwind Theme Tokens

| Token | Value | Usage |
|-------|-------|-------|
| primary | `hsl(153, 35%, 17%)` / #1c3a2b | Headers, nav, primary buttons |
| primary-mid | #2d5a3d | Hover states, secondary actions |
| sage | #7a9e7e | Zone overlays, secondary elements |
| sage-light | #c8dfc9 | Subtle backgrounds, disabled states |
| cream | #f5f0e8 | Page backgrounds, card backgrounds |
| cream-dark | #ece5d6 | Borders, dividers |
| terra | #c4622d | Accent, destructive actions, warnings |
| terra-light | #e8a882 | Soft accent backgrounds |
| ink | #1a1a1a | Primary text |
| ink-mid | #4a4a4a | Secondary text |
| ink-light | #9a9a9a | Placeholder, muted text |

### Typography

- **Headings**: Playfair Display (500, 700, italic 500) — self-hosted in `public/fonts/` for offline PWA
- **Body**: system-ui stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`)
- **Scale**: major-second ratio (0.75rem → 1.875rem)
- Generous line heights on body text, optical letter-spacing on Playfair at larger sizes
- Italic Playfair for quotes, plant descriptions, wishlist's aspirational tone

### shadcn/ui Customization

- `--radius`: 14px (matching existing cards)
- Color slots mapped to botanical palette
- Shadows: soft, organic (3-tier: sm/md/lg)
- All buttons get pressed-state scale transforms

### Elevated UX Details

**Micro-interactions**:
- Card stagger animations (cascade fade+rise on load)
- Skeleton screens (content-shaped pulsing placeholders)
- Smooth filter transitions (cards shrink/fade when filtered out, grid reflows with animation)
- Pull-to-refresh with botanical-themed indicator
- Haptic-feeling scale bounces on toggle actions
- Image blur-up loading (tiny placeholder → sharp image)
- Sheet drag handles with momentum-based dismiss
- Toast notifications (replace all `alert()` — contextual icons, auto-dismiss)

**Empty states with personality**:
- First garden: *"Every garden begins with a single planting"*
- Empty wishlist: *"You haven't met any new friends yet. Take a walk and see who catches your eye."*
- Empty map: inviting upload prompt, not a setup step

**Seasonal awareness**:
- Subtle background color shift by season (warmer cream in summer, cooler in winter)
- Welcome screen references actual season
- Literary botanical voice throughout

**Detail view upgrade**:
- Hero image with soft gradient fade into content
- Care profile sections with botanical SVG iconography (sun, water drop, etc.)
- Health timeline as visual timeline with colored nodes

### Motion & Accessibility

- Organic cubic-bezier easing
- `prefers-reduced-motion` respected — all animations disabled
- 44px minimum touch targets
- Active/pressed scale transforms on interactive elements
- `viewport-fit=cover` + safe-area insets (top on headers, bottom on nav)
- `html` background `#1c3a2b` for rubber-band overscroll

---

## PWA & Offline

### PWA Setup (vite-plugin-pwa)

- Manifest: "Tampa Garden", standalone display, theme `#1c3a2b`, background `#f5f0e8`
- Proper app icons (192px + 512px) — botanical leaf/plant icon
- Apple meta tags: `apple-mobile-web-app-capable`, status bar style, splash screens
- `viewport-fit=cover` for iPhone status bar bleed

### Service Worker

- **App shell**: Precached (JS/CSS/fonts/icons). Prompt-on-update for new versions.
- **Images**: Runtime cache, stale-while-revalidate, FIFO eviction
- **API routes**: Network-only (never cache AI responses)

### Offline Behavior

- Inventory cached in localStorage, cache-first render
- Read operations work offline from cache
- Write operations check connection, show toast when offline
- FAB dims when offline
- Connection toast for online/offline transitions
- Map data cached in localStorage for offline viewing

---

## Deployment & Branch Strategy

### Branch Strategy

- **`main`**: Vanilla app. Sacred. GitHub Pages auto-deploys. Untouched until cutover.
- **`firebush`**: React app. Vercel auto-deploys from this branch. Root directory set to `react-app/`.
- Periodically merge `main` → `firebush` to pick up doc changes.

### Vercel Configuration

- Root directory: `react-app/`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
- Domain: `project-name.vercel.app` (custom domain later)

---

## Data Migration & Cutover

### During Development (both apps live)

- Both apps read/write same `inventory`, `reminders`, `health_logs`
- New tables only queried by React app
- Wife uses vanilla app daily; developer tests on React app
- Any data changes in either app are immediately visible in the other (same DB)

### Cutover Day

1. Merge `firebush` → `main`
2. Update wife's home screen bookmark to Vercel URL (new PWA install)
3. Decommission Supabase Edge Functions (no rush)
4. Clean up old vanilla files from repo (optional)

### Rollback Safety

Vanilla app remains functional at GitHub Pages URL indefinitely. If React app has issues post-cutover, switch back to old bookmark.

---

## Implementation Phases

### Phase 1: Scaffold + Theme

- Vite + React + TypeScript project in `/react-app`
- Tailwind v4 with full botanical theme
- shadcn/ui installed and themed
- Supabase client, resilientFetch utility, constants, TypeScript types
- React Router with placeholder pages
- AppShell (responsive: bottom nav mobile, sidebar desktop)
- **Milestone**: Themed shell with navigation runs locally

### Phase 2: Auth + Welcome

- `useAuth` hook (sign in/up/out, OTP, password reset, session persistence)
- Auth page with botanical styling
- Auth gate in AppShell
- Welcome screen (conditional, literary quotes, seasonal greeting)
- Toast notification system
- **Milestone**: Log in with existing account, see welcome screen

### Phase 3: Garden Inventory

- `useInventory` hook (CRUD, localStorage cache, cache-first render)
- Garden page (card grid with stagger animations, skeleton loading, blur-up images)
- Collapsible search overlay
- Filter bar (type, tag, location, health)
- Sort options
- Item detail sheet (hero gradient, SVG icons, care profile, tags, health, linked bugs)
- Seasonal reminders (`useReminders` hook, checklist, check-off, add custom)
- **Milestone**: Browse existing inventory, feels noticeably better than vanilla app

### Phase 4: Capture + Health

- Capture modal (camera/gallery, canvas preview, compression)
- Image upload to Supabase Storage
- Species ID via Vercel API route
- ID result cards (top 3, confidence badges)
- Save flow ("Add to Garden" vs "Save as Friend" fork)
- Manual entry form
- Background care profile generation
- Health check form + visual history timeline + AI diagnosis
- `useHealthLogs` hook
- **Milestone**: Full capture-to-inventory through Vercel API routes

### Phase 5: Garden Map

- SQL migrations for `garden_maps`, `garden_beds`, `garden_placements`
- `useGardenMap` hook
- Map page with Konva Stage + aerial image (styled: faded + warm tint)
- Zone drawing, BedDetailSheet with microclimate settings
- PlantPalette side drawer (tap-to-place)
- Zoom-adaptive markers (clusters → dots → full thumbnails)
- Placement warnings, zone legend, tap popovers
- Pinch-to-zoom + pan, auto-save
- Zone/microclimate/placement filters added to Garden page
- Cross-linking (detail → map, map → inventory)
- **Milestone**: Draw zones, place plants, zoom around

### Phase 6: Friends of the Garden

- SQL migration for `wishlist`
- `useWishlist` hook
- Wishlist page (dreamy cards, aspirational tone)
- "Save as Friend" flow with "where spotted"
- AI placement suggestion (`suggest_placement` action)
- Wishlist detail with zone suggestion card
- "Add to Garden" graduation flow
- **Milestone**: Full wishlist lifecycle

### Phase 7: Timeline + Settings + Polish + PWA

- Timeline page, Settings sheet
- Offline handling (connection toast, cached reads, disabled writes, FAB dim)
- PWA setup (manifest, icons, service worker, apple meta tags)
- Responsive polish (desktop sidebar, mobile safe-area insets, 44px targets)
- Empty states with personality
- Seasonal background tint, pull-to-refresh
- `npm run build` verification
- **Milestone**: Production-ready, installable PWA on Vercel
