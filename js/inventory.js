// ── Inventory, timeline, export, settings ─────────────────────
import { sb, getCurrentUser, getAllInventory, setAllInventory, getCurrentSeason, openModal, closeModal, emit, NATIVE_PLANTS, LOCATION_ZONES, LOCATION_HABITATS } from './app.js';
import { renderTagEditor, renderBugPlantLink, renderLinkedBugs, renderPlantStatus, renderCareProfile, renderHealthHistory } from './features.js';

// Module-local state
let currentFilter = 'all';
let currentSearch = '';
let activeTagFilters = [];
let activeLocationFilter = '';
let currentSort = 'date-desc';

// ── Internal helpers ──────────────────────────────────────────

function getAllTags() {
    const tags = new Set();
    getAllInventory().forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
}

function getAllLocations() {
    const locs = new Set();
    getAllInventory().forEach(i => { if (i.location) locs.add(i.location); });
    return [...locs].sort();
}

function renderTagFilterDropdown() {
    const el = document.getElementById('tag-filter-dropdown');
    if (!el) return;
    const tags = getAllTags();
    if (!tags.length) { el.innerHTML = '<p style="font-size:0.8em;color:var(--ink-light);padding:8px;">No tags yet</p>'; return; }
    el.innerHTML = tags.map(t =>
        `<button class="chip ${activeTagFilters.includes(t) ? 'active' : ''}" onclick="toggleTagFilter('${t}')" style="font-size:0.78em;">${t}</button>`
    ).join('');
}

function renderLocationFilterDropdown() {
    const el = document.getElementById('location-filter-dropdown');
    if (!el) return;
    const locs = getAllLocations();
    if (!locs.length) { el.innerHTML = '<p style="font-size:0.8em;color:var(--ink-light);padding:8px;">No locations yet</p>'; return; }
    el.innerHTML = locs.map(l =>
        `<button class="chip ${activeLocationFilter === l ? 'active' : ''}" onclick="setLocationFilter('${l}')" style="font-size:0.78em;">${l}</button>`
    ).join('');
}

function applyFilters() {
    const grid = document.getElementById('garden-grid');
    const cards = grid.querySelectorAll('.garden-card');
    if (!cards.length) { renderInventory(); return; }

    const season = getCurrentSeason();
    let visibleCount = 0;

    cards.forEach(card => {
        let show = true;

        // Type/status filter
        if (currentFilter === 'plant' && card.dataset.type !== 'plant') show = false;
        if (currentFilter === 'bug' && card.dataset.type !== 'bug') show = false;
        if (currentFilter === 'native' && card.dataset.native !== 'true') show = false;
        if (currentFilter === 'blooming') {
            const item = getAllInventory().find(i => i.common === card.querySelector('.garden-card-name')?.textContent);
            if (!item?.bloom || (!item.bloom.includes(season) && !item.bloom.includes('Year-round'))) show = false;
        }

        // Tag filters (AND)
        if (show && activeTagFilters.length) {
            const cardTags = card.dataset.tags ? card.dataset.tags.split(',') : [];
            if (!activeTagFilters.every(t => cardTags.includes(t.toLowerCase()))) show = false;
        }

        // Location filter
        if (show && activeLocationFilter) {
            if (card.dataset.location !== activeLocationFilter.toLowerCase()) show = false;
        }

        // Search
        if (show && currentSearch) {
            const text = card.textContent.toLowerCase();
            if (!text.includes(currentSearch)) show = false;
        }

        card.classList.toggle('filter-hidden', !show);
        if (show) visibleCount++;
    });

    // Show empty state if nothing visible
    const emptyEl = grid.querySelector('.empty-state');
    if (visibleCount === 0 && !emptyEl && (currentSearch || currentFilter !== 'all' || activeTagFilters.length || activeLocationFilter)) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<p>No matching entries.</p>';
        grid.appendChild(empty);
    } else if (visibleCount > 0 && emptyEl) {
        emptyEl.remove();
    }
}

function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function today() { return new Date().toISOString().split('T')[0]; }

// ── Exported functions ────────────────────────────────────────

