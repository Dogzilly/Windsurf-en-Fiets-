// RWS-meetstations met (bij controle op 25-10-2026) actuele metingen via ddapi20.
// Bron coördinaten: RWS ddapi20 METADATASERVICES/OphalenCatalogus.
export const RWS_STATIONS = [
  { code: "vlissingen", naam: "Vlissingen", lat: 51.442, lon: 3.6, wind: true, temp: true, sea: true },
  { code: "kats.zandkreeksluis.buiten", naam: "Kats Zandkreeksluis buiten", lat: 51.544, lon: 3.8592, wind: true },
  { code: "kamperland.schotsman", naam: "Kamperland, Schotsman", lat: 51.5816, lon: 3.6433, temp: true },
  { code: "stellendam.haringvlietsluizen.schuif1", naam: "Stellendam, Haringvlietsluizen", lat: 51.8362, lon: 4.0544, wind: true, sea: true },
  { code: "haringvliet.3", naam: "Haringvliet, Kier3", lat: 51.826, lon: 4.0512, temp: true },
  { code: "hoekvanholland", naam: "Hoek van Holland", lat: 51.9769, lon: 4.1198, wind: true, temp: true, sea: true },
  { code: "ijmuiden.havenhoofd.zuid", naam: "IJmuiden, havenhoofd zuid", lat: 52.4637, lon: 4.5323, wind: true, sea: true },
  { code: "ijgeul.1", naam: "IJGeul 1", lat: 52.4639, lon: 4.5176, wind: true, sea: true },
  { code: "ijmuiden.buitenhaven", naam: "IJmuiden, buitenhaven", lat: 52.463, lon: 4.555, temp: true },
  { code: "markermeer.midden", naam: "Markermeer, midden", lat: 52.5317, lon: 5.2312, wind: true },
  { code: "andijk", naam: "Andijk", lat: 52.7503, lon: 5.265, temp: true },
  { code: "rotterdamsehoek.ijsselmeer", naam: "Rotterdamsehoek IJsselmeer", lat: 52.7487, lon: 5.552, wind: true, temp: true },
  { code: "kornwerderzand.ijsselmeer.vaargeul", naam: "Kornwerderzand IJsselmeer vaargeul", lat: 53.0487, lon: 5.3448, temp: true },
];
export const RWS_BASE = "https://ddapi20-waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES/OphalenLaatsteWaarnemingen";
