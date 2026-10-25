// Headless smoke-test: node tests/e2e/smoke.cjs [baseUrl] [shotDir]
const PW=process.env.PLAYWRIGHT||'playwright-core';
const {chromium}=require(PW);
const BASE=process.argv[2]||'http://127.0.0.1:8765/';
const OUT=process.argv[3]||'shots/';
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
  let fail=0;
  for(const vp of [{w:1280,h:900,mob:false},{w:390,h:844,mob:true}]){
    const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:vp.mob?2:1,isMobile:vp.mob,hasTouch:vp.mob});
    const p=await ctx.newPage();const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
    p.on('pageerror',e=>errs.push('pageerror: '+e.message));
    p.on('requestfailed',r=>{const u=r.url();if(!/youtube|ytimg|google|tile|doubleclick/.test(u))errs.push('reqfail: '+u+' '+r.failure()?.errorText)});
    await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(6000);
    const tag=vp.w;
    await p.screenshot({path:`${OUT}wf-v4-home-${tag}.png`});
    await p.screenshot({path:`${OUT}wf-v4-home-${tag}-full.png`,fullPage:true});
    const ow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(ow>0){errs.push('horizontal overflow '+ow+'px');}
    const clickTab=async name=>{const btn=p.getByRole('button',{name:new RegExp('^\\W*'+name,'i')}).first();if(await btn.count()){await btn.click();await p.waitForTimeout(1500);return true}return false};
    const views={};
    for(const tab of ['Spots','Alerts','Settings']){views[tab]=await clickTab(tab);await p.screenshot({path:`${OUT}wf-v4-${tab.toLowerCase()}-${tag}.png`,fullPage:tab==='Settings'});}
    if(vp.mob){views.Meer=await clickTab('Meer');await p.screenshot({path:`${OUT}wf-v4-meer-${tag}.png`});}
    views.Kaart=await clickTab('Kaart');await p.waitForTimeout(3000);await p.screenshot({path:`${OUT}wf-v4-kaart-${tag}.png`});
    // detail
    await clickTab('Spots');
    const first=p.getByText('Oranjeplaat').first();
    if(await first.count()){await first.click();await p.waitForTimeout(3000);await p.screenshot({path:`${OUT}wf-v4-detail-${tag}.png`,fullPage:true});views.Detail=true;}
    const ow2=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    console.log(JSON.stringify({vp:tag,views,overflowDetail:ow2,errors:errs}));
    if(errs.length)fail++;
    await ctx.close();
  }
  await b.close();process.exit(fail?1:0);
})();
