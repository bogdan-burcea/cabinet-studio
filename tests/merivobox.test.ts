import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {resizeCabinet} from '../src/commands/dimensions';
import {addDrawerStack,addMetalDrawer,setDrawerInternal,editDrawerGroup,duplicateDrawers,updateMetalDrawer} from '../src/commands/drawers';
import {merivoPacks,drawerPack,drawerComponents,chooseDrawerPack,antaroPin} from '../src/catalogue/drawers';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {drawerDisplayGeometry} from '../src/viewport/drawer-mesh';
import {explodedCabinetLayout} from '../src/viewport/display';
import {fitDrawerRails} from '../src/rules/drawer-rails';
import {serialize,deserialize} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';
const pin=(p:typeof merivoPacks[number])=>({id:p.id,revision:p.revision});
const pack=(kind='m',load=40,length=500)=>merivoPacks.find(p=>p.configuration===kind&&p.manufacturerDynamicLoadKg===load&&p.nominalLength===length)!;
const base=()=>resizeCabinet(createCabinet(),'depth',720);

test('every MERIVOBOX M/E construction, runner length and load class evaluates external and inner cutting and meshes',()=>{
 assert.equal(merivoPacks.length,36);
 for(const p of merivoPacks)for(const internal of [false,true]){
  const b=base(),c=addDrawerStack(b,b.compartments.id,2,pin(p),true,internal).cabinet,m=evaluate(c),parts=flattenParts(m);
  assert.deepEqual(deserialize(serialize(c)),c);
  assert.equal(m.drawers.drawers.length,2);
  for(const d of m.drawers.drawers){
   const w=d.allocation.size[0],tall=p.configuration!=='m';
   assert.deepEqual(d.bottom,[w-51,16,p.nominalLength-26]);assert.deepEqual(d.back,[w-51,tall?184:83,16]);
   assert.equal(parts.filter(q=>q.panel.provenance===d.id).length,internal?2:3);
   const articles=drawerComponents(d.intent).map(q=>q.article);
   assert.ok(articles.includes(`${p.manufacturerDynamicLoadKg===70?453:450}.${p.nominalLength}1B`));
   assert.equal(articles.includes('ZF4.1002'),!internal);
   if(internal){assert.ok(articles.includes(tall?'ZI4.2ES1':'ZI4.0MS1'));assert.equal(d.front[0],w-126);assert.ok(!m.drilling.some(q=>q.panelId===d.id+'/front'));}
   if(tall){assert.ok(d.parts.some(q=>q.id===d.id+(p.configuration==='e-gallery'?'/gallery-left':'/cover-left')));assert.equal(d.parts.some(q=>q.id.endsWith('/front-gallery')),internal);}
   for(const q of d.parts){
    const g=drawerDisplayGeometry(q);g.computeBoundingBox();const box=g.boundingBox!;
    q.size.forEach((n,i)=>assert.ok(Math.abs(box.max.getComponent(i)-box.min.getComponent(i)-n)<.01,`${q.id}: axis ${i}`));g.dispose();
   }
  }
 }
});

test('MERIVOBOX machining follows the screw-on front, 16 mm back/base and load-specific runner fixing patterns',()=>{
 for(const kind of ['m','e-gallery','e-closed'])for(const load of [40,70])for(const length of [300,500,600]){
  if(load===70&&length<450)continue;
  const b=base(),c=addDrawerStack(b,b.compartments.id,1,pin(pack(kind,load,length)),true).cabinet,m=evaluate(c),d=m.drawers.drawers[0],low=d.allocation.origin[1],x=d.allocation.origin[0];
  const runner=m.drilling.filter(q=>q.id.startsWith(d.id+'/runner-left/'));
  const expected=load===70?[19,28,37,261,275,293,...length===600?[389,403,421]:[]]:[19,37,69,...length<=350?[197,229]:[261,293]];
  assert.deepEqual(runner.map(q=>c.envelope.depth-q.point[2]),expected);assert.ok(runner.every(q=>q.point[1]===low+54));
  const front=m.drilling.filter(q=>q.id.startsWith(d.id+'/front/pilot-left-'));
  assert.deepEqual(front.map(q=>q.point[1]-low),kind==='m'?[33.5,65.5]:[33.5,65.5,193.5]);assert.ok(front.every(q=>q.point[0]===x+20.5));
  const back=m.drilling.filter(q=>q.panelId===d.id+'/back');assert.equal(back.length,kind==='m'?4:8);assert.ok(back.every(q=>q.depth===10));
  const bottom=m.drilling.filter(q=>q.panelId===d.id+'/bottom');assert.equal(bottom.length,2);assert.equal(bottom[0].point[0],x+34.5);assert.equal(bottom[0].point[2],c.envelope.depth-(length<=300?128:256));
  assert.ok(!m.issues.some(q=>['machining-hole-collision','machining-collision'].includes(q.code)),JSON.stringify(m.issues));
 }
});

