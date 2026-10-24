const CACHE_VERSION = "shopscale-public-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/shopscale.svg", "/icons/shopscale-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("shopscale-") && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  const isImage = /\.(?:png|jpe?g|webp|avif|svg)$/i.test(url.pathname);
  const strategy = isImage ? "cache-first" : "network-first";
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    if (strategy === "cache-first") {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && (isImage || request.mode === "navigate")) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      return cached || (request.mode === "navigate" ? await cache.match("/") : Response.error());
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
