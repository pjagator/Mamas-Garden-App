// ── Supabase ───────────────────────────────────────────────────
const SUPABASE_URL     = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0anZncnV3dmxycmxoc2tud2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTgzMTgsImV4cCI6MjA4OTY3NDMxOH0.I9nrbtfZqvd4Q9V9GIbUv1vWYWB9OfQwucGhBU8UP6c';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Native plant database ──────────────────────────────────────
const NATIVE_PLANTS = [
    { name: "Coontie",             scientific: "Zamia integrifolia",       aliases: ["coontie", "florida arrowroot", "zamia"], bloom: ["Spring","Summer"],              type: "Cycad" },
    { name: "Beautyberry",         scientific: "Callicarpa americana",     aliases: ["beautyberry", "callicarpa"],             bloom: ["Summer","Fall"],               type: "Shrub" },
    { name: "Firebush",            scientific: "Hamelia patens",           aliases: ["firebush", "hamelia", "scarlet bush"],   bloom: ["Spring","Summer","Fall"],      type: "Shrub" },
    { name: "Wild Coffee",         scientific: "Psychotria nervosa",       aliases: ["wild coffee", "psychotria"],             bloom: ["Spring","Summer"],              type: "Shrub" },
    { name: "Simpson's Stopper",   scientific: "Myrcianthes fragrans",    aliases: ["simpson", "stopper", "myrcianthes"],     bloom: ["Spring","Summer"],              type: "Tree" },
    { name: "Blanket Flower",      scientific: "Gaillardia pulchella",    aliases: ["blanket flower", "gaillardia", "indian blanket"], bloom: ["Spring","Summer","Fall"], type: "Wildflower" },
    { name: "Beach Sunflower",     scientific: "Helianthus debilis",      aliases: ["beach sunflower", "helianthus debilis"],  bloom: ["Year-round"],                  type: "Wildflower" },
    { name: "Coral Honeysuckle",   scientific: "Lonicera sempervirens",   aliases: ["coral honeysuckle", "lonicera"],         bloom: ["Spring","Summer","Fall"],      type: "Vine" },
    { name: "Passion Vine",        scientific: "Passiflora incarnata",    aliases: ["passion vine", "passionflower", "maypop", "passiflora"], bloom: ["Summer","Fall"], type: "Vine" },
    { name: "Muhly Grass",         scientific: "Muhlenbergia capillaris", aliases: ["muhly", "muhlenbergia", "pink muhly"],   bloom: ["Fall"],                         type: "Grass" },
    { name: "Saw Palmetto",        scientific: "Serenoa repens",          aliases: ["saw palmetto", "serenoa"],               bloom: ["Spring"],                       type: "Palm" },
    { name: "Cabbage Palm",        scientific: "Sabal palmetto",          aliases: ["cabbage palm", "sabal", "cabbage palmetto"], bloom: ["Summer"],                  type: "Palm" },
    { name: "Southern Magnolia",   scientific: "Magnolia grandiflora",    aliases: ["magnolia", "southern magnolia"],          bloom: ["Spring","Summer"],              type: "Tree" },
    { name: "Live Oak",            scientific: "Quercus virginiana",      aliases: ["live oak", "quercus virginiana"],         bloom: ["Spring"],                       type: "Tree" },
    { name: "Bald Cypress",        scientific: "Taxodium distichum",      aliases: ["bald cypress", "taxodium"],               bloom: ["Spring"],                       type: "Tree" },
];

// ── State ──────────────────────────────────────────────────────
let currentUser     = null;
let allInventory    = [];
let currentFilter   = 'all';
let currentSearch   = '';
let pendingIdResults = [];
let selectedIdIndex  = null;

// ── Helpers ────────────────────────────────────────────────────
function getSeason(monthIndex) {
    if (monthIndex >= 2 && monthIndex <= 4) return 'Spring';
    if (monthIndex >= 5 && monthIndex <= 7) return 'Summer';
    if (monthIndex >= 8 && monthIndex <= 10) return 'Fall';
    return 'Winter';
}

function getCurrentSeason() { return getSeason(new Date().getMonth()); }

function confidenceClass(pct) {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
}

