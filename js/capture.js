// ── Photo capture & identification ─────────────────────────────
import { sb, getCurrentUser, SUPABASE_URL, SUPABASE_ANON_KEY, matchNative, confidenceClass, openModal, closeModal, emit, PRESET_TAGS } from './app.js';
import { generateCareProfile } from './features.js';
import { resilientFetch, isOnline } from './network.js';

async function ensureSession() {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) {
        const { data: refreshed, error: refreshErr } = await sb.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
            throw new Error('Your session has expired. Please sign out and sign back in.');
        }
    }
}

// Module-local state
let pendingIdResults = [];
let selectedIdIndex = null;

// ── Internal helpers ──────────────────────────────────────────

function friendlyError(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('overloaded')) {
        return {
            title: 'Identification service is busy',
            message: 'Our plant identification service is experiencing high demand. Please wait a moment and try again.'
        };
    }
    if (lower.includes('no species identified') || lower.includes('empty array')) {
        return {
            title: 'No species found',
            message: 'We couldn\'t identify a plant or insect in this photo. Try a closer, well-lit shot of the leaves or flowers.'
        };
    }
    if (lower.includes('could not fetch image')) {
        return {
            title: 'Photo upload issue',
            message: 'There was a problem loading your photo for analysis. Please try taking or selecting the photo again.'
        };
    }
    if (lower.includes('lock') || lower.includes('another request')) {
        return {
            title: 'Session busy',
            message: 'Your session was refreshing. Please try again — it should work on the next attempt.'
        };
    }
    if (lower.includes('session') || lower.includes('sign')) {
        return {
            title: 'Session expired',
            message: 'Your session has expired. Please sign out and sign back in, then try again.'
        };
    }
    return {
        title: 'Identification failed',
        message: msg
    };
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

function resetIdResults() {
    pendingIdResults  = [];
    selectedIdIndex   = null;
    document.getElementById('id-results').style.display    = 'none';
    document.getElementById('id-cards').innerHTML          = '';
}

async function uploadImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${getCurrentUser().id}/${Date.now()}.jpg`;
            const { error } = await sb.storage.from('garden-images').upload(path, blob, { contentType: 'image/jpeg' });
            if (error) { reject(error); return; }
            const { data: { publicUrl } } = sb.storage.from('garden-images').getPublicUrl(path);
            resolve(publicUrl);
        }, 'image/jpeg', 0.82);
    });
}

async function uploadTempImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async blob => {
            const path = `${getCurrentUser().id}/temp_${Date.now()}.jpg`;
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

function buildEntry(result, imageUrl, notes) {
    // Auto-populate tags from category
    const autoTags = [];
    if (result.category && PRESET_TAGS.includes(result.category)) {
        autoTags.push(result.category);
    }
    return {
        user_id:     getCurrentUser().id,
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
        tags:        autoTags,
    };
}

// ── Exported functions ────────────────────────────────────────

export function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => renderPreview(e.target.result);
    reader.readAsDataURL(file);
    resetIdResults();
}

export function removeImage() {
    const canvas = document.getElementById('preview-canvas');
    canvas.style.display = 'none';
    document.getElementById('capture-placeholder').style.display = 'block';
    document.getElementById('remove-btn').style.display = 'none';
    document.getElementById('identify-btn').style.display = 'none';
    document.getElementById('camera-input').value  = '';
    document.getElementById('gallery-input').value = '';
    resetIdResults();
}

export async function identifySpecies() {
    const canvas = document.getElementById('preview-canvas');
    if (canvas.style.display === 'none') { alert('Please take or upload a photo first.'); return; }
    if (!isOnline()) {
        alert('Species identification requires an internet connection. Please try again when you\u2019re back online.');
        return;
    }

    await ensureSession();

    const btn = document.getElementById('identify-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-dots" style="display:inline-flex;padding:0;gap:4px;margin-right:8px;vertical-align:middle;"><span></span><span></span><span></span></div> Identifying...';

    document.getElementById('id-results').style.display = 'block';
    document.getElementById('id-cards').innerHTML = `
        <div class="spinner-wrap">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <p class="spinner-label">Analyzing with Claude AI...</p>
        </div>`;

    try {
        const tempUrl = await uploadTempImage(canvas);

      const fnResponse = await resilientFetch(
    SUPABASE_URL + '/functions/v1/identify-species',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ imageUrl: tempUrl }),
    },
    { retries: 2, timeoutMs: 30000 }
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
        const friendly = friendlyError(err.message);
        document.getElementById('id-cards').innerHTML = `
            <div class="id-card" style="border-color:var(--terra)">
                <p style="color:var(--terra);font-weight:600;">${friendly.title}</p>
                <p style="font-size:0.85em;color:var(--ink-mid);margin-top:6px;">${friendly.message}</p>
            </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🔍</span> Identify species';
    }
}

export function renderIdCards(results) {
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

export function selectIdCard(index) {
    selectedIdIndex = index;
    document.querySelectorAll('.id-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}

export async function saveSelectedId() {
    if (selectedIdIndex === null || !pendingIdResults.length) return;
    if (!isOnline()) {
        alert('Saving requires an internet connection. Your photo is preserved \u2014 try again when connected.');
        return;
    }

    const result = pendingIdResults[selectedIdIndex];
    const notes = (document.getElementById('id-notes')?.value || '').trim();
    const canvas = document.getElementById('preview-canvas');

    const btn = document.querySelector('#id-results .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        await ensureSession();
        const imageUrl = await uploadImage(canvas);
        const entry = buildEntry(result, imageUrl, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;
        if (!inserted) throw new Error('Save failed — no data returned. Please try signing out and back in.');

        alert(`${result.common} added to your garden!`);
        removeImage();
        emit('inventory-changed');

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Save to garden';
    }
}

export function openManualEntry() {
    ['manual-common','manual-scientific','manual-category','manual-notes'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('manual-type').value = 'plant';
    document.querySelectorAll('.bloom-check').forEach(cb => cb.checked = false);
    openModal('manual-modal');
}

export async function saveManualEntry() {
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
        await ensureSession();
        const canvas = document.getElementById('preview-canvas');
        const hasPhoto = canvas && canvas.style.display !== 'none';
        const imageUrl = hasPhoto ? await uploadImage(canvas) : null;
        const entry = buildEntry(result, imageUrl, notes);
        const { data: inserted, error } = await sb.from('inventory').insert(entry).select().single();
        if (error) throw error;
        if (!inserted) throw new Error('Save failed — no data returned. Please try signing out and back in.');

        if (nativeMatch) alert(`Saved! ${result.common} is a Florida native plant.`);
        else alert(`${result.common} added to your garden.`);

        closeModal('manual-modal');
        if (hasPhoto) removeImage();
        emit('inventory-changed');

        // Generate care profile in background (non-blocking)
        if (inserted && inserted.type === 'plant') {
            generateCareProfile(inserted.id, inserted.common, inserted.scientific, inserted.type, inserted.category);
        }
    } catch (err) {
        alert('Error saving: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save entry';
    }
}
