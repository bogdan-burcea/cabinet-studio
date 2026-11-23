import {physicalPanels,physicalPockets,type ShakerPanel} from '../rules/shaker';
import {drawerBoardPanels} from '../geometry/drawer-panels';
import {material} from '../catalogue/materials';
import type {EvaluatedCabinet, Panel} from '../geometry/evaluate';
import {faceAxes} from '../geometry/banding';
import {partPreview} from '../geometry/part-preview';
import {preferredFace} from '../geometry/part-face';
import {machiningFaces} from '../rules/machining-review';

export type FaceSign = 1 | -1;

export function flattenParts(cabinet: EvaluatedCabinet, {includeGlass=false}:{includeGlass?:boolean}={}) {
  const bores = cabinet.shaker?.bores??[...cabinet.cabineo.flatMap(joint => joint.bores), ...cabinet.backFasteners, ...cabinet.drilling];
  const drawerBoards=drawerBoardPanels(cabinet.drawers.drawers,cabinet.panels.find(p=>p.role==='bottom')!);
  const pockets=physicalPockets(cabinet);
  return [...physicalPanels(cabinet),...drawerBoards].filter(panel=>includeGlass||!(panel as ShakerPanel).glass).map(panel => {
    const [u, v] = faceAxes[panel.orientation];
    const normal = (3 - u - v) as 0 | 1 | 2;
    const cuts = pockets.filter(cut => cut.panelId === panel.id);
    const holes = bores.filter(bore => bore.panelId === panel.id);
    const faces = [...machiningFaces(panel, holes, cuts)] as FaceSign[];
    const preferred = preferredFace(panel, holes.filter(bore => bore.axis === normal));
    const face = faces.length === 1 ? faces[0] : preferred;
    return {
      id: panel.id, label: panel.label, panel,
      width: panel.coreSize[u], height: panel.coreSize[v], thickness: panel.coreSize[normal],
      material: material({id: panel.materialId, revision: panel.materialRevision}).name,
      stockKey: JSON.stringify([panel.materialId, panel.materialRevision, panel.finish.id, panel.finish.revision, panel.coreSize[normal]]),
      grain: panel.grain, u, v, normal, face, twoSided: faces.length > 1,
      edgeOperations: holes.filter(bore => bore.axis !== normal).length + cuts.filter(cut => cut.axis !== normal).length,
      holes, cuts,
    };
  });
}

export type FlatPart = ReturnType<typeof flattenParts>[number];

// The sign makes the flattening a proper rotation, including on the reverse face.
// Flat +X runs along U and flat +Z runs opposite V in the plan view.
export function acrossSign(panel: Panel, face: FaceSign): FaceSign {
  return (panel.orientation === 'xy' ? face : -face) as FaceSign;
}

export function flatPreview(part: FlatPart, face: FaceSign) {
  const core = {...part.panel, size: part.panel.coreSize, center: part.panel.coreCenter};
  return partPreview(core, part.holes, part.cuts.filter(cut => cut.axis === part.normal), face, acrossSign(part.panel, face) < 0);
}

export function groupPartsByStock(parts: readonly FlatPart[]) {
  const groups = new Map<string, FlatPart[]>();
  for (const part of parts) {
    const group = groups.get(part.stockKey);
    if (group) group.push(part);
    else groups.set(part.stockKey, [part]);
  }
  return groups;
}
