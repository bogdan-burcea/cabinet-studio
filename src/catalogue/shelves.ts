import type { ProductPin } from '../domain/cabinet';
// A declared application study, not a shelf fitting or manufacturer drilling pattern.
export const conceptShelfSupport = {
  id: 'concept-shelf-support', revision: '1', verification: 'conceptual', manufacturer: null, articleNumbers: [], officialSource: null,
  pitch: 32, firstLevel: 64, sideClearance: 1, rowInset: 37, padSize: [8, 4, 12] as const, minClear: 60, maxFrontSetback: 50
} as const;
export function shelfSupport(pin: ProductPin) {
  if (pin.id !== conceptShelfSupport.id || pin.revision !== conceptShelfSupport.revision) throw new Error('Unavailable adjustable-shelf concept revision. No fitting substitution was made.');
  return conceptShelfSupport;
}
