import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setBackFastener,setBackPanel} from '../src/commands/back-panel.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';

test('Ixconnect uses Workshop matched six bores, no back drilling, and compatible intent in one undo step',()=>{
 const c=setCabineo(setBackPanel(createCabinet(),{mode:'applied',thickness:9}),'cabineo-8'),store=new CabinetStore(c),next=setBackFastener(c,true);assert.ok(store.commit(next));
 const e=evaluate(next),f=e.backFasteners;assert.equal(f.length,6);assert.ok(f.every(b=>b.diameter===15&&b.depth===12.5));assert.ok(f.every(b=>!b.panelId.endsWith('/back')));assert.equal(next.materials.back.stock.id,'generic-back-3');assert.equal(next.carcass.back.joint!.mode,'groove');assert.equal(next.carcass.back.joint!.inset,11);
 assert.deepEqual(f.filter(b=>b.panelId.endsWith('/left')).map(b=>+b.point[1].toFixed(1)),[62.1,657.9]);assert.ok(f.every(b=>b.point[2]===12.5));assert.equal(f.find(b=>b.panelId.endsWith('/top'))!.sign,1);assert.equal(f.find(b=>b.panelId.endsWith('/bottom'))!.sign,1);
 assert.ok(e.cabineo.length>0);assert.deepEqual(readSimpleCabinet(serialize(next)),next);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 assert.equal(evaluate(setBackFastener(next,false)).backFasteners.length,0);
});
test('counts and strict stock, captured-back, edge and spacing checks preserve last good intent',()=>{
 const c=setBackFastener(createCabinet(),true),f=c.carcass.back.joint!.fastener!,store=new CabinetStore(c);
 assert.equal(evaluate(setBackPanel(c,{fastener:{...f,perSide:1}})).backFasteners.length,4);
 assert.throws(()=>evaluate(setBackPanel(resizeCabinet(c,'height',600),{fastener:{...f,perSide:20}})),/pitch/);
 for(const patch of [{thickness:6},{mode:'rebate' as const},{depth:7},{inset:10},{fastener:{...f,perSide:21}},{fastener:{...f,perSide:1.5}}]){assert.equal(store.commit(setBackPanel(c,patch)),false);assert.deepEqual(store.getSnapshot().committed,c);}
});
test('schema 14 migrates without adopting back fasteners, malformed fitting pins fail intact',()=>{
 const c=setBackPanel(createCabinet(),{mode:'groove'}),old=JSON.parse(serialize(c));old.schemaVersion=14;old.evaluatorRevision='back-14';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:c,migrated:true});
 const doc=JSON.parse(serialize(setBackFastener(c,true)));for(const mutate of [(d:any)=>d.cabinet.carcass.back.joint.fastener.revision='future',(d:any)=>d.cabinet.carcass.back.joint.fastener.id='invented',(d:any)=>d.cabinet.carcass.back.joint.fastener.extra=true,(d:any)=>{d.schemaVersion=14;d.evaluatorRevision='back-14';}]){const bad=structuredClone(doc);mutate(bad);assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));}
});
