import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDrawerStack} from '../src/commands/drawers.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {addInteriorBatch} from '../src/commands/simple-interiors.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {frontTargets,editFrontFeatures} from '../src/commands/front-features.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {defaultDrawerHandle} from '../src/rules/handles.ts';
import {planSheets} from '../src/cnc/layout.ts';
import {flattenParts,flatPreview} from '../src/cnc/parts.ts';
import {nestAssignedStock,defaultSheet} from '../src/cnc/nesting.ts';
import {cabinetForExport} from '../src/cnc/sheet-export.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
const stack=()=>{const c=createCabinet();return addDrawerStack(c,c.compartments.id,3);};
test('moving a blank constrains its sheet, repacks neighbours and preserves requested quarter turns without overlap',()=>{
 const parts=Array.from({length:5},(_,i)=>({id:'p'+i,label:'P'+i,width:300,height:200,grain:'none' as const})),stock={...defaultSheet,width:800,height:600,gap:10};
 const result=nestAssignedStock(parts,stock,{p0:{sheet:1,rotated:true}});
 const placed=result.sheets[1].placements.find(p=>p.part.id==='p0')!;assert.ok(placed.rotated);assert.equal(placed.width,200);
 assert.equal(result.sheets.flatMap(s=>s.placements).length,5);
 for(const sheet of result.sheets)for(const [i,a] of sheet.placements.entries())for(const b of sheet.placements.slice(i+1))assert.ok(a.x+a.width+stock.gap<=b.x+.001||b.x+b.width+stock.gap<=a.x+.001||a.y+a.height+stock.gap<=b.y+.001||b.y+b.height+stock.gap<=a.y+.001);
 assert.throws(()=>nestAssignedStock([{...parts[0],width:1000}],stock,{p0:{sheet:0}}),/cannot fit/);
 assert.throws(()=>nestAssignedStock([{...parts[0],grain:'u'}],stock,{p0:{sheet:0,rotated:true}}),/cannot fit/);
});
test('batch fixed shelves and dividers create equal clear openings in a single candidate and preserve unrelated intent',()=>{
 for(const kind of ['fixed','divider'] as const){const c=createCabinet(),next=addInteriorBatch(c,[c.compartments.id],kind,10,3);const model=evaluate(next.cabinet),axis=kind==='fixed'?1:0;assert.equal(next.featureIds.length,3);assert.equal(model.openings.length,4);assert.ok(Math.max(...model.openings.map(o=>o.size[axis]))-Math.min(...model.openings.map(o=>o.size[axis]))<.3);assert.deepEqual(next.cabinet.installation,c.installation);assert.equal(model.divisions.every(d=>Math.abs(d.origin[2]+d.size[2]-(c.envelope.depth-10))<.001),true);assert.deepEqual(deserialize(serialize(next.cabinet)),next.cabinet);}
 const c=createCabinet(),adjustable=addInteriorBatch(c,[c.compartments.id],'adjustable',0,3);assert.equal(evaluate(adjustable.cabinet).adjustable.shelves.length,3);assert.throws(()=>addInteriorBatch(c,[c.compartments.id],'fixed',0,16),/60 mm/);
});
test('rounded front corners and edge notches are actual shared cuts in previews and assembled STEP; tool conflicts have evaluated repairs',()=>{
 const {cabinet,featureIds}=stack(),id=featureIds[0];
 const handle={...defaultDrawerHandle(),kind:'notch' as const,horizontal:'centre' as const,height:'centre' as const,notchEdge:'top' as const,notchWidth:80,notchDepth:25,cornerDiameter:8};
 const c=editFrontFeatures(cabinet,[id],{handle,cornerRadius:12}),model=evaluate(c),part=flattenParts(model).find(p=>p.id===id+'/front')!;
 assert.equal(part.cuts.length,5);assert.ok(part.cuts.every(p=>p.outline?.length));assert.ok(flatPreview(part,part.face).throughPath.length>0);
 const exported=cabinetForExport(model,'Test').parts.find(p=>p.name.startsWith('Drawer 1 · Slab front'))!;assert.equal(exported.pockets.length,5);assert.ok(!part.label.includes('Drawer slab'));
 assert.deepEqual(deserialize(serialize(c)),c);
 const invalid=editFrontFeatures(c,[id],{handle:{cornerDiameter:4}});assert.throws(()=>evaluate(invalid),/interior corner/);const repairs=editRepairs(invalid,c);assert.ok(repairs.some(r=>/interior corners/.test(r.label)));assert.ok(repairs.some(r=>/cutter/.test(r.label)));repairs.forEach(r=>assert.doesNotThrow(()=>evaluate(r.cabinet)));
 const bad=JSON.parse(serialize(c));bad.cabinet.drawers[0].handle.notchDepth='wide';assert.throws(()=>deserialize(JSON.stringify(bad)));
});
test('doors and drawer fronts share gap, handle and radius edits; cabinet scope supplies defaults for later fronts',()=>{
 let c=resizeCabinet(createCabinet(),'width',1000);c=addDivision(c,c.compartments.id,'vertical',482).cabinet;const openings=evaluate(c).openings;
 const door=addSimpleDoors(c,'single',[openings[0].id]);c=door.cabinet;const drawers=addDrawerStack(c,openings[1].id,2);c=drawers.cabinet;
 const ids=[door.featureIds[0],drawers.featureIds[0]+'/front'];assert.deepEqual(frontTargets(c,ids),[door.featureIds[0],drawers.featureIds[0]]);
 const edited=editFrontFeatures(c,ids,{edgeGap:3,frontGap:4,cornerRadius:8,handle:{kind:'knob'}}),model=evaluate(edited);
 assert.equal(edited.fronts[0].reveal,3);assert.equal(edited.drawers![0].front!.gap,3);assert.equal(edited.drawers![1].front!.gap,2);assert.ok(model.pockets.filter(p=>p.kind==='front-profile').length===8);
 const all=editFrontFeatures(c,[...door.featureIds,...drawers.featureIds],{edgeGap:3,frontGap:4,cornerRadius:6},true);assert.equal(all.frontDefaults!.edgeGap,3);assert.deepEqual(deserialize(serialize(all)),all);
});
