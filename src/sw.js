// Windsurf en Fiets service worker — gebundeld door build.mjs (__VERSION__ / __PRECACHE__ worden vervangen)
import { grp, computeWindows, localParts, addDays } from "./logic.js";

const VERSION = __VERSION__;
const SHELL = "wf-shell-" + VERSION;
const RUNTIME = "wf-runtime";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("wf-shell-") && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  try {
    const r = await fetch(req);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: false }) || await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(RUNTIME);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  return hit || fetch(req);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, SHELL).catch(async () => (await caches.match("index.html", { ignoreSearch: true })) || Response.error()));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("/data/rws.json")) { e.respondWith(networkFirst(req, RUNTIME)); return; }
    e.respondWith(cacheFirst(req));
    return;
  }
  if (/(^|\.)open-meteo\.com$/.test(url.hostname)) { e.respondWith(networkFirst(req, RUNTIME)); return; }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") { e.respondWith(staleWhileRevalidate(req)); return; }
  // Kaarttegels, YouTube e.d.: niet cachen (te groot / licentie).
});

// ── Periodic Background Sync (alleen Chromium + geïnstalleerde PWA) ──
async function readSettings() {
  try { const r = await (await caches.open("wf-settings")).match("settings.json"); return r ? await r.json() : null; } catch { return null; }
}
async function checkWindows() {
  const s = await readSettings();
  if (!s || !s.alertsOn || !s.spots?.length) return;
  const now = localParts();
  const days = new Set([now.date, addDays(now.date, 1)]);
  const perfect = [];
  for (const sp of s.spots) {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${sp.lat}&longitude=${sp.lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,precipitation&wind_speed_unit=kn&timezone=Europe%2FAmsterdam&forecast_days=2`);
      if (!r.ok) continue;
      const d = grp((await r.json()).hourly);
      for (const w of computeWindows(d, { min: s.min, max: s.max, favDir: s.favDir, maxGust: s.maxGust, minHours: s.minHours, now })) {
        if (days.has(w.date)) perfect.push({ ...w, spotId: sp.id, name: sp.name });
      }
    } catch { }
  }
  const c = await caches.open("wf-settings");
  let seen = [];
  try { const r = await c.match("notified.json"); if (r) seen = await r.json(); } catch { }
  const id = w => `${w.spotId}|${w.date}|${w.sh}-${w.eh}`;
  const fresh = perfect.filter(w => !seen.includes(id(w)));
  if (!fresh.length) return;
  await self.registration.showNotification(`🏄 ${fresh.length} perfect${fresh.length > 1 ? "e" : ""} windvenster${fresh.length > 1 ? "s" : ""}`, {
    body: fresh.slice(0, 4).map(w => `${w.name} ${w.date === now.date ? "vandaag" : "morgen"} ${w.sh}–${w.eh}u · ${Math.round(w.avgWind)} kn`).join("\n"),
    icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "wf-periodic",
  });
  await c.put("notified.json", new Response(JSON.stringify([...seen, ...fresh.map(id)].slice(-200))));
}
self.addEventListener("periodicsync", e => { if (e.tag === "wf-check") e.waitUntil(checkWindows()); });

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (all.length) return all[0].focus();
    return self.clients.openWindow("./index.html");
  })());
});
