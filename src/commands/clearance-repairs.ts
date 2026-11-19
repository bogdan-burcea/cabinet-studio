import type {Cabinet} from '../domain/cabinet';
import type {EditRepair} from './edit-repairs';
import {evaluate} from '../geometry/evaluate';
import {cnc} from '../rules/cnc';
import {setCnc} from './cnc';
import {setSimpleFeet} from './simple-supports';
import {safeDoorAngles} from '../rules/door-motion';
import {editSimpleDoors} from './simple-doors';
export function bottomFaceRepairs(c:Cabinet):EditRepair[]{
 const options:EditRepair[]=[],face=cnc(c).bottomFace??'outside',id=`${c.id}/panel/bottom`;
 for(const nextFace of [face==='inside'?'outside':'inside'] as const){
  const candidate=setCnc(c,{bottomFace:nextFace});
  try{if(!evaluate(candidate).issues.some(i=>i.code==='machining-faces'&&i.featureId===id))options.push({label:`Machine bottom fasteners from ${nextFace}`,cabinet:candidate});}catch{}
 }
 return options;
}
export function hingePlateRepairs(c:Cabinet):EditRepair[]{
 const options:EditRepair[]=[],initial=evaluate(c),bad=initial.issues.filter(i=>i.code==='machining-hinge-plate');if(!bad.length)return options;
 for(const sign of [-1,1]){
  let candidate=c;
  for(const issue of bad.filter((v,i,a)=>a.findIndex(q=>q.operationIds?.[0]===v.operationIds?.[0])===i)){const hinge=initial.doorHardware.hinges.find(h=>issue.operationIds?.includes(h.id));if(!hinge)continue;const index=+hinge.id.split('/').at(-1)!;
   for(let delta=1;delta<=300;delta++){
    const next={...candidate,fronts:candidate.fronts.map(d=>d.id!==hinge.ownerId||!d.hinge?d:{...d,hinge:{...d.hinge,offsets:Array.from({length:d.hinge.count},(_,i)=>(d.hinge!.offsets?.[i]??0)+(i===index?sign*delta:0))}})};
    try{if(!evaluate(next).issues.some(i=>i.code==='machining-hinge-plate'&&i.operationIds?.includes(hinge.id))){candidate=next;break;}}catch{}
   }
  }
  try{if(!evaluate(candidate).issues.some(i=>i.code==='machining-hinge-plate'))options.push({label:`Move obstructed hinges ${sign<0?'down':'up'} to the nearest clear whole-mm position`,cabinet:candidate});}catch{}
 }
 return options;
}
export function doorOpeningRepairs(c:Cabinet,ids:string[],target:number):EditRepair[]{
 for(let reveal=Math.floor(Math.max(...c.fronts.filter(d=>ids.includes(d.id)).map(d=>d.reveal)))+1;reveal<=10;reveal++){
  try{const candidate=editSimpleDoors(c,ids,{reveal}),e=evaluate(candidate);if(!safeDoorAngles(e,{},ids,target).blocked)return [{label:`Increase edge gap to ${reveal} mm for opening clearance`,cabinet:candidate}];}catch{}
 }
 return [];
}

/** Shift only the affected foot row or the paired side inset, in whole mm. */
export function footHoleRepairs(c:Cabinet):EditRepair[]{
 const options:EditRepair[]=[],bad=(next:Cabinet)=>{const e=evaluate(next),feet=new Set(e.drilling.filter(b=>b.kind==='foot-pilot').map(b=>b.id));return e.issues.some(i=>['machining-hole-collision','machining-collision'].includes(i.code)&&i.operationIds?.some(id=>feet.has(id)));};
 if(c.installation.type!=='feet-concept'||!bad(c))return options;
 for(const key of ['frontInset','rearInset','sideInset'] as const){if(key==='rearInset'&&c.installation.feet.layout==='front-pair')continue;
  let found=false;for(let delta=1;delta<=80&&!found;delta++)for(const sign of [-1,1]){
   const value=c.installation.feet[key]+delta*sign,candidate=setSimpleFeet(c,{[key]:value});
   try{if(!bad(candidate)){options.push({label:`Set ${key==='sideInset'?'side':key==='frontInset'?'front':'rear'} foot inset to ${value} mm`,cabinet:candidate});found=true;break;}}catch{}
  }
 }
 return options;
}
