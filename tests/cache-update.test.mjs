import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installUpdateFlow} from '../src/update-client.js';
function harness(controlled=true,storage=new Map()) {
 let changed,loaded,reloads=0;const calls=[];
 const win={navigator:{serviceWorker:{controller:controlled?{}:null,addEventListener:(e,fn)=>changed=fn,register:async(...args)=>{calls.push(args);return {update:async()=>{}}}}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},location:{pathname:'/Windsurf-en-Fiets-/',reload:()=>reloads++},addEventListener:(e,fn)=>loaded=fn};
 installUpdateFlow(win,'4.2.1');return{change:()=>changed(),load:()=>loaded(),reloads:()=>reloads,calls,storage};
}
test('bestaande controller één reload per versie, ook over herladen sessie',()=>{
 const h=harness();h.change();h.change();assert.equal(h.reloads(),1);
 const again=harness(true,h.storage);again.change();assert.equal(again.reloads(),0);
});
test('eerste installatie reloadt niet, SW-update omzeilt HTTPcache',async()=>{
 const h=harness(false);h.change();assert.equal(h.reloads(),0);await h.load();
 assert.deepEqual(h.calls[0],['sw.js?v=4.2.1',{updateViaCache:'none'}]);
});
test('oude ignoreSearch SW kan versiegebonden assetPAD niet verwarren',()=>{
 const old=new URL('https://x.test/app.js?v=4.1.2');
 const queryOnly=new URL('https://x.test/app.js?v=4.2.1');
 const newPath=new URL('https://x.test/app-v4.2.1.js');
 assert.equal(old.pathname,queryOnly.pathname);assert.notEqual(old.pathname,newPath.pathname);
});
test('precaching en exact scoped match, geen globale legacycachedelete',async()=>{
 const sw=await readFile(new URL('../src/sw.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
 const build=await readFile(new URL('../build.mjs',import.meta.url),'utf8');
 assert.ok(!sw.includes('ignoreSearch: true'));assert.ok(!sw.includes('caches.match('));
 assert.ok(sw.includes('k.startsWith(PREFIX + "shell-")'));assert.ok(sw.includes('self.clients.claim()'));
 assert.ok(html.includes('app-v%VERSION%.js'));assert.ok(html.includes('update-v%VERSION%.js'));
 assert.ok(build.includes('"app-v" + VERSION + ".js", "update-v" + VERSION + ".js"'));
});
test('echte SW-handler: exacte cache-URL, offlinefallback en scopeveilige activatie',async()=>{
 const {runInNewContext}=await import('node:vm');
 let source=await readFile(new URL('../src/sw.js',import.meta.url),'utf8');
 source=source.replace(/^import .*;\n/m,'');
 const handlers={},removed=[];
 const prefix='wf-windsurf-fiets-'+encodeURIComponent('/Windsurf-en-Fiets-/')+'-';
 const stores=new Map([[prefix+'shell-4.2.1',new Map([
 ['https://x.test/Windsurf-en-Fiets-/app-v4.2.1.js','NEW'],
 ['https://x.test/Windsurf-en-Fiets-/index.html','OFFLINE_HTML']])],['wf-shell-4.1.2',new Map()],['other-app-cache',new Map()],[prefix+'shell-4.2.0',new Map()]]);
 const caches={keys:async()=>[...stores.keys()],delete:async k=>{removed.push(k);stores.delete(k)},open:async name=>{
  const store=stores.get(name)||new Map();stores.set(name,store);
  return{match:async(req,opts)=>{assert.equal(opts?.ignoreSearch,false);return store.get(typeof req==='string'?new URL(req,'https://x.test/Windsurf-en-Fiets-/').href:req.url)},put:()=>{}};
 }};
 let network=0,claimed=0;
 runInNewContext(source,{__VERSION__:'4.2.1',__PRECACHE__:[],URL,caches,fetch:async()=>{network++;throw Error('offline')},Response,
 self:{registration:{scope:'https://x.test/Windsurf-en-Fiets-/'},location:{origin:'https://x.test'},clients:{claim:async()=>claimed++},addEventListener:(e,f)=>handlers[e]=f}});
 let result;handlers.fetch({request:{method:'GET',url:'https://x.test/Windsurf-en-Fiets-/app-v4.2.1.js',mode:'cors'},respondWith:p=>result=p});
 assert.equal(await result,'NEW');assert.equal(network,0);
 handlers.fetch({request:{method:'GET',url:'https://x.test/Windsurf-en-Fiets-/?v=421',mode:'navigate'},respondWith:p=>result=p});
 assert.equal(await result,'OFFLINE_HTML');assert.equal(network,1);
 let activation;handlers.activate({waitUntil:p=>activation=p});await activation;
 assert.deepEqual(removed,[prefix+'shell-4.2.0']);assert.equal(claimed,1);
});
