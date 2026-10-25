// Haalt de laatste RWS-waarnemingen (ddapi20) op en schrijft data/rws.json.
// Waarom: ddapi20 stuurt GEEN CORS-header, dus de browser mag het niet rechtstreeks lezen.
// Dit script draait lokaal (`npm run rws`) of in de (uitgeschakelde) GitHub Action en levert
// een same-origin bestand dat de app zonder eigen server kan lezen.
import { writeFileSync, mkdirSync } from "node:fs";
import { RWS_BASE } from "../src/stations.js";
import { fetchAllStations } from "../src/rws.js";

const out = await fetchAllStations(RWS_BASE);
mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/rws.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`data/rws.json: ${out.stations.length} stations (${out.generated})`);
for (const s of out.stations) console.log(`  ${s.code.padEnd(40)} wind=${s.wind_ms ?? "-"} m/s  richting=${s.dir ?? "-"}  water=${s.temp ?? "-"} °C`);
if (!out.stations.length) process.exitCode = 1;
