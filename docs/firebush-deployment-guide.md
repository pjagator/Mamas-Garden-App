# Project Firebush — Deployment Guide

**What this does**: Gets the React app live on Vercel with all features working. The vanilla app on GitHub Pages is NOT affected.

---

## Will this damage the current app?

**No.** Here's why:

| Action | Risk to vanilla app |
|--------|-------------------|
| SQL migrations (new tables) | **None** — creates 4 new tables (`garden_maps`, `garden_beds`, `garden_placements`, `wishlist`). The vanilla app doesn't know these exist and never queries them. Existing tables (`inventory`, `reminders`, `health_logs`) are untouched. |
| RLS policies on new tables | **None** — only applies to new tables. |
| Vercel deployment | **None** — deploys from the `firebush` branch to a separate Vercel URL. GitHub Pages continues deploying from `main`. |
| Vercel env vars | **None** — these are Vercel-only. The Supabase anon key is the same one already in `app.js`. |
| Both apps sharing the same Supabase project | **Safe** — both read/write the same `inventory`, `reminders`, and `health_logs` tables. Data flows both directions. If your wife adds a plant on the vanilla app, it shows up in the React app, and vice versa. |
| Supabase Edge Functions | **Untouched** — the React app uses Vercel API routes instead. The vanilla app keeps using `identify-species` and `garden-assistant` edge functions as before. |

**The only scenario that could cause confusion**: If you use the React app to add a plant and then check the vanilla app, the plant will be there (same DB). That's by design, not a bug.

---

## Step 1: Run SQL Migrations in Supabase

Go to your Supabase dashboard → **SQL Editor** → **New Query**

Run each block one at a time (or all together — they're independent):

### 1a. `garden_maps` table

```sql
CREATE TABLE garden_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text DEFAULT 'My Garden',
  image_url text,
  width numeric,
  height numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE garden_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their maps" ON garden_maps FOR ALL USING (auth.uid() = user_id);
```

### 1b. `garden_beds` table

```sql
CREATE TABLE garden_beds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  map_id uuid REFERENCES garden_maps(id) ON DELETE CASCADE NOT NULL,
  name text,
  shape jsonb NOT NULL,
  sun_exposure text,
  soil_type text,
  moisture_level text,
  wind_exposure text,
  zone_type text,
  color text DEFAULT '#7a9e7e',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE garden_beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their beds" ON garden_beds FOR ALL USING (auth.uid() = user_id);
```

### 1c. `garden_placements` table

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
  UNIQUE (map_id, inventory_id)
);
ALTER TABLE garden_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their placements" ON garden_placements FOR ALL USING (auth.uid() = user_id);
```

### 1d. `wishlist` table

```sql
CREATE TABLE wishlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  common text,
  scientific text,
  type text DEFAULT 'plant',
  category text,
  confidence integer,
  description text,
  image_url text,
  spotted_at text,
  notes text DEFAULT '',
  is_native boolean DEFAULT false,
  bloom text[],
  season text[],
  care_profile jsonb,
  suggested_zones text[],
  sun_needs text,
  soil_needs text,
  moisture_needs text,
  source text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their wishlist" ON wishlist FOR ALL USING (auth.uid() = user_id);
```

### How to verify

After running all 4 blocks, go to **Table Editor** in Supabase. You should see 4 new tables: `garden_maps`, `garden_beds`, `garden_placements`, `wishlist`. All should show 0 rows and have RLS enabled (green shield icon).

---

## Step 2: Connect to Vercel

### 2a. Create a Vercel account

1. Go to https://vercel.com
2. Click **Sign Up**
3. Choose **Continue with GitHub**
4. Authorize Vercel to access your GitHub account

### 2b. Import the repo

You should land on the Vercel dashboard after signing up. Here's what to do:

1. Click the **Add New...** button (top right of dashboard), then choose **Project**
2. You'll see a list of your GitHub repos under **Import Git Repository**
3. Find `Mamas-Garden-App` in the list and click the **Import** button next to it

You'll now be on the **Configure Project** page. This page has several sections:

#### Project Name
- At the top, there's a **Project Name** field. It auto-fills from the repo name.
- You can leave it as-is or change it to something like `tampa-garden` (only lowercase letters, digits, and hyphens are allowed here)

#### Root Directory
- Below the project name, look for **Root Directory** — it shows `./` by default
- Click the **Edit** button next to it
- Type `react-app` in the field
- This tells Vercel to build from the `react-app/` subfolder, not the repo root

#### Framework Preset
- Should auto-detect as **Vite** once you set the root directory
- If it doesn't, select **Vite** from the dropdown

#### Build and Output Settings
- **Build Command**: Leave as default (`npm run build`)
- **Output Directory**: Leave as default (`dist`)
- You can expand this section to verify, but the defaults should be correct

#### Environment Variables
- Expand the **Environment Variables** section (it may be collapsed — look for a collapsible panel near the bottom of the page)
- You need to add 3 variables. For each one, type the name in the **Key** field and paste the value in the **Value** field:

**Variable 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://itjvgruwvlrrlhsknwiw.supabase.co`

