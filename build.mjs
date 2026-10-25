// Build: esbuild bundelt src/ → statische site in de repo-root (GitHub Pages).
// Versie staat op één plek: src/version.js
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from "node:fs";
import { VERSION } from "./src/version.js";

const root = new URL(".", import.meta.url).pathname;
const t0 = Date.now();

// 1. Leaflet lokaal (geen CDN nodig, werkt offline)
mkdirSync(root + "vendor/leaflet", { recursive: true });
for (const f of ["leaflet.js", "leaflet.css"]) cpSync(root + "node_modules/leaflet/dist/" + f, root + "vendor/leaflet/" + f);
cpSync(root + "node_modules/leaflet/dist/images", root + "vendor/leaflet/images", { recursive: true });
cpSync(root + "node_modules/leaflet/LICENSE", root + "vendor/leaflet/LICENSE");

// 2. App-bundel
await build({
  entryPoints: [root + "src/app.jsx"], bundle: true, minify: true, format: "iife", target: ["es2020"],
  jsx: "automatic", outfile: root + "app.js", legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});

// 3. index.html + manifest
writeFileSync(root + "index.html", readFileSync(root + "src/index.html", "utf8").replaceAll("%VERSION%", VERSION));
writeFileSync(root + "manifest.json", JSON.stringify({
  name: "Windsurf en Fiets", short_name: "WindFiets", version: VERSION,
  description: "Windalerts voor windsurfspots en fietswind in Nederland",
  lang: "nl", start_url: "./index.html", scope: "./", display: "standalone",
  background_color: "#f0f4f8", theme_color: "#2b6cb0",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2) + "\n");

// 4. Service worker met precache-lijst
const ls = d => existsSync(root + d) ? readdirSync(root + d).map(f => d + "/" + f) : [];
const precache = ["./", "index.html", "app.js?v=" + VERSION, "manifest.json",
  ...ls("icons").filter(f => f.endsWith(".png")), ...ls("assets").filter(f => f.endsWith(".png")),
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css", ...ls("vendor/leaflet/images"), "data/rws.json"];
await build({
  entryPoints: [root + "src/sw.js"], bundle: true, minify: true, format: "iife", target: ["es2020"],
  outfile: root + "sw.js", legalComments: "none", logLevel: "warning",
  define: { __VERSION__: JSON.stringify(VERSION), __PRECACHE__: JSON.stringify(precache) },
});
console.log(`build v${VERSION} klaar in ${Date.now() - t0} ms · precache ${precache.length} bestanden`);
