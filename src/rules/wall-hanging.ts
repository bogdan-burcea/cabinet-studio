import {wallHangingRearOffset,SIDE_NOTCH_DEPTH} from './wall-hanging-offset';
import type {Cabinet} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {CabineoBore} from './cabineo';
import {resolveConstruction} from './construction';
import {backLayout} from './back-panel';
import {cnc} from './cnc';
import {stock} from '../catalogue/materials';

export const blumWallHanger = {id:'blum-48n0510',revision:'1'} as const;
export const usesBlumWallHanger = (c:Cabinet) =>
 c.installation.mounting.mode==='suspended-concept' && c.installation.mounting.geometry.id===blumWallHanger.id;

/** Workshop's screw-on pattern in Studio coordinates, with the rear at minimum Z. */
export function wallHangingCuts(c:Cabinet){
 const bores:CabineoBore[]=[],pockets:BackPocket[]=[];
 const notch=c.installation.mounting.sideNotch??0;
 if(!Number.isFinite(notch)||notch<0||notch>100||Math.abs(notch*10-Math.round(notch*10))>1e-6)throw Error('Side notch must be 0–100 mm in 0.1 mm steps.');
 if(!usesBlumWallHanger(c))return {bores,pockets};
 if(c.cabinetType!=='wall')throw Error('Blum wall hanging is available on wall-style cabinets.');
 const t=stock(c,'carcass').thickness,b=stock(c,'back').thickness,joint=c.carcass.back.joint;
 const {width,height,depth,origin:[x,y,z]}=c.envelope;
 const hybrid=c.carcass.back.mode==='rails-panel',railsOnly=c.carcass.back.mode==='rails',back=backLayout(c,t,b),offset=wallHangingRearOffset(c),inset=hybrid||railsOnly?t+offset:back.origin[2];
 if(t<16||!['full','rails-panel','rails'].includes(c.carcass.back.mode)||(!railsOnly&&(!joint||(hybrid?!['groove','rail-screws'].includes(joint.mode):joint.mode!=='groove'||inset-offset<19||inset-offset>31))))
  throw Error('Blum wall hanging needs stock of at least 16 mm and a grooved back with a rear inset of 19–31 mm, or rear rails with or without a back panel.');
 if(depth<inset+47.25)throw Error('The wall hanger pilots need more cabinet depth.');
 const covered=c.carcass.top.mode==='full'||c.carcass.top.mode==='rails'&&c.carcass.top.rearDepth>0;
 const [bx,by,bz]=railsOnly?[t,t,t+offset]:back.origin,[bw,bh]=railsOnly?[width-2*t,height-t-(covered?t:0)]:back.size;
 const rails=hybrid||railsOnly?resolveConstruction(c,t,b).panels.filter(p=>p.role==='back-upper-rail'||p.role==='back-lower-rail'):[];
 if(bw<=36||bh<=41)throw Error('The back panel is too small for the wall hanger access notches.');
 for(const side of ['left','right'] as const){
  const left=side==='left',group=`${c.id}/installation/mounting/${side}`;
  if(notch>0){
   const radius=cnc(c).bitDiameter/2;
   if(radius>8||notch<2*radius)throw Error('The side notch needs at least one cutter diameter of height and a cutter no wider than 16 mm for its 8 mm depth.');
   const top=y+height-t,bottom=top-notch,front=z+SIDE_NOTCH_DEPTH,px=left?x:x+width-t;
   const outline:import('../domain/cabinet').Vec3[]=[[px,bottom,z],[px,bottom,front-radius]];
   for(let i=1;i<=16;i++){const angle=-Math.PI/2+i*Math.PI/32;outline.push([px,bottom+radius+Math.sin(angle)*radius,front-radius+Math.cos(angle)*radius]);}
   outline.push([px,top-radius,front]);
   for(let i=1;i<=16;i++){const angle=i*Math.PI/32;outline.push([px,top-radius+Math.sin(angle)*radius,front-radius+Math.cos(angle)*radius]);}
   outline.push([px,top,z]);
   pockets.push({id:`${group}/side-notch`,panelId:`${c.id}/panel/${side}`,kind:'hanger-access',axis:0,face:left?1:-1,origin:[px,bottom,z],size:[t,notch,SIDE_NOTCH_DEPTH],outline});
  }

  for(const [index,offset] of [14,46].entries()){
   bores.push({id:`${group}/pilot/${index}`,group,panelId:`${c.id}/panel/${side}`,kind:'pilot',axis:0,sign:left?-1:1,
    point:[left?x+t:x+width-t,y+height-33,z+inset+offset],diameter:2.5,depth:10});
  }
  const access:BackPocket={id:`${group}/back-notch`,panelId:`${c.id}/panel/back`,kind:'hanger-access',axis:2,face:-1,
   origin:[x+(left?bx:bx+bw-18),y+by+bh-41,z+bz],size:[18,41,b]};
  if(!railsOnly)pockets.push(access);
  for(const rail of rails){
   const from=rail.origin.map((n,i)=>i===2?n:Math.max(n,access.origin[i])) as import('../domain/cabinet').Vec3;
   const to=rail.origin.map((n,i)=>i===2?n+rail.size[i]:Math.min(n+rail.size[i],access.origin[i]+access.size[i]));
   if(to.every((n,i)=>n-from[i]>.001))pockets.push({id:`${group}/${rail.role}-notch`,panelId:`${c.id}/panel/${rail.role}`,kind:'hanger-access',axis:2,face:-1,origin:from,size:to.map((n,i)=>n-from[i]) as import('../domain/cabinet').Vec3});
  }
 }
 return {bores,pockets};
}
