import {resolveHandle,type HandleSettings} from './handles';
import type {Cabinet,Vec3} from '../domain/cabinet';
import {assemblySize,type Assembly,type AssemblyItem,type QuarterTurn} from '../domain/assembly';
import {evaluate,type EvaluatedCabinet} from '../geometry/evaluate';
import {stock} from '../catalogue/materials';
import {drawerPack} from '../catalogue/drawers';
import {physicalPanels,type ShakerPanel} from './shaker';
import {doorOpeningPose,doorAngleLimit,motionBoxesCollide,type MotionBox} from './door-motion';
const models=new WeakMap<Cabinet,EvaluatedCabinet>();
export function assemblyModel(c:Cabinet){let model=models.get(c);if(!model){model=evaluate(c);models.set(c,model);}return model;}
export function turnPoint(p:Vec3,rotation:QuarterTurn):Vec3 {const [x,y,z]=p;return rotation===90?[z,y,-x]:rotation===180?[-x,y,-z]:rotation===270?[-z,y,x]:[x,y,z];}
export function assemblyPoint(item:AssemblyItem,point:Vec3):Vec3{const origin=item.kind==='cabinet'?item.cabinet.envelope.origin:[0,0,0],local=point.map((n,i)=>n-origin[i]) as Vec3;return turnPoint(local,item.rotation).map((n,i)=>n+item.position[i]) as Vec3;}
export function assemblyBounds(item:AssemblyItem){const size=assemblySize(item),offset=turnPoint(size.map(n=>n/2) as Vec3,item.rotation),center=offset.map((n,i)=>n+item.position[i]) as Vec3,span:Vec3=item.rotation%180?[size[2],size[1],size[0]]:size;return {center,size:span,min:center.map((n,i)=>n-span[i]/2) as Vec3,max:center.map((n,i)=>n+span[i]/2) as Vec3};}
export const ASSEMBLY_SNAP_DISTANCE=20;
export function placeAssemblyItem(a:Assembly,id:string,position:Vec3,snap=a.snap):Assembly{
 const item=a.items.find(p=>p.id===id);if(!item)throw Error('Select an assembly item.');let next={...item,position} as AssemblyItem;
 if(snap){const b=assemblyBounds(next),delta=[0,0,0];for(const axis of [0,1,2] as const){const otherAxis=axis===0?2:0,candidates:number[]=[];
 for(const p of a.items.filter(p=>p.id!==id)){const q=assemblyBounds(p);if(axis===1?([0,2] as const).some(k=>b.max[k]<q.min[k]-ASSEMBLY_SNAP_DISTANCE||b.min[k]>q.max[k]+ASSEMBLY_SNAP_DISTANCE):(b.max[1]<q.min[1]-ASSEMBLY_SNAP_DISTANCE||b.min[1]>q.max[1]+ASSEMBLY_SNAP_DISTANCE||b.max[otherAxis]<q.min[otherAxis]-ASSEMBLY_SNAP_DISTANCE||b.min[otherAxis]>q.max[otherAxis]+ASSEMBLY_SNAP_DISTANCE))continue;
 candidates.push(q.min[axis]-b.max[axis],q.max[axis]-b.min[axis],q.min[axis]-b.min[axis],q.max[axis]-b.max[axis]);}
 const eligible=candidates.filter(n=>Math.abs(n)<=ASSEMBLY_SNAP_DISTANCE).sort((x,y)=>Math.abs(x)-Math.abs(y)||x-y);delta[axis]=eligible[0]??0;}
 next={...next,position:position.map((n,i)=>Math.round((n+delta[i])*10)/10) as Vec3};}
 return {...a,items:a.items.map(p=>p.id===id?next:p)};
}
/** Attached fillers are separate panels that travel with their parent cabinet. */
export function assemblyGroupIds(a:Assembly,ids:string[]){const set=new Set(ids);for(const p of a.items)if(p.attachedTo&&set.has(p.attachedTo))set.add(p.id);return [...set];}
export function withCornerFiller(a:Assembly,id:string):Assembly{
 const item=a.items.find(p=>p.id===id);if(item?.kind!=='cabinet'||item.corner!=='blind')return a;if(item.cabinet.cabinetType==='corner')return a.items.some(p=>p.attachedTo===id)?{...a,items:a.items.filter(p=>p.attachedTo!==id)}:a;
 const {width,height,depth,origin}=item.cabinet.envelope,door=assemblyModel(item.cabinet).fronts.doors[0],leftBlind=door?door.center[0]-origin[0]>width/2:true,start=leftBlind?0:(door?door.center[0]+door.size[0]/2-origin[0]+2:width*.4),blindWidth=leftBlind?(door?door.center[0]-door.size[0]/2-origin[0]-2:width*.6):width-start,thickness=stock(item.cabinet,'front').thickness,existing=a.items.find(p=>p.attachedTo===id),filler:AssemblyItem={id:existing?.id??crypto.randomUUID(),label:'Corner filler',kind:'end-panel',attachedTo:id,rotation:item.rotation,position:assemblyPoint(item,[origin[0]+start,origin[1],origin[2]+depth+2]),size:[Math.max(1,blindWidth),height,thickness]};
 return {...a,items:existing?a.items.map(p=>p.id===existing.id?filler:p):[...a.items,filler]};
}
function touching(a:AssemblyItem,b:AssemblyItem){const x=assemblyBounds(a),y=assemblyBounds(b);return ([0,2] as const).some(axis=>Math.min(x.max[1],y.max[1])-Math.max(x.min[1],y.min[1])>.1&&Math.min(x.max[axis===0?2:0],y.max[axis===0?2:0])-Math.max(x.min[axis===0?2:0],y.min[axis===0?2:0])>.1&&(Math.abs(x.max[axis]-y.min[axis])<.1||Math.abs(y.max[axis]-x.min[axis])<.1));}
function forwardRun(a:Assembly,after:AssemblyItem,reach=0){
 const direction=turnPoint([after.runDirection??1,0,0],after.rotation),axis=direction[0]?0:2,sign=direction[axis],b=assemblyBounds(after),edge=sign>0?b.max[axis]:b.min[axis],ids=new Set<string>(),queue=a.items.filter(p=>{if(p.id===after.id||p.attachedTo)return false;const q=assemblyBounds(p),gap=sign*((sign>0?q.min[axis]:q.max[axis])-edge),other=axis===0?2:0;return gap>=-.1&&gap<=reach+.1&&Math.min(b.max[1],q.max[1])-Math.max(b.min[1],q.min[1])>.1&&Math.min(b.max[other],q.max[other])-Math.max(b.min[other],q.min[other])>.1;});
 while(queue.length){const item=queue.shift()!;if(ids.has(item.id))continue;ids.add(item.id);queue.push(...a.items.filter(p=>p.id!==after.id&&!ids.has(p.id)&&touching(item,p)));}return new Set(assemblyGroupIds(a,[...ids]));
}
const wallItem=(p:AssemblyItem)=>p.kind==='cabinet'&&p.cabinet.cabinetType==='wall';
function mountingHeight(a:Assembly,item:AssemblyItem,reference?:AssemblyItem){
 if(item.kind!=='cabinet')return reference?.position[1]??item.position[1];if(!wallItem(item))return 0;
 const walls=a.items.filter(p=>wallItem(p)&&p.id!==item.id),tall=a.items.filter(p=>p.kind==='cabinet'&&p.cabinet.cabinetType==='tall'&&p.id!==item.id),ref=reference&&wallItem(reference)?reference:walls.at(-1)??tall.at(-1);return Math.max(0,(ref?assemblyBounds(ref).max[1]:2100)-assemblySize(item)[1]);
}
export function appendAssemblyItem(a:Assembly,item:AssemblyItem,afterId?:string):Assembly{
 let after=a.items.find(p=>p.id===afterId)??a.items.filter(p=>!p.attachedTo).at(-1);if(after?.attachedTo)after=a.items.find(p=>p.id===after!.attachedTo);
 if(item.kind==='cabinet'&&(!after||after.kind==='cabinet'&&wallItem(after)!==wallItem(item)))after=a.items.filter(p=>p.kind==='cabinet'&&wallItem(p)===wallItem(item)).at(-1);
 after??=a.items.filter(p=>!p.attachedTo&&(item.kind!=='cabinet'||p.kind!=='cabinet')).at(-1);
 const y=mountingHeight(a,item,after);
 if(!after){const selected=a.items.find(p=>p.id===afterId);if(selected?.kind==='cabinet'){
  const alongside=wallItem(item)&&selected.cabinet.cabinetType==='tall',offset=turnPoint([alongside?assemblySize(selected)[0]:0,0,0],selected.rotation);return {...a,items:[...a.items,{...item,rotation:selected.rotation,position:[selected.position[0]+offset[0],y,selected.position[2]+offset[2]]}]};}
  return {...a,items:[...a.items,{...item,position:[0,y,0]}]};}
 const sign=after.runDirection??1,offset=turnPoint([sign===1?assemblySize(after)[0]:-assemblySize(item)[0],0,0],after.rotation),position:Vec3=[after.position[0]+offset[0],y,after.position[2]+offset[2]],entry={...item,rotation:after.rotation,runDirection:sign,position},run=forwardRun(a,after,assemblySize(item)[0]),direction=turnPoint([sign,0,0],after.rotation),axis=direction[0]?0:2;
 const b=assemblyBounds(after),positive=direction[axis]>0,boundary=positive?b.max[axis]:b.min[axis],gaps=[...run].map(id=>a.items.find(p=>p.id===id)!).filter(p=>!p.attachedTo).map(p=>{const q=assemblyBounds(p);return direction[axis]*((positive?q.min[axis]:q.max[axis])-boundary);}).filter(n=>n>=-.1),gap=gaps.length?Math.max(0,Math.min(...gaps)):0,shift=turnPoint([sign*(assemblySize(item)[0]-gap),0,0],after.rotation);
 const items=a.items.map(p=>run.has(p.id)?{...p,position:p.position.map((n,i)=>n+shift[i]) as Vec3}:p),index=items.findIndex(p=>p.id===after.id)+1;items.splice(index,0,entry);return {...a,items};
}
/** Resizing pushes the same connected run as insertion, keeping every existing gap. */
export function resizeAssemblyItem(a:Assembly,next:AssemblyItem):Assembly{
 const before=a.items.find(p=>p.id===next.id);if(!before)throw Error('Select an assembly item.');const run=forwardRun(a,before,Math.max(0,assemblySize(next)[0]-assemblySize(before)[0])),delta=turnPoint([(before.runDirection??1)*(assemblySize(next)[0]-assemblySize(before)[0]),0,0],before.rotation);if(before.runDirection===-1)next={...next,position:next.position.map((n,i)=>n+delta[i]) as Vec3};
 return withCornerFiller({...a,items:a.items.map(p=>p.id===next.id?next:run.has(p.id)?{...p,position:p.position.map((n,i)=>n+delta[i]) as Vec3}:p)},next.id);
}
export function dockAssemblyGroup(a:Assembly,ids:string[],anchorId:string,desired:Vec3):Assembly{
 const anchor=a.items.find(p=>p.id===anchorId);if(!anchor)throw Error('Select an assembly item.');const moving=new Set(assemblyGroupIds(a,ids)),others=a.items.filter(p=>!moving.has(p.id)&&!p.attachedTo),sameTier=others.filter(p=>anchor.kind!=='cabinet'||p.kind!=='cabinet'||wallItem(p)===wallItem(anchor)),candidates:Vec3[]=[];
 const put=(position:Vec3)=>{const delta=position.map((n,i)=>n-anchor.position[i]),moved=a.items.filter(p=>moving.has(p.id)&&!p.attachedTo).map(p=>({...p,position:p.position.map((n,i)=>n+delta[i]) as Vec3}));if(moved.some(p=>others.some(q=>{const b=assemblyBounds(p),c=assemblyBounds(q);return [0,1,2].every(k=>Math.min(b.max[k],c.max[k])-Math.max(b.min[k],c.min[k])>.1);})))return;candidates.push(position);};
 for(const other of sameTier){const y=mountingHeight(a,anchor,other),b=assemblyBounds({...anchor,position:[0,y,0]}),q=assemblyBounds(other);for(const axis of [0,2] as const){const cross=axis===0?2:0;for(const edge of [q.min[axis]-b.max[axis],q.max[axis]-b.min[axis]])for(const align of [q.min[cross]-b.min[cross],q.max[cross]-b.max[cross]]){const p:Vec3=[0,y,0];p[axis]=edge;p[cross]=align;put(p);}}}
 // A first wall cabinet can align above a floor unit; floor units stay on the floor.
 if(!sameTier.length){for(const other of others){const y=mountingHeight(a,anchor,other),b=assemblyBounds({...anchor,position:[0,y,0]}),q=assemblyBounds(other);put([q.min[0]-b.min[0],y,q.min[2]-b.min[2]]);}}
 const distance=(p:Vec3)=>p.reduce((sum,n,i)=>sum+(n-desired[i])**2,0);candidates.sort((x,y)=>distance(x)-distance(y));const position=candidates[0]??(!others.length?[desired[0],anchor.kind==='cabinet'?mountingHeight(a,anchor):desired[1],desired[2]] as Vec3:anchor.position),delta=position.map((n,i)=>n-anchor.position[i]);return {...a,items:a.items.map(p=>moving.has(p.id)?{...p,position:p.position.map((n,i)=>Math.round((n+delta[i])*10)/10) as Vec3}:p)};
}
export function moveAssemblyGroup(a:Assembly,ids:string[],anchorId:string,position:Vec3,snap=true){
 if(snap){const anchor=a.items.find(p=>p.id===anchorId)!;let base=a;if(ids.length===1&&Math.hypot(position[0]-anchor.position[0],position[2]-anchor.position[2])>assemblySize(anchor)[0]/2){const run=forwardRun(a,anchor),direction=turnPoint([-(anchor.runDirection??1)*assemblySize(anchor)[0],0,0],anchor.rotation);base={...a,items:a.items.map(p=>run.has(p.id)?{...p,position:p.position.map((n,i)=>n+direction[i]) as Vec3}:p)};}return dockAssemblyGroup(base,ids,anchorId,position);}
 const anchor=a.items.find(p=>p.id===anchorId);if(!anchor)throw Error('Select an assembly item.');const set=new Set(assemblyGroupIds(a,ids)),isolated={...a,items:a.items.filter(p=>p.id===anchorId||!set.has(p.id))},placed=placeAssemblyItem(isolated,anchorId,position,snap).items.find(p=>p.id===anchorId)!,delta=placed.position.map((n,i)=>n-anchor.position[i]);
 return {...a,items:a.items.map(p=>set.has(p.id)?{...p,position:p.position.map((n,i)=>n+delta[i]) as Vec3}:p)};
}
export function rotateAssemblyGroup(a:Assembly,ids:string[],snap=true):Assembly{
 const expanded=assemblyGroupIds(a,ids),selected=a.items.filter(p=>expanded.includes(p.id));if(!selected.length)return a;const bounds=selected.map(assemblyBounds),pivot:Vec3=ids.length===1?a.items.find(p=>p.id===ids[0])!.position:[0,1,2].map(k=>(Math.min(...bounds.map(b=>b.min[k]))+Math.max(...bounds.map(b=>b.max[k])))/2) as Vec3;
 let rotated={...a,items:a.items.map(p=>{if(!expanded.includes(p.id))return p;const offset=turnPoint(p.position.map((n,i)=>n-pivot[i]) as Vec3,90);return {...p,position:offset.map((n,i)=>Math.round((n+pivot[i])*10)/10) as Vec3,rotation:((p.rotation+90)%360) as QuarterTurn};})};if(snap&&ids.length===1){const before=a.items.find(p=>p.id===ids[0])!,after=rotated.items.find(p=>p.id===ids[0])!,direction=turnPoint([before.runDirection??1,0,0],before.rotation),axis=direction[0]?0:2,delta=assemblyBounds(after).size[axis]-assemblyBounds(before).size[axis],run=forwardRun(a,before),shift=direction.map(n=>n*delta);rotated={...rotated,items:rotated.items.map(p=>run.has(p.id)?{...p,position:p.position.map((n,i)=>n+shift[i]) as Vec3}:p)};}return snap?dockAssemblyGroup(rotated,ids,ids.at(-1)!,rotated.items.find(p=>p.id===ids.at(-1))!.position):rotated;
}
export interface AssemblyPart extends MotionBox {itemId:string;ownerId?:string;glass?:boolean;door?:boolean;drawer?:boolean}
export function assemblyParts(item:AssemblyItem,angle=0,extension=0,feature?:{id:string;value:number}):AssemblyPart[]{
 if(item.kind==='space')return [];
 if(item.kind!=='cabinet'){const b=assemblyBounds(item);return [{id:item.id,itemId:item.id,size:assemblySize(item),center:b.center,angle:item.rotation*Math.PI/180}];}
 const e=assemblyModel(item.cabinet),doors=new Map(e.fronts.doors.map(d=>[d.id,d]));
 const parts=[...physicalPanels(e).map(p=>({id:p.id,size:p.size,center:p.center,ownerId:(p as ShakerPanel).doorOwnerId??(doors.has(p.id)?p.id:undefined),glass:!!(p as ShakerPanel).glass})),...e.fronts.handles.map(p=>({...p})),...e.drawers.drawers.flatMap(d=>d.parts.map(p=>({id:p.id,size:p.size,center:[p.center[0],p.center[1],p.center[2]+(p.moving?(feature?(feature.id===d.id?feature.value:0):extension)*drawerPack(d.intent.pack).nominalLength/100:0)] as Vec3,ownerId:d.id,drawer:p.moving})))];
 return parts.map(p=>{const door=p.ownerId?doors.get(p.ownerId):undefined;let center=p.center,rotation=0;if(door){const pose=doorOpeningPose(e,door,feature?(feature.id===door.id?feature.value:0):angle),x=center[0]-pose.pivot[0],z=center[2]-pose.pivot[2];rotation=pose.angle;center=[pose.origin[0]+Math.cos(rotation)*x+Math.sin(rotation)*z,center[1],pose.origin[2]-Math.sin(rotation)*x+Math.cos(rotation)*z];}
 return {id:`${item.id}/${p.id}`,itemId:item.id,ownerId:p.ownerId,size:p.size,center:assemblyPoint(item,center),angle:rotation+item.rotation*Math.PI/180,glass:'glass' in p?p.glass:false,door:!!door,drawer:'drawer' in p&&p.drawer};});
}
/** Build changes replace only the linked cabinet; placement and other cabinets stay intact. */
export function syncAssemblyCabinet(a:Assembly,cabinet:Cabinet,linkedId?:string){
 const target=a.items.find(p=>p.id===linkedId&&p.kind==='cabinet'&&p.cabinet.id===cabinet.id)??a.items.find(p=>p.kind==='cabinet'&&p.cabinet.id===cabinet.id);
 if(target&&target.kind==='cabinet'){const corner=cabinet.cabinetType==='corner'?'blind':target.cabinet.cabinetType==='corner'?undefined:target.corner;return {itemId:target.id,assembly:JSON.stringify(target.cabinet)===JSON.stringify(cabinet)&&target.corner===corner?a:resizeAssemblyItem(a,{...target,corner,kind:'cabinet',cabinet})};}
 const item:AssemblyItem={id:crypto.randomUUID(),label:`Cabinet ${a.items.filter(p=>p.kind==='cabinet').length+1}`,kind:'cabinet',cabinet,...cabinet.cabinetType==='corner'?{corner:'blind' as const}:{},position:[0,0,0],rotation:0};return {itemId:item.id,assembly:appendAssemblyItem(a,item)};
}
export interface AssemblyIssue {itemId:string;otherId:string;message:string;angle?:number;kind:'body'|'door'|'drawer'}
export function assemblyIssues(a:Assembly):AssemblyIssue[]{
 const issues:AssemblyIssue[]=[],solid=a.items.filter(p=>p.kind!=='space');
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){if(solid[i].attachedTo===solid[j].id||solid[j].attachedTo===solid[i].id)continue;const x=assemblyBounds(solid[i]),y=assemblyBounds(solid[j]);if(motionBoxesCollide({id:'a',center:x.center,size:x.size,angle:0},{id:'b',center:y.center,size:y.size,angle:0}))issues.push({itemId:solid[i].id,otherId:solid[j].id,kind:'body',message:`${solid[i].label} overlaps ${solid[j].label}. Move it, rotate it by 90°, or insert a space.`});}
 const closed=new Map(solid.map(p=>[p.id,assemblyParts(p)]));
 for(const item of solid){if(item.kind!=='cabinet')continue;const e=assemblyModel(item.cabinet),features=[...e.fronts.doors.map(d=>({id:d.id,label:d.label,kind:'door' as const,target:Math.min(90,doorAngleLimit(e,d.id)),travel:1})),...e.drawers.drawers.map(d=>({id:d.id,label:d.label,kind:'drawer' as const,target:Math.min(100,drawerPack(d.intent.pack).nominalLength),travel:drawerPack(d.intent.pack).nominalLength/100}))];
  const b=assemblyBounds(item),neighbours=solid.filter(p=>{if(p.id===item.id||p.attachedTo===item.id)return false;const q=assemblyBounds(p),reach=assemblySize(item)[0]+assemblySize(item)[2]+100;return !(b.max[1]<q.min[1]||b.min[1]>q.max[1]||[0,2].some(k=>b.min[k]-q.max[k]>reach||q.min[k]-b.max[k]>reach));});
  for(const feature of features){let blocked=false;
   // Access study: one feature at a time, neighbours closed. A 90° door opening
   // or 100 mm drawer travel is our usable-access policy, not a supplier claim.
   for(let step=0;step<=Math.ceil(feature.target)&&!blocked;step++){const value=Math.min(step,feature.target)/feature.travel,own=assemblyParts(item,0,0,{id:feature.id,value}).filter(p=>p.ownerId===feature.id&&(p.door||p.drawer));
    for(const other of neighbours){if(!own.some(x=>closed.get(other.id)!.some(y=>motionBoxesCollide(x,y))))continue;
     issues.push({itemId:item.id,otherId:other.id,kind:feature.kind,angle:feature.kind==='door'?step:undefined,message:`${item.label}: ${feature.label} is blocked by ${other.label} before ${feature.target}${feature.kind==='door'?'° opening':' mm of drawer access'}. Move or rotate a cabinet, insert a space/panel, or ${feature.kind==='door'?'change door handing':'adjust drawer depth'} in Build.`});blocked=true;break;
    }
   }
  }
 }

 return issues;
}

