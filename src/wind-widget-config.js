// Officiële generator voor geografisch gecontroleerde Windguru-gebruikersspot.
// Browsercontrole: spot 216253 (51.5219, 3.7074), model 3 / GFS 13 km.
export const WINDGURU_URL = 'https://widget.windguru.cz/216253';
export const WINDFINDER_URL = 'https://www.windfinder.com/weatherforecast/arnemuiden_zeeland_netherlands'; // Omgeving, niet exact Oranjeplaat.
let lastStamp = 0;
export function nextWidgetId(now = Date.now()) {
  lastStamp = Math.max(now, lastStamp + 1);
  return `wg_fwdg_216253_3_${lastStamp}`;
}
export function windguruScriptUrl(uid) {
  if (!/^wg_fwdg_216253_3_\d+$/.test(uid)) throw new Error('Ongeldig widget-ID');
  const args = ['s=216253','m=3',`uid=${uid}`,'wj=knots','tj=c','waj=m','tij=cm','odh=0','doh=24','fhours=240','hrsm=3','vt=forecasts','lng=nl','p=WINDSPD,GUST,MWINDSPD,SMER,TMPE,FLHGT,CDC,APCP1s,RATING'];
  return 'https://www.windguru.cz/js/widget.php?' + args.join('&');
}
