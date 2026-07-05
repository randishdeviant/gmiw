const CACHE_NAME = 'gmiw-cache-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle http and https requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    const path = url.pathname;

    // 1. Same-Origin Proxy for Hoyolab Interactive Map (HTML, JS, CSS relative requests)
    if (url.origin === self.location.origin && path.startsWith('/ys/app/interactive-map/')) {
        const targetUrl = 'https://act.hoyolab.com' + path + url.search + url.hash;
        
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                const isHTML = path.endsWith('index.html') || path.endsWith('/');
                
                if (isHTML) {
                    // For HTML, use Network-First strategy so updates to the map page are immediately loaded, falling back to cache if offline
                    return fetch(targetUrl).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cache.match(request));
                }

                // For static JS/CSS assets, use Cache-First strategy
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(targetUrl).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // 2. Cache-First for Map Tiles & cross-origin assets (hoyoverse / hoyolab)
    const isHoyoDomain = url.hostname.includes('hoyoverse.com') || url.hostname.includes('hoyolab.com');
    const isImage = request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)/);
    const isStatic = request.destination === 'script' || request.destination === 'style' || url.pathname.match(/\.(js|css)/);

    if (isHoyoDomain && (isImage || isStatic)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Fallback in case of CORS issues on specific endpoints (fetch without CORS as opaque)
                        return fetch(request);
                    });
                });
            })
        );
        return;
    }
});
