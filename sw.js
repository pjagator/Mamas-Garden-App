const CACHE_VERSION = 'v14';
const CACHE_NAME = `garden-${CACHE_VERSION}`;
const CORE_FILES = [
    '/Mamas-Garden-App/',
    '/Mamas-Garden-App/index.html',
    '/Mamas-Garden-App/css/base.css',
    '/Mamas-Garden-App/css/components.css',
    '/Mamas-Garden-App/css/screens.css',
    '/Mamas-Garden-App/js/app.js',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const { request } = e;

    // Navigation requests: network-first
    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request)
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache-first
    e.respondWith(
        caches.match(request)
            .then(cached => cached || fetch(request))
    );
});
