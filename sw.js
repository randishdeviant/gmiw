// gmiw-cache-v3
// Service Worker ini hanya meng-cache shell wrapper (index.html).
// Aset map (tiles webp, JS, CSS Hoyolab) di-cache oleh browser secara native
// karena CDN Hoyoverse mengirim header cache-control: max-age=31536000 (1 tahun).
// SW tidak bisa intercept request dari iframe cross-origin (act.hoyolab.com).
const CACHE_NAME = 'gmiw-cache-v3';
const SHELL_ASSETS = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Hapus cache lama
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Hanya handle same-origin requests (wrapper shell)
    if (url.origin !== self.location.origin) return;
    if (!url.protocol.startsWith('http')) return;

    // Network-First untuk shell: pastikan selalu dapat versi terbaru
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
