# Plant Health Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add health check logging with history timeline and AI-powered diagnosis for stressed/sick plants.

**Architecture:** New `health_logs` table stores timestamped health entries per plant. Quick-log modal (pulse icon on plant cards) for fast check-ins. Health History collapsible section in detail modal shows timeline. Garden-assistant edge function gets a `diagnose` action using Claude Sonnet vision.

**Tech Stack:** Vanilla JS/HTML/CSS, Supabase (Postgres + Storage + Edge Functions on Deno), Claude Sonnet API (vision)

**Spec:** `docs/superpowers/specs/2026-03-26-plant-health-tracking-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/create_health_logs_table.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Health Logs table for plant health tracking
-- Run this SQL in the Supabase SQL Editor.

create table health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  inventory_id uuid references inventory(id) on delete cascade not null,
  health text not null,
  flowering text,
  notes text default '',
  image_url text,
  diagnosis jsonb,
  logged_at timestamptz default now()
);

alter table health_logs enable row level security;

create policy "Users can read own health logs" on health_logs for select using (auth.uid() = user_id);
create policy "Users can insert own health logs" on health_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own health logs" on health_logs for update using (auth.uid() = user_id);
create policy "Users can delete own health logs" on health_logs for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Go to Supabase Dashboard > SQL Editor, paste and run the SQL above.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify table exists**

In Supabase Dashboard > Table Editor, confirm `health_logs` table appears with all columns and RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/create_health_logs_table.sql
git commit -m "Add health_logs table migration"
```

---

### Task 2: Edge Function — Diagnose Action

**Files:**
- Modify: `supabase/functions/garden-assistant/index.ts`

**Reference:** The identify-species edge function's image handling pattern is documented in `PROJECT-CONTEXT.md:115-158`. Use the same 8KB chunked base64 approach.

- [ ] **Step 1: Add diagnose action branch**

In `index.ts`, add `else if (action === "diagnose")` at line 25 (before the `else` block):

```typescript
    } else if (action === "diagnose") {
      result = await diagnosePlant(data, anthropicKey);
    } else {
```

- [ ] **Step 2: Write the diagnosePlant function**

Add after the `generateReminders` function (after line 171):

```typescript
async function diagnosePlant(
  data: { imageUrl: string; common: string; scientific: string; health: string; notes: string },
  anthropicKey: string
) {
  const { imageUrl, common, scientific, health, notes } = data;

  if (!imageUrl) throw new Error("No image URL provided for diagnosis");

  // Fetch image and convert to base64 (8KB chunked approach)
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error("Could not fetch image: " + imgResponse.status);
  const imgBuffer = await imgResponse.arrayBuffer();

  const bytes = new Uint8Array(imgBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);

  const prompt = `You are a Tampa Bay, Florida (USDA Zone 9b/10a) gardening expert and plant pathologist.

This ${common} (${scientific || "unknown species"}) appears ${health}. ${notes ? "The gardener notes: " + notes : ""}

Analyze the photo and diagnose what might be wrong. Return ONLY a JSON object with exactly these fields:
{
  "cause": "Most likely cause of the issue (e.g. 'Iron chlorosis from alkaline soil')",
  "severity": "mild" or "moderate" or "severe",
  "action": "Specific recommended treatment for Tampa Bay climate and conditions",
  "details": "2-3 sentence explanation of the diagnosis, what signs you see, and why the recommended action should help"
}

Be specific to Tampa Bay's subtropical climate, sandy alkaline soil, humidity, and common local pests/diseases. Return ONLY the JSON object, no other text.`;

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64,
            },
          },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    throw new Error("Claude API error: " + errText);
  }

  const claudeResult = await claudeResponse.json();
  const text = claudeResult.content[0].text.trim();
  const clean = text.replace(/```json|```/g, "").trim();
  const diagnosis = JSON.parse(clean);

  return { diagnosis };
}
```

- [ ] **Step 3: Deploy the edge function**

```bash
npx supabase functions deploy garden-assistant --project-ref itjvgruwvlrrlhsknwiw
```

Expected: "Deployed Functions on project itjvgruwvlrrlhsknwiw: garden-assistant"

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/garden-assistant/index.ts
git commit -m "Add diagnose action to garden-assistant edge function"
```

