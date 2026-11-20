import {applySimplePreset} from '../src/commands/simple-presets.ts';
import {deserializeWithInfo} from '../src/persistence/files.ts';
import {editRepairs} from '../src/commands/edit-repairs.ts';
import test from 'node:test';
import {Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Vector3} from 'three';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet.ts';
import {evaluate} from '../src/geometry/evaluate.ts';
import {setCabineo} from '../src/commands/cabineo.ts';
import {setWallHanging} from '../src/commands/wall-hanging.ts';
import {setBackFastener,setBackPanel} from '../src/commands/back-panel.ts';
import {addInteriors} from '../src/commands/simple-interiors.ts';
import {backFastenerInteriorRepairs} from '../src/commands/machining-repairs.ts';
import {setCnc} from '../src/commands/cnc.ts';
import {bottomFaceRepairs} from '../src/commands/clearance-repairs.ts';
import {machiningFaces} from '../src/rules/machining-review.ts';
import {partPreview} from '../src/geometry/part-preview.ts';
import {panelDisplayGeometry} from '../src/viewport/part-mesh.ts';
import {serialize} from '../src/persistence/files.ts';
import {readSimpleCabinet} from '../src/persistence/simple.ts';
import {setSimpleSupport} from '../src/commands/simple-supports.ts';
import {CabinetStore} from '../src/commands/store.ts';

test('wall hanging adds Workshop pilots and access cuts in translated Studio coordinates',()=>{
 const base=setSimpleSupport(createCabinet(),'feet-concept');
 base.envelope.origin=[10,20,30];
 const wall={...base,cabinetType:'wall' as const,installation:{...base.installation,type:'unassigned' as const}};
 const cabinet=setWallHanging(wall,true),result=evaluate(cabinet),store=new CabinetStore(wall);
 assert.equal(result.installation.feet.length,0);
 assert.equal(result.mounting.parts.length,0);
 assert.deepEqual(result.drilling.map(b=>[b.point,b.sign,b.diameter,b.depth]),[
  [[28,707,69],-1,2.5,10],[[28,707,101],-1,2.5,10],
  [[592,707,69],1,2.5,10],[[592,707,101],1,2.5,10]
 ]);
 const notches=result.pockets.filter(p=>p.kind==='hanger-access');
 assert.equal(notches.length,2);
 assert.ok(notches.every(p=>p.axis===2&&p.size[0]===18&&p.size[1]===41&&p.size[2]===6));
 assert.deepEqual(readSimpleCabinet(serialize(cabinet)),cabinet);
 assert.ok(store.commit(cabinet));
 store.undo();assert.deepEqual(store.getSnapshot().committed,wall);
 assert.equal(evaluate(setWallHanging(cabinet,false)).drilling.length,0);
});

test('back-fixing shelf collisions offer a move or an actual 45 degree rear profile cut',()=>{
 let cabinet=setBackFastener(createCabinet(),true);
 const fastener=cabinet.carcass.back.joint!.fastener!;
 cabinet=setBackPanel(cabinet,{fastener:{...fastener,perSide:1}});
 const {cabinet:withShelf,featureIds:[id]}=addInteriors(cabinet,[cabinet.compartments.id],'fixed');
 const before=evaluate(withShelf),options=backFastenerInteriorRepairs(withShelf,before.issues);
 assert.ok(options.some(o=>o.label.startsWith('Move')));
 const repaired=options.find(o=>o.label.includes('45°'))!.cabinet,after=evaluate(repaired);
 assert.deepEqual(repaired.compartments,withShelf.compartments);
 assert.deepEqual(after.backFasteners,before.backFasteners);
 assert.ok(!after.issues.some(i=>i.code==='machining-collision'&&i.relatedIds?.includes(id)));
 const panel=after.panels.find(p=>p.id===id)!,cuts=after.pockets.filter(p=>p.panelId===id);
 assert.equal(cuts.length,2);
 assert.ok(cuts.every(p=>p.triangle&&p.size[0]===p.size[2]));
 assert.notEqual(partPreview(panel,[],cuts,1).outline,partPreview(panel,[],[],1).outline);
 const mesh=panelDisplayGeometry(panel,cuts);assert.ok(mesh.getAttribute('position').count>36);mesh.dispose();
 assert.deepEqual(readSimpleCabinet(serialize(repaired)),repaired);
});

