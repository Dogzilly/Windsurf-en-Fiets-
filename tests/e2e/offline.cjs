// Offline-test: eerst online laden (SW installeert + cachet), dan offline herladen.
const {chromium}=require(process.env.PLAYWRIGHT||'playwright-core');
const BASE=process.argv[2]||'http://127.0.0.1:8642/';const OUT=process.argv[3]||'shots/';
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p.goto(BASE,{waitUntil:'load'});
  await p.evaluate(()=>navigator.serviceWorker.ready);
  await p.reload({waitUntil:'load'});await p.waitForTimeout(6000); // nu onder controle van SW, API-responses in cache
  const controlled=await p.evaluate(()=>!!navigator.serviceWorker.controller);
  const caches=await p.evaluate(async()=>{const o={};for(const k of await caches.keys()){o[k]=(await (await caches.open(k)).keys()).length}return o});
  await ctx.setOffline(true);
  p.on('console',m=>{if(m.type()==='error')errs.push('console(offline): '+m.text())});
  await p.reload({waitUntil:'load'});await p.waitForTimeout(4000);
  const txt=await p.evaluate(()=>document.getElementById('root').innerText);
  const ok=/Dashboard/.test(txt)&&/kn/.test(txt);
  await p.screenshot({path:OUT+'wf-v4-offline-390.png'});
  console.log(JSON.stringify({controlled,caches,offlineRendered:ok,hasForecast:/Deze week/.test(txt),snippet:txt.slice(0,160).replace(/\n/g,' | '),errs}));
  await b.close();process.exit(ok?0:1);
})();
