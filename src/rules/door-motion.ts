import {blumClip110} from '../catalogue/hinges';
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
interface Box {id:string;size:Vec3;center:Vec3;angle:number}
function posed(box:{id:string;size:Vec3;center:Vec3},door:FrontBody|undefined,degrees:number,limit:number):Box{
 if(!door)return {...box,angle:0};const angle=openingRadians(door.handing,degrees,limit),p=openingPivot(door),x=box.center[0]-p[0],z=box.center[2]-p[2];
 return {...box,angle,center:[p[0]+Math.cos(angle)*x+Math.sin(angle)*z,box.center[1],p[2]-Math.sin(angle)*x+Math.cos(angle)*z]};
}
function collides(a:Box,b:Box){
 if(Math.min(a.center[1]+a.size[1]/2,b.center[1]+b.size[1]/2)-Math.max(a.center[1]-a.size[1]/2,b.center[1]-b.size[1]/2)<.01)return false;
 const basis=(q:Box)=>[[Math.cos(q.angle),-Math.sin(q.angle)],[Math.sin(q.angle),Math.cos(q.angle)]],axes=[...basis(a),...basis(b)];
 return axes.every(axis=>{const radius=(q:Box)=>basis(q).reduce((n,v,i)=>n+Math.abs(axis[0]*v[0]+axis[1]*v[1])*q.size[i===0?0:2]/2,0);return Math.abs((a.center[0]-b.center[0])*axis[0]+(a.center[2]-b.center[2])*axis[1])<radius(a)+radius(b)-.01;});
}
/** Sample the entire requested sweep at <=1°; never jump through an obstruction.
 * Collision checks include other doors and generic handle envelopes. */
export function safeDoorAngles(e:EvaluatedCabinet,from:Record<string,number>,ids:string[],target:number){
 const limits=new Map(e.fronts.doors.map(d=>[d.id,doorAngleLimit(e,d.id)]));
 const start=Object.fromEntries(Object.entries(from).filter(([id])=>limits.has(id)).map(([id,angle])=>[id,clampAngle(angle,limits.get(id)!)]));
 const ends=ids.map(id=>[id,clampAngle(target,limits.get(id)??blumClip110.maxAngle)] as const);
 let safe={...start};
 const steps=Math.max(1,Math.ceil(Math.max(...ends.map(([id,end])=>Math.abs(end-(start[id]??0))))));
 for(let step=1;step<=steps;step++){
  const angles={...start};for(const [id,end] of ends)angles[id]=(start[id]??0)+(end-(start[id]??0))*step/steps;
  const parts=[...e.panels.map(p=>({owner:p.id,box:posed(p,e.fronts.doors.find(d=>d.id===p.id),angles[p.id]??0,limits.get(p.id)??blumClip110.maxAngle)})),...e.fronts.handles.map(p=>({owner:p.ownerId,box:posed(p,e.fronts.doors.find(d=>d.id===p.ownerId),angles[p.ownerId]??0,limits.get(p.ownerId)??blumClip110.maxAngle)}))];
  const moving=parts.filter(p=>ids.includes(p.owner));
  for(const a of moving)for(const b of parts)if(a.owner!==b.owner&&collides(a.box,b.box))return {angles:safe,blocked:true,collision:{movingId:a.box.id,otherId:b.box.id,movingOwner:a.owner,otherOwner:b.owner,angle:angles[a.owner]??0}};
  safe=angles;
 }
 return {angles:safe,blocked:false};
}
