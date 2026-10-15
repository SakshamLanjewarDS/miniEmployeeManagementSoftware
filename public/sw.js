// 100% DESIGN Studio OS — Service Worker for PWA, Offline Shell & Background Push Notifications
const CACHE_NAME = "studio-os-v3";
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
        console.warn("[SW] Cache preload warning:", err);
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
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // CRITICAL: NEVER intercept document navigation (HTML pages), Next.js routing, or API requests
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document"
  ) {
    return;
  }

  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return;
  }

  // Only handle known static shell assets or icons
  const isStaticShellAsset =
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/");

  if (!isStaticShellAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// ==========================================
// BACKGROUND DEVICE PUSH NOTIFICATIONS
// ==========================================
self.addEventListener("push", (event) => {
  let data = {
    title: "100% DESIGN Studio OS",
    message: "New studio notification received",
    link: "/w",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32x32.png",
    tag: "studio-os-notification",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.message = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.message,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/favicon-32x32.png",
    tag: data.tag || "studio-os-alert",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.link || "/w",
      timestamp: Date.now(),
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle notification interaction (Clicking notification opens the exact page)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/w";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If an app window is already open, focus it and navigate
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise, launch a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
