import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addSimpleAdjustable,addAdjustable,removeAdjustable} from '../src/commands/adjustable.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {shelfPattern} from '../src/rules/shelf-pattern.ts';
test('multiple adjustable shelves in one opening start at distinct free positions without moving existing shelves',()=>{
 let c=createCabinet();const opening=c.compartments.id,store=new CabinetStore(c),ids:string[]=[];
 for(let i=0;i<3;i++){const before=evaluate(c),next=addSimpleAdjustable(c,opening,12);assert.ok(store.commit(next.cabinet));ids.push(next.featureId);const e=evaluate(next.cabinet);assert.equal(e.openings.length,1);assert.equal(e.adjustable.shelves.length,i+1);assert.equal(next.cabinet.contents.at(-1)!.frontSetback,12);for(const old of before.adjustable.shelves)assert.equal(e.adjustable.shelves.find(s=>s.id===old.id)!.position,old.position);for(const a of e.adjustable.shelves)for(const b of e.adjustable.shelves)if(a.id!==b.id)assert.ok(Math.abs(a.position-b.position)>=78);assert.deepEqual(deserialize(serialize(next.cabinet)),next.cabinet);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next.cabinet);c=next.cabinet;}
 const e=evaluate(c),o=e.openings[0],patterns=c.contents.map(s=>shelfPattern(c,s,o));for(const p of patterns)for(const y of p.ys)assert.ok(Math.abs((y-patterns[0].ys[0])/32-Math.round((y-patterns[0].ys[0])/32))<1e-6);assert.ok(!e.issues.some(i=>i.code==='machining-hole-collision'));assert.deepEqual(removeAdjustable(c,ids[1]).contents.map(s=>s.id),[ids[0],ids[2]]);
 let additions=3;while(additions<20){try{const next=addSimpleAdjustable(c,opening);assert.doesNotThrow(()=>evaluate(next.cabinet));c=next.cabinet;additions++;}catch(e){assert.match((e as Error).message,/No space for another adjustable shelf/);break;}}assert.ok(additions>=3&&additions<20);assert.deepEqual(deserialize(serialize(c)),c);
});
test('additional opposing shelves match an available partner rather than reusing the already occupied first shelf level',()=>{
 const base=createCabinet(),d=addDivision(base,base.compartments.id,'vertical',282),[left,right]=evaluate(d.cabinet).openings.map(o=>o.id);let c=d.cabinet;const rows:string[][]=[[],[]];for(let n=0;n<2;n++)for(const [index,opening] of [left,right].entries()){const next=addSimpleAdjustable(c,opening);c=next.cabinet;rows[index].push(next.featureId);assert.doesNotThrow(()=>evaluate(c));}
 const e=evaluate(c);for(let n=0;n<2;n++){const a=e.adjustable.shelves.find(s=>s.id===rows[0][n])!,b=e.adjustable.shelves.find(s=>s.id===rows[1][n])!;assert.equal(a.position,b.position);}assert.notEqual(e.adjustable.shelves[0].position,e.adjustable.shelves[2].position);assert.ok(e.drilling.filter(b=>b.kind==='shelf-support'&&b.panelId===d.featureId).every(b=>b.through));assert.deepEqual(deserialize(serialize(c)),c);
});
test('legacy support-level placement also compares actual shelf heights rather than an anchored pattern index',()=>{
 const base=createCabinet(),first=addSimpleAdjustable(base,base.compartments.id),next=addAdjustable(first.cabinet,base.compartments.id),e=evaluate(next.cabinet);assert.equal(e.adjustable.shelves.length,2);assert.ok(Math.abs(e.adjustable.shelves[0].position-e.adjustable.shelves[1].position)>=78);
});
