# Florida Garden Tracker -- Project Context

## What This Is

A mobile-first (iPhone) web app for tracking native plants and insects in a Tampa Bay garden. Hosted on GitHub Pages as three static files. Uses Supabase for auth and cloud storage. Uses Plant.id API for species identification and Claude Haiku for Tampa Bay-specific context.

---

## Current Stack

- GitHub Pages (static hosting, no build step)
- Supabase (auth, Postgres database, Storage, Edge Functions)
- Vanilla JS / HTML / CSS (no framework)
- Plant.id API (by Kindwise) for species identification via Supabase Edge Function
- Claude Haiku API via Supabase Edge Function for Tampa Bay care tips and native status
- Kindwise insect.id API as fallback for insect identification

---

## File Structure

Three files in the repo root:

```
index.html   -- HTML structure only, links to style.css and app.js
style.css    -- All styles (botanical editorial design, bottom tab nav, ID result cards)
app.js       -- All JavaScript logic
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

Two secrets stored in Supabase Edge Functions:
- `ANTHROPIC_API_KEY` -- for Claude Haiku API
- `PLANT_ID_API_KEY` -- for Plant.id / Kindwise API (get key at https://admin.kindwise.com/)

### Edge Function: `identify-species`

Located at: `https://itjvgruwvlrrlhsknwiw.supabase.co/functions/v1/identify-species`

JWT verification is DISABLED on this function. It accepts requests with just the anon key.

Uses `Deno.serve()` syntax (NOT the old `serve` import).

The function flow:
1. Receives `{ imageUrl: string }` in the request body
2. Fetches the image from Supabase Storage
3. Converts to base64 server-side using chunked conversion (8KB chunks to avoid call stack overflow)
4. Calls Plant.id v3 API (`https://api.plant.id/v3/identification`) with the base64 image
5. If Plant.id says it's not a plant, falls back to insect.id API (`https://insect.kindwise.com/api/v1/identification`)
6. Passes the top 3 species names and confidence scores to Claude Haiku API
7. Claude returns Tampa Bay-specific care tips, bloom/active seasons, Florida native status, and descriptions
8. If Claude fails, returns basic Plant.id results without enrichment
9. Returns `{ identifications: [...] }` with top 3 matches

**Important**: The app.js calls this function using direct `fetch()`, NOT `sb.functions.invoke()`. The Supabase JS client's `invoke` method had persistent JWT issues causing EarlyDrop errors.

Current edge function code:

