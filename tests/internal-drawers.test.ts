import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {resizeCabinet} from '../src/commands/dimensions';
import {addDrawerStack,setDrawerInternal,duplicateDrawers,editDrawerGroup} from '../src/commands/drawers';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {evaluate} from '../src/geometry/evaluate';
import {drawerComponents,drawerPack,antaroPin} from '../src/catalogue/drawers';
import {flattenParts} from '../src/cnc/parts';
import {CabinetStore} from '../src/commands/store';
import {serialize,deserialize,deserializeWithInfo} from '../src/persistence/files';
import {safeInnerDrawerExtensions} from '../src/rules/door-motion';
import {explodedCabinetLayout} from '../src/viewport/display';
import {drawerDisplayGeometry} from '../src/viewport/drawer-mesh';
import {setDrawerFrontHeight} from '../src/commands/drawers';
function pantry(){const c=resizeCabinet(resizeCabinet(createCabinet(),'height',2100),'depth',600);return addSimpleDoors(c,'pair',[c.compartments.id]).cabinet;}
function fitted(){const c=pantry();return addDrawerStack(c,c.compartments.id,4,antaroPin,false,true).cabinet;}

test('pantry inner drawers retain full doors and use matched recessed hardware and only two cut boards each',()=>{
 const c=fitted(),m=evaluate(c),parts=flattenParts(m);
 assert.equal(c.fronts.length,2);assert.equal(m.drawers.drawers.length,4);
 for(const d of m.drawers.drawers){
  const w=d.allocation.size[0],pack=drawerPack(d.intent.pack),front=d.parts.find(p=>p.id===d.id+'/front')!;
  assert.equal(pack.nominalLength,500);assert.equal(d.requiredDepth,pack.minimumDepth+60);
  assert.deepEqual(d.bottom,[w-75,16,476]);assert.deepEqual(d.back,[w-87,84,16]);assert.equal(front.size[0],w-132);assert.equal(front.material,'steel');
  assert.equal(front.center[2]-front.size[2]/2,c.envelope.depth-60);
  assert.deepEqual(drawerComponents(d.intent).map(p=>p.article).slice(-3),['ZIF.71M0','Z31L1036A','ZIF.80M5']);
  assert.ok(!d.parts.some(p=>p.article==='ZSF.35A2'));
  assert.equal(parts.filter(p=>p.panel.provenance===d.id).length,2);
  assert.ok(!m.drilling.some(b=>b.panelId===d.id+'/front'));
  const pilot=m.drilling.find(b=>b.id===d.id+'/runner-left/pilot-37')!;assert.equal(pilot.point[2],c.envelope.depth-60-37);
 }
});
test('inner setback refits automatic runners, shifts all matching drilling and preserves ids, doors, history and native data',()=>{
 const c=fitted(),ids=c.drawers!.map(d=>d.id),store=new CabinetStore(c),next=editDrawerGroup(c,ids,{internal:{revision:'antaro-inner-1',setback:100}});
 const fit=fitDrawerRails(next);assert.ok(store.commit(fit));assert.equal(drawerPack(fit.drawers![0].pack).nominalLength,450);
 assert.deepEqual(fit.fronts,c.fronts);assert.deepEqual(fit.drawers!.map(d=>d.id),ids);
 assert.deepEqual(deserialize(serialize(fit)),fit);store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,fit);
});
import {fitDrawerRails} from '../src/rules/drawer-rails';
test('inner conversion is atomic, preserves identity, and old external drawers remain compatible',()=>{
 const base=resizeCabinet(createCabinet(),'depth',600),external=addDrawerStack(base,base.compartments.id,3).cabinet,ids=external.drawers!.map(d=>d.id),inner=setDrawerInternal(external,[ids[0]],true);
 assert.ok(inner.drawers!.every(d=>d.internal));assert.deepEqual(inner.drawers!.map(d=>d.id),ids);assert.equal(flattenParts(evaluate(inner)).length,flattenParts(evaluate(external)).length-3);
 assert.deepEqual(deserialize(serialize(inner)),inner);
 const old=JSON.parse(serialize(external));old.schemaVersion=56;old.evaluatorRevision='rail-hanger-access-56';assert.deepEqual(deserializeWithInfo(JSON.stringify(old)),{cabinet:external,migrated:true});
 const invalid=JSON.parse(serialize(inner));invalid.schemaVersion=56;invalid.evaluatorRevision='rail-hanger-access-56';assert.throws(()=>deserialize(JSON.stringify(invalid)));
 assert.ok(setDrawerInternal(inner,ids,false).drawers!.every(d=>!d.internal));
});
test('inner layout rejects unsupported variants, insufficient depth, invalid native settings and colliding allocations',()=>{
 const c=fitted(),id=c.drawers![0].id;
 for(const internal of [{revision:'antaro-inner-1',setback:20},{revision:'antaro-inner-1',setback:60.01},{revision:'unknown',setback:60}])assert.throws(()=>evaluate({...c,drawers:c.drawers!.map(d=>d.id===id?{...d,internal:internal as any}:d)}));
 assert.throws(()=>evaluate({...c,drawers:c.drawers!.map(d=>d.id===id?{...d,pack:{...d.pack,id:d.pack.id.replace('-m-','-k-')}}:d)}));
 const bad=JSON.parse(serialize(c));bad.cabinet.drawers[0].internal.extra=true;assert.throws(()=>deserialize(JSON.stringify(bad)));
 const manual={...c,drawers:c.drawers!.map(d=>({...d,manualRail:true}))};assert.throws(()=>evaluate(resizeCabinet(manual,'depth',400)));
 const overlap={...c,drawers:c.drawers!.map(d=>{const {stack,...rest}=d;return {...rest,offset:0,frontHeight:160};})};assert.throws(()=>evaluate(overlap));
});
test('inner drawer duplication and spacing keep matching aluminium fronts and exploded fitting ownership',()=>{
 const c=fitted(),id=c.drawers![0].id,duplicate=duplicateDrawers(c,[id]),m=evaluate(duplicate.cabinet);
 assert.equal(m.drawers.drawers.length,5);assert.ok(duplicate.cabinet.drawers!.find(d=>d.id===duplicate.featureIds[0])!.internal);
 const spaced=setDrawerFrontHeight(c,[id],250),sm=evaluate(spaced);assert.equal(sm.drawers.drawers.find(d=>d.id===id)!.allocation.size[1],254);
 const offsets=explodedCabinetLayout(m,80);
 for(const d of m.drawers.drawers){assert.deepEqual(offsets.get(d.id+'/inner-handle'),offsets.get(d.id+'/front'));assert.deepEqual(offsets.get(d.id+'/front-fixing-left'),offsets.get(d.id+'/front'));
  const front=d.parts.find(p=>p.id===d.id+'/front')!,geometry=drawerDisplayGeometry(front);geometry.computeBoundingBox();assert.ok(geometry.boundingBox);geometry.dispose();
 }
});
test('closed doors block inner tray travel and an empty front opening allows extension',()=>{
 const c=fitted(),m=evaluate(c),targets=Object.fromEntries(c.drawers!.map(d=>[d.id,100]));
 const closed=safeInnerDrawerExtensions(m,{},targets);assert.ok(closed.blocked);assert.ok(Object.values(closed.angles).some(n=>n<100));
 const open=evaluate({...c,fronts:[]});const clear=safeInnerDrawerExtensions(open,{},targets);assert.equal(clear.blocked,false);for(const d of c.drawers!)assert.equal(clear.angles[d.id],100);
});

