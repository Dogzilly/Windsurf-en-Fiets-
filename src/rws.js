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

/** Haal alle stations op via `url` (ddapi20 zelf, of een CORS-proxy met hetzelfde POST-contract).
 *  Robuust: max. `concurrency` verzoeken tegelijk, time-out per verzoek, en bij een fout (netwerk,
 *  HTTP 429/5xx, lege of kapotte JSON) tot `retries` keer opnieuw met oplopende wachttijd.
 *  `errors` telt de mislukte verzoeken (voor logging in de Action). */
export async function fetchAllStations(url, fetchImpl = fetch, { concurrency = 4, retries = 3, timeoutMs = 15000, backoffMs = 2000, errors = null } = {}) {
  let active = 0; const queue = [];
  const slot = () => new Promise(res => { if (active < concurrency) { active++; res(); } else queue.push(res); });
  const release = () => { const next = queue.shift(); if (next) next(); else active--; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const last = async (code, key) => {
    for (let poging = 0; poging <= retries; poging++) {
      if (poging) await sleep(backoffMs * poging);
      await slot();
      let reden;
      try {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
        try {
          const r = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rwsBody(code, key)), signal: ctrl?.signal });
          if (r.ok) {
            const txt = await r.text();
            if (txt) { const j = JSON.parse(txt); if (j?.Succesvol === false && !j?.WaarnemingenLijst) return null; return pickLatest(j); }
            reden = "leeg antwoord";
          } else if (r.status === 429 || r.status >= 500) reden = `HTTP ${r.status}`;
          else return null; // 4xx (bijv. geen data voor deze locatie): niet opnieuw proberen
        } finally { if (t) clearTimeout(t); }
      } catch (e) { reden = e?.name === "AbortError" ? "time-out" : (e?.cause?.code || e?.message || String(e)); }
      finally { release(); }
      if (errors) errors.push(`${code}/${key} poging ${poging + 1}: ${reden}`);
    }
    return null;
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
