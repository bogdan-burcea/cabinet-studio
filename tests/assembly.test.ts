import {defaultDoor} from '../src/catalogue/fronts';
import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet,type Vec3} from '../src/domain/cabinet';import {createAssembly,validateAssembly,type AssemblyItem,assemblySize,type Assembly} from '../src/domain/assembly';
import {appendAssemblyItem,placeAssemblyItem,assemblyBounds,assemblyPoint,assemblyIssues,assemblyParts} from '../src/rules/assembly';import {addSimpleDoors} from '../src/commands/simple-doors';
import {AssemblyStore} from '../src/commands/assembly-store';import {serializeAssembly,deserializeAssembly} from '../src/persistence/assembly';
function createBlindCornerCabinet(c:ReturnType<typeof createCabinet>){if(c.envelope.width<c.envelope.depth+200)throw Error('width must exceed depth');return {...c,name:'Legacy blind corner',fronts:[{...defaultDoor({left:(c.envelope.depth+50)/c.envelope.width,right:1,bottom:0,top:1}),handing:'right' as const}]};}
function cabinet(id:string,position:Vec3=[0,0,0],rotation:0|90|180|270=0,doors=false):AssemblyItem{const c=createCabinet();return {id,label:id,kind:'cabinet',cabinet:doors?addSimpleDoors(c,'pair').cabinet:c,position,rotation};}
function assembly(items:AssemblyItem[]):Assembly{return {...createAssembly(),items};}
test('assembly positioning snaps actual rotated edges, respects vertical separation and includes reserved spaces',()=>{
 const a=cabinet('A'),b=cabinet('B'),initial=assembly([a,b]);const snapped=placeAssemblyItem(initial,'B',[610,0,7]);assert.deepEqual(snapped.items[1].position,[600,0,0]);assert.deepEqual(initial.items[1].position,[0,0,0]);
 assert.deepEqual(placeAssemblyItem({...initial,snap:false},'B',[610,0,7]).items[1].position,[610,0,7]);assert.deepEqual(placeAssemblyItem(initial,'B',[610,900,7]).items[1].position,[610,900,7]);
 const corner={...b,rotation:90 as const,position:[600,0,1160] as Vec3};assert.deepEqual(assemblyBounds(corner).min,[600,0,560]);assert.deepEqual(assemblyBounds(corner).size,[560,720,600]);
 const space:AssemblyItem={id:'gap',kind:'space',label:'Gap',position:[0,0,0],rotation:0,size:[100,720,560]};const withGap=appendAssemblyItem(appendAssemblyItem(assembly([a]),space),b);assert.equal(assemblyBounds(withGap.items[2]).min[0],700);assert.equal(assemblyIssues(assembly([space,{...space,id:'gap2'}])).length,0);
});
test('assembly supports exact quarter-turn transforms at translated cabinet origins',()=>{
 const p=cabinet('A');if(p.kind!=='cabinet')throw Error();const origin:Vec3=[100,200,300];p.cabinet={...p.cabinet,envelope:{...p.cabinet.envelope,origin}};
 const rotated={...p,rotation:90 as const,position:[1000,500,2000] as Vec3};assert.deepEqual(assemblyPoint(rotated,[700,920,860]),[1560,1220,1400]);
 for(const rotation of [0,90,180,270] as const){const item={...p,rotation};validateAssembly(assembly([item]));assert.ok(assemblyParts(item).every(part=>part.center.every(Number.isFinite)));}
});
test('L-shaped doors that work individually do not warn about simultaneous sweeps',()=>{
 const a=cabinet('A',[0,0,0],0,true),b=cabinet('B',[600,0,1160],90,true),layout=assembly([a,b]),issues=assemblyIssues(layout);
 assert.ok(!issues.some(i=>i.kind==='body'));assert.equal(issues.filter(i=>i.kind==='door').length,0);
 const clear=assemblyIssues(assembly([a,{...b,position:[1000,0,1160]}]));assert.equal(clear.length,0);
});
test('facing doors may be used separately, while panels that prevent access still warn',()=>{
 const a=cabinet('A',[0,0,0],0,true),b=cabinet('B',[600,0,1500],180,true),issues=assemblyIssues(assembly([a,b]));assert.equal(issues.length,0);
 assert.equal(assemblyIssues(assembly([a,{...b,position:[600,0,2400]}])).length,0);
 for(const kind of ['end-panel','mid-panel'] as const){const panel:AssemblyItem={id:kind,label:kind,kind,position:[0,0,650],rotation:0,size:[600,720,18]};assert.ok(assemblyIssues(assembly([a,panel])).some(i=>i.kind==='door'));}
});
test('assembly Undo/Redo, independent cabinet snapshots and strict file round trips preserve Build data',()=>{
 const a=cabinet('A'),b=cabinet('B'),initial=assembly([a]),store=new AssemblyStore(initial);store.commit(appendAssemblyItem(initial,b));const added=store.getSnapshot().assembly;assert.equal(added.items.length,2);store.undo();assert.deepEqual(store.getSnapshot().assembly,initial);store.redo();assert.deepEqual(store.getSnapshot().assembly,added);
 const raw=serializeAssembly(added),loaded=deserializeAssembly(raw);assert.deepEqual(loaded,added);assert.deepEqual(assemblySize(loaded.items[0]),[600,720,560]);
 const bad=JSON.parse(raw);bad.assembly.items[1].rotation=45;assert.throws(()=>deserializeAssembly(JSON.stringify(bad)),/90/);assert.throws(()=>deserializeAssembly(JSON.stringify({...bad,version:99})),/Unsupported/);
 assert.throws(()=>validateAssembly(assembly([a,a])),/identity/);assert.equal(serializeAssembly(added),raw);
});

