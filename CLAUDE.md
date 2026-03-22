# Tampa Bay Garden Tracker

Mobile-first web app for tracking native plants and insects in a Tampa Bay, Florida garden. Hosted on GitHub Pages as static files with Supabase backend.

## Tech Stack

- **Frontend**: Vanilla JS / HTML / CSS -- no frameworks, no build step, no bundlers
- **Backend**: Supabase (auth, Postgres with RLS, Storage, Edge Functions on Deno)
- **APIs**: Plant.id v3 (species ID), Kindwise insect.id (fallback), Claude Haiku (enrichment + care profiles)
- **Hosting**: GitHub Pages (push to main = deploy)

## Project Structure

```
app.js              -- All application logic (auth, capture, inventory, modals, care profiles, status tracking)
index.html          -- HTML structure: 4 screens (Capture, Garden, Timeline, Settings) + 3 modals
style.css           -- All styles, CSS custom properties design system
supabase/functions/ -- Edge functions (Deno). Deploy via: supabase functions deploy <name>
  garden-assistant/ -- Care profile generation via Claude Haiku
PROJECT-CONTEXT.md  -- Supabase config, DB schema, edge function code, API details, known gotchas
CLAUDE-CODE-PROMPT.md -- Development rules and planned features roadmap
```

## Key Rules

- Three files in repo root. Keep HTML/CSS/JS separate. No new frontend files unless absolutely necessary.
- All API keys stay server-side in Edge Functions. Only the Supabase anon key is in client code.
- Edge functions are called via direct `fetch()`, NOT `sb.functions.invoke()` (JWT issues -- see PROJECT-CONTEXT.md).
- Target device is iPhone Safari. Test at 390px width.
- Design system: Playfair Display headings, DM Sans body, green (#1c3a2b), cream (#f5f0e8), terracotta (#c4622d).

## Database

Table `inventory` -- see full schema in `PROJECT-CONTEXT.md:39-57`. Key columns:
- `type`: 'plant' or 'bug'
- `bloom` / `season`: text arrays for seasonal tracking
- `care_profile`: jsonb with structured care data from Claude
- `health`, `flowering`, `height`, `location`, `features`: plant status tracking fields
- RLS enabled: users can only access their own rows

Storage bucket `garden-images` (public). Images at `{user_id}/{timestamp}.jpg`.

## Deploy

- **Frontend**: `git push` to main (GitHub Pages auto-deploys)
- **Edge functions**: `supabase functions deploy <function-name>`
- **DB migrations**: Run SQL directly in Supabase SQL Editor

## Testing

No automated tests. Manual verification:
- iPhone Safari or 390px viewport
- Verify RLS (user isolation)
- Hard refresh to bust cached JS/CSS
- Edge function logs in Supabase dashboard

## Additional Documentation

Check these files when working in related areas:

| File | When to check |
|------|---------------|
| `PROJECT-CONTEXT.md` | Supabase config, DB schema, edge function code, API details, all known gotchas |
| `CLAUDE-CODE-PROMPT.md` | Development rules, current features list, planned features 1-5 with specs |
| `.claude/docs/architectural_patterns.md` | State management, API call patterns, modal/nav/expandable section conventions, data flow, error handling tiers |