import {defaultHinge,blumClip155} from '../src/catalogue/hinges';
import {safeDoorAngles} from '../src/rules/door-motion';
test('selected 110 and 155 degree hinges clamp independently and closing sweeps check extended drawer bodies',()=>{
 const base=fitted(),c={...base,fronts:base.fronts.map((d,i)=>({...d,hinge:defaultHinge(i===0?blumClip155.id:undefined)}))},m=evaluate(c),ids=c.fronts.map(d=>d.id);
 const opened=safeDoorAngles(m,{},ids,180);assert.equal(opened.blocked,false);assert.equal(opened.angles[ids[0]],155);assert.equal(opened.angles[ids[1]],110);
 const extended={...opened.angles,...Object.fromEntries(c.drawers!.map(d=>[d.id,100]))};
 const closing=safeDoorAngles(m,extended,ids,0);assert.ok(closing.blocked);assert.ok(m.drawers.drawers.some(d=>d.id===closing.collision!.otherOwner));
 for(const d of c.drawers!)assert.equal(closing.angles[d.id],100);
 const retracted={...opened.angles,...Object.fromEntries(c.drawers!.map(d=>[d.id,0]))};assert.equal(safeDoorAngles(m,retracted,ids,0).blocked,false);
});

import {hingePlateRepairs} from '../src/commands/clearance-repairs';
test('600 × 720 × 560 inner drawers report the obstructing lower hinges and offer an evaluated reversible repair',()=>{
 for(const profile of [undefined,blumClip155.id]){
  const base=resizeCabinet(createCabinet(),'depth',560),doors=addSimpleDoors(base,'pair',[base.compartments.id]).cabinet;
  const hinged={...doors,fronts:doors.fronts.map(d=>({...d,hinge:defaultHinge(profile)}))},c=addDrawerStack(hinged,base.compartments.id,3,antaroPin,false,true).cabinet,m=evaluate(c);
  const blocked=m.issues.filter(i=>i.code==='machining-hinge-plate');assert.equal(blocked.length,2);assert.ok(blocked.every(i=>i.message.includes('Internal drawer 3')));
  const options=hingePlateRepairs(c);assert.ok(options.length);
  for(const option of options){
   const next=option.cabinet,after=evaluate(next),ids=next.fronts.map(d=>d.id),opened=safeDoorAngles(after,{},ids,155),full=safeInnerDrawerExtensions(after,{}, {...opened.angles,...Object.fromEntries(next.drawers!.map(d=>[d.id,100]))});
   assert.equal(full.blocked,false);assert.ok(next.drawers!.every(d=>full.angles[d.id]===100));
   assert.deepEqual(next.drawers,c.drawers);assert.deepEqual(after.panels,m.panels);assert.ok(!after.issues.some(i=>['machining-hinge-plate','machining-hole-collision','machining-collision'].includes(i.code)));
   assert.deepEqual(deserialize(serialize(next)),next);const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);
  }
 }
});

