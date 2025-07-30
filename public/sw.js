// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('formtouch-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        // Cache PDF images for offline use
        if (event.request.url.includes('data:image/png;base64')) {
          const responseClone = response.clone();
          caches.open('formtouch-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
