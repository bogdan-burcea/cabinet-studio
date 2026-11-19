import {backFingerCuts} from './back-fingers';
import {addDogbones} from './dogbones';
import {puzzleCorners} from './puzzle';
import {backLayout} from './back-panel';
import type { Cabinet, PanelRole, Vec3 } from '../domain/cabinet';
import type { Issue } from './validate';
export const RAIL_LIMITS = { min: 20, max: 600 };
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
  const rearSetback = back.mode === 'rails' ? thickness : seating.rearSetback;
  const topGap = d - top.frontDepth - top.rearDepth;
  const backGap = innerHeight - back.upperHeight - back.lowerHeight;
  const issue = (part: 'top' | 'back', code: string, message: string) => issues.push({ code, featureId: `${c.id}/construction/${part}`, severity: 'error', message });
  for (const [part, values] of [['top', [top.frontDepth, top.rearDepth]], ['back', [back.upperHeight, back.lowerHeight]]] as const) {
    if (values.some(value => !Number.isFinite(value) || value < RAIL_LIMITS.min || value > RAIL_LIMITS.max || Math.abs(value * 10 - Math.round(value * 10)) > 1e-6))
      issue(part, 'rail-size', `Each ${part === 'top' ? 'top rail depth' : 'rear rail height'} must be ${RAIL_LIMITS.min}–${RAIL_LIMITS.max} mm, in 0.1 mm steps. The previous cabinet is preserved.`);
  }
  if (top.mode === 'rails' && topGap < MIN_RAIL_GAP - 1e-6)
    issue('top', 'top-rail-gap', `The top rails need at least ${MIN_RAIL_GAP} mm between them. Reduce their combined depth or increase body depth. The previous cabinet is preserved.`);
  if (back.mode === 'rails' && backGap < MIN_RAIL_GAP - 1e-6)
    issue('back', 'rear-rail-gap', `The rear rails need at least ${MIN_RAIL_GAP} mm between them. Reduce their combined height or increase body height. The previous cabinet is preserved.`);
  const add = (role: PanelRole, label: string, size: Vec3, localOrigin: Vec3, orientation: ConstructionPanel['orientation'], materialRole: 'carcass' | 'back' = 'carcass', constructionPart?: 'top' | 'back') => {
    panels.push({ role, label, size, origin: localOrigin.map((v, i) => v + origin[i]) as Vec3, orientation, materialRole, ...(constructionPart ? { constructionPart } : {}) });
  };
  seating.errors.forEach(message=>issue('back','back-seat',message));
  const bodyRear=back.mode==='full'?seating.bodyRear:0;
  add('left', 'Left side', [thickness, h, d-bodyRear], [0, 0, bodyRear], 'yz');
  add('right', 'Right side', [thickness, h, d-bodyRear], [w - thickness, 0, bodyRear], 'yz');
  const puzzle=!!c.carcass.corner, horizontalWidth=puzzle?w:innerWidth,horizontalX=puzzle?0:thickness;
  add('bottom', 'Bottom', [horizontalWidth, thickness, d-bodyRear], [horizontalX, 0, bodyRear], 'xz');
  if (top.mode === 'full') add('top', 'Top', [horizontalWidth, thickness, d-bodyRear], [horizontalX, h - thickness, bodyRear], 'xz', 'carcass', 'top');
  else {
    add('top-front-rail', 'Front top rail', [innerWidth, thickness, top.frontDepth], [thickness, h - thickness, d - top.frontDepth], 'xz', 'carcass', 'top');
    add('top-rear-rail', 'Rear top rail', [innerWidth, thickness, top.rearDepth], [thickness, h - thickness, 0], 'xz', 'carcass', 'top');
  }
  if (back.mode === 'full') add('back', 'Back', seating.size, seating.origin, 'xy', 'back', 'back');
  else {
    add('back-upper-rail', 'Upper rear rail', [innerWidth, back.upperHeight, thickness], [thickness, h - thickness - back.upperHeight, 0], 'xy', 'carcass', 'back');
    add('back-lower-rail', 'Lower rear rail', [innerWidth, back.lowerHeight, thickness], [thickness, thickness, 0], 'xy', 'carcass', 'back');
  }
  let puzzleCuts:ReturnType<typeof puzzleCorners>=[];try{puzzleCuts=puzzleCorners(c,thickness,bodyRear);}catch(e){issue('top','puzzle-corners',(e as Error).message);}
  let pockets=[...(back.mode==='full'?seating.pockets:[]),...puzzleCuts];try{pockets.push(...backFingerCuts(c,thickness,backThickness));}catch(e){issue('back','back-fingers',(e as Error).message);} try{pockets=addDogbones(c,panels,pockets);}catch(e){issue('back','dogbone-tool',(e as Error).message);}
  return { panels, pockets, issues, rearSetback, topGap, backGap,
    opening: { origin: [thickness, thickness, rearSetback].map((v, i) => v + origin[i]) as Vec3, size: [innerWidth, innerHeight, d - rearSetback] as Vec3 } };
}