test('row insets shift shared front and rear bore positions with through-only parts excluded from flipping',()=>{
 const base=createCabinet(),divider=addInteriors(base,[base.compartments.id],'divider');
 const openings=evaluate(divider.cabinet).openings.map(o=>o.id),shelves=addInteriors(divider.cabinet,openings,'adjustable').cabinet;
 const candidate=setCnc(shelves,{shelfRowInsets:{front:45,rear:25}}),result=evaluate(candidate);
 const panel=result.panels.find(p=>p.id===divider.featureIds[0])!;
 const bores=result.drilling.filter(b=>b.panelId===panel.id);
 assert.deepEqual([...new Set(bores.map(b=>b.point[2]))].sort((a,b)=>a-b),[31,515]);
 assert.ok(bores.every(b=>b.through));
 assert.equal(machiningFaces(panel,bores,[]).size,0);
 assert.equal(machiningFaces(panel,[{...bores[0],through:false,depth:8}],[]).size,1);
 assert.equal(machiningFaces(panel,[{...bores[0],through:false,depth:8},{...bores[1],sign:-1,through:false,depth:8}],[]).size,2);
 assert.throws(()=>evaluate(setCnc(shelves,{shelfRowInsets:{front:300,rear:300}})),/at least 6 mm/);
 assert.deepEqual(readSimpleCabinet(serialize(candidate)),candidate);
});

test('wall hanging and back fasteners coexist in either order with Workshop notch clearance',()=>{
 const wall=applySimplePreset(createCabinet(),'wall');
 for(const c of [setBackFastener(setWallHanging(wall,true),true),setWallHanging(setBackFastener(wall,true),true)]){
  const result=evaluate(c),notch=result.pockets.find(p=>p.kind==='hanger-access')!;
  assert.equal(result.backFasteners.length,6);
  assert.equal(result.drilling.length,4);
  assert.ok(result.backFasteners.filter(b=>b.axis===0).every(b=>b.point[1]+b.diameter/2<=notch.origin[1]-50+1e-6));
  assert.deepEqual(readSimpleCabinet(serialize(c)),c);
  const crowded=setBackPanel(c,{fastener:{...c.carcass.back.joint!.fastener!,perSide:20}});
  assert.throws(()=>evaluate(crowded),/hanger notches/);
  assert.ok(editRepairs(crowded,c).some(repair=>/Fit .* back connectors/.test(repair.label)));
 }
});

test('changing cabinet style disables Blum hanging and older non-wall drafts remain readable',()=>{
 const wall=setWallHanging(applySimplePreset(createCabinet(),'wall'),true);
 const base=applySimplePreset(wall,'base');
 assert.throws(()=>setWallHanging(base,true),/wall-style/);
 assert.equal(base.installation.mounting.mode,'none');
 assert.equal(evaluate(base).drilling.length,0);
 const legacy=JSON.parse(serialize(wall));legacy.cabinet.cabinetType='base';
 const migrated=deserializeWithInfo(JSON.stringify(legacy));
 assert.equal(migrated.migrated,true);
 assert.deepEqual(migrated.cabinet.carcass,wall.carcass);
 assert.equal(migrated.cabinet.installation.mounting.mode,'none');
});


test('Cabineo and Blum hanging can be enabled in either order with an adjustable shelf',()=>{
 const wall=applySimplePreset(createCabinet(),'wall');
 const shelf=addInteriors(wall,[wall.compartments.id],'adjustable').cabinet;
 for(const c of [setCabineo(setWallHanging(shelf,true),'cabineo-8'),setWallHanging(setCabineo(shelf,'cabineo-8'),true)]){
  const result=evaluate(c);
  assert.ok(result.cabineo.length>0);
  assert.ok(result.cabineo.every(j=>j.hostId!==shelf.contents[0].id));
  assert.equal(result.drilling.filter(b=>b.id.includes('/installation/mounting/')).length,4);
  assert.ok(result.drilling.some(b=>b.kind==='shelf-support'));
  assert.ok(!result.issues.some(i=>i.code==='machining-hole-collision'));
  assert.deepEqual(readSimpleCabinet(serialize(c)),c);
 }
});

test('grooved wall cabinet explains the bottom-face conflict and offers an inside-face repair',()=>{
 const cabinet=setCabineo(setWallHanging(applySimplePreset(createCabinet(),'wall'),true),'cabineo-8');
 const before=evaluate(cabinet),bottom=before.panels.find(p=>p.role==='bottom')!;
 const issue=before.issues.find(i=>i.code==='machining-faces');
 assert.equal(issue?.featureId,bottom.id);
 assert.match(issue!.message,/back seat is cut from the inside.*fastener holes are cut from the outside/);
 const options=bottomFaceRepairs(cabinet);
 assert.deepEqual(options.map(o=>o.label),['Move bottom fasteners to the inside face']);
 const after=evaluate(options[0].cabinet);
 assert.ok(!after.issues.some(i=>i.code.startsWith('machining-')));
 assert.deepEqual(after.drilling,before.drilling);
 assert.deepEqual(after.pockets,before.pockets);
 const housings=after.cabineo.flatMap(j=>j.bores).filter(b=>b.panelId===bottom.id&&b.kind==='housing');
 assert.ok(housings.length&&housings.every(b=>b.sign===-1&&b.depth===11&&!b.through));
});

