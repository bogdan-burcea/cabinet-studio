import {physicalPanels,type ShakerPanel} from './shaker';
import {drawerPack} from '../catalogue/drawers';
import {hafeleMetalla155,isMetallaArticle,metallaNominalEdge,blumClip110,blumClip155,isThinHinge,clip155Motion} from '../catalogue/hinges';
import type {Vec3} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import type {FrontBody} from './fronts';
const clampAngle=(angle:number,max:number)=>Math.max(0,Math.min(max,Number.isFinite(angle)?angle:0));
export const doorAngleLimit=(e:EvaluatedCabinet,id:string)=>e.doorHardware.hinges.find(h=>h.ownerId===id)?.maxAngle??blumClip110.maxAngle;
export function openingRadians(handing:'left'|'right',angle:number,max:number=blumClip110.maxAngle){
 const degrees=clampAngle(angle,max);
 return degrees===0?0:(handing==='left'?-1:1)*degrees*Math.PI/180;
}
/** Clearance-study transform around the front hinge edge. Not a claimed Blum
 * four-bar linkage: manufacturer intermediate pivot data is still required. */
export function openingPivot(door:FrontBody):Vec3{return [door.pivot[0],door.pivot[1],door.center[2]+door.size[2]/2];}
/** The wide-angle inset clearance study pivots at its mounting support's front
 * plane. Pivoting behind that plane falsely drives a recessed slab into its own
 * support after 135°. This remains an envelope model, not Blum linkage CAD. */
export function hingedOpeningPivot(e:EvaluatedCabinet,door:FrontBody):Vec3{
 const pivot=openingPivot(door);
 if(door.placement!=='inset'||doorAngleLimit(e,door.id)<=110&&!e.doorHardware.hinges.some(h=>h.ownerId===door.id&&isThinHinge(h.profileId)))return pivot;
 const supportIds=new Set(e.doorHardware.hinges.filter(h=>h.ownerId===door.id).map(h=>h.supportId));
 return [pivot[0],pivot[1],Math.max(pivot[2],...e.panels.filter(p=>supportIds.has(p.id)).map(p=>p.center[2]+p.size[2]/2))];
}
/** Rigid door pose shared by display and all collision studies. The 155° model
 * includes hinge translation; intermediate poses are interpolated planning
 * envelopes, not a reverse-engineered or supplier-certified four-bar linkage. */
