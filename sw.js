const CACHE_NAME = 'map-cache-v1';

// Pasang Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Mencegat semua request dari Iframe
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Cek apakah yang diminta adalah aset gambar (tile map) atau script utama
    const isImageAsset = event.request.destination === 'image' || url.match(/\.(png|jpg|jpeg|webp|svg|gif)/);
    const isStaticAsset = url.match(/\.(js|css)/);

    if (isImageAsset || isStaticAsset) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // 1. Jika ada di cache, langsung berikan (SAT-SET!)
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // 2. Jika tidak ada, ambil dari internet, lalu simpan ke cache secara agresif
                    return fetch(event.request).then((networkResponse) => {
                        // Hanya cache response yang valid
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Offline fallback jika gagal koneksi
                        return new Response('Offline', { status: 503 });
                    });
                });
            })
        );
    }
});