test('Build and Assembly share the linked cabinet while preserving placement, other cabinets and history',async()=>{
 const {syncAssemblyCabinet}=await import('../src/rules/assembly');const {resizeEnvelope}=await import('../src/commands/dimensions');
 const first=cabinet('A',[120,800,300],90),other=cabinet('B'),a=assembly([first,other]);if(first.kind!=='cabinet')throw Error();
 const next=resizeEnvelope(first.cabinet,{width:800}),synced=syncAssemblyCabinet(a,next,first.id);assert.equal(synced.itemId,'A');assert.equal(synced.assembly.items.length,2);assert.equal(synced.assembly.items[1],other);assert.deepEqual(synced.assembly.items[0].position,first.position);assert.equal(synced.assembly.items[0].rotation,90);assert.deepEqual(assemblySize(synced.assembly.items[0]),[800,720,560]);assert.equal(syncAssemblyCabinet(synced.assembly,next,'A').assembly,synced.assembly);
 const store=new AssemblyStore(a);store.commit(synced.assembly);store.undo();assert.deepEqual(store.getSnapshot().assembly,a);store.redo();assert.deepEqual(store.getSnapshot().assembly,synced.assembly);
 assert.equal(syncAssemblyCabinet(createAssembly(),next).assembly.items.length,1);
});
test('top, bottom and stacking snaps work beside rotated cabinets without affecting remote heights',()=>{
 const a=cabinet('A'),b=cabinet('B',[600,10,0]);assert.deepEqual(placeAssemblyItem(assembly([a,b]),'B',b.position).items[1].position,[600,0,0]);
 assert.equal(placeAssemblyItem(assembly([a,b]),'B',[0,710,0]).items[1].position[1],720);
 const short:AssemblyItem={id:'panel',label:'Panel',kind:'end-panel',rotation:90,position:[600,210,560],size:[560,500,18]};assert.equal(placeAssemblyItem(assembly([a,short]),short.id,short.position).items[1].position[1],220);
 assert.equal(placeAssemblyItem(assembly([a,b]),'B',[4000,10,0]).items[1].position[1],10);
});
test('drawer travel checks neighbouring cabinets, opening drawers and thin panels independently of sketch geometry',async()=>{
 const {addMetalDrawer}=await import('../src/commands/drawers');const {assemblyModel,assemblySketch}=await import('../src/rules/assembly');
 const a=cabinet('A');if(a.kind!=='cabinet')throw Error();a.cabinet=addMetalDrawer(a.cabinet,assemblyModel(a.cabinet).openings[0].id).cabinet;
 const panel:AssemblyItem={id:'panel',label:'Panel',kind:'end-panel',position:[0,0,600],rotation:0,size:[600,720,1]};
 assert.ok(assemblyIssues(assembly([a,panel])).some(i=>i.kind==='drawer'));assert.equal(assemblyIssues(assembly([a,{...panel,position:[0,0,1500]}])).length,0);
 const b={...a,id:'B',label:'B',position:[600,0,1700] as Vec3,rotation:180 as const};assert.equal(assemblyIssues(assembly([a,b])).length,0);
 const sketch=assemblySketch(a);assert.equal(sketch.filter(p=>!p.outline).length,1);assert.ok(sketch.some(p=>p.outline));assert.ok(assemblySketch(a,true).length>1);assert.ok(assemblyParts(a,0,100).filter(p=>p.drawer).every(p=>Number.isFinite(p.center[2])));
});


