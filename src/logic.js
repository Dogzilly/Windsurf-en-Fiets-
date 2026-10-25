// Pure functies (zonder React/DOM) — getest in tests/logic.test.mjs

export const toRad = d => d * Math.PI / 180;
export const toDeg = r => r * 180 / Math.PI;
export const norm360 = d => ((d % 360) + 360) % 360;

/** Circulair gemiddelde van richtingen in graden (optioneel gewogen). null bij lege invoer of exact opheffende vectoren. */
export function circMean(degs, weights) {
  let x = 0, y = 0;
  degs.forEach((d, i) => { const w = weights ? weights[i] : 1; x += w * Math.cos(toRad(d)); y += w * Math.sin(toRad(d)); });
  if (!degs.length || (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9)) return null;
  return norm360(toDeg(Math.atan2(y, x)));
}

/** Kleinste hoekverschil (-180..180] */
export const angDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;

export function dirInRange(dir, favDir) {
  if (!favDir || favDir.span >= 360) return true;
  return Math.abs(angDiff(dir, favDir.center)) <= favDir.span / 2;
}

/** Windklasse op basis van de ingestelde range. */
export function windClass(kn, min = 15, max = 25) {
  if (kn >= min && kn <= max) return "p";        // Perfect
  if (kn >= min - 3 && kn < min) return "m";     // Matig
  if (kn > max && kn <= max + 5) return "s";     // Sterk
  if (kn > max + 5) return "g";                  // Gevaarlijk
  return "z";                                    // Te zwak
}
export const CLASS_LABEL = { p: "Perfect", m: "Matig", s: "Sterk", g: "Gevaarlijk", z: "Te zwak" };

/** Open-Meteo hourly → { 'YYYY-MM-DD': [uur...] } (tijden zijn al lokaal: timezone=Europe/Amsterdam) */
export function grp(h) {
  const d = {};
  h.time.forEach((t, i) => {
    const day = t.split("T")[0];
    (d[day] ||= []).push({
      time: t, hour: +t.split("T")[1].split(":")[0],
      wind: h.wind_speed_10m[i], gust: h.wind_gusts_10m?.[i] ?? h.wind_speed_10m[i], dir: h.wind_direction_10m[i],
      temp: h.temperature_2m?.[i], rp: h.precipitation_probability?.[i] ?? 0, rn: h.precipitation?.[i] ?? 0,
    });
  });
  return d;
}

/** Dagsamenvatting 8–20u met circulair gemiddelde richting (gewogen op windsnelheid). */
export function pk(hrs, from = 8, to = 20) {
  const dh = hrs.filter(h => h.hour >= from && h.hour <= to && h.wind != null);
  if (!dh.length) return { avg: 0, max: 0, dir: 0, gust: 0 };
  return {
    avg: dh.reduce((s, h) => s + h.wind, 0) / dh.length,
    max: Math.max(...dh.map(h => h.wind)),
    gust: Math.max(...dh.map(h => h.gust ?? h.wind)),
    dir: circMean(dh.map(h => h.dir), dh.map(h => Math.max(h.wind, 0.1))) ?? 0,
  };
}

/** Lokale datum/uur in Europe/Amsterdam, onafhankelijk van UTC (fix voor toISOString-bug). */
export function localParts(date = new Date(), tz = "Europe/Amsterdam") {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
}
export function addDays(ymd, n) {
  const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

/** Uur is bruikbaar voor surfen volgens instellingen. */
export function hourOk(h, o) {
  return h.wind >= o.min && h.wind <= o.max && dirInRange(h.dir, o.favDir) && (o.maxGust == null || (h.gust ?? h.wind) <= o.maxGust);
}

/**
 * Alerts: aaneengesloten vensters van goede uren per spot/dag.
 * - verleden uren (vandaag vóór 'nu') worden overgeslagen
 * - alleen opeenvolgende uren vormen één venster (geen sh/eh over gaten heen)
 * - windrichting-filter (favDir) en vlagen-limiet (maxGust)
 * - richting = circulair gemiddelde
 * opts: {min,max,favDir,maxGust,minHours=2,from=8,to=20,now:{date,hour}}
 */
export function computeWindows(days, opts) {
  const o = { minHours: 2, from: 8, to: 20, ...opts };
  const now = o.now || localParts();
  const out = [];
  for (const [date, hrs] of Object.entries(days)) {
    if (date < now.date) continue;
    const dh = hrs.filter(h => h.hour >= o.from && h.hour <= o.to && !(date === now.date && h.hour < now.hour)).sort((a, b) => a.hour - b.hour);
    let run = [];
    const flush = () => {
      if (run.length >= o.minHours) {
        const rh = run.filter(h => h.rp > 40 || h.rn > 0.3);
        out.push({
          date, sh: run[0].hour, eh: run[run.length - 1].hour + 1, hours: run.length,
          avgWind: run.reduce((a, h) => a + h.wind, 0) / run.length,
          maxWind: Math.max(...run.map(h => h.wind)),
          maxGust: Math.max(...run.map(h => h.gust ?? h.wind)),
          dir: circMean(run.map(h => h.dir), run.map(h => h.wind)) ?? 0,
          ri: rh.length ? { has: true, sh: rh[0].hour, eh: rh[rh.length - 1].hour + 1, mp: Math.max(...rh.map(h => h.rp)) } : { has: false },
        });
      }
      run = [];
    };
    for (const h of dh) {
      if (hourOk(h, o) && (!run.length || h.hour === run[run.length - 1].hour + 1)) run.push(h);
      else { flush(); if (hourOk(h, o)) run.push(h); }
    }
    flush();
  }
  return out;
}

/** Haversine-afstand in km */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Kompaskoers (graden) van punt A naar B */
export function bearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return norm360(toDeg(Math.atan2(y, x)));
}

/** Tegenwindcomponent (kn). windFrom = richting waar de wind vandaan komt; heading = rijrichting. Positief = tegenwind. */
export const headwind = (wind, windFrom, heading) => wind * Math.cos(toRad(windFrom - heading));

/**
 * Dichtstbijzijnde station met een verse waarde van 'kind' ('wind' | 'temp').
 * stations: [{code,naam,lat,lon,wind_ms,wind_ts,dir,temp,temp_ts}]
 */
export function nearestStation(lat, lon, stations, kind, { maxKm = 40, maxAgeH = 3, now = Date.now() } = {}) {
  let best = null;
  for (const s of stations || []) {
    const v = kind === "wind" ? s.wind_ms : s.temp;
    const ts = kind === "wind" ? s.wind_ts : s.temp_ts;
    if (v == null || !ts || now - new Date(ts).getTime() > maxAgeH * 3600e3) continue;
    const km = haversine(lat, lon, s.lat, s.lon);
    if (km <= maxKm && (!best || km < best.km)) best = { ...s, km };
  }
  return best;
}

export const ms2kn = m => m * 1.94384;

/** Fietsniveau 0..4 op basis van effectieve wind (kn) */
export function bikeIdx(kn) { return kn < 10 ? 0 : kn < 15 ? 1 : kn < 20 ? 2 : kn < 25 ? 3 : 4; }
