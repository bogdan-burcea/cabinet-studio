import type { ProductPin } from '../domain/cabinet';
// An application-owned illustrative envelope, never an enabled purchased fitting pack.
export const conceptFoot = {
  id: 'concept-foot-60', revision: '1', name: 'Concept foot envelope', verification: 'conceptual',
  manufacturer: null, articleNumbers: [], officialSource: null,
  plateSize: 60, plateHeight: 10, postDiameter: 34, baseDiameter: 50, baseHeight: 5,
  minHeight: 5, maxHeight: 200, clearance: 5
} as const;
export function footGeometry(pin: ProductPin) {
  if (pin.id !== conceptFoot.id || pin.revision !== conceptFoot.revision) throw new Error('Unavailable foot geometry revision. No hardware substitution was made.');
  return conceptFoot;
}