test('insertion shifts a connected run and its corner, leaves detached cabinets alone, and Undo restores all',async()=>{
 const {resizeAssemblyItem}=await import('../src/rules/assembly');
 const a=cabinet('A'),b=cabinet('B',[600,0,0]),c=cabinet('C',[1200,0,0]),detached=cabinet('detached',[3000,0,0]),above=cabinet('wall',[600,1200,0]),gap:AssemblyItem={id:'gap',label:'Gap',kind:'space',size:[100,720,560],position:[0,0,0],rotation:0};
 const initial=assembly([a,b,c,detached,above]),inserted=appendAssemblyItem(initial,gap,'A');assert.deepEqual(inserted.items.find(p=>p.id==='gap')!.position,[600,0,0]);assert.deepEqual(inserted.items.find(p=>p.id==='B')!.position,[700,0,0]);assert.deepEqual(inserted.items.find(p=>p.id==='C')!.position,[1300,0,0]);assert.equal(inserted.items.find(p=>p.id==='detached'),detached);assert.equal(inserted.items.find(p=>p.id==='wall'),above);
 const enlarged=resizeAssemblyItem(inserted,{...gap,position:[600,0,0],size:[150,720,560]});assert.equal(enlarged.items.find(p=>p.id==='B')!.position[0],750);
 const rotatedA={...a,rotation:90 as const},rotatedB={...b,position:[0,0,-600] as Vec3,rotation:90 as const};const rotated=appendAssemblyItem(assembly([rotatedA,rotatedB]),gap,'A');assert.deepEqual(rotated.items.find(p=>p.id==='gap')!.position,[0,0,-600]);assert.deepEqual(rotated.items.find(p=>p.id==='B')!.position,[0,0,-700]);
 const store=new AssemblyStore(initial);store.commit(inserted);store.undo();assert.deepEqual(store.getSnapshot().assembly,initial);store.redo();assert.deepEqual(store.getSnapshot().assembly,inserted);
});
test('group move and quarter turn preserve spacing, individual rotations, stable IDs and outside cabinets',async()=>{
 const {moveAssemblyGroup,rotateAssemblyGroup}=await import('../src/rules/assembly');const a=cabinet('A'),b=cabinet('B',[600,0,0]),outside=cabinet('outside',[2000,0,0]),initial=assembly([a,b,outside]);
 const moved=moveAssemblyGroup(initial,['A','B'],'B',[1000,300,200],false);assert.deepEqual(moved.items[0].position,[400,300,200]);assert.deepEqual(moved.items[1].position,[1000,300,200]);assert.equal(moved.items[2],outside);
 let rotated=initial;for(let i=0;i<4;i++)rotated=rotateAssemblyGroup(rotated,['A','B'],false);assert.deepEqual(rotated,initial);
 const once=rotateAssemblyGroup(initial,['A','B'],false);assert.equal(once.items[0].rotation,90);assert.deepEqual(once.items[1].position.map((n,i)=>n-once.items[0].position[i]),[0,0,-600]);assert.equal(once.items[2],outside);
 const snapped=moveAssemblyGroup(initial,['A','B'],'B',[1410,0,7]);assert.deepEqual(snapped.items[1].position,[1400,0,0]);assert.equal(snapped.items[1].position[0]-snapped.items[0].position[0],600);
});
test('open-compartment diagonals follow shelves and skip door/drawer-covered areas',async()=>{
 const {assemblySketch,assemblyModel}=await import('../src/rules/assembly');const {addDivision}=await import('../src/commands/interiors');const a=cabinet('A');if(a.kind!=='cabinet')throw Error();
 assert.equal(assemblySketch(a).filter(p=>p.diagonals).length,1);const divided=addDivision(a.cabinet,a.cabinet.compartments.id,'horizontal',342).cabinet;assert.equal(assemblySketch({...a,cabinet:divided}).filter(p=>p.diagonals).length,2);
 const doors=addSimpleDoors(a.cabinet,'pair').cabinet;assert.equal(assemblySketch({...a,cabinet:doors}).filter(p=>p.diagonals).length,0);
 const {addMetalDrawer}=await import('../src/commands/drawers');const drawer=addMetalDrawer(a.cabinet,assemblyModel(a.cabinet).openings[0].id).cabinet;const markers=assemblySketch({...a,cabinet:drawer}).filter(p=>p.diagonals);assert.equal(markers.length,1);assert.ok(markers[0].size[1]<684);
});

