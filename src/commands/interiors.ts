import type { Cabinet, Compartment, DivisionAxis, SplitNode } from '../domain/cabinet';
import { evaluate } from '../geometry/evaluate';
function transform(node: Compartment, predicate: (node: Compartment) => boolean, change: (node: Compartment) => Compartment): Compartment {
  if (predicate(node)) return change(node);
  return node.kind === 'opening' ? node : { ...node, children: node.children.map(child => transform(child, predicate, change)) as [Compartment, Compartment] };
}
export function findDivision(node: Compartment, featureId: string): SplitNode | undefined {
  if (node.kind === 'opening') return;
  return node.featureId === featureId ? node : findDivision(node.children[0], featureId) ?? findDivision(node.children[1], featureId);
}
export function addDivision(c: Cabinet, openingId: string, axis: DivisionAxis, position: number) {
  const featureId = crypto.randomUUID(); let found = false;
  const compartments = transform(c.compartments, node => node.id === openingId && node.kind === 'opening', node => {
    found = true;
    return { id: node.id, kind: 'split', featureId, axis, position, policyRevision: 'fixed-1', children: [
      { id: crypto.randomUUID(), kind: 'opening', children: [] }, { id: crypto.randomUUID(), kind: 'opening', children: [] }
    ] };
  });
  if (!found) throw new Error('Select an available opening before adding a division.');
  return { cabinet: { ...c, compartments }, featureId };
}
export function moveDivision(c: Cabinet, featureId: string, position: number): Cabinet {
  if (!findDivision(c.compartments, featureId)) throw new Error('This division no longer exists.');
  return { ...c, compartments: transform(c.compartments, node => node.kind === 'split' && node.featureId === featureId, node => ({ ...node as SplitNode, position })) };
}
export function duplicateDivision(c: Cabinet, featureId: string) {
  const division = findDivision(c.compartments, featureId);
  if (!division) throw new Error('This division no longer exists.');
  const leaves = (node: Compartment): string[] => node.kind === 'opening' ? [node.id] : node.children.flatMap(leaves);
  const ids = new Set(leaves(division)), axis = division.axis === 'horizontal' ? 1 : 0;
  const target = evaluate(c).openings.filter(o => ids.has(o.id)).sort((a, b) => b.size[axis] - a.size[axis])[0];
  return addDivision(c, target.id, division.axis, Math.round(target.size[axis] * 5) / 10);
}
export function removeDivision(c: Cabinet, featureId: string): Cabinet {
  const division = findDivision(c.compartments, featureId);
  if (!division) throw new Error('This division no longer exists.');
  if (division.children.some(child => child.kind !== 'opening')) throw new Error('Remove the divisions inside the child openings first. This preserves your nested interior.');
  return { ...c, compartments: transform(c.compartments, node => node.id === division.id, node => ({ id: node.id, kind: 'opening', children: [] })) };
}
