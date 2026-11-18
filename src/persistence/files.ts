import { defaultCarcass, type Cabinet, type Compartment } from '../domain/cabinet';
import { evaluate, EVALUATOR_REVISION } from '../geometry/evaluate';
export const AUTOSAVE_KEY = 'cabinet-studio.autosave.v3';
export const PREVIOUS_AUTOSAVE_KEYS = ['cabinet-studio.autosave.v2', 'cabinet-studio.autosave.v1'] as const;
export const LEGACY_AUTOSAVE_KEY = 'cabinet-studio.autosave.v1';
export function serialize(cabinet: Cabinet): string {
  evaluate(cabinet);
  return JSON.stringify({ format: 'cabinet-studio', schemaVersion: 3, evaluatorRevision: EVALUATOR_REVISION, cabinet }, null, 2);
}
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: string[]) { return object(value) && Object.keys(value).length === keys.length && keys.every(k => k in value); }
function validTree(value: any, reserved: Set<string>, legacy: boolean, depth = 0, count = { nodes: 0 }): value is Compartment {
  if (!object(value) || depth > 32 || ++count.nodes > 127 || typeof value.id !== 'string' || !value.id.trim() || value.id.length > 128 || reserved.has(value.id)) return false;
  reserved.add(value.id);
  if (value.kind === 'opening') return exact(value, ['id', 'kind', 'children']) && Array.isArray(value.children) && value.children.length === 0;
  if (legacy || value.kind !== 'split' || !exact(value, ['id', 'kind', 'featureId', 'axis', 'position', 'policyRevision', 'children']) ||
    typeof value.featureId !== 'string' || !value.featureId.trim() || value.featureId.length > 128 || reserved.has(value.featureId) ||
    !['horizontal', 'vertical'].includes(value.axis) || value.policyRevision !== 'fixed-1' || typeof value.position !== 'number' || !Number.isFinite(value.position) ||
    !Array.isArray(value.children) || value.children.length !== 2) return false;
  reserved.add(value.featureId);
  return value.children.every((child: unknown) => validTree(child, reserved, legacy, depth + 1, count));
}
function validCarcass(value: any): boolean {
  return exact(value, ['construction', 'policyRevision', 'top', 'back']) && value.construction === 'rectangular-butt' && value.policyRevision === 'construction-1' &&
    exact(value.top, ['mode', 'frontDepth', 'rearDepth']) && ['full', 'rails'].includes(value.top.mode) &&
    exact(value.back, ['mode', 'upperHeight', 'lowerHeight']) && ['full', 'rails'].includes(value.back.mode) &&
    [value.top.frontDepth, value.top.rearDepth, value.back.upperHeight, value.back.lowerHeight].every(v => typeof v === 'number' && Number.isFinite(v));
}
export function deserializeWithInfo(text: string): { cabinet: Cabinet; migrated: boolean } {
  const doc = JSON.parse(text), stage1 = doc?.schemaVersion === 1 && doc?.evaluatorRevision === 'carcass-1';
  const stage2 = doc?.schemaVersion === 2 && doc?.evaluatorRevision === 'interiors-2';
  const migrated = stage1 || stage2;
  if (!object(doc) || doc.format !== 'cabinet-studio' || !(migrated || (doc.schemaVersion === 3 && doc.evaluatorRevision === EVALUATOR_REVISION)))
    throw new Error('Unsupported cabinet format or revision. Your current cabinet and original file are unchanged.');
  const c = doc.cabinet;
  const pin = (p: unknown) => exact(p, ['id', 'revision']) && typeof (p as any).id === 'string' && typeof (p as any).revision === 'string';
  if (!exact(c, ['id', 'name', 'envelope', 'carcass', 'compartments', 'contents', 'fronts', 'installation', 'materials', 'hardware']) ||
    typeof c.id !== 'string' || !c.id.trim() || c.id.length > 128 || typeof c.name !== 'string' || c.name.length > 100 ||
    !exact(c.envelope, ['width', 'height', 'depth', 'origin']) ||
    !Array.isArray(c.envelope.origin) || c.envelope.origin.length !== 3 || !c.envelope.origin.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
    !(migrated ? exact(c.carcass, ['construction', 'policyRevision']) && c.carcass.construction === 'butt-full-top-inset-back' && c.carcass.policyRevision === 'concept-1' : validCarcass(c.carcass)) ||
    !validTree(c.compartments, new Set([c.id, ...['left', 'right', 'top', 'bottom', 'back', 'top-front-rail', 'top-rear-rail', 'back-upper-rail', 'back-lower-rail'].map(role => `${c.id}/panel/${role}`), `${c.id}/construction/top`, `${c.id}/construction/back`]), stage1) ||
    !Array.isArray(c.contents) || c.contents.length || !Array.isArray(c.fronts) || c.fronts.length ||
    !exact(c.installation, ['type']) || c.installation.type !== 'unassigned' ||
    !exact(c.materials, ['carcass', 'back']) || !pin(c.materials.carcass) || !pin(c.materials.back) ||
    c.materials.carcass.id !== 'generic-panel-18' || c.materials.back.id !== 'generic-back-6' ||
    !Array.isArray(c.hardware) || c.hardware.length)
    throw new Error('This cabinet contains invalid or unsupported data. Your current cabinet is unchanged.');
  const result = structuredClone(c) as Cabinet;
  if (migrated) result.carcass = defaultCarcass();
  evaluate(result);
  return { cabinet: result, migrated };
}
export function deserialize(text: string): Cabinet { return deserializeWithInfo(text).cabinet; }
export function downloadCabinet(cabinet: Cabinet) {
  const url = URL.createObjectURL(new Blob([serialize(cabinet)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${cabinet.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'cabinet'}.cabinet.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
