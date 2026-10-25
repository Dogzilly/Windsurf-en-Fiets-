# Windsurf en Fiets

Windmelder voor Nederlandse windsurfspots plus fietswind voor een vaste route. Statische site (GitHub Pages), installeerbaar als PWA.

**Versie:** staat op één plek, in `src/version.js`. De build zet die in de titel, de manifest, de service-worker-cache en de app.

## Ontwikkelen

```bash
npm install
npm run build      # esbuild: src/ → index.html, app.js, sw.js, manifest.json, vendor/leaflet
npm test           # unit-tests (alerts-logica, wind/fiets-berekeningen)
npm run rws        # nieuwe RWS-momentopname → data/rws.json
```

Headless browser-tests (Chrome + playwright-core):

```bash
python3 -m http.server 8642 &
PLAYWRIGHT=/pad/naar/playwright-core node tests/e2e/smoke.cjs   http://127.0.0.1:8642/ shots/
PLAYWRIGHT=/pad/naar/playwright-core node tests/e2e/offline.cjs http://127.0.0.1:8642/ shots/
```

De gebouwde bestanden in de repo-root (`index.html`, `app.js`, `sw.js`, `manifest.json`, `vendor/`) worden meegecommit, zodat GitHub Pages zonder build-stap werkt. Pas alleen `src/` aan en draai daarna `npm run build`.

## Structuur

| Pad | Inhoud |
|---|---|
| `src/app.jsx` | UI (React) |
| `src/logic.js` | Pure logica: windklassen, windvensters, cirkelgemiddelde, tegenwind, dichtstbijzijnde station |
| `src/rws.js`, `src/stations.js` | Rijkswaterstaat ddapi20-client en stationslijst |
| `src/services.js` | RWS laden, meldingen, periodieke achtergrondcontrole |
| `src/sw.js` | Service worker: offline shell + cache, periodicsync |
| `data/rws.json` | Momentopname van RWS-metingen (same-origin) |
| `archief/` | Oude versies (v1.8, v3.4, v3.5, …) |

## Databronnen

- **Prognose:** Open-Meteo (model). In de app gelabeld als **MODEL**.
- **Metingen:** Rijkswaterstaat Waterwebservices **ddapi20** (`OphalenLaatsteWaarnemingen`), gelabeld als **LIVE**. Er wordt alleen een station gebruikt dat binnen 40 km ligt en waarvan de meting niet ouder is dan 3 uur. Anders valt de app terug op het model.
  - ddapi20 stuurt **geen CORS-header**, dus de browser kan de API niet rechtstreeks aanroepen. De app leest daarom:
    1. een optionele proxy-URL uit Instellingen;
    2. anders `data/rws.json`;
    3. anders alleen het model.
  - `data/rws.json` wordt actueel gehouden door de GitHub Action `.github/workflows/rws.yml` (elk half uur, :07 en :37; GitHub kan dat vertragen). Elke run met nieuwe metingen is één commit op `main`.
  - Echte live-data vereist een proxy die:
    - het POST-verzoek 1-op-1 doorstuurt naar `https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen`;
    - `Access-Control-Allow-Origin` en `OPTIONS` afhandelt.
- **Watertemperatuur:**
  - RWS (dichtstbijzijnde station binnen 25 km);
  - anders Open-Meteo Marine (model);
  - anders "geen data". Er staan geen vaste/verzonnen waarden in de app.

## Meldingen

- Lokale meldingen via de Notification API. Ze verschijnen bij het openen van de app en elke 30 minuten zolang de app open is, alleen voor **nieuwe** perfecte vensters vandaag of morgen.
- Periodic Background Sync (tag `wf-check`, minimaal elke 6 uur) werkt alleen in Chromium-browsers met een **geïnstalleerde** PWA. De browser bepaalt wanneer die draait.
- Zonder push-server (Web Push/VAPID) zijn meldingen bij een gesloten app niet gegarandeerd, en op iOS/Safari niet mogelijk.

## Offline

- De service worker cachet de app-shell, iconen, Leaflet en `data/rws.json`.
- De laatste Open-Meteo-antwoorden blijven beschikbaar (network-first met cache-fallback).
- Kaarttegels en YouTube worden niet gecachet.
