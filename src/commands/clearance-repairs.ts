import type {Cabinet} from '../domain/cabinet';
import type {EditRepair} from './edit-repairs';
import {evaluate} from '../geometry/evaluate';
import {cnc} from '../rules/cnc';
import {setCnc} from './cnc';
import {setSimpleFeet} from './simple-supports';
import {safeDoorAngles} from '../rules/door-motion';
import {backFixingRepairs} from './machining-repairs';
import {editSimpleDoors} from './simple-doors';
type MachiningIssue=ReturnType<typeof evaluate>['issues'][number];
function machiningCollisionKeys(issues:MachiningIssue[]){
 return new Set(issues.filter(i=>i.code==='machining-collision'||i.code==='machining-hole-collision')
  .map(i=>JSON.stringify([i.code,i.featureId,i.operationIds,i.message])));
}
function clearsFaceCheck(before:ReturnType<typeof evaluate>,candidate:Cabinet,id:string):boolean{
 const after=evaluate(candidate);
 if(after.issues.some(i=>i.code==='machining-faces'&&i.featureId===id))return false;
 const existing=machiningCollisionKeys(before.issues);
 return [...machiningCollisionKeys(after.issues)].every(key=>existing.has(key));
}
export function bottomFaceRepairs(c:Cabinet):EditRepair[]{
 const before=evaluate(c),id=`${c.id}/panel/bottom`;
 if(!before.issues.some(i=>i.code==='machining-faces'&&i.featureId===id))return [];
 const inside=cnc(c).bottomFace==='inside',nextFace=inside?'outside':'inside',options:EditRepair[]=[];
 const add=(label:string,candidate:Cabinet)=>{
  try{if(clearsFaceCheck(before,candidate,id))options.push({label,cabinet:candidate});}
  catch{/* An invalid layout cannot be offered as a repair. */}
 };
 const flipped=setCnc(c,{bottomFace:nextFace,bottomFastenersThrough:false});
 add(`Move bottom fasteners to the ${nextFace} face`,flipped);
 if(!inside&&!options.length){
  try{
   for(const repair of backFixingRepairs(flipped)) {
    if(!repair.cabinet.carcass.back.joint?.fastener)continue;
    add(`Move bottom fasteners inside. ${repair.label}`,repair.cabinet);
   }
  }catch{/* An invalid face flip has no combined correction. */}
 }
 if(!inside&&!cnc(c).bottomFastenersThrough){
  add('Keep outside fasteners and drill the receiving pilots through',setCnc(c,{bottomFastenersThrough:true}));
 }
 return options;
}

export function hingePlateRepairs(c:Cabinet):EditRepair[]{
 const options:EditRepair[]=[],initial=evaluate(c),bad=initial.issues.filter(i=>i.code==='machining-hinge-plate');if(!bad.length)return options;
 const existing=machiningCollisionKeys(initial.issues);
 const safe=(next:Cabinet,hingeId?:string)=>{const model=evaluate(next);return !model.issues.some(i=>i.code==='machining-hinge-plate'&&(!hingeId||i.operationIds?.includes(hingeId)))&&[...machiningCollisionKeys(model.issues)].every(key=>existing.has(key));};
 for(const directions of [[-1],[1],[-1,1]]){
  let candidate=c;
  for(const issue of bad.filter((v,i,a)=>a.findIndex(q=>q.operationIds?.[0]===v.operationIds?.[0])===i)){const hinge=initial.doorHardware.hinges.find(h=>issue.operationIds?.includes(h.id));if(!hinge)continue;const index=+hinge.id.split('/').at(-1)!;
   const body=initial.fronts.doors.find(d=>d.id===hinge.ownerId);if(!body)continue;
   const limits=new Map(directions.map(sign=>[sign,Math.floor(sign<0?hinge.y-(body.center[1]-body.size[1]/2+35):body.center[1]+body.size[1]/2-35-hinge.y)]));
   search:for(let delta=1;delta<=Math.max(...limits.values());delta++)for(const sign of directions){
    if(delta>limits.get(sign)!)continue;
    const next={...candidate,fronts:candidate.fronts.map(d=>d.id!==hinge.ownerId||!d.hinge?d:{...d,hinge:{...d.hinge,offsets:Array.from({length:d.hinge.count},(_,i)=>(d.hinge!.offsets?.[i]??0)+(i===index?sign*delta:0))}})};
    try{if(safe(next,hinge.id)){candidate=next;break search;}}catch{}
   }
  }
  try{if(safe(candidate)&&!options.some(o=>JSON.stringify(o.cabinet.fronts)===JSON.stringify(candidate.fronts)))options.push({label:directions.length===2?'Set obstructed hinges to their nearest safe offsets; keep the rails unchanged':`Move obstructed hinges ${directions[0]<0?'down':'up'} to the nearest clear whole-mm position`,cabinet:candidate});}catch{}
 }
 const movement=(candidate:Cabinet)=>candidate.fronts.reduce((total,d)=>total+(d.hinge?.offsets??[]).reduce((sum,n,i)=>sum+Math.abs(n-(c.fronts.find(f=>f.id===d.id)?.hinge?.offsets?.[i]??0)),0),0);
 return options.sort((a,b)=>movement(a.cabinet)-movement(b.cabinet));
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

/** Offer only conversions that remove the selected two-face issue without
 * introducing a new cut collision. Never change a housing cavity's depth. */
export function oneFaceRepairs(c:Cabinet,panelIds:string[]):EditRepair[]{
 const before=evaluate(c),targets=[...new Set(panelIds)].filter(id=>before.issues.some(i=>i.code==='machining-faces'&&i.featureId===id));
 const options:EditRepair[]=[];
 for(const id of targets)for(const mode of ['fasteners','adjustment'] as const){
  const bores=mode==='fasteners'?before.cabineo.flatMap(j=>j.bores).filter(b=>b.kind==='receiver'):before.drilling.filter(b=>b.kind==='shelf-support');
  if(!bores.some(b=>b.panelId===id&&!b.through))continue;
  const candidate=setCnc(c,{throughHoles:{...cnc(c).throughHoles,[id]:mode}});
  try{if(!clearsFaceCheck(before,candidate,id))continue;
   const label=before.panels.find(p=>p.id===id)?.label??'part';options.push({label:`${label}: drill ${mode==='fasteners'?'receiving fastener pilots':'shelf adjustment holes'} through`,cabinet:candidate});
  }catch{/* Never offer an invalid conversion. */}
 }
 return options;
}
