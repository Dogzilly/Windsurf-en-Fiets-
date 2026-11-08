import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validWindStatus} from '../src/live-status.js';
test('groen led alleen bij verse geldige wind binnen 40km',()=>{
 const now=Date.parse('2026-11-08T08:00:00Z');const st={wind_ms:3,km:40,wind_ts:'2026-11-08T05:00:00Z'};
 assert.ok(validWindStatus(st,now));assert.ok(!validWindStatus(st,now+1));
 assert.ok(validWindStatus({...st,wind_ms:0},now));
 for(const bad of [null,{...st,km:41},{...st,wind_ms:-1},{...st,wind_ms:NaN},{...st,wind_ts:'invalid'},{...st,wind_ts:'2026-11-08T09:00:00Z'}])assert.ok(!validWindStatus(bad,now));
});
test('wind en temperatuur hebben dezelfde kaartklasse, status ververst en motion gerespecteerd',async()=>{
 const app=await readFile(new URL('../src/app.jsx',import.meta.url),'utf8');
 const css=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
 const block=app.slice(app.indexOf('function LiveBlock'),app.indexOf('function Detail'));
 assert.equal((block.match(/className="measurement-card"/g)||[]).length,2);
 assert.ok(block.includes('validWindStatus(found,now)'));assert.ok(block.includes('setInterval(()=>setNow(Date.now()),1000)'));
 assert.ok(block.includes('ws&&<div'));assert.ok(css.includes('.live-status-led{animation:none}'));
 assert.ok(css.includes('min-height:116px'));assert.ok(css.includes('rws-status 1.8s'));
});
test('statisch windsurfericoon zonder afbeelding of dagafhankelijkheid',async()=>{
 const icon=await readFile(new URL('../src/windsurfer-icon.jsx',import.meta.url),'utf8');
 const app=await readFile(new URL('../src/app.jsx',import.meta.url),'utf8');
 assert.ok(icon.includes('🏄'));assert.ok(!icon.includes('<img'));assert.ok(!app.includes('DailyLogo'));
 assert.ok(!app.includes('icon:"⛵",l:"Home"'));assert.ok(app.includes('<WindsurferIcon/>'));
});
