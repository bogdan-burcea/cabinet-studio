import type { Cabinet, PanelRole, MaterialRole, Vec3 } from '../domain/cabinet';
import { stock } from '../catalogue/materials';
import { validate, type Issue } from '../rules/validate';
import { panelMaterials } from './banding';
import { resolveConstruction } from '../rules/construction';
import { resolveInteriors, type Division, type Opening } from '../rules/interiors';
export const EVALUATOR_REVISION = 'materials-4';
export interface Panel extends ReturnType<typeof panelMaterials> {
  id: string; role: PanelRole; label: string; size: Vec3; center: Vec3; materialRole: MaterialRole;
  provenance: string; orientation: 'yz' | 'xz' | 'xy'; constructionPart?: 'top' | 'back';
}
export interface EvaluatedCabinet {
  revision: typeof EVALUATOR_REVISION; cabinetId: string; panels: Panel[]; opening: Opening; openings: Opening[]; divisions: Division[];
  construction: { rearSetback: number; topGap: number; backGap: number }; issues: Issue[];
}
// Millimetres; +X right, +Y up, +Z toward the viewer. Front is Z=depth.
// Panels are finished rectangular bodies. No inferred joinery or machining.
export function evaluate(c: Cabinet): EvaluatedCabinet {
  const issues = validate(c);
  if (issues.some(i => i.severity === 'error')) throw new Error(issues.map(i => i.message).join(' '));
  const t = stock(c, 'carcass').thickness, b = stock(c, 'back').thickness;
  const construction = resolveConstruction(c, t, b), interiors = resolveInteriors(c, t, b, stock(c, 'interior').thickness);
  const basePanels: Omit<Panel, keyof ReturnType<typeof panelMaterials>>[] = construction.panels.map(panel => ({
    id: `${c.id}/panel/${panel.role}`, role: panel.role, label: panel.label, size: panel.size,
    center: panel.origin.map((n, i) => n + panel.size[i] / 2) as Vec3,
    materialRole: panel.materialRole, provenance: `${c.id}/carcass/${c.carcass.policyRevision}`,
    orientation: panel.orientation, ...(panel.constructionPart ? { constructionPart: panel.constructionPart } : {})
  }));
  basePanels.push(...interiors.divisions.map(division => ({
    id: division.id, role: (division.axis === 'horizontal' ? 'shelf' : 'divider') as PanelRole, label: division.label,
    size: division.size, center: division.origin.map((n, i) => n + division.size[i] / 2) as Vec3,
    materialRole: 'interior' as const, provenance: `${division.nodeId}/fixed-1`, orientation: (division.axis === 'horizontal' ? 'xz' : 'yz') as 'xz' | 'yz'
  })));
  const panels: Panel[] = basePanels.map(panel => ({ ...panel, ...panelMaterials(c, panel) }));
  return { revision: EVALUATOR_REVISION, cabinetId: c.id, issues, panels, opening: interiors.root, openings: interiors.openings, divisions: interiors.divisions,
    construction: { rearSetback: construction.rearSetback, topGap: construction.topGap, backGap: construction.backGap } };
}