test('the bottom through repair preserves blind housings and converts receiving pilots only',()=>{
 const base=setCabineo(createCabinet(),'cabineo-12');
 const divider=addInteriors(base,[base.compartments.id],'divider').cabinet;
 const cabinet=setCnc(divider,{bottomFace:'outside',throughOpposed:false}),before=evaluate(cabinet);
 const bottom=before.panels.find(p=>p.role==='bottom')!;
 const repair=bottomFaceRepairs(cabinet).find(o=>o.label.includes('receiving pilots through'))!;
 assert.ok(repair);
 const after=evaluate(repair.cabinet),allBores=(e:typeof before)=>e.cabineo.flatMap(j=>j.bores);
 const bottomPilot=(b:ReturnType<typeof allBores>[number])=>b.panelId===bottom.id&&b.kind==='receiver';
 assert.deepEqual(allBores(after).filter(bottomPilot),allBores(before).filter(bottomPilot).map(b=>({...b,depth:bottom.size[1],through:true})));
 assert.deepEqual(allBores(after).filter(b=>!bottomPilot(b)),allBores(before).filter(b=>!bottomPilot(b)));
 assert.deepEqual([...machiningFaces(bottom,allBores(after),after.pockets)],[-1]);
 assert.deepEqual(readSimpleCabinet(serialize(repair.cabinet)),repair.cabinet);
 const store=new CabinetStore(cabinet);
 assert.ok(store.commit(repair.cabinet));
 store.undo();assert.deepEqual(store.getSnapshot().committed,cabinet);
 store.redo();assert.deepEqual(store.getSnapshot().committed,repair.cabinet);
});

test('a saved wall cabinet through setting never cuts housing pockets through the bottom',()=>{
 const wall=setWallHanging(applySimplePreset(createCabinet(),'wall'),true);
 const divider=addInteriors(wall,[wall.compartments.id],'divider').cabinet;
 const cabinet=setCnc(setBackFastener(setCabineo(divider,'cabineo-12'),true),{bottomFace:'outside',bottomFastenersThrough:true});
 const e=evaluate(readSimpleCabinet(serialize(cabinet))),bottom=e.panels.find(p=>p.role==='bottom')!;
 const bores=[...e.cabineo.flatMap(j=>j.bores),...e.backFasteners].filter(b=>b.panelId===bottom.id);
 const inside=partPreview(bottom,bores,e.pockets,1),outside=partPreview(bottom,bores,e.pockets,-1);
 assert.equal(inside.bores.find(b=>b.kind==='housing')?.path,'');
 assert.equal(inside.bores.find(b=>b.kind==='back-fixing')?.path,'');
 assert.ok(outside.bores.find(b=>b.kind==='housing')?.path);
 assert.ok(bores.filter(b=>b.kind==='housing'||b.kind==='back-fixing').every(b=>!b.through&&b.depth<bottom.size[1]));
 const housing=bores.find(b=>b.kind==='housing'&&b.id.endsWith('/2'))!;
 const mesh=new Mesh(panelDisplayGeometry(bottom,e.pockets,bores),new MeshBasicMaterial({side:DoubleSide}));
 mesh.position.set(...bottom.coreCenter);
 mesh.updateMatrixWorld(true);
 const [x,y,z]=housing.point;
 const interiorRay=new Raycaster(new Vector3(x,y+100,z),new Vector3(0,-1,0));
 const exteriorRay=new Raycaster(new Vector3(x,y-100,z),new Vector3(0,1,0));
 assert.equal(interiorRay.intersectObject(mesh)[0]?.point.y,y+bottom.size[1]);
 assert.equal(exteriorRay.intersectObject(mesh)[0]?.point.y,y+housing.depth);
 mesh.geometry.dispose();mesh.material.dispose();
 assert.ok(e.issues.some(i=>i.featureId===bottom.id&&i.code==='machining-faces'));
 const options=bottomFaceRepairs(cabinet);
 assert.ok(options.some(o=>o.label.includes('Move top/bottom back fixings')));
 for(const option of options)assert.ok(!evaluate(option.cabinet).issues.some(i=>i.featureId===bottom.id&&i.code.startsWith('machining-')));
});
