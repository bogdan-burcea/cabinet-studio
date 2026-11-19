import type {Cabinet} from '../domain/cabinet';
import {conceptHandle} from '../catalogue/fronts';
import {effectiveDoor} from '../rules/front-links';
import {stock} from '../catalogue/materials';
import {validate} from '../rules/validate';
import {resolveInteriors} from '../rules/interiors';
import {supportedHingeSides} from '../rules/fronts';
import {addDivision,moveDivision,setDivisionSetback} from './interiors';
import {setShelfSetback} from './adjustable';
export interface Correction {label:string;detail:string;cabinet:Cabinet}
const legal=(c:Cabinet)=>!validate(c).some(i=>i.severity==='error');
export function clearInsetInteriors(c:Cabinet):{cabinet:Cabinet;changed:string[]} {
 let next=c;const changed:string[]=[],{width:w,height:h,depth:d,origin:[ox,oy,oz]}=c.envelope;
 const interiors=resolveInteriors(c,stock(c,'carcass').thickness,stock(c,'back').thickness,stock(c,'interior').thickness);
 const required=(origin:number[],size:number[],vertical=false)=>Math.max(0,...c.fronts.map(f=>effectiveDoor(c,f)).filter(f=>f.placement==='inset'&&!(vertical&&[f.region.left,f.region.right].some(edge=>Math.abs(ox+w*edge-origin[0]-size[0]/2)<.11))&&origin[0]+size[0]>ox+w*f.region.left+0.1&&origin[0]<ox+w*f.region.right-0.1&&origin[1]+size[1]>oy+h*f.region.bottom+0.1&&origin[1]<oy+h*f.region.top-0.1).map(f=>origin[2]+size[2]-(oz+d-f.clearance-stock(c,'front',f.id).thickness)+1));
 for(const part of interiors.divisions){const gap=required(part.origin,part.size,part.axis==='vertical');if(gap>0){const node=findNode(c.compartments,part.id)!;next=setDivisionSetback(next,part.id,(node.frontSetback??0)+gap);changed.push(part.label);}}
 for(const shelf of c.contents){const o=interiors.openings.find(o=>o.id===shelf.openingId);if(!o)continue;const target=required(o.origin,o.size);if(target>shelf.frontSetback){next=setShelfSetback(next,shelf.id,target);changed.push('Adjustable shelf');}}
 return {cabinet:next,changed};
}
function findNode(n:Cabinet['compartments'],id:string):Extract<Cabinet['compartments'],{kind:'split'}>|undefined {if(n.kind==='opening')return;return n.featureId===id?n:findNode(n.children[0],id)??findNode(n.children[1],id);}
export function corrections(candidate:Cabinet):Correction[] {
 const options:Correction[]=[];
 const add=(label:string,detail:string,c:Cabinet)=>{if(legal(c)&&JSON.stringify(c)!==JSON.stringify(candidate))options.push({label,detail,cabinet:c});};
 try {
  const clear=clearInsetInteriors(candidate);if(clear.changed.length)add('Set back interiors to clear doors',`Adjusts ${clear.changed.join(', ')} together with the requested change. Undo restores all of them.`,clear.cabinet);
  const flip={...candidate,fronts:candidate.fronts.map(f=>{const sides=supportedHingeSides(candidate,f);return sides.includes(f.handing)||!sides.length?f:{...f,handing:sides[0]};})};
  add('Use supported hinge sides','Moves unsupported hinge edges to an existing side panel or divider.',flip);
  const badHandles=new Set(validate(candidate).filter(i=>i.message.includes('handle envelope')).map(i=>i.featureId));
  if(badHandles.size){let fitted=candidate;for(const id of badHandles){const door=fitted.fronts.find(f=>f.id===id);if(!door)continue;for(const pitch of [...conceptHandle.pitches].reverse().filter(n=>n<=door.handle.pitch)){const next={...fitted,fronts:fitted.fronts.map(f=>f.id===id?{...f,handle:{...f.handle,pitch,edgeOffset:Math.min(40,f.handle.edgeOffset),endOffset:Math.min(60,f.handle.endOffset)}}:f)};if(!validate(next).some(i=>i.featureId===id&&i.message.includes('handle envelope'))){fitted=next;break;}}}add('Fit handle to door','Uses the largest fitting pitch no larger than requested, with edge offsets up to 40 mm and end offsets up to 60 mm.',fitted);}
  let aligned=candidate,moved=0;
  for(const door of candidate.fronts){if(supportedHingeSides(aligned,door).includes(door.handing))continue;
    const x=aligned.envelope.origin[0]+aligned.envelope.width*door.region[door.handing];
    const layout=resolveInteriors(aligned,stock(aligned,'carcass').thickness,stock(aligned,'back').thickness,stock(aligned,'interior').thickness);
    const nearby=layout.divisions.filter(p=>p.axis==='vertical'&&Math.abs(p.origin[0]+p.size[0]/2-x)<40).sort((a,b)=>Math.abs(a.origin[0]+a.size[0]/2-x)-Math.abs(b.origin[0]+b.size[0]/2-x))[0];
    if(nearby){aligned=moveDivision(aligned,nearby.id,Math.round((nearby.position+x-nearby.origin[0]-nearby.size[0]/2)*10)/10);moved++;}
  }
  if(moved)add('Align divider with hinge edge','Moves the nearby existing divider to support the requested hinge position; dependent contents must still fit.',aligned);
  let supported=candidate,count=0;
  for(const door of candidate.fronts){if(supportedHingeSides(supported,door).includes(door.handing))continue;
   const {width:w,height:h,origin:[ox,oy]}=supported.envelope,x=ox+w*door.region[door.handing],lo=oy+h*door.region.bottom,hi=oy+h*door.region.top;
   const openings=resolveInteriors(supported,stock(supported,'carcass').thickness,stock(supported,'back').thickness,stock(supported,'interior').thickness).openings;
   for(const o of openings.filter(o=>x>o.origin[0]+60&&x<o.origin[0]+o.size[0]-60&&Math.min(hi,o.origin[1]+o.size[1])-Math.max(lo,o.origin[1])>0)){
    supported=addDivision(supported,o.id,'vertical',Math.round((x-o.origin[0])*10)/10).cabinet;count++;
   }
  }
  if(count){const cleared=clearInsetInteriors(supported);add('Add supporting vertical divider'+(count>1?'s':''),`Adds ${count} vertical panel${count>1?'s':''} at the hinge edge${cleared.changed.length?' and sets interiors back to clear inset doors':''}. The requested edit and supporting changes are one Undo step.`,cleared.cabinet);}
  const handles={...candidate,fronts:candidate.fronts.map(f=>badHandles.has(f.id)?{...f,handle:{...f.handle,kind:'none' as const}}:f)};
  if(validate(candidate).some(i=>i.message.includes('handle envelope')))add('Remove handles that do not fit','Removes only the handles that do not fit. You can add a smaller handle afterwards.',handles);
 }catch{/* No speculative correction is offered unless the entire candidate validates. */}
 return options;
}
