import type { ProductPin } from '../domain/cabinet';
// Application-owned spatial study. No article, fixing, drilling or capacity is implied.
export const conceptMounting = {
  id: 'concept-wall-layout', revision: '1', verification: 'conceptual', manufacturer: null, articleNumbers: [], officialSource: null,
  railHeight: 30, railDepth: 5, bracketWidth: 30, bracketHeight: 50, minWallGap: 15, bracketSeparation: 10
} as const;
export function mountingGeometry(pin: ProductPin) {
  if (pin.id !== conceptMounting.id || pin.revision !== conceptMounting.revision) throw new Error('Unavailable wall-mounting geometry revision. No fitting substitution was made.');
  return conceptMounting;
}
