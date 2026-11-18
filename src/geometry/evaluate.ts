import type { Cabinet, PanelRole, Vec3 } from '../domain/cabinet';
import { material } from '../catalogue/materials';
import { validate, type Issue } from '../rules/validate';
import { resolveInteriors, type Division, type Opening } from '../rules/interiors';
export const EVALUATOR_REVISION = 'interiors-2';
export interface Panel { id: string; role: PanelRole; label: string; size: Vec3; center: Vec3; materialId: string; provenance: string; orientation: 'yz' | 'xz' | 'xy' }
export interface EvaluatedCabinet { revision: typeof EVALUATOR_REVISION; cabinetId: string; panels: Panel[]; opening: Opening; openings: Opening[]; divisions: Division[]; issues: Issue[] }
// Millimetres; +X right, +Y up, +Z toward the viewer. Front is Z=depth.
// Panels are finished rectangular bodies. No inferred joinery or machining.
export function evaluate(c: Cabinet): EvaluatedCabinet {
  const issues = validate(c);
  if (issues.some(i => i.severity === 'error')) throw new Error(issues.map(i => i.message).join(' '));
  const { width: w, height: h, depth: d } = c.envelope;
  const t = material(c.materials.carcass).thickness, b = material(c.materials.back).thickness;
  const interiors = resolveInteriors(c, t, b);
  const panel = (role: PanelRole, label: string, size: Vec3, center: Vec3, orientation: Panel['orientation']): Panel => ({
    id: `${c.id}/panel/${role}`, role, label, size, center: center.map((n, i) => n + c.envelope.origin[i]) as Vec3,
    materialId: role === 'back' ? c.materials.back.id : c.materials.carcass.id,
    provenance: `${c.id}/carcass/${c.carcass.policyRevision}`, orientation
  });
  return { revision: EVALUATOR_REVISION, cabinetId: c.id, issues, panels: [
    panel('left', 'Left side', [t, h, d], [t / 2, h / 2, d / 2], 'yz'),
    panel('right', 'Right side', [t, h, d], [w - t / 2, h / 2, d / 2], 'yz'),
    panel('bottom', 'Bottom', [w - 2 * t, t, d], [w / 2, t / 2, d / 2], 'xz'),
    panel('top', 'Top', [w - 2 * t, t, d], [w / 2, h - t / 2, d / 2], 'xz'),
    panel('back', 'Back', [w - 2 * t, h - 2 * t, b], [w / 2, h / 2, b / 2], 'xy')
  , ...interiors.divisions.map((division): Panel => ({ id: division.id, role: division.axis === 'horizontal' ? 'shelf' : 'divider', label: division.label,
    size: division.size, center: division.origin.map((n, i) => n + division.size[i] / 2) as Vec3, materialId: c.materials.carcass.id,
    provenance: `${division.nodeId}/fixed-1`, orientation: division.axis === 'horizontal' ? 'xz' : 'yz' }))
  ], opening: interiors.root, openings: interiors.openings, divisions: interiors.divisions };
}
