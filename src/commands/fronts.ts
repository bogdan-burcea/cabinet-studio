import type { Cabinet, SlabDoor } from '../domain/cabinet';
import { defaultDoor } from '../catalogue/fronts';
import { evaluate } from '../geometry/evaluate';
import { stock } from '../catalogue/materials';
export function updateDoor(c:Cabinet,id:string,change:Partial<Omit<SlabDoor,'id'|'kind'|'policyRevision'>>):Cabinet {
  if(!c.fronts.some(door=>door.id===id))throw new Error('This slab door no longer exists.');
  return {...c,fronts:c.fronts.map(door=>door.id===id?{...door,...structuredClone(change)}:door)};
}
export function addDoor(c:Cabinet,openingId?:string) {
  let region:SlabDoor['region']={left:0,right:1,bottom:0,top:1};
  if(openingId){
    const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)throw new Error('Choose an available opening.');
    const [ox,oy]=c.envelope.origin,t=stock(c,'carcass').thickness,interior=stock(c,'interior').thickness,{width:w,height:h}=c.envelope;
    const edge=(n:number,origin:number,span:number,upper:boolean)=>Math.abs(n-origin-(upper?span-t:t))<1e-6?(upper?1:0):(n-origin+(upper?interior/2:-interior/2))/span;
    region={left:edge(o.origin[0],ox,w,false),right:edge(o.origin[0]+o.size[0],ox,w,true),bottom:edge(o.origin[1],oy,h,false),top:edge(o.origin[1]+o.size[1],oy,h,true)};
  }
  const door=defaultDoor(region);return {cabinet:{...c,fronts:[...c.fronts,door]},featureId:door.id};
}
export function splitDoor(c:Cabinet,id:string,axis:'vertical'|'horizontal',ratio=0.5) {
  if(!Number.isFinite(ratio)||ratio<0.1||ratio>0.9)throw new Error('Front split must be between 10% and 90%.');
  const door=c.fronts.find(door=>door.id===id);if(!door)throw new Error('Choose a slab door before dividing its front.');
  const r=door.region,split=axis==='vertical'?r.left+(r.right-r.left)*ratio:r.bottom+(r.top-r.bottom)*ratio;
  const first=axis==='vertical'?{...r,right:split}:{...r,top:split};
  const second=axis==='vertical'?{...r,left:split}:{...r,bottom:split};
  const copy:SlabDoor={...structuredClone(door),id:crypto.randomUUID(),region:second,handing:axis==='vertical'?'right':door.handing};
  const banding={...c.banding};if(c.banding[id])banding[copy.id]=structuredClone(c.banding[id]);
  return {cabinet:{...c,fronts:c.fronts.flatMap(current=>current.id===id?[{...current,region:first},copy]:[current]),banding},featureId:id};
}
export function addDoorPair(c:Cabinet) {const added=addDoor(c);return splitDoor(added.cabinet,added.featureId,'vertical');}
export function removeDoor(c:Cabinet,id:string):Cabinet {
  if(!c.fronts.some(door=>door.id===id))throw new Error('This slab door no longer exists.');
  const banding={...c.banding};delete banding[id];return {...c,fronts:c.fronts.filter(door=>door.id!==id),banding};
}
