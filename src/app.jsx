
import React,{useState,useEffect,createContext,useContext,useRef,useCallback,useMemo} from "react";
import {createRoot} from "react-dom/client";
import {VERSION} from "./version.js";
import {circMean,dirInRange,hourOk,windClass,CLASS_LABEL,grp,pk,localParts,addDays,computeWindows,haversine,bearing,headwind,nearestStation,bikeIdx} from "./logic.js";
import {RWS_STATIONS,RWS_BASE} from "./stations.js";
import {useRws,requestNotif,notifyNew,shareSettingsWithSW,registerPeriodic,notifSupported} from "./services.js";

// ── THEMES ──
const TH={light:{bg:"linear-gradient(165deg,#f0f4f8 0%,#e8eef5 30%,#f5f7fa 60%,#edf1f7 100%)",text:"#1a2b3c",ts:"#5a7089",tm:"#6b7f94",tf:"#8a9aaa",acc:"#2b6cb0",card:"rgba(255,255,255,0.7)",cb:"rgba(0,0,0,0.08)",ch:"rgba(0,0,0,0.02)",navBg:"rgba(255,255,255,0.97)",navF:"rgba(255,255,255,0.9)",navB:"rgba(0,0,0,0.08)",navI:"#8a9aaa",btn:"rgba(0,0,0,0.05)",btnA:"rgba(43,108,176,0.1)",btnAB:"rgba(43,108,176,0.3)",div:"rgba(0,0,0,0.05)",ambA:"rgba(43,108,176,0.04)",ambB:"rgba(0,160,70,0.03)",alBg:"linear-gradient(135deg,rgba(0,160,70,0.08) 0%,rgba(43,108,176,0.05) 100%)",alBd:"rgba(0,160,70,0.2)",alIt:"rgba(0,0,0,0.03)",pRow:"rgba(0,160,70,0.06)",gGrid:"rgba(0,0,0,0.06)",gIdeal:"rgba(0,160,70,0.08)",gLine:"#2b6cb0",gGust:"rgba(220,120,0,0.35)",gText:"#8a9aaa",stOn:"#c49000",stOff:"#bcc8d4",swOn:"#0a8f4a",swOff:"rgba(0,0,0,0.12)",w:{p:"#0a8f4a",m:"#c49000",s:"#d97700",g:"#c62828",z:"#78909C"},wb:{p:"rgba(0,180,80,0.1)",m:"rgba(200,150,0,0.1)",s:"rgba(220,120,0,0.1)",g:"rgba(200,40,40,0.1)",z:"rgba(120,144,156,0.08)"},rain:"#1976D2",dry:"#2E7D32",sGreen:"rgba(0,160,70,0.08)",sGreenT:"#0a8f4a",badBg:"#0a8f4a",badT:"#fff",rBd:"#bcc8d4",rAc:"#2b6cb0",rose:"#2b6cb0",roseArc:"rgba(43,108,176,0.2)",roseSel:"rgba(0,160,70,0.25)",roseSelStroke:"#0a8f4a",meta:"#f0f4f8"},
dark:{bg:"linear-gradient(165deg,#0a1628 0%,#0d2137 30%,#0f2b4a 60%,#0a1f3d 100%)",text:"#e8edf4",ts:"#6a8aaa",tm:"#5a7a9a",tf:"#4a6a8a",acc:"#5b9bd5",card:"rgba(255,255,255,0.04)",cb:"rgba(255,255,255,0.06)",ch:"rgba(255,255,255,0.02)",navBg:"rgba(10,22,40,0.98)",navF:"rgba(10,22,40,0.85)",navB:"rgba(91,155,213,0.15)",navI:"#4a6a8a",btn:"rgba(255,255,255,0.04)",btnA:"rgba(91,155,213,0.15)",btnAB:"rgba(91,155,213,0.4)",div:"rgba(255,255,255,0.04)",ambA:"rgba(0,150,255,0.08)",ambB:"rgba(0,230,118,0.05)",alBg:"linear-gradient(135deg,rgba(0,230,118,0.12) 0%,rgba(0,150,255,0.08) 100%)",alBd:"rgba(0,230,118,0.25)",alIt:"rgba(0,0,0,0.2)",pRow:"rgba(0,230,118,0.04)",gGrid:"rgba(255,255,255,0.06)",gIdeal:"rgba(0,230,118,0.06)",gLine:"#5b9bd5",gGust:"rgba(255,152,0,0.3)",gText:"#4a6a8a",stOn:"#FFC107",stOff:"#3a5a7a",swOn:"#00E676",swOff:"rgba(255,255,255,0.1)",w:{p:"#00E676",m:"#FFC107",s:"#FF9800",g:"#F44336",z:"#78909C"},wb:{p:"rgba(0,230,118,0.15)",m:"rgba(255,193,7,0.15)",s:"rgba(255,152,0,0.15)",g:"rgba(244,67,54,0.15)",z:"rgba(120,144,156,0.1)"},rain:"#64B5F6",dry:"#66BB6A",sGreen:"rgba(0,230,118,0.08)",sGreenT:"#00E676",badBg:"#00E676",badT:"#0a1628",rBd:"#3a5a7a",rAc:"#5b9bd5",rose:"#5b9bd5",roseArc:"rgba(91,155,213,0.15)",roseSel:"rgba(0,230,118,0.2)",roseSelStroke:"#00E676",meta:"#0a1628"}};
const TC=createContext(TH.light);const useT=()=>useContext(TC);
// Windklasse volgt de ingestelde range (RANGE wordt elke render door App gezet)
const RANGE={min:15,max:25};
const wc=(kn,t)=>{const k=windClass(kn,RANGE.min,RANGE.max);return{key:k,label:CLASS_LABEL[k],color:t.w[k],bg:t.wb[k]};};

