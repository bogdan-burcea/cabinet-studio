import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCabinet} from '../src/domain/cabinet.ts';
import {setSimpleSupport,setSimpleFeet,setSimplePlinth} from '../src/commands/simple-supports.ts';
import {defaultFootDrilling} from '../src/rules/foot-drilling.ts';
import {plinthSetback} from '../src/rules/installation.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setBackFastener} from '../src/commands/back-panel.ts';
import {applySimplePreset} from '../src/commands/simple-presets.ts';
import {CabinetStore} from '../src/commands/store.ts';
import {deserialize,serialize,deserializeWithInfo} from '../src/persistence/files.ts';
import {bottomFaceRepairs,hingePlateRepairs,doorOpeningRepairs} from '../src/commands/clearance-repairs.ts';
import {safeDoorAngles} from '../src/rules/door-motion.ts';
import {addSimpleDoors} from '../src/commands/simple-doors.ts';
import {addDivision} from '../src/commands/interiors.ts';
import {defaultHinge} from '../src/catalogue/hinges.ts';
import {explodedLayout} from '../src/viewport/display.ts';
const collision=()=>deserialize(readFileSync(new URL('fixtures/collision.cabinet.json',import.meta.url),'utf8'));
test('bottom face selection changes housings and back bores, and offers only face-compatible repairs',()=>{
 const c=setBackFastener(setCabineo(createCabinet(),'cabineo-8'),true);
 for(const face of ['inside','outside'] as const){const next=setCnc(c,{bottomFace:face}),e=evaluate(next),p=e.panels.find(p=>p.role==='bottom')!;for(const b of [...e.cabineo.flatMap(j=>j.bores),...e.backFasteners].filter(b=>b.panelId===p.id&&['housing','back-fixing'].includes(b.kind))){assert.equal(b.sign,face==='inside'?-1:1);assert.equal(b.point[1],p.center[1]+(face==='inside'?1:-1)*p.size[1]/2);}assert.deepEqual(deserialize(serialize(next)),next);}
 const saved=collision(),options=bottomFaceRepairs(saved);assert.ok(options.length);assert.ok(options.some(o=>o.label.includes('inside')));for(const o of options)assert.ok(!evaluate(o.cabinet).issues.some(i=>i.code==='machining-faces'&&i.featureId.endsWith('/panel/bottom')));
});
test('two front feet and configurable pilots drill only the bottom and preserve one Undo step',()=>{
 const original=createCabinet(),c=setSimpleFeet(setSimpleSupport(original,'feet-concept'),{layout:'front-pair',height:5}),e=evaluate(c);assert.equal(e.installation.feet.length,2);assert.equal(e.drilling.filter(b=>b.kind==='foot-pilot').length,8);assert.ok(e.drilling.filter(b=>b.kind==='foot-pilot').every(b=>b.through&&b.depth===18&&b.axis===1&&b.sign===1&&b.point[1]===0&&b.panelId.endsWith('/panel/bottom')));
 for(const [pattern,count] of [['single',1],['pair',2],['triangle',3],['rectangle',4]] as const){const next=setSimpleFeet(c,{drilling:{...defaultFootDrilling(c),pattern,pitchX:24,pitchZ:20,diameter:2.5,depth:6}});assert.equal(evaluate(next).drilling.filter(b=>b.kind==='foot-pilot').length,count*2);assert.deepEqual(deserialize(serialize(next)),next);}
 const store=new CabinetStore(original);assert.ok(store.commit(c));store.undo();assert.deepEqual(store.getSnapshot().committed,original);store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 assert.throws(()=>evaluate(setSimpleFeet(c,{drilling:{...defaultFootDrilling(c),pitchX:51}})),/Foot pilots/);
 assert.throws(()=>evaluate(setSimpleFeet(c,{height:4})),/5–200/);
});
test('plinth follows front feet, supports numeric placement, minimum height and wall exclusion',()=>{
 let c=setSimplePlinth(setSimpleSupport(createCabinet(),'feet-concept'),{enabled:true});assert.equal(c.installation.plinth.footGap,5);const before=plinthSetback(c);c=setSimpleFeet(c,{frontInset:130});assert.equal(plinthSetback(c),before+10);c=setSimplePlinth(c,{footGap:8});assert.equal(c.installation.plinth.footGap,8);c=setSimpleFeet(c,{sideInset:70});assert.equal(c.installation.feet.sideInset,70);assert.doesNotThrow(()=>evaluate(c));
 assert.throws(()=>evaluate(setSimpleFeet(c,{height:44})),/at least 40/);assert.equal(evaluate(setSimpleFeet(c,{height:45})).installation.plinthHeight,40);
 const wall=applySimplePreset(c,'wall');assert.equal(wall.installation.type,'unassigned');assert.equal(wall.installation.plinth.enabled,false);assert.throws(()=>evaluate(setSimpleSupport(wall,'feet-concept')),/Wall cabinets/);assert.deepEqual(deserialize(serialize(c)),c);
});
test('plinth explosion preserves distance below bottom and keeps all parts clear',()=>{
 const c=setSimplePlinth(setSimpleSupport(createCabinet(),'feet-concept'),{enabled:true,leftReturn:true,rightReturn:true}),e=evaluate(c),offsets=explodedLayout(e.panels,80),bottom=e.panels.find(p=>p.role==='bottom')!;
 for(const p of e.panels.filter(p=>p.installationPart==='plinth')){assert.equal(offsets.get(p.id)![1],offsets.get(bottom.id)![1]);assert.ok(p.center[1]+p.size[1]/2+offsets.get(p.id)![1]<bottom.center[1]-bottom.size[1]/2+offsets.get(bottom.id)![1]);}
 const low=(p:typeof bottom,a:number)=>p.center[a]-p.size[a]/2+offsets.get(p.id)![a],high=(p:typeof bottom,a:number)=>low(p,a)+p.size[a];for(let i=0;i<e.panels.length;i++)for(let j=i+1;j<e.panels.length;j++)assert.ok(![0,1,2].every(a=>Math.min(high(e.panels[i],a),high(e.panels[j],a))-Math.max(low(e.panels[i],a),low(e.panels[j],a))>.01));
});
test('protruding divider retains opening collision checks and offers a minimal reveal repair',()=>{
 const c=collision(),e=evaluate(c),ids=c.fronts.map(d=>d.id),result=safeDoorAngles(e,{},ids,110);assert.ok(result.blocked);assert.equal(e.panels.find(p=>p.id===result.collision!.otherId)?.role,'divider');const options=doorOpeningRepairs(c,ids,110);assert.equal(options.length,1);assert.match(options[0].label,/3 mm/);assert.equal(safeDoorAngles(evaluate(options[0].cabinet),{},ids,110).blocked,false);assert.deepEqual(options[0].cabinet.fronts.map(d=>d.handle),c.fronts.map(d=>d.handle));
});
test('shelf mounting-zone collision offers validated hinge repositioning and round-trips offsets',()=>{
 let c=addSimpleDoors(createCabinet(),'single').cabinet;c={...c,fronts:c.fronts.map(d=>({...d,hinge:defaultHinge()}))};const h=evaluate(c).doorHardware.hinges[0];c=addDivision(c,c.compartments.id,'horizontal',h.y-18).cabinet;assert.ok(evaluate(c).issues.some(i=>i.code==='machining-hinge-plate'));const options=hingePlateRepairs(c);assert.equal(options.length,2);for(const o of options){assert.ok(!evaluate(o.cabinet).issues.some(i=>i.code==='machining-hinge-plate'));assert.deepEqual(deserialize(serialize(o.cabinet)),o.cabinet);assert.deepEqual(o.cabinet.compartments,c.compartments);}
});
test('native 26 migrates while malformed new settings fail without replacing the cabinet',()=>{
 const saved=readFileSync(new URL('fixtures/collision.cabinet.json',import.meta.url),'utf8');assert.ok(deserializeWithInfo(saved).migrated);const c=setSimpleFeet(setSimpleSupport(createCabinet(),'feet-concept'),{layout:'front-pair'}),doc=JSON.parse(serialize(c));assert.equal(doc.schemaVersion,56);for(const change of [(v:any)=>v.cabinet.installation.feet.layout='unknown',(v:any)=>v.cabinet.installation.feet.drilling.pitchX='32',(v:any)=>v.cabinet.installation.feet.drilling.extra=true,(v:any)=>v.cabinet.installation.plinth.footGap='5',(v:any)=>v.cabinet.carcass.machining={revision:'cnc-1',tolerance:.2,bitDiameter:6,dogbones:false,throughOpposed:true,cabineoPerSide:2,bottomFace:'edge'}]){const bad=structuredClone(doc);change(bad);assert.throws(()=>deserialize(JSON.stringify(bad)));}
});

