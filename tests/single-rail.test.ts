import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {setCabineo} from '../src/commands/cabineo';
import {setBackPanel,setBackFastener} from '../src/commands/back-panel';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {serialize,deserializeWithInfo} from '../src/persistence/files';
import {CabinetStore} from '../src/commands/store';

test('either top or back rail can be omitted without ghost parts or machining',()=>{
 for(const top of [0,1,2,3])for(const back of [0,1,2,3]){
  let c=setConstructionMode(setConstructionMode(createCabinet(),'top','rails'),'back','rails');
  c.carcass.top.frontDepth=top&1?120:0;c.carcass.top.rearDepth=top&2?120:0;
  c.carcass.back.upperHeight=back&1?120:0;c.carcass.back.lowerHeight=back&2?120:0;
  c=setCabineo(c,'cabineo-8');const model=evaluate(c),ids=new Set(model.panels.map(p=>p.id));assert.deepEqual(model.issues,[]);
  assert.equal(model.panels.filter(p=>p.role.startsWith('top-')).length,Number(!!(top&1))+Number(!!(top&2)));
  assert.equal(model.panels.filter(p=>p.role.startsWith('back-')).length,Number(!!(back&1))+Number(!!(back&2)));
  assert.ok(model.panels.every(p=>p.size.every(n=>n>0)));
  assert.ok(model.pockets.every(p=>ids.has(p.panelId)));
  assert.ok(model.cabineo.flatMap(j=>j.bores).every(b=>ids.has(b.panelId)));
  assert.equal(flattenParts(model).length,model.panels.length);
  assert.deepEqual(evaluate(deserializeWithInfo(serialize(c)).cabinet),model);
 }
});

test('omitting the rear top rail removes its seating and back connections; changes undo together',()=>{
 for(const mode of ['inset','groove','rebate','finger','applied'] as const){
  let c=setConstructionMode(setBackPanel(createCabinet(),{mode}),'top','rails');
  if(mode==='inset')c=setBackFastener(c,true);
  const store=new CabinetStore(c),next=structuredClone(c);next.carcass.top.rearDepth=0;
  assert.ok(store.commit(next));const m=evaluate(next),ids=new Set(m.panels.map(p=>p.id));
  assert.ok(m.pockets.every(p=>ids.has(p.panelId)));assert.ok(m.drilling.every(b=>ids.has(b.panelId)));
  assert.ok(!m.backFasteners.some(b=>b.panelId.endsWith('/top-rear-rail')));
  store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,next);
 }
 const c=createCabinet();c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top={enabled:true,width:0};assert.doesNotThrow(()=>evaluate(c));
 c.carcass.top.frontDepth=10;assert.throws(()=>evaluate(c),/0 \(no rail\) or 20/);
});

test('upper vertical rails reach the side tops only where their horizontal top rail is absent',()=>{
 for(const mode of ['full','rails','open'] as const)for(const front of [0,120])for(const rear of [0,120]){
  let c=setConstructionMode(setConstructionMode(createCabinet(),'top',mode),'back','rails');
  c.envelope.origin=[100,200,300];c.carcass.top.frontDepth=front;c.carcass.top.rearDepth=rear;
  c.carcass.back.upperHeight=120;c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top={enabled:true,width:120};
  c=setCabineo(c,'cabineo-8');const m=evaluate(c);
  for(const [role,covered] of [['front-upper-rail',mode==='full'||mode==='rails'&&front>0],['back-upper-rail',mode==='full'||mode==='rails'&&rear>0]] as const){
   const p=m.panels.find(p=>p.role===role)!;assert.equal(p.size[1],120);assert.equal(p.center[1]+p.size[1]/2,920-(covered?18:0));
  }
  for(let i=0;i<m.panels.length;i++)for(const q of m.panels.slice(i+1)){const p=m.panels[i];assert.ok(![0,1,2].every(a=>Math.min(p.center[a]+p.size[a]/2,q.center[a]+q.size[a]/2)-Math.max(p.center[a]-p.size[a]/2,q.center[a]-q.size[a]/2)>.001),`${mode}/${front}/${rear}: ${p.role} intersects ${q.role}`);}
  const expectedTop=920-(mode==='full'||mode==='rails'&&front>0?18:0)-120;
  assert.equal(m.opening.origin[1]+m.opening.size[1],expectedTop);
 }
});