// ── DATA ──
const SP=[{id:1,name:"Scheveningen",lat:52.0988,lon:4.2621,reg:"Zuid-Holland",type:"Noordzee"},{id:2,name:"Zandvoort",lat:52.3759,lon:4.5339,reg:"Noord-Holland",type:"Noordzee"},{id:3,name:"IJmuiden",lat:52.4577,lon:4.5547,reg:"Noord-Holland",type:"Noordzee"},{id:4,name:"Wijk aan Zee",lat:52.4943,lon:4.5958,reg:"Noord-Holland",type:"Noordzee"},{id:5,name:"Makkum",lat:53.0548,lon:5.3933,reg:"Friesland",type:"IJsselmeer"},{id:6,name:"Hindeloopen",lat:52.942,lon:5.4036,reg:"Friesland",type:"IJsselmeer"},{id:7,name:"Workum",lat:52.9811,lon:5.4436,reg:"Friesland",type:"IJsselmeer"},{id:8,name:"Stavoren",lat:52.8862,lon:5.3583,reg:"Friesland",type:"IJsselmeer"},{id:9,name:"Enkhuizen",lat:52.7033,lon:5.2919,reg:"Noord-Holland",type:"IJsselmeer"},{id:10,name:"Medemblik",lat:52.7718,lon:5.1086,reg:"Noord-Holland",type:"IJsselmeer"},{id:11,name:"Hoorn (Markermeer)",lat:52.6424,lon:5.0593,reg:"Noord-Holland",type:"IJsselmeer"},{id:12,name:"Muiderberg",lat:52.3288,lon:5.1058,reg:"Noord-Holland",type:"IJsselmeer"},{id:13,name:"Domburg",lat:51.5644,lon:3.4978,reg:"Zeeland",type:"Noordzee"},{id:14,name:"Vrouwenpolder",lat:51.5889,lon:3.595,reg:"Zeeland",type:"Noordzee"},{id:15,name:"Brouwersdam",lat:51.7469,lon:3.8644,reg:"Zuid-Holland",type:"Noordzee"},{id:16,name:"Ouddorp",lat:51.8167,lon:3.9333,reg:"Zuid-Holland",type:"Noordzee"},{id:17,name:"Rockanje",lat:51.8672,lon:4.0553,reg:"Zuid-Holland",type:"Noordzee"},{id:18,name:"Lemmer",lat:52.8439,lon:5.7117,reg:"Friesland",type:"IJsselmeer"},{id:19,name:"Vrouwenpolder (Veerse Dam)",lat:51.5892,lon:3.6455,reg:"Zeeland",type:"Veerse Meer"},{id:20,name:"Wolphaartsdijk (Muidenweg)",lat:51.5283,lon:3.725,reg:"Zeeland",type:"Veerse Meer"},{id:21,name:"Oranjeplaat",lat:51.5145,lon:3.7037,reg:"Zeeland",type:"Veerse Meer"},{id:22,name:"Schotsman",lat:51.5696,lon:3.6566,reg:"Zeeland",type:"Veerse Meer"},{id:23,name:"Kamperland",lat:51.57,lon:3.68,reg:"Zeeland",type:"Veerse Meer"},{id:24,name:"Kortgene",lat:51.555,lon:3.795,reg:"Zeeland",type:"Veerse Meer"},{id:25,name:"Breezand (Veerse Meer)",lat:51.5855,lon:3.6163,reg:"Zeeland",type:"Veerse Meer"},{id:26,name:"Geersdijk",lat:51.54,lon:3.76,reg:"Zeeland",type:"Veerse Meer"}];
const WD=["N","NNO","NO","ONO","O","OZO","ZO","ZZO","Z","ZZW","ZW","WZW","W","WNW","NW","NNW"];
const d2d=d=>WD[Math.round(d/22.5)%16],pad=h=>String(h).padStart(2,"0");
// Beaufort uit knopen (Open-Meteo levert nu direct knopen: wind_speed_unit=kn)
const BFT_KN=[1,4,7,11,17,22,28,34,41,48,56,64];
const bft=k=>{if(k==null||isNaN(k))return null;const r=Math.round(k);let b=0;while(b<12&&r>=BFT_KN[b])b++;return b;};
const knB=k=>`${Math.round(k)} kn · ${bft(k)} Bft`;
const dayN=s=>["Zo","Ma","Di","Wo","Do","Vr","Za"][new Date(s+"T12:00:00").getDay()];
const fullDay=s=>["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"][new Date(s+"T12:00:00").getDay()];
const fmtD=s=>{const m=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];const d=new Date(s+"T12:00:00");return`${d.getDate()} ${m[d.getMonth()]}`;};
async function fetchW(lat,lon){const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation_probability,precipitation&wind_speed_unit=kn&timezone=Europe%2FAmsterdam&forecast_days=7`);if(!r.ok)throw new Error("Open-Meteo "+r.status);return r.json();}
const ms2kn=m=>m*1.94384;
// Dichtstbijzijnde verse RWS-meting; voorkeur voor station van hetzelfde watertype (zee vs. meer/binnenwater)
const SEA_ST=new Set(RWS_STATIONS.filter(x=>x.sea).map(x=>x.code));
function nearSt(spot,rws,kind,opts){if(!rws||!rws.stations)return null;const sea=spot.type==="Noordzee";const pref=rws.stations.filter(x=>SEA_ST.has(x.code)===sea);return nearestStation(spot.lat,spot.lon,pref,kind,opts)||nearestStation(spot.lat,spot.lon,rws.stations,kind,opts);}

// Middelburg for bike forecast
const MIDDELBURG={name:"Middelburg",lat:51.4988,lon:3.6136};

const BIKE_IMGS=[0,1,2,3,4].map(i=>`assets/bike-${i}.png`);

// Bike comfort: based on peak wind, using custom bike icons
function bikeLevel(peakKn){
  const i=bikeIdx(peakKn);peakKn=[5,12,17,22,30][i];
  if(peakKn<10) return {img:BIKE_IMGS[0],color:"#2E7D32",label:"Heerlijk fietsen",bg:"rgba(46,125,50,0.1)"};
  if(peakKn<15) return {img:BIKE_IMGS[1],color:"#689F38",label:"Lekker fietsbaar",bg:"rgba(104,159,56,0.1)"};
  if(peakKn<20) return {img:BIKE_IMGS[2],color:"#E65100",label:"Stevige wind",bg:"rgba(230,81,0,0.1)"};
  if(peakKn<25) return {img:BIKE_IMGS[3],color:"#D84315",label:"Zwaar trappen",bg:"rgba(216,67,21,0.1)"};
  return {img:BIKE_IMGS[4],color:"#B71C1C",label:"Thuisblijven",bg:"rgba(183,28,28,0.1)"};
}

const CArrow=({deg,size=28,color})=>(<svg width={size} height={size} viewBox="0 0 24 24" style={{transform:`rotate(${deg+180}deg)`,transition:"transform 0.5s ease"}}><path d="M12 2 L18 18 L12 14 L6 18 Z" fill={color} opacity="0.9"/></svg>);

// ── WIND ROSE ──
function WindRose({ favDir, setFavDir }) {
  const t = useT();
  const ref = useRef(null);
  const dragging = useRef(null); // 'start' | 'end' | null
  const sz = 240, cx = sz/2, cy = sz/2, r = 95;
  const dirs = ["N","NO","O","ZO","Z","ZW","W","NW"];
  const dirDegs = [0,45,90,135,180,225,270,315];

  const getAngle = useCallback((e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left - cx;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top - cy;
    return ((Math.atan2(y, x) * 180 / Math.PI) + 90 + 360) % 360;
  }, [cx, cy]);

  const startAngle = ((favDir.center - favDir.span/2) + 360) % 360;
  const endAngle = ((favDir.center + favDir.span/2) + 360) % 360;

  const onDown = useCallback((e) => {
    const angle = getAngle(e);
    const dStart = Math.abs(((angle - startAngle + 540) % 360) - 180);
    const dEnd = Math.abs(((angle - endAngle + 540) % 360) - 180);
    dragging.current = dStart < dEnd ? 'start' : 'end';
    e.preventDefault();
  }, [getAngle, startAngle, endAngle]);

  const onMove = useCallback((e) => {
    if (!dragging.current) return;
    const angle = getAngle(e);
    e.preventDefault();
    setFavDir(prev => {
      if (dragging.current === 'start') {
        let diff = ((prev.center + prev.span/2) - angle + 540) % 360 - 180;
        const newSpan = Math.max(30, Math.min(330, Math.abs(diff) * 2));
        return { center: prev.center, span: Math.round(newSpan/5)*5 };
      } else {
        let diff = (angle - (prev.center - prev.span/2) + 540) % 360 - 180;
        const newSpan = Math.max(30, Math.min(330, Math.abs(diff) * 2));
        return { center: prev.center, span: Math.round(newSpan/5)*5 };
      }
    });
  }, [getAngle, setFavDir]);

  const onUp = useCallback(() => { dragging.current = null; }, []);

  // Rotate center on tap/click on direction labels
  const setCenter = (deg) => setFavDir(prev => ({ ...prev, center: deg }));

  // SVG arc path
  const arcPath = (startDeg, endDeg, radius) => {
    const s = (startDeg - 90) * Math.PI / 180;
    const e = (endDeg - 90) * Math.PI / 180;
    const x1 = cx + radius * Math.cos(s), y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e), y2 = cy + radius * Math.sin(e);
    const span = ((endDeg - startDeg) + 360) % 360;
    const large = span > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  const sA = ((favDir.center - favDir.span/2) + 360) % 360;
  const eA = ((favDir.center + favDir.span/2) + 360) % 360;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <svg ref={ref} width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        style={{cursor:"pointer",touchAction:"none"}}>
        {/* Background circles */}
        <circle cx={cx} cy={cy} r={r+10} fill="none" stroke={t.cb} strokeWidth={1}/>
        <circle cx={cx} cy={cy} r={r-20} fill="none" stroke={t.cb} strokeWidth={1} strokeDasharray="3 3"/>
        {/* Selected arc */}
        <path d={arcPath(sA, eA, r+8)} fill={t.roseSel} stroke={t.roseSelStroke} strokeWidth={2}/>
        {/* Direction lines */}
        {dirDegs.map((deg,i)=>{const a=(deg-90)*Math.PI/180;return(
          <g key={i}>
            <line x1={cx+30*Math.cos(a)} y1={cy+30*Math.sin(a)} x2={cx+(r+8)*Math.cos(a)} y2={cy+(r+8)*Math.sin(a)} stroke={t.cb} strokeWidth={1}/>
          </g>
        );})}
        {/* Direction labels - clickable */}
        {dirs.map((d,i)=>{const deg=dirDegs[i];const a=(deg-90)*Math.PI/180;const isInRange=dirInRange(deg,favDir);
          return(<text key={d} x={cx+(r+22)*Math.cos(a)} y={cy+(r+22)*Math.sin(a)} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={isInRange?800:500} fontFamily="Outfit" fill={isInRange?t.roseSelStroke:t.tm} style={{cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();setCenter(deg);}}>{d}</text>);
        })}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={t.acc}/>
        {/* Center direction indicator */}
        {(()=>{const a=(favDir.center-90)*Math.PI/180;return(
          <line x1={cx} y1={cy} x2={cx+(r-25)*Math.cos(a)} y2={cy+(r-25)*Math.sin(a)} stroke={t.roseSelStroke} strokeWidth={2.5} strokeLinecap="round"/>
        );})()}
        {/* Drag handles */}
        {[sA, eA].map((deg,i)=>{const a=(deg-90)*Math.PI/180;return(
          <circle key={i} cx={cx+(r+8)*Math.cos(a)} cy={cy+(r+8)*Math.sin(a)} r={8} fill={t.roseSelStroke} stroke="#fff" strokeWidth={2} style={{cursor:"grab"}}/>
        );})}
      </svg>

      <div style={{textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:700,color:t.text}}>
          {d2d(favDir.center)} ± {Math.round(favDir.span/2)}°
        </div>
        <div style={{fontSize:13,color:t.tm,marginTop:2}}>
          Van {d2d(sA)} ({Math.round(sA)}°) tot {d2d(eA)} ({Math.round(eA)}°)
        </div>
      </div>

      {/* Quick presets */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
        {[{l:"ZW",c:225},{l:"W",c:270},{l:"NW",c:315},{l:"N",c:0},{l:"NO",c:45},{l:"Alle",c:0,s:360}].map(p=>(
          <button key={p.l} onClick={()=>setFavDir({center:p.c,span:p.s||90})} style={{background:t.btn,border:`1px solid ${t.cb}`,borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,color:t.ts,cursor:"pointer",fontFamily:"inherit"}}>{p.l}</button>
        ))}
      </div>
    </div>
  );
}

// ── APP ──
// ── helpers voor persistente state ──
const ls=(k,def)=>{try{const v=localStorage.getItem(k);return v==null?def:JSON.parse(v)}catch(e){return def}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
function usePersist(k,def){const[v,setV]=useState(()=>ls(k,def));useEffect(()=>lsSet(k,v),[k,v]);return[v,setV];}
function useMedia(q){const[m,setM]=useState(()=>typeof matchMedia!=="undefined"&&matchMedia(q).matches);useEffect(()=>{const mq=matchMedia(q);const f=()=>setM(mq.matches);mq.addEventListener("change",f);return()=>mq.removeEventListener("change",f);},[q]);return m;}
const RANGE_LBL=a=>`${a.spot.name}: ${dayN(a.date)} ${pad(a.sh)}–${pad(a.eh)}u, ${Math.round(a.avgWind)} kn ${d2d(a.dir)}`;

function App(){
  const[dark,setDark]=useState(()=>{try{return localStorage.getItem('ws_dark')==='1'}catch(e){return false}});const t=dark?TH.dark:TH.light;
  useEffect(()=>{try{localStorage.setItem('ws_dark',dark?'1':'0')}catch(e){}const m=document.getElementById('themeColor');if(m)m.content=t.meta;document.body.style.background=dark?'#0a1628':'#f0f4f8';},[dark,t]);
  const isDesk=useMedia("(min-width: 900px)");
  const[view,setView]=useState("home");
  const[favs,setFavs]=usePersist('ws_favs',[1,5,15,21]);
  const[sData,setSData]=useState({});const[loading,setLoading]=useState(true);const[loadErr,setLoadErr]=useState(null);const[online,setOnline]=useState(()=>navigator.onLine!==false);useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);addEventListener('online',on);addEventListener('offline',off);return()=>{removeEventListener('online',on);removeEventListener('offline',off);};},[]);const[selSpot,setSelSpot]=useState(null);const[selDay,setSelDay]=useState(null);
  const[wset,setWset]=usePersist('ws_settings',{min:15,max:25});
  const minW=wset.min||15,maxW=wset.max||25;
  const setMinW=v=>setWset(s=>({...s,min:v})),setMaxW=v=>setWset(s=>({...s,max:v}));
  const[maxGust,setMaxGust]=usePersist('ws_maxgust',35);
  const[minHours,setMinHours]=usePersist('ws_minhours',2);
  const[alertsOn,setAlertsOn]=usePersist('ws_alerts_on',false);
  const[fReg,setFReg]=useState("Veerse Meer");const[sSort,setSSort]=usePersist('ws_sort',"custom");
  const[favDir,setFavDir]=usePersist('ws_dir',{center:225,span:90});
  const[route,setRoute]=usePersist('ws_route',{from:MIDDELBURG,to:null});
  const[proxyUrl,setProxyUrl]=usePersist('ws_rws_proxy',"");
  const[bikeData,setBikeData]=useState(null);
  const[tick,setTick]=useState(0);
  RANGE.min=minW;RANGE.max=maxW;
  const rws=useRws(proxyUrl,tick);

  // Data ophalen: favorieten + fiets-vertrekpunt; elke 30 min verversen zolang de app open is
  useEffect(()=>{const iv=setInterval(()=>setTick(x=>x+1),30*60*1000);return()=>clearInterval(iv);},[]);
  useEffect(()=>{let cancel=false;(async()=>{if(!Object.keys(sData).length)setLoading(true);const data={};const fs=SP.filter(s=>favs.includes(s.id));let fails=0;
    const from=route?.from||MIDDELBURG;
    const bikeProm=fetchW(from.lat,from.lon).then(d=>{if(!cancel)setBikeData(d)}).catch(()=>{});
    await Promise.all([...fs.map(async s=>{try{data[s.id]=await fetchW(s.lat,s.lon)}catch(e){fails++}}),bikeProm]);
    if(cancel)return;setSData(data);setLoadErr(fs.length&&fails===fs.length?"Geen verbinding met Open-Meteo":null);setLoading(false);})();return()=>{cancel=true};},[favs,tick,route?.from?.lat,route?.from?.lon]);

  // Alerts: aaneengesloten vensters, toekomst, richting- en vlagenfilter, circulair gemiddelde
  const alerts=useMemo(()=>{const now=localParts();const na=[];SP.filter(s=>favs.includes(s.id)).forEach(s=>{if(!sData[s.id])return;
    computeWindows(grp(sData[s.id].hourly),{min:minW-3,max:maxW+5,favDir,maxGust,minHours,now}).forEach(w=>na.push({...w,spot:s,spotId:s.id}));});
    // min-3 / max+5 zodat ook 'Matig' en 'Sterk' vensters zichtbaar zijn; classificatie op gemiddelde
    na.sort((a,b)=>a.date.localeCompare(b.date)||a.sh-b.sh);return na;},[sData,favs,minW,maxW,favDir,maxGust,minHours]);
  const perfect=useMemo(()=>{const now=localParts();const res=[];SP.filter(s=>favs.includes(s.id)).forEach(s=>{if(!sData[s.id])return;computeWindows(grp(sData[s.id].hourly),{min:minW,max:maxW,favDir,maxGust,minHours,now}).forEach(w=>res.push({...w,spot:s,spotId:s.id}));});return res.sort((x,y)=>x.date.localeCompare(y.date)||x.sh-y.sh||y.avgWind-x.avgWind);},[sData,favs,minW,maxW,favDir,maxGust,minHours]);

  // Lokale notificaties: bij openen en bij elke verversing (30 min) — alleen nieuwe perfecte vensters vandaag/morgen
  useEffect(()=>{if(!alertsOn||loading)return;const now=localParts();const tm=addDays(now.date,1);notifyNew(perfect.filter(w=>w.date===now.date||w.date===tm),RANGE_LBL);},[perfect,alertsOn,loading]);
  useEffect(()=>{shareSettingsWithSW({alertsOn,min:minW,max:maxW,favDir,maxGust,minHours,spots:SP.filter(s=>favs.includes(s.id)).map(({id,name,lat,lon})=>({id,name,lat,lon}))});},[alertsOn,minW,maxW,favDir,maxGust,minHours,favs]);

  const tFav=id=>setFavs(p=>p.includes(id)?p.filter(f=>f!==id):[...p,id]);
  const go=v=>{setView(v);window.scrollTo&&window.scrollTo(0,0);};
  const oSpot=s=>{setSelSpot(s);setSelDay(null);go("detail");};
  const oSpotDay=(s,day)=>{setSelSpot(s);setSelDay(day);go("detail");};
  const nPerfect=perfect.length;
  const TITLES={home:"Dashboard",spots:"Alle Spots",alerts:"Alerts",markt:"Marktplaats",kaart:"🗺️ Kaart",game:"🎮 Game",settings:"Instellingen",meer:"Meer",video:"Video's"};
  const mainTabs=[{id:"home",icon:"⛵",l:"Home"},{id:"spots",icon:"📍",l:"Spots"},{id:"alerts",icon:"🔔",l:"Alerts",badge:nPerfect},{id:"settings",icon:"⚙️",l:"Settings"},{id:"meer",icon:"☰",l:"Meer"}];
  const deskTabs=[{id:"home",icon:"⛵",l:"Home"},{id:"spots",icon:"📍",l:"Spots"},{id:"alerts",icon:"🔔",l:"Alerts",badge:nPerfect},{id:"kaart",icon:"🗺️",l:"Kaart"},{id:"markt",icon:"🛒",l:"Markt"},{id:"video",icon:"▶️",l:"Video's"},{id:"game",icon:"🎮",l:"Game"},{id:"settings",icon:"⚙️",l:"Settings"}];
  const inMeer=["markt","kaart","game","video","meer"].includes(view);

  const common={rws,minW,maxW,favDir,maxGust};
  return(
  <TC.Provider value={t}>
  <div className="app" style={{minHeight:"100vh",background:t.bg,fontFamily:"'Outfit','SF Pro Display',sans-serif",color:t.text,maxWidth:isDesk?1200:430,margin:"0 auto",position:"relative",transition:"background 0.3s"}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes wsLivePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}} input[type=range]{accent-color:${t.acc}} .sc-row-scroll::-webkit-scrollbar{display:none} button:focus-visible,a:focus-visible{outline:2px solid ${t.acc};outline-offset:2px}`}</style>
    <div aria-hidden="true" style={{position:"fixed",top:-100,right:-100,width:350,height:350,background:`radial-gradient(circle,${t.ambA} 0%,transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>
    <div aria-hidden="true" style={{position:"fixed",bottom:-50,left:-80,width:300,height:300,background:`radial-gradient(circle,${t.ambB} 0%,transparent 70%)`,borderRadius:"50%",pointerEvents:"none"}}/>

    <header style={{padding:"16px 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,position:"relative"}}>
      {view==="detail"?<button onClick={()=>go("home")} style={{background:t.btn,border:"none",color:t.text,borderRadius:12,padding:"8px 14px",fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>← Terug</button>
      :<div><div style={{fontSize:12,fontWeight:500,color:t.acc,letterSpacing:2.5,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}>Windsurf en Fiets<span style={{fontSize:10,fontWeight:700,background:`${t.acc}22`,color:t.acc,borderRadius:6,padding:"1px 6px",letterSpacing:0.5}}>v{VERSION}</span></div><h1 style={{fontSize:24,fontWeight:800,letterSpacing:-0.5,marginTop:2,margin:0}}>{TITLES[view]||""}</h1></div>}
      {isDesk&&view!=="detail"&&<nav aria-label="Hoofdmenu" style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",flex:1}}>
        {deskTabs.map(tb=><button key={tb.id} onClick={()=>go(tb.id)} aria-current={view===tb.id?"page":undefined} style={{background:view===tb.id?t.btnA:"transparent",border:`1px solid ${view===tb.id?t.btnAB:"transparent"}`,color:view===tb.id?t.acc:t.ts,borderRadius:12,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,position:"relative"}}>{tb.icon} {tb.l}{tb.badge>0&&<span style={{marginLeft:6,background:t.badBg,color:t.badT,fontSize:10,fontWeight:800,borderRadius:10,padding:"1px 6px"}}>{tb.badge}</span>}</button>)}
      </nav>}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={()=>setDark(!dark)} aria-label={dark?"Licht thema":"Donker thema"} style={{background:t.btn,border:`1px solid ${t.cb}`,borderRadius:12,padding:"6px 10px",cursor:"pointer",fontSize:18,lineHeight:1,color:t.text}}>{dark?"☀️":"🌙"}</button>
        {view==="detail"&&selSpot&&<div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:700}}>{selSpot.name}</div><div style={{fontSize:13,color:t.acc}}>{selSpot.type} · {selSpot.reg}</div></div>}
      </div>
    </header>

    <main style={{padding:isDesk?"0 24px 40px":"0 16px 100px"}}>
      {!online&&!loadErr&&<div role="status" style={{background:t.wb.m,color:t.ts,borderRadius:12,padding:"8px 14px",fontSize:13,marginBottom:10}}>📴 Offline — je ziet de laatst opgehaalde prognose en metingen.</div>}
      {loadErr&&<div role="alert" style={{background:t.wb.g,color:t.w.g,borderRadius:12,padding:"10px 14px",fontSize:13,marginBottom:10}}>⚠ {loadErr} — {navigator.onLine===false?"je bent offline; ":""}laatst opgeslagen gegevens worden getoond als die er zijn.</div>}
      {loading&&["home","alerts","detail"].includes(view)?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{width:48,height:48,border:`3px solid ${t.cb}`,borderTop:`3px solid ${t.acc}`,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 20px"}}/><div style={{color:t.acc,fontSize:15}}>Winddata ophalen...</div></div>
      :view==="home"?<Home alerts={alerts} perfect={perfect} sData={sData} favs={favs} oSpot={oSpot} oSpotDay={oSpotDay} sSort={sSort} bikeData={bikeData} route={route} isDesk={isDesk} go={go} {...common}/>
      :view==="spots"?<Spots spots={fReg==="Alle"?SP:SP.filter(s=>s.type===fReg)} favs={favs} tFav={tFav} oSpot={oSpot} fReg={fReg} setFReg={setFReg} regs={["Veerse Meer","Noordzee","IJsselmeer","Alle"]} sData={sData} rws={rws}/>
      :view==="alerts"?<Alerts alerts={alerts} perfect={perfect} oSpot={oSpot} favDir={favDir} maxGust={maxGust} minHours={minHours}/>
      :view==="markt"?<Markt/>
      :view==="video"?<YouTubeBlock/>
      :view==="meer"?<Meer go={go}/>
      :view==="settings"?<Settings minW={minW} setMinW={setMinW} maxW={maxW} setMaxW={setMaxW} alertsOn={alertsOn} setAlertsOn={setAlertsOn} sSort={sSort} setSSort={setSSort} favDir={favDir} setFavDir={setFavDir} maxGust={maxGust} setMaxGust={setMaxGust} minHours={minHours} setMinHours={setMinHours} route={route} setRoute={setRoute} proxyUrl={proxyUrl} setProxyUrl={setProxyUrl} rws={rws}/>
      :view==="kaart"?<VeerseMeerVerkenner/>
      :view==="game"?<WindsurfGame/>
      :view==="detail"&&selSpot?<Detail key={selSpot.id} spot={selSpot} data={sData[selSpot.id]} selDay={selDay} setSelDay={setSelDay} {...common}/>
      :null}
    </main>

    {!isDesk&&view!=="detail"&&<nav aria-label="Hoofdmenu" style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:`linear-gradient(to top,${t.navBg} 60%,${t.navF} 100%)`,backdropFilter:"blur(20px)",borderTop:`1px solid ${t.navB}`,padding:"8px 0 calc(12px + env(safe-area-inset-bottom))",zIndex:50}}>
      <div style={{display:"flex",justifyContent:"space-around"}}>
      {mainTabs.map(tb=>{const act=view===tb.id||(tb.id==="meer"&&inMeer);return(
        <button key={tb.id} onClick={()=>go(tb.id)} aria-current={act?"page":undefined} style={{background:"none",border:"none",color:act?t.acc:t.navI,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",fontSize:22,padding:"4px 6px",position:"relative",flex:1,minWidth:0}}>
          <span aria-hidden="true">{tb.icon}</span><span style={{fontSize:10,fontWeight:600,fontFamily:"Outfit",letterSpacing:0.3,whiteSpace:"nowrap"}}>{tb.l}</span>
          {tb.badge>0&&<span aria-label={`${tb.badge} perfecte vensters`} style={{position:"absolute",top:-2,right:"calc(50% - 22px)",background:t.badBg,color:t.badT,fontSize:10,fontWeight:800,borderRadius:10,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{tb.badge}</span>}
          {act&&<div style={{width:4,height:4,borderRadius:2,background:t.acc,marginTop:1}}/>}
        </button>);})}
      </div>
    </nav>}
  </div>
  </TC.Provider>);
}

function Meer({go}){const t=useT();const items=[{id:"kaart",icon:"🗺️",l:"Kaart Veerse Meer",d:"Satelliet, zeekaart en route"},{id:"markt",icon:"🛒",l:"Marktplaats",d:"Tweedehands surfspullen zoeken"},{id:"video",icon:"▶️",l:"Video's",d:"YouTube windsurf-zoekopdrachten"},{id:"game",icon:"🎮",l:"Game",d:"Johanski Jump Sessie"}];
  return(<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>{items.map(i=><button key={i.id} onClick={()=>go(i.id)} style={{display:"flex",alignItems:"center",gap:14,background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"16px",cursor:"pointer",fontFamily:"inherit",color:t.text,textAlign:"left"}}><span style={{fontSize:26}}>{i.icon}</span><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{i.l}</div><div style={{fontSize:13,color:t.tm}}>{i.d}</div></div><span style={{color:t.tf}}>→</span></button>)}</div>);}

// Bron-badge: LIVE (RWS-meting) of MODEL (Open-Meteo)
function SrcBadge({live,title}){return live?<span title={title} style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(0,180,90,0.12)",border:"1px solid rgba(0,180,90,0.35)",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#00a152",letterSpacing:0.5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#00c853",animation:"wsLivePulse 2s infinite"}}/>LIVE</span>
  :<span title={title} style={{display:"inline-flex",alignItems:"center",background:"rgba(120,140,160,0.14)",border:"1px solid rgba(120,140,160,0.3)",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#6b7f94",letterSpacing:0.5}}>MODEL</span>;}
const hhmm=ts=>new Date(ts).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Amsterdam"});

// ── WATER TEMPERATURE BANNER ──
// 1. dichtstbijzijnde RWS-meting (vers < 3 u) · 2. Open-Meteo Marine (model) · anders "geen data" (geen verzonnen waarde)
function WaterTempBanner({rws}){
  const t=useT();const ref={name:"Oranjeplaat",lat:51.5145,lon:3.7037};
  const st=rws?nearestStation(ref.lat,ref.lon,rws.stations,"temp",{maxKm:25}):null;
  const[model,setModel]=useState(undefined);
  useEffect(()=>{if(!rws||st)return;let c=false;(async()=>{try{const r=await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${ref.lat}&longitude=${ref.lon}&hourly=sea_surface_temperature&timezone=Europe%2FAmsterdam&forecast_days=1`);const d=await r.json();const vals=d?.hourly?.sea_surface_temperature;const hr=localParts().hour;if(!c)setModel(vals&&vals[hr]!=null?vals[hr]:null);}catch(e){if(!c)setModel(null);}})();return()=>{c=true};},[rws,!!st]);
  const tv=st?st.temp:(model??null);
  const status=!rws?"laden":st?"live":model===undefined?"laden":model===null?"geen":"model";
  const advies=tv===null?(status==="geen"?"Geen actuele meting beschikbaar":"⌛ Laden..."):tv<10?"🥶 Droogpak aanbevolen":tv<15?"🧊 5mm wetsuit":tv<18?"🌊 3mm wetsuit":tv<22?"✅ Shorty volstaat":"☀️ Zwemshort";
  const tempColor=tv===null?t.tm:tv<10?"#5b9bd5":tv<15?"#4fc3f7":tv<18?"#4db6ac":"#66bb6a";
  return(
    <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"14px 16px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
        <div style={{width:44,height:44,borderRadius:12,background:`${tempColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌡️</div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700}}>Watertemperatuur Veerse Meer</div>
          <div style={{fontSize:11,color:t.tm,marginTop:1}}>{st?`RWS ${st.naam} · ${st.km.toFixed(0)} km · ${hhmm(st.temp_ts)}`:status==="model"?"Open-Meteo Marine (model, zee)":status==="geen"?"RWS en model niet beschikbaar":"…"}</div>
          <div style={{fontSize:12,color:t.acc,fontWeight:600,marginTop:4}}>{advies}</div>
        </div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:36,fontWeight:900,color:tempColor,lineHeight:1,fontFamily:"JetBrains Mono"}}>{tv!==null?tv.toFixed(1):"—"}<span style={{fontSize:16,opacity:0.7}}>°C</span></div>
        <div style={{marginTop:6}}>{status==="live"?<SrcBadge live/>:status==="model"?<SrcBadge/>:<span style={{fontSize:10,color:t.tm}}>{status==="geen"?"geen data":"⌛ laden"}</span>}</div>
      </div>
    </div>
  );
}

// ── METAR BANNER VERWIJDERD ──

// ── WEEK DAY CARD: scrollbaar staafdiagram + mooie pijlen + regen ──
function DayWindCard({spot,date,hrs,minW,maxW,favDir,maxGust,onTap,t,nowHour}){
  const HOURS=[];for(let h=8;h<=20;h++)HOURS.push(h);
  const n=HOURS.length; // 13 uren
  const dayHrs=HOURS.map(h=>hrs.find(x=>x.hour===h)||{hour:h,wind:0,gust:0,dir:0,temp:0,rn:0,rp:0});

  // Past op schermbreedte (viewBox schaalt mee): 13 staven van 22px + 4px gap
  const BAR_W=22,GAP=4,PAD_L=26,PAD_R=16;
  const SVG_W=PAD_L+(BAR_W+GAP)*n+PAD_R;
  const LABEL_H=18; // knopen label boven staaf
  const CHART_H=100; // wind bars hoogte
  const ARROW_H=22; // pijl ruimte
  const HOUR_H=33;  // uur labels + richting + Bft
  const TOTAL_H=LABEL_H+CHART_H+ARROW_H+HOUR_H;
  const RAIN_H=36;

  const xCenter=i=>PAD_L+i*(BAR_W+GAP)+BAR_W/2;
  const chartMax=Math.ceil(Math.max(40,...dayHrs.map(h=>h.wind+2))/10)*10;
  const yBar=v=>Math.max(0,(v/chartMax)*CHART_H);

  // Windkleur = zelfde klassen als overal (wc, volgt ingestelde range)
  const windCol=v=>wc(v,t).color;
  const okH=h=>hourOk(h,{min:minW,max:maxW,favDir,maxGust});
  const past=h=>nowHour!=null&&h.hour<nowHour;
  const goodHours=dayHrs.filter(h=>okH(h)&&!past(h));
  const hasGood=goodHours.length>0;
  const firstGoodIdx=dayHrs.findIndex(h=>okH(h)&&!past(h));
  const avgGood=hasGood?goodHours.reduce((s,h)=>s+h.wind,0)/goodHours.length:0;
  const q=wc(avgGood,t);

  const maxRain=Math.max(...dayHrs.map(h=>h.rn||0),0.01);
  const hasRain=dayHrs.some(h=>(h.rn||0)>=0.1);
  const maxProb=Math.max(...dayHrs.map(h=>h.rp||0));
  const showRain=hasRain||maxProb>25;

  const dateObj=new Date(date+"T12:00:00");
  const dayNames=["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
  const monthNames=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  const dayLabel=`${dayNames[dateObj.getDay()]} ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

  const yGridVals=Array.from({length:Math.floor(chartMax/10)+1},(_,i)=>i*10);

  return(
    <div onClick={onTap} style={{background:t.card,border:`1px solid ${hasGood?q.color+"55":t.cb}`,borderRadius:16,marginBottom:10,cursor:"pointer",overflow:"hidden"}}>
      {/* Header - vast, niet scrollend */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px 8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:15,fontWeight:700}}>{dayLabel}</span>
          {hasGood&&<span style={{fontSize:11,fontWeight:700,color:"#fff",background:q.color,padding:"2px 8px",borderRadius:10}}>{q.label} · {knB(avgGood)}</span>}
        </div>
        <span style={{fontSize:13,color:t.tf}}>→</span>
      </div>

      {/* Scrollbaar grafiek gedeelte */}
      <div style={{paddingBottom:2,padding:"0 4px"}}>
        <div style={{width:"100%",maxWidth:SVG_W*1.6,margin:"0 auto"}}>
          <svg viewBox={`0 0 ${SVG_W} ${TOTAL_H}`} width="100%" style={{display:"block"}} role="img" aria-label={`Wind ${dayLabel} 8 tot 20 uur`}>
            {/* Y-as gridlijnen + labels */}
            <text x={PAD_L-4} y={10} fill={t.tm} fontSize={8} textAnchor="end" fontFamily="JetBrains Mono">kn</text>
            <text x={PAD_L-4} y={TOTAL_H-1} fill={t.tm} fontSize={8} textAnchor="end" fontFamily="JetBrains Mono">Bft</text>
            {yGridVals.map(v=>{
              const y=LABEL_H+CHART_H-yBar(v);
              return<g key={v}>
                <line x1={PAD_L} y1={y} x2={SVG_W-PAD_R} y2={y} stroke={t.gGrid} strokeWidth={v===0?1:0.5} strokeDasharray={v===0?"none":"3 4"}/>
                <text x={PAD_L-4} y={y+3} fill={t.tm} fontSize={9} textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
              </g>;
            })}

            {/* Groene band achtergrond */}
            <rect x={PAD_L} y={LABEL_H+CHART_H-yBar(maxW)} width={SVG_W-PAD_L-PAD_R} height={Math.max(0,yBar(maxW)-yBar(minW))} fill="#2e7d3210" rx={3}/>

            {/* Stippellijnen min/max */}
            {[minW,maxW].map(v=><line key={v}
              x1={PAD_L} y1={LABEL_H+CHART_H-yBar(v)}
              x2={SVG_W-PAD_R} y2={LABEL_H+CHART_H-yBar(v)}
              stroke="#2e7d32" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.5}/>)}

            {/* Min/max labels rechts */}
            <text x={SVG_W-PAD_R+2} y={LABEL_H+CHART_H-yBar(maxW)+4} fill="#2e7d32" fontSize={8} fontFamily="JetBrains Mono" fontWeight="700">{maxW}</text>
            <text x={SVG_W-PAD_R+2} y={LABEL_H+CHART_H-yBar(minW)+4} fill="#2e7d32" fontSize={8} fontFamily="JetBrains Mono" fontWeight="700">{minW}</text>

            {/* Wind staven */}
            {dayHrs.map((h,i)=>{
              const bH=yBar(h.wind);
              const col=windCol(h.wind);
              const x=PAD_L+i*(BAR_W+GAP);
              const y=LABEL_H+CHART_H-bH;
              return<g key={i}>
                <rect x={x} y={y} width={BAR_W} height={bH} fill={h.wind<1?t.gGrid:col} rx={4} opacity={h.wind<1?0.2:past(h)?0.3:dirInRange(h.dir,favDir)?1:0.45}/>
                {h.wind>=1&&<text x={xCenter(i)} y={y-3} fill={col} fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="800">{Math.round(h.wind)}</text>}
                {i===firstGoodIdx&&<text x={xCenter(i)} y={LABEL_H-3} fontSize={14} textAnchor="middle">🏄</text>}
              </g>;
            })}

            {/* Windrichting pijlen — CArrow stijl (gevulde driehoek) */}
            {dayHrs.map((h,i)=>{
              const col=h.wind<1?t.gGrid:windCol(h.wind);
              const cx=xCenter(i);
              const cy=LABEL_H+CHART_H+ARROW_H/2;
              const sz=10;
              const rad=(h.dir+180)*(Math.PI/180);
              // Pijlpunt (naar waar wind naartoe gaat)
              const tx=cx+sz*Math.sin(rad);
              const ty=cy-sz*Math.cos(rad);
              // Staart
              const fx=cx-sz*Math.sin(rad);
              const fy=cy+sz*Math.cos(rad);
              // Vleugels pijlpunt
              const w=4;
              const ax=-Math.cos(rad)*w, ay=-Math.sin(rad)*w;
              return<g key={i} opacity={h.wind<1?0.3:1}>
                <line x1={fx} y1={fy} x2={tx} y2={ty} stroke={col} strokeWidth={2} strokeLinecap="round"/>
                <polygon
                  points={`${tx},${ty} ${tx-sz*0.5*Math.sin(rad)+ax},${ty+sz*0.5*Math.cos(rad)+ay} ${tx-sz*0.5*Math.sin(rad)-ax},${ty+sz*0.5*Math.cos(rad)-ay}`}
                  fill={col}/>
              </g>;
            })}

            {/* Uur labels + windrichting X-as */}
            {dayHrs.map((h,i)=>(
              <g key={i}>
                <text x={xCenter(i)} y={TOTAL_H-23} fill={t.tm} fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono">{h.hour}</text>
                <text x={xCenter(i)} y={TOTAL_H-12} fill={h.wind<1?t.gGrid:windCol(h.wind)} fontSize={8} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="600">{d2d(h.dir)}</text>
                <text x={xCenter(i)} y={TOTAL_H-1} fill={t.tm} fontSize={8} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700">{bft(h.wind)}B</text>
              </g>
            ))}
          </svg>

          {/* Regen bars — zelfde breedte als windgrafiek */}
          {showRain&&(
            <svg viewBox={`0 0 ${SVG_W} ${RAIN_H}`} width="100%" style={{display:"block"}} aria-hidden="true">
              <line x1={PAD_L} y1={0} x2={SVG_W-PAD_R} y2={0} stroke={t.div} strokeWidth={1}/>
              <text x={PAD_L-4} y={12} fill="#1976d2" fontSize={9} textAnchor="end" fontFamily="JetBrains Mono">mm</text>
              {dayHrs.map((h,i)=>{
                const rn=h.rn||0;const rp=h.rp||0;
                const bH=rn>=0.1?Math.max(5,(rn/maxRain)*(RAIN_H-8)):rp>25?Math.max(4,(rp/100)*(RAIN_H-8)*0.6):0;
                const col=rn>=0.1?"#1976d2":"#90caf955";
                const x=PAD_L+i*(BAR_W+GAP);
                return bH>0?<rect key={i} x={x} y={RAIN_H-bH} width={BAR_W} height={bH} fill={col} rx={3}/>:null;
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Droog label als geen regen */}
      {!showRain&&<div style={{textAlign:"center",fontSize:12,color:t.dry,padding:"4px 0 10px"}}>☀️ Droog</div>}
    </div>
  );
}

// ── HOME ──
function Home({alerts,perfect,sData,favs,oSpot,oSpotDay,minW,maxW,sSort,favDir,maxGust,bikeData,route,rws,isDesk,go}){
  const t=useT();const perf=perfect;
  const now=localParts();const today=now.date,tmrw=addDays(today,1);
  const tA=alerts.filter(a=>a.date===today),tmA=alerts.filter(a=>a.date===tmrw);
  const[expanded,setExpanded]=useState({});
  const nDefault=isDesk?3:2;
  const sorted=[...favs].sort((a,b)=>{if(sSort==="custom")return 0;const sA=SP.find(s=>s.id===a),sB=SP.find(s=>s.id===b);if(!sA||!sB)return 0;if(sSort==="name")return sA.name.localeCompare(sB.name);if(sSort==="region")return sA.type.localeCompare(sB.type)||sA.name.localeCompare(sB.name);if(sSort==="wind_high"||sSort==="wind_low"){const g=id=>{if(!sData[id])return 0;return pk(grp(sData[id].hourly)[today]||[]).avg;};return sSort==="wind_high"?g(b)-g(a):g(a)-g(b);}return 0;});

  const week=(<div>
    <Sec t="Deze week" s="7-daagse vooruitblik · model"/>
    {sorted.length===0&&<Em t="Nog geen favoriete spots — kies ze bij Spots (☆)."/>}
    {sorted.map(fId=>{const spot=SP.find(s=>s.id===fId);if(!spot||!sData[fId])return null;const days=grp(sData[fId].hourly);const dayEntries=Object.entries(days).filter(([d])=>d>=today).slice(0,7);
      const ws=rws?nearSt(spot,rws,"wind"):null;const open=!!expanded[fId];const shown=open?dayEntries:dayEntries.slice(0,nDefault);
      return(<section key={fId} style={{marginBottom:16}} aria-label={spot.name}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer",gap:8}} onClick={()=>oSpot(spot)}>
          <div style={{minWidth:0}}><span style={{fontSize:17,fontWeight:700}}>{spot.name}</span><span style={{fontSize:13,color:t.acc,marginLeft:8}}>{spot.type}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            {ws&&<span style={{fontSize:12,fontWeight:700,color:t.ts,fontFamily:"JetBrains Mono"}}>{Math.round(ms2kn(ws.wind_ms))} kn</span>}
            <SrcBadge live={!!ws} title={ws?`RWS ${ws.naam} (${ws.km.toFixed(0)} km), ${hhmm(ws.wind_ts)}`:"Geen verse RWS-meting in de buurt"}/>
            <span style={{fontSize:13,color:t.tf}}>→</span>
          </div>
        </div>
        {shown.map(([d,h])=>(
          <DayWindCard key={d} spot={spot} date={d} hrs={h} minW={minW} maxW={maxW} favDir={favDir} maxGust={maxGust} onTap={()=>oSpotDay(spot,d)} t={t} nowHour={d===today?now.hour:null}/>
        ))}
        {dayEntries.length>nDefault&&<button onClick={()=>setExpanded(e=>({...e,[fId]:!open}))} aria-expanded={open} style={{width:"100%",padding:"9px",borderRadius:12,border:`1px dashed ${t.cb}`,background:"transparent",color:t.acc,fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer"}}>{open?"▴ Minder dagen":`▾ Toon hele week (${dayEntries.length-nDefault} dagen meer)`}</button>}
      </section>);
    })}
  </div>);

  const side=(<div>
    <WaterTempBanner rws={rws}/>
    <a href="https://metar-taf.com/nl/metar/EHMZ" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",display:"block",marginBottom:12}}>
      <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>✈️</span>
          <div><div style={{fontSize:14,fontWeight:700,color:t.text}}>METAR Midden-Zeeland</div><div style={{fontSize:11,color:t.tm,marginTop:1}}>EHMZ · opent metar-taf.com</div></div>
        </div>
        <span style={{fontSize:16,color:t.acc}}>↗</span>
      </div>
    </a>
    {perf.length>0&&<div style={{background:t.alBg,border:`1px solid ${t.alBd}`,borderRadius:16,padding:"16px 18px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{fontSize:20}}>🏄‍♂️</span><span style={{fontSize:17,fontWeight:700,color:t.w.p}}>{perf.length} perfect{perf.length>1?"e":""} windvenster{perf.length>1?"s":""} deze week</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {perf.slice(0,isDesk?6:3).map((a,i)=>{const dateObj=new Date(a.date+"T12:00:00");const monthNames=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];const dayNames=["Zo","Ma","Di","Wo","Do","Vr","Za"];
          return(<div key={i} onClick={()=>oSpotDay(a.spot,a.date)} style={{display:"flex",gap:12,background:t.alIt,borderRadius:12,padding:"12px",cursor:"pointer",alignItems:"center"}}>
            <div style={{minWidth:52,textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:10,fontWeight:600,color:t.w.p,textTransform:"uppercase"}}>{dayNames[dateObj.getDay()]}</div>
              <div style={{fontSize:28,fontWeight:900,color:t.text,lineHeight:1,fontFamily:"JetBrains Mono"}}>{dateObj.getDate()}</div>
              <div style={{fontSize:11,fontWeight:600,color:t.tm}}>{monthNames[dateObj.getMonth()]}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}><span style={{fontSize:15,fontWeight:700}}>{a.spot.name}</span><span style={{fontSize:15,fontWeight:800,color:t.w.p,fontFamily:"JetBrains Mono",whiteSpace:"nowrap"}}>{knB(a.avgWind)}</span></div>
              <div style={{fontSize:13,color:t.ts,marginTop:3}}>⏰ {pad(a.sh)}:00–{pad(a.eh)}:00 · {d2d(a.dir)} · vlagen ≤{Math.round(a.maxGust)}</div>
              {a.ri.has?<div style={{fontSize:12,color:t.rain,marginTop:2}}>🌧️ {pad(a.ri.sh)}:00-{pad(a.ri.eh)}:00 ({a.ri.mp}%)</div>:<div style={{fontSize:12,color:t.dry,marginTop:2}}>☀️ Droog</div>}
            </div>
          </div>);})}
      </div>
      {perf.length>(isDesk?6:3)&&<button onClick={()=>go("alerts")} style={{marginTop:10,width:"100%",padding:"9px",borderRadius:12,border:`1px solid ${t.alBd}`,background:"transparent",color:t.w.p,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Alle {perf.length} vensters bekijken →</button>}
    </div>}
    <BikeCard bikeData={bikeData} route={route} go={go}/>
  </div>);

  return(<div>
    {isDesk?<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 400px",gap:24,alignItems:"start"}}><div>{week}</div><div style={{position:"sticky",top:12,paddingTop:20}}>{side}</div></div>
    :<>{side}{week}</>}
    <div style={isDesk?{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:24}:{}}>
      <div><Sec t="Vandaag" s={fmtD(today)}/>{tA.length>0?<SCRow items={tA} oSpot={oSpot}/>:<Em t="Geen bruikbaar windvenster meer vandaag bij je favorieten"/>}</div>
      <div><Sec t="Morgen" s={fmtD(tmrw)}/>{tmA.length>0?<SCRow items={tmA} oSpot={oSpot}/>:<Em t="Geen bruikbaar windvenster morgen bij je favorieten"/>}</div>
    </div>
  </div>);
}

// ── FIETS: 7 dagen, vaste route met tegenwind heen (ochtend) en terug (middag) ──
function BikeCard({bikeData,route,go}){
  const t=useT();const today=localParts().date;
  if(!bikeData)return null;
  const days=Object.entries(grp(bikeData.hourly)).filter(([d])=>d>=today).slice(0,7);
  const from=route?.from||MIDDELBURG,to=route?.to;
  const brg=to?bearing(from.lat,from.lon,to.lat,to.lon):null;
  const km=to?haversine(from.lat,from.lon,to.lat,to.lon):null;
  const at=(h,hr)=>h.find(x=>x.hour===hr)||h[0];
  const hwTxt=v=>v>=1.5?`↑${Math.round(v)} tegen`:v<=-1.5?`↓${Math.round(-v)} mee`:"zijwind";
  return(<div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"14px 16px",marginBottom:10}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{fontSize:20}}>🚴</span>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:700}}>Fietswind {from.name}{to?` → ${to.name}`:""}</div>
        <div style={{fontSize:12,color:t.tm}}>{to?`${km.toFixed(1)} km hemelsbreed · koers ${Math.round(brg)}° (${d2d(brg)}) · heen 8u, terug 17u`:"Piekwind 8–20u · stel je route in bij Settings"}</div></div>
      {!to&&<button onClick={()=>go("settings")} style={{background:t.btnA,border:`1px solid ${t.btnAB}`,color:t.acc,borderRadius:10,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Route</button>}
    </div>
    <div className="sc-row-scroll" style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
      {days.map(([d,h],idx)=>{
        const dh=h.filter(x=>x.hour>=8&&x.hour<=20);if(!dh.length)return null;
        const p=pk(h);const peak=p.max;
        const rain=h.filter(x=>x.hour>=7&&x.hour<=19).reduce((s,x)=>s+(x.rn||0),0);
        const tmax=Math.max(...dh.map(x=>x.temp??-99));
        let hwOut=null,hwBack=null;
        if(to){const a=at(h,8),b=at(h,17);hwOut=headwind(a.wind,a.dir,brg);hwBack=headwind(b.wind,b.dir,(brg+180)%360);}
        // effectieve wind voor het icoon: met route de zwaarste tegenwind, anders piekwind
        const eff=to?Math.max(0,hwOut,hwBack,peak*0.6):peak;
        const bl=bikeLevel(eff);
        return(<div key={d} style={{flexShrink:0,width:112,textAlign:"center",padding:"10px 6px",background:bl.bg,borderRadius:14,scrollSnapAlign:idx%3===0?"start":"none"}}>
          <div style={{fontSize:13,color:t.ts,fontWeight:700}}>{dayN(d)} <span style={{fontWeight:500,color:t.tm,fontSize:11}}>{fmtD(d)}</span></div>
          <img src={bl.img} alt={bl.label} style={{width:40,height:40,marginTop:4,objectFit:"contain"}}/>
          <div style={{fontSize:20,fontWeight:800,color:bl.color,fontFamily:"JetBrains Mono",lineHeight:1}}>{Math.round(peak)}<span style={{fontSize:10,color:t.tm,fontWeight:500}}> kn</span></div>
          <div style={{fontSize:10,color:t.tm,marginTop:2}}>{d2d(p.dir)} · vlaag {Math.round(p.gust)}</div>
          {to&&<div style={{fontSize:10,marginTop:3,color:t.ts,lineHeight:1.35}}>heen {hwTxt(hwOut)}<br/>terug {hwTxt(hwBack)}</div>}
          <div style={{fontSize:10,marginTop:3,color:rain>=0.5?t.rain:t.dry}}>{rain>=0.5?`🌧 ${rain.toFixed(1)} mm`:"☀️ droog"} · {Math.round(tmax)}°</div>
        </div>);
      })}
    </div>
    <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:10,flexWrap:"wrap"}}>
      {[{img:BIKE_IMGS[0],l:"<10 kn"},{img:BIKE_IMGS[1],l:"10-15"},{img:BIKE_IMGS[2],l:"15-20"},{img:BIKE_IMGS[3],l:"20-25"},{img:BIKE_IMGS[4],l:"25+"}].map((x,i)=>
        <div key={i} style={{display:"flex",alignItems:"center",gap:3}}><img src={x.img} alt="" style={{width:18,height:18,objectFit:"contain"}}/><span style={{fontSize:9,color:t.tm}}>{x.l}</span></div>)}
    </div>
    <div style={{fontSize:10,color:t.tf,textAlign:"center",marginTop:6}}>{to?"Icoon = zwaarste tegenwind (heen/terug) of 60% van de piekwind":"Icoon = piekwind overdag"} · Open-Meteo model</div>
  </div>);
}

// ── YOUTUBE ──
function YouTubeBlock(){
  const t=useT();
  const[zoek,setZoek]=useState("");
  const searches=[
    {label:"🏄 Windsurf",q:"windsurf",color:t.acc},
    {label:"🌊 Veerse Meer",q:"Veerse Meer windsurf",color:t.w.p},
    {label:"🎿 Foilen",q:"windfoil foilen",color:t.w.m},
    {label:"🇳🇱 Nederland",q:"windsurf Nederland",color:t.w.s},
  ];
  const open=(q)=>window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,"_blank");
  return(<>
    <Sec t={<span><span style={{color:"#000",fontWeight:900}}>You</span><span style={{background:"#FF0000",color:"#fff",borderRadius:6,padding:"0 7px",marginLeft:2,fontWeight:900}}>Tube</span></span>} s="Windsurf video's"/>
    <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"16px",marginBottom:8}}>
      {/* Superdogzilla kanaal */}
      <a href="https://youtube.com/@superdogzilla?si=GBTZKdx9yd-rp8m3" target="_blank" rel="noopener noreferrer"
        style={{display:"flex",alignItems:"center",gap:12,background:"#FF000012",border:"1px solid #FF000033",borderRadius:12,padding:"12px 14px",marginBottom:14,textDecoration:"none"}}>
        <div style={{width:42,height:42,borderRadius:"50%",background:"#FF0000",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🐕</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:t.text}}>@superdogzilla</div>
          <div style={{fontSize:12,color:t.tm}}>Windsurf kanaal · Zeeland</div>
        </div>
        <div style={{background:"#FF0000",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,flexShrink:0}}>▶ Bekijk</div>
      </a>
      {/* Zoekknopjes */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {searches.map(s=>(
          <button key={s.q} onClick={()=>open(s.q)}
            style={{padding:"9px 14px",borderRadius:20,border:`1px solid ${s.color}44`,background:`${s.color}10`,color:s.color,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={zoek} onChange={e=>setZoek(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&zoek.trim())open(zoek.trim()+" windsurf");}}
          placeholder="Zoek op YouTube..."
          style={{flex:1,padding:"10px 14px",borderRadius:12,border:`1px solid ${t.cb}`,background:t.btn,color:t.text,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        <button onClick={()=>{if(zoek.trim())open(zoek.trim()+" windsurf");}}
          style={{padding:"10px 16px",borderRadius:12,background:"#FF0000",color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
          Zoek →
        </button>
      </div>
      <div style={{fontSize:11,color:t.tm,marginTop:8,textAlign:"center"}}>Opent YouTube in een nieuw tabblad</div>
    </div>
  </>);
}

// ── JOHANSKI JUMP SESSIE GAME ──
function WindsurfGame(){
  const cvRef=React.useRef(null);
  const fsRef=React.useRef(null);
  const [isFS,setIsFS]=React.useState(false);
  const [soundOn,setSoundOn]=React.useState(true);
  const [best,setBest]=React.useState(()=>{try{return parseInt(localStorage.getItem('jjs_best')||'0');}catch(e){return 0;}});
  const [achUnlocked,setAchUnlocked]=React.useState(()=>{try{return JSON.parse(localStorage.getItem('jjs_ach')||'[false,false,false,false,false]');}catch(e){return[false,false,false,false,false];}});
  const [hudScore,setHudScore]=React.useState('00000');
  const [hudWind,setHudWind]=React.useState('14 KN');
  const [hudBest,setHudBest]=React.useState('00000');
  const [hudLives,setHudLives]=React.useState('\u2764\uFE0F\u2764\uFE0F\u2764\uFE0F');
  const stateRef=React.useRef(null);
  const rafRef=React.useRef(null);
  const bgmRef=React.useRef(null);
  const acRef=React.useRef(null);
  const soundRef=React.useRef(true);
  const lvlRef=React.useRef(0); // frames left in level transition
  const PX=3;

  const STARS=React.useRef(Array.from({length:55},()=>({x:Math.random(),y:Math.random()*.85,s:Math.random()>.85?2:1,tw:Math.random()*Math.PI*2,sp:0.02+Math.random()*0.04,c:['#0ff','#f0f','#ff0','#fff','#aaf'][Math.floor(Math.random()*5)]})));

  function getAC(){if(!acRef.current)acRef.current=new(window.AudioContext||window.webkitAudioContext)();return acRef.current;}
  function beep(freq,dur,type,vol,delay){if(!soundRef.current)return;try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'square';const t=a.currentTime+(delay||0);o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol||.12,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.start(t);o.stop(t+dur+.01);}catch(e){}}
  function sndJump(){beep(200,.05,'square',.15);beep(350,.08,'square',.12,.06);beep(500,.1,'square',.09,.13);}
  function sndCrash(){beep(150,.12,'sawtooth',.3);beep(80,.2,'sawtooth',.25,.1);beep(40,.35,'sawtooth',.2,.3);}
  function sndRing(){[523,659,784,1047].forEach((f,i)=>beep(f,.08,'sine',.18,i*.07));}
  function sndLife(){beep(440,.06,'sine',.2);beep(554,.06,'sine',.2,.08);beep(659,.14,'sine',.22,.16);}
  function sndRecord(){[523,659,784,1047,1319].forEach((f,i)=>beep(f,.09,'square',.12,i*.08));}
  function sndGull(){beep(800,.05,'square',.1);beep(1000,.05,'square',.1,.06);beep(800,.08,'square',.08,.12);}
  function sndLvl(){[262,330,392,523,659,784].forEach((f,i)=>beep(f,.1,'square',.14,i*.09));}
  function sndLightning(){beep(880,.04,'square',.3);beep(440,.08,'sawtooth',.2,.05);beep(110,.25,'sawtooth',.15,.1);}

  const MEL1=[[330,.14],[330,.07],[0,.07],[330,.14],[0,.14],[262,.14],[330,.14],[0,.14],[392,.21],[0,.21],[196,.21],[0,.21],[262,.14],[0,.14],[196,.14],[0,.14],[165,.14],[0,.14],[220,.14],[0,.07],[247,.14],[0,.07],[233,.14],[220,.14],[0,.07],[196,.12],[330,.12],[392,.12],[440,.12],[349,.12],[392,.07],[0,.07],[330,.14],[0,.07],[262,.12],[294,.12],[247,.12],[0,.14]];
  const MEL2=[[220,.1],[0,.05],[220,.1],[0,.05],[262,.1],[294,.1],[0,.1],[330,.1],[0,.05],[330,.1],[0,.05],[392,.1],[349,.1],[0,.1],[294,.1],[0,.05],[262,.1],[220,.1],[0,.1],[196,.1],[0,.05],[220,.1],[262,.1],[294,.1],[330,.15],[0,.1]];
  const melIdx=React.useRef(0);
  function startBGM(){
    if(!soundRef.current)return;stopBGM();melIdx.current=0;
    function n(){const G=stateRef.current;if(!soundRef.current||!G||G.ST!=='playing')return;
      const mel=G.level===2?MEL2:MEL1;const note=mel[melIdx.current%mel.length];
      if(note[0]>0)beep(note[0],note[1]*.9,'square',.06);melIdx.current++;
      bgmRef.current=setTimeout(n,note[1]*1000*(G.level===2?.75:.9));}n();
  }
  function stopBGM(){if(bgmRef.current){clearTimeout(bgmRef.current);bgmRef.current=null;}}

  function getDims(){const cv=cvRef.current;if(!cv)return{CW:300,CH:174};return{CW:cv.width,CH:cv.height};}
  function gY(CH){const c=CH||getDims().CH;return Math.floor(c*.70);}
  function SH(CH){const c=CH||getDims().CH;return Math.floor(c*.24);}
  function SW(CH){const c=CH||getDims().CH;return Math.floor(c*.20);}
  function snap(v){return Math.floor(v/PX)*PX;}

  function newG(){
    const{CW,CH}=getDims();
    return{ST:'playing',score:0,speed:2.5,frame:0,blink:0,scrollX:0,lives:3,level:1,
      surfer:{x:Math.floor(CW*.16),y:gY(CH)-SH(CH),vy:0,onG:true,lean:0},
      waves:[],jellyfish:[],sharks:[],rings:[],boostRings:[],gulls:[],parts:[],floatTexts:[],
      combo:0,multiplier:1,shield:0,lightningFlash:0};
  }

  function addFloat(text,x,y,color,size,life){const G=stateRef.current;if(G)G.floatTexts.push({text,x,y,color,size:size||10,life:life||80,vy:-0.7});}
  function updateLivesHUD(){const G=stateRef.current;if(!G)return;setHudLives('\u2764\uFE0F'.repeat(Math.max(0,G.lives))+(G.lives<=0?'\uD83D\uDC80':'')); }

  function unlockAch(i,label){
    const cur=JSON.parse(localStorage.getItem('jjs_ach')||'[false,false,false,false,false]');
    if(cur[i])return;cur[i]=true;localStorage.setItem('jjs_ach',JSON.stringify(cur));setAchUnlocked([...cur]);
    const{CW,CH}=getDims();addFloat('\uD83C\uDFC6 '+label,CW/2,CH*.28,'#ff0',10,130);sndRecord();
  }

  function initGame(){
    if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;}
    lvlRef.current=0;stateRef.current=newG();updateLivesHUD();startBGM();gameLoop();
  }

  function doJump(){
    const G=stateRef.current;if(!G)return;
    if(G.ST==='intro'||G.ST==='over'){try{getAC().resume();}catch(e){}initGame();return;}
    if(lvlRef.current>0)return;
    if(G.ST==='playing'&&G.surfer.onG){
      const{CH}=getDims();G.surfer.vy=-(CH*.07);G.surfer.onG=false;sndJump();
      for(let i=0;i<12;i++)G.parts.push({x:G.surfer.x+SW()/2,y:gY(),vx:(Math.random()-.5)*6,vy:-Math.random()*5-1,life:1,c:['#0ff','#f0f','#fff'][i%3],big:false});
    }
  }

  function update(){
    const G=stateRef.current;if(!G||G.ST!=='playing')return;
    const{CW,CH}=getDims();
    if(lvlRef.current>0){lvlRef.current--;if(lvlRef.current===0)startBGM();return;}
    G.frame++;G.blink=(G.blink+1)%60;
    G.score+=G.speed*.055*G.multiplier;
    const tgt=G.level===2?Math.min(6,3.5+G.score*.004):Math.min(6,2.5+G.score*.006);
    G.speed+=(tgt-G.speed)*.02;
    G.scrollX+=G.speed;
    if(G.shield>0)G.shield--;
    if(G.level===1&&G.score>=500){
      G.level=2;G.waves=[];G.jellyfish=[];G.rings=[];G.gulls=[];
      lvlRef.current=180;stopBGM();sndLvl();return;
    }
    if(G.level===2){G.lightningFlash=Math.max(0,G.lightningFlash-1);if(Math.random()<.008){G.lightningFlash=8;sndLightning();}}
    // physics
    G.surfer.vy+=CH*.0045;G.surfer.y+=G.surfer.vy;
    G.surfer.lean=G.surfer.onG?0:Math.max(-.28,Math.min(.28,-G.surfer.vy*.014));
    const floor=gY(CH)-SH(CH);if(G.surfer.y>=floor){G.surfer.y=floor;G.surfer.vy=0;G.surfer.onG=true;G.surfer.lean=0;}
    // waves
    const lastW=G.waves[G.waves.length-1];const gapW=Math.max(CW*.26,CW*.54-G.speed*12);
    const wHMul=G.level===2?1.5:1;
    if(!lastW||lastW.x<CW-gapW){if(Math.random()<.028)G.waves.push({x:CW+20,w:snap(16+Math.random()*26),h:snap((10+Math.random()*22)*wHMul),passed:false,foam:Math.random()*Math.PI*2});}
    G.waves.forEach(w=>{w.x-=G.speed;w.foam+=.08;});G.waves=G.waves.filter(w=>w.x>-70);
    // jellyfish lvl1
    if(G.level===1&&Math.random()<.0045+G.score*.000015&&G.jellyfish.length<3){
      const jw=Math.floor(CW*.028+Math.random()*CW*.02);const jh=Math.floor(CH*.06+Math.random()*CH*.06);
      G.jellyfish.push({x:CW+40,y:gY(CH)-jh*.35,w:jw,h:jh,pulse:Math.random()*Math.PI*2,hue:Math.random()<.5?280:200,passed:false});
    }
    G.jellyfish.forEach(j=>{j.x-=G.speed*.82;j.pulse+=.055;});G.jellyfish=G.jellyfish.filter(j=>j.x>-100);
    // sharks lvl2
    if(G.level===2&&Math.random()<.007&&G.sharks.length<3)G.sharks.push({x:CW+20,vy:-(CH*.04),y:gY(CH),active:true});
    G.sharks.forEach(s=>{s.x-=G.speed*.9;s.y+=s.vy;s.vy+=CH*.003;if(s.y>gY(CH))s.y=gY(CH);});G.sharks=G.sharks.filter(s=>s.x>-60);
    // life rings lvl1
    if(G.level===1&&Math.random()<.007&&G.rings.length<2){const ry=gY(CH)-SH(CH)*1.3-Math.random()*SH(CH)*.9;G.rings.push({x:CW+20,y:ry,r:Math.floor(CH*.05),anim:0,collected:false});}
    // boost rings lvl2
    if(G.level===2&&Math.random()<.009&&G.boostRings.length<2){const ry=gY(CH)-SH(CH)*1.2-Math.random()*SH(CH)*.8;G.boostRings.push({x:CW+20,y:ry,r:Math.floor(CH*.045),anim:0,collected:false});}
    G.rings.forEach(r=>{r.x-=G.speed*.78;r.anim++;});G.rings=G.rings.filter(r=>r.x>-60&&!r.collected);
    G.boostRings.forEach(r=>{r.x-=G.speed*.78;r.anim++;});G.boostRings=G.boostRings.filter(r=>r.x>-60&&!r.collected);
    // seagulls lvl1
    if(G.level===1&&Math.random()<.005&&G.gulls.length<3)G.gulls.push({x:CW+20,y:gY(CH)-SH(CH)*.5-Math.random()*SH(CH)*.9,w:PX*6,wing:Math.random()*Math.PI*2});
    G.gulls.forEach(gl=>{gl.x-=G.speed*.6;gl.wing+=.18;});G.gulls=G.gulls.filter(gl=>gl.x>-40);
    // particles
    G.parts.forEach(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=.2;pt.life-=.04;});G.parts=G.parts.filter(pt=>pt.life>0);
    G.floatTexts.forEach(ft=>{ft.y+=ft.vy;ft.life--;});G.floatTexts=G.floatTexts.filter(ft=>ft.life>0);
    // collisions
    const sx=G.surfer.x+SW(CH)*.15,sy=G.surfer.y+SH(CH)*.12,sw2=SW(CH)*.72,sh2=SH(CH)*.82;
    for(const w of G.waves){
      if(!w.passed&&w.x+w.w<G.surfer.x){w.passed=true;G.combo++;if(G.combo>=3){G.multiplier=2;addFloat('COMBO x2!',G.surfer.x,G.surfer.y-20,'#ff0',8,80);}}
      if(sx<w.x+w.w&&sx+sw2>w.x&&sy+sh2>gY(CH)-w.h+2){hitSurfer();return;}
    }
    for(const j of G.jellyfish){
      const jLeft=j.x-j.w*.5,jRight=j.x+j.w*.5,jBellMid=j.y,jTentBot=j.y+j.h*.65;
      if(sx<jRight&&sx+sw2>jLeft&&sy+sh2>jBellMid&&sy<jTentBot){hitSurfer();return;}
    }
    for(const s of G.sharks){
      if(s.y<gY(CH)-PX*4){const shH=snap(SH(CH)*.6);if(sx<s.x+PX*6&&sx+sw2>s.x-PX*2&&sy+sh2>s.y-shH&&sy<s.y){hitSurfer();return;}}
    }
    for(let i=G.rings.length-1;i>=0;i--){
      const r=G.rings[i];const cx=G.surfer.x+SW(CH)/2,cy=G.surfer.y+SH(CH)/2;
      if(Math.abs(cx-r.x)<r.r+sw2*.4&&Math.abs(cy-r.y)<r.r+sh2*.4){
        G.rings[i].collected=true;
        if(G.lives<5){G.lives++;sndLife();addFloat('+1 LEVEN! \u2764\uFE0F',r.x,r.y-20,'#f55',10,110);updateLivesHUD();}
        else{G.score+=250;sndRing();addFloat('+250!',r.x,r.y-20,'#ff0',9,80);}
        for(let j=0;j<18;j++)G.parts.push({x:r.x,y:r.y,vx:Math.cos(j/18*Math.PI*2)*5,vy:Math.sin(j/18*Math.PI*2)*5,life:1.2,c:'#ff0',big:true});
      }
    }
    for(let i=G.boostRings.length-1;i>=0;i--){
      const r=G.boostRings[i];const cx=G.surfer.x+SW(CH)/2,cy=G.surfer.y+SH(CH)/2;
      if(Math.abs(cx-r.x)<r.r+sw2*.4&&Math.abs(cy-r.y)<r.r+sh2*.4){
        G.boostRings[i].collected=true;G.score+=150;G.multiplier=3;sndRing();
        addFloat('\uD83D\uDCA8 WIND BOOST! x3',r.x,r.y-20,'#0ff',8,120);
        setTimeout(()=>{if(G.multiplier===3)G.multiplier=1;},3000);
        for(let j=0;j<20;j++)G.parts.push({x:r.x,y:r.y,vx:Math.cos(j/20*Math.PI*2)*6,vy:Math.sin(j/20*Math.PI*2)*6,life:1.3,c:'#0ff',big:true});
      }
    }
    for(let i=G.gulls.length-1;i>=0;i--){
      const gl=G.gulls[i];
      if(sx<gl.x+gl.w&&sx+sw2>gl.x&&sy<gl.y+PX*3&&sy+sh2>gl.y){
        G.gulls.splice(i,1);G.score+=100;sndGull();unlockAch(2,'SQUID MASTER!');
        addFloat('JOHANSKI RULES!',CW/2,CH*.3,'#ff0',9,120);addFloat('+100!',G.surfer.x,G.surfer.y-20,'#f0f',9,80);
        for(let j=0;j<12;j++)G.parts.push({x:gl.x,y:gl.y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,life:1,c:'#fff',big:false});
      }
    }
    if(G.score>=100)unlockAch(0,'FIRST JUMP!');if(G.score>=400)unlockAch(1,'SURFER!');
    if(G.score>=800)unlockAch(3,'JOHANSKI!');if(G.level===2)unlockAch(4,'STORMFRONT!');
    setHudScore(String(Math.floor(G.score)).padStart(5,'0'));
    setHudWind(Math.round(G.speed+10)+' KN');
  }

  function hitSurfer(){
    const G=stateRef.current;if(!G||G.shield>0)return;
    const{CW,CH}=getDims();
    G.lives--;updateLivesHUD();
    const col=G.level===2?['#f80','#f0f','#ff0']:['#f0f','#0ff','#f55'];
    for(let i=0;i<24;i++)G.parts.push({x:G.surfer.x+SW(CH)/2,y:G.surfer.y+SH(CH)/2,vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,life:1.4,c:col[i%3],big:true});
    sndCrash();
    if(G.lives<=0){endGame();return;}
    G.surfer.y=gY(CH)-SH(CH);G.surfer.vy=0;G.surfer.onG=true;
    G.shield=150;G.waves=[];G.jellyfish=[];G.sharks=[];
    addFloat('OUCH!',CW/2,CH*.38,'#f55',11,90);G.combo=0;G.multiplier=1;
  }

  function endGame(){
    const G=stateRef.current;if(!G)return;G.ST='over';stopBGM();
    const f=Math.floor(G.score);
    setBest(prev=>{const nb=Math.max(prev,f);localStorage.setItem('jjs_best',String(nb));return nb;});
    setHudBest(String(Math.max(f,best)).padStart(5,'0'));
  }

  function gameLoop(){
    const G=stateRef.current;if(!G||G.ST!=='playing')return;
    update();drawFrame();rafRef.current=requestAnimationFrame(gameLoop);
  }

  // ── DRAWING ──
  function drawFrame(){
    const cv=cvRef.current;if(!cv)return;
    const ctx=cv.getContext('2d');const{CW,CH}=getDims();const G=stateRef.current;
    ctx.fillStyle='#000';ctx.fillRect(0,0,CW,CH);
    if(!G||G.ST==='intro'){drawIntro(ctx,CW,CH);return;}
    if(lvlRef.current>0){drawLvlTrans(ctx,CW,CH);return;}
    drawBg(ctx,CW,CH,G);
    if(G.level===2){drawClouds(ctx,CW,CH,G);drawLightning(ctx,CW,CH,G);}
    drawStars(ctx,CW,CH,G);drawMoon(ctx,CW,CH,G);drawWater(ctx,CW,CH,G);
    G.waves.forEach(w=>drawWave(ctx,CW,CH,G,w));
    G.rings.forEach(r=>drawRing(ctx,r));
    G.boostRings.forEach(r=>drawBoostRing(ctx,r));
    G.jellyfish.forEach(j=>drawJellyfish(ctx,j));
    G.sharks.forEach(s=>drawShark(ctx,CW,CH,G,s));
    G.gulls.forEach(gl=>drawGull(ctx,gl));
    G.parts.forEach(pt=>{ctx.globalAlpha=Math.max(0,pt.life);ctx.fillStyle=pt.c;ctx.shadowColor=pt.c;ctx.shadowBlur=8;const sz=pt.big?PX*2:PX;ctx.fillRect(snap(pt.x),snap(pt.y),sz,sz);});
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(!(G.shield>0&&G.frame%8<4))drawSurfer(ctx,CW,CH,G,G.surfer.x,G.surfer.y,!G.surfer.onG,G.shield>0,G.surfer.lean);
    G.floatTexts.forEach(ft=>{ctx.globalAlpha=Math.min(1,ft.life/22);ctx.fillStyle=ft.color;ctx.shadowColor=ft.color;ctx.shadowBlur=12;ctx.font=`${ft.size}px 'Press Start 2P',monospace`;ctx.textAlign='center';ctx.fillText(ft.text,ft.x,ft.y);});
    ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.textAlign='left';
    if(G.level===2){ctx.fillStyle='rgba(200,0,255,.8)';ctx.fillRect(4,4,PX*18,PX*5);ctx.fillStyle='#ff0';ctx.shadowColor='#ff0';ctx.shadowBlur=6;ctx.font=`${PX*3}px 'Press Start 2P',monospace`;ctx.fillText('LVL2',PX*2,PX*7);ctx.shadowBlur=0;}
    if(G.ST==='over')drawOver(ctx,CW,CH,G);
  }

  function drawBg(ctx,CW,CH,G){
    const gy=gY(CH);let grad;
    if(G.level===2){grad=ctx.createLinearGradient(0,0,0,gy);grad.addColorStop(0,'#080008');grad.addColorStop(.4,'#1a0020');grad.addColorStop(1,'#180008');}
    else{grad=ctx.createLinearGradient(0,0,0,gy);grad.addColorStop(0,'#000010');grad.addColorStop(.5,'#000828');grad.addColorStop(1,'#001040');}
    ctx.fillStyle=grad;ctx.fillRect(0,0,CW,gy);
    if(G.level===2&&G.lightningFlash>0){ctx.fillStyle=`rgba(200,180,255,${G.lightningFlash/8*.18})`;ctx.fillRect(0,0,CW,gy);}
  }
  function drawStars(ctx,CW,CH,G){
    const storm=G.level===2;
    STARS.current.forEach((s,i)=>{const alpha=.35+.65*Math.abs(Math.sin(s.tw+G.frame*s.sp));ctx.globalAlpha=alpha*(storm?.6:1);ctx.fillStyle=storm?'#f8a':s.c;if(alpha>.72){ctx.shadowColor=storm?'#f0f':s.c;ctx.shadowBlur=7;}ctx.fillRect(Math.floor(s.x*CW),Math.floor(s.y*gY(CH)),s.s,s.s);ctx.shadowBlur=0;});ctx.globalAlpha=1;
  }
  function drawMoon(ctx,CW,CH,G){
    const mx=CW-snap(CW*.1),my=snap(CH*.09),mr=snap(CW*.052);const col=G.level===2?'#a060a0':'#c8c8e0';
    const grd=ctx.createRadialGradient(mx,my,mr*.2,mx,my,mr*2.2);grd.addColorStop(0,G.level===2?'rgba(180,80,180,.12)':'rgba(160,160,255,.12)');grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(mx,my,mr*2.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=col;ctx.shadowColor=G.level===2?'#c0a':'#99a';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=G.level===2?'#120008':'#00081e';ctx.beginPath();ctx.arc(mx+mr*.35,my-mr*.2,mr*.76,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=G.level===2?'#906':'#aab';[[-.28,-.2,.1],[.12,.28,.07],[-.1,.08,.055]].forEach(([dx,dy,r])=>{ctx.beginPath();ctx.arc(mx+dx*mr,my+dy*mr,r*mr,0,Math.PI*2);ctx.fill();});
  }
  function drawClouds(ctx,CW,CH,G){
    const t=G.frame*.3;
    for(let i=0;i<4;i++){const cx2=((t*(.6+i*.15)+i*CW*.28)%(CW+100))-50;const cy2=CH*.05+i*CH*.04;const cr=CW*.08+i*CW*.02;ctx.fillStyle=`rgba(30,5,40,${.7+i*.05})`;ctx.shadowColor='#50005080';ctx.shadowBlur=20;ctx.beginPath();ctx.ellipse(cx2,cy2,cr,cr*.45,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx2-cr*.4,cy2+cr*.1,cr*.6,cr*.4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx2+cr*.4,cy2+cr*.1,cr*.55,cr*.35,0,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
  }
  function drawLightning(ctx,CW,CH,G){
    if(!G.lightningFlash)return;const alpha=G.lightningFlash/8;const lx=CW*.3+Math.random()*CW*.4;
    ctx.strokeStyle=`rgba(220,200,255,${alpha})`;ctx.shadowColor='#fff';ctx.shadowBlur=20;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,0);let cy2=0,cx2=lx;while(cy2<gY(CH)*.7){cy2+=20+Math.random()*30;cx2+=(Math.random()-.5)*40;ctx.lineTo(cx2,cy2);}ctx.stroke();ctx.shadowBlur=0;
  }
  function drawWater(ctx,CW,CH,G){
    const gy=gY(CH);const wgrad=ctx.createLinearGradient(0,gy,0,CH);
    if(G.level===2){wgrad.addColorStop(0,'#1a0030');wgrad.addColorStop(.3,'#2a0050');wgrad.addColorStop(1,'#080010');ctx.fillStyle=wgrad;ctx.fillRect(0,gy,CW,CH-gy);ctx.fillStyle='#f0f';ctx.shadowColor='#f0f';ctx.shadowBlur=14;ctx.fillRect(0,gy,CW,2);ctx.shadowBlur=0;for(let i=0;i<12;i++){const rx=((G.scrollX*1.1+i*55)%(CW+40))-20;ctx.fillStyle=i%2?'rgba(200,0,255,.2)':'rgba(120,0,200,.18)';ctx.fillRect(snap(rx),gy+5,snap(12+i*1.5),2);}}
    else{wgrad.addColorStop(0,'#001535');wgrad.addColorStop(.3,'#002068');wgrad.addColorStop(1,'#000818');ctx.fillStyle=wgrad;ctx.fillRect(0,gy,CW,CH-gy);ctx.fillStyle='#0ff';ctx.shadowColor='#0ff';ctx.shadowBlur=14;ctx.fillRect(0,gy,CW,2);ctx.shadowBlur=0;for(let i=0;i<12;i++){const rx=((G.scrollX*1.1+i*55)%(CW+40))-20;ctx.fillStyle=i%2?'rgba(0,255,255,.2)':'rgba(80,120,255,.18)';ctx.fillRect(snap(rx),gy+5,snap(12+i*1.5),2);}}
  }
  function drawWave(ctx,CW,CH,G,w){
    const gy=gY(CH);const topCol=G.level===2?'#80f':'#1af';const foamCol=G.level===2?'#f0f':'#0ff';
    for(let px=0;px<w.w;px+=PX){const prog=px/w.w,h=snap(Math.sin(prog*Math.PI)*w.h);if(h<=0)continue;const grd=ctx.createLinearGradient(0,gy-h,0,gy);grd.addColorStop(0,topCol);grd.addColorStop(1,'rgba(0,30,80,.4)');ctx.fillStyle=grd;ctx.fillRect(snap(w.x+px),gy-h,PX,h);ctx.fillStyle=foamCol;ctx.shadowColor=foamCol;ctx.shadowBlur=10;ctx.fillRect(snap(w.x+px),gy-h,PX,PX);if(Math.sin(prog*10+w.foam)>.4){ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(snap(w.x+px),gy-h-PX,PX,PX);}}ctx.shadowBlur=0;
  }
  function drawJellyfish(ctx,j){
    const x=j.x,y=j.y,jw=j.w,jh=j.h;const p2=Math.sin(j.pulse);const rw=jw*(1+p2*.09),rh=jh*(1-p2*.05);const hue=j.hue;
    const grd=ctx.createRadialGradient(x,y,rw*.05,x,y,rw*1.6);grd.addColorStop(0,`hsla(${hue},100%,65%,.25)`);grd.addColorStop(.6,`hsla(${hue},100%,50%,.1)`);grd.addColorStop(1,'transparent');ctx.fillStyle=grd;ctx.beginPath();ctx.ellipse(x,y,rw*1.6,rh,0,0,Math.PI*2);ctx.fill();
    ctx.shadowColor=`hsl(${hue},100%,60%)`;ctx.shadowBlur=22;const bell=ctx.createRadialGradient(x-rw*.2,y-rh*.2,rw*.04,x,y,rw*.9);bell.addColorStop(0,`hsla(${hue},50%,88%,.9)`);bell.addColorStop(.4,`hsla(${hue},80%,62%,.82)`);bell.addColorStop(1,`hsla(${hue},100%,32%,.6)`);ctx.fillStyle=bell;ctx.beginPath();ctx.ellipse(x,y-rh*.08,rw*.88,rh*.42,0,Math.PI,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    for(let i=1;i<4;i++){ctx.strokeStyle=`hsla(${hue},100%,80%,.25)`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y-rh*.08,rw*.88*(i/4),rh*.42*(i/4),0,Math.PI,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.ellipse(x-rw*.22,y-rh*.28,rw*.18,rh*.09,-.25,0,Math.PI*2);ctx.fill();
    ctx.shadowColor=`hsl(${hue},100%,65%)`;ctx.shadowBlur=10;const numT=8;
    for(let i=0;i<numT;i++){const tx=x+(i/(numT-1)-.5)*rw*1.7;const tlen=rh*(.65+Math.sin(j.pulse+i*.8)*.18);const wave=Math.sin(j.pulse*1.2+i)*rw*.14;ctx.strokeStyle=`hsla(${hue+i*8},100%,68%,.78)`;ctx.lineWidth=Math.max(1.5,PX*.55);ctx.beginPath();ctx.moveTo(tx,y+rh*.28);ctx.bezierCurveTo(tx+wave,y+rh*.28+tlen*.35,tx-wave*.8,y+rh*.28+tlen*.65,tx+wave*.5,y+rh*.28+tlen);ctx.stroke();}ctx.shadowBlur=0;
  }
  function drawShark(ctx,CW,CH,G,s){
    const x=snap(s.x),y=snap(s.y);if(s.y>=gY(CH)-PX*2)return;
    const h=snap(SH(CH)*.6);const w=snap(SW(CH)*.5);
    const grd=ctx.createLinearGradient(x,y-h,x,y);grd.addColorStop(0,'#5080a0');grd.addColorStop(1,'#203040');ctx.fillStyle=grd;ctx.shadowColor='#0af';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.quadraticCurveTo(x,y-h,x+w/2,y);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#406080';ctx.beginPath();ctx.moveTo(x,y-h*.4);ctx.lineTo(x+w*.3,y-h*.8);ctx.lineTo(x+w*.2,y-h*.35);ctx.fill();
    ctx.fillStyle='#f00';ctx.shadowColor='#f00';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(x+w*.15,y-h*.5,PX,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#fff';for(let i=0;i<4;i++)ctx.fillRect(x-w*.3+i*PX*2,y-PX,PX,PX*2);
  }
  function drawRing(ctx,r){
    const glow=.5+.5*Math.sin(r.anim*.11);ctx.shadowColor='#ff8c00';ctx.shadowBlur=20+glow*20;ctx.strokeStyle=`rgba(255,${140+Math.floor(glow*80)},0,${.65+glow*.35})`;ctx.lineWidth=PX*1.8;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=8;ctx.strokeStyle=`rgba(255,230,100,${.3+glow*.4})`;ctx.lineWidth=PX*.6;ctx.beginPath();ctx.arc(r.x,r.y,r.r*.65,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;for(let i=0;i<8;i++){const ang=r.anim*.09+i/8*Math.PI*2;ctx.fillStyle=`rgba(255,220,50,${.4+glow*.6})`;ctx.beginPath();ctx.arc(r.x+Math.cos(ang)*(r.r+PX*2.5),r.y+Math.sin(ang)*(r.r+PX*2.5),PX*.6,0,Math.PI*2);ctx.fill();}ctx.font=`${Math.floor(r.r*1.1)}px serif`;ctx.textAlign='center';ctx.fillText('\u2764\uFE0F',r.x,r.y+r.r*.38);ctx.textAlign='left';
  }
  function drawBoostRing(ctx,r){
    const glow=.5+.5*Math.sin(r.anim*.13);ctx.shadowColor='#0ff';ctx.shadowBlur=20+glow*22;ctx.strokeStyle=`rgba(0,${200+Math.floor(glow*55)},255,${.7+glow*.3})`;ctx.lineWidth=PX*1.8;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=8;ctx.strokeStyle=`rgba(100,255,255,${.3+glow*.4})`;ctx.lineWidth=PX*.6;ctx.beginPath();ctx.arc(r.x,r.y,r.r*.65,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;for(let i=0;i<10;i++){const ang=r.anim*.12+i/10*Math.PI*2;ctx.fillStyle=`rgba(0,255,255,${.4+glow*.6})`;ctx.beginPath();ctx.arc(r.x+Math.cos(ang)*(r.r+PX*2.5),r.y+Math.sin(ang)*(r.r+PX*2.5),PX*.6,0,Math.PI*2);ctx.fill();}ctx.font=`${Math.floor(r.r*1.1)}px serif`;ctx.textAlign='center';ctx.fillText('\uD83D\uDCA8',r.x,r.y+r.r*.38);ctx.textAlign='left';
  }
  function drawGull(ctx,gl){
    const x=snap(gl.x),y=snap(gl.y);const wUp=Math.sin(gl.wing)>0;ctx.fillStyle='#cce';ctx.shadowColor='#aaf';ctx.shadowBlur=5;ctx.fillRect(x+PX*2,y+PX,PX*2,PX);if(wUp){ctx.fillRect(x,y,PX*2,PX);ctx.fillRect(x+PX*4,y,PX*2,PX);}else{ctx.fillRect(x,y+PX*2,PX*2,PX);ctx.fillRect(x+PX*4,y+PX*2,PX*2,PX);}ctx.shadowBlur=0;
  }
  function drawSurfer(ctx,CW,CH,G,x,y,air,shieldOn,lean){
    const W=SW(CH),H=SH(CH);const u=PX;
    if(shieldOn&&G.frame%8<4){ctx.strokeStyle='#0ff';ctx.shadowColor='#0ff';ctx.shadowBlur=20;ctx.lineWidth=u*1.5;ctx.beginPath();ctx.ellipse(x+W/2,y+H/2,W*.7,H*.58,lean,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}
    ctx.save();ctx.translate(x+W/2,y+H/2);ctx.rotate(lean);const ox=-W/2,oy=-H/2;
    // board
    const bh=u*2;const by2=oy+H-bh;const bgrad=ctx.createLinearGradient(0,by2,0,oy+H);bgrad.addColorStop(0,'#0e0');bgrad.addColorStop(.5,'#0a0');bgrad.addColorStop(1,'#060');ctx.fillStyle=bgrad;ctx.shadowColor='#0f0';ctx.shadowBlur=10;ctx.fillRect(ox,by2,W,bh);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(ox+u,by2,W-u*2,u);ctx.fillStyle='#050';ctx.fillRect(ox+W-u*3,oy+H,u*2,u*2);ctx.fillStyle='#fff';ctx.globalAlpha=.2;ctx.fillRect(ox+u*2,by2,u,bh);ctx.globalAlpha=1;
    // mast
    const mastX=ox+Math.floor(W*.44/u)*u;ctx.fillStyle='#bbb';ctx.shadowColor='#fff';ctx.shadowBlur=4;for(let my2=oy+u*3;my2<by2-u;my2+=u)ctx.fillRect(mastX,my2,u,u);ctx.shadowBlur=0;
    // boom
    const boomY=oy+H*.54;ctx.fillStyle='#777';ctx.fillRect(mastX,boomY,W*.42,u);
    // SAIL: smal boven, breed bij boom
    const sailTop=oy+u*3;const sailH=boomY-sailTop;const sailRowsN=Math.floor(sailH/u);
    for(let r=0;r<sailRowsN;r++){const prog=r/sailRowsN;const sw3=Math.floor(prog*(W*.55)/u)*u;const hue=prog*40;ctx.fillStyle=`hsl(${hue},100%,52%)`;if(r>=sailRowsN-2){ctx.shadowColor='#f40';ctx.shadowBlur=8;}ctx.fillRect(mastX+u,sailTop+r*u,sw3,u);}ctx.shadowBlur=0;
    // sun logo
    ctx.fillStyle='rgba(255,230,50,.65)';ctx.shadowColor='#ff0';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(mastX+W*.2,oy+H*.28,u*2.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,200,0,.5)';ctx.lineWidth=1;for(let i=0;i<8;i++){const ang=i/8*Math.PI*2;ctx.beginPath();ctx.moveTo(mastX+W*.2+Math.cos(ang)*u*2.7,oy+H*.28+Math.sin(ang)*u*2.7);ctx.lineTo(mastX+W*.2+Math.cos(ang)*u*3.8,oy+H*.28+Math.sin(ang)*u*3.8);ctx.stroke();}
    // person
    const px3=mastX-u*4;ctx.strokeStyle='#ff0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px3+u*2,by2-u*5);ctx.lineTo(mastX+u*2,by2-u*2);ctx.stroke();ctx.fillStyle='#2a5090';ctx.fillRect(px3,by2-u*3,u*2,u*3);ctx.fillRect(px3+u*2,by2-u*2,u*2,u*2);ctx.fillStyle='#111';ctx.fillRect(px3-u,by2-u,u*2,u);ctx.fillRect(px3+u*2,by2-u,u*2,u);const wgrd=ctx.createLinearGradient(px3,by2-u*8,px3,by2-u*3);wgrd.addColorStop(0,'#3590b0');wgrd.addColorStop(1,'#1a5070');ctx.fillStyle=wgrd;ctx.fillRect(px3,by2-u*8,u*3,u*5);ctx.fillStyle='rgba(0,255,200,.3)';ctx.fillRect(px3+u,by2-u*8,u,u*5);ctx.fillStyle='#3590b0';ctx.fillRect(px3-u,by2-u*8,u,u*2);ctx.fillRect(px3+u*3,by2-u*7,u*3,u);ctx.fillStyle='#e88';ctx.fillRect(px3-u,by2-u*7,u,u);ctx.fillRect(px3+u*5,by2-u*7,u,u);ctx.fillStyle='#d87';ctx.shadowColor='#c76';ctx.shadowBlur=4;ctx.fillRect(px3,by2-u*11,u*3,u*3);ctx.shadowBlur=0;ctx.fillStyle='#853';ctx.fillRect(px3,by2-u*11,u*3,u);ctx.fillRect(px3-u,by2-u*10,u,u*2);ctx.fillStyle='#001';ctx.fillRect(px3,by2-u*9,u,u);ctx.fillRect(px3+u*2,by2-u*9,u,u);ctx.strokeStyle='#333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px3+u,by2-u*9+u/2);ctx.lineTo(px3+u*2,by2-u*9+u/2);ctx.stroke();ctx.restore();
    // spray
    if(G&&G.surfer&&G.surfer.onG&&G.speed>4){const sc=G.level===2?'rgba(200,0,255,.5)':'rgba(0,220,255,.55)';ctx.fillStyle=sc;ctx.shadowColor=G.level===2?'#f0f':'#0ff';ctx.shadowBlur=5;for(let i=0;i<4;i++){const sp=((G.frame*2.5+i*18)%45);ctx.fillRect(snap(x+W*.85+sp*.6),snap(gY(CH)-PX*2-i*PX),PX,PX);}ctx.shadowBlur=0;}
  }
  function drawLvlTrans(ctx,CW,CH){
    ctx.fillStyle='rgba(0,0,0,.85)';ctx.fillRect(0,0,CW,CH);if(lvlRef.current%20<5){ctx.fillStyle='rgba(180,100,255,.08)';ctx.fillRect(0,0,CW,CH);}
    ctx.textAlign='center';const s1=Math.max(10,Math.floor(CW/22));
    ctx.fillStyle='#f80';ctx.shadowColor='#f80';ctx.shadowBlur=28;ctx.font=`${s1}px 'Press Start 2P',monospace`;ctx.fillText('LEVEL 2',CW/2,CH*.32);ctx.shadowBlur=0;
    ctx.fillStyle='#f0f';ctx.shadowColor='#f0f';ctx.shadowBlur=18;ctx.font=`${Math.floor(s1*.7)}px 'Press Start 2P',monospace`;ctx.fillText('STORMFRONT!',CW/2,CH*.48);ctx.shadowBlur=0;
    ctx.fillStyle='#ff0';ctx.font=`${Math.floor(s1*.45)}px 'Press Start 2P',monospace`;ctx.fillText('HAAIEN + BLIKSEM!',CW/2,CH*.63);
    ctx.fillStyle='#0ff';ctx.font=`${Math.floor(s1*.38)}px 'Press Start 2P',monospace`;ctx.fillText('WIND RINGS = x3',CW/2,CH*.76);
    ctx.strokeStyle='#f0f';ctx.shadowColor='#f0f';ctx.shadowBlur=16;ctx.lineWidth=PX;ctx.strokeRect(PX,PX,CW-PX*2,CH-PX*2);ctx.shadowBlur=0;ctx.textAlign='left';
  }
  function drawIntro(ctx,CW,CH){
    const G=stateRef.current||{frame:0,blink:0,iAnim:0,level:1,speed:5,scrollX:0,shield:0,lightningFlash:0,surfer:{onG:false},floatTexts:[]};
    const iA=G.iAnim||0;
    drawBg(ctx,CW,CH,G);drawStars(ctx,CW,CH,G);drawMoon(ctx,CW,CH,G);
    const bc=['#f0f','#0ff','#ff0','#0f0'][Math.floor(iA/22)%4];ctx.strokeStyle=bc;ctx.shadowColor=bc;ctx.shadowBlur=18;ctx.lineWidth=PX;ctx.strokeRect(PX,PX,CW-PX*2,CH-PX*2);ctx.shadowBlur=0;
    ctx.textAlign='center';const ts=Math.max(10,Math.floor(CW/22));
    [['JOHANSKI','#ff0',CH*.19],['JUMP','#0ff',CH*.19+ts*1.9],['SESSIE','#f0f',CH*.19+ts*3.8]].forEach(([t,c,yy])=>{ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=20;ctx.font=`${ts}px 'Press Start 2P',monospace`;ctx.fillText(t,CW/2,yy);});ctx.shadowBlur=0;
    const bx=CW/2-SW(CH)/2,by=CH*.57+Math.sin(iA*.07)*PX*3;
    drawSurfer(ctx,CW,CH,{level:1,frame:iA,speed:5,surfer:{onG:false},shield:0,lightningFlash:0},bx,by,Math.sin(iA*.07)<0,false,Math.sin(iA*.07)*-.16);
    if(G.blink<34){ctx.fillStyle='#0f0';ctx.shadowColor='#0f0';ctx.shadowBlur=14;ctx.font=`${Math.max(6,Math.floor(CW/36))}px 'Press Start 2P',monospace`;ctx.fillText('>> PRESS START <<',CW/2,CH*.87);ctx.shadowBlur=0;}
    ctx.fillStyle='#f0f';ctx.shadowColor='#f0f';ctx.shadowBlur=8;ctx.font=`${Math.max(5,Math.floor(CW/44))}px 'Press Start 2P',monospace`;ctx.fillText('HI-SCORE  '+String(best).padStart(5,'0'),CW/2,CH*.96);ctx.shadowBlur=0;ctx.textAlign='left';
    const fW={level:1,scrollX:iA*3,frame:iA,lightningFlash:0};drawWater(ctx,CW,CH,fW);
  }
  function drawOver(ctx,CW,CH,G){
    ctx.fillStyle='rgba(0,0,20,.85)';ctx.fillRect(0,0,CW,CH);ctx.textAlign='center';const s1=Math.max(10,Math.floor(CW/28));
    ctx.fillStyle='#f44';ctx.shadowColor='#f44';ctx.shadowBlur=22;ctx.font=`${s1}px 'Press Start 2P',monospace`;ctx.fillText('GAME OVER',CW/2,CH*.28);ctx.shadowBlur=0;
    ctx.fillStyle='#ff0';ctx.shadowColor='#ff0';ctx.shadowBlur=16;ctx.font=`${Math.floor(s1*1.3)}px 'Press Start 2P',monospace`;ctx.fillText(String(Math.floor(G.score)).padStart(5,'0'),CW/2,CH*.46);ctx.shadowBlur=0;
    if(Math.floor(G.score)>=best&&G.score>0){ctx.fillStyle='#0f0';ctx.shadowColor='#0f0';ctx.shadowBlur=14;ctx.font=`${Math.max(6,Math.floor(CW/38))}px 'Press Start 2P',monospace`;ctx.fillText('\u2605 NEW RECORD! \u2605',CW/2,CH*.61);ctx.shadowBlur=0;}
    ctx.fillStyle='#0ff';ctx.shadowColor='#0ff';ctx.shadowBlur=8;ctx.font=`${Math.max(6,Math.floor(CW/42))}px 'Press Start 2P',monospace`;ctx.fillText('TAP TO PLAY AGAIN',CW/2,CH*.82);ctx.shadowBlur=0;ctx.textAlign='left';
  }

  React.useEffect(()=>{
    const cv=cvRef.current;if(!cv)return;const wrapper=cv.parentElement;
    const setSize=()=>{const inFS=!!(document.fullscreenElement||document.webkitFullscreenElement);setIsFS(inFS);if(inFS){cv.width=Math.floor(window.innerWidth/PX)*PX;cv.height=Math.floor(window.innerHeight/PX)*PX;}else{const mw=Math.min(wrapper.offsetWidth,420);cv.width=Math.floor(mw/PX)*PX;cv.height=Math.floor(cv.width*.58/PX)*PX;}};
    setSize();setHudBest(String(best).padStart(5,'0'));
    // intro state
    stateRef.current={ST:'intro',frame:0,blink:0,iAnim:0,level:1,speed:5,scrollX:0,lightningFlash:0,shield:0,surfer:{onG:false},floatTexts:[]};
    function introTick(){const G=stateRef.current;G.frame++;G.blink=(G.blink+1)%60;G.iAnim=(G.iAnim||0)+1;G.scrollX+=3;const{CW,CH}=getDims();drawFrame();if(G.ST==='intro')rafRef.current=requestAnimationFrame(introTick);}
    rafRef.current=requestAnimationFrame(introTick);
    const handleInput=()=>{const G=stateRef.current;if(!G)return;if(G.ST==='intro'){if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;}try{getAC().resume();}catch(e){}initGame();}else if(G.ST==='over')initGame();else doJump();};
    const handleKey=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();handleInput();}};
    const onFS=()=>setSize();
    cv.addEventListener('click',handleInput);cv.addEventListener('touchstart',e=>{e.preventDefault();handleInput();},{passive:false});
    window.addEventListener('keydown',handleKey);window.addEventListener('resize',setSize);
    document.addEventListener('fullscreenchange',onFS);document.addEventListener('webkitfullscreenchange',onFS);
    return()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);stopBGM();if(stateRef.current)stateRef.current.ST='intro';cv.removeEventListener('click',handleInput);window.removeEventListener('keydown',handleKey);window.removeEventListener('resize',setSize);document.removeEventListener('fullscreenchange',onFS);document.removeEventListener('webkitfullscreenchange',onFS);};
  },[]);

  function enterFS(){const el=fsRef.current;if(!el)return;if(el.requestFullscreen)el.requestFullscreen();else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}
  function exitFS(){if(document.exitFullscreen)document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();}

  const achLabels=['\uD83E\uDD49 FIRST','\uD83E\uDD48 SURFER','\uD83E\uDDF1 SQUID','\uD83E\uDD47 JOHANSKI','\u26A1 STORM'];
  return(<div style={{fontFamily:"'Press Start 2P',monospace",background:'#000',minHeight:'calc(100vh - 120px)',padding:'8px',display:'flex',flexDirection:'column',alignItems:'center'}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
    <div style={{width:'100%',maxWidth:420}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 2px',marginBottom:4,background:'rgba(0,0,20,0.9)',borderBottom:'1px solid rgba(0,255,255,0.25)'}}>
        <div><div style={{fontSize:9,color:'#0ff',textShadow:'0 0 8px #0ff'}}>{hudScore}</div><div style={{fontSize:5,color:'rgba(0,255,255,0.5)',marginTop:2,letterSpacing:1}}>SCORE</div></div>
        <div style={{textAlign:'center'}}><div style={{fontSize:9,color:'#f55',textShadow:'0 0 8px #f55'}}>{hudLives}</div><div style={{fontSize:5,color:'rgba(255,85,85,0.5)',marginTop:2,letterSpacing:1}}>LIVES</div></div>
        <div style={{textAlign:'center'}}><div style={{fontSize:8,color:'#ff0',textShadow:'0 0 8px #ff0'}}>{hudWind}</div><div style={{fontSize:5,color:'rgba(255,255,0,0.5)',marginTop:2,letterSpacing:1}}>WIND</div></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:9,color:'#f0f',textShadow:'0 0 8px #f0f'}}>{hudBest}</div><div style={{fontSize:5,color:'rgba(255,0,255,0.5)',marginTop:2,letterSpacing:1}}>BEST</div></div>
      </div>
      <div ref={fsRef} style={{position:'relative'}}>
        <canvas ref={cvRef} style={{display:'block',width:'100%',imageRendering:'pixelated',cursor:'pointer'}}/>
        <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 4px)',zIndex:10}}/>
        <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,30,0.75) 100%)',zIndex:11}}/>
        <button onClick={isFS?exitFS:enterFS} style={{position:'absolute',top:6,right:6,zIndex:20,background:'rgba(0,0,20,0.9)',border:'1px solid rgba(0,255,255,0.5)',color:'#0ff',fontFamily:"'Press Start 2P',monospace",fontSize:6,padding:'4px 6px',cursor:'pointer'}}>{isFS?'\u2715 EXIT':'\u26F6 FULL'}</button>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 2px',background:'rgba(0,0,20,0.9)',borderTop:'1px solid rgba(0,255,255,0.25)'}}>
        <button onClick={()=>{const ns=!soundRef.current;soundRef.current=ns;setSoundOn(ns);if(!ns)stopBGM();else if(stateRef.current&&stateRef.current.ST==='playing')startBGM();}} style={{background:'none',border:'1px solid rgba(255,255,0,0.5)',color:'#ff0',fontFamily:"'Press Start 2P',monospace",fontSize:6,padding:'4px 6px',cursor:'pointer'}}>{soundOn?'\uD83D\uDD0A ON':'\uD83D\uDD07 OFF'}</button>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{achLabels.map((l,i)=>(<div key={i} style={{fontSize:5,color:achUnlocked[i]?'#ff0':'#333',padding:'3px 4px',border:`1px solid ${achUnlocked[i]?'rgba(255,255,0,0.5)':'#222'}`,borderRadius:2,textShadow:achUnlocked[i]?'0 0 6px #ff0':'none'}}>{l}</div>))}</div>
      </div>
    </div>
  </div>);
}


// ── VEERSE MEER VERKENNER ──
function VeerseMeerVerkenner(){
  const containerRef=React.useRef(null);
  React.useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const iframe=document.createElement('iframe');
    iframe.style.cssText='width:100%;height:calc(100dvh - 190px);min-height:420px;border:none;display:block;';
    iframe.title='Kaart Veerse Meer';
    iframe.srcdoc=`<!DOCTYPE html><html lang='nl'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'><link rel='preconnect' href='https://fonts.googleapis.com'><link href='https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&display=swap' rel='stylesheet'><link rel='stylesheet' href='vendor/leaflet/leaflet.css'/><script src='vendor/leaflet/leaflet.js'><\/script><style>
  :root {
    --water-glow: #38d4f5;
    --water-light: #1a8fc1;
    --accent: #ff7043;
    --wind-color: #7dff9e;
    --panel-bg: rgba(4, 16, 30, 0.93);
    --text: #e0f4ff;
    --text-dim: #7ab8d4;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Montserrat',sans-serif;
    background:#03101d;
    color:var(--text);
    height:100vh; overflow:hidden;
    display:flex; flex-direction:column;
  }

  header {
    position:relative; z-index:1000;
    background:linear-gradient(135deg,rgba(3,14,28,0.98),rgba(7,32,58,0.98));
    border-bottom:1px solid rgba(56,212,245,0.18);
    padding:8px 16px;
    display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
  }
  .logo-group { display:flex; align-items:center; gap:10px; }
  .boat-icon { font-size:24px; animation:bobbing 3s ease-in-out infinite; display:inline-block; }
  @keyframes bobbing {
    0%,100%{transform:translateY(0) rotate(-2deg);}
    50%{transform:translateY(-4px) rotate(2deg);}
  }
  .title-block h1 {
    font-family:'Playfair Display',serif; font-size:1.2rem;
    font-weight:400; color:var(--water-glow); letter-spacing:0.5px;
  }
  .title-block span {
    font-size:0.58rem; font-weight:300; color:var(--text-dim);
    letter-spacing:3px; text-transform:uppercase; display:block; margin-top:1px;
  }
  .layer-controls { display:flex; gap:5px; }
  .layer-btn {
    background:rgba(255,255,255,0.05); border:1px solid rgba(56,212,245,0.18);
    color:var(--text-dim); padding:5px 11px; border-radius:20px;
    font-family:'Montserrat',sans-serif; font-size:0.62rem; font-weight:600;
    letter-spacing:0.8px; text-transform:uppercase; cursor:pointer; transition:all 0.2s;
  }
  .layer-btn:hover,.layer-btn.active {
    background:rgba(56,212,245,0.13); border-color:var(--water-glow); color:var(--water-glow);
  }

  #map { flex:1; width:100%; position:relative; }

  /* ---- WIND PANEL ---- */
  .wind-panel {
    position:absolute; top:14px; right:14px; z-index:900;
    background:var(--panel-bg);
    border:1px solid rgba(125,255,158,0.28);
    border-radius:16px; padding:14px 16px; width:220px; max-width:calc(100vw - 28px);
    backdrop-filter:blur(18px);
    box-shadow:0 8px 32px rgba(0,0,0,0.55), 0 0 24px rgba(125,255,158,0.05);
  }
  .wind-header {
    font-size:0.56rem; font-weight:700; letter-spacing:2.5px;
    text-transform:uppercase; color:var(--wind-color);
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:10px;
  }
  .live-dot {
    width:6px; height:6px; background:var(--wind-color);
    border-radius:50%; animation:blink 2s ease-in-out infinite;
  }
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}

  .wind-speed-row { display:flex; align-items:flex-end; gap:7px; margin-bottom:8px; }
  .wind-big { font-size:2.8rem; font-weight:800; color:#fff; line-height:1; font-variant-numeric:tabular-nums; }
  .wind-meta { display:flex; flex-direction:column; gap:2px; padding-bottom:5px; }
  .wind-unit { font-size:0.63rem; color:var(--text-dim); font-weight:600; }
  .wind-bft { font-size:0.85rem; color:var(--wind-color); font-weight:800; }

  .wind-dir-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .wind-arrow {
    width:34px; height:34px;
    background:rgba(125,255,158,0.07); border:1px solid rgba(125,255,158,0.22);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:18px; transition:transform 1s ease;
  }
  .wind-dir-info { }
  .wind-dir-name { font-size:0.9rem; font-weight:700; color:var(--text); }
  .wind-dir-deg { font-size:0.6rem; color:var(--text-dim); display:block; margin-top:1px; }

  .wind-stats { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
  .ws-item { }
  .ws-label { font-size:0.53rem; letter-spacing:1.2px; text-transform:uppercase; color:var(--text-dim); display:block; }
  .ws-val { font-size:0.8rem; font-weight:700; color:var(--text); }

  .wind-quality-badge {
    display:inline-block; margin-top:10px;
    padding:3px 10px; border-radius:10px;
    font-size:0.6rem; font-weight:700; letter-spacing:1px; text-transform:uppercase;
  }
  .wq-calm   { background:rgba(56,212,245,0.1); color:#38d4f5; border:1px solid rgba(56,212,245,0.3); }
  .wq-light  { background:rgba(125,255,158,0.1); color:#7dff9e; border:1px solid rgba(125,255,158,0.3); }
  .wq-good   { background:rgba(100,220,120,0.18); color:#5dfc85; border:1px solid rgba(100,220,120,0.5); }
  .wq-strong { background:rgba(255,200,67,0.13); color:#ffc843; border:1px solid rgba(255,200,67,0.4); }
  .wq-storm  { background:rgba(255,67,67,0.13); color:#ff5050; border:1px solid rgba(255,67,67,0.4); }

  .forecast-section { margin-top:10px; border-top:1px solid rgba(56,212,245,0.1); padding-top:10px; }
  .fc-title { font-size:0.52rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-dim); margin-bottom:6px; }
  .fc-row { display:flex; align-items:center; gap:5px; margin-bottom:3px; }
  .fc-hour { font-size:0.57rem; color:var(--text-dim); font-weight:600; width:24px; }
  .fc-bar-bg { flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; }
  .fc-bar-fill { height:100%; background:linear-gradient(90deg,#38d4f5,#7dff9e); border-radius:2px; }
  .fc-speed { font-size:0.62rem; color:#fff; font-weight:700; width:54px; text-align:right; white-space:nowrap; }
  .fc-dir { font-size:0.58rem; color:var(--text-dim); width:22px; }

  /* ---- COMPASS ---- */
  .compass {
    position:absolute; top:14px; right:14px; z-index:900;
    width:60px; height:60px;
    background:var(--panel-bg); border:1px solid rgba(56,212,245,0.22);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 18px rgba(0,0,0,0.5); pointer-events:none;
  }
  .ci { display:flex; flex-direction:column; align-items:center; line-height:1; }
  .ci .cn { color:var(--accent); font-size:9px; font-weight:800; }
  .ci .ca { font-size:19px; color:var(--water-glow); }
  .ci .cs { color:var(--text-dim); font-size:9px; font-weight:600; }

  /* ---- MODE BUTTONS ---- */
  .mode-toggle {
    position:absolute; bottom:95px; left:14px; z-index:900;
    display:flex; flex-direction:column; gap:6px;
  }
  .mode-btn {
    background:var(--panel-bg); border:1px solid rgba(56,212,245,0.22);
    color:var(--text-dim); padding:7px 12px; border-radius:10px;
    font-family:'Montserrat',sans-serif; font-size:0.63rem; font-weight:600;
    cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:5px;
    backdrop-filter:blur(12px); white-space:nowrap;
  }
  .mode-btn:hover { border-color:var(--water-glow); color:var(--water-glow); }
  .mode-btn.active { background:rgba(56,212,245,0.11); border-color:var(--water-glow); color:var(--water-glow); }

  /* ---- INFO BAR ---- */
  .info-bar {
    position:absolute; bottom:18px; left:50%; transform:translateX(-50%);
    z-index:900;
    background:var(--panel-bg); border:1px solid rgba(56,212,245,0.2);
    border-radius:13px; padding:9px 20px;
    display:flex; gap:20px; align-items:center;
    backdrop-filter:blur(16px); box-shadow:0 8px 32px rgba(0,0,0,0.5);
    justify-content:center; max-width:calc(100vw - 20px);
  }
  .wind-header{cursor:pointer;user-select:none}
  .wind-panel.collapsed #windBody{display:none}
  .wind-panel.collapsed{width:auto;padding:9px 12px}
  .wind-toggle{margin-left:auto;font-size:0.8rem;color:var(--text-dim)}
  @media (max-width:600px){
    .wind-panel{top:84px;bottom:auto;right:8px;width:200px;padding:10px 12px}
    .info-bar{gap:10px;padding:7px 10px;bottom:8px}
    .info-bar .stat-val,.info-bar .sv{white-space:nowrap}
    .info-bar .stat.opt,.info-bar .sdiv.opt{display:none}
    .sv{font-size:0.72rem}
    .leaflet-control-zoom{margin-bottom:14px !important}
  }
  .stat { text-align:center; }
  .sl { font-size:0.53rem; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim); display:block; }
  .sv { font-size:0.82rem; font-weight:700; color:var(--water-glow); font-variant-numeric:tabular-nums; margin-top:2px; }
  .sdiv { width:1px; height:22px; background:rgba(56,212,245,0.14); }

  /* ---- LEAFLET OVERRIDES ---- */
  .leaflet-control-zoom { border:none !important; margin-right:14px !important; margin-bottom:105px !important; }
  .leaflet-control-zoom a {
    background:var(--panel-bg) !important; color:var(--water-glow) !important;
    border:1px solid rgba(56,212,245,0.22) !important;
    width:29px !important; height:29px !important; line-height:27px !important; font-size:15px !important;
    backdrop-filter:blur(12px);
  }
  .leaflet-control-zoom a:hover { background:rgba(56,212,245,0.1) !important; }
  .leaflet-control-attribution {
    background:rgba(3,14,28,0.75) !important; color:var(--text-dim) !important;
    font-family:'Montserrat',sans-serif !important; font-size:8px !important;
  }
  .leaflet-control-attribution a { color:var(--water-light) !important; }
  .leaflet-tooltip {
    font-family:'Montserrat',sans-serif !important; font-size:11px !important;
    background:rgba(3,14,28,0.93) !important; border:1px solid rgba(56,212,245,0.38) !important;
    color:#e0f4ff !important; border-radius:8px !important; padding:5px 10px !important;
  }
  .leaflet-tooltip::before { border-top-color:rgba(56,212,245,0.38) !important; }

  .boat-marker {
    font-size:22px; text-align:center; line-height:28px;
    filter:drop-shadow(0 0 8px rgba(56,212,245,0.9));
    transition:transform 0.4s;
  }

  /* Loading spinner */
  .spin { display:inline-block; animation:spin 1s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg);} }
<\/style></head><body><header>
  <div class="logo-group">
    <div class="boat-icon">⛵</div>
    <div class="title-block">
      <h1>Veerse Meer Verkenner</h1>
      <span>Veerse Meer · Zeeland · Windmodel</span>
    </div>
  </div>
  <div class="layer-controls">
    <button class="layer-btn" onclick="setLayer('osm',this)">🗺 Kaart</button>
    <button class="layer-btn active" onclick="setLayer('satellite',this)">🛰 Satelliet</button>
    <button class="layer-btn" onclick="setLayer('topo',this)">⛰ Topo</button>
    <button class="layer-btn" onclick="setLayer('nautical',this)">⚓ Nautisch</button>
  </div>
</header>

<div id="map">
  <div class="compass">
    <div class="ci">
      <span class="cn">N</span>
      <span class="ca">⬆</span>
      <span class="cs">Z</span>
    </div>
  </div>

  <!-- WIND PANEL -->
  <div class="wind-panel" id="windPanel">
    <div class="wind-header" onclick="document.getElementById('windPanel').classList.toggle('collapsed')">
      💨 Wind (model) · Veerse Meer
      <span class="wind-toggle">▾</span>
    </div>
    <div id="windBody">
      <div style="font-size:0.72rem;color:var(--text-dim);display:flex;align-items:center;gap:7px;">
        <span class="spin">⟳</span> Winddata laden…
      </div>
    </div>
  </div>

  <div class="mode-toggle">
    <button class="mode-btn active" id="btn-explore" onclick="setMode('explore')">🧭 Verkennen</button>
    <button class="mode-btn" id="btn-route" onclick="setMode('route')">📍 Route plannen</button>
    <button class="mode-btn" id="btn-clear" onclick="clearRoute()">🗑 Wis route</button>
  </div>
</div>

<div class="info-bar">
  <div class="stat"><span class="sl">Locatie</span><span class="sv" id="iLoc">Wolphaartsdijk</span></div>
  <div class="sdiv opt"></div>
  <div class="stat opt"><span class="sl">Positie</span><span class="sv" id="iPos">51.5283°N, 3.7250°E</span></div>
  <div class="sdiv opt"></div>
  <div class="stat opt"><span class="sl">Zoom</span><span class="sv" id="iZoom">13</span></div>
  <div class="sdiv"></div>
  <div class="stat"><span class="sl">Wind · model</span><span class="sv" id="iWind">— kn</span></div>
</div><script>
// === WOLPHAARTSDIJK START ===
// Startpositie: surfspot Wolphaartsdijk (Muidenweg)
const ORANJEPLAAT = [51.5283, 3.7250];

const map = L.map('map', { center: [51.555, 3.72], zoom: 12, zoomControl: true });
if (window.innerWidth <= 600) document.getElementById('windPanel').classList.add('collapsed');

const layers = {
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom:19 }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri, Maxar', maxZoom:20 }),
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { attribution:'© OpenTopoMap', maxZoom:17 }),
  nautical: L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
    { attribution:'© OpenSeaMap', maxZoom:18, opacity:0.95 })
};
let currentBase = layers.satellite;
let nautOverlay = null;
currentBase.addTo(map);

function setLayer(type, btn) {
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (type === 'nautical') {
    if (!nautOverlay) { nautOverlay = layers.nautical; nautOverlay.addTo(map); }
    return;
  }
  if (nautOverlay) { map.removeLayer(nautOverlay); nautOverlay = null; }
  map.removeLayer(currentBase);
  currentBase = layers[type];
  currentBase.addTo(map);
}

// Oranjeplaat start marker (pulsing orange dot)
const startIcon = L.divIcon({
  className:'',
  html:\`<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:44px;height:44px;border-radius:50%;
      border:2px solid rgba(255,112,67,0.45);
      animation:startRing 2s ease-in-out infinite;"></div>
    <div style="width:13px;height:13px;background:rgba(255,112,67,0.92);
      border:2px solid #fff;border-radius:50%;
      box-shadow:0 0 12px rgba(255,112,67,0.7);"></div>
  </div>\`,
  iconAnchor:[22,22]
});

L.marker(ORANJEPLAAT, { icon: startIcon })
  .addTo(map)
  .bindTooltip('🏄 Wolphaartsdijk (Muidenweg) · Startpositie', { permanent:false, direction:'right', offset:[16,0] });

// Boat marker
const boatIcon = L.divIcon({
  className:'',
  html:\`<div class="boat-marker" id="boatEl">🚤</div>\`,
  iconSize:[28,28], iconAnchor:[14,14]
});
const boatMarker = L.marker(ORANJEPLAAT, { icon:boatIcon, zIndexOffset:1000 }).addTo(map);

// Wake trail
const wakePts = [];
const wakeLine = L.polyline([], {
  color:'rgba(56,212,245,0.3)', weight:2, dashArray:'4,6'
}).addTo(map);

// POIs — coördinaten gecontroleerd met OpenStreetMap (okt 2026)
const pois = [
  { lat:51.5145, lng:3.7037, name:"🏝 Oranjeplaat",          desc:"Eiland/schiereiland in het Veerse Meer" },
  { lat:51.5486, lng:3.6684, name:"🏰 Veere",                desc:"Historische vestingstad · jachthaven" },
  { lat:51.5892, lng:3.6455, name:"🏄 Surfschool Veerse Dam", desc:"Surfspot aan de Veerse Dam" },
  { lat:51.5474, lng:3.8137, name:"⛵ Jachthaven Wolphaartsdijk", desc:"Marina · watersportbasis" },
  { lat:51.5450, lng:3.6900, name:"🦆 Haringvreter",         desc:"Eiland · natuurgebied" },
  { lat:51.5696, lng:3.6566, name:"🏄 De Schotsman",          desc:"Surfschool · surfspot" },
];

pois.forEach(p => {
  const ic = L.divIcon({
    className:'',
    html:\`<div style="background:rgba(3,14,28,0.88);border:1px solid rgba(56,212,245,0.42);
      color:#e0f4ff;font-family:Montserrat,sans-serif;font-size:11px;font-weight:600;
      padding:3px 9px;border-radius:8px;white-space:nowrap;
      backdrop-filter:blur(8px);cursor:pointer;">\${p.name}</div>\`,
    iconAnchor:[0,0]
  });
  L.marker([p.lat,p.lng], { icon:ic }).addTo(map)
    .bindTooltip(\`<strong>\${p.name}</strong><br>\${p.desc}\`, { direction:'top', offset:[0,-8] });
});

// (Handgetekende meer-omtrek verwijderd: lag ~4 km te zuidelijk; de kaartlaag toont het echte water.)

// Sailing
let mode = 'explore';
let routePts = [], routeLine = null, routeMarkers = [];

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + m).classList.add('active');
}
function clearRoute() {
  routePts = [];
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  routeMarkers.forEach(m => map.removeLayer(m));
  routeMarkers = [];
  wakeLine.setLatLngs([]);
  wakePts.length = 0;
}

map.on('click', function(e) {
  const ll = e.latlng;
  if (mode === 'route') {
    routePts.push(ll);
    const wi = L.divIcon({
      className:'',
      html:\`<div style="width:11px;height:11px;background:#ff7043;border:2px solid #fff;
        border-radius:50%;box-shadow:0 0 8px rgba(255,112,67,0.6);"></div>\`,
      iconAnchor:[5,5]
    });
    routeMarkers.push(L.marker(ll, { icon:wi }).addTo(map));
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(routePts, { color:'#ff7043', weight:2.5, dashArray:'8,5', opacity:0.85 }).addTo(map);
    return;
  }
  sailTo(ll);
});

function sailTo(target) {
  const s = boatMarker.getLatLng();
  const dlat = target.lat - s.lat;
  const dlng = target.lng - s.lng;
  const angle = Math.atan2(dlng, dlat) * 180 / Math.PI;
  const boatEl = document.getElementById('boatEl');
  if (boatEl) boatEl.style.transform = \`rotate(\${angle}deg)\`;

  let i = 0; const steps = 45;
  const iv = setInterval(() => {
    i++;
    const t = i / steps;
    const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const lat = s.lat + dlat * e;
    const lng = s.lng + dlng * e;
    const pos = L.latLng(lat, lng);
    boatMarker.setLatLng(pos);
    wakePts.push(pos);
    if (wakePts.length > 100) wakePts.shift();
    wakeLine.setLatLngs(wakePts);
    document.getElementById('iPos').textContent = \`\${lat.toFixed(4)}°N, \${lng.toFixed(4)}°E\`;
    if (i >= steps) { clearInterval(iv); updateLoc(lat, lng); }
  }, 22);
  map.panTo(target, { animate:true, duration:1.0 });
}

function updateLoc(lat, lng) {
  const locs = [
    { lat:51.5283,lng:3.7250,r:0.010,name:"Wolphaartsdijk (Muidenweg)" },
    { lat:51.5474,lng:3.8137,r:0.010,name:"Jachthaven Wolphaartsdijk" },
    { lat:51.5145,lng:3.7037,r:0.010,name:"Oranjeplaat" },
    { lat:51.5486,lng:3.6684,r:0.010,name:"Veere" },
    { lat:51.5892,lng:3.6455,r:0.012,name:"Veerse Dam" },
    { lat:51.5450,lng:3.6900,r:0.010,name:"Haringvreter" },
    { lat:51.5696,lng:3.6566,r:0.010,name:"De Schotsman" },
  ];
  let found = "Veerse Meer";
  for (const l of locs) {
    if (Math.sqrt((lat-l.lat)**2+(lng-l.lng)**2) < l.r) { found=l.name; break; }
  }
  document.getElementById('iLoc').textContent = found;
}

map.on('zoom', () => document.getElementById('iZoom').textContent = map.getZoom());
map.on('mousemove', e => {
  document.getElementById('iPos').textContent =
    \`\${e.latlng.lat.toFixed(4)}°N, \${e.latlng.lng.toFixed(4)}°E\`;
});

// === WIND DATA - Open-Meteo ===
function degToDir(d) {
  const dirs=['N','NNO','NO','ONO','O','OZO','ZO','ZZO','Z','ZZW','ZW','WZW','W','WNW','NW','NNW'];
  return dirs[Math.round(d/22.5)%16];
}
// Open-Meteo levert knopen (wind_speed_unit=kn)
function knR(v) { return Math.round(v); }
function knToBft(k) {
  k=Math.round(k);
  if(k<1)return 0;if(k<4)return 1;if(k<7)return 2;if(k<11)return 3;
  if(k<17)return 4;if(k<22)return 5;if(k<28)return 6;if(k<34)return 7;
  if(k<41)return 8;if(k<48)return 9;if(k<56)return 10;if(k<64)return 11;
  return 12;
}
// grenzen omgerekend van km/h (5/20/40/60) naar knopen
function windQuality(k) {
  if(k<3)  return ['wq-calm',   '🌫 Windstil'];
  if(k<11) return ['wq-light',  '🍃 Lichte bries'];
  if(k<22) return ['wq-good',   '🏄 Goed surfen!'];
  if(k<32) return ['wq-strong', '⚠ Sterke wind'];
  return             ['wq-storm',  '⛈ Storm'];
}

async function fetchWind() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=51.555&longitude=3.72'
      + '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,apparent_temperature'
      + '&hourly=wind_speed_10m,wind_direction_10m'
      + '&wind_speed_unit=kn&timezone=Europe%2FAmsterdam&forecast_days=2';

    const r = await fetch(url);
    const d = await r.json();
    const c = d.current;

    const spd  = knR(c.wind_speed_10m);
    const gust = knR(c.wind_gusts_10m);
    const dir  = c.wind_direction_10m;
    const bft  = knToBft(spd);
    const dirN = degToDir(dir);
    const temp = Math.round(c.apparent_temperature);
    const [qCls, qLbl] = windQuality(spd);

    // 6-hour forecast rows
    const now = new Date();
    const nowH = now.getHours();
    let fcRows = '';
    for (let i = 0; i < 6; i++) {
      const hi = nowH + i;
      if (hi >= d.hourly.wind_speed_10m.length) break;
      const hs = knR(d.hourly.wind_speed_10m[hi]);
      const hd = degToDir(d.hourly.wind_direction_10m[hi]);
      const barW = Math.min(100, (hs / 38) * 100);
      fcRows += \`<div class="fc-row">
        <span class="fc-hour">\${String(hi%24).padStart(2,'0')}u</span>
        <div class="fc-bar-bg"><div class="fc-bar-fill" style="width:\${barW}%"></div></div>
        <span class="fc-speed">\${hs} kn · \${knToBft(hs)}</span>
        <span class="fc-dir">\${hd}</span>
      </div>\`;
    }

    document.getElementById('windBody').innerHTML = \`
      <div class="wind-speed-row">
        <div class="wind-big">\${spd}</div>
        <div class="wind-meta">
          <span class="wind-unit">knopen</span>
          <span class="wind-bft">Bft \${bft}</span>
        </div>
      </div>

      <div class="wind-dir-row">
        <div class="wind-arrow" id="windArrow" style="transform:rotate(\${dir}deg)">⬆</div>
        <div class="wind-dir-info">
          <span class="wind-dir-name">\${dirN}</span>
          <span class="wind-dir-deg">\${dir}° · uit \${dirN}</span>
        </div>
      </div>

      <div class="wind-stats">
        <div class="ws-item">
          <span class="ws-label">Windstoot</span>
          <span class="ws-val">\${gust} kn · \${knToBft(gust)} Bft</span>
        </div>
        <div class="ws-item">
          <span class="ws-label">Gevoels T°</span>
          <span class="ws-val">\${temp}°C</span>
        </div>
      </div>

      <div class="wind-quality-badge \${qCls}">\${qLbl}</div>

      <div class="forecast-section">
        <div class="fc-title">📅 Komende 6 uur</div>
        \${fcRows}
      </div>
    \`;

    document.getElementById('iWind').textContent = \`\${spd} kn · \${bft} Bft \${dirN}\`;

  } catch(err) {
    document.getElementById('windBody').innerHTML =
      \`<div style="font-size:0.7rem;color:var(--text-dim);">⚠ Wind niet beschikbaar</div>\`;
  }
}

fetchWind();
setInterval(fetchWind, 5 * 60 * 1000);
<\/script></body></html>`;
    el.appendChild(iframe);
    return()=>{if(el.contains(iframe))el.removeChild(iframe);};
  },[]);
  return(<div ref={containerRef} style={{margin:'0 -16px'}}/>);
}

// ── SPOTS ──
function Spots({spots,favs,tFav,oSpot,fReg,setFReg,regs,sData,rws}){const t=useT();const now=localParts();const key=`${now.date}T${pad(now.hour)}:00`;return(<div>
  <div style={{display:"flex",gap:8,marginTop:12,marginBottom:16,overflowX:"auto"}}>{regs.map(r=><button key={r} onClick={()=>setFReg(r)} aria-pressed={fReg===r} style={{background:fReg===r?t.btnA:t.btn,border:fReg===r?`1px solid ${t.btnAB}`:`1px solid ${t.cb}`,color:fReg===r?t.acc:t.ts,borderRadius:20,padding:"7px 16px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{r}</button>)}</div>
  <div className="spots-grid">
  {spots.map(s=>{const fav=favs.includes(s.id);const d=sData[s.id];let cw=null,live=null;
    const ws=rws?nearSt(s,rws,"wind"):null;
    if(ws){cw=ms2kn(ws.wind_ms);live=ws;}else if(d){const i=d.hourly.time.indexOf(key);if(i>=0)cw=d.hourly.wind_speed_10m[i];}
    const q=cw!==null?wc(cw,t):null;
    return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:12,background:t.card,border:`1px solid ${t.cb}`,borderRadius:14,padding:"12px 14px",marginBottom:8,cursor:"pointer"}} onClick={()=>oSpot(s)}>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:700}}>{s.name}</div><div style={{fontSize:13,color:t.acc}}>{s.reg} · {s.type}</div>
        {live&&<div style={{fontSize:11,color:t.tm,marginTop:2}}>RWS {live.naam} · {live.km.toFixed(0)} km · {hhmm(live.wind_ts)}</div>}</div>
      {q&&<div style={{textAlign:"center",marginRight:4}}><div style={{fontSize:18,fontWeight:800,color:q.color}}>{Math.round(cw)}</div><div style={{fontSize:11,color:t.tm}}>kn · {bft(cw)} Bft</div><div style={{marginTop:3}}><SrcBadge live={!!live}/></div></div>}
      <button onClick={e=>{e.stopPropagation();tFav(s.id);}} aria-label={fav?`${s.name} uit favorieten`:`${s.name} als favoriet`} aria-pressed={fav} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:fav?t.stOn:t.stOff,padding:4}}>{fav?"★":"☆"}</button>
    </div>);
  })}
  </div>
  <div style={{fontSize:11,color:t.tf,textAlign:"center",margin:"8px 0"}}>LIVE = RWS-meting (≤ 40 km, ≤ 3 uur oud). MODEL = Open-Meteo huidige uur (alleen voor favorieten).</div>
</div>);}

// ── MARKT ──
function Markt(){
  const t=useT();
  const[postcode,setPostcode]=useState(()=>{try{return localStorage.getItem('ws_postcode')||'4331'}catch(e){return'4331'}});
  const[afstand,setAfstand]=useState(()=>{try{return parseInt(localStorage.getItem('ws_afstand'))||50}catch(e){return 50}});
  const[zoek,setZoek]=useState("");
  const[actCat,setActCat]=useState(null);

  useEffect(()=>{try{localStorage.setItem('ws_postcode',postcode)}catch(e){}},[postcode]);
  useEffect(()=>{try{localStorage.setItem('ws_afstand',String(afstand))}catch(e){}},[afstand]);

  const cats=[
    {id:"boards",icon:"🏄",label:"Windsurfboards",q:"windsurfboard",extra:["surfplank windsurf","windsurfplank","freeride board windsurf","wave board windsurf"]},
    {id:"zeilen",icon:"⛵",label:"Zeilen / Sails",q:"windsurf zeil",extra:["windsurf sail","freeride zeil","wave zeil","slalom zeil"]},
    {id:"masten",icon:"📏",label:"Masten & Giek",q:"windsurf mast",extra:["windsurf giek","windsurf boom","carbon mast windsurf"]},
  ];

  const mkUrl=(query)=>{
    const base="https://www.marktplaats.nl/q/";
    const params=new URLSearchParams();
    params.set("categoryId","");
    if(postcode.length>=4) params.set("postcode",postcode);
    if(afstand) params.set("distanceMeters",String(afstand*1000));
    return `${base}${encodeURIComponent(query)}/?${params.toString()}`;
  };

  const afstanden=[10,20,30,50,75,100,200];

  return(<div style={{marginTop:12}}>
    {/* POSTCODE & AFSTAND */}
    <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"16px",marginBottom:14}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>📍 Zoekgebied</div>
      <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:t.tm,marginBottom:4}}>Postcode</div>
          <input value={postcode} onChange={e=>setPostcode(e.target.value.replace(/[^0-9A-Za-z]/g,"").slice(0,6))}
            placeholder="4331" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${t.cb}`,background:t.btn,color:t.text,fontSize:16,fontWeight:600,fontFamily:"JetBrains Mono",outline:"none"}}/>
        </div>
        <div style={{flex:1.5}}>
          <div style={{fontSize:12,color:t.tm,marginBottom:4}}>Afstand: {afstand} km</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {afstanden.map(a=><button key={a} onClick={()=>setAfstand(a)}
              style={{padding:"6px 10px",borderRadius:8,border:afstand===a?`2px solid ${t.acc}`:`1px solid ${t.cb}`,background:afstand===a?t.btnA:t.btn,color:afstand===a?t.acc:t.ts,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>)}
          </div>
        </div>
      </div>
    </div>

    {/* VRIJ ZOEKEN */}
    <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"14px 16px",marginBottom:14}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>🔍 Vrij zoeken</div>
      <div style={{display:"flex",gap:8}}>
        <input value={zoek} onChange={e=>setZoek(e.target.value)} placeholder="bijv. Severne Blade 7.0"
          style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${t.cb}`,background:t.btn,color:t.text,fontSize:14,fontFamily:"inherit",outline:"none"}}
          onKeyDown={e=>{if(e.key==="Enter"&&zoek.trim())window.open(mkUrl(zoek.trim()),"_blank")}}/>
        <button onClick={()=>{if(zoek.trim())window.open(mkUrl(zoek.trim()),"_blank")}}
          style={{padding:"10px 16px",borderRadius:10,background:t.acc,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Zoek</button>
      </div>
    </div>

    {/* CATEGORIEËN */}
    <Sec t="Categorieën" s="Marktplaats"/>
    {cats.map(cat=>(
      <div key={cat.id} style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
        <div onClick={()=>setActCat(actCat===cat.id?null:cat.id)}
          style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}>
          <span style={{fontSize:24}}>{cat.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700}}>{cat.label}</div>
            <div style={{fontSize:12,color:t.tm}}>{cat.extra.length+1} zoekopdrachten</div>
          </div>
          <span style={{fontSize:13,color:t.tf,transform:actCat===cat.id?"rotate(90deg)":"none",transition:"transform 0.2s"}}>→</span>
        </div>

        {actCat===cat.id&&<div style={{padding:"0 16px 14px",display:"flex",flexDirection:"column",gap:6}}>
          {/* Main search */}
          <a href={mkUrl(cat.q)} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:t.btnA,borderRadius:10,textDecoration:"none",color:t.text,border:`1px solid ${t.btnAB}`}}>
            <span style={{fontSize:14,fontWeight:700,color:t.acc,flex:1}}>🔍 "{cat.q}"</span>
            <span style={{fontSize:12,color:t.acc,fontWeight:600}}>Open →</span>
          </a>
          {/* Extra searches */}
          {cat.extra.map((q,i)=>(
            <a key={i} href={mkUrl(q)} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:t.ch,borderRadius:10,textDecoration:"none",color:t.text}}>
              <span style={{fontSize:13,flex:1}}>"{q}"</span>
              <span style={{fontSize:11,color:t.tf}}>→</span>
            </a>
          ))}
        </div>}
      </div>
    ))}

    {/* SNELLE LINKS */}
    <Sec t="⚡ Snelle zoekopdrachten" s="Populair"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {["windsurf compleet","windsurf beginner","windfoil","starboard windsurf","severne","duotone windsurf","jp australia","gaastra windsurf","neil pryde windsurf","wetsuit 5/4"].map(q=>
        <a key={q} href={mkUrl(q)} target="_blank" rel="noopener noreferrer"
          style={{padding:"8px 14px",borderRadius:20,background:t.btn,border:`1px solid ${t.cb}`,color:t.text,textDecoration:"none",fontSize:13,fontWeight:500,whiteSpace:"nowrap"}}>{q}</a>
      )}
    </div>
  </div>);
}

