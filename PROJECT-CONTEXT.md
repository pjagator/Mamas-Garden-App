# Florida Garden Tracker -- Project Context

## What This Is

A mobile-first (iPhone) web app for tracking native plants and insects in a Tampa Bay garden. Hosted on GitHub Pages as three static files. Uses Supabase for auth and cloud storage. Uses Claude Sonnet for species identification and Tampa Bay-specific context.

---

## Current Stack

- GitHub Pages (static hosting, no build step)
- Supabase (auth, Postgres database, Storage, Edge Functions)
- Vanilla JS / HTML / CSS (no framework)
- Claude Sonnet API (claude-sonnet-4-20250514) via Supabase Edge Function for species identification, care tips, and native status (handles both plants and insects)

---

## File Structure

ES modules in `js/`, CSS in `css/`, edge functions in `supabase/functions/`:

```
index.html                              -- HTML structure, loads CSS and JS
css/base.css                            -- Design system: custom properties, reset, buttons
css/components.css                      -- Reusable components, connection toast, filter utility
css/screens.css                         -- Screen layouts, modals, bottom nav
js/app.js                               -- Entry point, state, events, navigation, inventory caching
js/auth.js                              -- Auth flows
js/capture.js                           -- Photo capture, species ID, save flow
js/inventory.js                         -- Garden grid, filters, timeline, detail modal
js/features.js                          -- Tags, care profiles, reminders, health checks
js/network.js                           -- Network resilience: resilientFetch, connection state
sw.js                                   -- Service worker: static + image caching
supabase/functions/identify-species/    -- Species ID via Claude Sonnet (with retry)
supabase/functions/garden-assistant/    -- Care profiles, reminders, diagnosis (with retry)
```

---

## Supabase Project

- Project URL: `https://itjvgruwvlrrlhsknwiw.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c`

### Database Table: `inventory`

```sql
create table inventory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  common text,
  scientific text,
  type text,           -- 'plant' or 'bug'
  category text,
  confidence integer,
  description text,
  care text,
  bloom text[],        -- e.g. ['Spring','Summer']
  season text[],       -- for insects
  is_native boolean default false,
  source text,
  image_url text,
  notes text default '',
  date timestamptz default now()
);
```

Row Level Security is enabled. Users can only read/write/delete their own rows.

### Storage

Bucket name: `garden-images` (public)

Images are stored at path: `{user_id}/{timestamp}.jpg`

Temp images for identification stored at: `{user_id}/temp_{timestamp}.jpg`

Storage policy allows any authenticated user to upload (folder restriction removed):

```sql
drop policy if exists "upload_images" on storage.objects;
create policy "upload_images" on storage.objects
  for insert with check (bucket_id = 'garden-images');
```

### Secrets

One secret stored in Supabase Edge Functions:
- `ANTHROPIC_API_KEY` -- for Claude Sonnet API

### Edge Function: `identify-species`

Located at: `https://itjvgruwvlrrlhsknwiw.supabase.co/functions/v1/identify-species`

Source code: `supabase/functions/identify-species/index.ts`

JWT verification is DISABLED on this function. It accepts requests with just the anon key.

Uses `Deno.serve()` syntax (NOT the old `serve` import).

The function flow:
1. Receives `{ imageUrl: string }` in the request body
2. Fetches the image from Supabase Storage
3. Converts to base64 server-side using chunked conversion (8KB chunks to avoid call stack overflow)
4. Sends the image to Claude Sonnet (claude-sonnet-4-20250514) with a Tampa Bay botanist/entomologist prompt, with retry logic (exponential backoff up to 3 retries for 529/5xx errors)
5. Claude identifies the species (plant or insect), returns top 3 matches with confidence scores, native status, bloom/active seasons, care tips, and descriptions
6. Returns `{ identifications: [...] }` with top 3 matches

**Important**: The app.js calls this function using direct `fetch()`, NOT `sb.functions.invoke()`. The Supabase JS client's `invoke` method had persistent JWT issues causing EarlyDrop errors.

See `supabase/functions/identify-species/index.ts` for the current source code.

