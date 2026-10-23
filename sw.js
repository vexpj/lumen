/* Service worker LUMEN: оболочка приложения работает офлайн, запросы к серверу (Apps Script) не кешируются. */
const CACHE = 'lumen-v2'; // меняйте номер при каждом обновлении сайта, чтобы у игроков обновился кеш
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'css/background.css',
  'css/base.css',
  'css/components.css',
  'css/games.css',
  'css/glass.css',
  'css/layout.css',
  'css/responsive.css',
  'css/shop.css',
  'css/social.css',
  'js/config.js',
  'js/i18n/ru.js',
  'js/i18n/apply.js',
  'js/core/api.js',
  'js/core/app.js',
  'js/core/constants.js',
  'js/core/state.js',
  'js/core/utils.js',
  'js/features/admin.js',
  'js/features/auth.js',
  'js/features/bank.js',
  'js/features/bonus.js',
  'js/features/cases.js',
  'js/features/chat.js',
  'js/features/craft.js',
  'js/features/duels.js',
  'js/features/games.js',
  'js/features/inventory.js',
  'js/features/items.js',
  'js/features/market.js',
  'js/features/players.js',
  'js/features/profile.js',
  'js/features/tops.js',
  'js/features/transfers.js',
  'js/pwa.js',
  'js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return; // API Google Apps Script не трогаем

  if (req.mode === 'navigate') { // страница: сначала сеть (чтобы обновления доходили), офлайн — из кеша
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
