import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {cnc} from '../src/rules/cnc.ts';
import {setPuzzleCorners} from '../src/commands/stock.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {addDivision,setInteriorFinger} from '../src/commands/interiors.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} versus ${b}`);
test('corner mating edges receive half-offsets and leave exactly the requested fit clearance',()=>{
 const c=setPuzzleCorners(createCabinet(),true),e=evaluate(c),left=e.pockets.find(p=>p.panelId.endsWith('/left')&&p.id.endsWith('/0'))!,top=e.pockets.find(p=>p.panelId.endsWith('/top')&&p.id.endsWith('/2'))!;
 close(left.origin[2]+left.size[2]-top.origin[2],.2);
 const zero=evaluate(setCnc(c,{tolerance:0})),l0=zero.pockets.find(p=>p.id===left.id)!,t0=zero.pockets.find(p=>p.id===top.id)!;close(left.origin[2]+left.size[2]-(l0.origin[2]+l0.size[2]),.1);close(t0.origin[2]-top.origin[2],.1);
});
test('shelf/divider receiving slots ease stock thickness by 0.2 mm with centred 0.1 mm offsets',()=>{
 for(const axis of ['horizontal','vertical'] as const){const c=createCabinet(),d=addDivision(c,c.compartments.id,axis,axis==='horizontal'?342:282),layout=evaluate(d.cabinet),part=layout.panels.find(p=>p.id===d.featureId)!,e=evaluate(setInteriorFinger(d.cabinet,d.featureId,true)),slot=e.pockets.find(p=>p.panelId!==d.featureId)!,normal=axis==='horizontal'?1:0;close(slot.size[normal],18.2);close(part.center[normal]-part.size[normal]/2-slot.origin[normal],.1);}
});
test('back slots retain their fit width under oversized cutters and never generate impossible relief',()=>{
 const base=setBackPanel(createCabinet(),{mode:'groove',thickness:3});
 for(const bitDiameter of [3,6,12]){const c=setCnc(base,{dogbones:true,bitDiameter}),e=evaluate(c);assert.equal(cnc(c).tolerance,.2);for(const cut of e.pockets){close(cut.size[2],3.2);if(bitDiameter>3.2)assert.equal(cut.reliefs?.length,0);}assert.equal(e.issues.some(i=>i.code==='machining-tool-width'),bitDiameter>3.2);}
});
test('matched fitting bore dimensions never inherit the wooden fit allowance',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8'),sizes=(tolerance:number)=>evaluate(setCnc(c,{tolerance})).cabineo.flatMap(j=>j.bores).map(b=>[b.diameter,b.depth]);assert.deepEqual(sizes(0),sizes(.2));
});
test('native 21 round trips and version 17 retains explicit saved fit values and part identities',()=>{
 const c=setCnc(setPuzzleCorners(createCabinet(),true),{tolerance:2}),doc=JSON.parse(serialize(c));assert.equal(doc.schemaVersion,56);assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:c,migrated:false});doc.schemaVersion=17;doc.evaluatorRevision='cnc-17';assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:c,migrated:true});assert.equal(cnc(createCabinet()).tolerance,.2);
});
