import type { Cabinet, MaterialRole, ProductPin } from '../domain/cabinet';
// Generic declared stock, not verified manufacturer products or load ratings.
const panel = (thickness: number) => ({ id: `generic-panel-${thickness}`, revision: '1', thickness, name: `Generic panel · ${thickness} mm`, kind: 'panel' as const, verification: 'conceptual' });
const back = (thickness: number) => ({ id: `generic-back-${thickness}`, revision: '1', thickness, name: `Generic back · ${thickness} mm`, kind: 'back' as const, verification: 'conceptual' });
export const materials = Object.fromEntries([panel(16), panel(18), panel(19), panel(22), back(6), back(9), back(12)].map(record => [record.id, record]));
export const finishes = {
  unspecified: { id: 'unspecified', revision: '1', name: 'Unspecified finish' },
  'white-concept': { id: 'white-concept', revision: '1', name: 'White finish · concept' },
  'oak-concept': { id: 'oak-concept', revision: '1', name: 'Oak effect · concept' }
};
export const edgeProducts = Object.fromEntries([0.8, 1, 2].map(thickness => {
  const id = `generic-edge-${thickness}`;
  return [id, { id, revision: '1', thickness, name: `Generic band · ${thickness} mm`, finish: 'match-panel', verification: 'conceptual' }];
}));
export function material(pin: ProductPin) {
  const record = materials[pin.id];
  if (!record || record.revision !== pin.revision) throw new Error(`Unavailable material revision: ${pin.id}@${pin.revision}`);
  return record;
}
export function finish(pin: ProductPin) {
  const record = finishes[pin.id as keyof typeof finishes];
  if (!record || record.revision !== pin.revision) throw new Error(`Unavailable finish revision: ${pin.id}@${pin.revision}`);
  return record;
}
export function edgeProduct(pin: ProductPin) {
  const record = edgeProducts[pin.id];
  if (!record || record.revision !== pin.revision) throw new Error(`Unavailable edge band revision: ${pin.id}@${pin.revision}`);
  return record;
}
export function binding(c: Cabinet, role: MaterialRole) { return role === 'interior' ? c.materials.interior ?? c.materials.carcass : c.materials[role]; }
export function stock(c: Cabinet, role: MaterialRole) { return material(binding(c, role).stock); }