---

## App Features

- Email/password auth (Supabase Auth)
- Bottom iOS-style tab bar: Capture, Garden, Timeline, Settings
- Capture tab: take photo or upload from gallery, identify with Claude Sonnet AI (plants and insects), select from top 3 results, save to garden
- Manual entry: add plants/insects without a photo
- Garden tab: 2-column card grid, live search, filter by type/native/blooming now
- Timeline tab: seasonal view of what's blooming/active
- Settings tab: export JSON/CSV, clear data, sign out
- No API key UI -- identification is fully handled server-side
- Offline browsing: cached inventory via localStorage, cached images via service worker
- Connection awareness: toast bar for offline/online, disabled capture when offline
- Network resilience: all API calls use resilientFetch with retries, timeouts, backoff

---

## App.js Key Functions

- `identifySpecies()` -- uploads temp image to storage, calls edge function via direct fetch, displays results
- `renderIdCards(results)` -- renders top 3 identification result cards with confidence badges, notes field, and save button
- `selectIdCard(index)` -- handles tapping a result card to select it
- `saveSelectedId()` -- uploads final image to storage, builds entry, inserts into database
- `buildEntry(result, imageUrl, notes)` -- constructs the database row object from identification result
- `uploadTempImage(canvas)` -- uploads compressed temp image for identification
- `uploadImage(canvas)` -- uploads final image for saved entries
- `matchNative(commonName, scientificName)` -- cross-references against client-side native plant database

---

## Design

- Fonts: Playfair Display (headings, loaded from Google Fonts), system-ui stack / SF Pro on iPhone (body — `--font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`). DM Sans was removed.
- Colors: deep forest green (`#1c3a2b`), warm cream (`#f5f0e8`), terracotta (`#c4622d`)
- Mobile-first, tested on iPhone
- `viewport-fit=cover` with `env(safe-area-inset-top)` on headers and welcome screen for iPhone status bar bleed
- Bottom tab nav with safe-area-inset support

---

## Key Gotchas Learned

### Supabase Edge Functions
- Never send raw base64 image data in Supabase edge function request body -- causes EarlyDrop (body size limit). Upload to Storage first, pass URL.
- Use `Deno.serve()` not `serve()` with an import -- Supabase runtime changed and the old import style causes `ReferenceError: serve is not defined`.
- Base64 conversion MUST use chunked approach (8KB chunks). Using `String.fromCharCode(...new Uint8Array(buffer))` with the spread operator on large arrays blows the call stack and causes instant EarlyDrop.
- `sb.functions.invoke()` had persistent JWT/EarlyDrop issues even with valid sessions. Switched to direct `fetch()` with the anon key in the Authorization header. This is the reliable approach.
- JWT verification was disabled on the edge function since it doesn't need user identity.
- EarlyDrop with zero console output and very low CPU time (9-19ms) means the request is being rejected at the gateway BEFORE your code runs. Common causes: invalid JWT, request body too large, or syntax error in the function.
- Add `console.log` at every step when debugging edge functions. Supabase logs are the only visibility you have.
- The Supabase dashboard edge function editor is the easiest way to deploy. Select all, delete, paste, deploy.

### Storage
- Storage upload policies use `(storage.foldername(name))[1]` to check the first path segment. If you use a `temp/` prefix the policy blocks it. Either remove the folder restriction or keep uploads directly under the user ID.

### Auth
- Supabase email confirmation redirects to `localhost` by default. Fix in Authentication > URL Configuration > Site URL.
- If JWT tokens become invalid (e.g., after secret rotation), sign out and sign back in to get a fresh token.

