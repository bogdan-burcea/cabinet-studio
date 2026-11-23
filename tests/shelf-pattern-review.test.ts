import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setStockThickness} from '../src/commands/stock.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {addSimpleAdjustable,positionShelfHoles,setShelfHoles,moveAdjustable,changeSimpleShelfKind} from '../src/commands/adjustable.ts';
import {shelfPattern} from '../src/rules/shelf-pattern.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} versus ${b}`);
function opposing(thickness=18){const c=setStockThickness(createCabinet(),thickness),d=addDivision(c,c.compartments.id,'vertical',(600-2*thickness)/2),o=evaluate(d.cabinet).openings,a=addSimpleAdjustable(d.cabinet,o[0].id),b=addSimpleAdjustable(a.cabinet,o[1].id);return {c:b.cabinet,divider:d.featureId,ids:[a.featureId,b.featureId]};}
test('Cabineo counts 1–20 remain editable: a pair centres within maximum spacing instead of failing',()=>{
 const c=setCabineo(createCabinet(),'cabineo-8');for(const count of [1,2,3,4,10,20]){const e=evaluate(setCnc(c,{cabineoPerSide:count}));assert.equal(e.cabineo.length,4*count);const row=e.cabineo.filter(j=>j.hostId.endsWith('/bottom')&&j.id.includes('/-1/')).map(j=>j.bores[0].point[2]).sort((a,b)=>a-b);if(count>1)for(let i=1;i<row.length;i++)assert.ok(row[i]-row[i-1]>=20-1e-6&&row[i]-row[i-1]<=300+1e-6);close((row[0]+row[row.length-1])/2,280);}
});
test('back pilots have four single corner holes, with centred top/bottom holes inside the sides',()=>{
 const c=setBackPanel(createCabinet(),{mode:'applied',pilots:{revision:'back-pilot-1',spacing:150,diameter:3}}),bores=evaluate(c).drilling;
 for(const x of [9,591])for(const y of [9,711])assert.equal(bores.filter(b=>Math.abs(b.point[0]-x)<1e-6&&Math.abs(b.point[1]-y)<1e-6).length,1);
 for(const edge of ['top','bottom']){const row=bores.filter(b=>b.id.includes('/'+edge+'/'));assert.ok(row.every(b=>b.point[0]>18&&b.point[0]<582));close(row[0].point[0]+row[row.length-1].point[0],600);}
});
test('opposing shelves share through holes rather than silently losing one side of a blind pair',()=>{
 const {c,divider}=opposing(),holes=evaluate(c).drilling.filter(b=>b.panelId===divider);assert.equal(holes.length,10);assert.ok(holes.every(b=>b.through&&b.depth===18));
});
test('blind shelf holes are at least 4 mm deep; thin stock shares through holes',()=>{
 for(const thickness of [3,4.9,5,6]){const {c,divider}=opposing(thickness),holes=evaluate(c).drilling.filter(b=>b.panelId===divider);if(thickness<5){assert.equal(holes.length,10);assert.ok(holes.every(b=>b.through&&b.depth===thickness));}else{assert.ok(holes.every(b=>b.through&&b.depth===thickness));const single=createCabinet(),a=addSimpleAdjustable(setStockThickness(single,thickness),single.compartments.id);assert.ok(evaluate(a.cabinet).drilling.every(b=>!b.through&&b.depth>=4&&b.depth<thickness));}}
});
test('hole-set centres and counts stay linked across opposing shelves, including centred resize',()=>{
 const {c,ids}=opposing(),moved=positionShelfHoles(c,[ids[0]],'height',250),store=new CabinetStore(c);assert.ok(moved.contents.every(s=>s.drilling!.center===250&&s.drilling!.anchor==='height'));assert.ok(store.commit(moved));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
 const counted=setShelfHoles(moved,[ids[0]],7);assert.ok(counted.contents.every(s=>s.drilling!.count===7));const centred=positionShelfHoles(counted,[ids[0]],'centre'),resized={...centred,envelope:{...centred.envelope,height:900}},e=evaluate(resized);for(const s of resized.contents){const o=e.openings.find(o=>o.id===s.openingId)!;close(shelfPattern(resized,s,o).center,o.size[1]/2);}assert.deepEqual(readSimpleCabinet(serialize(resized)),resized);
 const drilling=evaluate(c).drilling,active=evaluate(c).adjustable.shelves[0],other=moveAdjustable(c,ids[0],active.position+32);assert.deepEqual(evaluate(other).drilling,drilling);
});
test('shelf construction converts immediately without changing part identity or losing native file support',()=>{
 const base=setCabineo(createCabinet(),'cabineo-8'),fixed=addDivision(base,base.compartments.id,'horizontal',342),adjustable=changeSimpleShelfKind(fixed.cabinet,fixed.featureId,'adjustable');assert.equal(adjustable.contents[0].id,fixed.featureId);assert.ok(evaluate(adjustable).drilling.length);assert.deepEqual(readSimpleCabinet(serialize(adjustable)),adjustable);const restored=changeSimpleShelfKind(adjustable,fixed.featureId,'fixed');assert.equal(evaluate(restored).divisions[0].id,fixed.featureId);assert.equal(restored.contents.length,0);
});
test('new pattern intent is strict, reversible and rejects an unsupported legacy-schema payload',()=>{
 const {c}=opposing(),doc=JSON.parse(serialize(c));assert.equal(doc.schemaVersion,61);for(const mutate of [(d:any)=>d.cabinet.contents[0].drilling.anchor='unknown',(d:any)=>d.cabinet.contents[0].drilling.center='250',(d:any)=>d.cabinet.contents[0].drilling.opposed='blind',(d:any)=>d.cabinet.contents[0].drilling.frontInset=-1,(d:any)=>{d.schemaVersion=19;d.evaluatorRevision='drilling-19';}]){const bad=structuredClone(doc);mutate(bad);assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));}const base=createCabinet(),old=JSON.parse(serialize(base));old.schemaVersion=19;old.evaluatorRevision='drilling-19';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:base,migrated:true});
});

test('fractional centred shelves convert to fixed without violating 0.1 mm placement steps',()=>{
 const base=setStockThickness(createCabinet(),19),split=addDivision(base,base.compartments.id,'horizontal',341.5),opening=evaluate(split.cabinet).openings[0],shelf=addSimpleAdjustable(split.cabinet,opening.id),fixed=changeSimpleShelfKind(shelf.cabinet,shelf.featureId,'fixed');assert.doesNotThrow(()=>evaluate(fixed));assert.equal(evaluate(fixed).divisions.find(d=>d.id===shelf.featureId)!.position*10,Math.round(evaluate(fixed).divisions.find(d=>d.id===shelf.featureId)!.position*10));assert.deepEqual(readSimpleCabinet(serialize(fixed)),fixed);
});
