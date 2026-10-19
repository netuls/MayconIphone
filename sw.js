
const C = 'mi-v1';
const F = [
  './',
  './index.html',
  './config.js',
  './logo.png',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(C)
      .then((cache) => cache.addAll(F))
      .catch((err) => {
        console.warn('Não foi possível criar o cache:', err);
      })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== C)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const request = e.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !['http:', 'https:'].includes(url.protocol)
  ) {
    return;
  }

  e.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(C).then((cache) =>
            cache.put(request, copy)
          ).catch(() => {});
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          const page = await caches.match('./index.html');
          if (page) return page;
        }

        return Response.error();
      })
  );
});