test('front reinforcement obstructs hinge installation even when the plate body clears; repair moves only hinges',()=>{
 let c=addSimpleDoors(createCabinet(),'single').cabinet;
 c={...c,carcass:{...c.carcass,frontRails:{revision:'front-rail-1',top:{enabled:true,width:120},bottom:{enabled:false,width:80}}},fronts:c.fronts.map(d=>({...d,hinge:defaultHinge()}))};
 const before=evaluate(c),rail=before.panels.find(p=>p.role==='front-upper-rail')!,hinge=before.doorHardware.hinges.at(-1)!;
 assert.ok(hinge.mountingZone.center[2]+hinge.mountingZone.size[2]/2<rail.center[2]-rail.size[2]/2,'plate body does not touch rail');
 assert.ok(before.issues.some(i=>i.code==='machining-hinge-plate'&&i.relatedIds?.includes(rail.id)));
 const repairs=hingePlateRepairs(c);assert.ok(repairs.length);
 const fixed=repairs[0].cabinet,model=evaluate(fixed);
 assert.deepEqual(fixed.carcass,c.carcass);assert.deepEqual(fixed.compartments,c.compartments);
 assert.ok(!model.issues.some(i=>i.code==='machining-hinge-plate'));
 const offset=fixed.fronts[0].hinge!.offsets![1];assert.ok(offset<0&&Number.isInteger(offset));assert.equal(fixed.fronts[0].hinge!.offsets![0],0);
 const closer=structuredClone(fixed);closer.fronts[0].hinge!.offsets![1]++;
 assert.ok(evaluate(closer).issues.some(i=>i.code==='machining-hinge-plate'),'one millimetre closer remains blocked');
});

test('top and bottom reinforcement can be cleared with independent hinge offsets in one repair',()=>{
 let c=addSimpleDoors(createCabinet(),'pair').cabinet;
 c={...c,carcass:{...c.carcass,frontRails:{revision:'front-rail-1',top:{enabled:true,width:120},bottom:{enabled:true,width:120}}},fronts:c.fronts.map(d=>({...d,hinge:defaultHinge()}))};
 const repairs=hingePlateRepairs(c);assert.ok(repairs.length);
 for(const option of repairs){assert.deepEqual(option.cabinet.carcass,c.carcass);assert.ok(!evaluate(option.cabinet).issues.some(i=>i.code==='machining-hinge-plate'));}
});
