/* ═══════════════════════════════════════════════════
   Service Worker —— PWA 离线缓存
   缓存策略：预缓存核心资源（App Shell），运行时缓存图片/字体
   ═══════════════════════════════════════════════════ */
const CACHE = 'yqay-v1'

/* 安装：预缓存核心资源 */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
      ]).catch(() => {})
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/* 运行时：网络优先，失败回退缓存（图片/字体可缓存） */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  /* 只处理同源 GET */
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return

  /* API/动态请求：始终走网络，不缓存 */
  if (url.pathname.startsWith('/orders') || url.pathname.includes('tcloudbase.com')) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        /* 缓存成功的静态资源（js/css/图片/字体） */
        if (res.ok && (url.pathname.includes('/assets/') || url.pathname.includes('/images/') || url.pathname.includes('/icons/') || url.pathname.includes('/fonts/'))) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then((hit) => {
          if (hit) return hit
          /* 导航请求回退首页 */
          if (e.request.mode === 'navigate') return caches.match('/')
          return Response.error()
        })
      )
  )
})
