import type { Cabinet, Compartment, DivisionAxis, Vec3 } from '../domain/cabinet';
import type { Issue } from './validate';
import { resolveConstruction } from './construction';
export const MIN_OPENING = 60; // Conceptual modelling policy, not a hardware specification.
export interface Opening { id: string; label: string; origin: Vec3; size: Vec3 }
export interface Division {
  id: string; nodeId: string; label: string; axis: DivisionAxis; position: number;
  origin: Vec3; size: Vec3; min: number; max: number; before: number; after: number; canRemove: boolean;
}
export function resolveInteriors(c: Cabinet, thickness: number, back: number) {
  const construction = resolveConstruction(c, thickness, back);
  const root: Opening = { id: c.compartments.id, label: 'Interior', ...construction.opening };
  const openings: Opening[] = [], divisions: Division[] = [], issues: Issue[] = [];
  function walk(node: Compartment, bounds: Opening, depth: number) {
    if (depth > 32 || divisions.length > 63) { issues.push({ code: 'interior-complexity', featureId: node.id, severity: 'error', message: 'This prototype supports at most 63 divisions and 32 nested levels.' }); return; }
    if (node.kind === 'opening') { openings.push({ ...bounds, id: node.id, label: `Opening ${openings.length + 1}` }); return; }
    const axis = node.axis === 'horizontal' ? 1 : 0, min = MIN_OPENING + thickness / 2, max = bounds.size[axis] - min;
    const label = `${node.axis === 'horizontal' ? 'Fixed shelf' : 'Divider'} ${divisions.filter(d => d.axis === node.axis).length + 1}`;
    const before = node.position - thickness / 2, after = bounds.size[axis] - node.position - thickness / 2;
    if (!Number.isFinite(node.position) || Math.abs(node.position * 10 - Math.round(node.position * 10)) > 1e-6 || node.position < min - 1e-6 || node.position > max + 1e-6) {
      issues.push({ code: 'division-position', featureId: node.featureId, severity: 'error', message: `In the proposed layout, ${label.toLowerCase()} needs at least ${MIN_OPENING} mm clear on both sides. ${max < min ? 'This opening is too small to divide.' : `Its centre must be ${min.toFixed(1)}–${max.toFixed(1)} mm, in 0.1 mm steps.`} The previous cabinet is preserved.` }); return;
    }
    const origin = [...bounds.origin] as Vec3, size = [...bounds.size] as Vec3;
    origin[axis] += before; size[axis] = thickness;
    divisions.push({ id: node.featureId, nodeId: node.id, axis: node.axis, label, position: node.position,
      origin, size, min, max, before, after, canRemove: node.children.every(child => child.kind === 'opening') });
    const lowSize = [...bounds.size] as Vec3; lowSize[axis] = before;
    const highSize = [...bounds.size] as Vec3; highSize[axis] = after;
    const highOrigin = [...bounds.origin] as Vec3; highOrigin[axis] += node.position + thickness / 2;
    walk(node.children[0], { ...bounds, origin: [...bounds.origin] as Vec3, size: lowSize }, depth + 1);
    walk(node.children[1], { ...bounds, origin: highOrigin, size: highSize }, depth + 1);
  }
  walk(c.compartments, root, 0);
  return { root, openings, divisions, issues };
}
