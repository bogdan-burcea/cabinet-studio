import {planSheets} from '../src/cnc/layout';
import test from 'node:test';import assert from 'node:assert/strict';import clipping from 'polygon-clipping';
import {createCabinet,type Cabinet} from '../src/domain/cabinet';import {addSimpleDoors,editSimpleDoors} from '../src/commands/simple-doors';import {splitDoor} from '../src/commands/fronts';
import {defaultHinge} from '../src/catalogue/hinges';import {defaultShaker,physicalPanels,physicalPockets} from '../src/rules/shaker';import {evaluate} from '../src/geometry/evaluate';
import {flattenParts,flatPreview} from '../src/cnc/parts';import {panelDisplayGeometry} from '../src/viewport/part-mesh';import {explodedCabinetLayout} from '../src/viewport/display';
import {serialize,deserialize} from '../src/persistence/files';import {CabinetStore} from '../src/commands/store';import {safeDoorAngles,doorOpeningPose,safeInnerDrawerExtensions} from '../src/rules/door-motion';
import {rectProfile,pocketProfiles} from '../src/geometry/cut-profiles';import {constructionOwner} from '../src/domain/construction-selection';import {cabinetForExport} from '../src/cnc/sheet-export';
function doors(style:'slab'|'shaker-routed'|'shaker-frame',infill:'wood'|'glass'='wood'):Cabinet{const c=addSimpleDoors(createCabinet(),'pair').cabinet;return {...c,fronts:c.fronts.map(d=>({...d,style,shaker:{...defaultShaker,infill},hinge:defaultHinge()}))};}
test('routed shaker is one real recessed board with unchanged envelope, hardware and opening sweep',()=>{
 const c=doors('shaker-routed'),e=evaluate(c),plain=evaluate({...c,fronts:c.fronts.map(d=>({...d,style:'slab'}))});
 assert.deepEqual(e.fronts.doors.map(d=>[d.id,d.size,d.center,d.pivot]),plain.fronts.doors.map(d=>[d.id,d.size,d.center,d.pivot]));assert.deepEqual(e.drilling,plain.drilling);
 for(const d of e.fronts.doors){const pocket=e.pockets.find(p=>p.panelId===d.id&&p.id.endsWith('/recess'))!;assert.equal(pocket.size[2],6);assert.ok(pocket.outline!.length>16);assert.equal(pocket.origin[2]+6,d.center[2]+9);const part=flattenParts(e).find(p=>p.id===d.id)!;assert.ok(flatPreview(part,1).slots);assert.equal(part.thickness,18);}
 assert.equal(flattenParts(e).length,flattenParts(plain).length);assert.deepEqual(safeDoorAngles(e,{},c.fronts.map(d=>d.id),110),safeDoorAngles(plain,{},c.fronts.map(d=>d.id),110));
});
test('framed wood/glass shaker has five physical cut parts, matching bores, panel fit, stable owners and real dovetails',()=>{
 for(const infill of ['wood','glass'] as const){const c=doors('shaker-frame',infill),e=evaluate(c),parts=flattenParts(e,{includeGlass:true}),offsets=explodedCabinetLayout(e,80);
 for(const d of e.fronts.doors){const frame=parts.filter(p=>p.panel.provenance===d.id);assert.equal(frame.length,5);assert.ok(!parts.some(p=>p.id===d.id));assert.ok(!physicalPanels(e).some(p=>p.id===d.id));
 const panel=frame.find(p=>p.id.endsWith(infill==='glass'?'/glass-panel':'/centre-panel'))!;assert.equal(panel.width,d.size[0]-140+16-.2);assert.equal(panel.height,d.size[1]-140+16-.2);assert.equal(panel.thickness,6);assert.equal(panel.holes.length,0);assert.equal(panel.material.startsWith('Glass'),infill==='glass');
 for(const p of frame){assert.equal(constructionOwner(c,p.id),d.id);assert.notDeepEqual(offsets.get(p.id),offsets.get(d.id));const g=panelDisplayGeometry(p.panel,physicalPockets(e),e.shaker.bores);assert.ok(g.getAttribute('position').count>0);g.dispose();flatPreview(p,p.face);}
 // Check the real infill-depth section too, including the rounded rebate corners.
 const depth=d.center[2]-d.size[2]/2+4;
 const sections=frame.map(p=>{const [u,v]=[p.width,p.height],x=p.panel.center[0]-u/2,y=p.panel.center[1]-v/2;let profile=[rectProfile(x,y,u,v)];if(depth<p.panel.center[2]-p.thickness/2||depth>p.panel.center[2]+p.thickness/2)return [];
 for(const cut of p.cuts.filter(cut=>depth>cut.origin[2]&&depth<cut.origin[2]+cut.size[2]))profile=clipping.difference(profile,...pocketProfiles(cut,0,1));return profile;});
 for(let i=0;i<sections.length;i++)for(let j=i+1;j<sections.length;j++)assert.equal(clipping.intersection(sections[i],sections[j]).length,0,'infill/frame material overlap');
 const hinge=e.shaker.bores.filter(b=>b.id.startsWith(d.id+'/hinge/')&&b.kind==='hinge-cup');assert.equal(hinge.length,2);assert.ok(hinge.every(b=>b.panelId.endsWith(d.handing==='left'?'/left-stile':'/right-stile')));
 // At mid-stock, complementary joint profiles leave no material interpenetration.
 const profiles=frame.filter(p=>!p.id.endsWith('/centre-panel')&&!p.id.endsWith('/glass-panel')).map(p=>{const [w,h]=[p.width,p.height],x=p.panel.center[0]-w/2,y=p.panel.center[1]-h/2;let profile=[rectProfile(x,y,w,h)];for(const cut of p.cuts.filter(cut=>cut.size[2]===18))profile=clipping.difference(profile,...pocketProfiles(cut,0,1));return profile;});
 for(let i=0;i<profiles.length;i++)for(let j=i+1;j<profiles.length;j++)assert.equal(clipping.intersection(profiles[i],profiles[j]).length,0);
 }
 const exported=cabinetForExport(e,'Shaker cabinet');assert.equal(exported.parts.filter(p=>p.name.includes('Shaker door')).length,10);
 assert.ok(!e.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'));assert.deepEqual(deserialize(serialize(c)),c);
 const ids=c.fronts.map(d=>d.id),opened=safeDoorAngles(e,{},ids,110);assert.equal(opened.blocked,false);assert.equal(safeDoorAngles(e,opened.angles,ids,0).blocked,false);
 }
});
test('shaker edits preserve undo/redo and copies, reject unusable frame/stock/hardware and keep older formats strict',()=>{
 const base=doors('slab'),framed={...base,fronts:base.fronts.map(d=>({...d,style:'shaker-frame' as const}))},store=new CabinetStore(base);assert.ok(store.commit(framed));store.undo();assert.deepEqual(store.getSnapshot().committed,base);store.redo();assert.deepEqual(store.getSnapshot().committed,framed);
 const split=splitDoor({...framed,fronts:framed.fronts.slice(0,1).map(d=>({...d,region:{left:0,right:1,bottom:0,top:1}}))},framed.fronts[0].id,'vertical').cabinet;assert.ok(split.fronts.every(d=>d.style==='shaker-frame'));evaluate(split);
 for(const change of [{frameWidth:140},{panelThickness:16}])assert.throws(()=>evaluate({...framed,fronts:framed.fronts.map(d=>({...d,shaker:{...defaultShaker,...change}}))}),/opening|rebate/i);
 assert.throws(()=>evaluate({...framed,fronts:framed.fronts.map(d=>({...d,shaker:{...defaultShaker,frameWidth:50},hinge:{...d.hinge!,endOffset:35}}))}),/Shaker drilling|solid frame/);
 const routed=doors('shaker-routed');assert.throws(()=>evaluate({...routed,fronts:routed.fronts.map(d=>({...d,shaker:{...defaultShaker,recessDepth:16}}))}),/3 mm/);
 const glass=doors('shaker-frame','glass');assert.throws(()=>evaluate({...glass,fronts:glass.fronts.map(d=>({...d,handle:{...d.handle,kind:'pull' as const,orientation:'horizontal' as const,horizontal:'centre' as const}}))}),/solid frame|Shaker drilling/);
 const doc=JSON.parse(serialize(glass));doc.schemaVersion=59;doc.evaluatorRevision='custom-hinges-59';assert.throws(()=>deserialize(JSON.stringify(doc)),/version 60/);
});

import {readFileSync} from 'node:fs';import {fitMetallaHinges} from '../src/commands/metalla-hinges';import {drawerOpeningIssue} from '../src/rules/door-motion';
test('inset shaker frames retain inner-drawer clearance and still detect genuine obstructions',()=>{
 const original=deserialize(readFileSync(new URL('./fixtures/pantry-inset-inner-drawers.json',import.meta.url),'utf8')),valid=fitMetallaHinges(original,original.fronts.map(d=>d.id));
 for(const style of ['shaker-routed','shaker-frame'] as const){const c={...valid,fronts:valid.fronts.map(d=>({...d,style,shaker:{...defaultShaker,infill:style==='shaker-frame'?'glass' as const:'wood' as const}}))},e=evaluate(c);assert.equal(drawerOpeningIssue(e),null);assert.deepEqual(c.drawers,valid.drawers);
 const obstruction={...e.panels[0],id:'genuine-obstruction',size:[1000,3000,1000] as [number,number,number],center:[300,1000,900] as [number,number,number]};assert.ok(drawerOpeningIssue({...e,panels:[...e.panels,obstruction]}));
 }
});

test('shaker explosion separates every physical element and restores the assembled positions at zero',()=>{
 const e=evaluate(doors('shaker-frame','glass')),exploded=explodedCabinetLayout(e,80),closed=explodedCabinetLayout(e,0);
 for(const door of e.fronts.doors){const parts=e.shaker.panels.filter(p=>p.doorOwnerId===door.id),base=exploded.get(door.id)!;
 assert.equal(new Set(parts.map(p=>JSON.stringify(exploded.get(p.id)))).size,5);
 for(const part of parts)assert.deepEqual(closed.get(part.id),[0,0,0]);
 assert.equal(exploded.get(parts.find(p=>p.infill)!.id)![2],base[2]+80);
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)assert.ok(parts[i].size.some((n,a)=>Math.abs(parts[i].center[a]+exploded.get(parts[i].id)![a]-parts[j].center[a]-exploded.get(parts[j].id)![a])>=(n+parts[j].size[a])/2),'exploded parts must not overlap');
 }
});
test('routed separate-panel construction shares real rebate, glass cut dimensions and drilling with previews and exports',()=>{
 for(const infill of ['wood','glass'] as const){const base=doors('shaker-frame',infill),c={...base,fronts:base.fronts.map(d=>({...d,style:'shaker-routed-panel' as const}))},e=evaluate(c),flat=flattenParts(e,{includeGlass:true});
 for(const door of e.fronts.doors){const parts=flat.filter(p=>p.panel.provenance===door.id);assert.equal(parts.length,2);const frame=parts.find(p=>p.id.endsWith('/routed-frame'))!,panel=parts.find(p=>p.id.endsWith('/centre-panel')||p.id.endsWith('/glass-panel'))!;
 assert.deepEqual(frame.panel.size,door.size);assert.equal(panel.width,door.size[0]-124.2);assert.equal(panel.height,door.size[1]-124.2);assert.equal(panel.thickness,6);assert.equal(panel.holes.length,0);
 assert.ok(frame.cuts.some(c=>c.id.endsWith('/aperture')&&c.size[2]===18&&c.outline!.length>16));assert.ok(frame.cuts.some(c=>c.id.endsWith('/rebate')&&c.size[2]===8));assert.ok(!frame.cuts.some(c=>c.id.includes('/joint/')));
 assert.ok(e.shaker.bores.filter(b=>b.id.startsWith(door.id+'/hinge/')&&b.kind==='hinge-cup').every(b=>b.panelId===frame.id));
 let section=[rectProfile(frame.panel.center[0]-frame.width/2,frame.panel.center[1]-frame.height/2,frame.width,frame.height)];for(const cut of frame.cuts.filter(c=>c.origin[2]<door.center[2]-5&&c.origin[2]+c.size[2]>door.center[2]-5))section=clipping.difference(section,...pocketProfiles(cut,0,1));
 assert.equal(clipping.intersection(section,rectProfile(panel.panel.center[0]-panel.width/2,panel.panel.center[1]-panel.height/2,panel.width,panel.height)).length,0,'rebate must clear the real square infill');
 const g=panelDisplayGeometry(frame.panel,physicalPockets(e),e.shaker.bores);assert.ok(g.getAttribute('position').count);g.dispose();assert.ok(flatPreview(frame,-1).slots);
 }
 assert.deepEqual(deserialize(serialize(c)),c);assert.equal(safeDoorAngles(e,{},c.fronts.map(d=>d.id),110).blocked,false);assert.ok(!e.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'));
 const s=new CabinetStore(base);assert.ok(s.commit(c));s.undo();assert.deepEqual(s.getSnapshot().committed,base);s.redo();assert.deepEqual(s.getSnapshot().committed,c);
 const doc=JSON.parse(serialize(c));doc.schemaVersion=60;doc.evaluatorRevision='shaker-60';assert.throws(()=>deserialize(JSON.stringify(doc)),/version 61/);
 }
 const legacy=doors('shaker-frame'),doc=JSON.parse(serialize(legacy));doc.schemaVersion=60;doc.evaluatorRevision='shaker-60';assert.deepEqual(deserialize(JSON.stringify(doc)),legacy);
});

test('glass stays in Build and assembled STEP while CNC parts and nested sheets exclude it',()=>{
 for(const style of ['shaker-frame','shaker-routed-panel'] as const){const c=doors('shaker-frame','glass');c.fronts=c.fronts.map(d=>({...d,style}));const e=evaluate(c),all=flattenParts(e,{includeGlass:true}),cnc=flattenParts(e),glass=e.shaker.panels.filter(p=>p.glass);
 assert.equal(glass.length,2);assert.equal(all.length,cnc.length+2);assert.ok(glass.every(p=>physicalPanels(e).some(q=>q.id===p.id)));assert.ok(cnc.every(p=>!p.id.endsWith('/glass-panel')));const plan=planSheets(cnc,{},.2);assert.ok(plan.groups.every(g=>!g.entries.some(p=>p.id.endsWith('/glass-panel'))));assert.ok(!plan.unplaced.some(p=>p.id.endsWith('/glass-panel')));assert.equal(cabinetForExport(e,'Glass doors').parts.filter(p=>p.name.endsWith('glass panel')).length,2);
 for(const panel of glass){assert.equal(panel.size[2],6);assert.deepEqual(flatPreview(all.find(p=>p.id===panel.id)!,1).face.bores,[]);}
 }
});
