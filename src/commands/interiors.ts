import type { Cabinet, Compartment, DivisionAxis, SplitNode } from '../domain/cabinet';
import {attachFrontBoundaries,effectiveDoor,interiorLayout} from '../rules/front-links';
import { evaluate } from '../geometry/evaluate';
function transform(node: Compartment, predicate: (node: Compartment) => boolean, change: (node: Compartment) => Compartment): Compartment {
  if (predicate(node)) return change(node);
  return node.kind === 'opening' ? node : { ...node, children: node.children.map(child => transform(child, predicate, change)) as [Compartment, Compartment] };
}
export function findDivision(node: Compartment, featureId: string): SplitNode | undefined {
  if (node.kind === 'opening') return;
  return node.featureId === featureId ? node : findDivision(node.children[0], featureId) ?? findDivision(node.children[1], featureId);
}
export function addDivision(c: Cabinet, openingId: string, axis: DivisionAxis, position: number, frontSetback = 0, identity?: {featureId:string; children:[string,string]}) {
  const featureId = identity?.featureId ?? crypto.randomUUID(); let found = false;
  const compartments = transform(c.compartments, node => node.id === openingId && node.kind === 'opening', node => {
    found = true;
    return { id: node.id, kind: 'split', featureId, axis, position, policyRevision: frontSetback===0?'fixed-1':'fixed-2', ...(frontSetback===0?{}:{frontSetback}), children: [
      { id: identity?.children[0] ?? crypto.randomUUID(), kind: 'opening', children: [] }, { id: identity?.children[1] ?? crypto.randomUUID(), kind: 'opening', children: [] }
    ] };
  });
  if (!found) throw new Error('Select an available opening before adding a division.');
  return { cabinet: { ...c, compartments }, featureId };
}
export function moveDivision(c: Cabinet, featureId: string, position: number): Cabinet {
  if (!findDivision(c.compartments, featureId)) throw new Error('This division no longer exists.');
  const linked=attachFrontBoundaries(c);
  return { ...linked, compartments: transform(linked.compartments, node => node.kind === 'split' && node.featureId === featureId, node => {const {anchor,...rest}=node as SplitNode;return {...rest,position};}) };
}
export function centreDivision(c:Cabinet,featureId:string):Cabinet {
 const layout=interiorLayout(c),division=layout.divisions.find(p=>p.id===featureId);if(!division)throw new Error('This division no longer exists.');
 const linked=attachFrontBoundaries(c);
 return {...linked,compartments:transform(linked.compartments,node=>node.kind==='split'&&node.featureId===featureId,node=>({...node as SplitNode,anchor:'centre',position:Math.round((division.min+division.max)*5)/10}))};
}
export function setDivisionSetback(c: Cabinet, featureId: string, frontSetback: number): Cabinet {
  if(!findDivision(c.compartments,featureId))throw new Error('This division no longer exists.');
  return {...c,compartments:transform(c.compartments,node=>node.kind==='split'&&node.featureId===featureId,node=>({...node as SplitNode,policyRevision:'fixed-2',frontSetback}))};
}
export function duplicateDivision(c: Cabinet, featureId: string) {
  const division = findDivision(c.compartments, featureId);
  if (!division) throw new Error('This division no longer exists.');
  const leaves = (node: Compartment): string[] => node.kind === 'opening' ? [node.id] : node.children.flatMap(leaves);
  const ids = new Set(leaves(division)), axis = division.axis === 'horizontal' ? 1 : 0;
  const target = evaluate(c).openings.filter(o => ids.has(o.id)).sort((a, b) => b.size[axis] - a.size[axis])[0];
  const next = addDivision(c, target.id, division.axis, Math.round(target.size[axis] * 5) / 10, division.frontSetback ?? 0);
  if (c.banding[featureId]) next.cabinet = { ...next.cabinet, banding: { ...c.banding, [next.featureId]: structuredClone(c.banding[featureId]) } };
  return next;
}
export function removeDivision(c: Cabinet, featureId: string): Cabinet {
  const division = findDivision(c.compartments, featureId);
  if (!division) throw new Error('This division no longer exists.');
  if (division.children.some(child => child.kind !== 'opening' || c.contents.some(s => s.openingId === child.id))) throw new Error('Remove the divisions and adjustable shelves inside the child openings first. This preserves your nested interior.');
  const banding = { ...c.banding }; delete banding[featureId];
  const fronts=c.fronts.map(door=>{if(!Object.values(door.boundaryLinks??{}).includes(featureId))return door;const resolved=effectiveDoor(c,door),{boundaryLinks,...rest}=resolved,remaining=Object.fromEntries(Object.entries(boundaryLinks??{}).filter(([,id])=>id!==featureId));return {...rest,...(Object.keys(remaining).length?{boundaryLinks:remaining}:{})};});
  return { ...c, fronts, banding, compartments: transform(c.compartments, node => node.id === division.id, node => ({ id: node.id, kind: 'opening', children: [] })) };
}

export function setInteriorFinger(c:Cabinet,id:string,enabled:boolean,pitch=50):Cabinet{
 function update(node:Compartment):Compartment{if(node.kind==='opening')return node;if(node.featureId===id){const {joint,...rest}=node;return enabled?{...rest,joint:{mode:'finger',revision:'finger-1',pitch}}:rest;}return {...node,children:node.children.map(update) as [Compartment,Compartment]};}
 return {...c,compartments:update(c.compartments)};
}
