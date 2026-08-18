const CACHE_NAME = "forkit-v3";
const APP_SHELL = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Vždy nejdřív zkusit síť (u HTML, ikon i manifestu), aby appka po každém
// nahrání nové verze (nebo nové ikonky/loga) fungovala hned – mezipaměť je
// jen záloha pro případ, že by telefon zrovna neměl signál. Dřív se tu ikony
// braly rovnou z mezipaměti (cache-first), což způsobovalo, že po výměně
// loga zůstávalo v prohlížeči/appce vidět to staré, dokud se ručně
// nezvýšilo CACHE_NAME – teď se to už stát nemůže.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
