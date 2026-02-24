const CACHE_NAME = 'egitim-oyunlari-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/config.js',
    '/css/style.css',
    '/js/app.js',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Zikir Takip projesindeki gibi Cache-first / Network-fallback stratejisi
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Eğer cache'de varsa cache'i dön
                if (response) {
                    return response;
                }
                // Yoksa network'e git (API istekleri her zaman network'te çalışacak)
                return fetch(event.request);
            })
    );
});
