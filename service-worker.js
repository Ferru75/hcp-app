
const CACHE_NAME = "hcp-pro-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/campi.json",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// fetch (offline)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