### General
- Never expose the service role key in client code -- it bypasses all RLS. Only use the anon key in the browser.
- Keep HTML, CSS, and JS in separate files. Large single files cause issues with some tools.
- Previously tried Plant.id (Kindwise) and PlantNet APIs for species identification. Plant.id free tier was too limited (100/day), PlantNet had compatibility issues with Supabase Edge Functions. Claude Sonnet handles both plants and insects in a single API call and is accurate enough for a personal garden tracker.
- Both edge functions include `fetchWithRetry()` with exponential backoff for Claude API 529 (overloaded) errors. Always redeploy both functions after editing.
- Service worker (`sw.js`) manages two caches: `garden-static-vN` for core files and `garden-images-v1` for Supabase Storage photos. Bump CACHE_VERSION in sw.js and `?v=N` in index.html together.
- Inventory data cached in localStorage, not service worker. `loadInventory()` renders from cache first, refreshes in background.
- FAB offline state uses CSS class `.fab-offline` (not inline styles) to avoid conflicts with FAB scroll behavior.

---

## Native Plant Database (client-side)

Used for cross-referencing Claude Sonnet identification results and manual entries. This supplements but does NOT limit the AI identification:

```javascript
const NATIVE_PLANTS = [
  { name: "Coontie", scientific: "Zamia integrifolia", aliases: ["coontie", "florida arrowroot", "zamia"], bloom: ["Spring","Summer"], type: "Cycad" },
  { name: "Beautyberry", scientific: "Callicarpa americana", aliases: ["beautyberry", "callicarpa"], bloom: ["Summer","Fall"], type: "Shrub" },
  { name: "Firebush", scientific: "Hamelia patens", aliases: ["firebush", "hamelia", "scarlet bush"], bloom: ["Spring","Summer","Fall"], type: "Shrub" },
  { name: "Wild Coffee", scientific: "Psychotria nervosa", aliases: ["wild coffee", "psychotria"], bloom: ["Spring","Summer"], type: "Shrub" },
  { name: "Simpson's Stopper", scientific: "Myrcianthes fragrans", aliases: ["simpson", "stopper", "myrcianthes"], bloom: ["Spring","Summer"], type: "Tree" },
  { name: "Blanket Flower", scientific: "Gaillardia pulchella", aliases: ["blanket flower", "gaillardia", "indian blanket"], bloom: ["Spring","Summer","Fall"], type: "Wildflower" },
  { name: "Beach Sunflower", scientific: "Helianthus debilis", aliases: ["beach sunflower", "helianthus debilis"], bloom: ["Year-round"], type: "Wildflower" },
  { name: "Coral Honeysuckle", scientific: "Lonicera sempervirens", aliases: ["coral honeysuckle", "lonicera"], bloom: ["Spring","Summer","Fall"], type: "Vine" },
  { name: "Passion Vine", scientific: "Passiflora incarnata", aliases: ["passion vine", "passionflower", "maypop", "passiflora"], bloom: ["Summer","Fall"], type: "Vine" },
  { name: "Muhly Grass", scientific: "Muhlenbergia capillaris", aliases: ["muhly", "muhlenbergia", "pink muhly"], bloom: ["Fall"], type: "Grass" },
  { name: "Saw Palmetto", scientific: "Serenoa repens", aliases: ["saw palmetto", "serenoa"], bloom: ["Spring"], type: "Palm" },
  { name: "Cabbage Palm", scientific: "Sabal palmetto", aliases: ["cabbage palm", "sabal", "cabbage palmetto"], bloom: ["Summer"], type: "Palm" },
  { name: "Southern Magnolia", scientific: "Magnolia grandiflora", aliases: ["magnolia", "southern magnolia"], bloom: ["Spring","Summer"], type: "Tree" },
  { name: "Live Oak", scientific: "Quercus virginiana", aliases: ["live oak", "quercus virginiana"], bloom: ["Spring"], type: "Tree" },
  { name: "Bald Cypress", scientific: "Taxodium distichum", aliases: ["bald cypress", "taxodium"], bloom: ["Spring"], type: "Tree" },
  { name: "Walter's Viburnum", scientific: "Viburnum obovatum", aliases: ["walter's viburnum", "viburnum obovatum", "small viburnum", "walter viburnum", "small-leaf viburnum"], bloom: ["Spring"], type: "Shrub" },
];
```

---

## CSS Components

In addition to the base botanical design, `style.css` includes styles for:

