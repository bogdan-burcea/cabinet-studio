import type { AdjustableShelf, Cabinet } from '../domain/cabinet';
import { conceptShelfSupport } from '../catalogue/shelves';
import { shelfLevelForCentre } from '../rules/adjustable';
import { stock } from '../catalogue/materials';
import { evaluate } from '../geometry/evaluate';
import { findDivision, removeDivision, addDivision } from './interiors';
const defaultShelf = (openingId: string, level: number): AdjustableShelf => ({ id: crypto.randomUUID(), kind: 'adjustable-shelf', openingId, level, frontSetback: 10, policyRevision: 'adjustable-1', support: { id: conceptShelfSupport.id, revision: conceptShelfSupport.revision } });
export function addAdjustable(c: Cabinet, openingId: string) {
  const e = evaluate(c), opening = e.openings.find(o => o.id === openingId);
  if (!opening) throw new Error('Select an available leaf opening for an adjustable shelf.');
  const t = stock(c, 'interior').thickness, p = conceptShelfSupport;
  const max = Math.floor((opening.size[1] - p.minClear - t - p.firstLevel) / p.pitch);
  const levels = Array.from({ length: Math.max(0, max + 1) }, (_, n) => n).filter(n => c.contents.filter(s => s.openingId === openingId).every(s => Math.abs(s.level - n) * p.pitch >= t + p.minClear));
  levels.sort((a,b) => Math.abs(p.firstLevel + a*p.pitch + t/2 - opening.size[1]/2) - Math.abs(p.firstLevel + b*p.pitch + t/2 - opening.size[1]/2));
  if (!levels.length) throw new Error('No free concept support level leaves 60 mm clear above/between shelves in this opening.');
  const shelf = defaultShelf(openingId, levels[0]);
  return { cabinet: { ...c, contents: [...c.contents, shelf] }, featureId: shelf.id };
}
export function moveAdjustable(c: Cabinet, id: string, centre: number): Cabinet {
  const shelf = c.contents.find(s => s.id === id); if (!shelf) throw new Error('This adjustable shelf no longer exists.');
  const level = shelfLevelForCentre(centre,stock(c,'interior').thickness,shelf.support);
  return { ...c, contents: c.contents.map(s => s.id === id ? { ...s, level } : s) };
}
export function setShelfSetback(c: Cabinet, id: string, frontSetback: number): Cabinet {
  return { ...c, contents: c.contents.map(s => s.id === id ? { ...s, frontSetback } : s) };
}
export function removeAdjustable(c: Cabinet, id: string): Cabinet {
  if (!c.contents.some(s => s.id === id)) throw new Error('This adjustable shelf no longer exists.');
  const banding = { ...c.banding }; delete banding[id];
  return { ...c, contents: c.contents.filter(s => s.id !== id), banding };
}
export function duplicateAdjustable(c: Cabinet, id: string) {
  const shelf = c.contents.find(s => s.id === id); if (!shelf) throw new Error('This adjustable shelf no longer exists.');
  const next = addAdjustable(c, shelf.openingId);
  next.cabinet = { ...next.cabinet, contents: next.cabinet.contents.map(s => s.id === next.featureId ? { ...s, support: { ...shelf.support }, frontSetback: shelf.frontSetback } : s) };
  if (c.banding[id]) next.cabinet = { ...next.cabinet, banding: { ...c.banding, [next.featureId]: structuredClone(c.banding[id]) } };
  return next;
}
export function fixedToAdjustable(c: Cabinet, id: string): Cabinet {
  const node = findDivision(c.compartments, id);
  if (!node || node.axis !== 'horizontal') throw new Error('Choose a fixed shelf.');
  if (node.children.some(child => child.kind !== 'opening' || c.contents.some(s => s.openingId === child.id))) throw new Error('Remove child divisions/adjustable shelves before converting this fixed shelf. Nothing was deleted.');
  const removed = removeDivision(c,id), t = stock(c,'interior').thickness;
  const shelf = { ...defaultShelf(node.id, shelfLevelForCentre(node.position,t,{id:conceptShelfSupport.id,revision:conceptShelfSupport.revision})), id };
  return { ...removed, banding: c.banding, contents: [...removed.contents, shelf] };
}
export function adjustableToFixed(c: Cabinet, id: string): Cabinet {
  const shelf = c.contents.find(s => s.id === id), layout = evaluate(c).adjustable.shelves.find(s => s.id === id);
  if (!shelf || !layout) throw new Error('Choose an adjustable shelf.');
  if (c.contents.some(s => s.id !== id && s.openingId === shelf.openingId)) throw new Error('Remove other adjustable shelves in this opening before converting it to a fixed division. Nothing was deleted.');
  const next = addDivision(removeAdjustable(c,id), shelf.openingId,'horizontal',layout.position).cabinet;
  const replace = (node: Cabinet['compartments']): Cabinet['compartments'] => node.kind === 'opening' ? node : { ...node, featureId: node.id === shelf.openingId ? id : node.featureId, children: node.children.map(replace) as typeof node.children };
  return { ...next, banding: c.banding, compartments: replace(next.compartments) };
}
