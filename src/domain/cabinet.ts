export type Axis = 'width' | 'height' | 'depth';
export type PanelRole = 'left' | 'right' | 'top' | 'bottom' | 'back' | 'shelf' | 'divider' | 'top-front-rail' | 'top-rear-rail' | 'back-upper-rail' | 'back-lower-rail' | 'plinth-front' | 'plinth-left' | 'plinth-right';
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
export type MaterialRole = 'carcass' | 'back' | 'interior' | 'plinth';
export type EdgeKey = 'u-min' | 'u-max' | 'v-min' | 'v-max';
export interface MaterialBinding { stock: ProductPin; finish: ProductPin; grain: 'none' | 'u' | 'v' }
export type MaterialBindings = { carcass: MaterialBinding; back: MaterialBinding; interior: MaterialBinding | null };
export type EdgeBanding = Record<string, Partial<Record<EdgeKey, ProductPin>>>;
export function defaultBinding(stock: ProductPin): MaterialBinding { return { stock, finish: { id: 'unspecified', revision: '1' }, grain: 'none' }; }
export interface Installation {
  type: 'unassigned' | 'floor' | 'feet-concept'; policyRevision: 'support-1';
  feet: { geometry: ProductPin; height: number; sideInset: number; frontInset: number; rearInset: number };
  plinth: { enabled: boolean; leftReturn: boolean; rightReturn: boolean; frontSetback: number; topGap: number; bottomGap: number; material: MaterialBinding | null };
}
export function defaultInstallation(): Installation {
  return { type: 'unassigned', policyRevision: 'support-1', feet: { geometry: { id: 'concept-foot-60', revision: '1' }, height: 100, sideInset: 60, frontInset: 120, rearInset: 60 },
    plinth: { enabled: false, leftReturn: false, rightReturn: false, frontSetback: 60, topGap: 5, bottomGap: 0, material: null } };
}
export interface Cabinet {
  id: string;
  name: string;
  envelope: { width: number; height: number; depth: number; origin: Vec3 };
  carcass: Carcass;
  compartments: Compartment;
  contents: never[];
  fronts: never[];
  installation: Installation;
  materials: MaterialBindings;
  banding: EdgeBanding;
  hardware: ProductPin[];
}
export function createCabinet(): Cabinet {
  const id = crypto.randomUUID();
  return {
    id, name: 'Untitled cabinet', envelope: { width: 600, height: 720, depth: 560, origin: [0, 0, 0] },
    carcass: defaultCarcass(),
    compartments: { id: `${id}/opening`, kind: 'opening', children: [] }, contents: [], fronts: [],
    installation: defaultInstallation(), materials: {
      carcass: defaultBinding({ id: 'generic-panel-18', revision: '1' }), back: defaultBinding({ id: 'generic-back-6', revision: '1' }), interior: null
    }, banding: {}, hardware: []
  };
}
export function resize(cabinet: Cabinet, axis: Axis, value: number): Cabinet {
  return { ...cabinet, envelope: { ...cabinet.envelope, [axis]: value } };
}
