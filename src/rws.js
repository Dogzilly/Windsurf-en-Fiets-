// Gedeelde RWS ddapi20-logica (gebruikt door scripts/fetch-rws.mjs én door de app bij een geconfigureerde proxy)
import { RWS_STATIONS } from "./stations.js";

export const MAX_AGE_H = 3;
const Q = { WINDSHD: ["LT", "WINDSHD"], WINDRTG: ["LT", "WINDRTG"], T: ["OW", "T"] };

export function rwsBody(code, key) {
  const [comp, gh] = Q[key];
  return { AquoPlusWaarnemingMetadataLijst: [{ AquoMetadata: { Compartiment: { Code: comp }, Grootheid: { Code: gh } } }], LocatieLijst: [{ Code: code }] };
}

/** Kies de laatste verse meting; bij windsnelheid voorkeur voor F018 (10-minuten gemiddelde). */
export function pickLatest(json, now = Date.now(), maxAgeH = MAX_AGE_H) {
  const out = [];
  for (const w of json?.WaarnemingenLijst || []) {
    const m = (w.MetingenLijst || []).at(-1); if (!m) continue;
    const v = m.Meetwaarde?.Waarde_Numeriek; if (v == null || v > 9e8) continue;
    out.push({ v, ts: m.Tijdstip, meth: w.AquoMetadata?.WaardeBepalingsMethode?.Code || "" });
  }
  const fresh = out.filter(o => now - new Date(o.ts).getTime() < maxAgeH * 3600e3);
  if (!fresh.length) return null;
  fresh.sort((a, b) => (b.meth === "F018") - (a.meth === "F018") || new Date(b.ts) - new Date(a.ts));
  return fresh[0];
}

/** Haal alle stations op via `url` (ddapi20 zelf, of een CORS-proxy met hetzelfde POST-contract). */
export async function fetchAllStations(url, fetchImpl = fetch) {
  const last = async (code, key) => {
    try {
      const r = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rwsBody(code, key)) });
      if (!r.ok) return null;
      const txt = await r.text(); if (!txt) return null;
      return pickLatest(JSON.parse(txt));
    } catch { return null; }
  };
  const stations = [];
  await Promise.all(RWS_STATIONS.map(async s => {
    const rec = { code: s.code, naam: s.naam, lat: s.lat, lon: s.lon };
    if (s.wind) {
      const [w, d] = await Promise.all([last(s.code, "WINDSHD"), last(s.code, "WINDRTG")]);
      if (w) { rec.wind_ms = w.v; rec.wind_ts = w.ts; }
      if (d) rec.dir = d.v;
    }
    if (s.temp) { const t = await last(s.code, "T"); if (t) { rec.temp = t.v; rec.temp_ts = t.ts; } }
    if (rec.wind_ms != null || rec.temp != null) stations.push(rec);
  }));
  stations.sort((a, b) => a.code.localeCompare(b.code));
  return { generated: new Date().toISOString(), source: "Rijkswaterstaat ddapi20 OphalenLaatsteWaarnemingen", stations };
}
