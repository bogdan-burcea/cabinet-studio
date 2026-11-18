import type { ProductPin } from '../domain/cabinet';
// Measured stock and actual purchased materials replace these conceptual records later.
export const materials = {
  'generic-panel-18': { id: 'generic-panel-18', revision: '1', thickness: 18, name: 'Generic panel · 18 mm', verification: 'conceptual' },
  'generic-back-6': { id: 'generic-back-6', revision: '1', thickness: 6, name: 'Generic back · 6 mm', verification: 'conceptual' }
} as const;
export function material(pin: ProductPin) {
  const record = materials[pin.id as keyof typeof materials];
  if (!record || record.revision !== pin.revision) throw new Error(`Unavailable material revision: ${pin.id}@${pin.revision}`);
  return record;
}
