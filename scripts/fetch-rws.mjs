// Haalt de laatste RWS-waarnemingen (ddapi20) op en schrijft data/rws.json.
// Waarom: ddapi20 stuurt GEEN CORS-header, dus de browser mag het niet rechtstreeks lezen.
// Dit script draait lokaal (`npm run rws`) of in de GitHub Action (.github/workflows/rws.yml) en levert
// een same-origin bestand dat de app zonder eigen server kan lezen.
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { RWS_BASE } from "../src/stations.js";
import { fetchAllStations } from "../src/rws.js";

const errors = [];
const out = await fetchAllStations(RWS_BASE, fetch, { errors });
if (errors.length) console.log(`${errors.length} mislukte verzoeken, o.a.:\n  ` + errors.slice(0, 8).join("\n  "));
const file = new URL("../data/rws.json", import.meta.url);
if (!out.stations.length) {
  // RWS gaf (tijdelijk) niets terug: vorige snapshot laten staan; de app ziet zelf aan de tijdstempels
  // dat de data ouder is. Alleen een waarschuwing, geen mislukte run (en dus geen foutmail).
  console.log(`::warning::RWS gaf geen metingen terug (${errors.length} mislukte verzoeken); vorige data/rws.json blijft staan.`);
  if (!existsSync(file)) process.exitCode = 1;
  process.exit();
}
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log(`data/rws.json: ${out.stations.length} stations (${out.generated})`);
for (const s of out.stations) console.log(`  ${s.code.padEnd(40)} wind=${s.wind_ms ?? "-"} m/s  richting=${s.dir ?? "-"}  water=${s.temp ?? "-"} °C`);