test('blind-corner starter has a partial accessible door, valid native fittings, stable metadata and file compatibility',async()=>{
 const {assemblyModel,syncAssemblyCabinet}=await import('../src/rules/assembly');const {resizeEnvelope}=await import('../src/commands/dimensions');
 const c=createBlindCornerCabinet(resizeEnvelope(createCabinet(),{width:1000,height:720,depth:560})),model=assemblyModel(c);assert.equal(model.fronts.doors.length,1);assert.ok(model.fronts.doors[0].size[0]<400);assert.equal(model.fronts.doors[0].handing,'right');assert.equal(model.issues.filter(i=>i.severity==='error').length,0);
 const item:AssemblyItem={id:'corner',label:'Blind corner',kind:'cabinet',corner:'blind',cabinet:c,position:[0,0,0],rotation:0},a=assembly([item]);assert.deepEqual(deserializeAssembly(serializeAssembly(a)),a);const next=syncAssemblyCabinet(a,resizeEnvelope(c,{width:1100}),'corner').assembly.items[0];assert.equal(next.kind==='cabinet'&&next.corner,'blind');
 assert.throws(()=>createBlindCornerCabinet(createCabinet()),/width must exceed/);
});

test('blind corner filler is a real attached panel and follows move, rotate, resize, deletion selection and save/load',async()=>{
 const {withCornerFiller,assemblyGroupIds,moveAssemblyGroup,rotateAssemblyGroup,resizeAssemblyItem}=await import('../src/rules/assembly');const {resizeEnvelope}=await import('../src/commands/dimensions');
 const c=createBlindCornerCabinet(resizeEnvelope(createCabinet(),{width:1000})),item:AssemblyItem={id:'corner',label:'Corner',kind:'cabinet',corner:'blind',cabinet:c,position:[0,0,0],rotation:0},a=withCornerFiller(assembly([item]),item.id),filler=a.items.find(p=>p.attachedTo===item.id)!;assert.equal(filler.kind,'end-panel');assert.deepEqual(filler.position,[0,0,562]);assert.ok(assemblySize(filler)[0]>600);assert.equal(assemblyParts(filler).length,1);assert.deepEqual(assemblyGroupIds(a,['corner']),['corner',filler.id]);
 const moved=moveAssemblyGroup(a,['corner'],'corner',[100,0,300],false);assert.deepEqual(moved.items[1].position,[100,0,862]);const rotated=rotateAssemblyGroup(a,['corner']);assert.equal(rotated.items[1].rotation,90);assert.deepEqual(rotated.items[1].position,[562,0,0]);
 const enlarged=resizeAssemblyItem(a,{...item,cabinet:resizeEnvelope(c,{width:1100,height:800})});assert.equal(enlarged.items[1].id,filler.id);assert.equal(assemblySize(enlarged.items[1])[1],800);assert.ok(assemblySize(enlarged.items[1])[0]>assemblySize(filler)[0]);assert.deepEqual(deserializeAssembly(serializeAssembly(enlarged)),enlarged);
 const neighbour=cabinet('return',[0,0,1180],90);assert.equal(assemblyIssues({...a,items:[...a.items,neighbour]}).length,0);
});

