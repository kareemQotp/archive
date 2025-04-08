const CACHE_NAME = 'archive-v1';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/images/logo.png',
    '/offline'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate' || 
        (event.request.method === 'GET' && 
         event.request.headers.get('accept').includes('text/html'))) {
        
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        if (event.request.destination === 'image') {
                            return caches.match('/static/images/placeholder.png');
                        }
                    });
            })
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'document-upload') {
        event.waitUntil(uploadPendingDocuments());
    }
});

async function uploadPendingDocuments() {
    const db = await openDB();
    const store = db.transaction('pendingUploads', 'readwrite').objectStore('pendingUploads');
    const uploads = await store.getAll();

    for (const upload of uploads) {
        try {
            const formData = new FormData();
            formData.append('file', new Blob([upload.file], { type: upload.type }), upload.fileName);
            formData.append('tags', upload.tags);

            const response = await fetch('/document/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                await store.delete(upload.id);
            }
        } catch (error) {
            console.error('Background sync upload failed:', error);
        }
    }
}