test('MERIVOBOX automatic rail fitting preserves construction/load and manual runners reject insufficient depth',()=>{
 const b=base(),c=addDrawerStack(b,b.compartments.id,2,pin(pack('e-closed',70,600)),false,true).cabinet;
 const fitted=fitDrawerRails(resizeCabinet(c,'depth',600));
 assert.ok(fitted.drawers!.every(d=>{const p=drawerPack(d.pack);return p.family==='merivobox'&&p.configuration==='e-closed'&&p.manufacturerDynamicLoadKg===70&&p.nominalLength===500;}));
 const manual={...c,drawers:c.drawers!.map(d=>({...d,manualRail:true}))};assert.throws(()=>evaluate(resizeCabinet(manual,'depth',600)));
 assert.throws(()=>evaluate(fitDrawerRails(resizeCabinet(c,'depth',500))));
 assert.equal(drawerPack(chooseDrawerPack(pin(pack('m',40,300)),{load:70})).nominalLength,450);
});

test('internal family changes, conversion and duplication retain identity, history and matching kits',()=>{
 const b=base(),external=addDrawerStack(b,b.compartments.id,2,pin(pack('e-gallery')),false).cabinet,ids=external.drawers!.map(d=>d.id),inner=setDrawerInternal(external,ids,true);
 assert.deepEqual(inner.drawers!.map(d=>d.id),ids);assert.ok(inner.drawers!.every(d=>d.internal?.revision==='merivobox-inner-1'&&drawerPack(d.pack).configuration==='e-gallery'));
 const switched=editDrawerGroup(inner,ids,{pack:antaroPin});assert.ok(switched.drawers!.every(d=>d.internal?.revision==='antaro-inner-1'));evaluate(switched);
 const back=editDrawerGroup(switched,ids,{pack:pin(pack('e-closed'))});evaluate(back);assert.ok(back.drawers!.every(d=>d.internal?.revision==='merivobox-inner-1'));
 const duplicate=duplicateDrawers(back,[ids[0]]);evaluate(duplicate.cabinet);assert.equal(duplicate.cabinet.drawers!.length,3);
 const store=new CabinetStore(inner);assert.ok(store.commit(back));store.undo();assert.deepEqual(store.getSnapshot().committed,inner);store.redo();assert.deepEqual(store.getSnapshot().committed,back);
 const offsets=explodedCabinetLayout(evaluate(back),80);for(const id of ids){assert.deepEqual(offsets.get(id+'/front-gallery'),offsets.get(id+'/front'));assert.deepEqual(offsets.get(id+'/front-fixing-left'),offsets.get(id+'/front'));}
 const old=JSON.parse(serialize(back));old.schemaVersion=57;old.evaluatorRevision='antaro-inner-57';assert.throws(()=>deserialize(JSON.stringify(old)));
 const single=addMetalDrawer(b,b.compartments.id,pin(pack('e-closed')));evaluate(single.cabinet);const converted=setDrawerInternal(single.cabinet,[single.featureId],true);evaluate(updateMetalDrawer(converted,single.featureId,{pack:antaroPin}));
});