test('insertion closes an implicit gap instead of preserving unreserved empty space',()=>{
 const a=cabinet('A'),b=cabinet('B',[700,0,0]),insert=cabinet('insert'),next=appendAssemblyItem(assembly([a,b]),insert,'A');assert.equal(next.items.find(p=>p.id==='B')!.position[0],1200);assert.equal(next.items.find(p=>p.id==='insert')!.position[0],600);
});

test('new floor and wall cabinets use their own rows and mounting heights',()=>{
 const floor=cabinet('floor'),wall=cabinet('wall');if(wall.kind!=='cabinet')throw Error();wall.cabinet={...wall.cabinet,cabinetType:'wall'};
 const a=appendAssemblyItem(assembly([floor]),wall,'floor'),placed=a.items.find(p=>p.id==='wall')!;assert.equal(placed.position[1],1380);assert.equal(placed.position[0],0);
 const next=appendAssemblyItem(a,cabinet('floor2'),'wall');assert.deepEqual(next.items.find(p=>p.id==='floor2')!.position,[600,0,0]);
 const second={...wall,id:'wall2'};assert.deepEqual(appendAssemblyItem(next,second,'floor2').items.find(p=>p.id==='wall2')!.position,[600,1380,0]);
});
test('base cabinets form an L-shaped kitchen without a separate corner type',async()=>{
 const {presets}=await import('../src/catalogue/presets');const {moveAssemblyGroup}=await import('../src/rules/assembly');assert.ok(!presets.some(p=>(p.id as string)==='corner'));
 const a=cabinet('A'),b=cabinet('B',[0,0,1160],90),layout=moveAssemblyGroup(assembly([a,b]),['B'],'B',[0,0,1160]);assert.deepEqual(layout.items[1].position,[0,0,1160]);assert.equal(layout.items[1].rotation,90);assert.equal(assemblyIssues(layout).length,0);
});
test('moving cabinets always docks them to a neighbour and explicit space components reserve gaps',async()=>{
 const {moveAssemblyGroup}=await import('../src/rules/assembly');const a=cabinet('A'),b=cabinet('B',[600,0,0]),initial=assembly([a,b]),moved=moveAssemblyGroup(initial,['B'],'B',[3000,500,2000]);const x=assemblyBounds(moved.items[0]),y=assemblyBounds(moved.items[1]);assert.equal(moved.items[1].position[1],0);assert.ok([0,2].some(k=>Math.abs(x.max[k]-y.min[k])<.1||Math.abs(y.max[k]-x.min[k])<.1));
 const gap:AssemblyItem={id:'gap',kind:'space',label:'Space',position:[600,0,0],size:[100,720,560],rotation:0};const reserved=appendAssemblyItem(assembly([a,gap]),b,'gap');assert.equal(reserved.items.find(p=>p.id==='B')!.position[0],700);
});
test('front sketches use single internal seams without reveal borders',async()=>{
 const {assemblySketchLines}=await import('../src/rules/assembly');const a=cabinet('A',[0,0,0],0,true),seams=assemblySketchLines(a).filter(p=>p.kind==='seam');assert.equal(seams.length,1);assert.deepEqual(seams[0].from,[300,0]);assert.deepEqual(seams[0].to,[300,720]);
 const open=assemblySketchLines(cabinet('open'));assert.equal(open.filter(p=>p.kind==='opening').length,2);assert.equal(open.filter(p=>p.kind==='seam').length,0);
});

