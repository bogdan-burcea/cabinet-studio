import type { Cabinet } from '../domain/cabinet';
import { evaluate } from '../geometry/evaluate';
import { stock } from '../catalogue/materials';
import { conceptShelfSupport } from '../catalogue/shelves';
import { addDivision } from './interiors';
import { addAdjustable } from './adjustable';
import { shelfLevelForCentre, snappedShelfCentre } from '../rules/adjustable';
export type InteriorKind='fixed'|'adjustable'|'divider';
export function suggestedSetback(c:Cabinet,openingId:string):number {
  const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)return 0;
  const inset=e.fronts.doors.filter(d=>d.placement==='inset'&&d.center[0]+d.size[0]/2>o.origin[0]&&d.center[0]-d.size[0]/2<o.origin[0]+o.size[0]&&d.center[1]+d.size[1]/2>o.origin[1]&&d.center[1]-d.size[1]/2<o.origin[1]+o.size[1]);
  return Math.max(0,...inset.map(d=>o.origin[2]+o.size[2]-(d.center[2]-d.size[2]/2)+1));
}
export function defaultInteriorPosition(c:Cabinet,openingId:string,kind:InteriorKind):number {
  const e=evaluate(c),o=e.openings.find(o=>o.id===openingId);if(!o)return 0;
  if(kind==='adjustable'){const added=addAdjustable(c,openingId);return conceptShelfSupport.firstLevel+added.cabinet.contents.at(-1)!.level*conceptShelfSupport.pitch+stock(c,'interior').thickness/2;}
  return Math.round(o.size[kind==='divider'?0:1]*5)/10;
}
export function createInterior(c:Cabinet,openingId:string,kind:InteriorKind,position:number,frontSetback:number,identity:{featureId:string;children:[string,string]}) {
  if(kind==='adjustable')return addAdjustable(c,openingId,{id:identity.featureId,frontSetback,level:shelfLevelForCentre(position,stock(c,'interior').thickness,{id:conceptShelfSupport.id,revision:conceptShelfSupport.revision})});
  return addDivision(c,openingId,kind==='divider'?'vertical':'horizontal',position,frontSetback,identity);
}
export function normalizeCreationPosition(c:Cabinet,kind:InteriorKind,value:number):number {
  return kind==='adjustable'?snappedShelfCentre(value,stock(c,'interior').thickness,{id:conceptShelfSupport.id,revision:conceptShelfSupport.revision}):value;
}
