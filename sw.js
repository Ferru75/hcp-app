
self.addEventListener('install', function(event) {
  console.log('Service Worker installato');
});

self.addEventListener('fetch', function(event) {
  // serve solo per attivare PWA
});
``
