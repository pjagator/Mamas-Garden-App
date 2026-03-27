// ── Features: tags, bug-plant linking, plant status, care profiles ──
import { sb, getCurrentUser, getAllInventory, emit, SUPABASE_URL, SUPABASE_ANON_KEY, PRESET_TAGS, LOCATION_ZONES, LOCATION_HABITATS, openModal, closeModal } from './app.js';

// ── Shared expandable section toggle ──────────────────────────
function toggleSection(bodyId, chevronId) {
    const body = document.getElementById(bodyId);
    const chevron = document.getElementById(chevronId);
    if (!body) return;

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (body.style.height && body.style.height !== '0px') {
        // Collapse
        if (isReducedMotion) {
            body.style.height = '0px';
        } else {
            body.style.height = body.scrollHeight + 'px';
            requestAnimationFrame(() => {
                body.style.transition = 'height 300ms ease';
                body.style.height = '0px';
            });
        }
        chevron?.classList.remove('open');
    } else {
        // Expand
        if (isReducedMotion) {
            body.style.height = 'auto';
        } else {
            body.style.transition = 'height 300ms ease';
            body.style.height = body.scrollHeight + 'px';
            const handler = () => {
                if (body.style.height !== '0px') body.style.height = 'auto';
                body.removeEventListener('transitionend', handler);
            };
            body.addEventListener('transitionend', handler);
        }
        chevron?.classList.add('open');
    }
}

export function toggleLinkedBugs() { toggleSection('linked-bugs-body', 'linked-bugs-toggle-icon'); }

// ── Tag editor ────────────────────────────────────────────────
export function renderTagEditor(item) {
    const currentTags = item.tags || [];
    const presetChips = PRESET_TAGS.map(t => {
        const active = currentTags.includes(t);
        return `<button class="tag-chip ${active ? 'active' : ''}" onclick="toggleTag('${item.id}', '${t}')">${t}</button>`;
    }).join('');

    const customTags = currentTags.filter(t => !PRESET_TAGS.includes(t));
    const customChips = customTags.map(t =>
        `<span class="tag-chip active">${t} <button onclick="removeTag('${item.id}', '${t}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px;font-size:1.1em;">&times;</button></span>`
    ).join('');

    return `<div class="detail-card">
        <div class="detail-card-heading">Tags</div>
        <div class="tag-chips-row">${presetChips}${customChips}</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
            <input class="field" id="custom-tag-input" placeholder="Custom tag..." style="flex:1;">
            <button class="btn-secondary" onclick="addCustomTag('${item.id}')">Add</button>
        </div>
    </div>`;
}

