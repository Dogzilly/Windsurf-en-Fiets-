import React, {useEffect, useRef, useState} from 'react';
import {windguruDocument, WINDGURU_URL, WINDFINDER_URL} from './wind-widget-config.js';
let sequence = 0;

function WindguruWidget() {
  const host = useRef(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const frame = document.createElement('iframe');
    const uid = `wg_fwdg_97_100_${Date.now()}_${++sequence}`;
    frame.title = 'Windguru verwachting Brouwersdam (Beaufort)';
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.style.cssText = 'display:block;width:100%;height:680px;border:0;background:white;border-radius:12px';
    frame.srcdoc = windguruDocument(uid);
    const target = host.current;
    target.appendChild(frame);
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => {
      clearTimeout(timer);
      // Vernietig het hele externe document, inclusief timers, callbacks en globals.
      frame.remove();
      frame.srcdoc = '';
    };
  }, []);
  return <>
    <p role="status" style={{fontSize:13}}>{slow ? 'Geen tabel zichtbaar? De externe widget kan geblokkeerd zijn. Gebruik dan de link hieronder.' : 'De officiële Windguru-widget wordt extern geladen. Geen tabel zichtbaar? Gebruik de link hieronder.'}</p>
    <div ref={host} style={{width:'100%',minWidth:0,overflow:'hidden'}}/>
    <p><a href={WINDGURU_URL} target="_blank" rel="noopener noreferrer">Open Brouwersdam op Windguru ↗</a></p>
  </>;
}

export function WindForecasts() {
  const [provider, setProvider] = useState('windguru');
  return <section style={{marginTop:16,minWidth:0,lineHeight:1.6}}>
    <h2 style={{fontSize:20}}>Brouwersdam</h2>
    <p><b>Verwachting, geen actuele meting.</b> De actuele RWS-waarden blijven op Home → Deze week, bij Spots en in de spotdetails onder LIVE Meting (RWS).</p>
    <p style={{fontSize:13}}>Windguru wordt weergegeven in Beaufort (Bft), zoals de officiële generatorcode. RWS toont knopen. De widget maakt verbinding met Windguru; internet is nodig.</p>
    <div role="tablist" aria-label="Weeraanbieder" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {['windguru','windfinder'].map(id => <button key={id} id={`tab-${id}`} role="tab" aria-controls={`panel-${id}`} aria-selected={provider===id} onClick={()=>setProvider(id)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid #8095ac',background:provider===id?'#245b91':'#eef4fa',color:provider===id?'white':'#17324d',cursor:'pointer',font:'inherit'}}>{id==='windguru'?'Windguru':'Windfinder'}</button>)}
    </div>
    <div id={`panel-${provider}`} role="tabpanel" aria-labelledby={`tab-${provider}`}>
      {provider==='windguru'?<WindguruWidget/>:<div>
        <p>Windfinder openen we voorlopig op de officiële website. Insluiten in deze app is nog niet bevestigd.</p>
        <a href={WINDFINDER_URL} target="_blank" rel="noopener noreferrer">Open Brouwersdam op Windfinder ↗</a>
      </div>}
    </div>
    <p style={{fontSize:12}}>Bron verwachting: Windguru / Windfinder. Alleen Brouwersdam is toegevoegd; andere spots volgen pas na verificatie van hun officiële links en widgetcodes.</p>
  </section>;
}
