export type Axis = 'width' | 'height' | 'depth';
export type PanelRole = 'left' | 'right' | 'top' | 'bottom' | 'back' | 'shelf' | 'divider' | 'top-front-rail' | 'top-rear-rail' | 'back-upper-rail' | 'back-lower-rail';
export interface Carcass {
  construction: 'rectangular-butt'; policyRevision: 'construction-1';
  top: { mode: 'full' | 'rails'; frontDepth: number; rearDepth: number };
  back: { mode: 'full' | 'rails'; upperHeight: number; lowerHeight: number };
}
export function defaultCarcass(): Carcass {
  return { construction: 'rectangular-butt', policyRevision: 'construction-1',
    top: { mode: 'full', frontDepth: 80, rearDepth: 80 }, back: { mode: 'full', upperHeight: 80, lowerHeight: 80 } };
}
export type DivisionAxis = 'horizontal' | 'vertical';
export interface OpeningNode { id: string; kind: 'opening'; children: [] }
export interface SplitNode { id: string; kind: 'split'; featureId: string; axis: DivisionAxis; position: number; policyRevision: 'fixed-1'; children: [Compartment, Compartment] }
export type Compartment = OpeningNode | SplitNode;
export type Vec3 = [number, number, number];
export interface ProductPin { id: string; revision: string }
export interface Cabinet {
  id: string;
  name: string;
  envelope: { width: number; height: number; depth: number; origin: Vec3 };
  carcass: Carcass;
  compartments: Compartment;
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
    carcass: defaultCarcass(),
    compartments: { id: `${id}/opening`, kind: 'opening', children: [] }, contents: [], fronts: [],
    installation: { type: 'unassigned' }, materials: {
      carcass: { id: 'generic-panel-18', revision: '1' }, back: { id: 'generic-back-6', revision: '1' }
    }, hardware: []
  };
}
export function resize(cabinet: Cabinet, axis: Axis, value: number): Cabinet {
  return { ...cabinet, envelope: { ...cabinet.envelope, [axis]: value } };
}