---

### Task 3: Health Log Modal — HTML + CSS

**Files:**
- Modify: `index.html:302-305` (add modal before closing scripts)
- Modify: `css/components.css` (add health log styles)

- [ ] **Step 1: Add health log modal HTML**

In `index.html`, add after the natives-modal closing `</div>` (line 302) and before the `<script>` tags (line 304):

```html
<!-- Health log modal -->
<div class="modal-overlay" id="health-log-modal" onclick="closeModal('health-log-modal')">
    <div class="modal-sheet" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal('health-log-modal')">✕</button>
        <h2 class="modal-title" id="health-log-title">Health Check</h2>
        <input type="hidden" id="health-log-item-id">

        <label class="field-label">How is it doing?</label>
        <div class="health-pills" id="health-pills">
            <button class="health-pill" data-value="thriving" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='none'">Thriving</button>
            <button class="health-pill" data-value="healthy" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='none'">Healthy</button>
            <button class="health-pill health-pill-warn" data-value="stressed" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='block'">Stressed</button>
            <button class="health-pill health-pill-warn" data-value="sick" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='block'">Sick</button>
            <button class="health-pill" data-value="dormant" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='none'">Dormant</button>
            <button class="health-pill" data-value="new" onclick="document.querySelectorAll('#health-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active');document.getElementById('health-photo-prompt').style.display='none'">New</button>
        </div>

        <div id="health-photo-prompt" style="display:none;">
            <p class="health-photo-text">Want to snap a photo for diagnosis?</p>
            <label class="btn-secondary health-camera-btn">
                📷 Take photo
                <input type="file" accept="image/*" capture="environment" id="health-photo-input" onchange="window._healthPhotoSelected(event)" style="display:none;">
            </label>
            <div id="health-photo-preview" style="display:none;">
                <img id="health-photo-img" class="health-photo-thumb">
                <button class="health-photo-remove" onclick="window._healthRemovePhoto()">✕</button>
            </div>
        </div>

        <label class="field-label">Flowering</label>
        <div class="health-pills health-pills-sm" id="flowering-pills">
            <button class="health-pill health-pill-sm" data-value="yes" onclick="document.querySelectorAll('#flowering-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">Flowering</button>
            <button class="health-pill health-pill-sm" data-value="budding" onclick="document.querySelectorAll('#flowering-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">Budding</button>
            <button class="health-pill health-pill-sm" data-value="no" onclick="document.querySelectorAll('#flowering-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">No</button>
            <button class="health-pill health-pill-sm" data-value="fruiting" onclick="document.querySelectorAll('#flowering-pills .health-pill').forEach(p=>p.classList.remove('active'));this.classList.add('active')">Fruiting</button>
        </div>

        <label class="field-label">Quick note</label>
        <input class="field" id="health-log-notes" placeholder="Quick note (optional)">

        <button class="btn-primary" id="health-log-save-btn" onclick="saveHealthLog()" style="margin-top:var(--space-4)">Save health check</button>
    </div>
</div>
```

- [ ] **Step 2: Bump cache versions in index.html**

Change all `?v=11` to `?v=12` in index.html (lines 15-17 and 305):
- `css/base.css?v=12`
- `css/components.css?v=12`
- `css/screens.css?v=12`
- `js/app.js?v=12`

- [ ] **Step 3: Add health pill and photo CSS to components.css**

Append to `css/components.css`:

