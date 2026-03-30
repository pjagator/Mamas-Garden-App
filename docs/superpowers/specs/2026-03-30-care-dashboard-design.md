# Care Dashboard, Weather, and Logo — Design Spec

**Date**: 2026-03-30
**Branch**: firebush (React app)

---

## Overview

Redesign how care information is presented. The current care profile section in the plant detail sheet is intrusive — it dominates the scroll even when collapsed. This spec moves care into its own garden-wide dashboard with seasonal intelligence, adds rainfall data, and introduces a proper logo.

### Changes

1. Slim down the plant detail sheet (remove full care section, add quick-reference badges)
2. Add a Care dashboard to the Garden page via a "Plants" | "Care" segmented toggle
3. Monthly batch AI call for seasonal, per-plant care tips
4. Weather card with 7-day rain forecast and monthly rainfall total (Open-Meteo)
5. SVG firebush logo for PWA icons, favicon, welcome, and auth screens

---

## 1. Plant Detail Sheet — Slimmed Down

### Current state
The `ItemDetail.tsx` sheet contains a collapsible "Tampa Bay Care Guide" section with 8 info rows (watering, sun, soil, fertilizing, pruning, mature size, pests, companions). Even collapsed, it adds visual weight with its header and separator.

### New state
- **Remove** the full `CareSection` component from ItemDetail
- **Add** two small inline badges after the existing info rows (Type, Location, Added, Source):
  - Sun badge: e.g., `Full sun` with Sun icon
  - Water badge: e.g., `Weekly` with Droplets icon
- Pulled from `item.care_profile.sun` and `item.care_profile.watering.frequency`
- Rendered as `Badge variant="secondary"` in a subtle style, same row as bloom badges
- If `care_profile` is null, badges don't render (no change from current behavior)
- Health Timeline stays in the detail sheet

### Files changed
- `react-app/src/components/garden/ItemDetail.tsx`

---

## 2. Garden Page — Segmented Toggle

### Current state
The Garden page shows reminders at the top, then the FilterBar, then the plant grid.

### New state
- Add a segmented control below the ScreenHeader: **"Plants"** | **"Care"**
- **Plants view** (default): Current inventory grid with filters, search, sort. Reminders section is removed from here (it moves to the Care view).
- **Care view**: The new Care dashboard (see section 3).
- Toggle state is ephemeral (resets to "Plants" on navigation away).

### UI
- Segmented control: two buttons in a pill container, active tab gets `bg-primary text-white`, inactive gets `bg-white text-ink-mid border border-cream-dark`
- Sits below the header, above the content area
- Same width as the content area, horizontally centered

### Files changed
- `react-app/src/pages/Garden.tsx`

---

## 3. Care Dashboard

### Layout (top to bottom)

