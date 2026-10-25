// Browser-services: RWS-data laden, lokale notificaties, periodieke controle.
import { useState, useEffect } from "react";
import { fetchAllStations } from "./rws.js";

/**
 * RWS-metingen. Volgorde:
 *  1. optionele CORS-proxy (Instellingen) → live ddapi20
 *  2. same-origin data/rws.json (gemaakt door scripts/fetch-rws.mjs / GitHub Action)
 * Rechtstreeks ddapi20 vanuit de browser kan niet: geen CORS-header.
 * Verouderde waarden (> 3 uur) worden per station weggefilterd (nearestStation) → dan valt de app terug op het model.
 */
export function useRws(proxyUrl, refreshKey) {
  const [rws, setRws] = useState(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (proxyUrl) {
        try {
          const j = await fetchAllStations(proxyUrl);
          if (j.stations.length) { if (!cancel) setRws({ ...j, via: "proxy" }); return; }
        } catch { /* val terug */ }
      }
      try {
        const r = await fetch("data/rws.json", { cache: "no-cache" });
        if (r.ok) { const j = await r.json(); if (!cancel) setRws({ ...j, via: "snapshot" }); return; }
      } catch { /* offline zonder cache */ }
      if (!cancel) setRws({ stations: [], via: "none" });
    })();
    return () => { cancel = true; };
  }, [proxyUrl, refreshKey]);
  return rws;
}

export const notifSupported = () => typeof window !== "undefined" && "Notification" in window;

export async function requestNotif() {
  if (!notifSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

async function show(title, body) {
  const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "wf-" + title };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, opts); return; }
  } catch { /* fallback */ }
  try { new Notification(title, opts); } catch { /* Android Chrome staat dit alleen via SW toe */ }
}

export const windowId = w => `${w.spotId}|${w.date}|${w.sh}-${w.eh}`;

/** Toon een lokale notificatie voor nieuwe perfecte vensters vandaag/morgen (één keer per venster). */
export async function notifyNew(perfect, label) {
  if (!notifSupported() || Notification.permission !== "granted") return 0;
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem("ws_notified") || "[]"); } catch { }
  const fresh = perfect.filter(w => !seen.includes(windowId(w)));
  if (!fresh.length) return 0;
  const lines = fresh.slice(0, 4).map(label).join("\n");
  await show(`🏄 ${fresh.length} perfect${fresh.length > 1 ? "e" : ""} windvenster${fresh.length > 1 ? "s" : ""}`, lines);
  seen = [...seen, ...fresh.map(windowId)].slice(-200);
  try { localStorage.setItem("ws_notified", JSON.stringify(seen)); } catch { }
  return fresh.length;
}

/** Instellingen delen met de service worker (voor periodic background sync). */
export async function shareSettingsWithSW(settings) {
  try {
    if (!("caches" in window)) return;
    const c = await caches.open("wf-settings");
    await c.put("settings.json", new Response(JSON.stringify(settings), { headers: { "Content-Type": "application/json" } }));
  } catch { }
}

/** Probeer Periodic Background Sync (alleen Chromium, alleen geïnstalleerde PWA). Retourneert status-tekst. */
export async function registerPeriodic(enabled) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg || !("periodicSync" in reg)) return "niet ondersteund";
    if (!enabled) { await reg.periodicSync.unregister("wf-check"); return "uit"; }
    const st = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (st.state !== "granted") return "geen toestemming (installeer de app)";
    await reg.periodicSync.register("wf-check", { minInterval: 6 * 3600e3 });
    return "actief (browser bepaalt het moment, min. 6 uur)";
  } catch { return "niet ondersteund"; }
}

export function useNotifications() { return null; }
