import { defaultBinding, defaultCarcass, defaultInstallation, defaultMounting, type Cabinet, type Compartment } from '../domain/cabinet';
import { evaluate, EVALUATOR_REVISION } from '../geometry/evaluate';
export const AUTOSAVE_KEY = 'cabinet-studio.autosave.v6';
export const LEGACY_AUTOSAVE_KEY = 'cabinet-studio.autosave.v1';
export const PREVIOUS_AUTOSAVE_KEYS = ['cabinet-studio.autosave.v5', 'cabinet-studio.autosave.v4', 'cabinet-studio.autosave.v3', 'cabinet-studio.autosave.v2', 'cabinet-studio.autosave.v1'] as const;
export function serialize(cabinet: Cabinet): string {
  evaluate(cabinet);
  return JSON.stringify({ format: 'cabinet-studio', schemaVersion: 6, evaluatorRevision: EVALUATOR_REVISION, cabinet }, null, 2);
}
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: string[]) { return object(value) && Object.keys(value).length === keys.length && keys.every(k => k in value); }
function pin(value: any) { return exact(value, ['id', 'revision']) && typeof value.id === 'string' && typeof value.revision === 'string'; }
function identity(value: unknown) { return typeof value === 'string' && !!value.trim() && value.length <= 128 && !['__proto__', 'constructor', 'prototype'].includes(value); }
function validTree(value: any, reserved: Set<string>, stage1: boolean, depth = 0, count = { nodes: 0 }): value is Compartment {
  if (!object(value) || depth > 32 || ++count.nodes > 127 || !identity(value.id) || reserved.has(value.id)) return false;
  reserved.add(value.id);
  if (value.kind === 'opening') return exact(value, ['id', 'kind', 'children']) && Array.isArray(value.children) && value.children.length === 0;
  if (stage1 || value.kind !== 'split' || !exact(value, ['id', 'kind', 'featureId', 'axis', 'position', 'policyRevision', 'children']) ||
    !identity(value.featureId) || reserved.has(value.featureId) || !['horizontal', 'vertical'].includes(value.axis) || value.policyRevision !== 'fixed-1' ||
    typeof value.position !== 'number' || !Number.isFinite(value.position) || !Array.isArray(value.children) || value.children.length !== 2) return false;
  reserved.add(value.featureId);
  return value.children.every((child: unknown) => validTree(child, reserved, stage1, depth + 1, count));
}
function validCarcass(value: any): boolean {
  return exact(value, ['construction', 'policyRevision', 'top', 'back']) && value.construction === 'rectangular-butt' && value.policyRevision === 'construction-1' &&
    exact(value.top, ['mode', 'frontDepth', 'rearDepth']) && ['full', 'rails'].includes(value.top.mode) &&
    exact(value.back, ['mode', 'upperHeight', 'lowerHeight']) && ['full', 'rails'].includes(value.back.mode) &&
    [value.top.frontDepth, value.top.rearDepth, value.back.upperHeight, value.back.lowerHeight].every(v => typeof v === 'number' && Number.isFinite(v));
}
function validBinding(value: any): boolean { return exact(value, ['stock', 'finish', 'grain']) && pin(value.stock) && pin(value.finish) && ['none', 'u', 'v'].includes(value.grain); }
function validBanding(value: any): boolean {
  return object(value) && Object.keys(value).length <= 75 && Object.entries(value).every(([id, edges]) => identity(id) && object(edges) && Object.keys(edges).length > 0 && Object.entries(edges).every(([key, product]) => ['u-min', 'u-max', 'v-min', 'v-max'].includes(key) && pin(product)));
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
  const revisions: Record<number, string> = { 1: 'carcass-1', 2: 'interiors-2', 3: 'construction-3', 4: 'materials-4', 5: 'installation-5', 6: EVALUATOR_REVISION };
  if (!object(doc) || doc.format !== 'cabinet-studio' || !Number.isInteger(doc.schemaVersion) || !Object.hasOwn(revisions, doc.schemaVersion) || doc.evaluatorRevision !== revisions[doc.schemaVersion])
    throw new Error('Unsupported cabinet format or revision. Your current cabinet and original file are unchanged.');
  const legacy = doc.schemaVersion < 4, oldConstruction = doc.schemaVersion < 3, c = doc.cabinet;
  const keys = ['id', 'name', 'envelope', 'carcass', 'compartments', 'contents', 'fronts', 'installation', 'materials', 'hardware', ...legacy ? [] : ['banding']];
  if (!exact(c, keys) || !identity(c.id) || typeof c.name !== 'string' || c.name.length > 100 || !exact(c.envelope, ['width', 'height', 'depth', 'origin']) ||
    !Array.isArray(c.envelope.origin) || c.envelope.origin.length !== 3 || !c.envelope.origin.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
    !(oldConstruction ? exact(c.carcass, ['construction', 'policyRevision']) && c.carcass.construction === 'butt-full-top-inset-back' && c.carcass.policyRevision === 'concept-1' : validCarcass(c.carcass)) ||
    !validTree(c.compartments, new Set([c.id, ...['left', 'right', 'top', 'bottom', 'back', 'top-front-rail', 'top-rear-rail', 'back-upper-rail', 'back-lower-rail', 'plinth-front', 'plinth-left', 'plinth-right'].map(role => `${c.id}/panel/${role}`), `${c.id}/construction/top`, `${c.id}/construction/back`, `${c.id}/installation/feet`, `${c.id}/installation/plinth`, ...['', '/rail', '/left', '/right'].map(suffix => `${c.id}/installation/mounting${suffix}`), ...['front-left', 'front-right', 'rear-left', 'rear-right'].flatMap(name => ['', '/plate', '/post', '/base'].map(suffix => `${c.id}/installation/foot/${name}${suffix}`))]), doc.schemaVersion === 1) ||
    !Array.isArray(c.contents) || c.contents.length || !Array.isArray(c.fronts) || c.fronts.length || !(doc.schemaVersion < 5 ? exact(c.installation, ['type']) && c.installation.type === 'unassigned' : validInstallation(c.installation, doc.schemaVersion === 5)) ||
    !(legacy ? exact(c.materials, ['carcass', 'back']) && pin(c.materials.carcass) && pin(c.materials.back) && c.materials.carcass.id === 'generic-panel-18' && c.materials.back.id === 'generic-back-6' :
      exact(c.materials, ['carcass', 'back', 'interior']) && validBinding(c.materials.carcass) && validBinding(c.materials.back) && (c.materials.interior === null || validBinding(c.materials.interior)) && validBanding(c.banding)) ||
    !Array.isArray(c.hardware) || c.hardware.length)
    throw new Error('This cabinet contains invalid or unsupported data. Your current cabinet is unchanged.');
  const result = structuredClone(c) as Cabinet;
  if (doc.schemaVersion < 5) result.installation = defaultInstallation();
  if (doc.schemaVersion === 5) result.installation.mounting = defaultMounting();
  if (oldConstruction) result.carcass = defaultCarcass();
  if (legacy) { result.materials = { carcass: defaultBinding(c.materials.carcass), back: defaultBinding(c.materials.back), interior: null }; result.banding = {}; }
  evaluate(result);
  return { cabinet: result, migrated: doc.schemaVersion < 6 };
}
export function deserialize(text: string): Cabinet { return deserializeWithInfo(text).cabinet; }
export function downloadCabinet(cabinet: Cabinet) {
  const url = URL.createObjectURL(new Blob([serialize(cabinet)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${cabinet.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'cabinet'}.cabinet.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
