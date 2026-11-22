import {SAFE_FEATURE_CLEARANCE} from '../rules/hole-collisions';
import {machiningReview} from '../rules/machining-review';
import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {moveDivision} from './interiors';
import {setCnc} from './cnc';
import {cnc} from '../rules/cnc';
import type {EditRepair} from './edit-repairs';
/** Repair real connector/interior interference, preserving rails. Every option
 * must remove the selected conflicts without introducing another machining issue. */
export function railCollisionRepairs(c:Cabinet):EditRepair[]{
 const before=evaluate(c),bores=new Set(before.cabineo.flatMap(j=>j.bores.map(b=>b.id)));
 const hits=before.issues.filter(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>bores.has(id)));
 if(!hits.length)return [];
 const sig=(i:typeof before.issues[number])=>JSON.stringify([i.code,i.featureId,i.relatedIds,i.operationIds,i.message]);
 const previous=new Set(before.issues.filter(i=>i.code.startsWith('machining-')).map(sig)),hitKeys=new Set(hits.map(sig));
 const operations=new Set(hits.flatMap(i=>i.operationIds??[]));
 const options:EditRepair[]=[];
 const offer=(candidate:Cabinet,label:string)=>{try{const after=evaluate(candidate);if(after.issues.some(i=>i.code.startsWith('machining-')&&(!previous.has(sig(i))||hitKeys.has(sig(i)))))return false;const spaced=after.cabineo.map(j=>({...j,bores:j.bores.map(b=>operations.has(b.id)?{...b,diameter:b.diameter+2*SAFE_FEATURE_CLEARANCE}:b)}));if(machiningReview(after.panels,spaced,[...after.drilling,...after.backFasteners],after.pockets).some(i=>['machining-collision','machining-hole-collision'].includes(i.code)&&i.operationIds?.some(id=>operations.has(id))))return false;options.push({label,cabinet:candidate});return true;}catch{return false;}};
 for(const id of new Set(hits.flatMap(i=>i.relatedIds??[]))){
  const d=before.divisions.find(d=>d.id===id);if(!d)continue;
  for(const sign of [-1,1])for(let delta=1;delta<=100;delta++){
   const n=d.position+sign*delta;if(n<d.min||n>d.max)break;
   if(offer(moveDivision(c,id,n),`Move ${d.label} ${delta} mm ${d.axis==='vertical'?(sign<0?'left':'right'):(sign<0?'down':'up')} to clear the fasteners`))break;
  }
 }
 const count=cnc(c).cabineoPerSide||2;
 for(const n of Array.from({length:20},(_,i)=>i+1).filter(n=>n!==count).sort((a,b)=>Math.abs(a-count)-Math.abs(b-count)))if(offer(setCnc(c,{cabineoPerSide:n}),`Use ${n} Cabineo per side to clear the interior`))break;
 return options;
}
