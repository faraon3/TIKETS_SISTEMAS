/* ============================================
   MESA DE AYUDA - SERVICE WORKER
   Versión: v10
   ============================================ */

const CACHE_NAME = 'mesa-ayuda-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

/* ============================================
   INSTALL - Cachear recursos iniciales
   ============================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS).catch((err) => {
          console.warn('⚠ No se pudieron cachear todos los assets:', err.message);
        });
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('❌ Error en install:', err.message);
        return self.skipWaiting();
      })
  );
});

/* ============================================
   ACTIVATE - Limpiar cachés viejos
   ============================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              return caches.delete(key).catch((err) => {
                console.warn('⚠ No se pudo borrar caché', key, err.message);
              });
            })
        );
      })
      .then(() => self.clients.claim())
      .catch((err) => {
        console.error('❌ Error en activate:', err.message);
        return self.clients.claim();
      })
  );
});

/* ============================================
   FETCH - Interceptar peticiones
   ============================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== 'GET') return;

  // Solo URLs HTTP/HTTPS (ignora chrome-extension, moz-extension, etc)
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) return;

  event.respondWith(manejarFetch(req));
});

async function manejarFetch(req) {
  try {
    // 1. Buscar en caché
    const cached = await caches.match(req);
    if (cached) return cached;

    // 2. Si no está, traer de la red
    const response = await fetch(req);

    // 3. Cachear solo si es válido y es recurso externo
    if (response && response.status === 200 && esRecursoCacheable(req.url)) {
      cachearRespuesta(req, response).catch((err) => {
        console.warn('⚠ No se pudo cachear:', req.url, err.message);
      });
    }

    return response;
  } catch (err) {
    // 4. Si falla la red, intentar servir index.html (modo offline)
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw err;
  }
}

function esRecursoCacheable(url) {
  return url.includes('cdn.jsdelivr.net') ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com');
}

async function cachearRespuesta(req, response) {
  try {
    const cache = await caches.open(CACHE_NAME);

    // Clonar la respuesta antes de consumir su contenido
    await cache.put(req, response.clone());

  } catch (err) {
    if (err.name !== 'InvalidStateError') {
      console.warn('⚠ No se pudo cachear:', req.url, err.message);
    }
  }
}
