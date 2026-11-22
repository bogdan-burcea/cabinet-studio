import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {addDrawerStack,removeMetalDrawer,setDrawerPlacement} from '../src/commands/drawers.ts';
import {renameItem} from '../src/commands/item-names.ts';
import {resizeCabinet} from '../src/commands/dimensions.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {defaultDrawerHandle} from '../src/rules/handles.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {cabinetForExport} from '../src/cnc/sheet-export.ts';
import {serialize,deserialize} from '../src/persistence/files.ts';
import {sheetSelection,sharedStockEdits} from '../src/cnc/selection.ts';
import {defaultSheet} from '../src/cnc/nesting.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {setSimpleSupport,setSimpleFeet} from '../src/commands/simple-supports.ts';
import {standardisePilotHoles} from '../src/commands/pilots.ts';
import {CabinetStore} from '../src/commands/store.ts';
const made=()=>{const c=createCabinet();return addDrawerStack(c,c.compartments.id,3);};
test('drawer names are short, editable and persisted without changing selection identity or parts',()=>{
 const {cabinet,featureIds}=made(),before=evaluate(cabinet);assert.deepEqual(before.drawers.drawers.map(d=>d.label),['Drawer 1','Drawer 2','Drawer 3']);
 const renamed=renameItem(cabinet,featureIds[0],'1'),after=evaluate(renamed);assert.equal(after.drawers.drawers[0].label,'1');assert.deepEqual(after.drawers.drawers[0].parts,before.drawers.drawers[0].parts);assert.equal(deserialize(serialize(renamed)).names![featureIds[0]],'1');
});
test('rail sizing follows cabinet depth and inset clearance, using maximum available compatible lengths',()=>{
 const {cabinet,featureIds}=made();assert.ok(cabinet.drawers!.every(d=>d.pack.id.includes('-550-')));
 const shallow=resizeCabinet(cabinet,'depth',430);assert.ok(shallow.drawers!.every(d=>d.pack.id.includes('-400-')));assert.doesNotThrow(()=>evaluate(shallow));
 const deep=resizeCabinet(shallow,'depth',800);assert.ok(deep.drawers!.every(d=>d.pack.id.includes('-650-')));
 const inset=setDrawerPlacement(cabinet,featureIds,'inset');assert.ok(inset.drawers!.every(d=>d.pack.id.includes('-500-')));
 const store=new CabinetStore(cabinet);assert.ok(store.commit(shallow));store.undo();assert.deepEqual(store.getSnapshot().committed,cabinet);
});
test('drawer pulls, knobs and finger holes share door-style controls and produce selectable moving bodies, bores and STEP',()=>{
 for(const kind of ['pull','knob','hole'] as const){
  const {cabinet,featureIds}=made(),handle={...defaultDrawerHandle(),kind};
  const c={...cabinet,drawers:cabinet.drawers!.map((d,i)=>i?d:{...d,handle})},model=evaluate(c);
  const drawer=model.drawers.drawers[0],front=flattenParts(model).find(p=>p.id===featureIds[0]+'/front')!;
  const holes=front.holes.filter(b=>b.kind==='handle');assert.equal(holes.length,kind==='pull'?2:1);assert.ok(holes.every(b=>b.through));
  const bodies=drawer.parts.filter(p=>p.id.includes('/handle/'));assert.equal(bodies.length,kind==='pull'?3:kind==='knob'?1:0);assert.ok(bodies.every(p=>p.ownerId===featureIds[0]&&p.moving));
  assert.equal(cabinetForExport(model,'Test').parts.filter(p=>p.name.startsWith('Drawer 1 · handle')).length,bodies.length);
  assert.deepEqual(deserialize(serialize(c)),c);
  const store=new CabinetStore(c);assert.ok(store.commit(removeMetalDrawer(c,featureIds[0])));assert.ok(!evaluate(store.getSnapshot().committed).drawers.drawers.some(d=>d.id===featureIds[0]));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
  for(const invalid of [null,{...handle,extra:true},{...handle,pitch:2000.1}]){const doc=JSON.parse(serialize(c));doc.cabinet.drawers[0].handle=invalid;assert.throws(()=>deserialize(JSON.stringify(doc)));}
 }
});
test('shared sheet editing deduplicates stock groups, preserves unrelated fields and rejects an invalid batch atomically',()=>{
 const ids=['a','b','c'];assert.deepEqual(sheetSelection([],'b',true,ids,'a'),['a','b']);assert.deepEqual(sheetSelection(['a'],'b',true,ids),['a','b']);assert.deepEqual(sheetSelection(['a','b'],'a',true,ids),['b']);assert.deepEqual(sheetSelection(['a'],'part',true,ids),['part']);
 const groups=[{key:'18',options:defaultSheet},{key:'6',options:{...defaultSheet,width:2440,rotate:false}},{key:'18',options:defaultSheet}];
 const result=sharedStockEdits(groups,{margin:20},.2);assert.equal(result.length,2);assert.equal(result[1][1].rotate,false);assert.equal(result[1][1].width,2440);assert.equal(result[0][1].margin,20);assert.notEqual(groups[0].options.margin,20);
 assert.throws(()=>sharedStockEdits(groups,{margin:10000},.2));
});
test('common pilot preparation uses Ø2.5 without changing hardware bores or explicit custom pilots until requested',()=>{
 const {cabinet}=made();let c=setBackPanel(setSimpleSupport(cabinet,'feet-concept'),{mode:'applied'});
 assert.equal(c.installation.feet.drilling!.diameter,2.5);assert.equal(c.carcass.back.joint!.pilots!.diameter,2.5);
 c=setSimpleFeet(c,{drilling:{...c.installation.feet.drilling!,diameter:3}});assert.equal(c.installation.feet.drilling!.diameter,3);
 const changed=standardisePilotHoles(c);assert.equal(changed.installation.feet.drilling!.diameter,2.5);assert.equal(c.installation.feet.drilling!.diameter,3);
 const model=evaluate(changed);assert.ok(model.drilling.filter(b=>b.kind==='pilot'||b.kind==='foot-pilot').every(b=>b.diameter===2.5));
});