// ── ALERTS ──
function Alerts({alerts,perfect,oSpot,favDir,maxGust,minHours}){const t=useT();const by=k=>alerts.filter(a=>wc(a.avgWind,t).key===k);const p=perfect,g=by("m"),s=by("s");return(<div style={{marginTop:12}}>
  <div style={{fontSize:12,color:t.tm,marginBottom:6}}>Aaneengesloten vensters van ≥{minHours} uur, 8–20u, vanaf nu · richting {favDir.span>=360?"alle":`${d2d(favDir.center)} ±${favDir.span/2}°`} · vlagen ≤ {maxGust} kn</div>
  {p.length>0&&<><Sec t="🟢 Perfecte condities" s={`${p.length} venster${p.length>1?"s":""}`}/><SCRow items={p} oSpot={oSpot}/></>}
  {g.length>0&&<><Sec t="🟡 Matige wind" s={`${g.length} venster${g.length>1?"s":""}`}/><SCRow items={g} oSpot={oSpot}/></>}
  {s.length>0&&<><Sec t="🟠 Sterke wind" s={`${s.length} venster${s.length>1?"s":""}`}/><SCRow items={s} oSpot={oSpot}/></>}
  {alerts.length+p.length===0&&<Em t="Geen windvensters deze week. Pas je windrange, richting of vlagenlimiet aan in Settings."/>}
</div>);}