export function doorOpeningPose(e:EvaluatedCabinet,door:FrontBody,degrees:number){
 const limit=doorAngleLimit(e,door.id),a=clampAngle(degrees,limit),angle=openingRadians(door.handing,a,limit),pivot=hingedOpeningPivot(e,door),origin=[...pivot] as Vec3;
 const hinge=e.doorHardware.hinges.find(h=>h.ownerId===door.id),support=e.panels.find(p=>p.id===hinge?.supportId);
 if(hinge&&isThinHinge(hinge.profileId)&&support&&a>0){
  // Blum pp.104–105: 1.5 mm nominal protrusion, EXPANDO T B = FA+27+H.
  // Intermediate motion is the same explicit planning interpolation as 155°.
  const inward=door.handing==='left'?1:-1,face=support.center[0]+inward*support.size[0]/2,edge=inward*(door.pivot[0]-face),height=hinge.plate==='173H7130'?3:0;
  const distance=inward*(hinge.cup[0]-door.pivot[0]),adjustment=edge-(27+height-distance),t=Math.min(1,a/90),blend=t*t*(3-2*t);
  const front=door.center[2]+door.size[2]/2,nose=Math.max(...[front,front-door.size[2]].map(z=>inward*(pivot[0]+Math.sin(angle)*(z-pivot[2])-face)));
  origin[0]+=inward*(edge+(1.5+height+adjustment-edge)*blend-nose);
  origin[2]+=(32+Math.max(0,pivot[2]-front))*(1-Math.pow(1-t,3));
 }
 if(hinge?.profileId==='custom-hinge'&&support&&a>0){
  const spec=hinge.customMotion;
  if(spec){const inward=door.handing==='left'?1:-1,face=support.center[0]+inward*support.size[0]/2,edge=inward*(door.pivot[0]-face),t=Math.min(1,a/90),blend=t*t*(3-2*t),front=door.center[2]+door.size[2]/2;
   const nose=Math.max(...[front,front-door.size[2]].map(z=>inward*(pivot[0]+Math.sin(angle)*(z-pivot[2])-face)));
   origin[0]+=inward*(edge+(spec.openProtrusion-edge)*blend-nose);origin[2]+=(spec.openingAdvance+Math.max(0,pivot[2]-front))*(1-Math.pow(1-t,3));
  }
 }
 if(limit===155&&hinge&&hinge.profileId!=='custom-hinge'&&support&&a>0){
  const inward=door.handing==='left'?1:-1,face=support.center[0]+inward*support.size[0]/2,edge=inward*(door.pivot[0]-face);
  const metalla=isMetallaArticle(hinge.article),kind=door.placement==='inset'?'inset':hinge.article===(metalla?hafeleMetalla155.overlay:blumClip155.overlay)?'overlay':'dual';
  // Häfele publishes zero protrusion for the range, not inset linkage coordinates.
  // This explicit zero-protrusion planning study is provisional for inset/dual.
  const data=metalla?{protrusion90:0,protrusion155:0,fixingDistance:0}:clip155Motion[kind];
  const cup=inward*(hinge.cup[0]-door.pivot[0])-blumClip155.cupDiameter/2;
  const factoryEdge=metalla?metallaNominalEdge(kind,cup):kind==='inset'?data.fixingDistance-cup:-(data.fixingDistance+cup),adjustment=edge-factoryEdge;
  const smooth=(n:number)=>n*n*(3-2*n),t=smooth(Math.min(1,a/90)),u=smooth(Math.max(0,(a-90)/65));
  const target=edge+(data.protrusion90+adjustment-edge)*t+(data.protrusion155-data.protrusion90)*u;
  const front=door.center[2]+door.size[2]/2;
  const nose=Math.max(...[front,front-door.size[2]].map(z=>inward*(pivot[0]+Math.sin(angle)*(z-pivot[2])-face)));
  origin[0]+=inward*(target-nose);
  // The straight-arm drawing supplies a 32 mm forward datum. Applying this
  // smooth lead-out to other arms is an explicit visualization approximation;
  // the catalogue does not supply their intermediate linkage coordinates.
  origin[2]+=(clip155Motion.advance90+Math.max(0,pivot[2]-front))*(1-Math.pow(1-Math.min(1,a/90),3));
 }
 return {angle,pivot,origin};
}
interface Box {id:string;size:Vec3;center:Vec3;angle:number}
function posed(e:EvaluatedCabinet,box:{id:string;size:Vec3;center:Vec3},door:FrontBody|undefined,degrees:number,limit:number):Box{
 if(!door)return {...box,angle:0};const {angle,pivot:p,origin}=doorOpeningPose(e,door,degrees),x=box.center[0]-p[0],z=box.center[2]-p[2];
 return {...box,angle,center:[origin[0]+Math.cos(angle)*x+Math.sin(angle)*z,box.center[1],origin[2]-Math.sin(angle)*x+Math.cos(angle)*z]};
}
function collides(a:Box,b:Box){
 if(Math.min(a.center[1]+a.size[1]/2,b.center[1]+b.size[1]/2)-Math.max(a.center[1]-a.size[1]/2,b.center[1]-b.size[1]/2)<.01)return false;
 const dx=b.center[0]-a.center[0],dz=b.center[2]-a.center[2];
 if(a.angle===0&&b.angle===0)return Math.abs(dx)<(a.size[0]+b.size[0])/2-.01&&Math.abs(dz)<(a.size[2]+b.size[2])/2-.01;
 const ac=Math.cos(a.angle),as=Math.sin(a.angle),bc=Math.cos(b.angle),bs=Math.sin(b.angle);
 const aw=a.size[0]/2,ad=a.size[2]/2,bw=b.size[0]/2,bd=b.size[2]/2;
 // Conservative world-axis rejection, then the same four-axis SAT/tolerance.
 if(Math.abs(dx)>Math.abs(ac)*aw+Math.abs(as)*ad+Math.abs(bc)*bw+Math.abs(bs)*bd||Math.abs(dz)>Math.abs(as)*aw+Math.abs(ac)*ad+Math.abs(bs)*bw+Math.abs(bc)*bd)return false;
 const axis=(x:number,z:number)=>Math.abs(dx*x+dz*z)<aw*Math.abs(x*ac-z*as)+ad*Math.abs(x*as+z*ac)+bw*Math.abs(x*bc-z*bs)+bd*Math.abs(x*bs+z*bc)-.01;
 return axis(ac,-as)&&axis(as,ac)&&axis(bc,-bs)&&axis(bs,bc);
}
/** Sample the entire requested sweep at <=1°; never jump through an obstruction.
 * Collision checks include other doors, handle envelopes and drawer bodies. */
