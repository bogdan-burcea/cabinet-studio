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
 if(c.installation.mounting.mode!=='none')throw Error('Back fasteners with wall-mounting hardware need a separate clearance review.');
 const panels=resolveConstruction(c,t,b).panels,back=panels.find(p=>p.role==='back')!,top=panels.find(p=>p.role==='top')!,bottom=panels.find(p=>p.role==='bottom')!;
 const first=back.origin[1]+50,last=back.origin[1]+back.size[1]-50;
 if(last<first||(f.perSide>1&&(last-first)/(f.perSide-1)<30))throw Error('Reduce back connectors per side: keep 50 mm from back ends and at least 30 mm pitch.');
 const heights=f.perSide===1?[(first+last)/2]:Array.from({length:f.perSide},(_,i)=>first+(last-first)*i/(f.perSide-1)),z=back.origin[2]+b/2,out:CabineoBore[]=[];
 const add=(role:string,point:Vec3,axis:0|1,sign:1|-1,index:number)=>{const id=`${c.id}/back-fastener/${role}/${index}`;out.push({id,group:id,panelId:`${c.id}/panel/${role}`,kind:'back-fixing',point,axis,sign,diameter:15,depth:12.5});};
 for(const p of panels.filter(p=>p.role==='left'||p.role==='right'))heights.forEach((y,i)=>add(p.role,[p.origin[0]+(p.role==='left'?p.size[0]:0),y,z],0,p.role==='left'?-1:1,i));
 add('top',[top.origin[0]+top.size[0]/2,top.origin[1],z],1,1,0);
 add('bottom',[bottom.origin[0]+bottom.size[0]/2,bottom.origin[1]+bottom.size[1],z],1,-1,0);
 return out;
}
