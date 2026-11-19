import {setCnc} from '../src/commands/cnc.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setStockThickness,setPuzzleCorners} from '../src/commands/stock.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setBackFastener} from '../src/commands/back-panel.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {machiningReview} from '../src/rules/machining-review.ts';
import {panelDisplayGeometry} from '../src/viewport/part-mesh.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import type {BufferGeometry} from 'three';
function volume(g:BufferGeometry){const a=g.getAttribute('position'),ix=g.index;let total=0;for(let i=0;i<(ix?.count??a.count);i+=3){const v=[0,1,2].map(j=>{const k=ix?ix.getX(i+j):i+j;return [a.getX(k),a.getY(k),a.getZ(k)];});total+=(v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])-v[0][1]*(v[1][0]*v[2][2]-v[1][2]*v[2][0])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]))/6;}g.dispose();return total;}

test('Cabineo housing face adapts to incoming shelf bores for one-side divider machining',()=>{
 const c=createCabinet(),d=addDivision(c,c.compartments.id,'vertical',282),left=evaluate(d.cabinet).openings[0],s=addDivision(d.cabinet,left.id,'horizontal',342),e=evaluate(setCabineo(s.cabinet,'cabineo-8')),bores=e.cabineo.flatMap(j=>j.bores).filter(b=>b.panelId===d.featureId);
 assert.equal(new Set(bores.map(b=>b.sign)).size,1);assert.equal(bores[0].sign,1);assert.ok(!e.issues.some(i=>i.code==='machining-faces'));
 const both=addDivision(s.cabinet,evaluate(s.cabinet).openings.find(o=>o.label==='Opening 3')!.id,'horizontal',342),opposed=evaluate(setCabineo(both.cabinet,'cabineo-8'));assert.ok(opposed.cabineo.flatMap(j=>j.bores).some(b=>b.panelId===d.featureId&&b.through));assert.ok(!opposed.issues.some(i=>i.code==='machining-faces'&&i.featureId===d.featureId));
});
test('interference review reports a third panel crossing a fastener without flagging its intended receiver',()=>{
 const e=evaluate(setCabineo(createCabinet(),'cabineo-8')),j=e.cabineo[0],b=j.bores[1],fake={id:'obstruction',role:'divider',center:[...b.point] as [number,number,number],size:[10,10,10] as [number,number,number],orientation:'yz' as const};assert.ok(machiningReview([...e.panels,fake],e.cabineo,[],[]).some(i=>i.code==='machining-collision'&&i.message.includes('divider')));assert.ok(!machiningReview(e.panels,e.cabineo,[],[]).some(i=>i.code==='machining-collision'));
});
test('real blind bores remove the analytic overlapping triple-circle volume, without cylinder overlay geometry',()=>{
 const e=evaluate(setCabineo(createCabinet(),'cabineo-8')),panel=e.panels.find(p=>p.role==='bottom')!,bores=e.cabineo.find(j=>j.hostId===panel.id)!.bores.filter(b=>b.kind==='housing'),base=panel.size.reduce((n,v)=>n*v,1),r=7.5,d=11.2;
 const lens=2*r*r*Math.acos(d/(2*r))-d/2*Math.sqrt(4*r*r-d*d),cap=r*r*Math.acos(3.6/r)-3.6*Math.sqrt(r*r-3.6*3.6),removed=(3*Math.PI*r*r-2*lens-cap)*11;
 const actual=base-volume(panelDisplayGeometry(panel,[],bores));assert.ok(Math.abs(actual-removed)/removed<.006,`${actual} versus ${removed}`);
});
test('puzzle corners partition the same cabinet volume and retain stock, interior and native identities',()=>{
 for(const t of [12,15,16,18,19,22,24]){
  const c=setCnc(setStockThickness(createCabinet(),t),{tolerance:0}),p=setCnc(setPuzzleCorners(c,true),{dogbones:false}),e=evaluate(p);assert.ok(e.pockets.some(p=>p.kind==='puzzle'));assert.deepEqual(e.panels.map(p=>p.id),evaluate(c).panels.map(p=>p.id));assert.deepEqual(readSimpleCabinet(serialize(p)),p);
  const base=evaluate(c).panels.reduce((n,p)=>n+p.size.reduce((v,k)=>v*k,1),0),cut=e.panels.reduce((n,p)=>n+volume(panelDisplayGeometry(p,e.pockets)),0);assert.ok(Math.abs(base-cut)<20,`stock ${t}: ${base} / ${cut}`);
 }
 const c=createCabinet(),s=addDivision(c,c.compartments.id,'horizontal',342),e=evaluate(setPuzzleCorners(setCabineo(s.cabinet,'cabineo-8'),true));assert.ok(e.cabineo.every(j=>j.hostId===s.featureId));assert.deepEqual(e.divisions.map(d=>d.id),[s.featureId]);
});
test('stock and puzzle changes are reversible; invalid dependencies preserve the previous cabinet; version 15 migrates unchanged',()=>{
 const c=createCabinet(),store=new CabinetStore(c),p=setPuzzleCorners(setStockThickness(c,19),true);assert.ok(store.commit(p));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,p);
 const f=setBackFastener(c,true),fs=new CabinetStore(f);assert.equal(fs.commit(setStockThickness(f,12)),false);assert.deepEqual(fs.getSnapshot().committed,f);
 const doc=JSON.parse(serialize(c));doc.schemaVersion=15;doc.evaluatorRevision='back-fixings-15';assert.deepEqual(deserializeWithInfo(JSON.stringify(doc)),{cabinet:c,migrated:true});
 const bad=JSON.parse(serialize(p));bad.cabinet.carcass.corner.pitch=0;assert.throws(()=>readSimpleCabinet(JSON.stringify(bad)));
});
