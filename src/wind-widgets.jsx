import React, {useEffect, useRef, useState} from 'react';
import {nextWidgetId, windguruScriptUrl, WINDGURU_URL, WINDFINDER_URL} from './wind-widget-config.js';
function WindguruWidget() {
  const host = useRef(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const target = host.current;
    const marker = document.createElement('script');
    marker.id = nextWidgetId();
    marker.type = 'text/javascript';
    target.appendChild(marker);
    const loader = document.createElement('script');
    loader.src = windguruScriptUrl(marker.id);
    loader.async = true;
    loader.onerror = () => setSlow(true);
    // Zelfde marker + afzonderlijke loader als de officiële generator.
    // Meteen laden: window.load kan bij het openen van dit tabblad voorbij zijn.
    target.insertBefore(loader, marker);
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => {
      clearTimeout(timer);
      loader.onerror = null;
      loader.remove();
      target.replaceChildren();
    };
  }, []);
  return <>
    <p role="status" style={{fontSize:13}}>{slow ? 'Geen tabel zichtbaar? De externe widget kan geblokkeerd zijn. Gebruik dan de knoppen bovenaan.' : 'De officiële Windguru-widget wordt extern geladen. Geen tabel zichtbaar? Gebruik de knoppen bovenaan.'}</p>
    <div ref={host} style={{width:'100%',minWidth:0,overflowX:'auto',background:'white',color:'#222',borderRadius:12}}/>
  </>;
}

export function WindForecasts({active}) {
  const [provider, setProvider] = useState('windguru');
  const [started, setStarted] = useState(false);
  useEffect(() => {if(active) setStarted(true);}, [active]);
  return <section style={{marginTop:16,minWidth:0,lineHeight:1.6}}>
    <h2 style={{fontSize:20}}>Oranjeplaat · Veerse Meer</h2>
    <p role="status">Windguru-gebruikersspot; GFS 13 km.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'12px 0'}}>
      <a href={WINDGURU_URL} target="_blank" rel="noopener noreferrer" style={{padding:'10px 14px',borderRadius:10,background:'#245b91',color:'white',textDecoration:'none'}}>Windguru · Oranjeplaat ↗</a>
      <a href={WINDFINDER_URL} target="_blank" rel="noopener noreferrer" style={{padding:'10px 14px',borderRadius:10,background:'#245b91',color:'white',textDecoration:'none'}}>Windfinder · Arnemuiden (omgeving) ↗</a>
    </div>
    <p style={{fontSize:13}}>Windfinder verwijst naar Arnemuiden in de omgeving, niet exact naar Oranjeplaat. De knoppen blijven beschikbaar als de widget niet laadt.</p>
    <p><b>Verwachting, geen actuele meting.</b> De actuele RWS-waarden blijven op Home → Deze week, bij Spots en in de spotdetails onder LIVE Meting (RWS).</p>
    <p style={{fontSize:13}}>Windguru en RWS worden weergegeven in knopen. De widget maakt verbinding met Windguru; internet is nodig.</p>
    <div role="tablist" aria-label="Weeraanbieder" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {['windguru','windfinder'].map(id => <button key={id} id={`tab-${id}`} role="tab" aria-controls={`panel-${id}`} aria-selected={provider===id} onClick={()=>setProvider(id)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #8095ac',background:provider===id?'#245b91':'#eef4fa',color:provider===id?'white':'#17324d',cursor:'pointer',font:'inherit'}}>{id==='windguru'?'Windguru':'Windfinder'}</button>)}
    </div>
    <div id="panel-windguru" role="tabpanel" aria-labelledby="tab-windguru" hidden={provider!=='windguru'}>
      {started&&<WindguruWidget/>}
    </div>
    <div id="panel-windfinder" role="tabpanel" aria-labelledby="tab-windfinder" hidden={provider!=='windfinder'}>
      <p>Open Windfinder met de knop bovenaan. De pagina toont Arnemuiden (omgeving), niet exact Oranjeplaat; er wordt geen Windfinder-widget ingesloten.</p>
    </div>
    <p style={{fontSize:12}}>Bron verwachting: Windguru / Windfinder. Windguru-gebruikersspot op 51.5219, 3.7074, nabij Oranjeplaat. Officiële generatorcode gecontroleerd; weergave in deze app nog niet visueel getest. Windfinder toont de omgeving Arnemuiden, niet de exacte spot.</p>
  </section>;
}
