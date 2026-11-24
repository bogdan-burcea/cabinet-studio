import type {Cabinet,Vec3} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import type {FrontBody} from './fronts';
/** Compatibility for previously saved corner cabinets; no corner type is offered by the editors. */
export const KITCHEN_CORNER_REVISION='kitchen-corner-62';
export function cornerAccessRegion(c:Cabinet){
 const left=Math.min(1,...c.fronts.map(d=>d.region.left)),right=Math.max(0,...c.fronts.map(d=>d.region.right));
 if(c.fronts.length&&(left>0||right<1))return {left,right,bottom:0,top:1};
 return {left:0,right:1-(c.envelope.depth+50)/c.envelope.width,bottom:0,top:1};
}
/** A fixed front board, with no invented automatic fixings. */
export function kitchenCornerFiller(c:Cabinet,doors:readonly FrontBody[]){
 if(c.cabinetType!=='corner')return null;
 const {width,height,depth,origin}=c.envelope,access=cornerAccessRegion(c),min=doors.length?Math.min(...doors.map(d=>d.center[0]-d.size[0]/2-origin[0])):width*access.left,max=doors.length?Math.max(...doors.map(d=>d.center[0]+d.size[0]/2-origin[0])):width*access.right,leftBlind=min>width-max,start=leftBlind?0:max+2,span=leftBlind?min-2:width-start;
 if(span<60)throw Error('Kitchen corner needs a blind section of at least 60 mm. Reduce the door region or choose a regular cabinet.');
 const thickness=stock(c,'front').thickness,size:Vec3=[span,height,thickness],center:Vec3=[origin[0]+start+span/2,origin[1]+height/2,origin[2]+depth+2+thickness/2];
 return {id:`${c.id}/panel/corner-filler`,role:'corner-filler' as const,label:'Corner filler',materialRole:'front' as const,orientation:'xy' as const,size,center,provenance:`${c.id}/${KITCHEN_CORNER_REVISION}`};
}
