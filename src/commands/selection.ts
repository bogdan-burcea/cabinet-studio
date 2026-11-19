import type { Cabinet } from '../domain/cabinet';
import { findDivision, removeDivision } from './interiors';
import { removeAdjustable } from './adjustable';
import {setBanding} from './materials';
import type {EdgeKey} from '../domain/cabinet';
import { removeDoor,updateDoor } from './fronts';
export function deletionReason(c:Cabinet,id:string):string|null {
  if(c.fronts.some(d=>id===`${d.id}/handle`)||Object.keys(c.banding).some(panel=>Object.keys(c.banding[panel]).some(key=>id===`${panel}/edge/${key}`)))return null;
  if(c.fronts.some(p=>p.id===id)||c.contents.some(p=>p.id===id))return null;
  const division=findDivision(c.compartments,id);
  if(division)return division.children.some(child=>child.kind!=='opening'||c.contents.some(s=>s.openingId===child.id))?'Remove child divisions and adjustable shelves first. Nested contents are preserved.':null;
  if(['plinth-front','plinth-left','plinth-right'].some(role=>id===`${c.id}/panel/${role}`))return null;
  return 'This is a generated part or opening. Edit its construction or installation layout instead of deleting it individually.';
}
export function deleteSelected(c:Cabinet,id:string):{cabinet:Cabinet;selection:string} {
  const handle=c.fronts.find(d=>id===`${d.id}/handle`);if(handle)return {cabinet:updateDoor(c,handle.id,{handle:{...handle.handle,kind:'none'}}),selection:handle.id};
  for(const panel of Object.keys(c.banding))for(const key of Object.keys(c.banding[panel]))if(id===`${panel}/edge/${key}`)return {cabinet:setBanding(c,panel,key as EdgeKey,null),selection:panel};
  const reason=deletionReason(c,id);if(reason)throw new Error(reason);
  if(c.fronts.some(p=>p.id===id))return {cabinet:removeDoor(c,id),selection:c.id};
  const shelf=c.contents.find(p=>p.id===id);if(shelf)return {cabinet:removeAdjustable(c,id),selection:shelf.openingId};
  const division=findDivision(c.compartments,id);if(division)return {cabinet:removeDivision(c,id),selection:division.id};
  const key=id===`${c.id}/panel/plinth-front`?'enabled':id===`${c.id}/panel/plinth-left`?'leftReturn':'rightReturn';
  return {cabinet:{...c,installation:{...c.installation,plinth:{...c.installation.plinth,[key]:false}}},selection:c.id};
}
