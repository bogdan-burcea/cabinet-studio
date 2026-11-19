import {wallHangingCuts,usesBlumWallHanger} from './wall-hanging';
import {cnc} from './cnc';
import type {Cabinet,Vec3} from '../domain/cabinet';
import {stock} from '../catalogue/materials';
import {resolveConstruction} from './construction';
import type {CabineoBore} from './cabineo';
export const BACK_FASTENER={id:'hafele-26009765',revision:'rpc-1',name:'Häfele Ixconnect 260.09.765',diameter:15,depth:12.5} as const;
// Adapted from Workshop workbench/back-connectors.js, Häfele FF 2.56 RPC S 15/25.
// Captured 3 mm back. No drilling in the back itself.
export function resolveBackFasteners(c:Cabinet):CabineoBore[]{
 const f=c.carcass.back.joint?.fastener;if(!f)return [];
 if(f.id!==BACK_FASTENER.id||f.revision!==BACK_FASTENER.revision||!Number.isInteger(f.perSide)||f.perSide<1||f.perSide>20)throw Error('Choose a supported back fastener and 1–20 connectors per side.');
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness,j=c.carcass.back.joint!;
 if(c.carcass.back.mode!=='full'||c.carcass.top.mode!=='full'||j.mode!=='groove'||j.depth>6||t<15||b<2.5||b>3.5||j.inset+b/2<12)throw Error('Ixconnect 260.09.765 requires a 3 mm grooved back, seat depth ≤6 mm, stock ≥15 mm and bore centre ≥12 mm from the rear edge.');
 const panels=resolveConstruction(c,t,b).panels,back=panels.find(p=>p.role==='back')!,top=panels.find(p=>p.role==='top')!,bottom=panels.find(p=>p.role==='bottom')!;
 const offset=f.offset??0;if(!Number.isInteger(offset)||Math.abs(offset)>back.size[0]/2-50)throw Error('Back fixing offset must keep 50 mm from the side ends, in whole millimetres.');
 const clearance=50,radius=BACK_FASTENER.diameter/2;
 const hanging=usesBlumWallHanger(c)?wallHangingCuts(c):undefined;
 const notches=hanging?.pockets??[];
 const first=back.origin[1]+clearance,ordinaryLast=back.origin[1]+back.size[1]-clearance;
 // Workshop keeps the edge of each side bore 50 mm below the access notches.
 const last=Math.min(ordinaryLast,...notches.map(cut=>cut.origin[1]-clearance-radius));
 if(last<first||(f.perSide>1&&(last-first)/(f.perSide-1)<30))
  throw Error(notches.length?'Ixconnect back connectors need 50 mm from the hanger notches and 30 mm between centres. Reduce the count or increase cabinet height.':'Reduce back connectors per side: keep 50 mm from back ends and at least 30 mm pitch.');
 const heights=f.perSide===1?[Math.min((first+ordinaryLast)/2,last)]:Array.from({length:f.perSide},(_,i)=>first+(last-first)*i/(f.perSide-1));
 const z=back.origin[2]+b/2,out:CabineoBore[]=[];
 const add=(role:string,point:Vec3,axis:0|1,sign:1|-1,index:number)=>{const id=`${c.id}/back-fastener/${role}/${index}`;out.push({id,group:id,panelId:`${c.id}/panel/${role}`,kind:'back-fixing',point,axis,sign,diameter:15,depth:12.5});};
 for(const p of panels.filter(p=>p.role==='left'||p.role==='right'))heights.forEach((y,i)=>add(p.role,[p.origin[0]+(p.role==='left'?p.size[0]:0),y,z],0,p.role==='left'?-1:1,i));
 add('top',[top.origin[0]+top.size[0]/2+offset,top.origin[1],z],1,1,0);
 const inside=cnc(c).bottomFace==='inside';add('bottom',[bottom.origin[0]+bottom.size[0]/2+offset,bottom.origin[1]+(inside?bottom.size[1]:0),z],1,inside?-1:1,0);
 if(cnc(c).bottomFastenersThrough&&!inside){const bore=out.at(-1)!;bore.depth=bottom.size[1];bore.through=true;}
 for(const bore of out)for(const cut of notches){
  const end=bore.point[bore.axis]+bore.sign*bore.depth;
  const distance=Math.hypot(...bore.point.map((point,axis)=>{
   const low=axis===bore.axis?Math.min(point,end):point-radius;
   const high=axis===bore.axis?Math.max(point,end):point+radius;
   return Math.max(0,low-cut.origin[axis]-cut.size[axis],cut.origin[axis]-high);
  }));
  if(distance<clearance-1e-6)throw Error('Ixconnect back connector needs 50 mm clearance from the hanger access notch. Adjust the back fixing offset or cabinet width.');
 }
 return out;
}
