// 100% DESIGN Studio OS — Service Worker for PWA Installation and Asset Caching
const CACHE_NAME = "studio-os-v1";
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-16x16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache preload error:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pass through all dynamic requests, Next.js server actions, and API endpoints
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("/_next/webpack-hmr")
  ) {
    return;
  }

  // Network first with cache fallback for static shell assets
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return caches.match("/");
    })
  );
});
