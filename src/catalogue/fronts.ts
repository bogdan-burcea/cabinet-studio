import type { ProductPin, SlabDoor } from '../domain/cabinet';
// Application concepts only. No hinge, handle article, drilling or verified kinematics.
export const conceptHandle = { id: 'concept-slab-handle', revision: '1', pitches: [64,96,128,160,192,224,320], knobDiameter: 24, knobProjection: 24, pullThickness: 10, pullProjection: 32, pullOverhang: 12 } as const;
export function handleGeometry(pin: ProductPin) {
  if (pin.id !== conceptHandle.id || pin.revision !== conceptHandle.revision) throw new Error('Unavailable concept handle revision. No fitting substitution was made.');
  return conceptHandle;
}
export function defaultDoor(region: SlabDoor['region'] = { left: 0, right: 1, bottom: 0, top: 1 }): SlabDoor {
  return { id: crypto.randomUUID(), kind: 'slab-door', policyRevision: 'slab-1', region, placement: 'overlay', handing: 'left', reveal: 2, clearance: 2, material: null,
    handle: { geometry: { id: conceptHandle.id, revision: conceptHandle.revision }, kind: 'pull', pitch: 128, orientation: 'vertical', edgeOffset: 40, height: 'centre', endOffset: 60 } };
}
