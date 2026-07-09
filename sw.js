/* 离线缓存 Service Worker
   目标：开着 VPN 成功打开过一次后，把整个 app 存到本地；
   之后不用开 VPN、甚至没网也能打开（读缓存），彻底摆脱 vercel.app 被墙的不稳定。
   更新策略：cache-first（先读缓存，秒开），后台再悄悄拉新版本，下次打开生效。 */

const CACHE = 'cika-v1';           // 每次发布新版本改这个版本号，触发缓存更新
const ASSETS = [
  './',
  './index.html',
  './passages.json',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      // 后台更新：能连上就顺手把新版本存进缓存，下次打开用新的
      const network = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      // 先给缓存（秒开、离线可用），没缓存再等网络
      return cached || network;
    })
  );
});