export interface AssemblySketchPart extends MotionBox {outline?:boolean;space?:boolean;diagonals?:boolean}
/** Sketch-only envelopes and front outlines. Never used for collision checks. */
export function assemblySketch(item:AssemblyItem,open=false):AssemblySketchPart[]{
 const bounds=assemblyBounds(item),body:AssemblySketchPart={id:item.id,size:assemblySize(item),center:bounds.center,angle:item.rotation*Math.PI/180,space:item.kind==='space'};
 if(item.kind!=='cabinet')return [body];
 const e=assemblyModel(item.cabinet),parts:AssemblySketchPart[]=[body],origin=item.cabinet.envelope.origin,front=origin[2]+item.cabinet.envelope.depth;
 for(const door of e.fronts.doors){let center:Vec3=[door.center[0],door.center[1],front+1],angle=0;
  if(open){const pose=doorOpeningPose(e,door,doorAngleLimit(e,door.id)),x=door.center[0]-pose.pivot[0],z=door.center[2]-pose.pivot[2];angle=pose.angle;center=[pose.origin[0]+Math.cos(angle)*x+Math.sin(angle)*z,door.center[1],pose.origin[2]-Math.sin(angle)*x+Math.cos(angle)*z];}
  parts.push({id:door.id,size:[door.size[0],door.size[1],open?door.size[2]:0],center:assemblyPoint(item,center),angle:angle+item.rotation*Math.PI/180,outline:!open});
 }
 for(const drawer of e.drawers.drawers){if(drawer.intent.internal&&!open&&e.fronts.doors.length)continue;const f=drawer.parts.find(p=>p.id===drawer.id+'/front');if(!f)continue;
  if(open){const moving=drawer.parts.filter(p=>p.moving),min=[0,1,2].map(k=>Math.min(...moving.map(p=>p.center[k]-p.size[k]/2))) as Vec3,max=[0,1,2].map(k=>Math.max(...moving.map(p=>p.center[k]+p.size[k]/2))) as Vec3;parts.push({id:drawer.id,size:max.map((n,k)=>n-min[k]) as Vec3,center:assemblyPoint(item,[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2+drawerPack(drawer.intent.pack).nominalLength]),angle:item.rotation*Math.PI/180});}
  else parts.push({id:drawer.id,size:[f.size[0],f.size[1],0],center:assemblyPoint(item,[f.center[0],f.center[1],front+1]),angle:item.rotation*Math.PI/180,outline:true});
 }
 const covered=[...e.panels.filter(p=>p.role==='corner-filler').map(p=>({x:p.center[0]-p.size[0]/2,y:p.center[1]-p.size[1]/2,w:p.size[0],h:p.size[1]})),...e.fronts.doors.map(d=>({x:d.center[0]-d.size[0]/2,y:d.center[1]-d.size[1]/2,w:d.size[0],h:d.size[1]})),...e.drawers.drawers.filter(d=>!d.intent.internal).map(d=>({x:d.allocation.origin[0],y:d.allocation.origin[1],w:d.allocation.size[0],h:d.allocation.size[1]})),...e.adjustable.shelves.map(p=>({x:p.origin[0],y:p.origin[1],w:p.size[0],h:p.size[1]}))];
 for(const opening of e.openings){let rectangles=[{x:opening.origin[0],y:opening.origin[1],w:opening.size[0],h:opening.size[1]}];for(const cover of covered)rectangles=rectangles.flatMap(r=>{
  const x=Math.max(r.x,cover.x),y=Math.max(r.y,cover.y),right=Math.min(r.x+r.w,cover.x+cover.w),top=Math.min(r.y+r.h,cover.y+cover.h);if(right<=x||top<=y)return [r];
  return [{x:r.x,y:r.y,w:x-r.x,h:r.h},{x:right,y:r.y,w:r.x+r.w-right,h:r.h},{x,y:r.y,w:right-x,h:y-r.y},{x,y:top,w:right-x,h:r.y+r.h-top}].filter(p=>p.w>10&&p.h>10);
 });
 rectangles.forEach((r,i)=>parts.push({id:`${opening.id}/open/${i}`,size:[r.w,r.h,0],center:assemblyPoint(item,[r.x+r.w/2,r.y+r.h/2,front+2]),angle:item.rotation*Math.PI/180,outline:true,diagonals:true}));}

 return parts;
}

