import type {Cabinet,SlabDoor} from '../domain/cabinet';
import {addDoor,splitDoor,updateDoor,connectedDoors} from './fronts';
import {attachFrontBoundaries} from '../rules/front-links';
import {supportedHingeSides} from '../rules/fronts';
/** Reuse the pinned slab rules without adding fittings or handle UI. */
export function addSimpleDoors(c:Cabinet,layout:'single'|'pair',openingIds?:string[]){
 let next=c;const ids:string[]=[];
 for(const opening of openingIds?.length?[...new Set(openingIds)]:[undefined]){
  // Plan each opening from the valid source so a rejected new leaf does not
  // prevent planning the remaining leaves in this single transaction.
  const planned=addDoor(c,opening),door=planned.cabinet.fronts.find(d=>d.id===planned.featureId)!;
  next={...next,fronts:[...next.fronts,{...door,handle:{...door.handle,kind:'none'}}]};
  if(layout==='pair'){const split=splitDoor(next,door.id,'vertical');next=split.cabinet;ids.push(door.id,...next.fronts.filter(d=>!c.fronts.some(old=>old.id===d.id)&&!ids.includes(d.id)&&d.id!==door.id).map(d=>d.id));}
  else ids.push(door.id);
 }
 next=attachFrontBoundaries(next);
 next={...next,fronts:next.fronts.map(d=>{if(!ids.includes(d.id))return d;const sides=supportedHingeSides(next,d);return sides.includes(d.handing)||!sides.length?d:{...d,handing:sides[0]};})};
 return {cabinet:next,featureIds:[...new Set(ids)]};
}
export function editSimpleDoors(c:Cabinet,ids:string[],patch:Partial<Pick<SlabDoor,'placement'|'handing'|'reveal'|'clearance'>>):Cabinet{
 const targets=new Set(ids);if(patch.placement||patch.reveal!==undefined||patch.clearance!==undefined)ids.forEach(id=>connectedDoors(c,id).forEach(link=>targets.add(link)));
 return [...targets].reduce((next,id)=>updateDoor(next,id,patch),c);
}
