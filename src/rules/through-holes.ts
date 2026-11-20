import type {Cabinet} from '../domain/cabinet';
import type {JoineryPanel,CabineoJoint,CabineoBore} from './cabineo';
import type {BackPocket} from './back-panel';
import {cnc} from './cnc';
/** Receiving pilots may be drilled through to simplify broad-face machining.
 * Housings retain their specified blind depths. */
export function oneFaceBores(c:Cabinet,panels:JoineryPanel[],joints:CabineoJoint[],back:CabineoBore[],pockets:BackPocket[]):CabineoJoint[]{
 const settings=cnc(c);
 const panelById=new Map(panels.map(p=>[p.id,p]));
 // A bottom repair can take inside receiver pilots through to the outside setup.
 joints=joints.map(j=>({...j,bores:j.bores.map(b=>{
  const p=panelById.get(b.panelId);
  const receivingRepair=settings.throughHoles?.[b.panelId]==='fasteners'&&b.kind==='receiver';
  const bottomRepair=settings.bottomFastenersThrough&&p?.role==='bottom'&&b.kind==='receiver'&&b.axis===1&&b.sign===-1;
  return p&&(receivingRepair||bottomRepair)?{...b,depth:p.size[b.axis],through:true}:b;
 })}));
 if(!settings.throughOpposed)return joints;
 const bores=[...joints.flatMap(j=>j.bores),...back],chosen=new Map<string,number>();
 for(const panel of panels){const normal=panel.orientation==='yz'?0:panel.orientation==='xz'?1:2,fixed=new Set(bores.filter(b=>b.panelId===panel.id&&!b.through&&b.kind!=='receiver').map(b=>-b.sign));pockets.filter(p=>p.panelId===panel.id&&p.size[normal]<panel.size[normal]-.001).forEach(p=>fixed.add(p.face));if(fixed.size>1)continue;const face=fixed.values().next().value??-bores.find(b=>b.panelId===panel.id)?.sign!;if(face===1||face===-1)chosen.set(panel.id,face);}
 return joints.map(j=>({...j,bores:j.bores.map(b=>{const face=chosen.get(b.panelId),p=panelById.get(b.panelId);if(!p||!face||b.kind!=='receiver'||-b.sign===face)return b;const point=[...b.point] as typeof b.point;point[b.axis]=p.center[b.axis]+face*p.size[b.axis]/2;return {...b,point,sign:-face as 1|-1,depth:p.size[b.axis],through:true};})}));
}
