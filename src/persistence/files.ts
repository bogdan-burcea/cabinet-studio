import {validHardware} from '../catalogue/cabineo';
import { defaultBinding, defaultCarcass, defaultInstallation, defaultMounting, type Cabinet, type Compartment } from '../domain/cabinet';
import { evaluate, EVALUATOR_REVISION } from '../geometry/evaluate';
export const AUTOSAVE_KEY = 'cabinet-studio.autosave.v17';
export const LEGACY_AUTOSAVE_KEY = 'cabinet-studio.autosave.v1';
export const PREVIOUS_AUTOSAVE_KEYS = ['cabinet-studio.autosave.v16', 'cabinet-studio.autosave.v15', 'cabinet-studio.autosave.v14', 'cabinet-studio.autosave.v13', 'cabinet-studio.autosave.v12', 'cabinet-studio.autosave.v11', 'cabinet-studio.autosave.v10', 'cabinet-studio.autosave.v9', 'cabinet-studio.autosave.v8', 'cabinet-studio.autosave.v7', 'cabinet-studio.autosave.v6', 'cabinet-studio.autosave.v5', 'cabinet-studio.autosave.v4', 'cabinet-studio.autosave.v3', 'cabinet-studio.autosave.v2', 'cabinet-studio.autosave.v1'] as const;
export function serialize(cabinet: Cabinet): string {
  evaluate(cabinet);
  return JSON.stringify({ format: 'cabinet-studio', schemaVersion: 17, evaluatorRevision: EVALUATOR_REVISION, cabinet }, null, 2);
}
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: string[]) { return object(value) && Object.keys(value).length === keys.length && keys.every(k => k in value); }
function pin(value: any) { return exact(value, ['id', 'revision']) && typeof value.id === 'string' && typeof value.revision === 'string'; }
function identity(value: unknown) { return typeof value === 'string' && !!value.trim() && value.length <= 128 && !['__proto__', 'constructor', 'prototype'].includes(value); }
function validTree(value: any, reserved: Set<string>, stage1: boolean, setbacks = false, constraints = false, fingers=false, depth = 0, count = { nodes: 0 }): value is Compartment {
  if (!object(value) || depth > 32 || ++count.nodes > 127 || !identity(value.id) || reserved.has(value.id)) return false;
  reserved.add(value.id);
  if (value.kind === 'opening') return exact(value, ['id', 'kind', 'children']) && Array.isArray(value.children) && value.children.length === 0;
  if (stage1 || value.kind !== 'split' || !exact(value, ['id', 'kind', 'featureId', 'axis', 'position', 'policyRevision', 'children', ...(setbacks&&Object.hasOwn(value,'frontSetback')?['frontSetback']:[]),...(constraints&&Object.hasOwn(value,'anchor')?['anchor']:[]),...(fingers&&Object.hasOwn(value,'joint')?['joint']:[])]) ||
    !identity(value.featureId) || reserved.has(value.featureId) || !['horizontal', 'vertical'].includes(value.axis) || !(value.policyRevision === 'fixed-1' || (setbacks && value.policyRevision === 'fixed-2' && Object.hasOwn(value,'frontSetback') && typeof value.frontSetback==='number')) ||
    (Object.hasOwn(value,'joint')&&(!fingers||!exact(value.joint,['mode','revision','pitch'])||value.joint.mode!=='finger'||value.joint.revision!=='finger-1'||typeof value.joint.pitch!=='number')) ||
    (Object.hasOwn(value,'anchor')&&value.anchor!=='centre') || typeof value.position !== 'number' || !Number.isFinite(value.position) || !Array.isArray(value.children) || value.children.length !== 2) return false;
  reserved.add(value.featureId);
  return value.children.every((child: unknown) => validTree(child, reserved, stage1, setbacks, constraints, fingers, depth + 1, count));
}
function reservedIdentities(cabinetId: string): string[] { return [cabinetId, ...['left', 'right', 'top', 'bottom', 'back', 'top-front-rail', 'top-rear-rail', 'back-upper-rail', 'back-lower-rail', 'plinth-front', 'plinth-left', 'plinth-right'].map(role => `${cabinetId}/panel/${role}`), `${cabinetId}/construction/top`, `${cabinetId}/construction/back`, `${cabinetId}/installation/feet`, `${cabinetId}/installation/plinth`, ...['', '/rail', '/left', '/right'].map(suffix => `${cabinetId}/installation/mounting${suffix}`), ...['front-left', 'front-right', 'rear-left', 'rear-right'].flatMap(name => ['', '/plate', '/post', '/base'].map(suffix => `${cabinetId}/installation/foot/${name}${suffix}`))]; }
function contentIdentities(contents: any, cabinetId: string): string[] {
  if (!Array.isArray(contents) || contents.length > 63) throw new Error('Invalid adjustable shelf contents.');
  const ids = new Set<string>(), reserved = new Set(reservedIdentities(cabinetId));
  for (const shelf of contents) {
    if (!exact(shelf, ['id','kind','openingId','level','frontSetback','policyRevision','support']) || !identity(shelf.id) || reserved.has(shelf.id) || !identity(shelf.openingId) || shelf.kind !== 'adjustable-shelf' || shelf.policyRevision !== 'adjustable-1' || !Number.isInteger(shelf.level) || typeof shelf.frontSetback !== 'number' || !pin(shelf.support)) throw new Error('Invalid adjustable shelf data.');
    for (const id of [shelf.id, ...['front-left','front-right','rear-left','rear-right'].map(side => `${shelf.id}/support/${side}`)]) { if (ids.has(id) || reserved.has(id)) throw new Error('Duplicate shelf/support identity.'); ids.add(id); }
  }
  return [...ids];
}
function frontIdentities(fronts:any,cabinetId:string,contentIds:string[],constraints=false):string[] {
  if(!Array.isArray(fronts)||fronts.length>32)throw new Error('Invalid slab front layout.');
  const used=new Set([...reservedIdentities(cabinetId),...contentIds]),ids:string[]=[];
  for(const door of fronts){
    if(Object.hasOwn(door,'boundaryLinks')&&(!constraints||!object(door.boundaryLinks)||!Object.entries(door.boundaryLinks).every(([key,id])=>['left','right','bottom','top'].includes(key)&&identity(id))))throw new Error('Invalid door boundary links.');
    if(!exact(door,['id','kind','policyRevision','region','placement','handing','reveal','clearance','material','handle',...(constraints&&Object.hasOwn(door,'boundaryLinks')?['boundaryLinks']:[])])||!identity(door.id)||door.kind!=='slab-door'||door.policyRevision!=='slab-1'||!exact(door.region,['left','right','bottom','top'])||!Object.values(door.region).every(v=>typeof v==='number')||!['overlay','inset'].includes(door.placement)||!['left','right'].includes(door.handing)||typeof door.reveal!=='number'||typeof door.clearance!=='number'||!(door.material===null||validBinding(door.material))||!exact(door.handle,['geometry','kind','pitch','orientation','edgeOffset','height','endOffset'])||!pin(door.handle.geometry)||![door.handle.pitch,door.handle.edgeOffset,door.handle.endOffset].every(v=>typeof v==='number'))throw new Error('Invalid slab door or handle data.');
    for(const id of [door.id,...['bar','post-1','post-2','knob'].map(key=>`${door.id}/handle/${key}`)]){if(used.has(id))throw new Error('Duplicate front or handle identity.');used.add(id);ids.push(id);}
  }
  return ids;
}
function validCarcass(value:any,seating=false,fixings=false,corners=false,machining=false):boolean{
 if(!object(value)||!exact(value,['construction','policyRevision','top','back',...(corners&&Object.hasOwn(value,'corner')?['corner']:[]),...(machining&&Object.hasOwn(value,'machining')?['machining']:[])]))return false;
 if(Object.hasOwn(value,'corner')&&(!corners||!exact(value.corner,['mode','revision','pitch'])||value.corner.mode!=='puzzle'||value.corner.revision!=='puzzle-1'||typeof value.corner.pitch!=='number'))return false;
 if(Object.hasOwn(value,'machining')){const m=value.machining;if(!machining||!exact(m,['revision','tolerance','bitDiameter','dogbones','throughOpposed','cabineoPerSide'])||m.revision!=='cnc-1'||typeof m.dogbones!=='boolean'||typeof m.throughOpposed!=='boolean'||![m.tolerance,m.bitDiameter,m.cabineoPerSide].every(n=>typeof n==='number'&&Number.isFinite(n)))return false;}
 if(!exact(value.top,['mode','frontDepth','rearDepth'])||!object(value.back)||!exact(value.back,['mode','upperHeight','lowerHeight',...(seating&&Object.hasOwn(value.back,'joint')?['joint']:[])]))return false;
 if(Object.hasOwn(value.back,'joint')){const j=value.back.joint;if(!seating||!exact(j,['revision','mode','inset','depth','clearance',...(fixings&&Object.hasOwn(j,'fastener')?['fastener']:[])])||j.revision!=='back-1'||!['inset','applied','groove','rebate'].includes(j.mode)||![j.inset,j.depth,j.clearance].every(n=>typeof n==='number'&&Number.isFinite(n)))return false;
  if(Object.hasOwn(j,'fastener')&&(!fixings||!exact(j.fastener,['id','revision','perSide'])||j.fastener.id!=='hafele-26009765'||j.fastener.revision!=='rpc-1'||!Number.isInteger(j.fastener.perSide)))return false;
 }
 return value.construction==='rectangular-butt'&&value.policyRevision==='construction-1'&&['full','rails'].includes(value.top.mode)&&['full','rails'].includes(value.back.mode)&&[value.top.frontDepth,value.top.rearDepth,value.back.upperHeight,value.back.lowerHeight].every(n=>typeof n==='number'&&Number.isFinite(n));
}
function validBinding(value: any): boolean { return exact(value, ['stock', 'finish', 'grain']) && pin(value.stock) && pin(value.finish) && ['none', 'u', 'v'].includes(value.grain); }
function validBanding(value: any): boolean {
  return object(value) && Object.keys(value).length <= 170 && Object.entries(value).every(([id, edges]) => identity(id) && object(edges) && Object.keys(edges).length > 0 && Object.entries(edges).every(([key, product]) => ['u-min', 'u-max', 'v-min', 'v-max'].includes(key) && pin(product)));
}
function validMounting(value: any): boolean {
  return exact(value, ['mode', 'policyRevision', 'geometry', 'wallGap', 'topOffset', 'sideInset', 'floorClearance']) &&
    ['none', 'restraint-concept', 'suspended-concept'].includes(value.mode) && value.policyRevision === 'mounting-1' && pin(value.geometry) &&
    [value.wallGap, value.topOffset, value.sideInset, value.floorClearance].every(n => typeof n === 'number' && Number.isFinite(n));
}
function validInstallation(value: any, previous = false): boolean {
  return exact(value, ['type', 'policyRevision', 'feet', 'plinth', ...previous ? [] : ['mounting']]) && (previous || validMounting(value.mounting)) && ['unassigned', 'floor', 'feet-concept'].includes(value.type) && value.policyRevision === 'support-1' &&
    exact(value.feet, ['geometry', 'height', 'sideInset', 'frontInset', 'rearInset']) && pin(value.feet.geometry) &&
    [value.feet.height, value.feet.sideInset, value.feet.frontInset, value.feet.rearInset].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    exact(value.plinth, ['enabled', 'leftReturn', 'rightReturn', 'frontSetback', 'topGap', 'bottomGap', 'material']) &&
    [value.plinth.enabled, value.plinth.leftReturn, value.plinth.rightReturn].every(flag => typeof flag === 'boolean') &&
    [value.plinth.frontSetback, value.plinth.topGap, value.plinth.bottomGap].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    (value.plinth.material === null || validBinding(value.plinth.material));
}
export function deserializeWithInfo(text: string): { cabinet: Cabinet; migrated: boolean } {
  const doc = JSON.parse(text);
  const revisions: Record<number, string> = { 1: 'carcass-1', 2: 'interiors-2', 3: 'construction-3', 4: 'materials-4', 5: 'installation-5', 6: 'mounting-6', 7: 'interiors-7', 8: 'fronts-8', 9: 'workspace-9', 10: 'doors-10', 11: 'constraints-11', 12: 'drawers-12', 13: 'joinery-13', 14: 'back-14', 15: 'back-fixings-15', 16: 'machining-16', 17: EVALUATOR_REVISION };
  if (!object(doc) || doc.format !== 'cabinet-studio' || !Number.isInteger(doc.schemaVersion) || !Object.hasOwn(revisions, doc.schemaVersion) || doc.evaluatorRevision !== revisions[doc.schemaVersion])
    throw new Error('Unsupported cabinet format or revision. Your current cabinet and original file are unchanged.');
  const legacy = doc.schemaVersion < 4, oldConstruction = doc.schemaVersion < 3, c = doc.cabinet;
  const contentIds = doc.schemaVersion >= 7 ? contentIdentities(c?.contents, c?.id) : [];
  const frontIds = doc.schemaVersion >= 8 ? frontIdentities(c?.fronts,c?.id,contentIds,doc.schemaVersion>=11) : [];
  const drawerIds:string[]=[];
  if(doc.schemaVersion>=12&&Object.hasOwn(c,'drawers')){
    if(!Array.isArray(c.drawers)||c.drawers.length>32)throw new Error('Invalid metal drawer list.');
    const used=new Set([...reservedIdentities(c.id),...contentIds,...frontIds]);
    for(const d of c.drawers){
      if(!exact(d,['id','kind','policyRevision','pack','openingId','offset','frontHeight'])||!identity(d.id)||!identity(d.openingId)||d.kind!=='metal-drawer'||d.policyRevision!=='antaro-external-1'||!pin(d.pack)||![d.offset,d.frontHeight].every(v=>typeof v==='number'&&Number.isFinite(v)))throw new Error('Invalid metal drawer intent.');
      for(const key of ['', '/bottom','/back','/front','/side-left','/side-right','/runner-left','/runner-right','/back-fixing-left','/back-fixing-right','/front-fixing-left','/front-fixing-right']){const id=d.id+key;if(used.has(id))throw new Error('Duplicate drawer identity.');used.add(id);drawerIds.push(id);}
    }
  }
  const keys = ['id', 'name', 'envelope', 'carcass', 'compartments', 'contents', 'fronts', 'installation', 'materials', 'hardware', ...(doc.schemaVersion>=12 && Object.hasOwn(c,'drawers')?['drawers']:[]), ...legacy ? [] : ['banding']];
  if (!exact(c, keys) || !identity(c.id) || typeof c.name !== 'string' || c.name.length > 100 || !exact(c.envelope, ['width', 'height', 'depth', 'origin']) ||
    !Array.isArray(c.envelope.origin) || c.envelope.origin.length !== 3 || !c.envelope.origin.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
    !(oldConstruction ? exact(c.carcass, ['construction', 'policyRevision']) && c.carcass.construction === 'butt-full-top-inset-back' && c.carcass.policyRevision === 'concept-1' : validCarcass(c.carcass,doc.schemaVersion>=14,doc.schemaVersion>=15,doc.schemaVersion>=16,doc.schemaVersion>=17)) ||
    !validTree(c.compartments, new Set([...reservedIdentities(c.id), ...contentIds, ...frontIds, ...drawerIds]), doc.schemaVersion === 1, doc.schemaVersion >= 9, doc.schemaVersion >= 11,doc.schemaVersion>=17) ||
    !Array.isArray(c.contents) || (doc.schemaVersion < 7 && c.contents.length > 0) || !Array.isArray(c.fronts) || (doc.schemaVersion < 8 && c.fronts.length > 0) || !(doc.schemaVersion < 5 ? exact(c.installation, ['type']) && c.installation.type === 'unassigned' : validInstallation(c.installation, doc.schemaVersion === 5)) ||
    !(legacy ? exact(c.materials, ['carcass', 'back']) && pin(c.materials.carcass) && pin(c.materials.back) && c.materials.carcass.id === 'generic-panel-18' && c.materials.back.id === 'generic-back-6' :
      exact(c.materials, ['carcass', 'back', 'interior']) && validBinding(c.materials.carcass) && validBinding(c.materials.back) && (c.materials.interior === null || validBinding(c.materials.interior)) && validBanding(c.banding)) ||
    !validHardware(c.hardware) || (doc.schemaVersion<13&&c.hardware.length))
    throw new Error('This cabinet contains invalid or unsupported data. Your current cabinet is unchanged.');
  const result = structuredClone(c) as Cabinet;
  if (doc.schemaVersion < 5) result.installation = defaultInstallation();
  if (doc.schemaVersion === 5) result.installation.mounting = defaultMounting();
  if (oldConstruction) result.carcass = defaultCarcass();
  if (legacy) { result.materials = { carcass: defaultBinding(c.materials.carcass), back: defaultBinding(c.materials.back), interior: null }; result.banding = {}; }
  evaluate(result);
  return { cabinet: result, migrated: doc.schemaVersion < 17 };
}
export function deserialize(text: string): Cabinet { return deserializeWithInfo(text).cabinet; }
export function downloadCabinet(cabinet: Cabinet) {
  const url = URL.createObjectURL(new Blob([serialize(cabinet)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${cabinet.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'cabinet'}.cabinet.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