**Variable 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c`

**Variable 3:**
- Key: `ANTHROPIC_API_KEY`
- Value: *(your Anthropic API key — the same one stored in Supabase Edge Function secrets)*

**Important**: Type each key name manually — do NOT copy-paste the key names, as invisible characters can sneak in and cause a "The name contains invalid characters" error. The value can be pasted.

If you get the "invalid characters" error on ANY of these, try:
- Clear the Key field completely and retype it character by character
- Make sure there are no spaces before or after the name
- Make sure you're typing in the **Key** field, not the **Value** field

Click **Add** after each variable (or the **+** button, depending on the UI).

#### Deploy

- Click the **Deploy** button
- Vercel will build the app. This takes about 30-60 seconds.
- **The first deploy will fail** because it deploys from `main`, not `firebush`. That's expected — we fix this next.

### 2c. Set Root Directory (if you couldn't set it during import)

If you weren't able to select `react-app` as the root directory during import (because Vercel was browsing the `main` branch):

1. Go to your project on the Vercel dashboard
2. Click **Settings** in the top navigation
3. In the left sidebar, click **Build and Deployment** (may also say "Build & Development Settings")
4. Scroll down until you see **Root Directory**
5. Type `react-app` in the field
6. Click **Save**

### 2d. Change the production branch to `firebush`

1. Still in **Settings**, look for **Environments** in the left sidebar
2. Click on the **Production** environment
3. Find **Branch Tracking**
4. Change the branch from `main` to `firebush`
5. Click **Save**

### 2e. Trigger a redeploy

1. Go to the **Deployments** tab in your project
2. Click **Create Deployment** (or find the **Redeploy** button on the most recent deployment)
3. If prompted for a branch, enter `firebush`
4. Click **Create Deployment**

Vercel will now build from the `firebush` branch with the `react-app/` root directory. You should get a URL like `tampa-garden.vercel.app` (or whatever project name you chose).

### How to verify

1. Open the Vercel URL in your browser
2. You should see the Tampa Garden auth page (forest green gradient)
3. Sign in with your existing email/password
4. You should see your inventory data (same data as the vanilla app)
5. Try the capture flow — take a photo and identify a species (this tests the Vercel API routes)

### If environment variables need to be added later

If you skipped the env vars during project creation, or need to fix them:

1. Go to your project on Vercel dashboard
2. Click **Settings** in the top navigation
3. Click **Environment Variables** in the left sidebar
4. Add each variable: type the Key name manually, paste the Value
5. Click **Save**
6. **Important**: After adding/changing env vars, you must redeploy for them to take effect. Go to Deployments → click Redeploy on the latest deployment.

---

## Step 3: Verify everything works

### Checklist

- [ ] Vercel URL loads the auth page
- [ ] Sign in with existing credentials works
- [ ] Garden page shows your inventory
- [ ] Capture (FAB) → take photo → identify species → save works
- [ ] Map tab shows "Upload your garden" prompt
- [ ] Wishlist tab shows empty state
- [ ] Timeline shows seasonal grouping
- [ ] Settings (gear icon) → export JSON works
- [ ] The vanilla app at `pjagator.github.io/Mamas-Garden-App` still works perfectly

### If something goes wrong

| Problem | Fix |
|---------|-----|
| "Missing env vars" error on load | Check Vercel env vars — all 3 must be set. Redeploy after adding them. |
| Species ID fails | Check `ANTHROPIC_API_KEY` is set in Vercel. Check Vercel function logs for errors. |
| New tables not found (map/wishlist errors) | Run the SQL migrations from Step 1. |
| Auth doesn't work | Make sure the Vercel URL is allowed in Supabase → Authentication → URL Configuration → Redirect URLs. Add your Vercel URL there. |
| Can't place plants on map | Fixed — the PlantPalette Sheet overlay was intercepting taps. Now the palette auto-closes when you select a plant so taps reach the canvas. |
| Vanilla app broken | This shouldn't happen. If it does, nothing in this process modifies the vanilla app. Check GitHub Pages deployment status. |

---

## Step 4: Add Vercel URL to Supabase redirect URLs

This step is important for auth to work properly on the deployed app.

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, click **Add URL**
3. Add your Vercel URL: `https://your-project.vercel.app/**` (with the `/**` wildcard)
4. Save

This allows Supabase auth redirects (password reset, email confirmation) to work on the Vercel URL.

---

## What happens next

- Every `git push` to the `firebush` branch auto-deploys to Vercel
- Every `git push` to `main` auto-deploys the vanilla app to GitHub Pages
- Both apps share the same Supabase data
- When the React app is ready to be "the" app, you swap your wife's home screen bookmark to the Vercel URL