```css
/* ── Health log modal ─────────────────────────────────────────── */
.health-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: var(--space-4);
}
.health-pill {
    padding: 10px 16px;
    border: 2px solid var(--green);
    border-radius: 20px;
    background: transparent;
    color: var(--green);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    transition: background 150ms, color 150ms;
    user-select: none;
    -webkit-user-select: none;
}
.health-pill.active {
    background: var(--green);
    color: #fff;
}
.health-pill-warn {
    border-color: var(--terracotta);
    color: var(--terracotta);
}
.health-pill-warn.active {
    background: var(--terracotta);
    border-color: var(--terracotta);
    color: #fff;
}
.health-pill:active { opacity: 0.7; }
.health-pills-sm { gap: 6px; }
.health-pill-sm {
    padding: 6px 12px;
    font-size: var(--text-xs);
    min-height: 44px;
}
.health-photo-text {
    font-size: var(--text-sm);
    color: var(--ink-mid);
    margin-bottom: 8px;
}
.health-camera-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    min-height: 44px;
}
.health-photo-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: var(--radius);
    margin-top: 8px;
}
#health-photo-preview {
    position: relative;
    display: inline-block;
}
.health-photo-remove {
    position: absolute;
    top: 4px;
    right: -8px;
    background: var(--terracotta);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ── Health history timeline ──────────────────────────────────── */
.health-history-section {
    margin-top: var(--space-4);
}
.health-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 10px 0;
    min-height: 44px;
}
.health-history-header:active { opacity: 0.7; }
.health-history-body { padding-top: 8px; }
.health-log-entry {
    padding: 12px 0;
    border-bottom: 1px solid var(--cream-dark);
}
.health-log-entry:last-child { border-bottom: none; }
.health-log-date {
    font-size: var(--text-xs);
    color: var(--ink-light);
    margin-bottom: 4px;
}
.health-log-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
}
.health-log-notes {
    font-size: var(--text-sm);
    color: var(--ink-mid);
    margin-top: 4px;
}
.health-log-photo {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: var(--radius);
    margin-top: 6px;
    cursor: pointer;
}
.health-diagnosis-card {
    background: var(--cream);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-top: 8px;
    font-size: var(--text-sm);
}
.health-diagnosis-card .diagnosis-label {
    font-weight: 500;
    color: var(--green);
    font-size: var(--text-xs);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.health-diagnosis-card .diagnosis-cause {
    font-weight: 500;
    margin-bottom: 4px;
}
.health-diagnosis-card .diagnosis-action {
    color: var(--ink-mid);
}
.severity-mild { border-left: 3px solid #f0ad4e; }
.severity-moderate { border-left: 3px solid var(--terracotta); }
.severity-severe { border-left: 3px solid #d9534f; }
.health-show-more {
    text-align: center;
    padding: 12px;
    color: var(--green);
    font-size: var(--text-sm);
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.health-show-more:active { opacity: 0.7; }
.health-empty {
    text-align: center;
    padding: var(--space-6) var(--space-4);
    color: var(--ink-light);
    font-size: var(--text-sm);
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html css/components.css
git commit -m "Add health log modal HTML and health tracking CSS"
```

---

### Task 4: Health Log Functions in features.js

**Files:**
- Modify: `js/features.js` (add functions after reminders section, ~line 760)

- [ ] **Step 0: Add closeModal to features.js import**

In `js/features.js` line 2, add `closeModal` to the import from `./app.js`:

Change:
```javascript
import { sb, getCurrentUser, getAllInventory, emit, SUPABASE_URL, SUPABASE_ANON_KEY, PRESET_TAGS, LOCATION_ZONES, LOCATION_HABITATS, openModal } from './app.js';
```
to:
```javascript
import { sb, getCurrentUser, getAllInventory, emit, SUPABASE_URL, SUPABASE_ANON_KEY, PRESET_TAGS, LOCATION_ZONES, LOCATION_HABITATS, openModal, closeModal } from './app.js';
```

- [ ] **Step 1: Add openHealthLog function**

Append to `js/features.js`:

