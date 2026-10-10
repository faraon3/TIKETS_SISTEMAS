const CACHE = 'mesa-ayuda-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE).map(k => caches.delete(k).catch(() => {}))
        )
      )
      .then(() => self.clients.claim())
      .catch(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Ignorar métodos que no sean GET
  if (e.request.method !== 'GET') return;
  
  // Ignorar extensiones de Chrome y otros esquemas no HTTP
  if (!e.request.url.startsWith('http')) return;
  
  e.respondWith(
    caches.match(e.request)
      .then(r => {
        if (r) return r;
        return fetch(e.request)
          .then(resp => {
            // Solo cachear respuestas válidas
            if (!resp || resp.status !== 200) return resp;
            
            // Cachear solo recursos externos (CDN, fonts)
            if (e.request.url.includes('cdn') || e.request.url.includes('fonts')) {
              try {
                const clone = resp.clone();
                caches.open(CACHE)
                  .then(c => c.put(e.request, clone))
                  .catch(err => console.warn('⚠ Cache put failed:', err.message));
              } catch (err) {
                // Ignorar errores de clonación
              }
            }
            return resp;
          })
          .catch(() => caches.match('./index.html'));
      })
      .catch(() => caches.match('./index.html'))
  );
});
