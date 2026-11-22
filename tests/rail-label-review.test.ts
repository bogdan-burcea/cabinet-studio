import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {applySimplePreset} from '../src/commands/simple-presets.ts';
import {setWallHanging} from '../src/commands/wall-hanging.ts';
import {setBackPanel} from '../src/commands/back-panel.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {flattenParts} from '../src/cnc/parts.ts';
import {planSheets} from '../src/cnc/layout.ts';
import {labelJob} from '../src/docs/label-job.ts';
import {partLabels,defaultLabelStock} from '../src/docs/pdf.ts';
test('wall rail side notches are matched through profiles with cutter-radius corners and native persistence',()=>{
 const c=setWallHanging(applySimplePreset(createCabinet(),'wall'),true);
 const notched={...c,installation:{...c.installation,mounting:{...c.installation.mounting,sideNotch:60}}};
 const m=evaluate(notched),cuts=m.pockets.filter(p=>p.id.endsWith('/side-notch'));
 assert.equal(cuts.length,2);for(const cut of cuts){assert.equal(cut.size[2],8);assert.equal(cut.size[1],60);assert.equal(cut.origin[1],c.envelope.origin[1]+c.envelope.height-18-60);assert.ok(cut.outline!.length>32);assert.equal(Math.max(...cut.outline!.map(p=>p[1])),c.envelope.origin[1]+c.envelope.height-18);assert.equal(cut.size[0],18);}
 assert.deepEqual(deserializeWithInfo(serialize(notched)),{cabinet:notched,migrated:false});
 assert.equal(evaluate(c).pockets.filter(p=>p.id.endsWith('/side-notch')).length,0);
 for(const value of [-1,101,NaN,1])assert.throws(()=>evaluate({...notched,installation:{...notched.installation,mounting:{...notched.installation.mounting,sideNotch:value}}}));
 const old=JSON.parse(serialize(c));old.schemaVersion=39;old.evaluatorRevision='editable-preparation-39';assert.equal(deserializeWithInfo(JSON.stringify(old)).migrated,true);
});
test('stopped back grooves and rebates do not break through side ends and include enclosed-corner dogbones',()=>{
 for(const mode of ['groove','rebate'] as const){const c=setBackPanel(createCabinet(),{mode}),m=evaluate(c),side=m.pockets.find(p=>p.id.endsWith('/back-seat/left'))!;
 assert.ok(side.origin[1]>0);assert.ok(side.origin[1]+side.size[1]<c.envelope.height);assert.ok(side.reliefs?.length);assert.ok(side.reliefs!.every(r=>r.radius===3));
 const top=m.pockets.find(p=>p.id.endsWith('/back-seat/top'))!;assert.equal(top.reliefs?.length??0,0);
 }
});
test('label job includes every reusable offcut and appends sheet maps after labels',()=>{
 const c=createCabinet(),m=evaluate(c),parts=flattenParts(m),plan=planSheets(parts,{},.2),job=labelJob(parts,plan,6);
 assert.ok(job.parts.length>parts.length);assert.equal(new Set(job.parts.map(p=>p.id)).size,job.parts.length);
 for(const sheet of job.map.sheets)for(const item of sheet.items)assert.ok(job.parts.some(p=>p.id===item.id));
 const pdf=partLabels(c,job.parts,defaultLabelStock,false,job.map).output();
 assert.match(pdf,/label map/);assert.doesNotMatch(pdf,/arrangement reference|Cabinet - part reference|Sheet \d+ - parts/);assert.doesNotMatch(pdf,/\/Subtype \/Link/);assert.doesNotMatch(pdf,/exploded diagram/);
});

test('back-seat T-bones run along the slot walls, stay tangent to the ends and round-trip under native 41',()=>{
 for(const mode of ['groove','rebate'] as const){
  const c=setBackPanel(createCabinet(),{mode}),cut=evaluate(c).pockets.find(p=>p.id.endsWith('/back-seat/left'))!;
  assert.equal(cut.reliefs!.length,mode==='groove'?4:2);
  for(const relief of cut.reliefs!){
   assert.ok(Math.abs(relief.center[1]-cut.origin[1]-relief.radius)<1e-6||Math.abs(relief.center[1]-(cut.origin[1]+cut.size[1]-relief.radius))<1e-6);
   assert.ok(Math.abs(relief.center[2]-cut.origin[2])<1e-6||Math.abs(relief.center[2]-cut.origin[2]-cut.size[2])<1e-6);
  }
  const doc=JSON.parse(serialize(c));assert.equal(doc.schemaVersion,56);doc.schemaVersion=40;doc.evaluatorRevision='wall-rail-notch-40';assert.equal(deserializeWithInfo(JSON.stringify(doc)).migrated,true);
 }
 const thin=setBackPanel(createCabinet(),{mode:'groove',thickness:3});assert.ok(evaluate(thin).issues.some(i=>i.code==='machining-tool-width'));
});
