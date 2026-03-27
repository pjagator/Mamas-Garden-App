// ── Network resilience utilities ─────────────────────────────
// No imports from app.js — this is a standalone utility module.

let _online = navigator.onLine;
const _connectionListeners = [];

window.addEventListener('online', () => { _online = true; _connectionListeners.forEach(fn => fn(true)); });
window.addEventListener('offline', () => { _online = false; _connectionListeners.forEach(fn => fn(false)); });

export function isOnline() { return _online; }

export function onConnectionChange(fn) {
    _connectionListeners.push(fn);
    return () => {
        const idx = _connectionListeners.indexOf(fn);
        if (idx !== -1) _connectionListeners.splice(idx, 1);
    };
}

export async function resilientFetch(url, options = {}, config = {}) {
    const { retries = 2, timeoutMs = 15000 } = config;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timer);

            // Retry on 5xx / 529 (not on 4xx — those are real errors)
            if ((response.status === 529 || response.status >= 500) && attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            return response;
        } catch (err) {
            clearTimeout(timer);

            if (err.name === 'AbortError') {
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw new Error('Request timed out. Please check your connection and try again.');
            }

            // Network error (offline, DNS failure, etc.)
            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            throw err;
        }
    }
}
