// Developer's Ai — Service Worker (v2)
// Fixed: Don't cache Next.js chunks (they're hash-based, change on every deploy).
// Only cache the app shell (HTML, icons, manifest). Everything else goes network-first.

const CACHE_NAME = "devai-v2"; // Bumped from v1 → v2 to force-clear old broken cache
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/custom-logo.png",
  "/logo.svg",
];

// Install — cache only the app shell (NOT the Next.js chunks — they're hash-based)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate — clean up ALL old caches (v1, v0, anything else)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
  // Force all open clients to refresh — they're holding stale chunk URLs
  self.clients.matchAll({ type: "window" }).then((clients) => {
    clients.forEach((client) => client.navigate(client.url));
  });
});

// Fetch — smart routing based on request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept API requests
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never intercept Next.js static chunks/scripts/styles
  if (url.pathname.startsWith("/_next/static/")) {
    return;
  }

  // For navigation — network first, fall back to cached HTML
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // For other static assets (icons, manifest) — cache first, then network
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(event.request, clone)
              );
            }
            return response;
          }).catch(() => cached || Response.error())
      )
    );
  }
});
