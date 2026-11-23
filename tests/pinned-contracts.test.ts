import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {pinnedConstruction} from './helpers/pinned-construction';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/pinned-construction.json',import.meta.url),'utf8'));
test('pinned pre-drawer construction, drilling, ANTARO and Blum hinge geometry stay unchanged',async()=>{
 const actual=await pinnedConstruction();
 for(const [name,expected] of Object.entries(baseline.cases))assert.deepEqual(actual[name],expected,`Pinned behavior changed: ${name}. Inspect the output difference; do not refresh this baseline to make the test pass.`);
});
test('eBay Evo and manufacturing dependency pins stay exact',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(p.dependencies['@ebay/skin'],'19.39.0');assert.equal(p.dependencies.three,'0.180.0');assert.equal(p.dependencies.replicad,'1.2.1');
});