```javascript
// ── Health log (quick check-in) ──────────────────────────────
let _healthPhotoFile = null;

export function openHealthLog(itemId) {
    const item = getAllInventory().find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('health-log-item-id').value = itemId;
    document.getElementById('health-log-title').textContent = item.common;
    document.getElementById('health-log-notes').value = '';
    document.getElementById('health-photo-prompt').style.display = 'none';
    document.getElementById('health-photo-preview').style.display = 'none';
    _healthPhotoFile = null;

    // Pre-select current health
    document.querySelectorAll('#health-pills .health-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.value === item.health);
    });

    // Show/hide photo prompt based on current health selection
    if (item.health === 'stressed' || item.health === 'sick') {
        document.getElementById('health-photo-prompt').style.display = 'block';
    }

    // Pre-select current flowering
    document.querySelectorAll('#flowering-pills .health-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.value === item.flowering);
    });

    openModal('health-log-modal');
}

// Photo handling for health log
window._healthPhotoSelected = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    _healthPhotoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('health-photo-img').src = e.target.result;
        document.getElementById('health-photo-preview').style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
};

window._healthRemovePhoto = function() {
    _healthPhotoFile = null;
    document.getElementById('health-photo-input').value = '';
    document.getElementById('health-photo-preview').style.display = 'none';
};
```

- [ ] **Step 2: Add saveHealthLog function**

Continue in `js/features.js`:

```javascript
export async function saveHealthLog() {
    const itemId = document.getElementById('health-log-item-id').value;
    const item = getAllInventory().find(i => i.id === itemId);
    if (!item) return;

    const healthPill = document.querySelector('#health-pills .health-pill.active');
    const flowerPill = document.querySelector('#flowering-pills .health-pill.active');
    const health = healthPill ? healthPill.dataset.value : null;
    const flowering = flowerPill ? flowerPill.dataset.value : null;
    const notes = document.getElementById('health-log-notes').value.trim();

    if (!health) { alert('Please select a health status.'); return; }

    const btn = document.getElementById('health-log-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        // Upload photo if provided
        let imageUrl = null;
        if (_healthPhotoFile) {
            const timestamp = Date.now();
            const path = `${getCurrentUser().id}/health_${timestamp}.jpg`;

            // Resize image using offscreen canvas
            const bitmap = await createImageBitmap(_healthPhotoFile);
            const canvas = document.createElement('canvas');
            const maxW = 900;
            const scale = Math.min(1, maxW / bitmap.width);
            canvas.width = bitmap.width * scale;
            canvas.height = bitmap.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));

            const { error: uploadErr } = await sb.storage.from('garden-images').upload(path, blob, {
                contentType: 'image/jpeg', upsert: false
            });
            if (uploadErr) throw uploadErr;

            const { data: urlData } = sb.storage.from('garden-images').getPublicUrl(path);
            imageUrl = urlData.publicUrl;
        }

        // Insert health log
        const { data: logData, error: logErr } = await sb.from('health_logs').insert({
            user_id: getCurrentUser().id,
            inventory_id: itemId,
            health,
            flowering,
            notes,
            image_url: imageUrl,
        }).select().single();

        if (logErr) throw logErr;

        // Update inventory snapshot
        const updates = { health };
        if (flowering) updates.flowering = flowering;
        await sb.from('inventory').update(updates).eq('id', itemId).eq('user_id', getCurrentUser().id);

        // Update local cache
        const idx = getAllInventory().findIndex(i => i.id === itemId);
        if (idx !== -1) Object.assign(getAllInventory()[idx], updates);

        closeModal('health-log-modal');

        // If photo was taken for stressed/sick, run diagnosis in background
        if (imageUrl && (health === 'stressed' || health === 'sick')) {
            alert('Health check saved. Analyzing photo...');
            runDiagnosis(logData.id, itemId, imageUrl, item.common, item.scientific, health, notes);
        } else {
            alert('Health check saved!');
        }

        emit('item-updated', { itemId });

    } catch (err) {
        console.error('Failed to save health log:', err);
        alert('Could not save health check. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save health check';
        _healthPhotoFile = null;
    }
}

async function runDiagnosis(logId, itemId, imageUrl, common, scientific, health, notes) {
    try {
        const response = await fetch(
            SUPABASE_URL + '/functions/v1/garden-assistant',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    action: 'diagnose',
                    data: { imageUrl, common, scientific, health, notes }
                }),
            }
        );

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // Save diagnosis to the health log
        await sb.from('health_logs')
            .update({ diagnosis: result.diagnosis })
            .eq('id', logId)
            .eq('user_id', getCurrentUser().id);

        emit('item-updated', { itemId });

    } catch (err) {
        console.error('Diagnosis failed:', err);
        alert("Couldn't analyze the photo. Your health check was still saved.");
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add js/features.js
git commit -m "Add openHealthLog and saveHealthLog with photo + diagnosis"
```