- `.id-card` / `.id-card.selected` -- identification result cards (tappable, with selected state border)
- `.id-card-name`, `.id-card-sci`, `.id-card-desc`, `.id-card-tags` -- card content styling
- `.confidence-badge` with `.high` / `.mid` / `.low` variants -- color-coded confidence scores
- `.id-notes` -- textarea for adding notes before saving
- `.spinner-wrap`, `.spinner-label` -- loading state during identification

---

## Testing the Edge Function

Quick test from browser console (should return "No image URL provided" error):

```javascript
fetch('https://itjvgruwvlrrlhsknwiw.supabase.co/functions/v1/identify-species', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}'
}).then(r => r.text()).then(t => console.log(t));
```

Test with a real image URL (will attempt full identification):

```javascript
fetch('https://itjvgruwvlrrlhsknwiw.supabase.co/functions/v1/identify-species', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c',
  },
  body: JSON.stringify({ imageUrl: 'YOUR_IMAGE_URL_HERE' })
}).then(r => r.text()).then(t => console.log(t));
```

---

## Planned / In-Progress Features

### Plant Tags
Each plant can have one or more tags from a preset list plus custom user-defined tags.

Preset tags: Grass, Vine, Shrub, Wildflower, Tree, Palm, Cycad, Fern, Herb

Custom tags: user can type any tag. Custom tags behave identically to preset tags for filtering and display.

Database: `alter table inventory add column tags text[] default '{}';`

Tags auto-populate from category when saving from identification. Editable from item detail modal. Tag editor UI: preset tags as tappable chips (toggle on/off) plus text input for custom tags.

### Garden Locations
Users can record where in the garden each plant is.

Preset locations: Hammock, Sandhill

Plus free-text option for any custom location.

Database: `alter table inventory add column location text default '';`

Location picker in save flow and item detail modal: preset chips plus text input.

### Sorting and Filtering Enhancements
Add to existing Garden tab filters (All, Plants, Bugs, Native, Blooming Now):
- Filter by tag: dropdown/sheet showing all tags in use, multi-select
- Filter by location: dropdown/sheet showing all locations in use

Filters are combinable (e.g., Native + Shrub + Hammock).

Sort options: name (A-Z), date added (newest/oldest), location.

### Photos on Manual Entries ✓ Implemented
Manual entries support photos. If a photo is loaded in the capture preview canvas when the user switches to manual entry, `saveManualEntry()` uploads it via `uploadImage()` and saves the URL with the entry. The canvas is cleared after a successful save.

### Bug-Plant Associations
Link insects to the plants they're found on. "Found on" field when saving a bug, picks from existing plant inventory.

Database: `alter table inventory add column found_on_plant_id uuid references inventory(id) on delete set null;`

Bug detail shows "Found on: [plant name]" (tappable link to plant). Plant detail shows "Visitors" section listing associated bugs. Garden cards for bugs show "on [plant name]" label.

### Welcome Screen (Literary Quote + Gardening Fact)
First screen on app open. Shows every time. Feels like opening a garden journal.

Layout:
- Seasonal greeting ("Good morning" / "Good afternoon" / "Good evening")
- Literary quote of the day (large italic Playfair Display)
- Gardening fact of the day below
- Bottom tab nav visible so users can skip to any tab

Literary quote sources: the primary user is an English teacher who loves classic English literature, Greek and Roman classics, opera, and high-brow literary fiction. Draw from Shakespeare, Virgil (Georgics), Homer, Ovid, Milton, Keats, Wordsworth, Emily Dickinson, Frances Hodgson Burnett (The Secret Garden), Voltaire (Candide), T.S. Eliot, Rilke, Cicero, Marcus Aurelius, Vita Sackville-West, Elizabeth von Arnim, Karel Capek. Also opera libretto references (Handel's Semele, Mozart's Marriage of Figaro garden scene, Delius, Britten's A Midsummer Night's Dream).

Local array of 60+ quotes, each with text, author, source work. Daily rotation via day-of-year modulo array length.

Gardening facts: 60+ facts focused on Florida/Tampa Bay gardening, native plants, pollinators, soil science, botanical history. Rotated daily with offset from quote rotation.
