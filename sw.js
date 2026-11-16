// Offline-Speicher für die Handschrift-App.
// Lädt die App zuerst aus dem Internet (damit Updates sofort ankommen)
// und nutzt die gespeicherte Kopie, wenn kein Netz da ist.
const CACHE = 'handschrift-v9';
const FILES = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Bei langsamem Netz nach 4 Sekunden auf die gespeicherte Kopie ausweichen
      const res = await Promise.race([
        fetch(e.request, { cache: 'no-cache' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      return cached || (await cache.match('./index.html')) || new Response('Offline', { status: 503 });
    }
  })());
});
