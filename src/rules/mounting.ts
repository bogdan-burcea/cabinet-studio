import type { Cabinet, Vec3 } from '../domain/cabinet';
import { conceptMounting, mountingGeometry } from '../catalogue/mounting';
import type { Issue } from './validate';
export interface MountingPart { id: string; label: string; kind: 'rail' | 'bracket'; size: Vec3; center: Vec3; geometry: { id: string; revision: string }; provenance: string }
export const mountingLimits = { wallGap: { min: conceptMounting.minWallGap, max: 100 }, topOffset: { min: conceptMounting.bracketHeight / 2, max: 600 }, sideInset: { min: conceptMounting.bracketWidth / 2, max: 600 }, floorClearance: { min: 50, max: 2000 } };
export function resolveMounting(c: Cabinet) {
  const m = c.installation.mounting, parts: MountingPart[] = [], issues: Issue[] = [];
  const { width: w, height: h, origin: [ox, oy, oz] } = c.envelope;
  const fail = (message: string) => issues.push({ code: 'installation-mounting', severity: 'error', featureId: `${c.id}/installation/mounting`, message: `${message} The previous cabinet is preserved.` });
  if (!['none', 'restraint-concept', 'suspended-concept'].includes(m.mode) || m.policyRevision !== 'mounting-1') fail('Unsupported wall-mounting mode or policy.');
  let profile;
  try { profile = mountingGeometry(m.geometry); } catch (error) { fail((error as Error).message); }
  for (const key of ['wallGap', 'topOffset', 'sideInset', 'floorClearance'] as const) {
    const n = m[key], range = mountingLimits[key];
    if (!Number.isFinite(n) || n < range.min || n > range.max || Math.abs(n * 10 - Math.round(n * 10)) > 1e-6) fail(`${key === 'wallGap' ? 'Wall gap' : key === 'topOffset' ? 'Mounting centre from top' : key === 'sideInset' ? 'Mounting side setback' : 'Body above floor'} must be ${range.min}–${range.max} mm in 0.1 mm steps.`);
  }
  const active = m.mode !== 'none', suspended = m.mode === 'suspended-concept';
  if (active && profile && !issues.length) {
    if (suspended && c.installation.type !== 'unassigned') fail('Suspended layout requires unassigned floor support. Foot/plinth settings are retained; choose unassigned support or a wall-restraint layout.');
    if (m.mode === 'restraint-concept' && c.installation.type === 'unassigned') fail('Wall-restraint layout requires direct-floor or concept-foot support; it does not suspend the cabinet.');
    if (m.topOffset + profile.bracketHeight / 2 > h + 1e-6) fail('Mounting bracket envelopes extend below the cabinet. Reduce the centre offset or increase body height.');
    if (w - 2 * m.sideInset < profile.bracketWidth + profile.bracketSeparation - 1e-6) fail('Left/right mounting envelopes need at least 10 mm separation. Reduce side setbacks or increase body width.');
    if (!issues.length) {
      const y = oy + h - m.topOffset, wallZ = oz - m.wallGap;
      const add = (key: string, label: string, kind: MountingPart['kind'], size: Vec3, center: Vec3) => parts.push({ id: `${c.id}/installation/mounting/${key}`, label, kind, size, center, geometry: m.geometry, provenance: `${c.id}/installation/mounting-1` });
      add('rail', 'Concept wall rail', 'rail', [w - 2 * m.sideInset + profile.bracketWidth, profile.railHeight, profile.railDepth], [ox + w / 2, y, wallZ + profile.railDepth / 2]);
      for (const [side, x] of [['left', m.sideInset], ['right', w - m.sideInset]] as const)
        add(side, `${side === 'left' ? 'Left' : 'Right'} mounting envelope`, 'bracket', [profile.bracketWidth, profile.bracketHeight, m.wallGap - profile.railDepth], [ox + x, y, (wallZ + profile.railDepth + oz) / 2]);
    }
  }
  const bodyAboveFloor = suspended ? m.floorClearance : c.installation.type === 'feet-concept' ? c.installation.feet.height : c.installation.type === 'floor' ? 0 : null;
  return { parts, issues, wallZ: active ? oz - m.wallGap : null, bodyAboveFloor: active ? bodyAboveFloor : null, mountingHeight: active && bodyAboveFloor !== null ? bodyAboveFloor + h - m.topOffset : null };
}
