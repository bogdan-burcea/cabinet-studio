import type {Cabinet,MetalDrawer} from '../domain/cabinet';
import {antaroPin,antaroM500} from '../catalogue/drawers';
import {resolveInteriors} from '../rules/interiors';
import {stock} from '../catalogue/materials';
import {evaluate} from '../geometry/evaluate';
export function addMetalDrawer(c:Cabinet,openingId:string){
 const opening=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness).openings.find(o=>o.id===openingId);
 if(!opening)throw new Error('Choose an existing opening.');
 const offset=Math.max(0,...(c.drawers??[]).filter(d=>d.openingId===openingId).map(d=>d.offset+d.frontHeight));
 const height=Math.min(160,opening.size[1]-offset);
 if(height<antaroM500.minimumHeight)throw new Error('No free 98.5 mm allocation remains in this opening.');
 const id=crypto.randomUUID(),drawer:MetalDrawer={id,kind:'metal-drawer',policyRevision:'antaro-external-1',pack:{...antaroPin},openingId,offset,frontHeight:height};
 const cabinet={...c,drawers:[...(c.drawers??[]),drawer]};evaluate(cabinet);return {cabinet,featureId:id};
}
export function updateMetalDrawer(c:Cabinet,id:string,patch:Partial<Pick<MetalDrawer,'offset'|'frontHeight'>>){if(!c.drawers?.some(d=>d.id===id))throw new Error('Select an existing drawer.');const next={...c,drawers:c.drawers.map(d=>d.id===id?{...d,...patch}:d)};evaluate(next);return next;}
export function removeMetalDrawer(c:Cabinet,id:string){const next={...c,drawers:(c.drawers??[]).filter(d=>d.id!==id)};evaluate(next);return next;}
