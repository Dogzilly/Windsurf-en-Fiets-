import test from 'node:test';
import assert from 'node:assert/strict';
import {windguruDocument, WINDGURU_URL, WINDFINDER_URL} from '../src/wind-widget-config.js';
test('officiële Brouwersdam widgetparameters en credits blijven extern', () => {
 const html=windguruDocument('wg_fwdg_97_100_test_1');
 assert.ok(html.includes('https://www.windguru.cz/js/widget.php?s=97&amp;m=100'));
 for(const value of ['wj=bft','lng=nl','fhours=240','id="wg_fwdg_97_100_test_1"']) assert.ok(html.includes(value));
 assert.ok(!html.includes('addEventListener'));
 assert.equal(WINDGURU_URL,'https://widget.windguru.cz/97');
 assert.equal(WINDFINDER_URL,'https://www.windfinder.com/forecast/brouwersdam');
});
test('unieke ids en onveilige invoer',()=>{
 assert.notEqual(windguruDocument('wg_fwdg_97_100_1'),windguruDocument('wg_fwdg_97_100_2'));
 assert.throws(()=>windguruDocument('<script>'));
});
