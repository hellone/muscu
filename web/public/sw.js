// Service worker Muscu : l'appli reste utilisable en salle même sans réseau.
// - fichiers de l'appli et images d'exercices : cache d'abord (ils ne changent pas) ;
// - pages et lectures d'API : réseau d'abord, dernière version gardée en secours ;
// - envois (POST…) : jamais mis en cache (la file d'attente est gérée par l'appli).
const VERSION = "muscu-v2";
const STATIQUE = `${VERSION}-statique`;
const DYNAMIQUE = `${VERSION}-dynamique`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const estStatique = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/exos/") || /\.(png|svg|webp|jpg|woff2?|ico)$/.test(url.pathname);

async function cacheDabord(req) {
  const cache = await caches.open(STATIQUE);
  const trouve = await cache.match(req);
  if (trouve) return trouve;
  const rep = await fetch(req);
  if (rep.ok) cache.put(req, rep.clone());
  return rep;
}

async function reseauDabord(req, secours) {
  const cache = await caches.open(DYNAMIQUE);
  try {
    const rep = await fetch(req);
    if (rep.ok && !rep.redirected) cache.put(req, rep.clone());
    return rep;
  } catch (e) {
    const trouve = (await cache.match(req, { ignoreSearch: req.mode === "navigate" })) || (secours && (await cache.match(secours)));
    if (trouve) return trouve;
    if (req.mode === "navigate") {
      return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='background:#0e0f12;color:#f2f3f5;font-family:sans-serif;padding:40px;text-align:center'><h1>Pas de réseau</h1><p>Cette page n'a pas encore été ouverte avec du réseau. Ta séance en cours est gardée sur le téléphone : ouvre l'onglet Séance.</p><a href='/seance' style='color:#c6f432'>Ouvrir la séance</a>", { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (estStatique(url)) return event.respondWith(cacheDabord(req));
  if (url.pathname.startsWith("/api/compte")) return; // jamais de cache pour le compte
  const page = req.mode === "navigate" || (req.headers.get("accept") || "").startsWith("text/html");
  if (url.pathname.startsWith("/api/") || page) {
    return event.respondWith(reseauDabord(req, req.mode === "navigate" ? "/seance" : undefined));
  }
});
