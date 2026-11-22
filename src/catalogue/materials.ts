import type { Cabinet, MaterialRole, ProductPin } from '../domain/cabinet';
// Generic declared stock, not verified manufacturer products or load ratings.
const panel = (thickness: number) => ({ id: `generic-panel-${thickness}`, revision: '1', thickness, name: `Generic panel · ${thickness} mm`, kind: 'panel' as const, verification: 'conceptual' });
const back = (thickness: number) => ({ id: `generic-back-${thickness}`, revision: '1', thickness, name: `Generic back · ${thickness} mm`, kind: 'back' as const, verification: 'conceptual' });
export const materials = Object.fromEntries([panel(12), panel(15), panel(16), panel(18), panel(19), panel(22), panel(25), back(3), back(6), back(9), back(12), back(16), back(18)].map(record => [record.id, record]));
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
  const custom=pin.id.match(/^generic-(panel|back)-(\d+(?:\.\d)?)$/),n=custom?Number(custom[2]):NaN;
  const record = materials[pin.id]??(pin.revision==='1'&&n>=.1&&n<=100&&custom?.[2]===String(n)?custom?.[1]==='back'?back(n):panel(n):undefined);
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
export function binding(c: Cabinet, role: MaterialRole, panelId?: string) {
  if (role === 'front') return (panelId ? c.fronts.find(door => door.id === panelId) : c.fronts[0])?.material ?? c.materials.carcass;
  if (role === 'plinth') return c.installation.plinth.material ?? c.materials.carcass;
  return role === 'interior' ? c.materials.interior ?? c.materials.carcass : c.materials[role];
}
export function stock(c: Cabinet, role: MaterialRole, panelId?: string) { return material(binding(c, role, panelId).stock); }