import {drawerRepairs} from '../src/commands/drawer-repairs';
test('tall drawer height errors offer an evaluated automatic-height correction without deleting or changing fittings',()=>{
 for(const kind of ['e-gallery','e-closed'])for(const internal of [false,true]){
  const previous=resizeCabinet(createCabinet(),'depth',600),candidate=addDrawerStack(previous,previous.compartments.id,4,pin(pack(kind)),true,internal).cabinet;
  assert.throws(()=>evaluate(candidate),/Reduce the drawer count/);
  const repair=drawerRepairs(candidate,previous).find(r=>r.label.startsWith('Use automatic drawer heights'));assert.ok(repair);
  const model=evaluate(repair.cabinet);assert.ok(model.drawers.drawers.every(d=>d.allocation.size[1]>=(internal?207:209)));
  assert.deepEqual(repair.cabinet.drawers!.map(d=>[d.id,d.pack,d.internal]),candidate.drawers!.map(d=>[d.id,d.pack,d.internal]));
  assert.throws(()=>evaluate(resizeCabinet(repair.cabinet,'height',repair.cabinet.envelope.height-1)));
  assert.deepEqual(deserialize(serialize(repair.cabinet)),repair.cabinet);
 }
});
test('MERIVOBOX exploded side covers, gallery and rear fixings stay attached to the correct drawer levels',()=>{
 for(const kind of ['m','e-gallery','e-closed']){
  const b=base(),c=addDrawerStack(b,b.compartments.id,2,pin(pack(kind)),true,true).cabinet,m=evaluate(c),offsets=explodedCabinetLayout(m,80);
  for(const d of m.drawers.drawers)for(const side of ['left','right']){
   assert.equal(offsets.get(d.id+'/side-'+side)![1],offsets.get(d.id+'/bottom')![1]);
   assert.deepEqual(offsets.get(d.id+'/back-fixing-'+side),offsets.get(d.id+'/back'));
   if(kind!=='m')assert.deepEqual(offsets.get(d.id+(kind==='e-gallery'?'/gallery-':'/cover-')+side),offsets.get(d.id+'/side-'+side));
  }
 }
});

import {Box3,Vector3,Triangle,Mesh,MeshBasicMaterial,Raycaster} from 'three';
test('MERIVOBOX mirrored sides, runners and back fixings retain outward-facing surfaces',()=>{
 for(const kind of ['m','e-gallery','e-closed'])for(const length of [270,500,600]){
  const b=base(),c=addDrawerStack(b,b.compartments.id,1,pin(pack(kind,40,length)),true,true).cabinet,d=evaluate(c).drawers.drawers[0];
  for(const role of ['side','runner','back-fixing']){
   const volumes:number[]=[];
   for(const side of ['left','right']){
    const geometry=drawerDisplayGeometry(d.parts.find(p=>p.id.endsWith(`/${role}-${side}`))!),position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.getIndex();
    const point=(i:number)=>new Vector3().fromBufferAttribute(position,index?index.getX(i):i);
    let volume=0;
    for(let i=0;i<(index?.count??position.count);i+=3){
     const a=point(i),b=point(i+1),c=point(i+2),face=new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a));
     volume+=a.dot(new Vector3().crossVectors(b,c))/6;
     if(face.lengthSq()>1e-10)for(let j=0;j<3;j++)assert.ok(face.dot(new Vector3().fromBufferAttribute(normal,index?index.getX(i+j):i+j))>0,`${kind} ${length} ${role}-${side}: winding must agree with outward normals`);
    }
    assert.ok(volume>0,`${role}-${side} must face outwards under normal back-face culling`);volumes.push(volume);geometry.dispose();
   }
   assert.ok(Math.abs(volumes[0]-volumes[1])<.01,`${role}: mirroring must preserve enclosed volume`);
  }
 }
});