test('moving a middle cabinet closes its old slot and rotating keeps the run attached',async()=>{
 const {moveAssemblyGroup,rotateAssemblyGroup}=await import('../src/rules/assembly');const a=cabinet('A'),b=cabinet('B',[600,0,0]),c=cabinet('C',[1200,0,0]),initial=assembly([a,b,c]),moved=moveAssemblyGroup(initial,['B'],'B',[3000,0,0]);assert.equal(moved.items.find(p=>p.id==='C')!.position[0],600);assert.equal(moved.items.find(p=>p.id==='B')!.position[0],1200);
 const rotated=rotateAssemblyGroup(initial,['B']),bounds=assemblyBounds(rotated.items.find(p=>p.id==='B')!);assert.equal(rotated.items.find(p=>p.id==='C')!.position[0],1160);assert.equal(bounds.min[0],600);assert.equal(bounds.max[0],1160);
});

test('saved legacy return direction is preserved in files and resizing',async()=>{
 const {withCornerFiller,resizeAssemblyItem}=await import('../src/rules/assembly');const {resizeEnvelope}=await import('../src/commands/dimensions');const c=createBlindCornerCabinet(resizeEnvelope(createCabinet(),{width:1000})),corner:AssemblyItem={...cabinet('old-corner'),kind:'cabinet',corner:'blind',cabinet:c},r:AssemblyItem={...cabinet('return',[0,0,1180],90),runDirection:-1},r2:AssemblyItem={...cabinet('return2',[0,0,1780],90),runDirection:-1},b=withCornerFiller(assembly([corner,r,r2]),corner.id);assert.deepEqual(deserializeAssembly(serializeAssembly(b)),b);if(r.kind!=='cabinet')throw Error();const grown=resizeAssemblyItem(b,{...r,cabinet:resizeEnvelope(r.cabinet,{width:700})});assert.equal(grown.items.find(p=>p.id==='return')!.position[2],1280);assert.equal(grown.items.find(p=>p.id==='return2')!.position[2],1880);
});
test('a top front over a door pair uses a T seam without doubled borders',async()=>{
 const {defaultDoor}=await import('../src/catalogue/fronts');const {assemblySketchLines}=await import('../src/rules/assembly');const c=createCabinet(),fronts=[defaultDoor({left:0,right:1,bottom:.7,top:1}),defaultDoor({left:0,right:.5,bottom:0,top:.7}),{...defaultDoor({left:.5,right:1,bottom:0,top:.7}),handing:'right' as const}],p:AssemblyItem={id:'T',label:'T',kind:'cabinet',cabinet:{...c,fronts},position:[0,0,0],rotation:0},lines=assemblySketchLines(p).filter(p=>p.kind==='seam');assert.equal(lines.length,2);assert.ok(lines.some(p=>p.from[0]===300&&p.to[0]===300));assert.ok(lines.some(p=>p.from[1]===p.to[1]&&p.from[0]===0&&p.to[0]===600));
});

test('retired native corner files keep their filler, door and CNC parts without an editor preset',async()=>{
 const {applySimplePreset}=await import('../src/commands/simple-presets');const {evaluate}=await import('../src/geometry/evaluate');const {flattenParts}=await import('../src/cnc/parts');const {serialize,deserialize}=await import('../src/persistence/files');const {addDoor}=await import('../src/commands/fronts');const {syncAssemblyCabinet,withCornerFiller}=await import('../src/rules/assembly');
 const {resizeEnvelope}=await import('../src/commands/dimensions');const c={...createBlindCornerCabinet(resizeEnvelope(createCabinet(),{width:1000})),cabinetType:'corner' as const},e=evaluate(c),filler=e.panels.find(p=>p.role==='corner-filler')!;assert.equal(c.cabinetType,'corner');assert.equal(e.fronts.doors.length,1);assert.equal(e.issues.filter(i=>i.severity==='error').length,0);assert.ok(filler.size[0]>600);assert.equal(filler.orientation,'xy');assert.ok(flattenParts(e).some(p=>p.id===filler.id));assert.equal(JSON.parse(serialize(c)).schemaVersion,62);assert.deepEqual(deserialize(serialize(c)),c);
 const old=JSON.parse(serialize(c));old.schemaVersion=61;old.evaluatorRevision='shaker-elements-61';assert.throws(()=>deserialize(JSON.stringify(old)),/cabinet type/);assert.equal(JSON.parse(serialize(createCabinet())).schemaVersion,61);
 const empty={...c,fronts:[]},restored=addDoor(empty).cabinet;assert.ok(restored.fronts[0].region.right<.5);assert.equal(evaluate(restored).issues.filter(i=>i.severity==='error').length,0);
 const synced=syncAssemblyCabinet(createAssembly(),c),a=withCornerFiller(synced.assembly,synced.itemId);assert.equal(a.items.length,1);assert.equal(a.items[0].kind==='cabinet'&&a.items[0].corner,'blind');assert.equal(assemblyParts(a.items[0]).filter(p=>p.id.endsWith('/panel/corner-filler')).length,1);const {assemblySketchLines}=await import('../src/rules/assembly');assert.equal(assemblySketchLines(a.items[0]).filter(p=>p.kind==='opening').length,0);assert.deepEqual(deserializeAssembly(serializeAssembly(a)),a);
});

