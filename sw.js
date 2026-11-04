/* Hors-ligne : réseau d'abord (mises à jour immédiates), cache si pas de connexion. */
const CACHE = 'mots-fleches-v2';
const ASSETS = [
  './', 'index.html', 'css/playground.css', 'css/style.css', 'manifest.webmanifest',
  'js/util.js', 'js/dico-wiki.js', 'js/dico.js', 'js/generator.js', 'js/recognizer.js', 'js/storage.js', 'js/app.js',
  'icons/icon.svg', 'icons/favicon.ico', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(cache =>
    fetch(req, { cache: 'no-cache' })
      .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req, { ignoreSearch: true }))
  ));
});