#### 3a. Weather Card
- **7-day rain forecast**: Row of 7 day columns (Mon, Tue, etc.)
  - Each column: day abbreviation, a Lucide-style raindrop line icon (custom SVG, matching the app's icon weight and style — not emoji), precipitation amount in inches
  - Raindrop icon opacity/fill scales with precipitation amount: dry days get a muted/empty icon, heavy rain days get a filled icon
  - If no rain expected for a day, show a subtle dash or empty state
- **Monthly rainfall**: Below the forecast row, a single line: "March rainfall: 2.4 in of 6.5 in average"
  - Small horizontal progress bar showing actual vs. average
  - Tampa Bay monthly averages hardcoded (data readily available, doesn't change)
- **Takeaway line**: Short contextual sentence, e.g., "Dry week ahead — water your beds" or "Rain coming Tuesday and Thursday — hold off on watering"
  - Generated client-side from the forecast data, not AI — simple threshold logic

#### 3b. Seasonal Summary
- 2-3 sentence paragraph about what's happening in Tampa Bay gardens this month
- Generated as part of the monthly batch AI call
- Rendered in a cream card with the botanical journal aesthetic
- Example: "March in Tampa Bay is prime planting season. Warm-season annuals can go in now, and established natives are pushing new growth. Watch for aphids on tender shoots."

#### 3c. Per-Plant Care Cards
- One card per plant in the inventory (sorted alphabetically or by zone)
- Each card shows:
  - **Left**: Plant thumbnail (40px circle) + common name + scientific name
  - **Right/Below**: 2-3 bullet-point seasonal action items specific to this plant and this month
  - **Expandable**: Tap to reveal the full static care reference (the 8-field care profile that was removed from the detail sheet). Collapsed by default.
- If a plant has no care_profile, show a muted "Care info not yet generated" with no action items
- Existing reminder tasks (from the `reminders` table) are shown as checkable items within the relevant plant's card. General reminders (not plant-specific) appear in their own card at the top.

#### 3d. Empty States
- No plants: "Add your first plant to get personalized care guidance"
- No seasonal data yet: "Tap refresh to generate this month's care tips" with a button

### Data source: Monthly batch AI call

**Trigger**:
- First time the Care tab is opened in a new month
- Manual refresh button
- When plant inventory changes (staleness detection, same pattern as current reminders)

**Dependency**: Weather data must be fetched first (Open-Meteo), then passed into the AI batch call so tips can reference the forecast. Sequence: fetch weather → call garden-assistant with weather context → store results.

**API call**:
- Endpoint: `/api/garden-assistant`
- Action: `"seasonal_care"`
- Payload: `{ month: "March", year: 2026, plants: [{ common, scientific, type, category, health, location }], weather: { forecast_summary, monthly_rain_so_far } }`
- Model: Claude Haiku (claude-haiku-4-5-20251001)
- Returns:
```json
{
  "garden_summary": "March in Tampa Bay is prime planting season...",
  "plant_tips": [
    {
      "common": "Firebush",
      "tips": [
        "New growth starting — fertilize with balanced slow-release",
        "Watch for lubber grasshopper nymphs on lower stems",
        "Full sun position is ideal for spring bloom flush"
      ]
    }
  ]
}
```

**Storage**:
- New column on `reminders` table: `seasonal_data jsonb` — or a new `seasonal_care` table:

```sql
CREATE TABLE seasonal_care (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key text NOT NULL,
  garden_summary text NOT NULL,
  plant_tips jsonb NOT NULL,
  plant_hash text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE seasonal_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their seasonal care" ON seasonal_care FOR ALL USING (auth.uid() = user_id);
```

- One row per user per month
- `plant_hash` for staleness detection (same pattern as reminders)
- `plant_tips` is the JSON array of per-plant tips

**Integration with existing reminders**: The current `reminders` table and `useReminders` hook stay as-is. The Care dashboard renders both: seasonal_care tips as informational cards, and reminders as checkable tasks. Over time, the reminders feature could be folded into the seasonal batch call, but that's a future optimization — not part of this spec.

### Files changed/created
- `react-app/src/components/garden/CareDashboard.tsx` (new)
- `react-app/src/components/garden/WeatherCard.tsx` (new)
- `react-app/src/components/garden/PlantCareCard.tsx` (new)
- `react-app/src/hooks/useSeasonalCare.ts` (new)
- `react-app/src/hooks/useWeather.ts` (new)
- `react-app/src/pages/Garden.tsx` (modified — add toggle, integrate dashboard)
- `react-app/api/garden-assistant.ts` (modified — add `seasonal_care` action)

---

## 4. Weather Data — Open-Meteo

### API
- **Forecast**: `https://api.open-meteo.com/v1/forecast?latitude=27.95&longitude=-82.46&daily=precipitation_sum&timezone=America/New_York&forecast_days=7`
- **Historical (monthly total)**: `https://archive-api.open-meteo.com/v1/archive?latitude=27.95&longitude=-82.46&start_date=2026-03-01&end_date=2026-03-30&daily=precipitation_sum&timezone=America/New_York`
- Coordinates: Tampa Bay (27.95, -82.46)
- No API key required

### Caching
- Fetch on Care tab open
- Cache in localStorage with 4-hour TTL
- Key: `garden-weather-cache`
- Structure: `{ forecast: [...], monthlyTotal: number, fetchedAt: timestamp }`

### Tampa Bay Monthly Averages (hardcoded)
```typescript
const TAMPA_MONTHLY_AVG_RAIN: Record<string, number> = {
  January: 2.3, February: 2.7, March: 3.0, April: 2.0,
  May: 3.1, June: 7.6, July: 7.5, August: 7.9,
  September: 6.5, October: 2.8, November: 1.6, December: 2.4,
}
```

### Takeaway line logic
Simple client-side rules:
- If total forecast rain > 1.5in: "Plenty of rain expected — hold off on watering"
- If total forecast rain > 0.5in: "Some rain coming — check soil before watering"
- If total forecast rain < 0.5in: "Dry week ahead — keep up with watering"
- If monthly total > 1.5x average: "Wetter than usual this month — watch for root rot"

### Raindrop icon
Custom SVG matching Lucide style (24x24 viewBox, 2px stroke, round caps/joins):
- Empty/outline raindrop: days with 0 precipitation
- Partially filled: light rain (< 0.25in)
- Fully filled: moderate to heavy rain (>= 0.25in)
- Color: `text-sage` for light, `text-primary` for heavy

---

## 5. Logo — Firebush Botanical Line Art

### Style
- Simple botanical line drawing of a Hamelia patens (firebush) flower cluster
- The firebush has distinctive tubular flowers in a cluster — recognizable even simplified
- Single-weight stroke lines matching Lucide icon weight (2px at 24px scale)
- Forest green (#1c3a2b) for stems and leaves
- Terracotta (#c4622d) for the flower tubes
- Transparent background
- Works at all sizes: 32px (favicon), 192px and 512px (PWA icons), and larger (welcome/auth headers)

### SVG format
- Hand-crafted SVG (not generated raster)
- `viewBox="0 0 64 64"` base size
- Exported at required PWA sizes as PNG for manifest

### Where it appears
- `manifest.json` icons (192x192, 512x512) — replacing the current emoji leaf
- Favicon (`<link rel="icon">`)
- Welcome screen — centered above the greeting
- Auth screen — centered above the sign-in form
- Can optionally appear in the ScreenHeader for the Garden page

### Files changed/created
- `react-app/public/logo.svg` (new)
- `react-app/public/icon-192.png` (new, generated from SVG)
- `react-app/public/icon-512.png` (new, generated from SVG)
- `react-app/public/favicon.svg` (new, or reuse logo.svg)
- `react-app/index.html` (modified — favicon link)
- `react-app/public/manifest.json` (modified — icon paths)
- `react-app/src/pages/Welcome.tsx` (modified — add logo)
- `react-app/src/components/auth/AuthScreen.tsx` or equivalent (modified — add logo)

---

## 6. Settings Simplification

The current Settings page (gear icon in Garden header) has: sign out, export JSON/CSV, browse native plant database, clear all data. The primary user only needs sign out.

### Change
- Remove the dedicated Settings sheet
- Add a simple sign-out option to the Garden header — either a small menu (tap user avatar/icon to get a dropdown with "Sign out") or a sign-out button at the very bottom of the Care dashboard
- Export and clear data remain accessible for the developer (secondary user) — keep them behind a long-press or in a minimal "Advanced" section at the bottom of the Care dashboard

### Files changed
- `react-app/src/pages/Garden.tsx` (remove SettingsSheet import, simplify header)
- `react-app/src/pages/Settings.tsx` (can be removed or reduced to a small component)

---

## 7. What Stays the Same

- Bottom nav structure (Garden, Map, Timeline, Wishlist + capture FAB)
- Capture flow and species identification
- Map features (zones, placements, zoom)
- Timeline page
- All existing database tables and data
- Care profiles still generated at capture time (one-time, per plant)
- The `reminders` table and existing reminder data

---

## 8. New Database Table

```sql
CREATE TABLE seasonal_care (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key text NOT NULL,
  garden_summary text NOT NULL,
  plant_tips jsonb NOT NULL,
  plant_hash text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE seasonal_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their seasonal care" ON seasonal_care FOR ALL USING (auth.uid() = user_id);
```

---

## 9. Migration Path

1. Add `seasonal_care` table to Supabase
2. Build WeatherCard and CareDashboard components
3. Add `seasonal_care` action to garden-assistant API route
4. Build `useWeather` and `useSeasonalCare` hooks
5. Add segmented toggle to Garden page, wire up Care view
6. Slim down ItemDetail (remove CareSection, add badges)
7. Simplify Settings (sign-out in header, remove Settings sheet)
8. Create logo SVG, generate PNG icons, update manifest/favicon
9. Update Welcome and Auth screens with logo
