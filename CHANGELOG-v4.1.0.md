# v4.1.0 — Windfinder & Windguru

- Apart Windfinder & Windguru-tabblad: desktopnavigatie; mobiel via Meer.
- Brouwersdam: officiële Windguru-widget (s=97, m=100), Bft, Nederlandse labels.
- Widget pas bij tab openen; eigen iframe-document met unieke ID, vernietigd bij verlaten.
- Windfinder uitsluitend geverifieerde externe link. Geen API, scraping of andere spots.
- RWS-metingen en alle bestaande tabs behouden; meting/verwachting duidelijk onderscheiden.
- Node 24 testscript hersteld naar expliciete testbestanden. Build geslaagd; 18 unit/regressietests geslaagd.
- Geen browsertest uitgevoerd. Controleer widgetrendering, sandboxcompatibiliteit, mobiel, herhaald tabwisselen en branding in de browser in de live app.
- Widget vereist internet; offline/adblock kan extern laden verhinderen. Externe link blijft beschikbaar.
- npm ci meldt één moderate ontwikkeldependency-waarschuwing; productie-audit: 0 kwetsbaarheden.

## Gebruik
Open site/ via een lokale HTTP-server. Broncode staat in source/; daar npm ci, npm run build, npm test.
Geen node_modules, git-data, credentials of oude versies inbegrepen.

## Publicatiecontrole
Gebaseerd op actuele main 044fc51; alle tussentijdse wijzigingen betroffen data/rws.json en zijn behouden. Remote versie 4.0.0, nieuwe versie 4.1.0.