---

### Task 5: Health History in Detail Modal

**Files:**
- Modify: `js/features.js` (add renderHealthHistory and toggleHealthHistory)
- Modify: `js/inventory.js:229` (add health history section to detail modal)

- [ ] **Step 1: Add renderHealthHistory and toggleHealthHistory to features.js**

Append to `js/features.js`:

```javascript
// ── Health history (detail modal) ────────────────────────────
let _healthHistoryOffset = 0;
const HEALTH_PAGE_SIZE = 10;

export function renderHealthHistory(item) {
    if (item.type !== 'plant') return '';

    return `
        <div class="health-history-section">
            <div class="health-history-header" onclick="toggleHealthHistory('${item.id}')">
                <h3 class="care-profile-title">Health History</h3>
                <span class="care-toggle" id="health-history-toggle">▶</span>
            </div>
            <div id="health-history-body" class="health-history-body" style="display:none;">
                <div id="health-history-list">Loading...</div>
            </div>
        </div>`;
}

export async function toggleHealthHistory(itemId) {
    const body = document.getElementById('health-history-body');
    const icon = document.getElementById('health-history-toggle');
    if (!body) return;
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.textContent = isHidden ? '▼' : '▶';

    if (isHidden) {
        _healthHistoryOffset = 0;
        try {
            await loadHealthHistoryPage(itemId, true);
        } catch (err) {
            console.error('Failed to load health history:', err);
            const list = document.getElementById('health-history-list');
            if (list) list.innerHTML = '<div class="health-empty">Could not load health history.</div>';
        }
    }
}

async function loadHealthHistoryPage(itemId, replace) {
    const list = document.getElementById('health-history-list');
    if (!list) return;

    const { data, error } = await sb.from('health_logs')
        .select('*')
        .eq('inventory_id', itemId)
        .eq('user_id', getCurrentUser().id)
        .order('logged_at', { ascending: false })
        .range(_healthHistoryOffset, _healthHistoryOffset + HEALTH_PAGE_SIZE - 1);

    if (error) {
        console.error('Failed to load health history:', error);
        list.innerHTML = '<div class="health-empty">Could not load health history.</div>';
        return;
    }

    if (data.length === 0 && _healthHistoryOffset === 0) {
        list.innerHTML = '<div class="health-empty">No health checks yet. Use the 💓 icon on the card to log one.</div>';
        return;
    }

    const html = data.map(log => {
        const date = new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const hClass = (log.health === 'thriving' || log.health === 'healthy') ? 'health-good'
            : (log.health === 'stressed' || log.health === 'sick') ? 'health-bad' : 'health-neutral';

        let badges = `<span class="tag ${hClass}">${log.health}</span>`;
        if (log.flowering) badges += `<span class="tag season">${log.flowering}</span>`;

        let photo = '';
        if (log.image_url) {
            photo = `<img class="health-log-photo" src="${log.image_url}" alt="Health check photo" onclick="window.open('${log.image_url}', '_blank')">`;
        }

        let diagnosis = '';
        if (log.diagnosis) {
            const d = log.diagnosis;
            diagnosis = `
                <div class="health-diagnosis-card severity-${d.severity || 'mild'}">
                    <div class="diagnosis-label">Diagnosis</div>
                    <div class="diagnosis-cause">${d.cause || ''}</div>
                    <div class="diagnosis-action">${d.action || ''}</div>
                    ${d.details ? `<div class="diagnosis-details" style="margin-top:4px;font-size:var(--text-xs);color:var(--ink-light);">${d.details}</div>` : ''}
                </div>`;
        }

        return `
            <div class="health-log-entry">
                <div class="health-log-date">${date}</div>
                <div class="health-log-badges">${badges}</div>
                ${log.notes ? `<div class="health-log-notes">${log.notes}</div>` : ''}
                ${photo}
                ${diagnosis}
            </div>`;
    }).join('');

    if (replace) {
        list.innerHTML = html;
    } else {
        // Remove existing "Show more" before appending
        const existing = list.querySelector('.health-show-more');
        if (existing) existing.remove();
        list.insertAdjacentHTML('beforeend', html);
    }

    // Add "Show more" if we got a full page
    if (data.length === HEALTH_PAGE_SIZE) {
        _healthHistoryOffset += HEALTH_PAGE_SIZE;
        list.insertAdjacentHTML('beforeend',
            `<div class="health-show-more" onclick="loadMoreHealthHistory('${itemId}')">Show more</div>`);
    }
}

export async function loadMoreHealthHistory(itemId) {
    await loadHealthHistoryPage(itemId, false);
}
```