export async function toggleTag(itemId, tag) {
    const idx = getAllInventory().findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = getAllInventory()[idx];
    let tags = [...(item.tags || [])];
    if (tags.includes(tag)) tags = tags.filter(t => t !== tag);
    else tags.push(tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', getCurrentUser().id);
    if (error) { alert('Error: ' + error.message); return; }
    getAllInventory()[idx].tags = tags;
    emit('item-updated', { itemId });
}

export async function removeTag(itemId, tag) {
    const idx = getAllInventory().findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const tags = (getAllInventory()[idx].tags || []).filter(t => t !== tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', getCurrentUser().id);
    if (error) { alert('Error: ' + error.message); return; }
    getAllInventory()[idx].tags = tags;
    emit('item-updated', { itemId });
}

export async function addCustomTag(itemId) {
    const input = document.getElementById('custom-tag-input');
    const tag = input.value.trim();
    if (!tag) return;
    const idx = getAllInventory().findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const tags = [...(getAllInventory()[idx].tags || [])];
    if (tags.includes(tag)) { input.value = ''; return; }
    tags.push(tag);

    const { error } = await sb.from('inventory').update({ tags }).eq('id', itemId).eq('user_id', getCurrentUser().id);
    if (error) { alert('Error: ' + error.message); return; }
    getAllInventory()[idx].tags = tags;
    input.value = '';
    emit('item-updated', { itemId });
}

// ── Bug ↔ Plant linking ───────────────────────────────────────
export function renderBugPlantLink(item) {
    const plants = getAllInventory().filter(i => i.type === 'plant');
    const currentVal = item.linked_plant_id || '';
    const linkedPlant = currentVal === 'ground' ? null : plants.find(p => p.id === currentVal);
    const displayText = currentVal === 'ground' ? 'Ground'
        : linkedPlant ? linkedPlant.common : '';

    let optionsHtml = '<option value="">-- None --</option>';
    optionsHtml += `<option value="ground" ${currentVal === 'ground' ? 'selected' : ''}>Ground</option>`;
    plants.sort((a, b) => a.common.localeCompare(b.common)).forEach(p => {
        optionsHtml += `<option value="${p.id}" ${currentVal === p.id ? 'selected' : ''}>${p.common}</option>`;
    });

    return `
        <div class="detail-card-expandable">
            <div class="detail-card-header" onclick="toggleBugPlantLink()">
                <div>
                    <div class="detail-card-heading">Found On</div>
                    ${displayText ? `<div style="font-size:var(--text-xs);color:var(--ink-light);">${displayText}</div>` : ''}
                </div>
                <svg class="detail-card-chevron" id="bug-link-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="detail-card-body" id="bug-plant-link-body" style="height:0;overflow:hidden;">
                <div style="padding-top:var(--space-3);">
                <label class="field-label">Plant or location</label>
                <select class="field" id="bug-plant-select">
                    ${optionsHtml}
                </select>
                <button class="btn-primary" id="save-bug-link-btn" onclick="saveBugPlantLink('${item.id}')" style="margin-top:8px;">Save</button>
                </div>
            </div>
        </div>`;
}

export function toggleBugPlantLink() { toggleSection('bug-plant-link-body', 'bug-link-toggle-icon'); }

export async function saveBugPlantLink(itemId) {
    const val = document.getElementById('bug-plant-select').value || null;
    const btn = document.getElementById('save-bug-link-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const { error } = await sb.from('inventory')
            .update({ linked_plant_id: val })
            .eq('id', itemId)
            .eq('user_id', getCurrentUser().id);
        if (error) throw error;

        const idx = getAllInventory().findIndex(i => i.id === itemId);
        if (idx !== -1) getAllInventory()[idx].linked_plant_id = val;

        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Save';
        }, 1500);
        emit('item-updated', { itemId });
    } catch (err) {
        alert('Error saving: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

export function renderLinkedBugs(item) {
    const bugs = getAllInventory().filter(i => i.type === 'bug' && i.linked_plant_id === item.id);
    if (!bugs.length) return '';

    return `
        <div class="detail-card-expandable">
            <div class="detail-card-header" onclick="toggleLinkedBugs()">
                <div>
                    <div class="detail-card-heading">Visitors</div>
                    <div style="font-size:var(--text-xs);color:var(--ink-light);">${bugs.length} visitor${bugs.length !== 1 ? 's' : ''} observed</div>
                </div>
                <svg class="detail-card-chevron open" id="linked-bugs-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="detail-card-body" id="linked-bugs-body">
                ${bugs.map(b => `
                    <div class="linked-bug-row" onclick="showLinkedBug('${b.id}')">
                        <span class="linked-bug-icon">🐛</span>
                        <span class="linked-bug-name">${b.common}</span>
                        ${b.scientific ? `<span class="linked-bug-sci">${b.scientific}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;
}

// ── Plant status tracking ─────────────────────────────────────
export function renderPlantStatus(item) {
    return `
        <div class="detail-card-expandable">
            <div class="detail-card-header" onclick="togglePlantStatus()">
                <div class="detail-card-heading">Plant Status</div>
                <svg class="detail-card-chevron" id="status-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="detail-card-body" id="plant-status-body" style="height:0;overflow:hidden;">
                <div style="padding-top:var(--space-3);">
                <label class="field-label">Health</label>
                <select class="field" id="status-health">
                    <option value="">-- Select --</option>
                    <option value="thriving" ${item.health === 'thriving' ? 'selected' : ''}>Thriving</option>
                    <option value="healthy" ${item.health === 'healthy' ? 'selected' : ''}>Healthy</option>
                    <option value="stressed" ${item.health === 'stressed' ? 'selected' : ''}>Stressed</option>
                    <option value="sick" ${item.health === 'sick' ? 'selected' : ''}>Sick</option>
                    <option value="dormant" ${item.health === 'dormant' ? 'selected' : ''}>Dormant</option>
                    <option value="new" ${item.health === 'new' ? 'selected' : ''}>Newly planted</option>
                </select>

                <label class="field-label">Flowering</label>
                <select class="field" id="status-flowering">
                    <option value="">-- Select --</option>
                    <option value="yes" ${item.flowering === 'yes' ? 'selected' : ''}>Yes, flowering</option>
                    <option value="budding" ${item.flowering === 'budding' ? 'selected' : ''}>Budding</option>
                    <option value="no" ${item.flowering === 'no' ? 'selected' : ''}>Not flowering</option>
                    <option value="fruiting" ${item.flowering === 'fruiting' ? 'selected' : ''}>Fruiting</option>
                </select>

                <label class="field-label">Height</label>
                <input class="field" id="status-height" placeholder="e.g. 3 feet, 18 inches" value="${item.height || ''}">

                <label class="field-label">Location</label>
                <div class="tag-chips-row" style="margin-bottom:4px;">
                    ${LOCATION_ZONES.map(z => `<button class="tag-chip loc-zone-chip ${parseLocation(item.location).zone === z ? 'active' : ''}" data-val="${z}" onclick="setLocationZone('${item.id}', '${z}')">${z}</button>`).join('')}
                </div>
                <label class="field-label" style="margin-top:6px;">Habitat</label>
                <div class="tag-chips-row">
                    ${LOCATION_HABITATS.map(h => `<button class="tag-chip loc-habitat-chip ${parseLocation(item.location).habitat === h ? 'active' : ''}" data-val="${h}" onclick="setLocationHabitat('${item.id}', '${h}')">${h}</button>`).join('')}
                </div>

                <label class="field-label">Features / observations</label>
                <textarea class="field" id="status-features" rows="3" placeholder="e.g. Attracting pollinators, new growth, needs staking...">${item.features || ''}</textarea>

                <button class="btn-primary" id="save-status-btn" onclick="savePlantStatus('${item.id}')" style="margin-top:10px;">Save status</button>
                </div>
            </div>
        </div>`;
}

export function togglePlantStatus() { toggleSection('plant-status-body', 'status-toggle-icon'); }

// Parse location string like "Front, Hammock" into { zone, habitat }
export function parseLocation(loc) {
    if (!loc) return { zone: '', habitat: '' };
    const parts = loc.split(',').map(s => s.trim());
    let zone = '', habitat = '';
    for (const p of parts) {
        if (LOCATION_ZONES.includes(p)) zone = p;
        else if (LOCATION_HABITATS.includes(p)) habitat = p;
    }
    return { zone, habitat };
}

export function buildLocation(zone, habitat) {
    return [zone, habitat].filter(Boolean).join(', ');
}

export function setLocationZone(itemId, zone) {
    const idx = getAllInventory().findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const parsed = parseLocation(getAllInventory()[idx].location);
    parsed.zone = parsed.zone === zone ? '' : zone;
    getAllInventory()[idx].location = buildLocation(parsed.zone, parsed.habitat);
    // Update chips visually
    document.querySelectorAll('.loc-zone-chip').forEach(c => c.classList.toggle('active', c.dataset.val === parsed.zone));
}

export function setLocationHabitat(itemId, habitat) {
    const idx = getAllInventory().findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const parsed = parseLocation(getAllInventory()[idx].location);
    parsed.habitat = parsed.habitat === habitat ? '' : habitat;
    getAllInventory()[idx].location = buildLocation(parsed.zone, parsed.habitat);
    // Update chips visually
    document.querySelectorAll('.loc-habitat-chip').forEach(c => c.classList.toggle('active', c.dataset.val === parsed.habitat));
}

export async function savePlantStatus(itemId) {
    const health    = document.getElementById('status-health').value || null;
    const flowering = document.getElementById('status-flowering').value || null;
    const height    = document.getElementById('status-height').value.trim() || null;
    const features  = document.getElementById('status-features').value.trim() || null;
    const idx       = getAllInventory().findIndex(i => i.id === itemId);
    const location  = idx !== -1 ? (getAllInventory()[idx].location || null) : null;

    const btn = document.getElementById('save-status-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const { error } = await sb.from('inventory')
            .update({ health, flowering, height, location, features })
            .eq('id', itemId)
            .eq('user_id', getCurrentUser().id);

        if (error) throw error;

        // Update local cache
        const idx = getAllInventory().findIndex(i => i.id === itemId);
        if (idx !== -1) {
            Object.assign(getAllInventory()[idx], { health, flowering, height, location, features });
        }

        btn.textContent = 'Saved!';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Save status';
        }, 1500);

        emit('item-updated', { itemId });
    } catch (err) {
        alert('Error saving status: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Save status';
    }
}

// ── Care profile generation ───────────────────────────────────
export async function generateCareProfile(itemId, common, scientific, type, category) {
    if (type !== 'plant') return null;

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
                    action: 'care_profile',
                    data: { common, scientific, type, category }
                }),
            }
        );

        const result = await response.json();
        if (result.error) throw new Error(result.error);
        if (!result.care_profile) return null;

        const { error } = await sb.from('inventory')
            .update({ care_profile: result.care_profile })
            .eq('id', itemId)
            .eq('user_id', getCurrentUser().id);

        if (error) console.error('Failed to save care profile:', error);

        // Update local cache
        const idx = getAllInventory().findIndex(i => i.id === itemId);
        if (idx !== -1) getAllInventory()[idx].care_profile = result.care_profile;

        return result.care_profile;
    } catch (err) {
        console.error('Care profile generation failed:', err);
        return null;
    }
}

export async function refreshCareProfile(itemId) {
    const item = getAllInventory().find(i => i.id === itemId);
    if (!item) return;

    const section = document.getElementById('care-profile-section');
    if (section) {
        section.innerHTML = `
            <div class="detail-card-heading">Care Profile</div>
            <div class="spinner-wrap" style="padding:16px 0;">
                <div class="loading-dots"><span></span><span></span><span></span></div>
                <p class="spinner-label">Generating care profile...</p>
            </div>`;
    }

    const profile = await generateCareProfile(item.id, item.common, item.scientific, item.type, item.category);
    if (profile) {
        emit('item-updated', { itemId: item.id });
    } else {
        if (section) {
            section.innerHTML = `
                <div class="detail-card-heading">Care Profile</div>
                <p style="color:var(--terra);font-size:0.85em;">Failed to generate care profile. Try again later.</p>
                <button class="btn-secondary" onclick="refreshCareProfile('${itemId}')" style="margin-top:8px;font-size:0.85em;">Retry</button>`;
        }
    }
}

export function renderCareProfile(item) {
    if (item.type !== 'plant') return '';

    const cp = item.care_profile;

    if (!cp) {
        return `
            <div id="care-profile-section" class="detail-card-expandable">
                <div class="detail-card-heading">Care Profile</div>
                <p style="color:var(--ink-light);font-size:0.85em;margin-bottom:8px;">No care profile yet.</p>
                <button class="btn-secondary" onclick="refreshCareProfile('${item.id}')" style="font-size:0.85em;">Generate care profile</button>
            </div>`;
    }

    const sections = [];

    // Watering
    if (cp.watering) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">💧</div>
                <div>
                    <div class="care-label">Watering</div>
                    <div class="care-value">${cp.watering.frequency || ''}</div>
                    ${cp.watering.notes ? `<div class="care-note">${cp.watering.notes}</div>` : ''}
                </div>
            </div>`);
    }

    // Sun
    if (cp.sun) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">☀️</div>
                <div>
                    <div class="care-label">Sun</div>
                    <div class="care-value">${cp.sun}</div>
                </div>
            </div>`);
    }

    // Soil
    if (cp.soil) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">🪴</div>
                <div>
                    <div class="care-label">Soil</div>
                    <div class="care-value">${cp.soil}</div>
                </div>
            </div>`);
    }

    // Fertilizing
    if (cp.fertilizing) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">🧪</div>
                <div>
                    <div class="care-label">Fertilizing</div>
                    <div class="care-value">${cp.fertilizing.schedule || ''}</div>
                    ${cp.fertilizing.type ? `<div class="care-note">Type: ${cp.fertilizing.type}</div>` : ''}
                </div>
            </div>`);
    }

    // Pruning
    if (cp.pruning) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">✂️</div>
                <div>
                    <div class="care-label">Pruning</div>
                    <div class="care-value">${cp.pruning.timing || ''}</div>
                    ${cp.pruning.method ? `<div class="care-note">${cp.pruning.method}</div>` : ''}
                </div>
            </div>`);
    }

    // Mature size
    if (cp.mature_size) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">📏</div>
                <div>
                    <div class="care-label">Mature Size</div>
                    <div class="care-value">Height: ${cp.mature_size.height || 'N/A'} · Spread: ${cp.mature_size.spread || 'N/A'}</div>
                </div>
            </div>`);
    }

    // Pests
    if (cp.pests && cp.pests.length) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">🐛</div>
                <div>
                    <div class="care-label">Pests & Diseases</div>
                    <div class="care-value">${cp.pests.join(', ')}</div>
                </div>
            </div>`);
    }

    // Companions
    if (cp.companions && cp.companions.length) {
        sections.push(`
            <div class="care-item">
                <div class="care-item-icon">🌱</div>
                <div>
                    <div class="care-label">Companion Plants</div>
                    <div class="care-value">${cp.companions.join(', ')}</div>
                </div>
            </div>`);
    }

    return `
        <div id="care-profile-section" class="detail-card-expandable">
            <div class="detail-card-header" onclick="toggleCareProfile()">
                <div class="detail-card-heading">Care Profile</div>
                <svg class="detail-card-chevron open" id="care-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="detail-card-body" id="care-profile-body">
                ${sections.join('')}
                <button class="btn-secondary" onclick="refreshCareProfile('${item.id}')" style="margin-top:12px;font-size:0.85em;width:100%;">Refresh care info</button>
            </div>
        </div>`;
}