// ── DETAIL ──
// ── RWS LIVE BLOCK: dichtstbijzijnde verse RWS-meting ──
function LiveBlock({spot,rws,minW,maxW}){
  const t=useT();
  const ws=rws?nearSt(spot,rws,"wind"):null;
  const ts=rws?nearSt(spot,rws,"temp"):null;
  if(!ws&&!ts)return<Em t="Geen verse RWS-meting binnen 40 km — zie Prognose (model)."/>;
  const kn=ws?ms2kn(ws.wind_ms):null;const q=kn!=null?wc(kn,t):null;
  const ageMin=ws?Math.round((Date.now()-new Date(ws.wind_ts))/60000):null;
  return(<div>
    {ws&&<div style={{background:q.bg,border:`1px solid ${q.color}33`,borderRadius:20,padding:"22px 20px",marginBottom:12,textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><SrcBadge live/></div>
      <div style={{fontSize:56,fontWeight:900,color:q.color,lineHeight:1,fontFamily:"JetBrains Mono"}}>{Math.round(kn)}</div>
      <div style={{fontSize:15,color:t.ts,marginTop:4}}>knopen (10-min gemiddelde) · <b style={{color:q.color}}>{bft(kn)} Bft</b></div>
      <div style={{display:"inline-block",marginTop:10,padding:"4px 14px",background:`${q.color}22`,borderRadius:20,color:q.color,fontSize:14,fontWeight:700}}>{q.label}</div>
      {ws.dir!=null&&<div style={{marginTop:14,display:"flex",justifyContent:"center",alignItems:"center",gap:10}}><CArrow deg={ws.dir} size={30} color={q.color}/><span style={{fontSize:15,fontWeight:700}}>{d2d(ws.dir)} · {Math.round(ws.dir)}°</span></div>}
      <div style={{fontSize:12,color:t.tm,marginTop:12}}>📍 RWS-station <b>{ws.naam}</b> · {ws.km.toFixed(1)} km van de spot<br/>gemeten {hhmm(ws.wind_ts)} ({ageMin} min geleden)</div>
    </div>}
    {ts&&<div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"14px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:14,fontWeight:700}}>🌡️ Watertemperatuur</div><div style={{fontSize:12,color:t.tm}}>{ts.naam} · {ts.km.toFixed(1)} km · {hhmm(ts.temp_ts)}</div></div>
      <div style={{fontSize:28,fontWeight:900,fontFamily:"JetBrains Mono",color:t.acc}}>{ts.temp.toFixed(1)}°</div>
    </div>}
    <div style={{padding:"8px 12px",background:t.ch,borderRadius:10,fontSize:10,color:t.tf,lineHeight:1.5}}>
      Bron: Rijkswaterstaat Waterinfo (ddapi20) · {rws.via==="proxy"?"live via proxy":`momentopname ${hhmm(rws.generated)}`}. Golfhoogte niet getoond: geen betrouwbare live bron gevonden voor deze stations.
    </div>
  </div>);
}

function Detail({spot,data,selDay,setSelDay,minW,maxW,rws,favDir,maxGust:gustLim}){const t=useT();
  const hasLive=!!(rws&&(nearSt(spot,rws,"wind")||nearSt(spot,rws,"temp")));
  // Als gebruiker op een dag tikte → direct naar prognose; anders live (als beschikbaar)
  const [detailTab,setDetailTab]=React.useState(selDay||!hasLive?"forecast":"live");
  const[own,setOwn]=React.useState(null);
  React.useEffect(()=>{if(!data)fetchW(spot.lat,spot.lon).then(setOwn).catch(()=>setOwn(false));},[spot.id,!!data]);
  if(!data)data=own||null;
  if(!data)return<Em t={own===false?"Prognose niet beschikbaar (offline of Open-Meteo onbereikbaar)":"Prognose laden…"}/>;
  const today=localParts().date;const days=grp(data.hourly),dk=Object.keys(days).filter(d=>d>=today).slice(0,7),act=selDay||dk[0],hrs=days[act]||[],p=pk(hrs),q=wc(p.avg,t);
  const dayHrs=hrs.filter(h=>h.hour>=6&&h.hour<=21);
  const totalRain=dayHrs.reduce((s,h)=>s+(h.rn||0),0);
  const maxRain=Math.max(...dayHrs.map(h=>h.rn||0),0.1);
  const dryHrs=dayHrs.filter(h=>(h.rn||0)<0.1&&(h.rp||0)<30).length;
  const gH=hrs.filter(h=>h.hour>=8&&h.hour<=20);const maxGust=gH.length?Math.max(...gH.map(h=>h.gust||0)):p.max;

  return(<div style={{marginTop:8}}>
    {/* Tab toggle — alleen tonen als spot een RWS station heeft */}
    {hasLive&&(
      <div style={{display:"flex",gap:8,marginBottom:14}} role="tablist">
        {[{id:"live",l:"🟢 LIVE Meting (RWS)"},{id:"forecast",l:"📅 Prognose"}].map(tb=>(
          <button key={tb.id} onClick={()=>setDetailTab(tb.id)} style={{flex:1,padding:"10px 8px",borderRadius:12,border:detailTab===tb.id?`1px solid ${t.btnAB}`:`1px solid ${t.cb}`,background:detailTab===tb.id?t.btnA:t.ch,fontFamily:"inherit",fontSize:12,fontWeight:700,color:detailTab===tb.id?t.acc:t.tm,cursor:"pointer",letterSpacing:0.3}}>
            {tb.l}
          </button>
        ))}
      </div>
    )}

    {/* LIVE TAB */}
    {hasLive&&detailTab==="live"&&(
      <LiveBlock spot={spot} rws={rws} minW={minW} maxW={maxW}/>
    )}

    {/* FORECAST TAB */}
    {(detailTab==="forecast"||!hasLive)&&(
      <>
        <div style={{background:q.bg,border:`1px solid ${q.color}33`,borderRadius:20,padding:"24px 20px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:56,fontWeight:900,color:q.color,lineHeight:1,fontFamily:"JetBrains Mono"}}>{Math.round(p.avg)}</div>
          <div style={{fontSize:15,color:t.ts,marginTop:4}}>knopen gemiddeld · <b style={{color:q.color}}>{bft(p.avg)} Bft</b></div>
          <div style={{display:"inline-block",marginTop:10,padding:"4px 14px",background:`${q.color}22`,borderRadius:20,color:q.color,fontSize:14,fontWeight:700}}>{q.label}</div>
          <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:18}}>
            <div><div style={{fontSize:13,color:t.tm}}>Vlagen</div><div style={{fontSize:20,fontWeight:700,fontFamily:"JetBrains Mono"}}>{Math.round(maxGust)}</div><div style={{fontSize:11,color:t.tm}}>kn · {bft(maxGust)} Bft</div></div>
            <div><CArrow deg={p.dir} size={32} color={q.color}/><div style={{fontSize:13,color:t.tm,marginTop:2}}>{d2d(p.dir)}</div></div>
            <div><div style={{fontSize:13,color:t.tm}}>Temp</div><div style={{fontSize:20,fontWeight:700,fontFamily:"JetBrains Mono"}}>{Math.round(hrs.find(h=>h.hour===14)?.temp||hrs[0]?.temp||0)}°</div></div>
            <div><div style={{fontSize:13,color:t.tm}}>Regen</div><div style={{fontSize:20,fontWeight:700,fontFamily:"JetBrains Mono",color:totalRain>1?t.rain:t.dry}}>{totalRain.toFixed(1)}<span style={{fontSize:12}}>mm</span></div></div>
          </div>
          <div style={{marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"8px 14px",background:`${q.color}10`,borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>{totalRain<0.5?"☀️":"🌧️"}</span><span style={{fontSize:12,color:t.ts}}>{totalRain<0.5?"Droge dag":`${totalRain.toFixed(1)} mm totaal`}</span></div>
            <div style={{width:1,height:16,background:`${q.color}33`}}/>
            <div style={{fontSize:12,color:t.ts}}>🕐 {dryHrs} droge uren</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto"}}>{dk.map(d=>{const dp=pk(days[d]),dq=wc(dp.avg,t),isA=d===act;return(<button key={d} onClick={()=>setSelDay(d)} style={{flex:1,minWidth:48,padding:"10px 4px",background:isA?t.btnA:t.ch,border:isA?`1px solid ${t.btnAB}`:`1px solid ${t.cb}`,borderRadius:12,cursor:"pointer",textAlign:"center",fontFamily:"inherit",color:t.text}}><div style={{fontSize:12,fontWeight:600,color:isA?t.acc:t.tm}}>{dayN(d)}</div><div style={{fontSize:17,fontWeight:800,color:dq.color,marginTop:3}}>{Math.round(dp.avg)}</div><div style={{fontSize:10,color:t.tm}}>{bft(dp.avg)} Bft</div><div style={{width:6,height:6,borderRadius:3,background:dq.color,margin:"4px auto 0",opacity:0.8}}/></button>);})}</div>
        <Sec t={fullDay(act)} s={fmtD(act)}/>
        <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",padding:"8px 14px",borderBottom:`1px solid ${t.div}`,background:t.ch}}>
            <div style={{width:52,fontSize:11,color:t.tm,fontWeight:600}}>Tijd</div>
            <div style={{flex:1,fontSize:11,color:t.tm,fontWeight:600}}>Wind</div>
            <div style={{width:76,textAlign:"right",fontSize:11,color:t.tm,fontWeight:600}}>kn · Bft</div>
            <div style={{width:64,textAlign:"center",fontSize:11,color:t.tm,fontWeight:600}}>Regen</div>
            <div style={{width:28,textAlign:"right",fontSize:11,color:t.tm,fontWeight:600}}>°C</div>
          </div>
          {dayHrs.map((h,i)=>{const hq=wc(h.wind,t);const rn=h.rn||0;const rp=h.rp||0;const rainPct=Math.min((rn/maxRain)*100,100);const hasRain=rn>=0.1;return(
            <div key={i} style={{display:"flex",alignItems:"center",padding:"9px 14px",borderBottom:`1px solid ${t.div}`,background:hq.label==="Perfect"?t.pRow:"transparent"}}>
              <div style={{width:52,fontSize:14,fontWeight:600,fontFamily:"JetBrains Mono",color:t.ts}}>{pad(h.hour)}:00</div>
              <div style={{flex:1,paddingRight:6}}>
                <div style={{height:6,borderRadius:3,background:`linear-gradient(90deg,${hq.color}44,${hq.color})`,width:`${Math.min((h.wind/35)*100,100)}%`}}/>
              </div>
              <div style={{width:76,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                <CArrow deg={h.dir} size={13} color={hq.color}/>
                <span style={{fontSize:14,fontWeight:700,color:hq.color,fontFamily:"JetBrains Mono"}}>{Math.round(h.wind)}</span>
                <span style={{fontSize:11,fontWeight:600,color:t.tm,fontFamily:"JetBrains Mono",minWidth:22,textAlign:"right"}}>{bft(h.wind)}</span>
              </div>
              <div style={{width:64,textAlign:"center"}}>
                {hasRain?(<div><div style={{height:4,borderRadius:2,background:t.rain,width:`${rainPct}%`,margin:"0 auto 2px",maxWidth:44}}/><div style={{fontSize:11,color:t.rain,fontFamily:"JetBrains Mono",fontWeight:700}}>{rn.toFixed(1)}mm</div></div>
                ):rp>25?(<div style={{fontSize:11,color:t.tm,fontFamily:"JetBrains Mono"}}>{rp}%</div>
                ):(<div style={{fontSize:12}}>☀️</div>)}
              </div>
              <div style={{width:28,textAlign:"right",fontSize:13,color:t.tm,fontFamily:"JetBrains Mono"}}>{Math.round(h.temp)}°</div>
            </div>);})}
        </div>
        <div style={{marginTop:16}}><Sec t="Windverloop" s="Overdag (6-21u)"/>
          <div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"16px 12px 8px"}}>
            <svg viewBox="0 0 400 120" style={{width:"100%",height:120}}>
              {[10,20,30].map(v=><g key={v}><line x1={30} y1={100-(v/35)*90} x2={390} y2={100-(v/35)*90} stroke={t.gGrid} strokeWidth={1}/><text x={24} y={104-(v/35)*90} fill={t.gText} fontSize={9} textAnchor="end" fontFamily="JetBrains Mono">{v}</text></g>)}
              <rect x={30} y={100-(Math.min(maxW,35)/35)*90} width={360} height={((Math.min(maxW,35)-Math.min(minW,35))/35)*90} fill={t.gIdeal}/>
              {(()=>{const dh=hrs.filter(h=>h.hour>=6&&h.hour<=21);if(!dh.length)return null;const pts=dh.map((h,i)=>`${30+(i/(dh.length-1))*360},${100-(h.wind/35)*90}`).join(" ");const gp=dh.map((h,i)=>`${30+(i/(dh.length-1))*360},${100-(h.gust/35)*90}`).join(" ");return(<><polyline points={gp} fill="none" stroke={t.gGust} strokeWidth={1.5} strokeDasharray="4 3"/><polyline points={pts} fill="none" stroke={t.gLine} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>{dh.map((h,i)=><circle key={i} cx={30+(i/(dh.length-1))*360} cy={100-(h.wind/35)*90} r={3} fill={wc(h.wind,t).color}/>)}</>);})()}
            </svg>
            <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:4}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:14,height:2.5,background:t.gLine,borderRadius:2}}/><span style={{fontSize:11,color:t.tm}}>Wind</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:14,height:1.5,background:t.gGust,borderRadius:2}}/><span style={{fontSize:11,color:t.tm}}>Vlagen</span></div>
              <span style={{fontSize:11,color:t.tm}}>in knopen</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:14,height:6,background:t.gIdeal,borderRadius:1}}/><span style={{fontSize:11,color:t.tm}}>Ideaal</span></div>
            </div>
          </div>
        </div>
        <div style={{marginTop:8,padding:"8px 12px",background:t.ch,borderRadius:10,fontSize:10,color:t.tf,display:"flex",justifyContent:"space-between"}}>
          <span>📡 Prognose: Open-Meteo (model, best match)</span><span>Ideaal {minW}–{maxW} kn</span>
        </div>
      </>
    )}
  </div>);
}