- [ ] **Step 2: Add health history to showItemDetail in inventory.js**

In `js/inventory.js`, at line 229, change:

```javascript
        ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
        ${renderCareProfile(item)}
```

to:

```javascript
        ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
        ${item.type === 'plant' ? renderHealthHistory(item) : ''}
        ${renderCareProfile(item)}
```

- [ ] **Step 3: Add renderHealthHistory import to inventory.js**

In `js/inventory.js`, find the import from `./features.js` and add `renderHealthHistory`:

```javascript
import { renderTagEditor, renderBugPlantLink, renderLinkedBugs, renderPlantStatus, renderCareProfile, renderHealthHistory } from './features.js';
```

- [ ] **Step 4: Commit**

```bash
git add js/features.js js/inventory.js
git commit -m "Add health history timeline in detail modal"
```

---

### Task 6: Pulse Icon on Plant Cards + App.js Wiring

**Files:**
- Modify: `js/inventory.js:155-179` (add pulse icon to plant cards)
- Modify: `js/app.js:278` (add imports)
- Modify: `js/app.js:320-322` (add window bindings)

- [ ] **Step 1: Add pulse icon to plant cards**

In `js/inventory.js`, in the `renderInventory` function, after building `card.innerHTML` (around line 177), add the pulse icon for plants. Change:

```javascript
        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>`;
        grid.appendChild(card);
```

to:

```javascript
        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>
            ${item.type === 'plant' ? `<button class="health-pulse-btn" onclick="event.stopPropagation();openHealthLog('${item.id}')" aria-label="Health check">💓</button>` : ''}`;
        grid.appendChild(card);
```

- [ ] **Step 2: Add pulse button CSS to components.css**

Append to `css/components.css`:

```css
/* ── Health pulse icon on plant cards ─────────────────────────── */
.garden-card {
    position: relative;
}
.health-pulse-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 36px;
    height: 36px;
    border: none;
    background: rgba(255,255,255,0.9);
    border-radius: 50%;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    min-height: 44px;
    min-width: 44px;
    padding: 0;
}
.health-pulse-btn:active { opacity: 0.7; }
```

- [ ] **Step 3: Update app.js imports**

In `js/app.js` line 278, add the new functions to the features.js import:

