import type {Cabinet,SlabDoor} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {resolveInteriors,type Division} from './interiors';
export const frontBoundaries=['left','right','bottom','top'] as const;
export function divisionAtDoorBoundary(c:Cabinet,region:SlabDoor['region'],part:Division,key:typeof frontBoundaries[number]){
 const vertical=key==='left'||key==='right';
 if(part.axis!==(vertical?'vertical':'horizontal'))return false;
 const {width,height,origin:[x,y]}=c.envelope,axis=vertical?0:1,cross=1-axis;
 const target=(vertical?x:y)+region[key]*(vertical?width:height);
 const low=vertical?y+region.bottom*height:x+region.left*width;
 const high=vertical?y+region.top*height:x+region.right*width;
 return Math.abs(part.origin[axis]+part.size[axis]/2-target)<.11&&
  Math.min(high,part.origin[cross]+part.size[cross])>Math.max(low,part.origin[cross]);
}
export function interiorLayout(c:Cabinet){return resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness);}
export function effectiveDoor(c:Cabinet,door:SlabDoor):SlabDoor {
 if(!door.boundaryLinks)return door;
 const layout=interiorLayout(c),region={...door.region};
 for(const key of frontBoundaries){const id=door.boundaryLinks[key];if(!id)continue;const panel=layout.divisions.find(p=>p.id===id),axis=key==='left'||key==='right'?0:1;
  if(!panel||panel.axis!==(axis===0?'vertical':'horizontal'))throw new Error('A linked door boundary needs its original supporting division.');
  region[key]=(panel.origin[axis]+panel.size[axis]/2-c.envelope.origin[axis])/(axis===0?c.envelope.width:c.envelope.height);
 }
 return {...door,region};
}
// Matching edges are pinned before edits; explicit links are never retargeted.
export function attachFrontBoundaries(c:Cabinet):Cabinet {
 if(!c.fronts.length)return c;
 const layout=interiorLayout(c);
 return {...c,fronts:c.fronts.map(door=>{
  const r=effectiveDoor(c,door).region,links={...door.boundaryLinks};
  for(const key of frontBoundaries){if(links[key]||r[key]===0||r[key]===1)continue;
   const match=layout.divisions.find(p=>divisionAtDoorBoundary(c,r,p,key));
   if(match)links[key]=match.id;
  }
  return Object.keys(links).length?{...door,boundaryLinks:links}:door;
 })};
}
