/* Peonies Boutique catalog – offline support (service worker).
   Caches the app files so the catalog opens without internet once installed.
   Your catalog content (photos, film, settings) is stored separately in the browser database. */
const VERSION = 'peonies-a7e3b171be';
const FILES = [
 "./",
 "Guide.html",
 "assets/brand/blossom-small.webp",
 "assets/brand/crest.png",
 "assets/brand/frame.webp",
 "assets/brand/leaves-2.webp",
 "assets/brand/leaves.webp",
 "assets/brand/logo-cream.png",
 "assets/brand/logo-olive.png",
 "assets/brand/peony-blush.webp",
 "assets/brand/peony-bud.webp",
 "assets/brand/peony-ivory.webp",
 "assets/brand/peony-leaves.webp",
 "assets/brand/peony-line.webp",
 "assets/brand/peony-white.webp",
 "assets/brand/spray-blush.webp",
 "assets/brand/spray-white.webp",
 "assets/brand/texture-cream.jpg",
 "assets/brand/texture-olive.jpg",
 "assets/fonts/FONT-LICENSES.txt",
 "assets/fonts/amiri-arabic-400-normal.woff2",
 "assets/fonts/amiri-arabic-700-normal.woff2",
 "assets/fonts/cormorant-garamond-latin-400-italic.woff2",
 "assets/fonts/cormorant-garamond-latin-400-normal.woff2",
 "assets/fonts/cormorant-garamond-latin-500-normal.woff2",
 "assets/fonts/cormorant-garamond-latin-600-normal.woff2",
 "assets/fonts/forum-latin-400-normal.woff2",
 "assets/icons/apple-touch-icon.png",
 "assets/icons/icon-192.png",
 "assets/icons/icon-512.png",
 "assets/icons/icon-maskable-512.png",
 "css/admin.css",
 "css/catalog.css",
 "index.html",
 "js/admin.js",
 "js/catalog.js",
 "js/data.js",
 "js/seed-images.js",
 "js/ui.js",
 "manifest.webmanifest"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
