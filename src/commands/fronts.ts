import {cornerAccessRegion} from '../rules/kitchen-corner';
import type { Cabinet, SlabDoor } from '../domain/cabinet';
import { defaultDoor } from '../catalogue/fronts';
import { evaluate } from '../geometry/evaluate';
import {attachFrontBoundaries,effectiveDoor,frontBoundaries,interiorLayout} from '../rules/front-links';
import {moveDivision} from './interiors';
import { stock } from '../catalogue/materials';
// Touching front regions form a connected layout, including existing saved splits.
export function connectedDoors(c:Cabinet,id:string):Set<string> {
  const ids=new Set([id]);let changed=true;
  const touches=(a:SlabDoor['region'],b:SlabDoor['region'])=>((Math.abs(a.right-b.left)<1e-8||Math.abs(b.right-a.left)<1e-8)&&Math.min(a.top,b.top)-Math.max(a.bottom,b.bottom)>1e-8)||((Math.abs(a.top-b.bottom)<1e-8||Math.abs(b.top-a.bottom)<1e-8)&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1e-8);
  while(changed){changed=false;for(const d of c.fronts)if(!ids.has(d.id)&&c.fronts.some(other=>ids.has(other.id)&&touches(effectiveDoor(c,d).region,effectiveDoor(c,other).region))){ids.add(d.id);changed=true;}}
  return ids;
}
export function updateDoor(c:Cabinet,id:string,change:Partial<Omit<SlabDoor,'id'|'kind'|'policyRevision'>>):Cabinet {
  if(!c.fronts.some(door=>door.id===id))throw new Error('This slab door no longer exists.');
  c=attachFrontBoundaries(c);
  const linked=change.placement?connectedDoors(c,id):new Set([id]);
  return {...c,fronts:c.fronts.map(door=>door.id===id?{...door,...structuredClone(change)}:linked.has(door.id)?{...door,placement:change.placement!}:door)};
}
export function addDoor(c:Cabinet,openingId?:string) {
  let region:SlabDoor['region']={left:0,right:1,bottom:0,top:1};
  if(openingId){
    const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)throw new Error('Choose an available opening.');
    const [ox,oy]=c.envelope.origin,t=stock(c,'carcass').thickness,interior=stock(c,'interior').thickness,{width:w,height:h}=c.envelope;
    const edge=(n:number,origin:number,span:number,upper:boolean)=>Math.abs(n-origin-(upper?span-t:t))<1e-6?(upper?1:0):(n-origin+(upper?interior/2:-interior/2))/span;
    region={left:edge(o.origin[0],ox,w,false),right:edge(o.origin[0]+o.size[0],ox,w,true),bottom:edge(o.origin[1],oy,h,false),top:edge(o.origin[1]+o.size[1],oy,h,true)};
  }
  if(c.cabinetType==='corner'){const access=cornerAccessRegion(c);region={...region,left:Math.max(region.left,access.left),right:Math.min(region.right,access.right)};if(region.left>=region.right)throw Error('This opening is behind the corner filler. Choose the accessible opening.');}
  const door=defaultDoor(region);return {cabinet:attachFrontBoundaries({...c,fronts:[...c.fronts,door]}),featureId:door.id};
}
export function splitDoor(c:Cabinet,id:string,axis:'vertical'|'horizontal',ratio=0.5) {
  if(!Number.isFinite(ratio)||ratio<0.1||ratio>0.9)throw new Error('Front split must be between 10% and 90%.');
  c=attachFrontBoundaries(c);
  const saved=c.fronts.find(door=>door.id===id),door=saved?effectiveDoor(c,saved):undefined;if(!door)throw new Error('Choose a slab door before dividing its front.');
  const r=door.region,split=axis==='vertical'?r.left+(r.right-r.left)*ratio:r.bottom+(r.top-r.bottom)*ratio;
  const first=axis==='vertical'?{...r,right:split}:{...r,top:split};
  const second=axis==='vertical'?{...r,left:split}:{...r,bottom:split};
  const links=(region:SlabDoor['region'])=>Object.fromEntries(frontBoundaries.filter(key=>region[key]===door.region[key]&&door.boundaryLinks?.[key]).map(key=>[key,door.boundaryLinks![key]]));
  const segment=(region:SlabDoor['region'])=>{const {boundaryLinks,...rest}=structuredClone(door),next=links(region);return {...rest,...(Object.keys(next).length?{boundaryLinks:next}:{}),region};};
  const copy:SlabDoor={...segment(second),id:crypto.randomUUID(),region:second,handing:axis==='vertical'?'right':door.handing};
  const banding={...c.banding};if(c.banding[id])banding[copy.id]=structuredClone(c.banding[id]);
  return {cabinet:attachFrontBoundaries({...c,fronts:c.fronts.flatMap(current=>current.id===id?[{...segment(first),handing:axis==='vertical'?'left':current.handing},copy]:[current]),banding}),featureId:id};
}
export function addDoorPair(c:Cabinet) {const added=addDoor(c);return splitDoor(added.cabinet,added.featureId,'vertical');}
export function removeDoor(c:Cabinet,id:string):Cabinet {
  if(!c.fronts.some(door=>door.id===id))throw new Error('This slab door no longer exists.');
  const banding={...c.banding};delete banding[id];return {...c,fronts:c.fronts.filter(door=>door.id!==id),banding};
}

export function resizeDoor(c:Cabinet,id:string,axis:'width'|'height',value:number):Cabinet {
 if(!Number.isFinite(value)||Math.abs(value*10-Math.round(value*10))>1e-6)throw new Error('Door size must be a finite value in 0.1 mm steps.');
 c=attachFrontBoundaries(c);const door=c.fronts.find(f=>f.id===id);if(!door)throw new Error('Choose a door.');
 const effective=effectiveDoor(c,door),shape=evaluate(c).fronts.doors.find(f=>f.id===id)!,n=axis==='width'?0:1,delta=value-shape.size[n];
 const low=axis==='width'?'left':'bottom',high=axis==='width'?'right':'top';
 const preferred=axis==='width'?(door.handing==='left'?high:low):high;
 const key=door.boundaryLinks?.[preferred]?preferred:door.boundaryLinks?.[preferred===low?high:low]?(preferred===low?high:low):preferred;
 const direction=key===high?1:-1,link=door.boundaryLinks?.[key];
 if(link){const part=interiorLayout(c).divisions.find(p=>p.id===link)!;return moveDivision(c,link,Math.round((part.position+direction*delta)*10)/10);}
 const oldEdge=effective.region[key],newEdge=oldEdge+direction*delta/(axis==='width'?c.envelope.width:c.envelope.height);
 return {...c,fronts:c.fronts.map(f=>{const r=effectiveDoor(c,f).region;const overlaps=axis==='width'?Math.min(r.top,effective.region.top)>Math.max(r.bottom,effective.region.bottom):Math.min(r.right,effective.region.right)>Math.max(r.left,effective.region.left);return (overlaps&&Math.abs(r[key===high?low:high]-oldEdge)<1e-8)||f.id===id?{...f,region:{...f.region,[f.id===id?key:key===high?low:high]:newEdge}}:f;})};
}
