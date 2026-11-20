import {stock} from '../catalogue/materials';
import type {Cabinet,DivisionAxis} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {addDivision,centreDivision,setDivisionSetback,findDivision} from './interiors';
import {addSimpleAdjustable,setShelfSetback,moveAdjustable} from './adjustable';
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

export function addInteriorBatch(c:Cabinet,openingIds:string[],kind:'fixed'|'adjustable'|'divider',frontInset=0,count=1){
 if(!Number.isInteger(count)||count<1||count>16)throw Error('Choose 1–16 shelves or dividers.');
 if(count===1)return addInteriors(c,openingIds,kind,frontInset);
 const original=evaluate(c).openings;
 let next:Cabinet={...c,fronts:[],drawers:[]};const featureIds:string[]=[];
 for(const id of [...new Set(openingIds)]){
  const opening=original.find(o=>o.id===id);if(!opening)throw Error('Choose an available opening.');
  if(kind==='adjustable'){
   for(let i=0;i<count;i++){
    const target=opening.size[1]*(i+1)/(count+1),made=addSimpleAdjustable(next,id,frontInset,target);next=made.cabinet;featureIds.push(made.featureId);
   }
  }else{
   const axis=kind==='divider'?'vertical':'horizontal',a=axis==='vertical'?0:1,t=stock(c,'interior').thickness;
   const clear=(opening.size[a]-count*t)/(count+1);if(clear<60)throw Error('This count leaves less than 60 mm clear between panels. Use fewer items or enlarge the opening.');
   let target=id;
   for(let i=0;i<count;i++){
    const made=addDivision(next,target,axis,Math.round((clear+t/2)*10)/10,frontInset);next=made.cabinet;featureIds.push(made.featureId);
    target=findDivision(next.compartments,made.featureId)!.children[1].id;
   }
  }
 }
 const {drawers,...result}=next;return {cabinet:{...result,fronts:c.fronts,...c.drawers?{drawers:c.drawers}:{}},featureIds};
}
