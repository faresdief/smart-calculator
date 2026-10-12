/*
 * sw.js — Service Worker: يخزّن ملفات التطبيق ليعمل بدون إنترنت.
 * ⚠️ غيّر VERSION عند كل تحديث للملفات حتى يحصل المستخدمون على النسخة الجديدة.
 */
const VERSION = 'v2.0.0';
const CACHE = `smart-calculator-${VERSION}`;

const APP_SHELL = [
    './',
    'index.html',
    'style.css',
    'calc.js',
    'state.js',
    'script.js',
    'manifest.webmanifest',
    'assets/fonts/poppins-Regular.woff',
    'assets/fonts/poppins-Medium.woff',
    'assets/fonts/poppins-Bold.woff',
    'assets/icons/icon.svg',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/maskable-512.png',
    'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('smart-calculator-') && k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// الملفات من الكاش فوراً، وتُحدَّث في الخلفية (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
            return cached || network;
        })
    );
});
