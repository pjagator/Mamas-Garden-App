# Florida Garden Tracker -- Claude Code Project Prompt

## Instructions for Claude Code

You are working on a mobile-first web app for tracking and managing a native plant garden in Tampa Bay, Florida. The app is hosted on GitHub Pages as static files and uses Supabase for backend services.

Before making any changes, read the PROJECT-CONTEXT.md file in the repo root for the full current state of the app, including Supabase config, edge function code, database schema, and known gotchas.

### Rules

- This is a vanilla JS / HTML / CSS app. No frameworks, no build step, no bundlers.
- Three files in the repo root: index.html, style.css, app.js
- All backend logic goes through Supabase (auth, database, storage, edge functions)
- The app must work well on iPhone Safari. Test all UI changes at 390px width.
- Use the existing design system: Playfair Display headings, DM Sans body, forest green (#1c3a2b), warm cream (#f5f0e8), terracotta (#c4622d)
- Never expose API keys or the Supabase service role key in client code
- The edge function uses direct fetch from the client (not sb.functions.invoke) due to JWT issues documented in PROJECT-CONTEXT.md
- When modifying the edge function, deploy via the Supabase CLI: `supabase functions deploy identify-species`

---

## Current Features (already working)

- Email/password auth
- Photo capture and species identification (Plant.id + Claude Haiku)
- Manual plant/insect entry
- Garden inventory with search and filters
- Seasonal timeline
- JSON/CSV export
- Item detail view with delete

---

## New Features to Build

### 1. Plant Care Dashboard

Each saved plant should have a detailed care profile accessible from its card in the Garden tab.

Data to show:
- Watering needs (frequency for Tampa Bay climate, adjustments by season)
- Sun requirements (full sun, partial shade, full shade)
- Soil preferences (sandy, loamy, well-drained, etc.)
- Fertilizing schedule
- Pruning guidance and timing
- Pest/disease vulnerabilities common in central Florida
- Companion planting suggestions (what grows well nearby)
- Mature size (height and spread)

Implementation approach:
- When a plant is saved (either via identification or manual entry), make a second Claude API call to generate a care profile specific to Tampa Bay
- Store the care profile as a JSON column in the inventory table (add `care_profile jsonb` column)
- Display as an expandable section in the item detail modal
- Include a "Refresh care info" button to regenerate if needed

### 2. Planting Guide and Recommendations

A new tab or section that provides:
- "What to plant now" based on current month and Tampa Bay growing zones (Zone 9b/10a)
- Recommended native plants for specific conditions (shade garden, pollinator garden, drought-tolerant, etc.)
- Planting calendar showing best times to plant each species in the user's inventory

Implementation approach:
- Add a "Guide" tab to the bottom nav (replace or supplement Timeline)
- Use Claude API to generate seasonal recommendations based on the user's current inventory
- Cache recommendations so they don't regenerate on every tab switch (store in localStorage or a Supabase table)
- Include links to IFAS (University of Florida Institute of Food and Agricultural Sciences) resources where relevant

### 3. Visual Garden Map

An interactive top-down map of the user's garden where they can place and arrange plants.

Core functionality:
- User defines garden beds by drawing rectangles or freeform shapes on a canvas
- Each bed has properties: name, sun exposure (full/partial/shade), soil type, size
- User drags plants from their inventory onto beds
- Plants show as circles/icons with labels, sized roughly to mature spread
- Tap a placed plant to see its care info or remove it
- Pinch to zoom, drag to pan on mobile
- Save/load the garden layout

Database changes:
- New table `garden_beds`:
  ```sql
  create table garden_beds (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text,
    shape jsonb,        -- coordinates defining the bed shape
    sun_exposure text,  -- 'full', 'partial', 'shade'
    soil_type text,
    notes text,
    created_at timestamptz default now()
  );
  ```
- New table `garden_placements`:
  ```sql
  create table garden_placements (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    inventory_id uuid references inventory(id) on delete cascade,
    bed_id uuid references garden_beds(id) on delete cascade,
    x numeric,
    y numeric,
    placed_at timestamptz default now()
  );
  ```
- Enable RLS on both tables (user can only access their own)

Implementation approach:
- Use HTML Canvas for the garden map (better mobile performance than SVG for drag operations)
- Store garden dimensions in a user settings row or prompt on first use
- The map should be a new "Map" tab in the bottom nav
- Keep it simple initially: rectangular beds, circle plant markers, basic drag and drop
- Add a "Suggest layout" button that sends bed dimensions and plant list to Claude for spacing and companion planting recommendations

### 4. Seasonal Care Reminders

Show timely care tasks based on what's in the user's garden.

Examples:
- "March: Time to prune your Firebush before spring growth"
- "April: Watch for Atala butterflies on your Coontie"
- "October: Your Muhly Grass should be blooming -- enjoy the pink plumes"
- "November: Reduce watering frequency for most native plants"

Implementation approach:
- Generate reminders via Claude based on the user's inventory and current month
- Display as a card at the top of the Garden tab or in the Guide tab
- Regenerate monthly (cache with a month key)
- Store in a `reminders` table or generate on the fly

### 5. Plant Health Tracking

Let users log the health status of their plants over time.

- Add a "Health check" button to each plant's detail view
- Options: Thriving, Good, Stressed, Sick, Dormant
- Optional photo and notes with each check
- Show health history as a simple timeline in the detail view
- If "Stressed" or "Sick", offer to analyze a photo via Plant.id's health assessment endpoint (`https://api.plant.id/v3/health_assessment`)

Database changes:
- New table `health_logs`:
  ```sql
  create table health_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    inventory_id uuid references inventory(id) on delete cascade,
    status text,        -- 'thriving', 'good', 'stressed', 'sick', 'dormant'
    notes text,
    image_url text,
    diagnosis jsonb,    -- Plant.id health assessment results if applicable
    logged_at timestamptz default now()
  );
  ```

---

## Priority Order

Build in this order:
1. Plant Care Dashboard (highest value, builds on existing data)
2. Seasonal Care Reminders (quick win, high engagement)
3. Plant Health Tracking (extends existing detail view)
4. Planting Guide and Recommendations (new tab)
5. Visual Garden Map (most complex, build last)

---

## Edge Function Considerations

For features that need Claude API calls (care profiles, recommendations, reminders):
- Consider adding a second edge function (`garden-assistant`) rather than overloading `identify-species`
- The new function would accept `{ action: "care_profile" | "recommendations" | "reminders", data: {...} }` and route accordingly
- Same pattern: direct fetch from client, anon key auth, CORS headers
- Keep Claude prompts focused on Tampa Bay Zone 9b/10a specifics

For Plant.id health assessment:
- Can be added to the existing `identify-species` edge function as a separate code path
- Triggered by `{ imageUrl: "...", mode: "health" }` instead of the default identification mode

---

## Testing

After each feature:
- Test on iPhone Safari (real device or Xcode simulator)
- Verify Supabase RLS policies work (user can only see their own data)
- Check that new database columns/tables have appropriate defaults
- Confirm edge function changes deploy cleanly (`supabase functions deploy`)
- Hard refresh to clear cached JS/CSS
