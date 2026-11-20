import {frontProfileCuts} from '../rules/front-profiles';
import {drawerBoardPanels} from './drawer-panels';
import {drawerDrilling} from '../rules/drawer-drilling';
import {rearCornerCuts} from '../rules/rear-corner-clearance';
import {wallHangingCuts} from '../rules/wall-hanging';
import {footDrilling} from '../rules/foot-drilling';
import {hingePlateReview} from '../rules/hinge-plate-review';
import {doorHardware} from '../rules/door-hardware';
import {backPilots} from '../rules/applied-back';
import {shelfDrilling} from '../rules/shelf-drilling';
import type {CabineoBore} from '../rules/cabineo';
import {fingerInteriors} from '../rules/finger-interiors';
import {addDogbones,narrowToolCuts} from '../rules/dogbones';
import {oneFaceBores} from '../rules/through-holes';
import {machiningReview} from '../rules/machining-review';
import {resolveBackFasteners} from '../rules/back-fasteners';
import {resolveCabineo} from '../rules/cabineo';
import {resolveDrawers} from '../rules/drawers';
import type { Cabinet, PanelRole, MaterialRole, Vec3 } from '../domain/cabinet';
import { stock } from '../catalogue/materials';
import { validate, type Issue } from '../rules/validate';
import { panelMaterials } from './banding';
import { resolveFronts } from '../rules/fronts';
import { resolveAdjustable } from '../rules/adjustable';
import { resolveMounting } from '../rules/mounting';
import { resolveInstallation } from '../rules/installation';
import { resolveConstruction } from '../rules/construction';
import { resolveInteriors, type Division, type Opening } from '../rules/interiors';
export const EVALUATOR_REVISION = 'notch-mouth-38';
export interface Panel extends ReturnType<typeof panelMaterials> {
  id: string; role: PanelRole; label: string; size: Vec3; center: Vec3; materialRole: MaterialRole;
  provenance: string; orientation: 'yz' | 'xz' | 'xy'; constructionPart?: 'top' | 'back'; installationPart?: 'plinth';
}
export interface EvaluatedCabinet {
  doorHardware:ReturnType<typeof doorHardware>;
  drilling:CabineoBore[];
  backFasteners:ReturnType<typeof resolveBackFasteners>;
  pockets:ReturnType<typeof resolveConstruction>['pockets'];
  cabineo:ReturnType<typeof resolveCabineo>;
  drawers:ReturnType<typeof resolveDrawers>;
  revision: typeof EVALUATOR_REVISION; cabinetId: string; panels: Panel[]; opening: Opening; openings: Opening[]; divisions: Division[];
  fronts: ReturnType<typeof resolveFronts>;
  adjustable: ReturnType<typeof resolveAdjustable>;
  mounting: ReturnType<typeof resolveMounting>;
  installation: ReturnType<typeof resolveInstallation>;
  construction: { rearSetback: number; topGap: number; backGap: number }; issues: Issue[];
}
// Millimetres; +X right, +Y up, +Z toward the viewer. Front is Z=depth.
// Panels are finished rectangular bodies. No inferred joinery or machining.
export function evaluate(c: Cabinet): EvaluatedCabinet {
  const issues = validate(c);
  if (issues.some(i => i.severity === 'error')) throw new Error(issues.map(i => i.message).join(' '));
  const t = stock(c, 'carcass').thickness, b = stock(c, 'back').thickness;
  const construction = resolveConstruction(c, t, b), interiors = resolveInteriors(c, t, b, stock(c, 'interior').thickness);
  const name=(p:{id:string;label:string})=>{if(c.names?.[p.id])p.label=c.names[p.id];};
  construction.panels.forEach(p=>{const label=c.names?.[`${c.id}/panel/${p.role}`];if(label)p.label=label;});interiors.openings.forEach(name);interiors.divisions.forEach(name);
  const basePanels: Omit<Panel, keyof ReturnType<typeof panelMaterials>>[] = construction.panels.map(panel => ({
    id: `${c.id}/panel/${panel.role}`, role: panel.role, label: panel.label, size: panel.size,
    center: panel.origin.map((n, i) => n + panel.size[i] / 2) as Vec3,
    materialRole: panel.materialRole, provenance: `${c.id}/carcass/${c.carcass.policyRevision}`,
    orientation: panel.orientation, ...(panel.constructionPart ? { constructionPart: panel.constructionPart } : {})
  }));
  basePanels.push(...interiors.divisions.map(division => ({
    id: division.id, role: (division.axis === 'horizontal' ? 'shelf' : 'divider') as PanelRole, label: division.label,
    size: division.size, center: division.origin.map((n, i) => n + division.size[i] / 2) as Vec3,
    materialRole: 'interior' as const, provenance: `${division.nodeId}/${division.policyRevision ?? 'fixed-1'}`, orientation: (division.axis === 'horizontal' ? 'xz' : 'yz') as 'xz' | 'yz'
  })));
  const adjustable = resolveAdjustable(c, interiors.openings);
  adjustable.shelves.forEach(name);
  basePanels.push(...adjustable.shelves.map(shelf => ({ id: shelf.id, role: 'shelf' as const, label: shelf.label, size: shelf.size, center: shelf.origin.map((v,i) => v+shelf.size[i]/2) as Vec3, materialRole: 'interior' as const, provenance: `${shelf.id}/adjustable-1`, orientation: 'xz' as const })));
  const installation = resolveInstallation(c);
  installation.feet.forEach(name);
  basePanels.push(...installation.panels.map(panel => ({ ...panel, materialRole: 'plinth' as const, installationPart: 'plinth' as const, provenance: `${c.id}/installation/support-1` })));
  const fronts = resolveFronts(c,basePanels);
  fronts.doors.forEach(name);
  basePanels.push(...fronts.doors);
  const drawers=resolveDrawers(c);
  const profiles=frontProfileCuts(c,fronts.doors,drawers.drawers);
  const interiorsWithFingers=fingerInteriors(c,basePanels,construction.pockets),fingerCuts=addDogbones(c,interiorsWithFingers.panels.map(p=>({...p,origin:p.center.map((n,i)=>n-p.size[i]/2) as Vec3})),interiorsWithFingers.pockets),hanging=wallHangingCuts(c),pockets=[...construction.pockets,...fingerCuts,...hanging.pockets,...rearCornerCuts(c,interiorsWithFingers.panels),...profiles];
  const narrow=narrowToolCuts(c,pockets);if(narrow.length){const width=Math.min(...narrow.flatMap(p=>p.size.filter((_,i)=>i!==p.axis)));issues.push({code:'machining-tool-width',featureId:c.id,severity:'notice',relatedIds:[...new Set([...narrow.map(p=>p.panelId),...narrow.every(p=>!p.kind)?[`${c.id}/panel/back`]:[]])],message:`${narrow.length} connection cuts are narrower than the Ø${c.carcass.machining!.bitDiameter} mm cutter (smallest width ${+width.toFixed(2)} mm). Use a smaller cutter or compatible thicker stock. Joint fit allowance is unchanged.`});}
  const panels: Panel[] = interiorsWithFingers.panels.map(panel => ({ ...panel, ...panelMaterials(c, panel) }));
  panels.forEach(name);
  const hardware=doorHardware(c,fronts.doors);issues.push(...hingePlateReview(panels,hardware.hinges));
  const drilling=[...drawerDrilling(c,panels),...hanging.bores,...footDrilling(c),...hardware.bores,...backPilots(c),...shelfDrilling(c,panels,interiors.openings)],backFasteners=resolveBackFasteners(c),cabineo=oneFaceBores(c,panels,resolveCabineo(c,panels),[...backFasteners,...drilling],pockets);issues.push(...machiningReview([...panels,...drawerBoardPanels(drawers.drawers,panels.find(p=>p.role==='bottom')!)],cabineo,[...backFasteners,...drilling],pockets));
  return { doorHardware:hardware, drilling, backFasteners, pockets, cabineo, revision: EVALUATOR_REVISION, cabinetId: c.id, issues, drawers, fronts, adjustable, installation, mounting: resolveMounting(c), panels, opening: interiors.root, openings: interiors.openings, divisions: interiors.divisions,
    construction: { rearSetback: construction.rearSetback, topGap: construction.topGap, backGap: construction.backGap } };
}
