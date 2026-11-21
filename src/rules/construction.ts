import {backFingerCuts} from './back-fingers';
import {addDogbones} from './dogbones';
import {puzzleCorners} from './puzzle';
import {backLayout} from './back-panel';
import type { Cabinet, PanelRole, Vec3 } from '../domain/cabinet';
import type { Issue } from './validate';
export const RAIL_LIMITS = { min: 20, max: 600 };
export const OPTIONAL_RAIL_LIMITS = { min: 0, max: RAIL_LIMITS.max };
export const MIN_RAIL_GAP = 20; // Application modelling policy, not a structural rating.
export interface ConstructionPanel {
  role: PanelRole; label: string; size: Vec3; origin: Vec3; orientation: 'yz' | 'xz' | 'xy';
  materialRole: 'carcass' | 'back'; constructionPart?: 'top' | 'back';
}
export function resolveConstruction(c: Cabinet, thickness: number, backThickness: number) {
  const { width: w, height: h, depth: d, origin } = c.envelope, { top, back } = c.carcass;
  const issues: Issue[] = [], panels: ConstructionPanel[] = [];
  const innerWidth = w - 2 * thickness, innerHeight = h - 2 * thickness;
  const seating=backLayout(c,thickness,backThickness);
  const rearSetback = back.mode === 'full' ? seating.rearSetback : back.mode==='rails'&&(back.upperHeight>0||back.lowerHeight>0)?thickness:0;
  const topGap = d - (back.mode==='full'?seating.bodyRear:0) - top.frontDepth - top.rearDepth;
  const backGap = innerHeight - back.upperHeight - back.lowerHeight;
  const issue = (part: 'top' | 'back', code: string, message: string) => issues.push({ code, featureId: `${c.id}/construction/${part}`, severity: 'error', message });
  for (const [part, values] of [['top', [top.frontDepth, top.rearDepth]], ['back', [back.upperHeight, back.lowerHeight]]] as const) {
    if (values.some(value => !Number.isFinite(value) || (value !== 0 && value < RAIL_LIMITS.min) || value > RAIL_LIMITS.max || Math.abs(value * 10 - Math.round(value * 10)) > 1e-6))
      issue(part, 'rail-size', `Each ${part === 'top' ? 'top rail depth' : 'rear rail height'} must be 0 (no rail) or ${RAIL_LIMITS.min}–${RAIL_LIMITS.max} mm, in 0.1 mm steps. The previous cabinet is preserved.`);
  }
  if (top.mode === 'rails' && topGap < MIN_RAIL_GAP - 1e-6)
    issue('top', 'top-rail-gap', `The top rails need at least ${MIN_RAIL_GAP} mm between them. Reduce their combined depth or increase body depth. The previous cabinet is preserved.`);
  if (back.mode === 'rails' && backGap < MIN_RAIL_GAP - 1e-6)
    issue('back', 'rear-rail-gap', `The rear rails need at least ${MIN_RAIL_GAP} mm between them. Reduce their combined height or increase body height. The previous cabinet is preserved.`);
  const add = (role: PanelRole, label: string, size: Vec3, localOrigin: Vec3, orientation: ConstructionPanel['orientation'], materialRole: 'carcass' | 'back' = 'carcass', constructionPart?: 'top' | 'back') => {
    panels.push({ role, label, size, origin: localOrigin.map((v, i) => v + origin[i]) as Vec3, orientation, materialRole, ...(constructionPart ? { constructionPart } : {}) });
  };
  const rails=c.carcass.frontRails;
  if(rails&&(rails.revision!=='front-rail-1'||[rails.top,rails.bottom].some(r=>typeof r.enabled!=='boolean'||!Number.isFinite(r.width)||(r.width!==0&&r.width<RAIL_LIMITS.min)||r.width>RAIL_LIMITS.max||Math.abs(r.width*10-Math.round(r.width*10))>1e-6)))issues.push({code:'front-rail-size',featureId:c.id,severity:'error',message:'Front reinforcement widths must be 0 (no rail) or 20–600 mm, in 0.1 mm steps.'});
  const topReserve=rails?.top.enabled?rails.top.width:0,bottomReserve=rails?.bottom.enabled?rails.bottom.width:0;
  const frontTopInset=top.mode==='full'||(top.mode==='rails'&&top.frontDepth>0)?thickness:0;
  const rearTopInset=top.mode==='full'||(top.mode==='rails'&&top.rearDepth>0)?thickness:0;
  const topOpeningReserve=Math.max(0,topReserve-(thickness-frontTopInset));
  if(innerHeight-topOpeningReserve-bottomReserve<60)issues.push({code:'front-rail-gap',featureId:c.id,severity:'error',message:'Front reinforcement must leave at least 60 mm of clear opening. Reduce the rail widths or increase cabinet height.'});
  seating.errors.forEach(message=>issue('back','back-seat',message));
  const bodyRear=back.mode==='full'?seating.bodyRear:0;
  if(top.mode==='rails'&&top.rearDepth>0&&back.mode==='full'&&seating.rearSetback>bodyRear+top.rearDepth-3)issue('top','rear-rail-seat','The rear top rail must extend at least 3 mm beyond the back panel. Increase its width or reduce the back inset.');
  add('left', 'Left side', [thickness, h, d-bodyRear], [0, 0, bodyRear], 'yz');
  add('right', 'Right side', [thickness, h, d-bodyRear], [w - thickness, 0, bodyRear], 'yz');
  const puzzle=!!c.carcass.corner, horizontalWidth=puzzle?w:innerWidth,horizontalX=puzzle?0:thickness;
  add('bottom', 'Bottom', [horizontalWidth, thickness, d-bodyRear], [horizontalX, 0, bodyRear], 'xz');
  if (top.mode === 'full') add('top', 'Top', [horizontalWidth, thickness, d-bodyRear], [horizontalX, h - thickness, bodyRear], 'xz', 'carcass', 'top');
  else if(top.mode==='rails') {
    if(top.frontDepth>0)add('top-front-rail', 'Front top rail', [innerWidth, thickness, top.frontDepth], [thickness, h - thickness, d - top.frontDepth], 'xz', 'carcass', 'top');
    if(top.rearDepth>0)add('top-rear-rail', 'Rear top rail', [innerWidth, thickness, top.rearDepth], [thickness, h - thickness, bodyRear], 'xz', 'carcass', 'top');
  }
  if (back.mode === 'full') add('back', 'Back', seating.size, seating.origin, 'xy', 'back', 'back');
  else if(back.mode==='rails') {
    if(back.upperHeight>0)add('back-upper-rail', 'Upper rear rail', [innerWidth, back.upperHeight, thickness], [thickness, h - rearTopInset - back.upperHeight, 0], 'xy', 'carcass', 'back');
    if(back.lowerHeight>0)add('back-lower-rail', 'Lower rear rail', [innerWidth, back.lowerHeight, thickness], [thickness, thickness, 0], 'xy', 'carcass', 'back');
  }
  const insetFronts=[...c.fronts.filter(f=>f.placement==='inset').map(f=>thickness+f.clearance),...(c.drawers??[]).filter(d=>d.front?.placement==='inset').map(d=>thickness+(d.front?.clearance??2))];
  const frontSetback=Math.max(0,...insetFronts);
  if(topReserve)add('front-upper-rail','Top front reinforcement',[innerWidth,topReserve,thickness],[thickness,h-frontTopInset-topReserve,d-frontSetback-thickness],'xy');
  if(bottomReserve)add('front-lower-rail','Bottom front reinforcement',[innerWidth,bottomReserve,thickness],[thickness,thickness,d-frontSetback-thickness],'xy');
  let puzzleCuts:ReturnType<typeof puzzleCorners>=[];try{puzzleCuts=puzzleCorners(c,thickness,bodyRear);}catch(e){issue('top','puzzle-corners',(e as Error).message);}
  let pockets=[...(back.mode==='full'?seating.pockets:[]),...puzzleCuts];try{pockets.push(...backFingerCuts(c,thickness,backThickness));}catch(e){issue('back','back-fingers',(e as Error).message);} try{pockets=addDogbones(c,panels,pockets);}catch(e){issue('back','dogbone-tool',(e as Error).message);}
  return { panels, pockets, issues, rearSetback, topGap, backGap,
    opening: { origin: [thickness, thickness+bottomReserve, rearSetback].map((v, i) => v + origin[i]) as Vec3, size: [innerWidth, innerHeight-topOpeningReserve-bottomReserve, d - rearSetback] as Vec3 } };
}