export function safeDoorAngles(e:EvaluatedCabinet,from:Record<string,number>,ids:string[],target:number){
 const limits=new Map(e.fronts.doors.map(d=>[d.id,doorAngleLimit(e,d.id)]));
 const drawerIds=new Set(e.drawers.drawers.map(d=>d.id));
 const start=Object.fromEntries(Object.entries(from).filter(([id])=>limits.has(id)||drawerIds.has(id)).map(([id,angle])=>[id,clampAngle(angle,limits.get(id)??100)]));
 const ends=ids.map(id=>[id,clampAngle(target,limits.get(id)??blumClip110.maxAngle)] as const);
 let safe={...start};
 const steps=Math.max(1,Math.ceil(Math.max(...ends.map(([id,end])=>Math.abs(end-(start[id]??0))))));
 for(let step=1;step<=steps;step++){
  const angles={...start};for(const [id,end] of ends){const initial=start[id]??0;angles[id]=initial+Math.sign(end-initial)*Math.min(Math.abs(end-initial),step);}
  const parts=[...physicalPanels(e).map(p=>{const owner=(p as ShakerPanel).doorOwnerId??p.id;return {owner,box:posed(e,p,e.fronts.doors.find(d=>d.id===owner),angles[owner]??0,limits.get(owner)??blumClip110.maxAngle)};}),...e.fronts.handles.map(p=>({owner:p.ownerId,box:posed(e,p,e.fronts.doors.find(d=>d.id===p.ownerId),angles[p.ownerId]??0,limits.get(p.ownerId)??blumClip110.maxAngle)}))];
  for(const drawer of e.drawers.drawers)for(const part of drawer.parts)parts.push({owner:drawer.id,box:{...part,center:[part.center[0],part.center[1],part.center[2]+(part.moving?(angles[drawer.id]??0)*drawerPack(drawer.intent.pack).nominalLength/100:0)],angle:0}});
  const moving=parts.filter(p=>ids.includes(p.owner));
  for(const a of moving)for(const b of parts)if(a.owner!==b.owner&&collides(a.box,b.box))return {angles:safe,blocked:true,collision:{movingId:a.box.id,otherId:b.box.id,movingOwner:a.owner,otherOwner:b.owner,angle:angles[a.owner]??0}};
  safe=angles;
 }
 return {angles:safe,blocked:false};
}

/** Sweep inner trays against actual cabinet/door envelopes, preserving the last
 * clear extension. Intentional contacts inside each bought assembly are excluded. */
export function safeInnerDrawerExtensions(e:EvaluatedCabinet,from:Record<string,number>,requested:Record<string,number>){
 const inner=e.drawers.drawers.filter(d=>d.intent.internal),angles={...requested,...Object.fromEntries(inner.map(d=>[d.id,from[d.id]??0]))};
 for(const d of inner){
  const start=Math.max(0,Math.min(100,from[d.id]??0)),target=Math.max(0,Math.min(100,requested[d.id]??0)),travel=drawerPack(d.intent.pack).nominalLength;
  if(!travel||target<=start){angles[d.id]=target;continue;}
  const distance=Number(travel),steps=Math.ceil((target-start)*distance/100/2);
  const fixed=physicalPanels(e).map(p=>{const owner=(p as ShakerPanel).doorOwnerId??p.id;return posed(e,p,e.fronts.doors.find(door=>door.id===owner),requested[owner]??0,doorAngleLimit(e,owner));});
  fixed.push(...e.fronts.handles.map(p=>posed(e,p,e.fronts.doors.find(door=>door.id===p.ownerId),requested[p.ownerId]??0,doorAngleLimit(e,p.ownerId))));
  const zones=e.doorHardware.hinges.map(h=>({id:h.id,size:h.mountingZone.size,center:h.mountingZone.center,angle:0}));
  let safe=start;
  for(let i=1;i<=steps;i++){
   const extension=start+(target-start)*i/steps;
   const hit=d.parts.filter(p=>p.moving).flatMap(p=>{
    const moving={...p,center:[p.center[0],p.center[1],p.center[2]+extension*distance/100] as Vec3,angle:0};
    return [...fixed,...zones].filter(other=>collides(moving,other));
   })[0];
   if(hit){angles[d.id]=safe;return {angles,blocked:true,drawerId:d.id,otherId:hit.id};}
   safe=extension;
  }
  angles[d.id]=target;
 }
 return {angles,blocked:false};
}

