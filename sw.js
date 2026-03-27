const CACHE_VERSION = 'v16';
const STATIC_CACHE = `garden-static-${CACHE_VERSION}`;
const IMAGE_CACHE = 'garden-images-v1';
const IMAGE_CACHE_MAX = 200; // max entries before LRU eviction

const CORE_FILES = [
    '/Mamas-Garden-App/',
    '/Mamas-Garden-App/index.html',
    '/Mamas-Garden-App/css/base.css',
    '/Mamas-Garden-App/css/components.css',
    '/Mamas-Garden-App/css/screens.css',
    '/Mamas-Garden-App/js/app.js',
    '/Mamas-Garden-App/js/network.js',
];

const SUPABASE_STORAGE_ORIGIN = 'https://itjvgruwvlrrlhsknwiw.supabase.co';
const IMAGE_PATH = '/storage/v1/object/public/garden-images/';

function isGardenImage(url) {
    return url.origin === SUPABASE_STORAGE_ORIGIN
        && url.pathname.startsWith(IMAGE_PATH)
        && !url.pathname.includes('/temp_');
}

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
    );
});

// ── Activate — clean old static caches, keep image cache ────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k.startsWith('garden-static-') && k !== STATIC_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── LRU eviction for image cache ─────────────────────────────
async function evictOldImages() {
    const cache = await caches.open(IMAGE_CACHE);
    const keys = await cache.keys();
    if (keys.length > IMAGE_CACHE_MAX) {
        // Delete oldest entries (first in = first out)
        const toDelete = keys.slice(0, keys.length - IMAGE_CACHE_MAX);
        await Promise.all(toDelete.map(k => cache.delete(k)));
    }
}

// ── Fetch handler ─────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    // Garden images: stale-while-revalidate
    if (isGardenImage(url)) {
        e.respondWith(
            caches.open(IMAGE_CACHE).then(async (cache) => {
                const cached = await cache.match(request);

                const networkFetch = fetch(request).then((response) => {
                    if (response.ok) {
                        cache.put(request, response.clone());
                        evictOldImages();
                    }
                    return response;
                }).catch(() => cached); // If network fails and no cache, return undefined

                return cached || networkFetch;
            })
        );
        return;
    }

    // Navigation: network-first with cache fallback
    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache-first
    e.respondWith(
        caches.match(request).then(cached => cached || fetch(request))
    );
});
