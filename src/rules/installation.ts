import type { Cabinet, Vec3 } from '../domain/cabinet';
import { conceptFoot, footGeometry } from '../catalogue/installation';
import { stock } from '../catalogue/materials';
import type { Issue } from './validate';
export interface FootPart { id: string; kind: 'plate' | 'post' | 'base'; size: Vec3; center: Vec3 }
export interface Foot { id: string; label: string; geometry: { id: string; revision: string }; parts: FootPart[] }
export interface PlinthPlacement { id: string; role: 'plinth-front' | 'plinth-left' | 'plinth-right'; label: string; size: Vec3; center: Vec3; orientation: 'xy' | 'yz' }
export const supportLimits = {
  height: { min: conceptFoot.minHeight, max: conceptFoot.maxHeight }, inset: { min: conceptFoot.plateSize / 2, max: 600 }, setback: { min: 0, max: 150 }, gap: { min: 0, max: 20 }
};
export function plinthSetback(c:Cabinet){const b=c.installation.plinth;return b.footGap===undefined?b.frontSetback:c.installation.feet.frontInset-conceptFoot.plateSize/2-b.footGap-stock(c,'plinth').thickness;}
export function resolveInstallation(c: Cabinet) {
  const frontSetback=plinthSetback(c);
  const intent = c.installation, feet: Foot[] = [], panels: PlinthPlacement[] = [], issues: Issue[] = [];
  const { width: w, height: h, depth: d, origin: [ox, oy, oz] } = c.envelope;
  const fail = (part: 'feet' | 'plinth', message: string) => issues.push({ code: `installation-${part}`, featureId: `${c.id}/installation/${part}`, severity: 'error', message: `${message} The previous cabinet is preserved.` });
  const validNumber = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max && Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
  if (!['unassigned', 'floor', 'feet-concept'].includes(intent.type) || intent.policyRevision !== 'support-1') fail('feet', 'Unsupported installation mode or policy revision.');
  let profile;
  try { profile = footGeometry(intent.feet.geometry); }
  catch (error) { fail('feet', (error as Error).message); }
  if (!validNumber(intent.feet.height, supportLimits.height.min, supportLimits.height.max)) fail('feet', 'Concept foot height must be 5–200 mm, in 0.1 mm steps.');
  for (const key of ['sideInset', 'frontInset', 'rearInset'] as const) if (!validNumber(intent.feet[key], supportLimits.inset.min, supportLimits.inset.max)) fail('feet', 'Foot centre setbacks must be 30–600 mm, in 0.1 mm steps.');
  if ((intent.plinth.enabled||intent.plinth.footGap===undefined)&&!validNumber(frontSetback, 0, intent.plinth.footGap===undefined?150:d-stock(c,'plinth').thickness)) fail('plinth', 'The plinth must stay inside the body. Move the front feet back or reduce the foot gap.');
  for (const key of ['topGap', 'bottomGap'] as const) if (!validNumber(intent.plinth[key], 0, 20)) fail('plinth', 'Plinth top/floor gaps must be 0–20 mm, in 0.1 mm steps.');
  if(intent.feet.layout!==undefined&&!['four','front-pair'].includes(intent.feet.layout))fail('feet','Choose two front feet or four feet.');
  if(intent.plinth.footGap!==undefined&&!validNumber(intent.plinth.footGap,0,150))fail('plinth','Plinth-to-foot gap must be 0–150 mm.');
  if(c.cabinetType==='wall'&&(intent.type==='feet-concept'||intent.plinth.enabled))fail('feet','Wall cabinets cannot have feet or a plinth.');
  const suspended = intent.mounting.mode === 'suspended-concept';
  const supportHeight = suspended ? intent.mounting.floorClearance : intent.type === 'feet-concept' ? intent.feet.height : 0;
  const floorY = oy - supportHeight, installedHeight = intent.type === 'unassigned' && !suspended ? null : h + supportHeight;
  const plinthHeight = supportHeight - intent.plinth.topGap - intent.plinth.bottomGap;
  const thickness = stock(c, 'plinth').thickness;
  if (intent.type === 'feet-concept' && profile && !issues.length) {
    const half = profile.plateSize / 2;
    if (w - 2 * intent.feet.sideInset < profile.plateSize - 1e-6) fail('feet', 'The left/right foot envelopes overlap. Reduce side setbacks or increase body width.');
    if (intent.feet.layout!=='front-pair'&&d - intent.feet.frontInset - intent.feet.rearInset < profile.plateSize - 1e-6) fail('feet', 'The front/rear foot envelopes overlap. Reduce their setbacks or increase body depth.');
    if (intent.plinth.enabled) {
      if (plinthHeight < 40) fail('plinth', 'Plinth height after the floor/top gaps must be at least 40 mm.');
      if (intent.feet.frontInset - half - frontSetback - thickness < (intent.plinth.footGap===undefined?profile.clearance:0) - 1e-6)
        fail('plinth', 'Front plinth conflicts with the foot envelope. Move the front feet farther back or reduce the plinth setback/thickness; at least 5 mm clearance is required by this concept policy.');
      if ((intent.plinth.leftReturn || intent.plinth.rightReturn) && intent.feet.sideInset - half - thickness < profile.clearance - 1e-6)
        fail('plinth', 'A plinth side return conflicts with the foot envelope. Move the side feet inward or use thinner plinth stock; at least 5 mm clearance is required by this concept policy.');
      if (d - frontSetback - thickness <= 0) fail('plinth', 'The plinth setback leaves no side-return depth.');
    }
    if (!issues.length) {
      for (const [name, x] of [['left', intent.feet.sideInset], ['right', w - intent.feet.sideInset]] as const)
        for (const [row, z] of [['front', d - intent.feet.frontInset], ...intent.feet.layout==='front-pair'?[]:[['rear', intent.feet.rearInset]]] as [string,number][]) {
          const id = `${c.id}/installation/foot/${row}-${name}`;
          const part = (kind: FootPart['kind'], size: Vec3, y: number): FootPart => ({ id: `${id}/${kind}`, kind, size, center: [ox + x, y, oz + z] });
          feet.push({ id, label: `${row === 'front' ? 'Front' : 'Rear'} ${name} foot`, geometry: intent.feet.geometry, parts: [
            part('plate', [profile.plateSize, Math.min(profile.plateHeight,supportHeight*.4), profile.plateSize], oy - Math.min(profile.plateHeight,supportHeight*.4) / 2),
            part('base', [profile.baseDiameter, Math.min(profile.baseHeight,supportHeight*.2), profile.baseDiameter], floorY + Math.min(profile.baseHeight,supportHeight*.2) / 2),
            part('post', [profile.postDiameter, supportHeight - Math.min(profile.plateHeight,supportHeight*.4) - Math.min(profile.baseHeight,supportHeight*.2), profile.postDiameter], floorY + Math.min(profile.baseHeight,supportHeight*.2) + (supportHeight - Math.min(profile.plateHeight,supportHeight*.4) - Math.min(profile.baseHeight,supportHeight*.2)) / 2)
          ] });
        }
      if (intent.plinth.enabled) {
        const y = floorY + intent.plinth.bottomGap + plinthHeight / 2, front = d - frontSetback;
        panels.push({ id: `${c.id}/panel/plinth-front`, role: 'plinth-front', label: 'Front plinth', size: [w, plinthHeight, thickness], center: [ox + w / 2, y, oz + front - thickness / 2], orientation: 'xy' });
        for (const side of ['left', 'right'] as const) if (side === 'left' ? intent.plinth.leftReturn : intent.plinth.rightReturn)
          panels.push({ id: `${c.id}/panel/plinth-${side}`, role: `plinth-${side}`, label: `${side === 'left' ? 'Left' : 'Right'} plinth return`, size: [thickness, plinthHeight, front - thickness], center: [ox + (side === 'left' ? thickness / 2 : w - thickness / 2), y, oz + (front - thickness) / 2], orientation: 'yz' });
      }
    }
  }
  return { feet, panels, issues, floorY, supportHeight, installedHeight, plinthHeight: intent.type === 'feet-concept' && intent.plinth.enabled ? plinthHeight : null };
}
