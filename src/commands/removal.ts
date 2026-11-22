import {supportedHingeSides} from '../rules/fronts';
import type {Cabinet,Compartment} from '../domain/cabinet';
import {findDivision,removeDivisionTree} from './interiors';
import {removeDoor} from './fronts';
import {removeMetalDrawer} from './drawers';
import {removeAdjustable,removeFixedShelfPreservingContents} from './adjustable';
/** Explicit deletion plan: dependants are listed before the caller confirms it. */
export function removalPlan(c:Cabinet,requested:string[]){
 const ids=new Set(requested),features=new Set<string>(),openings=new Set<string>();
 function walk(n:Compartment){openings.add(n.id);if(n.kind==='split'){features.add(n.featureId);n.children.forEach(walk);}}
 for(const id of ids){const node=findDivision(c.compartments,id);if(node)node.children.forEach(walk);}
 for(const id of ids)if(findDivision(c.compartments,id))features.add(id);
 const drawers=(c.drawers??[]).filter(d=>!ids.has(d.id)&&openings.has(d.openingId));
 const shelves=c.contents.filter(s=>!ids.has(s.id)&&openings.has(s.openingId));
 const connected=[...features].filter(id=>!ids.has(id)).concat(drawers.map(d=>d.id));
 let next=c;
 for(const d of drawers)next=removeMetalDrawer(next,d.id);
 for(const id of ids){
  if(next.drawers?.some(d=>d.id===id))next=removeMetalDrawer(next,id);
  else if(next.fronts.some(d=>d.id===id))next=removeDoor(next,id);
  else if(next.contents.some(s=>s.id===id))next=removeAdjustable(next,id);
  else {const node=findDivision(next.compartments,id);if(node)next=node.axis==='horizontal'&&node.children.every(n=>n.kind==='opening')?removeFixedShelfPreservingContents(next,id):removeDivisionTree(next,id);}
 }
 connected.push(...shelves.filter(s=>!next.contents.some(kept=>kept.id===s.id)).map(s=>s.id));
 const unsupported=next.fronts.filter(d=>!supportedHingeSides(next,d).includes(d.handing));
 for(const door of unsupported){connected.push(door.id);next=removeDoor(next,door.id);}
 return {cabinet:next,connected};
}
