import {shelfPattern} from './shelf-pattern';
import type { Cabinet, Vec3, ProductPin } from '../domain/cabinet';
import { stock } from '../catalogue/materials';
import { shelfSupport } from '../catalogue/shelves';
import type { Opening, Division } from './interiors';
import type { Issue } from './validate';
export interface SupportPad { id: string; ownerId: string; size: Vec3; center: Vec3 }
export interface EvaluatedShelf extends Division { kind: 'adjustable-shelf'; level: number; underside: number; pitch: number; legalPositions: number[]; support: { id: string; revision: string }; frontSetback: number }
export function shelfLevelForCentre(centre: number, thickness: number, pin: ProductPin): number {
  const profile = shelfSupport(pin);
  return Number.isFinite(centre) ? Math.round((centre - thickness / 2 - profile.firstLevel) / profile.pitch) : NaN;
}
export function snappedShelfCentre(centre: number, thickness: number, pin: ProductPin): number {
  const profile = shelfSupport(pin);
  return profile.firstLevel + shelfLevelForCentre(centre, thickness, pin) * profile.pitch + thickness / 2;
}
export function resolveAdjustable(c: Cabinet, openings: Opening[]) {
  const shelves: EvaluatedShelf[] = [], supports: SupportPad[] = [], issues: Issue[] = [], t = stock(c, 'interior').thickness;
  const seen = new Set<string>();
  for (const [index, intent] of c.contents.entries()) {
    const label = `Adjustable shelf ${index + 1}`;
    const fail = (message: string) => issues.push({ code: 'adjustable-shelf', severity: 'error', featureId: intent.id, message: `${label}: ${message} The previous cabinet is preserved.` });
    if (seen.has(intent.id)) { fail('duplicate shelf identity.'); continue; } seen.add(intent.id);
    let profile;
    try { profile = shelfSupport(intent.support); } catch (error) { fail((error as Error).message); continue; }
    if (intent.kind !== 'adjustable-shelf' || intent.policyRevision !== 'adjustable-1' || !Number.isInteger(intent.level) || intent.level < 0 || intent.level > 100) { fail('unsupported shelf kind, policy or support level.'); continue; }
    if (!Number.isFinite(intent.frontSetback) || intent.frontSetback < 0 || intent.frontSetback > (intent.drilling?c.envelope.depth-60:profile.maxFrontSetback) || Math.abs(intent.frontSetback * 10 - Math.round(intent.frontSetback * 10)) > 1e-6) { fail('front inset must be non-negative, in 0.1 mm steps, and leave usable shelf depth.'); continue; }
    const opening = openings.find(o => o.id === intent.openingId);
    if (!opening) { fail('its parent opening would disappear. Remove or relocate this shelf before dividing/merging that opening.'); continue; }
    let drilled:ReturnType<typeof shelfPattern>|undefined;
    try{if(intent.drilling)drilled=shelfPattern(c,intent,opening);}catch(e){fail((e as Error).message);continue;}
    const maxLevel = Math.floor((opening.size[1] - profile.minClear - t - profile.firstLevel + 1e-6) / profile.pitch);
    const underside=drilled?drilled.undersides[intent.level-intent.drilling!.firstLevel]:profile.firstLevel+intent.level*profile.pitch,position=underside+t/2;
    const candidates=drilled?drilled.undersides.map(y=>y+t/2):Array.from({length:Math.max(0,maxLevel+1)},(_,level)=>profile.firstLevel+level*profile.pitch+t/2);
    if(!Number.isFinite(underside)||underside+t+profile.minClear>opening.size[1]+1e-6){fail('its support level leaves less than 60 mm clear above it. Choose a lower level or enlarge the opening.');continue;}
    const shelfDepth = opening.size[2] - intent.frontSetback;
    if (shelfDepth < (intent.drilling?60:2 * profile.rowInset + profile.padSize[2]) - 1e-6) { fail('the two support rows do not fit in this depth. Reduce front setback or increase depth.'); continue; }
    const origin: Vec3 = [opening.origin[0] + profile.sideClearance, opening.origin[1] + underside, opening.origin[2]];
    const size: Vec3 = [opening.size[0] - 2 * profile.sideClearance, t, shelfDepth];
    const siblings = c.contents.filter(other => other.openingId === intent.openingId && other.id !== intent.id);
    const otherUnderside=(other:typeof intent)=>{try{return other.drilling?shelfPattern(c,other,opening).undersides[other.level-other.drilling.firstLevel]:profile.firstLevel+other.level*profile.pitch;}catch{return NaN;}};
    const legalPositions=candidates.filter(candidate=>siblings.every(other=>Math.abs(candidate-(otherUnderside(other)+t/2))>=t+profile.minClear-1e-6));
    if(!legalPositions.some(p=>Math.abs(p-position)<1e-6)){fail('another adjustable shelf needs at least 60 mm clear between the finished panels.');continue;}
    const below=siblings.map(otherUnderside).filter(y=>y<underside).map(y=>y+t),above=siblings.map(otherUnderside).filter(y=>y>underside);
    shelves.push({ id: intent.id, nodeId: intent.openingId, label, kind: 'adjustable-shelf', axis: 'horizontal', level: intent.level, underside, position,
      origin, size, min: legalPositions[0], max: legalPositions[legalPositions.length - 1], before: underside - Math.max(0, ...below), after: Math.min(opening.size[1], ...above) - underside - t,
      canRemove: true, pitch: profile.pitch, legalPositions, support: intent.support, frontSetback: intent.frontSetback });
    for (const [side, x] of [['left', origin[0] + profile.padSize[0] / 2], ['right', origin[0] + size[0] - profile.padSize[0] / 2]] as const)
      for (const [row, z] of [['rear', origin[2] + profile.rowInset], ['front', origin[2] + shelfDepth - profile.rowInset]] as const)
        supports.push({ id: `${intent.id}/support/${row}-${side}`, ownerId: intent.id, size: [...profile.padSize], center: [x, origin[1] - profile.padSize[1] / 2, z] });
  }
  return { shelves, supports, issues };
}