```typescript
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error("No image URL provided");

    const plantIdKey = Deno.env.get("PLANT_ID_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!plantIdKey) throw new Error("Plant.id API key not configured");
    if (!anthropicKey) throw new Error("Anthropic API key not configured");

    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Could not fetch image: " + imgResponse.status);
    const imgBuffer = await imgResponse.arrayBuffer();

    const bytes = new Uint8Array(imgBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);

    let species = [];
    let detectedType = "plant";

    const plantIdResponse = await fetch("https://api.plant.id/v3/identification", {
      method: "POST",
      headers: {
        "Api-Key": plantIdKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ images: [base64] }),
    });

    if (!plantIdResponse.ok) {
      const errText = await plantIdResponse.text();
      throw new Error("Plant.id API error: " + errText);
    }

    const plantIdResult = await plantIdResponse.json();
    const isPlant = plantIdResult?.result?.is_plant?.binary;

    if (isPlant && plantIdResult?.result?.classification?.suggestions?.length) {
      species = plantIdResult.result.classification.suggestions.slice(0, 3).map(function(s) {
        return {
          name: s.name,
          probability: Math.round((s.probability || 0) * 100),
        };
      });
      detectedType = "plant";
    }

    if (!isPlant || species.length === 0) {
      try {
        const insectResponse = await fetch("https://insect.kindwise.com/api/v1/identification", {
          method: "POST",
          headers: {
            "Api-Key": plantIdKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ images: [base64] }),
        });

        if (insectResponse.ok) {
          const insectResult = await insectResponse.json();
          const isInsect = insectResult?.result?.is_insect?.binary;
          if (isInsect && insectResult?.result?.classification?.suggestions?.length) {
            species = insectResult.result.classification.suggestions.slice(0, 3).map(function(s) {
              return {
                name: s.name,
                probability: Math.round((s.probability || 0) * 100),
              };
            });
            detectedType = "bug";
          }
        }
      } catch (e) {
        // insect.id failed, continue with whatever we have
      }
    }

    if (species.length === 0) {
      throw new Error("Could not identify a plant or insect in this image. Try a clearer photo.");
    }

    const speciesList = species.map(function(s, i) {
      return (i + 1) + ". " + s.name + " (" + s.probability + "% match)";
    }).join("\n");

    const claudePrompt = "A species identification API analyzed a garden photo taken in the Tampa Bay, Florida area. It returned these top matches:\n\n" + speciesList + "\n\nDetected type: " + detectedType + "\n\nFor each species listed above, return a JSON array with exactly " + species.length + " items in the same order. Each item must have these fields:\n{\n  \"common\": \"Most common name for this species\",\n  \"scientific\": \"Scientific name\",\n  \"type\": \"" + detectedType + "\",\n  \"category\": \"e.g. Shrub, Tree, Wildflower, Butterfly, Beetle, etc.\",\n  \"confidence\": (use the percentage from the match above),\n  \"isNative\": true or false (native to Florida specifically, not just North America),\n  \"bloom\": [\"Spring\",\"Summer\",\"Fall\",\"Winter\",\"Year-round\"] or null (plants only, for Tampa Bay),\n  \"season\": [\"Spring\",\"Summer\",\"Fall\",\"Winter\",\"Year-round\"] or null (insects only, for Tampa Bay),\n  \"care\": \"Brief care tip specific to Tampa Bay climate\" or null,\n  \"description\": \"One sentence description relevant to Tampa Bay gardeners\"\n}\n\nReturn ONLY the JSON array. No other text.";

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: claudePrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const identifications = species.map(function(s) {
        return {
          common: s.name,
          scientific: s.name,
          type: detectedType,
          category: detectedType === "plant" ? "Plant" : "Insect",
          confidence: s.probability,
          isNative: false,
          bloom: null,
          season: null,
          care: null,
          description: null,
          source: "Plant.id",
        };
      });
      return new Response(JSON.stringify({ identifications: identifications }), {
        headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }),
      });
    }

    const claudeResult = await claudeResponse.json();
    const text = claudeResult.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const identifications = JSON.parse(clean);

    const enriched = identifications.map(function(id) {
      return Object.assign({}, id, { source: "Plant.id + Claude AI" });
    });

    return new Response(JSON.stringify({ identifications: enriched }), {
      headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }),
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }
});
```

---

## App Features

- Email/password auth (Supabase Auth)
- Bottom iOS-style tab bar: Capture, Garden, Timeline, Settings
- Capture tab: take photo or upload from gallery, identify with Plant.id + Claude AI, select from top 3 results, save to garden
- Manual entry: add plants/insects without a photo
- Garden tab: 2-column card grid, live search, filter by type/native/blooming now
- Timeline tab: seasonal view of what's blooming/active
- Settings tab: export JSON/CSV, clear data, sign out
- No API key UI -- identification is fully handled server-side

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

- Fonts: Playfair Display (headings), DM Sans (body)
- Colors: deep forest green (`#1c3a2b`), warm cream (`#f5f0e8`), terracotta (`#c4622d`)
- Mobile-first, tested on iPhone
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

### Plant.id API (v3)
- Endpoint: `https://api.plant.id/v3/identification`
- Auth: `Api-Key` header
- Body: `{ images: [base64string] }` -- no other fields needed
- Do NOT include `similar_images: false` or other unknown modifiers -- the API rejects unknown modifiers with an error
- Response structure: `result.is_plant.binary` (boolean), `result.classification.suggestions[]` with `.name` and `.probability`
- Free tier: 100 identifications per day
- API key from https://admin.kindwise.com/

### Kindwise insect.id API
- Endpoint: `https://insect.kindwise.com/api/v1/identification`
- May or may not accept the same API key as Plant.id (same company, separate products)
- Response structure similar to Plant.id but with `result.is_insect.binary`

### Storage
- Storage upload policies use `(storage.foldername(name))[1]` to check the first path segment. If you use a `temp/` prefix the policy blocks it. Either remove the folder restriction or keep uploads directly under the user ID.

### Auth
- Supabase email confirmation redirects to `localhost` by default. Fix in Authentication > URL Configuration > Site URL.
- If JWT tokens become invalid (e.g., after secret rotation), sign out and sign back in to get a fresh token.

### General
- Never expose the service role key in client code -- it bypasses all RLS. Only use the anon key in the browser.
- Keep HTML, CSS, and JS in separate files. Large single files cause issues with some tools.

---

## Native Plant Database (client-side)

Used for cross-referencing API results and manual entries. This supplements but does NOT limit the Plant.id identification:

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
