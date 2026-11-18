import type { Axis, Cabinet } from '../domain/cabinet';
import { material } from '../catalogue/materials';
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
  try { material(c.materials.carcass); material(c.materials.back); }
  catch (error) { issues.push({ code: 'material-revision', featureId: c.id, severity: 'error', message: (error as Error).message }); }
  if (c.hardware.length) issues.push({ code: 'hardware-unavailable', featureId: c.id, severity: 'error', message: 'This version has no enabled hardware assemblies. The original file is unchanged.' });
  return issues;
}
