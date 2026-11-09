const CACHE_NAME = 'fleet-moto-v1';
const APP_SHELL = [
    './',
    './index.html',
    './app.js',
    './supabase-config.js',
    './assets/css/styles.css',
    './assets/images/icon.svg',
    './manifest.webmanifest',
];
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://esm.sh/@supabase/supabase-js@2?bundle'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
        await cache.addAll(APP_SHELL);
        await Promise.all(CDN_ASSETS.map(async url => {
            try {
                const response = await fetch(url, { mode: 'cors' });
                if (response.ok) await cache.put(url, response);
            } catch {
                // CDN resources are optional for installing the offline shell.
            }
        }));
    }));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    if (CDN_ASSETS.includes(request.url)) {
        event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
        return;
    }
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then(cached => {
            const networkRequest = fetch(request).then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            }).catch(() => cached);
            return cached || networkRequest;
        })
    );
});