function matchNative(commonName = '', scientificName = '') {
    const haystack = (commonName + ' ' + scientificName).toLowerCase();
    return NATIVE_PLANTS.find(p => {
        if (haystack.includes(p.scientific.toLowerCase())) return true;
        return p.aliases.some(a => haystack.includes(a));
    }) || null;
}

// ── Auth ───────────────────────────────────────────────────────
sb.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').style.display = 'block';
        document.getElementById('settings-email').textContent = currentUser.email;
        document.getElementById('current-season').textContent = getCurrentSeason();
        loadInventory();
        renderTimeline();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').style.display = 'none';
    }
});

function showAuthTab(tab) {
    document.getElementById('signin-form').style.display = tab === 'signin' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
    document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
    document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
    setAuthMsg('', '');
}

function setAuthMsg(text, type) {
    const el = document.getElementById('auth-msg');
    el.textContent = text;
    el.className = 'auth-msg' + (type ? ' ' + type : '');
}

async function handleSignIn() {
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    if (!email || !password) { setAuthMsg('Please enter email and password.', ''); return; }
    const btn = document.getElementById('signin-btn');
    btn.disabled = true; btn.textContent = 'Signing in...';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setAuthMsg(error.message, ''); btn.disabled = false; btn.textContent = 'Sign in'; }
}

async function handleSignUp() {
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!email || !password) { setAuthMsg('Please fill in all fields.', ''); return; }
    if (password.length < 6) { setAuthMsg('Password must be at least 6 characters.', ''); return; }
    const btn = document.getElementById('signup-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    const { error } = await sb.auth.signUp({ email, password });
    btn.disabled = false; btn.textContent = 'Create account';
    if (error) setAuthMsg(error.message, '');
    else setAuthMsg('Check your email to confirm your account, then sign in.', 'success');
}

async function handleSignOut() {
    await sb.auth.signOut();
}

// ── Navigation ─────────────────────────────────────────────────
function showScreen(name, btnEl) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active-screen');
    if (btnEl) btnEl.classList.add('active');
}

// ── Photo capture ──────────────────────────────────────────────
function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => renderPreview(e.target.result);
    reader.readAsDataURL(file);
    resetIdResults();
}

function renderPreview(src) {
    const canvas = document.getElementById('preview-canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.onload = () => {
        const max = 900;
        let w = img.width, h = img.height;
        if (w > h) { if (w > max) { h = h * max / w; w = max; } }
        else        { if (h > max) { w = w * max / h; h = max; } }
        canvas.width  = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.style.display = 'block';
        document.getElementById('capture-placeholder').style.display = 'none';
        document.getElementById('remove-btn').style.display = 'flex';
        document.getElementById('identify-btn').style.display = 'flex';
    };
    img.src = src;
}

function removeImage() {
    const canvas = document.getElementById('preview-canvas');
    canvas.style.display = 'none';
    document.getElementById('capture-placeholder').style.display = 'block';
    document.getElementById('remove-btn').style.display = 'none';
    document.getElementById('identify-btn').style.display = 'none';
    document.getElementById('camera-input').value  = '';
    document.getElementById('gallery-input').value = '';
    resetIdResults();
}

function resetIdResults() {
    pendingIdResults  = [];
    selectedIdIndex   = null;
    document.getElementById('id-results').style.display    = 'none';
    document.getElementById('id-cards').innerHTML          = '';
}

// ── Image upload ───────────────────────────────────────────────
async function uploadImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${currentUser.id}/${Date.now()}.jpg`;
            const { error } = await sb.storage.from('garden-images').upload(path, blob, { contentType: 'image/jpeg' });
            if (error) { reject(error); return; }
            const { data: { publicUrl } } = sb.storage.from('garden-images').getPublicUrl(path);
            resolve(publicUrl);
        }, 'image/jpeg', 0.82);
    });
}

// ── Temp image upload for identification ───────────────────────
async function uploadTempImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${currentUser.id}/temp_${Date.now()}.jpg`;
            const { error } = await sb.storage
                .from('garden-images')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) { reject(error); return; }
            const { data: { publicUrl } } = sb.storage
                .from('garden-images')
                .getPublicUrl(path);
            resolve(publicUrl);
        }, 'image/jpeg', 0.5);
    });
}

