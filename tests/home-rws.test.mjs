import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app.jsx',import.meta.url),'utf8');
test('Home plaatst RWS wind direct boven watertemperatuur voor Oranjeplaat',()=>{
  const home=source.split('// ── HOME ──')[1].split('function LiveBlock')[0];
  assert.match(home, /<LiveBlock spot=\{\{name:"Oranjeplaat",lat:51\.5145,lon:3\.7037\}\}[^>]*windOnly\/>\s*<WaterTempBanner/);
});
test('Home gebruikt dezelfde geldigheidscontrole en toont geen dubbele waterkaart',()=>{
  assert.match(source,/const ws=validWindStatus\(found,now\)\?found:null/);
  assert.match(source,/const ts=!windOnly&&rws\?nearSt/);
  assert.match(source,/if\(!ws&&!ts\)return<Em t="Geen verse RWS-meting binnen 40 km/);
});
