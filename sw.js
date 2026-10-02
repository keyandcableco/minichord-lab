// The installed Minichord Arcade's service worker. It sits at the site root so it can serve the
// arcade and every game page the arcade links to (the games live in sibling folders and run in
// /practice/). Network first: online you always get the latest deploy, and each page and file you
// load is kept so a game you've played before still opens with no signal. Only same-origin GETs are
// touched; the high-score API and anything cross-origin go straight to the network.
const CACHE = "minichord-arcade-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("minichord-arcade-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: req.mode !== "navigate"}).then(hit => hit || Response.error()))
  );
});
