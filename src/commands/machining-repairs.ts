import {cnc} from '../rules/cnc';
import {setCnc} from './cnc';
import {moveDivision} from './interiors';
import {moveAdjustable} from './adjustable';
import {rearCornerLeg,backFixingAccess} from '../rules/rear-corner-clearance';
import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {setBackPanel,setBackFastener} from './back-panel';
import type {EditRepair} from './edit-repairs';
/** Move only the matched top/bottom back-fixing pair. Search whole mm from the
 * current position; each offered candidate passes geometry and collision review. */
export function backFixingRepairs(c:Cabinet):EditRepair[]{
 const f=c.carcass.back.joint?.fastener;if(!f)return [];
 const collisions=(candidate:Cabinet)=>{const e=evaluate(candidate),ids=new Set(e.backFasteners.map(b=>b.id));return e.issues.filter(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>ids.has(id)));};
 if(!collisions(c).length)return [];
 const options:EditRepair[]=[],initial=f.offset??0,limit=Math.floor(c.envelope.width/2-50);
 for(const sign of [-1,1])for(let delta=1;delta<=2*limit;delta++){
  const offset=initial+sign*delta;if(Math.abs(offset)>limit)break;
  try{const next=setBackPanel(c,{fastener:{...f,offset}});if(!collisions(next).length){options.push({label:`Move top/bottom back fixings ${delta} mm ${sign<0?'left':'right'}`,cabinet:next});break;}}catch{/* Reject unsafe candidates. */}
 }
 if(!options.length){const cabinet=setBackFastener(c,false);try{evaluate(cabinet);options.push({label:'Remove incompatible back fixings',cabinet});}catch{}}
 return options;
}

/** Leave the back fixings in place. Only offer alternatives that clear the
 * affected part without introducing a new machining warning. */
export function backFastenerInteriorRepairs(c:Cabinet,selectedIssues:ReturnType<typeof evaluate>['issues']):EditRepair[]{
 const before=evaluate(c),bores=new Map(before.backFasteners.map(b=>[b.id,b]));
 const relevant=selectedIssues.filter(i=>i.code==='machining-collision'&&i.operationIds?.some(id=>bores.has(id)));
 const targets=new Set(relevant.flatMap(i=>i.relatedIds??[])),options:EditRepair[]=[];
 const signature=(i:typeof before.issues[number])=>JSON.stringify([i.code,i.featureId,i.relatedIds,i.operationIds]);
 const existing=new Set(before.issues.filter(i=>i.code.startsWith('machining-')).map(signature));
 for(const id of targets){
  const panel=before.panels.find(p=>p.id===id&&['shelf','divider'].includes(p.role));
  const division=before.divisions.find(p=>p.id===id),shelf=before.adjustable.shelves.find(p=>p.id===id);
  if(!panel||!division&&!shelf)continue;
  function offer(candidate:Cabinet,label:string){
   try{
    const issues=evaluate(candidate).issues.filter(i=>i.code.startsWith('machining-'));
    if(issues.some(i=>!existing.has(signature(i))||i.code==='machining-collision'&&i.relatedIds?.includes(id)&&i.operationIds?.some(key=>bores.has(key))))return false;
    options.push({label,cabinet:candidate});return true;
   }catch{return false;}
  }
  const part=division??shelf!;
  if(division){
   for(let delta=1;delta<=100;delta++){
    let found=false;
    for(const sign of [-1,1]){
     const position=Math.round((division.position+sign*delta)*10)/10;
     if(position<division.min||position>division.max)continue;
     const direction=division.axis==='vertical'?(sign<0?'left':'right'):(sign<0?'down':'up');
     found=offer(moveDivision(c,id,position),`Move ${panel.label} ${delta} mm ${direction}`)||found;
    }
    if(found)break;
   }
  }else if(shelf){
   const positions=shelf.legalPositions.filter(n=>n!==shelf.position).sort((a,b)=>Math.abs(a-shelf.position)-Math.abs(b-shelf.position));
   for(const position of positions)if(offer(moveAdjustable(c,id,position),`Move ${panel.label} ${+Math.abs(position-part.position).toFixed(1)} mm ${position<part.position?'down':'up'}`))break;
  }
  const cuts={...cnc(c).rearChamfers?.[id]};
  for(const issue of before.issues.filter(i=>i.code==='machining-collision'&&i.relatedIds?.includes(id))){
   for(const key of issue.operationIds??[]){
    const bore=bores.get(key);if(!bore)continue;
    const low=rearCornerLeg(panel,backFixingAccess(bore),'low'),high=rearCornerLeg(panel,backFixingAccess(bore),'high'),side=low<=high?'low':'high';
    cuts[side]=Math.max(cuts[side]??0,Math.ceil(Math.min(low,high)+.5));
   }
  }
  if(Object.keys(cuts).length)offer(setCnc(c,{rearChamfers:{...cnc(c).rearChamfers,[id]:cuts}}),`Cut ${panel.label} rear ${Object.keys(cuts).length===1?'corner':'corners'} at 45°`);
 }
 return options;
}