export function toggleCareProfile() { toggleSection('care-profile-body', 'care-toggle-icon'); }

// ── Seasonal care reminders ───────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getPlantHash() {
    return getAllInventory()
        .filter(i => i.type === 'plant')
        .map(i => i.common)
        .sort()
        .join(',');
}

let _remindersCache = [];

export async function loadReminders() {
    const plants = getAllInventory().filter(i => i.type === 'plant');
    const section = document.getElementById('reminders-section');
    if (!section) return;

    if (plants.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    // Ensure body starts in open state so toggleSection logic is consistent
    const remindersBody = document.getElementById('reminders-body');
    const remindersChevron = document.getElementById('reminders-chevron');
    if (remindersBody && !remindersBody.style.height) {
        remindersBody.style.height = 'auto';
        remindersChevron?.classList.add('open');
    }
    const monthKey = getMonthKey();
    const plantHash = getPlantHash();

    // Load existing reminders for this month
    const { data: existing, error } = await sb.from('reminders')
        .select('*')
        .eq('user_id', getCurrentUser().id)
        .eq('month_key', monthKey)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to load reminders:', error);
        return;
    }

    const aiReminders = (existing || []).filter(r => r.source === 'ai');
    const customReminders = (existing || []).filter(r => r.source === 'custom');

    // Check if AI reminders need regeneration
    const needsRegen = aiReminders.length === 0 || (aiReminders[0] && aiReminders[0].plant_hash !== plantHash);

    if (needsRegen) {
        // Show loading state
        const list = document.getElementById('reminders-list');
        if (list) list.innerHTML = '<div style="font-size:var(--text-sm);color:var(--ink-light);padding:var(--space-2) 0;">Generating your monthly reminders...</div>';

        // Delete old AI reminders
        if (aiReminders.length > 0) {
            await sb.from('reminders')
                .delete()
                .eq('user_id', getCurrentUser().id)
                .eq('month_key', monthKey)
                .eq('source', 'ai');
        }

        // Generate new ones
        const newAiReminders = await generateReminders(monthKey, plantHash, plants);
        _remindersCache = [...newAiReminders, ...customReminders];
    } else {
        _remindersCache = existing || [];
    }

    renderReminders(_remindersCache);
}

