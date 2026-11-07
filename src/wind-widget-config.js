// Officiële generatorcode voor Brouwersdam, door gebruikerstraject geverifieerd.
// Geen data-API: het officiële widget blijft eigenaar van presentatie en credits.
export const WINDGURU_URL = 'https://widget.windguru.cz/97';
export const WINDFINDER_URL = 'https://www.windfinder.com/forecast/brouwersdam';
export function windguruDocument(uid) {
  if (!/^wg_fwdg_97_100_[a-z0-9_]+$/i.test(uid)) throw new Error('Ongeldig widget-ID');
  const args = ['s=97','m=100',`uid=${uid}`,'wj=bft','tj=c','waj=m','tij=cm','odh=0','doh=24','fhours=240','hrsm=2','vt=forecasts','lng=nl','idbs=1','p=WINDSPD,GUST,SMER,TMPE,FLHGT,CDC,APCP1s,RATING'];
  const src = 'https://www.windguru.cz/js/widget.php?' + args.join('&');
  // Eigen iframe-document isoleert globals en nagekomen scripts bij tabwissels.
  // Direct laden: het window.load-event van de app kan al voorbij zijn.
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#222;overflow-x:auto}*{box-sizing:border-box}</style></head><body><script id="${uid}" src="${src.replaceAll('&','&amp;')}" async></script><noscript>JavaScript is nodig. Open Windguru via de link in de app.</noscript></body></html>`;
}