export function updateStats() {
    const plants = getAllInventory().filter(i => i.type === 'plant').length;
    const bugs = getAllInventory().filter(i => i.type === 'bug').length;
    const el = document.getElementById('garden-subtitle');
    if (el) {
        const parts = [];
        if (plants) parts.push(`${plants} species cataloged`);
        if (bugs) parts.push(`${bugs} visitors observed`);
        el.textContent = parts.join(' · ') || 'Your garden awaits';
    }
}

export function handleSearch(val) {
    currentSearch = val.toLowerCase().trim();
    applyFilters();
}

export function setFilter(filter, btnEl) {
    currentFilter = filter;
    document.querySelectorAll('.filter-row .chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    applyFilters();
}

export function toggleTagFilter(tag) {
    const idx = activeTagFilters.indexOf(tag);
    if (idx === -1) activeTagFilters.push(tag);
    else activeTagFilters.splice(idx, 1);
    renderTagFilterDropdown();
    applyFilters();
}

export function setLocationFilter(loc) {
    activeLocationFilter = activeLocationFilter === loc ? '' : loc;
    renderLocationFilterDropdown();
    applyFilters();
}

export function setSort(sort) {
    currentSort = sort;
    renderInventory();
}

export function toggleFilterDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    // Close all dropdowns first
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    if (!isOpen) {
        el.style.display = 'flex';
        if (id === 'tag-filter-dropdown') renderTagFilterDropdown();
        if (id === 'location-filter-dropdown') renderLocationFilterDropdown();
    }
}

