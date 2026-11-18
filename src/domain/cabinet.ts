export type Axis = 'width' | 'height' | 'depth';
export type PanelRole = 'left' | 'right' | 'top' | 'bottom' | 'back';
export type Vec3 = [number, number, number];
export interface ProductPin { id: string; revision: string }
export interface Cabinet {
  id: string;
  name: string;
  envelope: { width: number; height: number; depth: number; origin: Vec3 };
  carcass: { construction: 'butt-full-top-inset-back'; policyRevision: 'concept-1' };
  compartments: { id: string; kind: 'opening'; children: never[] };
  contents: never[];
  fronts: never[];
  installation: { type: 'unassigned' };
  materials: { carcass: ProductPin; back: ProductPin };
  hardware: ProductPin[];
}
export function createCabinet(): Cabinet {
  const id = crypto.randomUUID();
  return {
    id, name: 'Untitled cabinet', envelope: { width: 600, height: 720, depth: 560, origin: [0, 0, 0] },
    carcass: { construction: 'butt-full-top-inset-back', policyRevision: 'concept-1' },
    compartments: { id: `${id}/opening`, kind: 'opening', children: [] }, contents: [], fronts: [],
    installation: { type: 'unassigned' }, materials: {
      carcass: { id: 'generic-panel-18', revision: '1' }, back: { id: 'generic-back-6', revision: '1' }
    }, hardware: []
  };
}
export function resize(cabinet: Cabinet, axis: Axis, value: number): Cabinet {
  return { ...cabinet, envelope: { ...cabinet.envelope, [axis]: value } };
}
