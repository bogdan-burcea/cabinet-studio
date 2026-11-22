import {stock} from '../catalogue/materials';
import {usesBlumWallHanger} from '../rules/wall-hanging';
import {setWallHanging} from '../commands/wall-hanging';
import {clearInsetInteriors} from '../commands/corrections';
import {validHardware} from '../catalogue/cabineo';
import { defaultBinding, defaultCarcass, defaultInstallation, defaultMounting, type Cabinet, type Compartment } from '../domain/cabinet';
import { evaluate, EVALUATOR_REVISION } from '../geometry/evaluate';
export const AUTOSAVE_KEY = 'cabinet-studio.autosave.v56';
export const LEGACY_AUTOSAVE_KEY = 'cabinet-studio.autosave.v1';
export const PREVIOUS_AUTOSAVE_KEYS = ['cabinet-studio.autosave.v55', 'cabinet-studio.autosave.v54', 'cabinet-studio.autosave.v53', 'cabinet-studio.autosave.v52', 'cabinet-studio.autosave.v51', 'cabinet-studio.autosave.v50', 'cabinet-studio.autosave.v49', 'cabinet-studio.autosave.v48', 'cabinet-studio.autosave.v47', 'cabinet-studio.autosave.v46', 'cabinet-studio.autosave.v45', 'cabinet-studio.autosave.v44', 'cabinet-studio.autosave.v43', 'cabinet-studio.autosave.v42', 'cabinet-studio.autosave.v41', 'cabinet-studio.autosave.v40', 'cabinet-studio.autosave.v39', 'cabinet-studio.autosave.v38', 'cabinet-studio.autosave.v37', 'cabinet-studio.autosave.v36', 'cabinet-studio.autosave.v35', 'cabinet-studio.autosave.v34', 'cabinet-studio.autosave.v33', 'cabinet-studio.autosave.v32', 'cabinet-studio.autosave.v31', 'cabinet-studio.autosave.v30', 'cabinet-studio.autosave.v29', 'cabinet-studio.autosave.v28', 'cabinet-studio.autosave.v27', 'cabinet-studio.autosave.v26', 'cabinet-studio.autosave.v25', 'cabinet-studio.autosave.v24', 'cabinet-studio.autosave.v23', 'cabinet-studio.autosave.v22', 'cabinet-studio.autosave.v21', 'cabinet-studio.autosave.v20', 'cabinet-studio.autosave.v19', 'cabinet-studio.autosave.v18', 'cabinet-studio.autosave.v17', 'cabinet-studio.autosave.v16', 'cabinet-studio.autosave.v15', 'cabinet-studio.autosave.v14', 'cabinet-studio.autosave.v13', 'cabinet-studio.autosave.v12', 'cabinet-studio.autosave.v11', 'cabinet-studio.autosave.v10', 'cabinet-studio.autosave.v9', 'cabinet-studio.autosave.v8', 'cabinet-studio.autosave.v7', 'cabinet-studio.autosave.v6', 'cabinet-studio.autosave.v5', 'cabinet-studio.autosave.v4', 'cabinet-studio.autosave.v3', 'cabinet-studio.autosave.v2', 'cabinet-studio.autosave.v1'] as const;
export function serialize(cabinet: Cabinet): string {
  evaluate(cabinet);
  return JSON.stringify({ format: 'cabinet-studio', schemaVersion: 56, evaluatorRevision: EVALUATOR_REVISION, cabinet }, null, 2);
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
function reservedIdentities(cabinetId: string): string[] { return [cabinetId, ...['left', 'right', 'top', 'bottom', 'back', 'top-front-rail', 'top-rear-rail', 'back-upper-rail', 'back-lower-rail', 'front-upper-rail', 'front-lower-rail', 'plinth-front', 'plinth-left', 'plinth-right'].map(role => `${cabinetId}/panel/${role}`), `${cabinetId}/construction/top`, `${cabinetId}/construction/back`, `${cabinetId}/installation/feet`, `${cabinetId}/installation/plinth`, ...['', '/rail', '/left', '/right'].map(suffix => `${cabinetId}/installation/mounting${suffix}`), ...['front-left', 'front-right', 'rear-left', 'rear-right'].flatMap(name => ['', '/plate', '/post', '/base'].map(suffix => `${cabinetId}/installation/foot/${name}${suffix}`))]; }
function contentIdentities(contents: any, cabinetId: string, drilling=false, patterns=false,legacyOffsets=false): string[] {
  if (!Array.isArray(contents) || contents.length > 63) throw new Error('Invalid adjustable shelf contents.');
  const ids = new Set<string>(), reserved = new Set(reservedIdentities(cabinetId));
  for (const shelf of contents) {
    if (!exact(shelf, ['id','kind','openingId','level','frontSetback','policyRevision','support',...(drilling&&Object.hasOwn(shelf,'drilling')?['drilling']:[])]) || !identity(shelf.id) || reserved.has(shelf.id) || !identity(shelf.openingId) || shelf.kind !== 'adjustable-shelf' || shelf.policyRevision !== 'adjustable-1' || !Number.isInteger(shelf.level) || typeof shelf.frontSetback !== 'number' || !pin(shelf.support)) throw new Error('Invalid adjustable shelf data.');
    if(Object.hasOwn(shelf,'drilling')&&(!drilling||!exact(shelf.drilling,['revision','count','firstLevel',...['anchor','center',...(legacyOffsets?['opposed','frontInset','rearInset']:[])].filter(k=>patterns&&Object.hasOwn(shelf.drilling,k))])||shelf.drilling.revision!=='shelf-holes-1'||!Number.isInteger(shelf.drilling.count)||shelf.drilling.count<1||!Number.isInteger(shelf.drilling.firstLevel)||shelf.drilling.firstLevel<0))throw new Error('Invalid shelf drilling pattern.');
    const d=shelf.drilling;if(d&&(d.anchor!==undefined&&!['centre','height'].includes(d.anchor)||d.anchor==='height'&&d.center===undefined||d.opposed!==undefined&&!['through','offset'].includes(d.opposed)||['center','frontInset','rearInset'].some(k=>d[k]!==undefined&&(typeof d[k]!=='number'||!Number.isFinite(d[k])))))throw new Error('Invalid shelf hole positioning or opposing layout.');
    for (const id of [shelf.id, ...['front-left','front-right','rear-left','rear-right'].map(side => `${shelf.id}/support/${side}`)]) { if (ids.has(id) || reserved.has(id)) throw new Error('Duplicate shelf/support identity.'); ids.add(id); }
  }
  return [...ids];
}
function frontIdentities(fronts:any,cabinetId:string,contentIds:string[],constraints=false,hardware=false,fixedHinge=false,supports=false,profiles=false,outer=false):string[] {
  if(!Array.isArray(fronts)||fronts.length>32)throw new Error('Invalid slab front layout.');
  const used=new Set([...reservedIdentities(cabinetId),...contentIds]),ids:string[]=[];
  for(const door of fronts){
    if(Object.hasOwn(door,'boundaryLinks')&&(!constraints||!object(door.boundaryLinks)||!Object.entries(door.boundaryLinks).every(([key,id])=>['left','right','bottom','top'].includes(key)&&identity(id))))throw new Error('Invalid door boundary links.');
    if(!exact(door,['id','kind','policyRevision','region','placement','handing','reveal','clearance','material','handle',...(constraints&&Object.hasOwn(door,'boundaryLinks')?['boundaryLinks']:[]),...(hardware&&Object.hasOwn(door,'hinge')?['hinge']:[]),...(profiles&&Object.hasOwn(door,'cornerRadius')?['cornerRadius']:[])])||!identity(door.id)||door.kind!=='slab-door'||door.policyRevision!=='slab-1'||!exact(door.region,['left','right','bottom','top'])||!Object.values(door.region).every(v=>typeof v==='number')||!['overlay','inset'].includes(door.placement)||!['left','right'].includes(door.handing)||typeof door.reveal!=='number'||typeof door.clearance!=='number'||!(door.material===null||validBinding(door.material))||!exact(door.handle,['geometry','kind','pitch','orientation','edgeOffset','height','endOffset',...['horizontal','diameter','projection','drillDiameter',...profiles?['notchWidth','notchDepth','cornerDiameter','notchEdge',...outer?['outsideRadius']:[]]:[]].filter(k=>hardware&&Object.hasOwn(door.handle,k))])||!pin(door.handle.geometry)||![door.handle.pitch,door.handle.edgeOffset,door.handle.endOffset].every(v=>typeof v==='number'))throw new Error('Invalid slab door or handle data.');
    if(!profiles&&door.handle.kind==='notch')throw Error('Side notches require the current native format.');
    if(!hardware&&door.handle.kind==='hole')throw Error('Finger holes require the current native format.');
    if(door.hinge&&Object.hasOwn(door.hinge,'offsets')&&(!supports||!Array.isArray(door.hinge.offsets)||door.hinge.offsets.length!==door.hinge.count||!door.hinge.offsets.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n))))throw Error('Invalid hinge offsets.');
    if(door.hinge&&!fixedHinge&&typeof door.hinge.softClose!=='boolean')throw Error('Invalid legacy hinge soft-close value.');
    if(door.hinge&&(!hardware||!exact(door.hinge,['id','revision','count','endOffset','cupDistance',...(fixedHinge?[]:['softClose']),...(supports&&Object.hasOwn(door.hinge,'offsets')?['offsets']:[])])))throw Error('Invalid hinge data.');
    for(const id of [door.id,...['bar','post-1','post-2','knob'].map(key=>`${door.id}/handle/${key}`)]){if(used.has(id))throw new Error('Duplicate front or handle identity.');used.add(id);ids.push(id);}
  }
  return ids;
}
function validCarcass(value:any,seating=false,fixings=false,corners=false,machining=false,drilling=false,autoPilots=false,adjustableFixings=false,supports=false,throughRepairs=false,wallClearance=false,assemblyHardware=false,editablePilots=false,openConstruction=false,hybrid=false,railPosition=false,flushRails=false):boolean{
 if(!object(value)||!exact(value,['construction','policyRevision','top','back',...(openConstruction&&Object.hasOwn(value,'frontRails')?['frontRails']:[]),...(corners&&Object.hasOwn(value,'corner')?['corner']:[]),...(machining&&Object.hasOwn(value,'machining')?['machining']:[])]))return false;
 if(Object.hasOwn(value,'frontRails')){const r=value.frontRails;if(!openConstruction||!exact(r,['revision','top','bottom'])||r.revision!=='front-rail-1'||[r.top,r.bottom].some(v=>!exact(v,['enabled','width'])||typeof v.enabled!=='boolean'||typeof v.width!=='number'||!Number.isFinite(v.width)))return false;}
 if(Object.hasOwn(value,'corner')&&(!corners||!exact(value.corner,['mode','revision','pitch'])||value.corner.mode!=='puzzle'||value.corner.revision!=='puzzle-1'||typeof value.corner.pitch!=='number'))return false;
 if(Object.hasOwn(value,'machining')){const m=value.machining;if(!machining||!exact(m,['revision','tolerance','bitDiameter','dogbones','throughOpposed','cabineoPerSide',...(Object.hasOwn(m,'partCabineoCounts')?['partCabineoCounts']:[]),...(editablePilots&&Object.hasOwn(m,'pilotDiameter')?['pilotDiameter']:[]),...(supports&&Object.hasOwn(m,'bottomFace')?['bottomFace']:[]),...(assemblyHardware&&Object.hasOwn(m,'bottomFastenersThrough')?['bottomFastenersThrough']:[]),...(throughRepairs&&Object.hasOwn(m,'throughHoles')?['throughHoles']:[]),...['shelfRowInsets','rearChamfers'].filter(k=>wallClearance&&Object.hasOwn(m,k))])||m.revision!=='cnc-1'||typeof m.dogbones!=='boolean'||typeof m.throughOpposed!=='boolean'||![m.tolerance,m.bitDiameter,m.cabineoPerSide].every(n=>typeof n==='number'&&Number.isFinite(n)))return false;}
 if(!exact(value.top,['mode','frontDepth','rearDepth'])||!object(value.back)||!exact(value.back,['mode','upperHeight','lowerHeight',...(railPosition&&Object.hasOwn(value.back,'railPosition')?['railPosition']:[]),...(seating&&Object.hasOwn(value.back,'joint')?['joint']:[])]))return false;
 if(Object.hasOwn(value.back,'railPosition')&&(!railPosition||!['inside','outside'].includes(value.back.railPosition)))return false;
 if(Object.hasOwn(value.back,'joint')){const j=value.back.joint;if(!seating||!exact(j,['revision','mode','inset','depth','clearance',...(fixings&&Object.hasOwn(j,'fastener')?['fastener']:[]),...(drilling&&Object.hasOwn(j,'fingerPitch')?['fingerPitch']:[]),...(drilling&&Object.hasOwn(j,'pilots')?['pilots']:[])])||j.revision!=='back-1'||!['inset','applied','groove','rebate',...(drilling?['finger']:[]),...(flushRails?['rail-screws']:[])].includes(j.mode)||![j.inset,j.depth,j.clearance].every(n=>typeof n==='number'&&Number.isFinite(n)))return false;
  if(Object.hasOwn(j,'fingerPitch')&&(!drilling||typeof j.fingerPitch!=='number'||!Number.isFinite(j.fingerPitch)))return false;
  if(Object.hasOwn(j,'pilots')&&(!drilling||!exact(j.pilots,['revision',autoPilots?'spacing':'perEdge','diameter'])||j.pilots.revision!=='back-pilot-1'||(autoPilots?!Number.isFinite(j.pilots.spacing)||j.pilots.spacing<20:!Number.isInteger(j.pilots.perEdge)||j.pilots.perEdge<1)||typeof j.pilots.diameter!=='number'||!Number.isFinite(j.pilots.diameter)||j.pilots.diameter<.5))return false;
  if(Object.hasOwn(j,'fastener')&&(!fixings||!exact(j.fastener,['id','revision','perSide',...adjustableFixings&&Object.hasOwn(j.fastener,'offset')?['offset']:[]])||j.fastener.id!=='hafele-26009765'||j.fastener.revision!=='rpc-1'||!Number.isInteger(j.fastener.perSide)))return false;
 }
 return value.construction==='rectangular-butt'&&value.policyRevision==='construction-1'&&['full','rails',...openConstruction?['open']:[]].includes(value.top.mode)&&['full','rails',...openConstruction?['open']:[],...hybrid?['rails-panel']:[]].includes(value.back.mode)&&[value.top.frontDepth,value.top.rearDepth,value.back.upperHeight,value.back.lowerHeight].every(n=>typeof n==='number'&&Number.isFinite(n));
}
function validBinding(value: any): boolean { return exact(value, ['stock', 'finish', 'grain']) && pin(value.stock) && pin(value.finish) && ['none', 'u', 'v'].includes(value.grain); }
function validBanding(value: any): boolean {
  return object(value) && Object.keys(value).length <= 170 && Object.entries(value).every(([id, edges]) => identity(id) && object(edges) && Object.keys(edges).length > 0 && Object.entries(edges).every(([key, product]) => ['u-min', 'u-max', 'v-min', 'v-max'].includes(key) && pin(product)));
}
function validMounting(value: any,notch=false): boolean {
  return exact(value, ['mode', 'policyRevision', 'geometry', 'wallGap', 'topOffset', 'sideInset', 'floorClearance',...(notch&&Object.hasOwn(value,'sideNotch')?['sideNotch']:[])]) &&
    ['none', 'restraint-concept', 'suspended-concept'].includes(value.mode) && value.policyRevision === 'mounting-1' && pin(value.geometry) &&
    [value.wallGap, value.topOffset, value.sideInset, value.floorClearance].every(n => typeof n === 'number' && Number.isFinite(n));
}
function validInstallation(value: any, previous = false,supports=false,notch=false): boolean {
  return exact(value, ['type', 'policyRevision', 'feet', 'plinth', ...previous ? [] : ['mounting']]) && (previous || validMounting(value.mounting,notch)) && ['unassigned', 'floor', 'feet-concept'].includes(value.type) && value.policyRevision === 'support-1' &&
    (value.feet?.layout===undefined||['four','front-pair'].includes(value.feet.layout)) && (value.plinth?.footGap===undefined||typeof value.plinth.footGap==='number'&&Number.isFinite(value.plinth.footGap)) && exact(value.feet, ['geometry', 'height', 'sideInset', 'frontInset', 'rearInset',...['layout','drilling'].filter(k=>supports&&Object.hasOwn(value.feet,k))]) && (!value.feet.drilling||(exact(value.feet.drilling,['revision','pattern','pitchX','pitchZ','diameter','depth','through'])&&typeof value.feet.drilling.through==='boolean'&&value.feet.drilling.revision==='foot-pilot-1'&&['single','pair','triangle','rectangle'].includes(value.feet.drilling.pattern)&&['pitchX','pitchZ','diameter','depth'].every(k=>typeof value.feet.drilling[k]==='number'&&Number.isFinite(value.feet.drilling[k])))) && pin(value.feet.geometry) &&
    [value.feet.height, value.feet.sideInset, value.feet.frontInset, value.feet.rearInset].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    exact(value.plinth, ['enabled', 'leftReturn', 'rightReturn', 'frontSetback', 'topGap', 'bottomGap', 'material',...(supports&&Object.hasOwn(value.plinth,'footGap')?['footGap']:[])]) &&
    [value.plinth.enabled, value.plinth.leftReturn, value.plinth.rightReturn].every(flag => typeof flag === 'boolean') &&
    [value.plinth.frontSetback, value.plinth.topGap, value.plinth.bottomGap].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    (value.plinth.material === null || validBinding(value.plinth.material));
}
export function deserializeWithInfo(text: string): { cabinet: Cabinet; migrated: boolean } {
  const doc = JSON.parse(text);
  const revisions: Record<number, string> = { 1: 'carcass-1', 2: 'interiors-2', 3: 'construction-3', 4: 'materials-4', 5: 'installation-5', 6: 'mounting-6', 7: 'interiors-7', 8: 'fronts-8', 9: 'workspace-9', 10: 'doors-10', 11: 'constraints-11', 12: 'drawers-12', 13: 'joinery-13', 14: 'back-14', 15: 'back-fixings-15', 16: 'machining-16', 17: 'cnc-17', 18: 'fit-18', 19: 'drilling-19', 20: 'shelf-patterns-20', 21: 'interiors-21', 22: 'simple-doors-22', 23: 'door-hardware-23', 24: 'review-24', 25: 'alerts-names-25', 26: 'base-supports-26', 27: 'support-drilling-27', 28: 'inspector-holes-28', 29: 'inset-safety-29', 30: 'divider-clearance-30', 31: 'protruding-divider-31', 32: 'through-repairs-32', 33: 'wall-clearance-33', 34: 'assembly-hardware-34', 35: 'drawer-layout-35', 36: 'drawer-handles-36', 37: 'front-profiles-37', 38: 'notch-mouth-38', 39: 'editable-preparation-39', 40: 'wall-rail-notch-40', 41: 't-bone-seats-41', 42: 'open-construction-42', 43: 'rail-connectors-43', 44: 'rail-spacing-44', 45: 'single-rails-45', 46: 'rail-top-datum-46', 47: 'hinge-rail-access-47', 48: 'rail-count-fit-48', 49: 'catalogue-materials-49', 50: 'print-diagrams-50', 51: 'rail-notch-51', 52: 'catalogue-rail-backs-52', 53: 'panel-seating-53', 54: 'outside-rails-54', 55: 'flush-rear-rails-55', 56: EVALUATOR_REVISION };
  if (!object(doc) || doc.format !== 'cabinet-studio' || !Number.isInteger(doc.schemaVersion) || !Object.hasOwn(revisions, doc.schemaVersion) || doc.evaluatorRevision !== revisions[doc.schemaVersion])
    throw new Error('Unsupported cabinet format or revision. Your current cabinet and original file are unchanged.');
  const legacy = doc.schemaVersion < 4, oldConstruction = doc.schemaVersion < 3, c = doc.cabinet;
  const contentIds = doc.schemaVersion >= 7 ? contentIdentities(c?.contents, c?.id,doc.schemaVersion>=19,doc.schemaVersion>=20,doc.schemaVersion===20) : [];
  const frontIds = doc.schemaVersion >= 8 ? frontIdentities(c?.fronts,c?.id,contentIds,doc.schemaVersion>=11,doc.schemaVersion>=23,doc.schemaVersion>=25,doc.schemaVersion>=27,doc.schemaVersion>=37,doc.schemaVersion>=38) : [];
  const drawerIds:string[]=[];
  if(doc.schemaVersion>=12&&Object.hasOwn(c,'drawers')){
    if(!Array.isArray(c.drawers)||c.drawers.length>32)throw new Error('Invalid metal drawer list.');
    const used=new Set([...reservedIdentities(c.id),...contentIds,...frontIds]);
    for(const d of c.drawers){
      if(d.front&&(!exact(d.front,['placement','gap','clearance','left','right','top','bottom'])||!['inset','overlay'].includes(d.front.placement)||!['gap','clearance','left','right','top','bottom'].every(k=>typeof d.front[k]==='number'&&Number.isFinite(d.front[k]))))throw Error('Invalid drawer front settings.');
      if(!exact(d,['id','kind','policyRevision','pack','openingId','offset','frontHeight',...(Object.hasOwn(d,'front')?['front']:[]),...(doc.schemaVersion>=35&&Object.hasOwn(d,'stack')?['stack']:[]),...(doc.schemaVersion>=36&&Object.hasOwn(d,'handle')?['handle']:[]),...(doc.schemaVersion>=37&&Object.hasOwn(d,'cornerRadius')?['cornerRadius']:[]),...(doc.schemaVersion>=39&&Object.hasOwn(d,'manualRail')?['manualRail']:[])])||!identity(d.id)||!identity(d.openingId)||d.kind!=='metal-drawer'||d.policyRevision!=='antaro-external-1'||!pin(d.pack)||![d.offset,d.frontHeight].every(v=>typeof v==='number'&&Number.isFinite(v)))throw new Error('Invalid metal drawer intent.');
      if(d.manualRail!==undefined&&typeof d.manualRail!=='boolean')throw Error('Invalid drawer rail mode.');
      if(doc.schemaVersion<37&&d.handle?.kind==='notch')throw Error('Side notches require the current native format.');
      if(Object.hasOwn(d,'handle')&&(!exact(d.handle,['geometry','kind','pitch','orientation','edgeOffset','height','endOffset',...['horizontal','diameter','projection','drillDiameter',...doc.schemaVersion>=37?['notchWidth','notchDepth','cornerDiameter','notchEdge',...doc.schemaVersion>=38?['outsideRadius']:[]]:[]].filter(k=>Object.hasOwn(d.handle??{},k))])||!pin(d.handle.geometry)))throw Error('Invalid drawer handle.');
      if(Object.hasOwn(d,'stack')&&(!exact(d.stack,['groupId','order','height'])||!identity(d.stack.groupId)||!Number.isInteger(d.stack.order)||d.stack.order<0||typeof d.stack.height!=='number'||!Number.isFinite(d.stack.height)||d.stack.height<0))throw Error('Invalid drawer stack.');
      for(const key of ['', '/bottom','/back','/front','/side-left','/side-right','/runner-left','/runner-right','/back-fixing-left','/back-fixing-right','/front-fixing-left','/front-fixing-right','/front/handle/bar','/front/handle/post-1','/front/handle/post-2','/front/handle/knob']){const id=d.id+key;if(used.has(id))throw new Error('Duplicate drawer identity.');used.add(id);drawerIds.push(id);}
    }
  }
  const keys = [...doc.schemaVersion>=37&&Object.hasOwn(c,'frontDefaults')?['frontDefaults']:[], 'id', 'name', 'envelope', 'carcass', 'compartments', 'contents', 'fronts', 'installation', 'materials', 'hardware', ...(doc.schemaVersion>=12 && Object.hasOwn(c,'drawers')?['drawers']:[]), ...(doc.schemaVersion>=25&&Object.hasOwn(c,'names')?['names']:[]),...(doc.schemaVersion>=26&&Object.hasOwn(c,'cabinetType')?['cabinetType']:[]), ...legacy ? [] : ['banding']];
  if(Object.hasOwn(c??{},'frontDefaults')&&(!exact(c.frontDefaults,['edgeGap','frontGap','cornerRadius'])||!Object.values(c.frontDefaults).every(n=>typeof n==='number'&&Number.isFinite(n))))throw Error('Invalid cabinet front defaults.');
  if(c&&Object.hasOwn(c,'names')&&(!object(c.names)||Object.keys(c.names).length>256||!Object.entries(c.names).every(([id,name])=>identity(id)&&typeof name==='string'&&!!name.trim()&&name.length<=60)))throw Error('Invalid item names.');
  if(c&&Object.hasOwn(c,'cabinetType')&&!['open','base','wall','tall'].includes(c.cabinetType))throw Error('Invalid cabinet type.');
  if (!exact(c, keys) || !identity(c.id) || typeof c.name !== 'string' || c.name.length > 100 || !exact(c.envelope, ['width', 'height', 'depth', 'origin']) ||
    !Array.isArray(c.envelope.origin) || c.envelope.origin.length !== 3 || !c.envelope.origin.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
    !(oldConstruction ? exact(c.carcass, ['construction', 'policyRevision']) && c.carcass.construction === 'butt-full-top-inset-back' && c.carcass.policyRevision === 'concept-1' : validCarcass(c.carcass,doc.schemaVersion>=14,doc.schemaVersion>=15,doc.schemaVersion>=16,doc.schemaVersion>=17,doc.schemaVersion>=19,doc.schemaVersion>=21,doc.schemaVersion>=25,doc.schemaVersion>=27,doc.schemaVersion>=32,doc.schemaVersion>=33,doc.schemaVersion>=34,doc.schemaVersion>=39,doc.schemaVersion>=42,doc.schemaVersion>=52,doc.schemaVersion===54,doc.schemaVersion>=55)) ||
    !validTree(c.compartments, new Set([...reservedIdentities(c.id), ...contentIds, ...frontIds, ...drawerIds]), doc.schemaVersion === 1, doc.schemaVersion >= 9, doc.schemaVersion >= 11,doc.schemaVersion>=17) ||
    !Array.isArray(c.contents) || (doc.schemaVersion < 7 && c.contents.length > 0) || !Array.isArray(c.fronts) || (doc.schemaVersion < 8 && c.fronts.length > 0) || !(doc.schemaVersion < 5 ? exact(c.installation, ['type']) && c.installation.type === 'unassigned' : validInstallation(c.installation, doc.schemaVersion === 5,doc.schemaVersion>=27,doc.schemaVersion>=40)) ||
    !(legacy ? exact(c.materials, ['carcass', 'back']) && pin(c.materials.carcass) && pin(c.materials.back) && c.materials.carcass.id === 'generic-panel-18' && c.materials.back.id === 'generic-back-6' :
      exact(c.materials, ['carcass', 'back', 'interior']) && validBinding(c.materials.carcass) && validBinding(c.materials.back) && (c.materials.interior === null || validBinding(c.materials.interior)) && validBanding(c.banding)) ||
    !validHardware(c.hardware) || (doc.schemaVersion<13&&c.hardware.length))
    throw new Error('This cabinet contains invalid or unsupported data. Your current cabinet is unchanged.');
  let result = structuredClone(c) as Cabinet;
  if(doc.schemaVersion<34&&result.fronts.some(d=>d.hinge?.id==='blum-clip-155'))
    throw Error('The Blum 155° hinge requires cabinet file version 34.');
  if (doc.schemaVersion < 5) result.installation = defaultInstallation();
  if (doc.schemaVersion === 5) result.installation.mounting = defaultMounting();
  if (oldConstruction) result.carcass = defaultCarcass();
  if (legacy) { result.materials = { carcass: defaultBinding(c.materials.carcass), back: defaultBinding(c.materials.back), interior: null }; result.banding = {}; }
  if(doc.schemaVersion<21&&result.carcass.back.joint?.pilots)result.carcass.back.joint.pilots={revision:'back-pilot-1',spacing:200,diameter:result.carcass.back.joint.pilots.diameter};
  if(doc.schemaVersion<21)for(const shelf of result.contents)if(shelf.drilling){const retired=shelf.drilling as unknown as Record<string,unknown>;delete retired.opposed;delete retired.frontInset;delete retired.rearInset;}
  if(doc.schemaVersion<25)for(const door of result.fronts)if(door.hinge)delete (door.hinge as unknown as Record<string,unknown>).softClose;
  if(result.installation.feet.drilling)result.installation.feet.drilling.through=true;
  if(doc.schemaVersion<29&&result.fronts.some(d=>d.placement==='inset'))result=clearInsetInteriors(result).cabinet;
  if(doc.schemaVersion<33&&result.installation.mounting.geometry.id==='blum-48n0510')throw Error('Blum wall hanging requires cabinet file version 33.');
  const retiredHanging=usesBlumWallHanger(result)&&result.cabinetType!=='wall';
  if(retiredHanging)result=setWallHanging(result,false);
  // Retired catalogue drafts keep their exact geometry as generic stock.
  if(doc.schemaVersion===49){
    const generic=(binding:import('../domain/cabinet').MaterialBinding|null,back=false)=>{
      if(!binding)return;const match=binding.stock.id.match(/^holver-20251013-\d{5}-\d{4}-(\d+(?:\.\d+)?)-\d+x\d+$/);
      if(match&&binding.stock.revision==='2025-10-13')binding.stock={id:`generic-${back?'back':'panel'}-${Number(match[1])}`,revision:'1'};
    };
    generic(result.materials.carcass);generic(result.materials.back,true);generic(result.materials.interior);generic(result.installation.plinth.material);
    result.fronts.forEach(d=>generic(d.material));
  }
  if(doc.schemaVersion<55){delete (result.carcass.back as unknown as Record<string,unknown>).railPosition;if(result.carcass.back.mode==='rails-panel'){const j=result.carcass.back.joint??{revision:'back-1' as const,mode:'groove' as const,inset:18,depth:6,clearance:.2};if(j.mode!=='rail-screws')j.mode='groove';j.inset=Math.max(stock(result,'carcass').thickness,j.inset);result.carcass.back.joint=j;}}
  if(doc.schemaVersion<55&&c.carcass.back?.joint?.mode==='rail-screws')throw Error('Inside rail screws require cabinet file version 55.');
  if(doc.schemaVersion<56&&result.carcass.back.mode==='rails-panel'&&result.carcass.back.joint)result.carcass.back.joint.inset=stock(result,'carcass').thickness;
  let retiredGola=false;
  for(const front of [...result.fronts,...result.drawers??[]])if(front.handle&&(front.handle.kind as string)==='gola'){front.handle.kind='none';retiredGola=true;}
  evaluate(result);
  return { cabinet: result, migrated: doc.schemaVersion < 56 || retiredHanging || retiredGola };
}
export function deserialize(text: string): Cabinet { return deserializeWithInfo(text).cabinet; }
export function downloadCabinet(cabinet: Cabinet) {
  const url = URL.createObjectURL(new Blob([serialize(cabinet)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${cabinet.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'cabinet'}.cabinet.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
