# v4.3.0 — lokale versie zonder afbeeldingen

- Statisch windsurfericoon in header en Home-navigatie in plaats van zeilboot. Geen dagafbeeldingen, PNG-downloads, dagwissellogica of ontbrekende assetafhankelijkheden. Launchericon ongewijzigd.
- Compacte RWS-windkaart met dezelfde kaartklasse, padding en minimumhoogte als de watertemperatuurkaart eronder; past responsief aan bij lange stationsnamen.
- Echte wind in knopen, Beaufort, richting/graden, station, afstand, meettijd en ouderdom behouden.
- Groen led knippert rustig (1,8s) alleen bij geldige meting maximaal 3 uur oud en binnen 40 km. Geldigheid iedere seconde opnieuw beoordeeld. Reduced-motion: led brandt zonder animatie. Geen groen bij verlopen/ontbrekende/ongeldige meting.
- LIVE uitgelegd als meting, niet continue realtimeverbinding.
- Cachefix met versiegebonden assetpaden, Home-widget Oranjeplaat en beide fallbacklinks behouden. Nieuwste remote-RWS-data 03812d7 behouden.
- Geen commit/push/publicatie; eerdere voorbereiding volledig geback-upt. Geen visuele browser-QA uitgevoerd.
