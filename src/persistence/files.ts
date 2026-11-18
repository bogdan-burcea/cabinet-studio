import type { Cabinet } from '../domain/cabinet';
import { evaluate, EVALUATOR_REVISION } from '../geometry/evaluate';
export const AUTOSAVE_KEY = 'cabinet-studio.autosave.v1';
export function serialize(cabinet: Cabinet): string {
  evaluate(cabinet);
  return JSON.stringify({ format: 'cabinet-studio', schemaVersion: 1, evaluatorRevision: EVALUATOR_REVISION, cabinet }, null, 2);
}
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: string[]) { return object(value) && Object.keys(value).length === keys.length && keys.every(k => k in value); }
export function deserialize(text: string): Cabinet {
  const doc = JSON.parse(text);
  if (!object(doc) || doc.format !== 'cabinet-studio' || doc.schemaVersion !== 1 || doc.evaluatorRevision !== EVALUATOR_REVISION)
    throw new Error('Unsupported cabinet format or revision. Your current cabinet and original file are unchanged.');
  const c = doc.cabinet;
  const pin = (p: unknown) => exact(p, ['id', 'revision']) && typeof (p as any).id === 'string' && typeof (p as any).revision === 'string';
  if (!exact(c, ['id', 'name', 'envelope', 'carcass', 'compartments', 'contents', 'fronts', 'installation', 'materials', 'hardware']) ||
    typeof c.id !== 'string' || !c.id.trim() || c.id.length > 128 || typeof c.name !== 'string' || c.name.length > 100 ||
    !exact(c.envelope, ['width', 'height', 'depth', 'origin']) ||
    !Array.isArray(c.envelope.origin) || c.envelope.origin.length !== 3 || !c.envelope.origin.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
    !exact(c.carcass, ['construction', 'policyRevision']) || c.carcass.construction !== 'butt-full-top-inset-back' || c.carcass.policyRevision !== 'concept-1' ||
    !exact(c.compartments, ['id', 'kind', 'children']) || typeof c.compartments.id !== 'string' || !c.compartments.id.trim() || c.compartments.kind !== 'opening' ||
    !Array.isArray(c.compartments.children) || c.compartments.children.length ||
    !Array.isArray(c.contents) || c.contents.length || !Array.isArray(c.fronts) || c.fronts.length ||
    !exact(c.installation, ['type']) || c.installation.type !== 'unassigned' ||
    !exact(c.materials, ['carcass', 'back']) || !pin(c.materials.carcass) || !pin(c.materials.back) ||
    c.materials.carcass.id !== 'generic-panel-18' || c.materials.back.id !== 'generic-back-6' ||
    !Array.isArray(c.hardware) || c.hardware.length)
    throw new Error('This cabinet contains invalid or unsupported data. Your current cabinet is unchanged.');
  evaluate(c);
  return structuredClone(c) as Cabinet;
}
export function downloadCabinet(cabinet: Cabinet) {
  const url = URL.createObjectURL(new Blob([serialize(cabinet)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${cabinet.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'cabinet'}.cabinet.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