Change:
```javascript
import { toggleTag, removeTag, addCustomTag, toggleBugPlantLink, saveBugPlantLink, togglePlantStatus, setLocationZone, setLocationHabitat, savePlantStatus, refreshCareProfile, toggleCareProfile, parseLocation, buildLocation, loadReminders, toggleReminderDone, addCustomReminder, removeReminder, toggleRemindersSection } from './features.js';
```

to:
```javascript
import { toggleTag, removeTag, addCustomTag, toggleBugPlantLink, saveBugPlantLink, togglePlantStatus, setLocationZone, setLocationHabitat, savePlantStatus, refreshCareProfile, toggleCareProfile, parseLocation, buildLocation, loadReminders, toggleReminderDone, addCustomReminder, removeReminder, toggleRemindersSection, openHealthLog, saveHealthLog, toggleHealthHistory, loadMoreHealthHistory } from './features.js';
```

- [ ] **Step 4: Add window bindings in app.js**

In `js/app.js`, after the Reminders line (line 322), add:

```javascript
    // Health
    openHealthLog, saveHealthLog, toggleHealthHistory, loadMoreHealthHistory,
```

- [ ] **Step 5: Commit**

```bash
git add js/inventory.js js/app.js css/components.css
git commit -m "Add pulse icon on plant cards and wire up health log functions"
```

---

### Task 7: Manual Testing

**Files:** None (verification only)

**Reference:** Testing checklist from spec at `docs/superpowers/specs/2026-03-26-plant-health-tracking-design.md`

- [ ] **Step 1: Test quick-log flow**

Open the app at 390px viewport. Verify:
- Pulse icon (💓) appears on plant cards only, not bug cards
- Tapping pulse opens the health log modal with correct plant name
- Current health status is pre-selected
- All 6 health pills are tappable, only one active at a time
- Flowering pills work the same way
- Selecting stressed/sick shows photo prompt
- Save without photo works (creates health_log row, updates inventory health)

- [ ] **Step 2: Test photo + diagnosis flow**

- Select "stressed", tap camera, take/select a photo
- Photo preview appears with remove button
- Save creates health_log with image_url
- Alert shows "Analyzing photo..."
- After a moment, diagnosis appears in health history
- Verify diagnosis shows cause, severity, action in the card

- [ ] **Step 3: Test health history**

- Open plant detail modal
- Expand "Health History" section
- Verify entries appear newest-first with correct badges
- Photos show as thumbnails, tappable for full size
- Diagnosis cards show with severity color coding
- Empty state shows correct message for plants with no logs

- [ ] **Step 4: Test edge cases**

- Verify RLS: log in as different user, confirm no cross-user data
- Delete a plant, verify its health_logs are cascade-deleted
- Test with >10 logs: "Show more" pagination works
- All touch targets >= 44px

- [ ] **Step 5: Commit any test-driven fixes**

```bash
git add -A
git commit -m "Fix issues found during health tracking testing"
```

---

### Task 8: Documentation Updates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PROJECT-STATE.md`
- Modify: `CLAUDE-CODE-PROMPT.md`

- [ ] **Step 1: Update CLAUDE.md**

Add `health_logs` table schema to the Supabase section (after the `reminders` table). Update `js/features.js` description to include health logging. Add `diagnose` action to edge function docs.

- [ ] **Step 2: Update PROJECT-STATE.md**

Add Plant Health Tracking to the feature list with description of quick-log, history timeline, and AI diagnosis.

- [ ] **Step 3: Update CLAUDE-CODE-PROMPT.md**

Mark Plant Health Tracking as **DONE** in the priority list (line 165):

```markdown
3. ~~Plant Health Tracking (extends existing detail view)~~ **DONE** — quick-log from card, health history timeline in detail modal, AI diagnosis for stressed/sick plants via Claude Sonnet
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md PROJECT-STATE.md CLAUDE-CODE-PROMPT.md
git commit -m "Update docs for plant health tracking feature"
```

- [ ] **Step 5: Push to main**

```bash
git push origin main
```