export function renderInventory() {
    let items = [...getAllInventory()];

    // Sort only — filtering is handled by applyFilters() on the DOM
    if (currentSort === 'name-az') items.sort((a, b) => (a.common || '').localeCompare(b.common || ''));
    else if (currentSort === 'name-za') items.sort((a, b) => (b.common || '').localeCompare(a.common || ''));
    else if (currentSort === 'date-asc') items.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (currentSort === 'location') items.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    // default: date-desc (already sorted from DB)

    const grid = document.getElementById('garden-grid');
    if (!items.length) {
        grid.innerHTML = `
            <div style="text-align:center;padding:var(--space-8) var(--space-6);">
                <div style="font-family:var(--font-display);font-size:15px;font-style:italic;color:var(--green-deep);line-height:1.5;">
                    "In every walk with nature,<br>one receives far more than he seeks."
                </div>
                <div style="font-size:11px;color:var(--ink-light);margin-top:6px;">— John Muir</div>
                <div style="font-size:var(--text-sm);color:var(--green-sage);margin-top:var(--space-4);">
                    Tap + to catalog your first species.
                </div>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'garden-card';
        card.dataset.type = item.type || '';
        card.dataset.native = item.is_native ? 'true' : 'false';
        card.dataset.tags = (item.tags || []).join(',').toLowerCase();
        card.dataset.location = (item.location || '').toLowerCase();
        card.onclick = () => showItemDetail(item);

        const imgEl = item.image_url
            ? `<img class="garden-card-img" src="${item.image_url}" alt="${item.common}" loading="lazy">`
            : `<div class="garden-card-img-placeholder">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

        const isBug = item.type === 'bug';
        const tagClass = isBug ? 'tag bug-tag' : 'tag';
        const tags = [];
        if (item.is_native) tags.push(`<span class="${tagClass}">⭐ Native</span>`);
        if (item.tags && item.tags.length) tags.push(...item.tags.slice(0,2).map(t => `<span class="${tagClass}">${t}</span>`));
        if (item.bloom)     tags.push(`<span class="${tagClass}">🌸 ${item.bloom.slice(0,2).join(', ')}</span>`);
        if (item.location)  tags.push(`<span class="${tagClass}">${item.location}</span>`);
        if (item.health && (item.health === 'stressed' || item.health === 'sick')) tags.push(`<span class="tag health-bad">${item.health}</span>`);

        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>
            ${item.type === 'plant' ? `<button class="health-pulse-btn" onclick="event.stopPropagation();openHealthLog('${item.id}')" aria-label="Health check">💓</button>` : ''}`;

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            card.style.animationDelay = `${i * 40}ms`;
        }

        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    applyFilters();
}

export function showItemDetail(item) {
    const body = document.getElementById('item-modal-body');

    // Hero image
    const heroImg = item.image_url
        ? `<img src="${item.image_url}" alt="${item.common}" loading="lazy">`
        : `<div style="width:100%;height:100%;background:var(--bg-header);display:flex;align-items:center;justify-content:center;font-size:48px;">🌿</div>`;

    // Status badges
    const badges = [];
    if (item.is_native) badges.push('Native to Florida');
    if (item.health) badges.push(item.health.charAt(0).toUpperCase() + item.health.slice(1));
    if (item.flowering === 'yes') badges.push('Flowering');
    else if (item.flowering === 'budding') badges.push('Budding');

    // About card rows
    const aboutItems = [];
    if (item.type) aboutItems.push(['Type', item.category || item.type]);
    aboutItems.push(['Added', new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })]);
    if (item.location) aboutItems.push(['Location', item.location]);
    if (item.confidence) aboutItems.push(['Confidence', item.confidence + '%']);
    if (item.bloom?.length) aboutItems.push(['Blooming', item.bloom.join(', ')]);
    if (item.season?.length) aboutItems.push(['Active', item.season.join(', ')]);

    body.innerHTML = `
        <div class="detail-hero">
            ${heroImg}
            <div class="detail-hero-overlay">
                <div class="detail-hero-name">${item.common}</div>
                ${item.scientific ? `<div class="detail-hero-sci">${item.scientific}</div>` : ''}
                <div class="detail-hero-badges">
                    ${badges.map(b => `<span class="detail-hero-badge">${b}</span>`).join('')}
                </div>
            </div>
        </div>
        <div class="detail-content">
            <div class="detail-card">
                <div class="detail-card-heading">About</div>
                <div class="detail-about-grid">
                    ${aboutItems.map(([k,v]) => `<div><div class="detail-about-label">${k}</div><div class="detail-about-value">${v}</div></div>`).join('')}
                </div>
            </div>
            ${item.notes ? `<div class="detail-card"><div class="detail-card-heading">Notes</div><div class="detail-notes-text">${item.notes}</div></div>` : ''}
            ${renderTagEditor(item)}
            ${item.type === 'bug' ? renderBugPlantLink(item) : ''}
            ${renderCareProfile(item)}
            ${item.type === 'plant' ? renderHealthHistory(item) : ''}
            ${item.type === 'plant' ? renderPlantStatus(item) : ''}
            ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
            <div class="detail-delete-link" onclick="deleteItem('${item.id}', '${item.image_url || ''}')">Delete this entry</div>
        </div>`;
    openModal('item-modal');
}

export function showLinkedBug(id) {
    const item = getAllInventory().find(i => i.id === id);
    if (item) showItemDetail(item);
}

export async function deleteItem(id, imageUrl) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('id', id).eq('user_id', getCurrentUser().id);
    if (error) { alert('Error: ' + error.message); return; }
    if (imageUrl) {
        try {
            const path = imageUrl.split('/garden-images/')[1];
            if (path) await sb.storage.from('garden-images').remove([path]);
        } catch (e) { console.warn('Image delete failed:', e); }
    }
    closeModal('item-modal');
    emit('inventory-changed');
}

export function renderTimeline() {
    const now = new Date();
    const year = now.getFullYear();
    const seasonDefs = [
        { label: `Spring ${year}`, key: 'Spring' },
        { label: `Summer ${year}`, key: 'Summer' },
        { label: `Fall ${year}`,   key: 'Fall'   },
        { label: `Winter ${year}`, key: 'Winter' }
    ];
    const container = document.getElementById('timeline-content');
    container.innerHTML = '';

    const allItems = getAllInventory();

    seasonDefs.forEach(({ label, key }) => {
        const bloomingPlants = allItems.filter(i =>
            i.type === 'plant' && i.bloom &&
            (i.bloom.includes(key) || i.bloom.includes('Year-round'))
        );
        const activeInsects = allItems.filter(i =>
            i.type === 'bug' && i.season &&
            (i.season.includes(key) || i.season.includes('Year-round'))
        );

        const section = document.createElement('div');
        section.style.marginBottom = 'var(--space-6)';

        const header = `
            <div class="timeline-season-header">
                <div class="timeline-season-title">${label}</div>
                <div class="timeline-season-rule"></div>
            </div>`;

        if (!bloomingPlants.length && !activeInsects.length) {
            section.innerHTML = header + '<p class="timeline-empty" style="font-style:italic;color:var(--ink-light);">Nothing cataloged for this season yet.</p>';
            container.appendChild(section);
            return;
        }

        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.innerHTML = '<div class="timeline-line"></div>';
        const trackFragment = document.createDocumentFragment();

        [...bloomingPlants, ...activeInsects].forEach(item => {
            const dotClass = item.type === 'plant' ? 'plant' : 'bug';
            const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const nativeTag = item.is_native
                ? `<span class="tag" style="font-size:9px;padding:2px 8px;border-radius:10px;background:linear-gradient(135deg,var(--green-light),#e8f0e8);color:var(--green-mid);">Native</span>`
                : '';
            const categoryTag = item.category
                ? `<span class="tag" style="font-size:9px;padding:2px 8px;border-radius:10px;background:var(--cream-dark);color:var(--ink-light);">${item.category}</span>`
                : '';

            const entry = document.createElement('div');
            entry.className = 'timeline-entry';
            entry.innerHTML = `
                <div class="timeline-dot ${dotClass}"></div>
                <div class="timeline-entry-card">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <div style="font-family:var(--font-display);font-size:14px;font-weight:600;color:var(--green-deep);">${item.common || 'Unknown'}</div>
                            <div style="font-size:11px;color:var(--green-sage);font-style:italic;">${item.scientific || ''}</div>
                        </div>
                        <div style="font-size:10px;color:var(--ink-light);">${dateStr}</div>
                    </div>
                    ${(nativeTag || categoryTag) ? `<div style="display:flex;gap:4px;margin-top:8px;">${nativeTag}${categoryTag}</div>` : ''}
                </div>`;
            entry.querySelector('.timeline-entry-card').addEventListener('click', () => showItemDetail(item));
            trackFragment.appendChild(entry);
        });
        track.appendChild(trackFragment);

        section.innerHTML = header;
        section.appendChild(track);
        container.appendChild(section);
    });
}

export async function exportJSON() {
    const blob = new Blob([JSON.stringify({ version: '3.1', date: new Date().toISOString(), entries: getAllInventory() }, null, 2)], { type: 'application/json' });
    download(blob, `garden-${today()}.json`);
}

export async function exportCSV() {
    let csv = 'Common,Scientific,Type,Category,Date,Confidence,Bloom,Season,Native,Notes,Image URL\n';
    getAllInventory().forEach(i => {
        csv += `"${i.common}","${i.scientific}","${i.type}","${i.category}","${new Date(i.date).toLocaleDateString()}","${i.confidence || ''}","${(i.bloom||[]).join(', ')}","${(i.season||[]).join(', ')}","${i.is_native ? 'Yes':'No'}","${i.notes || ''}","${i.image_url || ''}"\n`;
    });
    download(new Blob([csv], { type: 'text/csv' }), `garden-${today()}.csv`);
}

export async function clearAllData() {
    if (!confirm('Delete ALL garden entries? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('user_id', getCurrentUser().id);
    if (error) { alert('Error: ' + error.message); return; }
    setAllInventory([]);
    updateStats();
    renderInventory();
    renderTimeline();
    alert('Garden cleared.');
}

export function showNativesDB() {
    const list = document.getElementById('natives-list');
    list.innerHTML = NATIVE_PLANTS.map(p => `
        <div class="native-item">
            <div class="native-item-name">${p.name}</div>
            <div class="native-item-sci">${p.scientific}</div>
            <div class="native-item-detail">${p.type} · Blooms: ${p.bloom.join(', ')}</div>
        </div>`).join('');
    openModal('natives-modal');
}
