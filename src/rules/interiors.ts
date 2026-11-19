import type { Cabinet, Compartment, DivisionAxis, Vec3 } from '../domain/cabinet';
import type { Issue } from './validate';
import { resolveConstruction } from './construction';
export const MIN_OPENING = 60; // Conceptual modelling policy, not a hardware specification.
export interface Opening { id: string; label: string; origin: Vec3; size: Vec3 }
export interface Division {
  id: string; nodeId: string; label: string; axis: DivisionAxis; position: number;
  origin: Vec3; size: Vec3; min: number; max: number; before: number; after: number; canRemove: boolean; policyRevision?: 'fixed-2';
}
export function resolveInteriors(c: Cabinet, thickness: number, back: number, divisionThickness = thickness) {
  const construction = resolveConstruction(c, thickness, back);
  const root: Opening = { id: c.compartments.id, label: 'Interior', ...construction.opening };
  const openings: Opening[] = [], divisions: Division[] = [], issues: Issue[] = [];
  function walk(node: Compartment, bounds: Opening, depth: number) {
    if (depth > 32 || divisions.length > 63) { issues.push({ code: 'interior-complexity', featureId: node.id, severity: 'error', message: 'This prototype supports at most 63 divisions and 32 nested levels.' }); return; }
    if (node.kind === 'opening') { openings.push({ ...bounds, id: node.id, label: `Opening ${openings.length + 1}` }); return; }
    const axis = node.axis === 'horizontal' ? 1 : 0, min = MIN_OPENING + divisionThickness / 2, max = bounds.size[axis] - min;
    const label = `${node.axis === 'horizontal' ? 'Fixed shelf' : 'Divider'} ${divisions.filter(d => d.axis === node.axis).length + 1}`;
    const position=node.anchor==='centre'?bounds.size[axis]/2:node.position;
    if(node.anchor!==undefined&&node.anchor!=='centre'){issues.push({code:'division-anchor',featureId:node.featureId,severity:'error',message:'Unknown division position constraint.'});return;}
    const before = position - divisionThickness / 2, after = bounds.size[axis] - position - divisionThickness / 2;
    if (!Number.isFinite(position) || (node.anchor!=='centre'&&Math.abs(position * 10 - Math.round(position * 10)) > 1e-6) || position < min - 1e-6 || position > max + 1e-6) {
      issues.push({ code: 'division-position', featureId: node.featureId, severity: 'error', message: `In the proposed layout, ${label.toLowerCase()} needs at least ${MIN_OPENING} mm clear on both sides. ${max < min ? 'This opening is too small to divide.' : `Its centre must be ${min.toFixed(1)}–${max.toFixed(1)} mm, in 0.1 mm steps.`} The previous cabinet is preserved.` }); return;
    }
    const setback=node.frontSetback??0;
    if(!['fixed-1','fixed-2'].includes(node.policyRevision)||(node.policyRevision==='fixed-1'&&node.frontSetback!==undefined)||(node.policyRevision==='fixed-2'&&node.frontSetback===undefined)||!Number.isFinite(setback)||setback<0||setback>100||Math.abs(setback*10-Math.round(setback*10))>1e-6||bounds.size[2]-setback<MIN_OPENING){issues.push({code:'division-setback',featureId:node.featureId,severity:'error',message:`${label}: front setback must be 0–100 mm and leave at least 60 mm panel depth. The previous cabinet is preserved.`});return;}
    const origin = [...bounds.origin] as Vec3, size = [...bounds.size] as Vec3;
    origin[axis] += before; size[axis] = divisionThickness; size[2] -= setback;
    divisions.push({ ...(node.policyRevision==='fixed-2'?{policyRevision:node.policyRevision}:{}), id: node.featureId, nodeId: node.id, axis: node.axis, label, position,
      origin, size, min, max, before, after, canRemove: node.children.every(child => child.kind === 'opening' && !c.contents.some(shelf => shelf.openingId === child.id)) });
    const lowSize = [...bounds.size] as Vec3; lowSize[axis] = before;
    const highSize = [...bounds.size] as Vec3; highSize[axis] = after;
    const highOrigin = [...bounds.origin] as Vec3; highOrigin[axis] += position + divisionThickness / 2;
    walk(node.children[0], { ...bounds, origin: [...bounds.origin] as Vec3, size: lowSize }, depth + 1);
    walk(node.children[1], { ...bounds, origin: highOrigin, size: highSize }, depth + 1);
  }
  walk(c.compartments, root, 0);
  return { root, openings, divisions, issues };
}
