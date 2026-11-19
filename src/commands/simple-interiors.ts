import type {Cabinet,DivisionAxis} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {addDivision,centreDivision,setDivisionSetback} from './interiors';
import {addSimpleAdjustable,setShelfSetback} from './adjustable';
export function addInteriors(c:Cabinet,openingIds:string[],kind:'fixed'|'adjustable'|'divider',frontInset=0){
 const ids=[...new Set(openingIds)],openings=evaluate(c).openings;
 if(!ids.length||ids.some(id=>!openings.some(o=>o.id===id)))throw Error('Select available openings to add interiors.');
 // Build a complete geometry candidate before door clearance validation.
 let next:Cabinet={...c,fronts:[]};const featureIds:string[]=[];
 for(const id of ids){
  if(kind==='adjustable'){const result=addSimpleAdjustable(next,id,frontInset);next=setShelfSetback(result.cabinet,result.featureId,frontInset);featureIds.push(result.featureId);}
  else{const opening=openings.find(o=>o.id===id)!,axis:DivisionAxis=kind==='divider'?'vertical':'horizontal',result=addDivision(next,id,axis,Math.round(opening.size[axis==='horizontal'?1:0]*5)/10,frontInset);next=centreDivision(result.cabinet,result.featureId);featureIds.push(result.featureId);}
 }
 return {cabinet:{...next,fronts:c.fronts},featureIds};
}
export function setInteriorInsets(c:Cabinet,ids:string[],frontInset:number):Cabinet{
 return ids.reduce((next,id)=>next.contents.some(s=>s.id===id)?setShelfSetback(next,id,frontInset):setDivisionSetback(next,id,frontInset),c);
}