test('exploded inner fronts stay aligned with their own drawer rather than stacking above overlapping doors',()=>{
 const base=resizeCabinet(createCabinet(),'depth',560),pair=addSimpleDoors(base,'pair',[base.compartments.id]).cabinet,c=addDrawerStack(pair,base.compartments.id,3,antaroPin,false,true).cabinet,before=serialize(c),m=evaluate(c),offsets=explodedCabinetLayout(m,80);
 const pieces=[...m.panels,...m.drawers.drawers.flatMap(d=>d.parts.filter(p=>p.material!=='steel'||p.id.endsWith('/front')))];
 for(const drawer of m.drawers.drawers){
  const front=offsets.get(drawer.id+'/front')!,bottom=offsets.get(drawer.id+'/bottom')!;
  assert.equal(front[0],bottom[0]);assert.equal(front[1],bottom[1]);
  for(const suffix of ['/inner-handle','/front-fixing-left','/front-fixing-right'])assert.deepEqual(offsets.get(drawer.id+suffix),front);
 }
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
  const a=pieces[i],b=pieces[j],oa=offsets.get(a.id)!,ob=offsets.get(b.id)!;
  assert.ok(![0,1,2].every(axis=>Math.min(a.center[axis]+oa[axis]+a.size[axis]/2,b.center[axis]+ob[axis]+b.size[axis]/2)-Math.max(a.center[axis]+oa[axis]-a.size[axis]/2,b.center[axis]+ob[axis]-b.size[axis]/2)>.001),`${a.id} overlaps ${b.id}`);
 }
 const reversed=explodedCabinetLayout({...m,drawers:{...m.drawers,drawers:[...m.drawers.drawers].reverse()}},80);
 for(const [id,offset] of offsets)assert.deepEqual(reversed.get(id),offset);
 for(const offset of explodedCabinetLayout(m,0).values())assert.deepEqual(offset,[0,0,0]);assert.equal(serialize(c),before);
});

