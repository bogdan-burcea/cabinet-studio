import type { Object3D, Raycaster } from 'three';
export type PickKind = 'part' | 'interior' | 'opening' | 'back' | 'front' | 'hinge';
// Opening planes are interaction proxies, not surfaces that occlude cabinet parts.
// Carcass surfaces behind a proxy stay background so empty openings remain selectable.
export function pickCabinetElement(raycaster: Raycaster, objects: Object3D[], cabinetId: string): string {
  const hits = raycaster.intersectObjects(objects.filter(object => !object.userData.pickThrough), true);
  const opening = hits.find(hit => hit.object.userData.pickKind === 'opening');
  const part = hits.find(hit => hit.object.userData.pickKind !== 'opening' && typeof hit.object.userData.id === 'string');
  const hit = !part ? opening : !opening || part.distance <= opening.distance || ['interior','front','hinge'].includes(part.object.userData.pickKind) ? part : opening;
  return hit?.object.userData.id ?? cabinetId;
}