test('MERIVOBOX inner fronts have a closed forward face without changing cuts, drilling or saved intent',()=>{
 for(const kind of ['m','e-gallery','e-closed']){
  const b=base(),c=addDrawerStack(b,b.compartments.id,1,pin(pack(kind)),true,true).cabinet,model=evaluate(c),drawer=model.drawers.drawers[0];
  const saved=serialize(c),cuts=structuredClone(flattenParts(model)),drilling=structuredClone(model.drilling),front=drawer.parts.find(p=>p.id===drawer.id+'/front')!;
  const geometry=drawerDisplayGeometry(front),material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
  // Solid rendering must hit the exterior at +depth/2, including away from
  // the narrow top/bottom lips that previously hid the open front channel.
  for(const x of [-front.size[0]/3,0,front.size[0]/3])for(const y of [-front.size[1]/3,0,front.size[1]/3]){
   const hits=new Raycaster(new Vector3(x,y,front.size[2]+10),new Vector3(0,0,-1)).intersectObject(mesh);
   assert.ok(hits.length,'The front must remain visible with default front-face rendering');
   assert.ok(Math.abs(hits[0].point.z-front.size[2]/2)<1e-6,'The closed face must point toward the user (+Z)');
  }
  geometry.dispose();material.dispose();
  const width=drawer.allocation.size[0];
  assert.deepEqual(drawer.bottom,[width-51,16,474]);assert.deepEqual(drawer.back,[width-51,kind==='m'?83:184,16]);assert.equal(front.size[0],width-126);
  assert.deepEqual(flattenParts(evaluate(c)),cuts);assert.deepEqual(evaluate(c).drilling,drilling);assert.equal(serialize(c),saved);
 }
});

test('ANTARO conversion refits MERIVOBOX rear brackets around the back without wood intersections',()=>{
 for(const internal of [false,true])for(const kind of ['m','e-gallery','e-closed']){
  const b=base(),before=addDrawerStack(b,b.compartments.id,2,antaroPin,true,internal).cabinet,id=before.drawers![0].id;
  const after=editDrawerGroup(before,[id],{pack:pin(pack(kind))}),model=evaluate(after),drawer=model.drawers.drawers.find(d=>d.id===id)!,back=drawer.parts.find(p=>p.id===id+'/back')!;
  assert.equal(drawerPack(after.drawers![0].pack).family,'merivobox');assert.deepEqual(after.drawers![1],before.drawers![1]);assert.equal(after.drawers![0].internal?.setback,before.drawers![0].internal?.setback);
  assert.deepEqual(drawer.back,[drawer.allocation.size[0]-51,kind==='m'?83:184,16]);
  for(const side of ['left','right']){
   const part=drawer.parts.find(p=>p.id===id+'/back-fixing-'+side)!,geometry=drawerDisplayGeometry(part),positions=geometry.getAttribute('position'),index=geometry.getIndex();
   const wood=new Box3(new Vector3(...back.center).sub(new Vector3(...part.center)).sub(new Vector3(...back.size).multiplyScalar(.5)).addScalar(.0001),new Vector3(...back.center).sub(new Vector3(...part.center)).add(new Vector3(...back.size).multiplyScalar(.5)).addScalar(-.0001));
   const point=(i:number)=>new Vector3().fromBufferAttribute(positions,index?index.getX(i):i);
   for(let i=0;i<(index?.count??positions.count);i+=3)assert.equal(wood.intersectsTriangle(new Triangle(point(i),point(i+1),point(i+2))),false,`${kind} ${side} bracket intersects the wooden back`);
   // The bracket's rear lip covers the manufacturer's existing back screw line.
   const screwX=side==='left'?drawer.allocation.origin[0]+36.5:drawer.allocation.origin[0]+drawer.allocation.size[0]-36.5;
   assert.ok(screwX>part.center[0]-part.size[0]/2&&screwX<part.center[0]+part.size[0]/2);
   const screws=model.drilling.filter(h=>h.panelId===back.id&&Math.abs(h.point[0]-screwX)<.0001);assert.equal(screws.length,kind==='m'?2:4);
   assert.ok(screws.every(h=>Math.abs(h.point[2]-(part.center[2]-part.size[2]/2+1.5))<.0001));
   geometry.dispose();
  }
  assert.deepEqual(deserialize(serialize(after)),after);const store=new CabinetStore(before);assert.ok(store.commit(after));store.undo();assert.deepEqual(store.getSnapshot().committed,before);store.redo();assert.deepEqual(store.getSnapshot().committed,after);
 }
});
