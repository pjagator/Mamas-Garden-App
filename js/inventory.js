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
    renderInventory();
}

export function setFilter(filter, btnEl) {
    currentFilter = filter;
    document.querySelectorAll('.filter-row .chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderInventory();
}

export function toggleTagFilter(tag) {
    const idx = activeTagFilters.indexOf(tag);
    if (idx === -1) activeTagFilters.push(tag);
    else activeTagFilters.splice(idx, 1);
    renderTagFilterDropdown();
    renderInventory();
}

export function setLocationFilter(loc) {
    activeLocationFilter = activeLocationFilter === loc ? '' : loc;
    renderLocationFilterDropdown();
    renderInventory();
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

    // Type/status filters
    if (currentFilter === 'plant')   items = items.filter(i => i.type === 'plant');
    if (currentFilter === 'bug')     items = items.filter(i => i.type === 'bug');
    if (currentFilter === 'native')  items = items.filter(i => i.is_native);
    if (currentFilter === 'blooming') {
        const season = getCurrentSeason();
        items = items.filter(i => i.bloom && (i.bloom.includes(season) || i.bloom.includes('Year-round')));
    }

    // Tag filters (AND: item must have all selected tags)
    if (activeTagFilters.length) {
        items = items.filter(i => activeTagFilters.every(t => (i.tags || []).includes(t)));
    }

    // Location filter
    if (activeLocationFilter) {
        items = items.filter(i => i.location === activeLocationFilter);
    }

    // Search
    if (currentSearch) {
        items = items.filter(i =>
            (i.common      || '').toLowerCase().includes(currentSearch) ||
            (i.scientific  || '').toLowerCase().includes(currentSearch) ||
            (i.category    || '').toLowerCase().includes(currentSearch) ||
            (i.notes       || '').toLowerCase().includes(currentSearch) ||
            (i.tags        || []).some(t => t.toLowerCase().includes(currentSearch)) ||
            (i.location    || '').toLowerCase().includes(currentSearch)
        );
    }

    // Sort
    if (currentSort === 'name-az') items.sort((a, b) => (a.common || '').localeCompare(b.common || ''));
    else if (currentSort === 'name-za') items.sort((a, b) => (b.common || '').localeCompare(a.common || ''));
    else if (currentSort === 'date-asc') items.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (currentSort === 'location') items.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    // default: date-desc (already sorted from DB)

    const grid = document.getElementById('garden-grid');
    if (!items.length) {
        grid.innerHTML = `<div class="empty-state"><p>${currentSearch || currentFilter !== 'all' ? 'No matching entries.' : 'Your garden is empty.'}</p><p style="margin-top:4px;">${!currentSearch && currentFilter === 'all' ? 'Capture something to get started.' : ''}</p></div>`;
        return;
    }

    grid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'garden-card';
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
        grid.appendChild(card);
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        grid.querySelectorAll('.garden-card').forEach((card, i) => {
            card.style.animationDelay = `${i * 40}ms`;
        });
    }
}

export function showItemDetail(item) {
    const body = document.getElementById('item-modal-body');

    const imgEl = item.image_url
        ? `<img class="detail-img" src="${item.image_url}" alt="${item.common}">`
        : `<div style="width:100%;height:160px;background:var(--cream-dark);border-radius:var(--radius);margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:48px;">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

    const linkedPlantName = item.linked_plant_id === 'ground' ? 'Ground'
        : item.linked_plant_id ? (getAllInventory().find(p => p.id === item.linked_plant_id)?.common || null) : null;

    const rows = [
        ['Type', item.category || item.type],
        ['Location', item.location || null],
        linkedPlantName ? ['Found on', linkedPlantName] : null,
        ['Added', new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
        item.confidence ? ['ID confidence', item.confidence + '%'] : null,
        item.bloom   ? ['Blooming season', item.bloom.join(', ')] : null,
        item.season  ? ['Active season',   item.season.join(', ')] : null,
        item.care    ? ['Care',            item.care]              : null,
        item.source  ? ['Identified via',  item.source]           : null,
    ].filter(r => r && r[1]);

    const nativeBadge = item.is_native
        ? '<span class="tag native" style="display:inline-block;margin-bottom:12px;">⭐ Florida Native</span>'
        : '';

    const statusBadges = [];
    if (item.health) {
        const hClass = item.health === 'thriving' || item.health === 'healthy' ? 'health-good'
            : item.health === 'stressed' || item.health === 'sick' ? 'health-bad' : 'health-neutral';
        statusBadges.push(`<span class="tag ${hClass}">${item.health}</span>`);
    }
    if (item.flowering === 'yes') statusBadges.push('<span class="tag season">flowering</span>');
    if (item.flowering === 'budding') statusBadges.push('<span class="tag season">budding</span>');
    if (item.height) statusBadges.push(`<span class="tag" style="background:var(--cream-dark);color:var(--ink-mid);">${item.height}</span>`);

    body.innerHTML = `
        ${imgEl}
        <div class="detail-name">${item.common}</div>
        <div class="detail-sci">${item.scientific || ''}</div>
        ${nativeBadge}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">${statusBadges.join('')}</div>
        ${rows.map(([k,v]) => `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`).join('')}
        ${item.notes ? `<div class="detail-notes"><div class="detail-notes-label">Notes</div><div class="detail-notes-text">${item.notes}</div></div>` : ''}
        ${renderTagEditor(item)}
        ${item.type === 'bug' ? renderBugPlantLink(item) : ''}
        ${item.type === 'plant' ? renderPlantStatus(item) : ''}
        ${item.type === 'plant' ? renderLinkedBugs(item) : ''}
        ${item.type === 'plant' ? renderHealthHistory(item) : ''}
        ${renderCareProfile(item)}
        <div class="detail-delete">
            <button class="btn-danger" onclick="deleteItem('${item.id}', '${item.image_url || ''}')">Delete entry</button>
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
    const seasons = ['Spring','Summer','Fall','Winter'];
    const container = document.getElementById('timeline-content');
    container.innerHTML = '';

    seasons.forEach(season => {
        const block = document.createElement('div');
        block.className = 'season-block';

        const bloomingPlants = getAllInventory().filter(i =>
            i.type === 'plant' && i.bloom &&
            (i.bloom.includes(season) || i.bloom.includes('Year-round'))
        );
        const activeInsects = getAllInventory().filter(i =>
            i.type === 'bug' && i.season &&
            (i.season.includes(season) || i.season.includes('Year-round'))
        );

        const entries = [
            ...bloomingPlants.map(p => `<div class="timeline-entry"><span class="timeline-icon">🌸</span><div><div class="timeline-name">${p.common}</div><div class="timeline-sci">${p.scientific || ''}</div></div></div>`),
            ...activeInsects.map(b => `<div class="timeline-entry"><span class="timeline-icon">🦋</span><div><div class="timeline-name">${b.common}</div><div class="timeline-sci">${b.scientific || ''}</div></div></div>`)
        ];

        block.innerHTML = `
            <div class="season-title">${season}</div>
            ${entries.length ? entries.join('') : '<p class="timeline-empty">Nothing logged yet for this season.</p>'}`;
        container.appendChild(block);
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
