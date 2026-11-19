import type {Cabinet,SlabDoor} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {resolveInteriors} from './interiors';
export const frontBoundaries=['left','right','bottom','top'] as const;
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
  for(const key of frontBoundaries){if(links[key]||r[key]===0||r[key]===1)continue;const axis=key==='left'||key==='right'?0:1,cross=1-axis;
   const coordinate=c.envelope.origin[axis]+r[key]*(axis===0?c.envelope.width:c.envelope.height);
   const low=c.envelope.origin[cross]+r[axis===0?'bottom':'left']*(axis===0?c.envelope.height:c.envelope.width),high=c.envelope.origin[cross]+r[axis===0?'top':'right']*(axis===0?c.envelope.height:c.envelope.width);
   const match=layout.divisions.find(p=>p.axis===(axis===0?'vertical':'horizontal')&&Math.abs(p.origin[axis]+p.size[axis]/2-coordinate)<.11&&Math.min(high,p.origin[cross]+p.size[cross])-Math.max(low,p.origin[cross])>0);
   if(match)links[key]=match.id;
  }
  return Object.keys(links).length?{...door,boundaryLinks:links}:door;
 })};
}
