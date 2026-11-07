# v4.2.1 — cache- en updateherstel

- Nieuwe HTML gebruikt versiegebonden bestandsPADEN app-v4.2.1.js en update-v4.2.1.js. Daardoor kan een oude serviceworker met ignoreSearch geen oud app.js als nieuwe bundel teruggeven.
- Zelfstandige updatebootstrap vóór de app registreert sw.js met releasequery en updateViaCache:none. Eerste installatie zonder reload; bestaande controllerupdate maximaal eenmaal per release/sessie herladen. Bij geblokkeerde sessieopslag geen automatische reloadlus.
- Nieuwe serviceworker gebruikt exacte URLmatching binnen eigen scopegebonden shellcache. Offline navigatiefallback blijft beschikbaar.
- Activatie verwijdert uitsluitend oude shellcaches binnen de nieuwe app/scope-namespace. Legacycaches en caches van andere apps blijven ongemoeid; localStorage/favorieten worden niet gewist.
- Nieuwe assetbestanden blijven naast legacy app.js bestaan voor migratie. Geen nieuwe features of datawijzigingen.
- Build en 25 tests geslaagd, inclusief daadwerkelijke gemockte SW fetch/activate-handlers en offlinefallback. Geen browserautomatisering of bewezen telefoonmigratie.
- Gebruiker opent de app eenmaal online via ?v=421. Een reeds geopende oude pagina wordt niet op afstand direct vervangen; offline blijft de bestaande versie beschikbaar totdat online navigatie/update mogelijk is.
