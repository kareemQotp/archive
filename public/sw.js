// Simple Service Worker for PWA offline support
const CACHE_NAME = 'archive-cache-v1';
const urlsToCache = [
  'index.html',
  'login.html',
  'register.html',
  'upload.html',
  'search.html',
  'scanner.html',
  'assets/css/style.css',
  'assets/js/firebase-init.js',
  'assets/js/auth.js',
  // Add more assets as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