// ── Species identification via Supabase Edge Function ──────────
async function identifySpecies() {
    const canvas = document.getElementById('preview-canvas');
    if (canvas.style.display === 'none') { alert('Please take or upload a photo first.'); return; }

    const btn = document.getElementById('identify-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Identifying...';

    document.getElementById('id-results').style.display = 'block';
    document.getElementById('id-cards').innerHTML = `
        <div class="spinner-wrap">
            <div class="spinner"></div>
            <p class="spinner-label">Analyzing with Claude AI...</p>
        </div>`;

    try {
        const tempUrl = await uploadTempImage(canvas);

      const fnResponse = await fetch(
    SUPABASE_URL + '/functions/v1/identify-species',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageUrl: tempUrl }),
    }
);
const data = await fnResponse.json();
if (data.error) throw new Error(data.error);
if (!data?.identifications?.length) throw new Error('No species identified. Try a clearer photo.');

        const top3 = data.identifications.slice(0, 3).map(r => {
            const nativeMatch = matchNative(r.common, r.scientific);
            return {
                ...r,
                common:   nativeMatch?.name || r.common,
                bloom:    r.bloom || nativeMatch?.bloom || null,
                category: r.category || nativeMatch?.type || (r.type === 'plant' ? 'Plant' : 'Insect'),
                isNative: r.isNative || !!nativeMatch,
                source:   'Claude AI'
            };
        });

        pendingIdResults = top3;
        selectedIdIndex  = null;
        renderIdCards(top3);

    } catch (err) {
        document.getElementById('id-cards').innerHTML = `
            <div class="id-card" style="border-color:var(--terra)">
                <p style="color:var(--terra);font-weight:600;">Identification failed</p>
                <p style="font-size:0.85em;color:var(--ink-mid);margin-top:6px;">${err.message}</p>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🔍</span> Identify species';
    }
}

// ── Identification result cards ────────────────────────────────
function renderIdCards(results) {
    const container = document.getElementById('id-cards');
    container.innerHTML = results.map((r, i) => `
        <div class="id-card ${i === 0 ? 'selected' : ''}" onclick="selectIdCard(${i})">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                    <div class="id-card-name">${r.common}</div>
                    <div class="id-card-sci">${r.scientific || ''}</div>
                </div>
                <span class="confidence-badge ${confidenceClass(r.confidence)}">${r.confidence}%</span>
            </div>
            <div class="id-card-desc">${r.description || ''}</div>
            <div class="id-card-tags">
                ${r.isNative ? '<span class="tag native">⭐ Native</span>' : ''}
                <span class="tag">${r.category || r.type}</span>
                ${r.bloom ? `<span class="tag season">🌸 ${r.bloom.join(', ')}</span>` : ''}
            </div>
        </div>
    `).join('');

    selectedIdIndex = 0;

    container.innerHTML += `
        <textarea id="id-notes" class="id-notes" placeholder="Add notes (optional)..." rows="2"></textarea>
        <button class="btn-primary" onclick="saveSelectedId()" style="width:100%;margin-top:8px;">
            <span class="btn-icon">💾</span> Save to garden
        </button>`;
}

function selectIdCard(index) {
    selectedIdIndex = index;
    document.querySelectorAll('.id-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}

async function saveSelectedId() {
    if (selectedIdIndex === null || !pendingIdResults.length) return;

    const result = pendingIdResults[selectedIdIndex];
    const notes = (document.getElementById('id-notes')?.value || '').trim();
    const canvas = document.getElementById('preview-canvas');

    const btn = document.querySelector('#id-results .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const imageUrl = await uploadImage(canvas);
        const entry = buildEntry(result, imageUrl, notes);
        const { error } = await sb.from('inventory').insert(entry);
        if (error) throw error;

        alert(`${result.common} added to your garden!`);
        removeImage();
        await loadInventory();
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Save to garden';
    }
}

function buildEntry(result, imageUrl, notes) {
    return {
        user_id:     currentUser.id,
        common:      result.common || '',
        scientific:  result.scientific || '',
        type:        result.type || 'plant',
        category:    result.category || '',
        confidence:  result.confidence || null,
        description: result.description || '',
        care:        result.care || null,
        bloom:       result.bloom || null,
        season:      result.season || null,
        is_native:   result.isNative || false,
        source:      result.source || 'Claude AI',
        image_url:   imageUrl || null,
        notes:       notes || '',
    };
}

// ── Manual entry ───────────────────────────────────────────────
function openManualEntry() {
    ['manual-common','manual-scientific','manual-category','manual-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('manual-type').value = 'plant';
    document.querySelectorAll('.bloom-check').forEach(cb => cb.checked = false);
    openModal('manual-modal');
}

async function saveManualEntry() {
    const common = document.getElementById('manual-common').value.trim();
    if (!common) { alert('Common name is required.'); return; }

    const scientific = document.getElementById('manual-scientific').value.trim();
    const type       = document.getElementById('manual-type').value;
    const category   = document.getElementById('manual-category').value.trim();
    const notes      = document.getElementById('manual-notes').value.trim();
    const bloom      = [...document.querySelectorAll('.bloom-check:checked')].map(cb => cb.value);

    const nativeMatch = matchNative(common, scientific);

    const result = {
        common:     nativeMatch?.name || common,
        scientific: scientific || nativeMatch?.scientific || '',
        type,
        category:   category || nativeMatch?.type || (type === 'plant' ? 'Plant' : 'Insect'),
        bloom:      bloom.length ? bloom : (nativeMatch?.bloom || null),
        season:     type === 'bug' ? ['Year-round'] : null,
        isNative:   !!nativeMatch,
        source:     'Manual'
    };

    const btn = document.querySelector('#manual-modal .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const entry = buildEntry(result, null, notes);
        const { error } = await sb.from('inventory').insert(entry);
        if (error) throw error;

        if (nativeMatch) alert(`Saved! ${result.common} is a Florida native plant.`);
        else alert(`${result.common} added to your garden.`);

        closeModal('manual-modal');
        await loadInventory();
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save entry';
    }
}

// ── Inventory ──────────────────────────────────────────────────
async function loadInventory() {
    const { data, error } = await sb.from('inventory')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false });
    if (error) { console.error(error); return; }
    allInventory = data || [];
    updateStats();
    renderInventory();
    renderTimeline();
}

function updateStats() {
    document.getElementById('stat-plants').textContent  = allInventory.filter(i => i.type === 'plant').length;
    document.getElementById('stat-bugs').textContent    = allInventory.filter(i => i.type === 'bug').length;
    document.getElementById('stat-natives').textContent = allInventory.filter(i => i.is_native).length;
}

function handleSearch(val) {
    currentSearch = val.toLowerCase().trim();
    renderInventory();
}

function setFilter(filter, btnEl) {
    currentFilter = filter;
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderInventory();
}

function renderInventory() {
    let items = [...allInventory];

    if (currentFilter === 'plant')   items = items.filter(i => i.type === 'plant');
    if (currentFilter === 'bug')     items = items.filter(i => i.type === 'bug');
    if (currentFilter === 'native')  items = items.filter(i => i.is_native);
    if (currentFilter === 'blooming') {
        const season = getCurrentSeason();
        items = items.filter(i => i.bloom && (i.bloom.includes(season) || i.bloom.includes('Year-round')));
    }

    if (currentSearch) {
        items = items.filter(i =>
            (i.common      || '').toLowerCase().includes(currentSearch) ||
            (i.scientific  || '').toLowerCase().includes(currentSearch) ||
            (i.category    || '').toLowerCase().includes(currentSearch) ||
            (i.notes       || '').toLowerCase().includes(currentSearch)
        );
    }

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

        const tags = [];
        if (item.is_native) tags.push('<span class="tag native" style="font-size:0.68em;padding:2px 7px;">⭐ Native</span>');
        if (item.bloom)     tags.push(`<span class="tag season" style="font-size:0.68em;padding:2px 7px;">🌸 ${item.bloom.slice(0,2).join(', ')}</span>`);

        card.innerHTML = `
            ${imgEl}
            <div class="garden-card-info">
                <div class="garden-card-name">${item.common}</div>
                <div class="garden-card-sci">${item.scientific || ''}</div>
                <div class="garden-card-tags">${tags.join('')}</div>
            </div>`;
        grid.appendChild(card);
    });
}

// ── Item detail modal ──────────────────────────────────────────
function showItemDetail(item) {
    const body = document.getElementById('item-modal-body');

    const imgEl = item.image_url
        ? `<img class="detail-img" src="${item.image_url}" alt="${item.common}">`
        : `<div style="width:100%;height:160px;background:var(--cream-dark);border-radius:var(--radius);margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:48px;">${item.type === 'plant' ? '🌿' : '🐛'}</div>`;

    const rows = [
        ['Type', item.category || item.type],
        ['Added', new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
        item.confidence ? ['ID confidence', item.confidence + '%'] : null,
        item.bloom   ? ['Blooming season', item.bloom.join(', ')] : null,
        item.season  ? ['Active season',   item.season.join(', ')] : null,
        item.care    ? ['Care',            item.care]              : null,
        item.source  ? ['Identified via',  item.source]           : null,
    ].filter(Boolean);

    const nativeBadge = item.is_native
        ? '<span class="tag native" style="display:inline-block;margin-bottom:12px;">⭐ Florida Native</span>'
        : '';

    body.innerHTML = `
        ${imgEl}
        <div class="detail-name">${item.common}</div>
        <div class="detail-sci">${item.scientific || ''}</div>
        ${nativeBadge}
        ${rows.map(([k,v]) => `<div class="detail-row"><span class="detail-key">${k}</span><span class="detail-val">${v}</span></div>`).join('')}
        ${item.notes ? `<div class="detail-notes"><div class="detail-notes-label">Notes</div><div class="detail-notes-text">${item.notes}</div></div>` : ''}
        <div class="detail-delete">
            <button class="btn-danger" onclick="deleteItem('${item.id}', '${item.image_url || ''}')">Delete entry</button>
        </div>`;

    openModal('item-modal');
}

async function deleteItem(id, imageUrl) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    if (imageUrl) {
        try {
            const path = imageUrl.split('/garden-images/')[1];
            if (path) await sb.storage.from('garden-images').remove([path]);
        } catch (e) { console.warn('Image delete failed:', e); }
    }
    closeModal('item-modal');
    await loadInventory();
}

// ── Timeline ───────────────────────────────────────────────────
function renderTimeline() {
    const seasons = ['Spring','Summer','Fall','Winter'];
    const container = document.getElementById('timeline-content');
    container.innerHTML = '';

    seasons.forEach(season => {
        const block = document.createElement('div');
        block.className = 'season-block';

        const bloomingPlants = allInventory.filter(i =>
            i.type === 'plant' && i.bloom &&
            (i.bloom.includes(season) || i.bloom.includes('Year-round'))
        );
        const activeInsects = allInventory.filter(i =>
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

// ── Export ─────────────────────────────────────────────────────
async function exportJSON() {
    const blob = new Blob([JSON.stringify({ version: '3.1', date: new Date().toISOString(), entries: allInventory }, null, 2)], { type: 'application/json' });
    download(blob, `garden-${today()}.json`);
}

async function exportCSV() {
    let csv = 'Common,Scientific,Type,Category,Date,Confidence,Bloom,Season,Native,Notes,Image URL\n';
    allInventory.forEach(i => {
        csv += `"${i.common}","${i.scientific}","${i.type}","${i.category}","${new Date(i.date).toLocaleDateString()}","${i.confidence || ''}","${(i.bloom||[]).join(', ')}","${(i.season||[]).join(', ')}","${i.is_native ? 'Yes':'No'}","${i.notes || ''}","${i.image_url || ''}"\n`;
    });
    download(new Blob([csv], { type: 'text/csv' }), `garden-${today()}.csv`);
}

function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function today() { return new Date().toISOString().split('T')[0]; }

async function clearAllData() {
    if (!confirm('Delete ALL garden entries? This cannot be undone.')) return;
    const { error } = await sb.from('inventory').delete().eq('user_id', currentUser.id);
    if (error) { alert('Error: ' + error.message); return; }
    allInventory = [];
    updateStats();
    renderInventory();
    renderTimeline();
    alert('Garden cleared.');
}

// ── Native plant DB modal ──────────────────────────────────────
function showNativesDB() {
    const list = document.getElementById('natives-list');
    list.innerHTML = NATIVE_PLANTS.map(p => `
        <div class="native-item">
            <div class="native-item-name">${p.name}</div>
            <div class="native-item-sci">${p.scientific}</div>
            <div class="native-item-detail">${p.type} · Blooms: ${p.bloom.join(', ')}</div>
        </div>`).join('');
    openModal('natives-modal');
}

// ── Modal helpers ──────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}