/** Construction preflight, independent of the current inspection pose. */
/** Geometry only: names, prices and finishes cannot change clearance. */
export function openingGeometryKey(e:EvaluatedCabinet){return JSON.stringify([
 physicalPanels(e).map(p=>[p.id,(p as ShakerPanel).doorOwnerId,p.center,p.size]),e.fronts.doors.map(d=>[d.id,d.center,d.size,d.pivot,d.handing,d.placement]),
 e.fronts.handles.map(p=>[p.id,p.ownerId,p.center,p.size]),e.doorHardware.hinges.map(h=>[h.id,h.profileId,h.supportId,h.article,h.plate,h.cup,h.maxAngle,h.customMotion,h.mountingZone]),
 e.drawers.drawers.map(d=>[d.id,!!d.intent.internal,drawerPack(d.intent.pack).nominalLength,d.parts.map(p=>[p.id,p.center,p.size,p.moving])])]);}
const openingChecks=new Map<string,import('./validate').Issue|null>();
export function drawerOpeningIssue(e:EvaluatedCabinet):import('./validate').Issue|null{
 if(!e.drawers.drawers.some(d=>d.intent.internal))return null;
 const key=openingGeometryKey(e)+JSON.stringify([e.fronts.doors.map(d=>d.label),e.panels.map(p=>p.label),e.drawers.drawers.map(d=>d.label)]);
 if(openingChecks.has(key)){const issue=openingChecks.get(key)!;return issue?structuredClone(issue):null;}
 const issue=computeDrawerOpeningIssue(e);if(openingChecks.size>=4)openingChecks.delete(openingChecks.keys().next().value!);openingChecks.set(key,issue?structuredClone(issue):null);return issue;
}
function computeDrawerOpeningIssue(e:EvaluatedCabinet):import('./validate').Issue|null{
 if(!e.drawers.drawers.some(d=>d.intent.internal))return null;
 const ids=e.fronts.doors.map(d=>d.id),target=Math.max(0,...ids.map(id=>doorAngleLimit(e,id))),opened=safeDoorAngles(e,{},ids,target);
 if(opened.blocked){const hit=opened.collision!,door=e.fronts.doors.find(d=>d.id===hit.movingOwner),other=e.panels.find(p=>p.id===hit.otherId)?.label??e.drawers.drawers.find(d=>d.id===hit.otherOwner)?.label??'another part';
  return {code:'machining-drawer-opening',severity:'notice',featureId:hit.movingOwner,relatedIds:[hit.otherOwner],message:`${door?.label??'Door'} cannot open fully for the internal drawers: it meets ${other} near ${Math.round(hit.angle)}°. Review the door placement, hinge or adjoining part before accepting this setup.`};
 }
 const result=safeInnerDrawerExtensions(e,{}, {...opened.angles,...Object.fromEntries(e.drawers.drawers.map(d=>[d.id,100]))});
 if(!result.blocked)return null;
 const drawer=e.drawers.drawers.find(d=>d.id===result.drawerId)!,hinge=e.doorHardware.hinges.find(h=>h.id===result.otherId),door=e.fronts.doors.find(d=>d.id===(hinge?.ownerId??result.otherId));
 const other=hinge?`hinge ${Number(hinge.id.split('/').at(-1))+1} on ${door?.label??'the door'}`:e.panels.find(p=>p.id===result.otherId)?.label??'another part';
 return {code:'machining-drawer-opening',severity:'notice',featureId:drawer.id,relatedIds:[result.otherId!],message:`${drawer.label} cannot fully extend with the selected doors and hinges: it is blocked by ${other}. Review the door placement, hinge or drawer clearance before accepting this setup.`};
}
