import test from 'node:test';
import assert from 'node:assert/strict';
import {nextWidgetId,windguruScriptUrl,WINDGURU_URL,WINDFINDER_URL} from '../src/wind-widget-config.js';
test('Oranjeplaat gebruikersspot en expliciete Arnemuiden-omgevingslink',()=>{
 assert.equal(WINDGURU_URL,'https://widget.windguru.cz/216253');
 assert.equal(WINDFINDER_URL,'https://www.windfinder.com/weatherforecast/arnemuiden_zeeland_netherlands');
});
test('exact UID-formaat, uniek bij gelijke tijd en directe officiële loader',()=>{
 const a=nextWidgetId(100),b=nextWidgetId(100);
 assert.match(a,/^wg_fwdg_216253_3_\d+$/);assert.notEqual(a,b);
 const url=new URL(windguruScriptUrl(a));
 assert.equal(url.origin,'https://www.windguru.cz');
 assert.equal(url.searchParams.get('s'),'216253');
 assert.equal(url.searchParams.get('m'),'3');
 assert.equal(url.searchParams.get('wj'),'knots');
 assert.equal(url.searchParams.get('hrsm'),'3');
 assert.equal(url.searchParams.get('p'),'WINDSPD,GUST,MWINDSPD,SMER,TMPE,FLHGT,CDC,APCP1s,RATING');
 assert.equal(url.searchParams.has('idbs'),false);
 assert.throws(()=>windguruScriptUrl('<script>'));
});

test('Home heeft één widget onder weekblok en geen oude externe tab',async()=>{
 const {readFile}=await import('node:fs/promises');
 const app=await readFile(new URL('../src/app.jsx',import.meta.url),'utf8');
 assert.equal((app.match(/<WindForecasts /g)||[]).length,1);
 assert.equal((app.match(/<Home /g)||[]).length,1);
 assert.ok(app.indexOf('Toon hele week')<app.indexOf('<WindForecasts '));
 assert.ok(!app.includes('windwidgets'));
 assert.ok(app.includes('<div hidden={view!=="home"||loading}>'));
});
