import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDivision,centreDivision} from '../src/commands/interiors.ts';
import {applySimplePreset} from '../src/commands/simple-presets.ts';
import {presets} from '../src/catalogue/presets.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {isSimpleCabinet} from '../src/domain/simple-cabinet.ts';
test('size presets apply the suggested properties without enabling advanced construction or fittings',()=>{
 for(const p of presets){const c=createCabinet(),next=applySimplePreset(c,p.id);assert.deepEqual(next.envelope,{...c.envelope,width:p.width,height:p.height,depth:p.depth});assert.deepEqual(next.installation,c.installation);assert.deepEqual(next.carcass,c.carcass);assert.ok(isSimpleCabinet(next));}
});
test('presets preserve centred mixed interiors and stable identities in one Undo step',()=>{
 const c=createCabinet(),d=addDivision(c,c.compartments.id,'vertical',282),centered=centreDivision(d.cabinet,d.featureId),opening=evaluate(centered).openings[0],s=addDivision(centered,opening.id,'horizontal',342),furnished=centreDivision(s.cabinet,s.featureId),next=applySimplePreset(furnished,'tall'),e=evaluate(next),store=new CabinetStore(furnished);assert.equal(e.divisions.find(p=>p.id===s.featureId)!.before,e.divisions.find(p=>p.id===s.featureId)!.after);assert.deepEqual(e.divisions.map(p=>p.id),evaluate(furnished).divisions.map(p=>p.id));assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,furnished);
});
