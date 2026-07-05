const CACHE_NAME = 'map-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // VALIDASI KRUSIAL: Hanya proses request yang menggunakan skema http atau https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return; // Abaikan request ekstensi browser agar tidak merusak cache flow
    }

    const isImageAsset = event.request.destination === 'image' || url.match(/\.(png|jpg|jpeg|webp|svg|gif)/);
    const isStaticAsset = url.match(/\.(js|css)/);

    if (isImageAsset || isStaticAsset) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        return new Response('Offline', { status: 503 });
                    });
                });
            })
        );
    }
});
