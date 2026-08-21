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

// ---------- Push oznámení ----------
// Server (notify_push -> edge funkce send-push) posílá JSON {title, body, url}.
// "url" je vždy tvaru "/nazev-obrazovky" (viz showScreen() v index.html), ať
// po kliknutí appka rovnou naviguje na správné místo.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}
  const title = data.title || "ForkIt";
  const options = {
    body: data.body || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const screen = ((event.notification.data && event.notification.data.url) || "/").replace(/^\//, "") || "home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "forkit-navigate", screen });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope + "?screen=" + encodeURIComponent(screen));
      }
    })
  );
});
