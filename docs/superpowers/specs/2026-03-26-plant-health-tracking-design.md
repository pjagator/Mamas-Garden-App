# Plant Health Tracking — Design Spec

## Overview

Add health check logging with history timeline and AI-powered diagnosis for stressed/sick plants. Users can quickly log a plant's health from the garden grid via a bottom sheet, view history in the detail modal, and get Claude-powered diagnosis from photos.

## Decisions

- **Approach:** New `health_logs` table (not JSONB array on inventory)
- **Quick-log UI:** Bottom sheet triggered by pulse icon on plant cards
- **History location:** Collapsible section in the existing detail modal
- **AI diagnosis:** Claude Sonnet via garden-assistant edge function (not Plant.id)
- **Diagnosis trigger:** Automatic prompt when stressed/sick is selected

## Database

### New table: `health_logs`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NOT NULL | FK to `auth.users(id)` ON DELETE CASCADE |
| `inventory_id` | uuid | NOT NULL | FK to `inventory(id)` ON DELETE CASCADE |
| `health` | text | NOT NULL | thriving, healthy, stressed, sick, dormant, new |
| `flowering` | text | | yes, budding, no, fruiting |
| `notes` | text | `''` | Free text |
| `image_url` | text | | Photo in Supabase Storage |
| `diagnosis` | jsonb | | AI diagnosis result |
| `logged_at` | timestamptz | `now()` | Timestamp |

RLS: users read/write/delete own rows only. Deleting a plant cascades to its logs.

No changes to the `inventory` table. Existing `health` and `flowering` columns remain as "current" snapshot, updated on each log save.

## UI: Quick-Log Bottom Sheet

Triggered by a pulse/heart icon on each **plant** card in the garden grid (not bugs).

Bottom sheet contains:
1. **Plant name** — context header
2. **Health status** — 6 pill buttons: thriving, healthy, stressed, sick, dormant, new. Current status pre-selected.
3. **Flowering status** — 4 smaller pills: yes, budding, no, fruiting. Optional, pre-selected if set.
4. **Notes** — single-line text input, placeholder "Quick note (optional)"
5. **Save button** — saves log, updates inventory snapshot, closes sheet

When stressed/sick selected: prompt appears "Want to snap a photo for diagnosis?" with camera button.

Styling: bottom-sheet slide-up pattern (matching existing modals). Forest green pills, terracotta for stressed/sick. 44px minimum touch targets.

## UI: Health History in Detail Modal

New collapsible section "Health History" in item detail modal, below Care Profile. Plants only.

- Collapsed by default, same accordion pattern as Plant Status / Care Profile
- Timeline entries, newest first:
  - Date (e.g. "Mar 26, 2026")
  - Health badge (color-coded: green=thriving/healthy, red=stressed/sick, gray=dormant/new)
  - Flowering badge if set
  - Notes text if present
  - Thumbnail photo if present (tappable for full size)
  - Diagnosis summary if present (expandable card)
- Empty state: "No health checks yet. Use the pulse icon on the card to log one."
- Show last 10 entries with "Show more" link for older ones

## AI Diagnosis Flow

1. User selects stressed/sick, taps camera button
2. Photo captured via existing camera/gallery picker
3. Upload to Supabase Storage: `{user_id}/health_{timestamp}.jpg`
4. Health log saved immediately (with image_url, without diagnosis)
5. Bottom sheet closes. Toast: "Health check saved. Analyzing photo..."
6. Call garden-assistant edge function with action `"diagnose"`:
   ```json
   {
     "action": "diagnose",
     "data": {
       "imageUrl": "...",
       "common": "Firebush",
       "scientific": "Hamelia patens",
       "health": "stressed",
       "notes": "Leaves yellowing"
     }
   }
   ```
7. Claude Sonnet analyzes photo, returns:
   ```json
   {
     "cause": "Iron chlorosis from alkaline soil",
     "severity": "moderate",
     "action": "Apply chelated iron supplement. Amend soil with sulfur to lower pH.",
     "details": "Yellowing between leaf veins while veins stay green is classic iron deficiency..."
   }
   ```
8. Update health_log row with diagnosis. Emit `'item-updated'` to refresh detail modal if open.
9. If diagnosis fails, health log is still saved. Toast: "Couldn't analyze the photo. Your health check was still saved."

## Edge Function Changes

`garden-assistant` gets a new `"diagnose"` action branch:
- **Model:** Claude Sonnet (claude-sonnet-4-20250514) — needs vision for photo analysis
- **Input:** image URL (fetched + base64 converted in edge function, chunked approach), plant name, status, notes
- **Output:** JSON with cause, severity, action, details
- **Error handling:** Returns error JSON, does not throw. Client handles gracefully.

## File Changes

| File | Changes |
|------|---------|
| `js/features.js` | `openHealthLog()`, `saveHealthLog()`, `renderHealthHistory()`, `toggleHealthHistory()`, photo capture + diagnosis flow |
| `js/app.js` | Import and window-bind new functions |
| `js/inventory.js` | Pulse icon on plant cards, Health History section in detail modal |
| `css/components.css` | Health log bottom sheet, status pills, timeline entries, diagnosis card |
| `css/screens.css` | Bottom sheet slide-up animation |
| `index.html` | Health log bottom sheet markup, cache versions bumped to v=12 |
| `supabase/functions/garden-assistant/index.ts` | New `"diagnose"` action with Claude Sonnet vision |
| `supabase/migrations/create_health_logs_table.sql` | New table + RLS policies |

## Testing

Manual verification checklist:
- [ ] Quick-log bottom sheet opens from pulse icon on plant cards
- [ ] Bottom sheet does NOT appear on bug/insect cards
- [ ] All 6 health pills selectable, pre-selects current status
- [ ] Flowering pills optional, pre-selects if set
- [ ] Save creates health_log row and updates inventory health/flowering columns
- [ ] Stressed/sick selection prompts for photo
- [ ] Photo uploads to Supabase Storage successfully
- [ ] AI diagnosis returns and displays in health history
- [ ] Diagnosis failure doesn't block the health log save
- [ ] Health History section appears in detail modal for plants only
- [ ] Timeline shows entries newest-first with correct badges
- [ ] Photos display as thumbnails, tappable for full size
- [ ] "Show more" pagination works when >10 entries
- [ ] Empty state message shows when no logs exist
- [ ] Deleting a plant cascades and removes its health logs
- [ ] RLS: users can only see their own health logs
- [ ] All touch targets >= 44px on iPhone Safari (390px viewport)
- [ ] Edge function deploys cleanly

## Documentation Updates

After implementation, update:
- [ ] `CLAUDE.md` — add health_logs table schema, update features.js description, add diagnose action to edge function docs
- [ ] `PROJECT-STATE.md` — add health tracking to feature list, document new table
- [ ] `CLAUDE-CODE-PROMPT.md` — mark Plant Health Tracking as DONE in priority list
- [ ] `PROJECT-CONTEXT.md` — document diagnose edge function action if any gotchas arise