import {readFileSync} from 'node:fs';
import {innerDrawerOpeningRepairs} from '../src/commands/clearance-repairs';
test('saved pantry offers an explicit complete overlay correction while preserving the original inset cabinet',()=>{
 const c=deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')),before=serialize(c),m=evaluate(c),ids=c.fronts.map(d=>d.id),opened=safeDoorAngles(m,{},ids,155);
 assert.equal(opened.blocked,false);assert.ok(ids.every(id=>opened.angles[id]===155));
 const blocked=safeInnerDrawerExtensions(m,{}, {...opened.angles,...Object.fromEntries(c.drawers!.map(d=>[d.id,100]))});
 assert.ok(blocked.blocked);assert.equal(m.drawers.drawers.find(d=>d.id===blocked.drawerId)!.label,'Internal drawer 5');assert.equal(blocked.otherId,ids[0]);
 const options=innerDrawerOpeningRepairs(c);assert.ok(options.length);assert.equal(serialize(c),before);assert.ok(c.fronts.every(d=>d.placement==='inset'));
 for(const option of options){
  assert.match(option.label,/Change to overlay doors/);const next=option.cabinet,e=evaluate(next),doors=safeDoorAngles(e,{},ids,155),drawers=safeInnerDrawerExtensions(e,{}, {...doors.angles,...Object.fromEntries(next.drawers!.map(d=>[d.id,100]))});
  assert.equal(doors.blocked,false);assert.equal(drawers.blocked,false);assert.ok(next.drawers!.every(d=>drawers.angles[d.id]===100));
  assert.deepEqual(next.drawers,c.drawers);assert.deepEqual(next.compartments,c.compartments);assert.deepEqual(next.fronts.map(d=>d.id),ids);assert.ok(next.fronts.every(d=>d.placement==='overlay'));
  assert.ok(!e.issues.some(i=>['machining-hinge-plate','machining-hole-collision','machining-collision'].includes(i.code)));
  assert.deepEqual(deserialize(serialize(next)),next);const store=new CabinetStore(c);assert.ok(store.commit(next));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 }
});

import {drawerOpeningIssue} from '../src/rules/door-motion';
import {drawerOpeningEditIssue} from '../src/commands/drawer-opening-preflight';
test('inset incompatibility is detected when editing, before opening, with reversible evaluated overlay correction',()=>{
 const inset=deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')),valid=innerDrawerOpeningRepairs(inset)[0].cabinet,ids=inset.fronts.map(d=>d.id);
 assert.equal(drawerOpeningIssue(evaluate(valid)),null);
 const requested={...valid,fronts:valid.fronts.map(d=>({...d,placement:'inset' as const}))},before=serialize(valid),issue=drawerOpeningEditIssue(requested,valid);
 assert.ok(issue);assert.match(issue.message,/cannot fully extend/);assert.equal(serialize(valid),before);
 const options=innerDrawerOpeningRepairs(requested);assert.ok(options.length);
 for(const option of options){assert.equal(drawerOpeningEditIssue(option.cabinet,valid),null);assert.equal(drawerOpeningIssue(evaluate(option.cabinet)),null);assert.deepEqual(option.cabinet.drawers,valid.drawers);assert.deepEqual(option.cabinet.fronts.map(d=>d.id),ids);}
 // Files made earlier can still load, and their issue is visible immediately.
 assert.ok(drawerOpeningIssue(evaluate(deserialize(serialize(inset)))));
 const withoutInner={...inset,drawers:inset.drawers!.filter(d=>!d.internal)};assert.ok(drawerOpeningEditIssue(inset,withoutInner));
 assert.equal(drawerOpeningEditIssue({...inset,name:'Renamed'},inset),null);
 assert.equal(drawerOpeningEditIssue({...inset,id:'another-document'},valid),null);
});

test('an existing drawer error cannot hide another geometry edit, while names and finishes remain editable',()=>{
 const c=deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8'));
 const changed={...c,drawers:c.drawers!.map((d,i)=>i===0?{...d,handle:{geometry:{id:'concept-slab-handle',revision:'1'},kind:'knob' as const,pitch:128,orientation:'vertical' as const,edgeOffset:40,height:'centre' as const,endOffset:60}}:d)};
 assert.ok(drawerOpeningEditIssue(changed,c));
 assert.equal(drawerOpeningEditIssue({...c,names:{...c.names,[c.drawers![0].id]:'Renamed drawer'}},c),null);
});