export interface AssemblySketchLine {from:[number,number];to:[number,number];kind:'seam'|'opening'}
/** One line per logical seam; gaps, reveals and outer edges are omitted in sketches. */
export function assemblySketchLines(item:AssemblyItem):AssemblySketchLine[]{
 if(item.kind!=='cabinet')return [];const [w,h]=assemblySize(item),rectangles=assemblySketch(item).filter(p=>p.outline&&!p.diagonals).map(p=>{const local=turnPoint(p.center.map((n,i)=>n-item.position[i]) as Vec3,((360-item.rotation)%360) as QuarterTurn);return {x1:local[0]-p.size[0]/2,x2:local[0]+p.size[0]/2,y1:local[1]-p.size[1]/2,y2:local[1]+p.size[1]/2};});
 const normalize=(n:number,max:number)=>n<20?0:n>max-20?max:n;
 const merge=(values:number[],max:number)=>{const sorted=values.map(n=>normalize(n,max)).sort((a,b)=>a-b),groups:number[][]=[];for(const n of sorted){const last=groups.at(-1);if(last&&n-last.at(-1)!<=6)last.push(n);else groups.push([n]);}return (n:number)=>{n=normalize(n,max);const group=groups.find(g=>g.some(v=>Math.abs(v-n)<.01));return group?group.reduce((a,b)=>a+b,0)/group.length:n;};};
 const x=merge(rectangles.flatMap(r=>[r.x1,r.x2]),w),y=merge(rectangles.flatMap(r=>[r.y1,r.y2]),h),seams:{axis:0|1;at:number;low:number;high:number}[]=[];
 for(const r of rectangles){for(const at of [x(r.x1),x(r.x2)])if(at>0&&at<w)seams.push({axis:0,at,low:y(r.y1),high:y(r.y2)});for(const at of [y(r.y1),y(r.y2)])if(at>0&&at<h)seams.push({axis:1,at,low:x(r.x1),high:x(r.x2)});}
 const combined:typeof seams=[];for(const p of seams.sort((a,b)=>a.axis-b.axis||a.at-b.at||a.low-b.low)){const last=combined.at(-1);if(last&&last.axis===p.axis&&Math.abs(last.at-p.at)<.01&&p.low<=last.high+6)last.high=Math.max(last.high,p.high);else combined.push({...p});}
 const lines:AssemblySketchLine[]=combined.map(p=>({from:p.axis===0?[p.at,p.low]:[p.low,p.at],to:p.axis===0?[p.at,p.high]:[p.high,p.at],kind:'seam'}));
 for(const p of assemblySketch(item).filter(p=>p.diagonals)){const c=turnPoint(p.center.map((n,i)=>n-item.position[i]) as Vec3,((360-item.rotation)%360) as QuarterTurn),[a,b]=p.size;lines.push({from:[c[0]-a/2,c[1]-b/2],to:[c[0]+a/2,c[1]+b/2],kind:'opening'},{from:[c[0]-a/2,c[1]+b/2],to:[c[0]+a/2,c[1]-b/2],kind:'opening'});}return lines;
}


