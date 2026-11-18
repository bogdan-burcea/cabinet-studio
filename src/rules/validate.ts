import type { Axis, Cabinet } from '../domain/cabinet';
import { stock, binding, finish, edgeProduct } from '../catalogue/materials';
import { resolveInteriors } from './interiors';
import { resolveConstruction } from './construction';
export interface Issue { code: string; featureId: string; message: string; severity: 'error' | 'notice' }
// Application modelling limits, not manufacturer or load limits.
export const dimensionLimits: Record<Axis, { min: number; max: number }> = {
  width: { min: 120, max: 2400 }, height: { min: 120, max: 3000 }, depth: { min: 100, max: 1200 }
};
export function validate(c: Cabinet): Issue[] {
  const issues: Issue[] = [];
  for (const axis of ['width', 'height', 'depth'] as const) {
    const value = c.envelope[axis], { min, max } = dimensionLimits[axis];
    if (!Number.isFinite(value) || value < min || value > max || Math.abs(value * 10 - Math.round(value * 10)) > 1e-6)
      issues.push({ code: `dimension-${axis}`, featureId: c.id, severity: 'error', message: `${axis[0].toUpperCase() + axis.slice(1)} must be ${min}–${max} mm, in 0.1 mm steps.` });
  }
  try {
    for (const role of ['carcass', 'back', 'interior'] as const) {
      const record = stock(c, role); finish(binding(c, role).finish);
      if (!['none', 'u', 'v'].includes(binding(c, role).grain)) throw new Error('Unknown material grain direction.');
      if (record.kind !== (role === 'back' ? 'back' : 'panel')) throw new Error(`Select ${role === 'back' ? 'back-panel' : 'carcass-panel'} stock for the ${role} role.`);
    }
    const ids = new Set(['left', 'right', 'bottom', 'top', 'back', 'top-front-rail', 'top-rear-rail', 'back-upper-rail', 'back-lower-rail'].map(role => `${c.id}/panel/${role}`));
    const collect = (node: Cabinet['compartments']) => { if (node.kind === 'split') { ids.add(node.featureId); node.children.forEach(collect); } }; collect(c.compartments);
    for (const [id, edges] of Object.entries(c.banding)) {
      if (!ids.has(id)) throw new Error('Edge banding refers to an unavailable panel. The previous cabinet is preserved.');
      for (const [key, pin] of Object.entries(edges)) {
        if (!['u-min', 'u-max', 'v-min', 'v-max'].includes(key) || !pin) throw new Error('Unknown panel edge.');
        edgeProduct(pin);
      }
    }
  }
  catch (error) { issues.push({ code: 'material-revision', featureId: c.id, severity: 'error', message: (error as Error).message }); }
  if (c.hardware.length) issues.push({ code: 'hardware-unavailable', featureId: c.id, severity: 'error', message: 'This version has no enabled hardware assemblies. The original file is unchanged.' });
  if (!issues.some(i => i.severity === 'error')) {
    const t = stock(c, 'carcass').thickness, b = stock(c, 'back').thickness;
    issues.push(...resolveConstruction(c, t, b).issues);
    if (!issues.length) issues.push(...resolveInteriors(c, t, b, stock(c, 'interior').thickness).issues);
  }
  return issues;
}
