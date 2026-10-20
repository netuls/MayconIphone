const C = 'mi-v3';
const F = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './config.js',
  './core.js',
  './pix-seguro.js',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './manifest.json',
  './manifest-admin.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(C).then((cache) =>
      // Adiciona um por um: se algum arquivo não existir, os outros continuam sendo salvos
      Promise.all(
        F.map((file) =>
          cache.add(file).catch((err) => {
            console.warn('Não foi possível guardar em cache:', file, err);
          })
        )
      )
    )
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

  // Só trata GET do mesmo site. Pix (Netlify), Firebase e fontes passam direto.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !['http:', 'https:'].includes(url.protocol)
  ) {
    return;
  }

  // Rede primeiro; se estiver offline, usa o cache
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
          const page = await caches.match(
            url.pathname.includes('admin') ? './admin.html' : './index.html'
          );
          if (page) return page;
        }

        return Response.error();
      })
  );
});
