import type {FlatPart} from './parts';

export function drillSizes(holes:FlatPart['holes']){
 const rows=new Map<string,{diameter:number;depth:number;through:boolean;count:number;kind:string}>();
 for(const hole of holes){
  const through=!!hole.through;
  const key=JSON.stringify([hole.diameter,through?0:hole.depth,through,hole.kind]);
  const row=rows.get(key);
  if(row)row.count++;
  else rows.set(key,{diameter:hole.diameter,depth:hole.depth,through,count:1,kind:hole.kind});
 }
 return [...rows.values()].sort((a,b)=>a.diameter-b.diameter||a.depth-b.depth);
}

export function cutterLimit(parts:readonly FlatPart[]){
 const widths=parts.flatMap(part=>part.cuts.filter(cut=>!cut.triangle).map(cut=>Math.min(...cut.size.filter((_,axis)=>axis!==cut.axis))));
 return widths.length?Math.min(...widths):undefined;
}