test('Assembly handle symbols reuse Build positions for pulls, knobs, holes and notches',async()=>{
 const {assemblyHandleSymbols,assemblyModel}=await import('../src/rules/assembly');const {resolveHandle}=await import('../src/rules/handles');
 for(const kind of ['pull','knob','hole','notch','none'] as const){const c=createCabinet(),door=defaultDoor(),configured={...door,handle:{...door.handle,kind}},native={...c,fronts:[configured]},item:AssemblyItem={id:kind,label:kind,kind:'cabinet',cabinet:native,position:[1500,500,700],rotation:90},symbols=assemblyHandleSymbols(item),body=assemblyModel(native).fronts.doors[0];
  if(kind==='none'){assert.equal(symbols.length,0);continue;}assert.equal(symbols.length,1);const mark=symbols[0];assert.equal(mark.ownerId,door.id);
  if(kind==='pull'){assert.equal(mark.shape,'line');if(mark.shape!=='line')throw Error();const expected=resolveHandle(configured.handle,body);assert.equal(mark.from[0],expected.x);assert.equal(mark.to[0],expected.x);assert.equal(mark.to[1]-mark.from[1],152);}
  else if(kind==='notch'){assert.equal(mark.shape,'rectangle');if(mark.shape!=='rectangle')throw Error();assert.ok(Math.abs(mark.size[0]-80)<.01);assert.equal(mark.size[1],25);}
  else{assert.equal(mark.shape,'circle');if(mark.shape!=='circle')throw Error();const expected=resolveHandle(configured.handle,body);assert.deepEqual(mark.center,[expected.x,expected.y]);assert.equal(mark.radius,expected.diameter/2);}
  assert.deepEqual(assemblyHandleSymbols({...item,position:[0,0,0],rotation:0}),symbols);
 }
});
test('drawer handle marks respect horizontal placement and translated cabinet origins without changing geometry',async()=>{
 const {addMetalDrawer}=await import('../src/commands/drawers');const {defaultDrawerHandle}=await import('../src/rules/handles');const {assemblyHandleSymbols,assemblyModel}=await import('../src/rules/assembly');const c=createCabinet();c.envelope.origin=[100,200,300];const added=addMetalDrawer(c,c.compartments.id).cabinet,drawer=added.drawers![0],native={...added,drawers:[{...drawer,handle:{...defaultDrawerHandle(),kind:'pull' as const}}]},item:AssemblyItem={id:'drawers',label:'Drawers',kind:'cabinet',cabinet:native,position:[800,0,1200],rotation:270},before=JSON.stringify(assemblyModel(native)),symbols=assemblyHandleSymbols(item);assert.equal(symbols.length,1);const mark=symbols[0];assert.equal(mark.shape,'line');if(mark.shape!=='line')throw Error();assert.equal(mark.from[1],mark.to[1]);assert.equal(mark.to[0]-mark.from[0],152);assert.ok(mark.from[0]>0&&mark.to[0]<600);assert.ok(mark.from[1]<720);assert.equal(JSON.stringify(assemblyModel(native)),before);
});