// ── SETTINGS ──
function Toggle({on,onClick,label}){const t=useT();return<button role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{width:50,height:28,borderRadius:14,border:"none",cursor:"pointer",background:on?t.swOn:t.swOff,position:"relative",transition:"background 0.3s",flexShrink:0}}><div style={{width:22,height:22,borderRadius:11,background:"#fff",position:"absolute",top:3,left:on?25:3,transition:"left 0.3s",boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}/></button>;}
function Card({children,style}){const t=useT();return<div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:16,padding:"18px",marginBottom:12,...style}}>{children}</div>;}

function PlacePicker({label,value,onChange,placeholder}){
  const t=useT();const[q,setQ]=useState(value?.name||"");const[res,setRes]=useState(null);const[busy,setBusy]=useState(false);
  const search=async()=>{if(!q.trim())return;setBusy(true);try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=5&language=nl&countryCode=NL`);const j=await r.json();setRes(j.results||[]);}catch(e){setRes([]);}setBusy(false);};
  const inp={flex:1,minWidth:0,padding:"10px 12px",borderRadius:12,border:`1px solid ${t.cb}`,background:t.btn,color:t.text,fontSize:14,fontFamily:"inherit"};
  return(<div style={{marginBottom:12}}>
    <label style={{fontSize:13,color:t.ts,display:"block",marginBottom:6}}>{label}{value&&<span style={{color:t.tm}}> · {value.name} ({value.lat.toFixed(3)}, {value.lon.toFixed(3)})</span>}</label>
    <div style={{display:"flex",gap:8}}>
      <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={placeholder} aria-label={label} style={inp}/>
      <button onClick={search} disabled={busy} style={{padding:"10px 14px",borderRadius:12,background:t.acc,color:"#fff",border:"none",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{busy?"…":"Zoek"}</button>
      {value&&onChange&&<button onClick={()=>{onChange(null);setQ("");setRes(null);}} aria-label="Wissen" style={{padding:"10px 12px",borderRadius:12,background:t.btn,color:t.ts,border:`1px solid ${t.cb}`,cursor:"pointer"}}>✕</button>}
    </div>
    {res&&<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>{res.length===0?<span style={{fontSize:12,color:t.tm}}>Niets gevonden</span>:res.map(r=><button key={r.id} onClick={()=>{onChange({name:r.name,lat:r.latitude,lon:r.longitude});setQ(r.name);setRes(null);}} style={{textAlign:"left",padding:"8px 10px",borderRadius:10,border:`1px solid ${t.cb}`,background:t.ch,color:t.text,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>{r.name} <span style={{color:t.tm}}>· {r.admin2||r.admin1||""}</span></button>)}</div>}
  </div>);
}

function Settings({minW,setMinW,maxW,setMaxW,alertsOn,setAlertsOn,sSort,setSSort,favDir,setFavDir,maxGust,setMaxGust,minHours,setMinHours,route,setRoute,proxyUrl,setProxyUrl,rws}){const t=useT();
  const so=[{id:"custom",l:"Handmatig",d:"Volgorde waarin je ze hebt toegevoegd"},{id:"name",l:"Naam (A-Z)",d:"Alfabetisch op spotnaam"},{id:"region",l:"Regio",d:"Gegroepeerd op watertype"},{id:"wind_high",l:"Meeste wind",d:"Sterkste wind vandaag bovenaan"},{id:"wind_low",l:"Minste wind",d:"Rustigste spots bovenaan"}];
  const[perm,setPerm]=useState(()=>notifSupported()?Notification.permission:"unsupported");
  const[periodic,setPeriodic]=useState("…");
  const[proxyIn,setProxyIn]=useState(proxyUrl);
  useEffect(()=>{registerPeriodic(alertsOn&&perm==="granted").then(setPeriodic);},[alertsOn,perm]);
  const toggleAlerts=async()=>{if(alertsOn){setAlertsOn(false);return;}const p=await requestNotif();setPerm(p);if(p==="granted")setAlertsOn(true);};
  const slider=(lbl,val,min,max,set,unit="kn")=><div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:14,color:t.ts}}>{lbl}</span><span style={{fontSize:16,fontWeight:700,fontFamily:"JetBrains Mono",color:t.acc}}>{val} {unit}{unit==="kn"?` · ${bft(val)} Bft`:""}</span></div><input type="range" aria-label={lbl} min={min} max={max} value={val} onChange={e=>set(+e.target.value)} style={{width:"100%"}}/></div>;
  return(<div style={{marginTop:12}} className="settings-grid">
    <div>
    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Wind Alert Range</div>
      {slider("Minimum wind",minW,5,30,v=>setMinW(Math.min(v,maxW-1)))}
      {slider("Maximum wind",maxW,10,40,v=>setMaxW(Math.max(v,minW+1)))}
      {slider("Maximale vlagen",maxGust,15,60,setMaxGust)}
      {slider("Minimale vensterlengte",minHours,1,6,setMinHours,"uur")}
      <div style={{marginTop:4,padding:"10px 14px",background:t.sGreen,borderRadius:10,fontSize:14,color:t.sGreenT,textAlign:"center"}}>Ideale range: {minW} - {maxW} knopen ({bft(minW)}-{bft(maxW)} Bft)</div>
    </Card>

    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>🧭 Favoriete windrichting</div>
      <div style={{fontSize:13,color:t.tm,marginBottom:16,lineHeight:1.5}}>Alerts en de 🏄-markering tellen alleen uren met wind uit het <span style={{color:t.roseSelStroke,fontWeight:600}}>groene vlak</span>. Tik op een richting om het midden te verplaatsen, sleep de punten voor de breedte, of kies een preset.</div>
      <WindRose favDir={favDir} setFavDir={setFavDir}/>
    </Card>

    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>🚴 Fietsroute</div>
      <div style={{fontSize:13,color:t.tm,marginBottom:12}}>Vaste route voor de tegenwind-berekening (heen 8u, terug 17u, hemelsbrede koers).</div>
      <PlacePicker label="Van" value={route.from} onChange={v=>setRoute(r=>({...r,from:v||MIDDELBURG}))} placeholder="Middelburg"/>
      <PlacePicker label="Naar (woonplaats)" value={route.to} onChange={v=>setRoute(r=>({...r,to:v}))} placeholder="Vul je woonplaats in"/>
    </Card>
    </div><div>
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><div style={{fontSize:16,fontWeight:700}}>Meldingen</div><div style={{fontSize:13,color:t.acc,marginTop:2}}>Nieuwe perfecte vensters vandaag/morgen</div></div>
        <Toggle on={alertsOn} onClick={toggleAlerts} label="Meldingen"/></div>
      <div style={{fontSize:12,color:t.tm,marginTop:10,lineHeight:1.55}}>
        Toestemming: <b>{perm==="granted"?"gegeven":perm==="denied"?"geweigerd (wijzig in je browser)":perm==="unsupported"?"niet ondersteund":"nog niet gevraagd"}</b> · Achtergrondcontrole: <b>{periodic}</b><br/>
        Werkt bij openen van de app en elke 30 minuten zolang de app open is. Zonder push-server zijn meldingen terwijl de app dicht is niet gegarandeerd: alleen Chrome/Edge op Android of desktop met geïnstalleerde app kan af en toe op de achtergrond controleren; iOS/Safari niet.
      </div>
    </Card>

    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>Spots volgorde</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>{so.map(o=><button key={o.id} onClick={()=>setSSort(o.id)} aria-pressed={sSort===o.id} style={{display:"flex",alignItems:"center",gap:12,background:sSort===o.id?t.btnA:t.ch,border:sSort===o.id?`1px solid ${t.btnAB}`:`1px solid ${t.cb}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",color:t.text,textAlign:"left"}}>
        <div style={{width:20,height:20,borderRadius:10,border:`2px solid ${sSort===o.id?t.rAc:t.rBd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sSort===o.id&&<div style={{width:10,height:10,borderRadius:5,background:t.rAc}}/>}</div>
        <div><div style={{fontSize:15,fontWeight:600,color:sSort===o.id?t.text:t.ts}}>{o.l}</div><div style={{fontSize:12,color:t.tm,marginTop:1}}>{o.d}</div></div>
      </button>)}</div>
    </Card>

    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Legenda</div>
      {[{l:`Perfect (${minW}-${maxW} kn · ${bft(minW)}-${bft(maxW)} Bft)`,c:t.w.p},{l:`Matig (${Math.max(0,minW-3)}-${minW} kn)`,c:t.w.m},{l:`Sterk (${maxW}-${maxW+5} kn)`,c:t.w.s},{l:`Gevaarlijk (>${maxW+5} kn · ${bft(maxW+5)}+ Bft)`,c:t.w.g},{l:`Te zwak (<${Math.max(0,minW-3)} kn)`,c:t.w.z}].map(i=><div key={i.l} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}><div style={{width:10,height:10,borderRadius:5,background:i.c}}/><span style={{fontSize:14,color:t.ts}}>{i.l}</span></div>)}
    </Card>

    <Card>
      <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>📡 Databronnen</div>
      <div style={{fontSize:12,color:t.tm,lineHeight:1.6}}>
        <b>Prognose:</b> Open-Meteo (model) · <b>Metingen:</b> Rijkswaterstaat ddapi20 — {rws?.via==="proxy"?"live via proxy":rws?.generated?`momentopname van ${new Date(rws.generated).toLocaleString("nl-NL",{timeZone:"Europe/Amsterdam",dateStyle:"short",timeStyle:"short"})}`:"niet beschikbaar"}. Metingen ouder dan 3 uur worden niet getoond; dan zie je MODEL.<br/>
        RWS staat geen directe browsertoegang toe (CORS). Optioneel: een eigen proxy-URL die het POST-verzoek doorstuurt naar ddapi20 OphalenLaatsteWaarnemingen en <code>Access-Control-Allow-Origin</code> toevoegt.
      </div>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <input value={proxyIn} onChange={e=>setProxyIn(e.target.value)} placeholder="https://… (leeg = geen proxy)" aria-label="RWS proxy URL" style={{flex:1,minWidth:0,padding:"9px 12px",borderRadius:12,border:`1px solid ${t.cb}`,background:t.btn,color:t.text,fontSize:13,fontFamily:"inherit"}}/>
        <button onClick={()=>setProxyUrl(proxyIn.trim())} style={{padding:"9px 14px",borderRadius:12,background:t.btn,color:t.acc,border:`1px solid ${t.cb}`,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Opslaan</button>
      </div>
      <div style={{fontSize:11,color:t.tf,marginTop:10}}>Windsurf en Fiets v{VERSION}</div>
    </Card>
    </div>
  </div>);
}

// ── SHARED ──
function Sec({t:title,s:sub}){const t=useT();return(<div style={{marginTop:20,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"baseline"}}><span style={{fontSize:17,fontWeight:700}}>{title}</span>{sub&&<span style={{fontSize:13,color:t.acc}}>{sub}</span>}</div>);}

function SC({a,tap}){const t=useT();const q=wc(a.avgWind,t);return(
  <div onClick={tap} style={{flexShrink:0,width:"calc(85vw - 32px)",maxWidth:340,background:q.bg,border:`1px solid ${q.color}33`,borderRadius:18,padding:"18px",cursor:"pointer",scrollSnapAlign:"start",display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:64,height:72,borderRadius:16,background:`${q.color}15`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <div style={{fontSize:26,fontWeight:900,color:q.color,fontFamily:"JetBrains Mono",lineHeight:1}}>{Math.round(a.avgWind)}</div>
        <div style={{fontSize:11,color:q.color,opacity:0.7}}>kn</div>
        <div style={{fontSize:11,fontWeight:700,color:q.color}}>{bft(a.avgWind)} Bft</div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:17,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.spot.name}</div>
        <div style={{fontSize:13,color:t.ts,marginTop:3}}>{fullDay(a.date)} · {fmtD(a.date)}</div>
        <div style={{fontSize:13,color:t.ts}}>{pad(a.sh)}:00–{pad(a.eh)}:00</div>
      </div>
      <CArrow deg={a.dir} size={28} color={q.color}/>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:`${q.color}10`,borderRadius:12,border:`1px solid ${q.color}22`}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:t.ts}}>Richting</div>
        <div style={{fontSize:15,fontWeight:700,color:q.color,marginTop:2}}>{d2d(a.dir)}</div>
      </div>
      <div style={{width:1,height:30,background:`${q.color}22`}}/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:t.ts}}>Kwaliteit</div>
        <div style={{fontSize:13,fontWeight:700,color:q.color,marginTop:2}}>{q.label}</div>
      </div>
      <div style={{width:1,height:30,background:`${q.color}22`}}/>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:t.ts}}>Regen</div>
        <div style={{fontSize:15,marginTop:2}}>{a.ri&&a.ri.has?"🌧️":"☀️"}</div>
      </div>
    </div>
  </div>);}

function SCRow({items,oSpot}){
  if(!items||items.length===0)return null;
  return(
    <div style={{margin:"0 -16px",overflow:"hidden"}}>
      <div className="sc-row-scroll" style={{display:"flex",gap:10,overflowX:"auto",paddingLeft:16,paddingRight:16,paddingBottom:10,scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}
        onTouchStart={e=>e.stopPropagation()} >
        {items.map((a,i)=><SC key={i} a={a} tap={()=>oSpot(a.spot)}/>)}
        <div style={{flexShrink:0,width:6}}/>
      </div>
      <style>{`.sc-scroll::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

function Em({t:text}){const t=useT();return<div style={{background:t.card,border:`1px solid ${t.cb}`,borderRadius:14,padding:"24px 16px",textAlign:"center",color:t.tf,fontSize:15,marginBottom:8}}>{text}</div>;}

createRoot(document.getElementById("root")).render(<App/>);

// ── SERVICE WORKER (offline + meldingen) ──
if("serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{});});}
