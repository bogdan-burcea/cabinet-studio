import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {addInteriors,setInteriorInsets} from '../src/commands/simple-interiors.ts';
import {addSimpleAdjustable} from '../src/commands/adjustable.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setStockThickness} from '../src/commands/stock.ts';
import {backPilotCounts} from '../src/rules/applied-back.ts';
import {addDogbones} from '../src/rules/dogbones.ts';
import {explodedLayout} from '../src/viewport/display.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} versus ${b}`);
function split(){const c=createCabinet(),d=addDivision(c,c.compartments.id,'vertical',282);return {c:d.cabinet,divider:d.featureId,ids:evaluate(d.cabinet).openings.map(o=>o.id)};}
test('bulk opening creation supports all three interior kinds, preserves IDs and is one undo step',()=>{
 for(const kind of ['fixed','adjustable','divider'] as const){const {c,ids}=split(),store=new CabinetStore(c),result=addInteriors(c,ids,kind,30);assert.equal(result.featureIds.length,2);assert.equal(new Set(result.featureIds).size,2);assert.ok(store.commit(result.cabinet));assert.deepEqual(readSimpleCabinet(serialize(result.cabinet)),result.cabinet);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,result.cabinet);const e=evaluate(result.cabinet);for(const id of result.featureIds){const p=e.panels.find(p=>p.id===id)!;close(p.center[2]+p.size[2]/2,c.envelope.depth-30);}}
});
test('front insets default to zero and edit fixed/adjustable shelves and dividers without changing their identity',()=>{
 const {c,ids}=split();for(const kind of ['fixed','adjustable','divider'] as const){const a=addInteriors(c,[ids[0]],kind),moved=setInteriorInsets(a.cabinet,a.featureIds,150),before=evaluate(a.cabinet),after=evaluate(moved);assert.deepEqual(after.panels.map(p=>p.id),before.panels.map(p=>p.id));close(after.panels.find(p=>p.id===a.featureIds[0])!.size[2],before.panels.find(p=>p.id===a.featureIds[0])!.size[2]-150);assert.deepEqual(readSimpleCabinet(serialize(moved)),moved);}
});
test('thin opposing shelves share the divider holes without offsets, including different front insets',()=>{
 const base=setStockThickness(createCabinet(),3),d=addDivision(base,base.compartments.id,'vertical',294),ids=evaluate(d.cabinet).openings.map(o=>o.id),a=addInteriors(d.cabinet,ids,'adjustable'),c=setInteriorInsets(a.cabinet,[a.featureIds[1]],80),holes=evaluate(c).drilling.filter(b=>b.panelId===d.featureId);assert.equal(holes.length,10);assert.ok(holes.every(b=>b.through&&b.depth===3));assert.equal(new Set(holes.map(b=>b.point[2])).size,2);
});
test('automatic pilot counts follow the minimum spacing while retaining exactly four corners',()=>{
 const base=createCabinet(),c=setBackPanel(base,{mode:'applied'}),defaultCount=backPilotCounts(c);assert.deepEqual(defaultCount,{vertical:4,horizontal:1,spacing:200});assert.equal(evaluate(c).drilling.length,10);
 for(const spacing of [100,200,400,2000]){const next=setBackPanel(c,{pilots:{revision:'back-pilot-1',spacing,diameter:3}}),e=evaluate(next),counts=backPilotCounts(next);assert.equal(e.drilling.length,2*(counts.vertical+counts.horizontal));for(const x of [9,591])for(const y of [9,711])assert.equal(e.drilling.filter(b=>b.point[0]===x&&b.point[1]===y).length,1);const ys=e.drilling.filter(b=>b.id.includes('/left/')).map(b=>b.point[1]);if(spacing<=702)for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>=spacing-1e-6);}
});
test('dogbones follow the remaining union profile and omit straight, convex and already-open corners',()=>{
 const c=setCnc(createCabinet(),{dogbones:true,bitDiameter:4}),panel={id:'back',role:'back' as const,origin:[0,0,0] as [number,number,number],size:[100,100,6] as [number,number,number]},cuts=[{id:'a',panelId:'back',origin:[0,0,0] as [number,number,number],size:[20,50,6] as [number,number,number],axis:2 as const,face:-1 as const},{id:'b',panelId:'back',origin:[20,0,0] as [number,number,number],size:[30,50,6] as [number,number,number],axis:2 as const,face:-1 as const}],next=addDogbones(c,[panel],cuts);assert.equal(next[0].reliefs!.length,0);assert.equal(next[1].reliefs!.length,1);
 const back=setBackPanel(c,{mode:'finger',thickness:6}),e=evaluate(back),corners=e.pockets.filter(p=>p.id.includes('/back-finger/back/corner'));assert.ok(corners.length);assert.ok(corners.filter(p=>p.origin[0]===0||p.origin[1]===0).every(p=>!p.reliefs?.length));assert.ok(e.pockets.some(p=>p.reliefs?.length));
});
test('exploded display bounds do not collide for nested fixed and adjustable interiors and never mutate the cabinet',()=>{
 const base=createCabinet(),s=addDivision(base,base.compartments.id,'horizontal',342),d=addDivision(s.cabinet,evaluate(s.cabinet).openings[0].id,'vertical',282),openings=evaluate(d.cabinet).openings,added=addInteriors(d.cabinet,openings.map(o=>o.id),'adjustable'),c=added.cabinet,copy=structuredClone(c),panels=evaluate(c).panels,offsets=explodedLayout(panels,80);
 for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){const a=panels[i],b=panels[j],oa=offsets.get(a.id)!,ob=offsets.get(b.id)!;assert.ok(![0,1,2].every(k=>Math.min(a.center[k]+oa[k]+a.size[k]/2,b.center[k]+ob[k]+b.size[k]/2)-Math.max(a.center[k]+oa[k]-a.size[k]/2,b.center[k]+ob[k]-b.size[k]/2)>1e-6),`${a.label} / ${b.label}`);}assert.deepEqual(c,copy);
});
test('old offset settings and manual pilot counts migrate to shared holes and automatic spacing',()=>{
 const {c,ids}=split(),a=addInteriors(c,ids,'adjustable'),doc=JSON.parse(serialize(setBackPanel(a.cabinet,{mode:'applied'})));assert.equal(doc.schemaVersion,61);doc.schemaVersion=20;doc.evaluatorRevision='shelf-patterns-20';doc.cabinet.carcass.back.joint.pilots={revision:'back-pilot-1',perEdge:4,diameter:3};for(const s of doc.cabinet.contents){s.drilling.opposed='offset';s.drilling.frontInset=45;s.drilling.rearInset=45;}const loaded=deserializeWithInfo(JSON.stringify(doc));assert.ok(loaded.migrated);assert.equal(loaded.cabinet.carcass.back.joint!.pilots!.spacing,200);assert.ok(loaded.cabinet.contents.every(s=>!('opposed' in s.drilling!)&&!('frontInset' in s.drilling!)));assert.deepEqual(readSimpleCabinet(serialize(loaded.cabinet)),loaded.cabinet);
});
