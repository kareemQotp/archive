const VERSION = '1.0.0';
const CACHE_NAMES = {
    static: `static-${VERSION}`,
    dynamic: `dynamic-${VERSION}`,
    documents: `documents-${VERSION}`
};

// Resources to cache immediately
const STATIC_RESOURCES = [
    '/',
    '/offline',
    '/static/css/style.css',
    '/static/css/document.css',
    '/static/css/document-view.css',
    '/static/css/scanner.css',
    '/static/js/main.js',
    '/static/js/modules/core.js',
    '/static/js/modules/api.js',
    '/static/js/modules/config.js',
    '/static/js/modules/document.js',
    '/static/js/modules/events.js',
    '/static/js/document-view.js',
    '/static/js/scanner.js',
    '/static/images/icon-192.png',
    '/static/images/icon-512.png',
    '/static/site.webmanifest',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2'
];

// Cache strategies
const CACHE_STRATEGIES = {
    /**
     * Cache first, fall back to network
     * Best for static assets that rarely change
     */
    cacheFirst: async (request) => {
        const cache = await caches.match(request);
        return cache || fetchAndCache(request, CACHE_NAMES.static);
    },

    /**
     * Network first, fall back to cache
     * Best for frequently updated resources
     */
    networkFirst: async (request) => {
        try {
            return await fetchAndCache(request, CACHE_NAMES.dynamic);
        } catch (error) {
            const cache = await caches.match(request);
            if (cache) {
                return cache;
            }
            throw error;
        }
    },

    /**
     * Network only, no caching
     * Best for API calls and dynamic content
     */
    networkOnly: async (request) => {
        return await fetch(request);
    },

    /**
     * Stale while revalidate
     * Best for content that can be slightly out of date
     */
    staleWhileRevalidate: async (request) => {
        const cache = await caches.open(CACHE_NAMES.dynamic);
        const cachedResponse = await cache.match(request);
        
        const fetchPromise = fetch(request).then(async (networkResponse) => {
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        });
        
        return cachedResponse || fetchPromise;
    }
};

// Helper function to fetch and cache
async function fetchAndCache(request, cacheName) {
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
    }
    return response;
}

// Helper function to remove old caches
async function removeOldCaches() {
    const keys = await caches.keys();
    const validCacheSet = new Set(Object.values(CACHE_NAMES));
    
    return Promise.all(
        keys.map(key => {
            if (!validCacheSet.has(key)) {
                return caches.delete(key);
            }
        })
    );
}

// Install event handler
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            // Cache static resources
            caches.open(CACHE_NAMES.static)
                .then(cache => cache.addAll(STATIC_RESOURCES)),
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate event handler
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Remove old caches
            removeOldCaches(),
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Fetch event handler
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle different types of requests
    if (url.pathname.startsWith('/api/')) {
        // API requests
        event.respondWith(
            CACHE_STRATEGIES.networkOnly(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'You are offline' }), 
                        { 
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
    } else if (url.pathname.startsWith('/static/')) {
        // Static assets
        event.respondWith(CACHE_STRATEGIES.cacheFirst(event.request));
    } else if (url.pathname.startsWith('/document/view/')) {
        // Document views
        event.respondWith(CACHE_STRATEGIES.networkFirst(event.request));
    } else if (url.pathname.startsWith('/document/download/')) {
        // Document downloads
        event.respondWith(CACHE_STRATEGIES.networkOnly(event.request));
    } else if (event.request.mode === 'navigate') {
        // Navigation requests
        event.respondWith(
            CACHE_STRATEGIES.networkFirst(event.request)
                .catch(() => caches.match('/offline'))
        );
    } else {
        // Other requests
        event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(event.request));
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-documents') {
        event.waitUntil(syncDocuments());
    }
});

// Push notification handler
self.addEventListener('push', event => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: '/static/images/icon-192.png',
        badge: '/static/images/icon-192.png',
        data: data.data
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Background sync function
async function syncDocuments() {
    const cache = await caches.open(CACHE_NAMES.documents);
    const requests = await cache.keys();
    
    return Promise.all(
        requests.map(async (request) => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                }
                return response;
            } catch (error) {
                console.error('Sync failed for:', request.url);
                return error;
            }
        })
    );
}