export type AssemblyHandleSymbol={ownerId:string;shape:'line';from:[number,number];to:[number,number]}|{ownerId:string;shape:'circle';center:[number,number];radius:number}|{ownerId:string;shape:'rectangle';center:[number,number];size:[number,number]};
/** Handle marks share Build's resolved positions; they never change physical geometry. */
export function assemblyHandleSymbols(item:AssemblyItem):AssemblyHandleSymbol[]{
 if(item.kind!=='cabinet')return [];const e=assemblyModel(item.cabinet),origin=item.cabinet.envelope.origin,symbols:AssemblyHandleSymbol[]=[],point=(x:number,y:number):[number,number]=>[x-origin[0],y-origin[1]];
 const add=(body:{id:string;size:Vec3;center:Vec3;handing?:'left'|'right'},handle:HandleSettings,ownerId:string)=>{
  if(handle.kind==='none')return;
  if(handle.kind==='notch'){const cut=e.pockets.find(p=>p.panelId===body.id&&p.id===body.id+'/profile/notch');if(!cut)return;const x=Math.max(cut.origin[0],body.center[0]-body.size[0]/2),y=Math.max(cut.origin[1],body.center[1]-body.size[1]/2),right=Math.min(cut.origin[0]+cut.size[0],body.center[0]+body.size[0]/2),top=Math.min(cut.origin[1]+cut.size[1],body.center[1]+body.size[1]/2);symbols.push({ownerId,shape:'rectangle',center:point((x+right)/2,(y+top)/2),size:[right-x,top-y]});return;}
  const resolved=resolveHandle(handle,body);
  if(handle.kind==='pull'){const bar=resolved.parts.find(p=>p.id.endsWith('/bar'))!;const dx=handle.orientation==='horizontal'?bar.size[0]/2:0,dy=handle.orientation==='vertical'?bar.size[1]/2:0;symbols.push({ownerId,shape:'line',from:point(resolved.x-dx,resolved.y-dy),to:point(resolved.x+dx,resolved.y+dy)});}
  else symbols.push({ownerId,shape:'circle',center:point(resolved.x,resolved.y),radius:resolved.diameter/2});
 };
 for(const door of e.fronts.doors){const intent=item.cabinet.fronts.find(p=>p.id===door.id);if(intent)add(door,intent.handle,door.id);}
 for(const drawer of e.drawers.drawers){if(drawer.intent.internal){if(e.fronts.doors.length)continue;const grip=drawer.parts.find(p=>p.id===drawer.id+'/inner-handle');if(grip)symbols.push({ownerId:drawer.id,shape:'line',from:point(grip.center[0]-grip.size[0]/2,grip.center[1]),to:point(grip.center[0]+grip.size[0]/2,grip.center[1])});continue;}const front=drawer.parts.find(p=>p.id===drawer.id+'/front');if(front&&drawer.intent.handle)add(front,drawer.intent.handle,drawer.id);}
 return symbols;
}