async function generateReminders(monthKey, plantHash, plants) {
    const month = MONTHS[new Date().getMonth()];
    const plantData = plants.map(p => ({ common: p.common, scientific: p.scientific, category: p.category }));

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
                    action: 'reminders',
                    data: { month, plants: plantData }
                }),
            }
        );

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        const reminders = result.reminders || [];
        const userId = getCurrentUser().id;

        // Insert into DB
        const rows = reminders.map(r => ({
            user_id: userId,
            month_key: monthKey,
            icon: r.icon || '',
            title: r.title,
            detail: r.detail || '',
            plant: r.plant || 'General',
            source: 'ai',
            done: false,
            plant_hash: plantHash,
        }));

        if (rows.length > 0) {
            const { data: inserted, error } = await sb.from('reminders')
                .insert(rows)
                .select();

            if (error) {
                console.error('Failed to save reminders:', error);
                return [];
            }
            return inserted || [];
        }
        return [];
    } catch (err) {
        console.error('Reminder generation failed:', err);
        const list = document.getElementById('reminders-list');
        if (list) list.innerHTML = '<div style="font-size:var(--text-sm);color:var(--ink-light);padding:var(--space-2) 0;">Could not generate reminders. Try again later.</div>';
        return [];
    }
}

function renderReminders(reminders) {
    const list = document.getElementById('reminders-list');
    if (!list) return;

    if (reminders.length === 0) {
        list.innerHTML = '<div style="font-size:var(--text-sm);color:var(--ink-light);padding:var(--space-2) 0;">No reminders yet.</div>';
        return;
    }

    // Sort: unchecked first, then checked
    const sorted = [...reminders].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return 0;
    });

    list.innerHTML = sorted.map(r => {
        const isDone = r.done;
        const isCustom = r.source === 'custom';
        const plantTag = r.plant && r.plant !== 'General'
            ? `<span style="display:inline-block;font-size:var(--text-xs);background:var(--cream-dark);color:var(--green-deep);border-radius:10px;padding:1px 8px;margin-top:3px;">${escapeHtml(r.plant)}</span>`
            : '';
        const deleteBtn = isCustom
            ? `<button onclick="removeReminder('${r.id}')" aria-label="Delete reminder" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--ink-light);font-size:16px;padding:0 var(--space-1);line-height:1;">&times;</button>`
            : '';

        return `<div class="care-item" style="${isDone ? 'opacity:0.5;' : ''}">
            <button onclick="toggleReminderDone('${r.id}')" aria-label="Toggle done" style="flex-shrink:0;width:20px;height:20px;border-radius:50%;border:2px solid ${isDone ? 'var(--green-mid)' : 'var(--ink-light)'};background:${isDone ? 'var(--green-mid)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;margin-top:2px;padding:0;">
                ${isDone ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2"><polyline points="1.5 5 4 7.5 8.5 2.5"/></svg>' : ''}
            </button>
            ${r.icon ? `<div class="care-icon" style="margin-top:0;">${r.icon}</div>` : ''}
            <div style="flex:1;min-width:0;">
                <div style="font-size:var(--text-sm);font-weight:600;color:var(--ink);${isDone ? 'text-decoration:line-through;' : ''}">${escapeHtml(r.title)}</div>
                ${r.detail ? `<div style="font-size:var(--text-xs);color:var(--ink-light);margin-top:2px;line-height:1.4;">${escapeHtml(r.detail)}</div>` : ''}
                ${plantTag}
            </div>
            ${deleteBtn}
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function toggleReminderDone(id) {
    const reminder = _remindersCache.find(r => r.id === id);
    if (!reminder) return;

    const newDone = !reminder.done;

    const { error } = await sb.from('reminders')
        .update({ done: newDone })
        .eq('id', id)
        .eq('user_id', getCurrentUser().id);

    if (error) {
        console.error('Failed to update reminder:', error);
        return;
    }

    reminder.done = newDone;
    renderReminders(_remindersCache);
}

export async function addCustomReminder() {
    const input = document.getElementById('custom-reminder-input');
    if (!input) return;

    const title = input.value.trim();
    if (!title) return;

    const { data, error } = await sb.from('reminders')
        .insert({
            user_id: getCurrentUser().id,
            month_key: getMonthKey(),
            icon: '📝',
            title,
            detail: '',
            plant: '',
            source: 'custom',
            done: false,
            plant_hash: '',
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to add custom reminder:', error);
        return;
    }

    input.value = '';
    _remindersCache.push(data);
    renderReminders(_remindersCache);
}

export async function removeReminder(id) {
    const reminder = _remindersCache.find(r => r.id === id);
    if (!reminder || reminder.source !== 'custom') return;

    const { error } = await sb.from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', getCurrentUser().id);

    if (error) {
        console.error('Failed to delete reminder:', error);
        return;
    }

    _remindersCache = _remindersCache.filter(r => r.id !== id);
    renderReminders(_remindersCache);
}

export function toggleRemindersSection() {
    toggleSection('reminders-body', 'reminders-chevron');
}

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

// ── Health history (detail modal) ────────────────────────────
let _healthHistoryOffset = 0;
const HEALTH_PAGE_SIZE = 10;

export function renderHealthHistory(item) {
    if (item.type !== 'plant') return '';

    return `
        <div class="detail-card-expandable">
            <div class="detail-card-header" onclick="toggleHealthHistory('${item.id}')">
                <div class="detail-card-heading">Health History</div>
                <svg class="detail-card-chevron" id="health-history-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="detail-card-body" id="health-history-body" style="height:0;overflow:hidden;">
                <div id="health-history-list" style="padding-top:var(--space-3);">Loading...</div>
            </div>
        </div>`;
}

export async function toggleHealthHistory(itemId) {
    const body = document.getElementById('health-history-body');
    if (!body) return;
    const isCollapsed = !body.style.height || body.style.height === '0px';

    toggleSection('health-history-body', 'health-history-toggle');

    if (isCollapsed) {
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
        const existing = list.querySelector('.health-show-more');
        if (existing) existing.remove();
        list.insertAdjacentHTML('beforeend', html);
    }

    if (data.length === HEALTH_PAGE_SIZE) {
        _healthHistoryOffset += HEALTH_PAGE_SIZE;
        list.insertAdjacentHTML('beforeend',
            `<div class="health-show-more" onclick="loadMoreHealthHistory('${itemId}')">Show more</div>`);
    }
}

export async function loadMoreHealthHistory(itemId) {
    await loadHealthHistoryPage(itemId, false);
}
