export interface CustomHingeSpec {article:string;plate:string;cupDiameter:number;cupDepth:number;screwPitch:number;screwOffset:number;plateLine:number;platePitch:number;doorPilotDiameter:number;doorPilotDepth:number;platePilotDiameter:number;platePilotDepth:number;maxAngle:number;mountingReach:number;mountingHeight:number;mountingDepth:number;openProtrusion:number;openingAdvance:number}
export interface CncSettings {revision:'cnc-1';pilotDiameter?:number;tolerance:number;bitDiameter:number;dogbones:boolean;throughOpposed:boolean;cabineoPerSide:number;partCabineoCounts?:Record<string,number>;shelfRowInsets?:{front:number;rear:number};rearChamfers?:Record<string,{low?:number;high?:number}>;bottomFace?:'inside'|'outside';bottomFastenersThrough?:boolean;throughHoles?:Record<string,'fasteners'|'adjustment'>}
export type Axis = 'width' | 'height' | 'depth';
export type PanelRole = 'left' | 'right' | 'top' | 'bottom' | 'back' | 'shelf' | 'divider' | 'top-front-rail' | 'top-rear-rail' | 'back-upper-rail' | 'back-lower-rail' | 'front-upper-rail' | 'front-lower-rail' | 'plinth-front' | 'plinth-left' | 'plinth-right' | 'door' | 'corner-filler';
export interface Carcass {
  machining?:CncSettings;
  corner?:{mode:'puzzle';revision:'puzzle-1';pitch:number};
  frontRails?:{revision:'front-rail-1';top:{enabled:boolean;width:number};bottom:{enabled:boolean;width:number}};
  construction: 'rectangular-butt'; policyRevision: 'construction-1';
  top: { mode: 'full' | 'rails' | 'open'; frontDepth: number; rearDepth: number };
  back: { mode: 'full' | 'rails' | 'open' | 'rails-panel'; upperHeight: number; lowerHeight: number; joint?: {revision:'back-1';mode:'inset'|'applied'|'groove'|'rebate'|'finger'|'rail-screws';inset:number;depth:number;clearance:number;fingerPitch?:number;pilots?:{revision:'back-pilot-1';spacing:number;diameter:number};fastener?:{id:'hafele-26009765';revision:'rpc-1';perSide:number; offset?:number}} };
}
export function defaultCarcass(): Carcass {
  return { construction: 'rectangular-butt', policyRevision: 'construction-1',
    top: { mode: 'full', frontDepth: 80, rearDepth: 80 }, back: { mode: 'full', upperHeight: 80, lowerHeight: 80 } };
}
export type DivisionAxis = 'horizontal' | 'vertical';
export interface OpeningNode { id: string; kind: 'opening'; children: [] }
export interface SplitNode {joint?:{mode:'finger';revision:'finger-1';pitch:number}; id: string; kind: 'split'; featureId: string; axis: DivisionAxis; position: number; policyRevision: 'fixed-1' | 'fixed-2';  frontSetback?: number; anchor?: 'centre'; children: [Compartment, Compartment] }
export type Compartment = OpeningNode | SplitNode;
export type Vec3 = [number, number, number];
export interface ProductPin { id: string; revision: string }
export type MaterialRole = 'carcass' | 'back' | 'interior' | 'plinth' | 'front';
export type EdgeKey = 'u-min' | 'u-max' | 'v-min' | 'v-max';
export interface MaterialBinding { stock: ProductPin; finish: ProductPin; grain: 'none' | 'u' | 'v' }
export type MaterialBindings = { carcass: MaterialBinding; back: MaterialBinding; interior: MaterialBinding | null };
export type EdgeBanding = Record<string, Partial<Record<EdgeKey, ProductPin>>>;
export function defaultBinding(stock: ProductPin): MaterialBinding { return { stock, finish: { id: 'unspecified', revision: '1' }, grain: 'none' }; }
export interface Mounting {
  mode: 'none' | 'restraint-concept' | 'suspended-concept'; policyRevision: 'mounting-1'; geometry: ProductPin;
  sideNotch?:number;wallGap: number; topOffset: number; sideInset: number; floorClearance: number;
}
export function defaultMounting(): Mounting {
  return { mode: 'none', policyRevision: 'mounting-1', geometry: { id: 'concept-wall-layout', revision: '1' }, wallGap: 30, topOffset: 60, sideInset: 60, floorClearance: 300 };
}
export interface Installation {
  type: 'unassigned' | 'floor' | 'feet-concept'; policyRevision: 'support-1';
  mounting: Mounting;
  feet: { layout?:'four'|'front-pair'; drilling?:{revision:'foot-pilot-1';pattern:'single'|'pair'|'triangle'|'rectangle';pitchX:number;pitchZ:number;diameter:number;depth:number;through:boolean}; geometry: ProductPin; height: number; sideInset: number; frontInset: number; rearInset: number };
  plinth: { footGap?:number; enabled: boolean; leftReturn: boolean; rightReturn: boolean; frontSetback: number; topGap: number; bottomGap: number; material: MaterialBinding | null };
}
export function defaultInstallation(): Installation {
  return { type: 'unassigned', policyRevision: 'support-1', mounting: defaultMounting(), feet: { geometry: { id: 'concept-foot-60', revision: '1' }, height: 100, sideInset: 60, frontInset: 120, rearInset: 60 },
    plinth: { enabled: false, leftReturn: false, rightReturn: false, frontSetback: 60, topGap: 5, bottomGap: 0, material: null } };
}
export interface AdjustableShelf {
  drilling?:{revision:'shelf-holes-1';count:number;firstLevel:number;anchor?:'centre'|'height';center?:number};
  id: string; kind: 'adjustable-shelf'; openingId: string; level: number; frontSetback: number;
  policyRevision: 'adjustable-1'; support: ProductPin;
}
export interface ShakerSettings {frameWidth:number;recessDepth:number;panelThickness:number;infill:'wood'|'glass'}
export interface SlabDoor {
  style?:'slab'|'shaker-routed'|'shaker-routed-panel'|'shaker-frame';shaker?:ShakerSettings;
  id: string; kind: 'slab-door'; policyRevision: 'slab-1';
  region: { left: number; right: number; bottom: number; top: number };
  boundaryLinks?: Partial<Record<'left'|'right'|'bottom'|'top',string>>;
  placement: 'overlay' | 'inset'; handing: 'left' | 'right'; reveal: number; clearance: number;
  material: MaterialBinding | null;
  handle: { geometry: ProductPin; kind: 'none' | 'knob' | 'pull' | 'hole' | 'notch'; pitch: number; orientation: 'vertical' | 'horizontal'; edgeOffset: number; height: 'top' | 'centre' | 'bottom'; endOffset: number; horizontal?: 'latch'|'left'|'centre'|'right'; diameter?: number; projection?: number; drillDiameter?: number;notchWidth?:number;notchDepth?:number;cornerDiameter?:number;outsideRadius?:number;notchEdge?:'left'|'right'|'top'|'bottom' };
  cornerRadius?:number;
  hinge?: {id:'blum-clip-110'|'blum-clip-155'|'blum-thin-110'|'hafele-metalla-155'|'hafele-metalla-155-d4'|'hafele-metalla-110'|'custom-hinge'; custom?:CustomHingeSpec; revision:'blum-1'|'metalla-1'|'custom-1'; count:number; endOffset:number; cupDistance:number;offsets?:number[]};
}
export interface MetalDrawer {
  id:string; kind:'metal-drawer'; policyRevision:'antaro-external-1'; pack:ProductPin;
  openingId:string; offset:number; frontHeight:number;
  cornerRadius?:number;
  manualRail?:boolean;
  internal?:{revision:'antaro-inner-1'|'merivobox-inner-1';setback:number};
  handle?:SlabDoor['handle'];
  stack?:{groupId:string;order:number;height:number};
  front?:{placement:'inset'|'overlay';gap:number;clearance:number;left:number;right:number;top:number;bottom:number};
}
export interface Cabinet {
  frontDefaults?:{edgeGap:number;frontGap:number;cornerRadius:number};
  cabinetType?:'open'|'base'|'wall'|'tall'|'corner';
  names?:Record<string,string>;
  id: string;
  name: string;
  envelope: { width: number; height: number; depth: number; origin: Vec3 };
  carcass: Carcass;
  compartments: Compartment;
  contents: AdjustableShelf[];
  fronts: SlabDoor[];
  drawers?: MetalDrawer[];
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
