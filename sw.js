// Service Worker — GamEdu Firebase
// Network-first: cache.addAll() kullanmıyor, sayfa yüklenmesini engellemiyor
const CACHE_NAME = 'gamedu-firebase-v1';

self.addEventListener('install', event => {
    // Hemen aktif ol, install aşamasında hiçbir dosyayı zorunlu cache'leme
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // Eski cache versiyonlarını temizle
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Network-first: önce ağdan dene, başarısız olursa cache'e bak
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Başarılı yanıtı cache'e de kaydet
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Ağ yoksa cache'den dön
                return caches.match(event.request);
            })
    );
});
