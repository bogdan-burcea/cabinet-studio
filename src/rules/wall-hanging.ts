import type {Cabinet} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {CabineoBore} from './cabineo';
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
 if(t<16||c.carcass.back.mode!=='full'||joint?.mode!=='groove'||joint.inset<19||joint.inset>31)
  throw Error('Blum wall hanging needs stock of at least 16 mm and a full grooved back with a rear inset of 19–31 mm.');
 if(depth<joint.inset+47.25)throw Error('The wall hanger pilots need more cabinet depth.');
 const back=backLayout(c,t,b),[bx,by,bz]=back.origin,[bw,bh]=back.size;
 if(bw<=36||bh<=41)throw Error('The back panel is too small for the wall hanger access notches.');
 for(const side of ['left','right'] as const){
  const left=side==='left',group=`${c.id}/installation/mounting/${side}`;
  if(notch>0){
   const radius=cnc(c).bitDiameter/2;
   if(radius>8||notch<radius)throw Error('The side notch needs at least one cutter radius of height and a cutter no wider than 16 mm for its 8 mm depth.');
   const bottom=y+height-notch,front=z+8,px=left?x:x+width-t;
   const outline:import('../domain/cabinet').Vec3[]=[[px,bottom,z],[px,bottom,front-radius]];
   for(let i=1;i<=16;i++){const angle=-Math.PI/2+i*Math.PI/32;outline.push([px,bottom+radius+Math.sin(angle)*radius,front-radius+Math.cos(angle)*radius]);}
   outline.push([px,y+height,front],[px,y+height,z]);
   pockets.push({id:`${group}/side-notch`,panelId:`${c.id}/panel/${side}`,kind:'hanger-access',axis:0,face:left?1:-1,origin:[px,bottom,z],size:[t,notch,8],outline});
  }

  for(const [index,offset] of [14,46].entries()){
   bores.push({id:`${group}/pilot/${index}`,group,panelId:`${c.id}/panel/${side}`,kind:'pilot',axis:0,sign:left?-1:1,
    point:[left?x+t:x+width-t,y+height-33,z+joint.inset+offset],diameter:2.5,depth:10});
  }
  pockets.push({id:`${group}/back-notch`,panelId:`${c.id}/panel/back`,kind:'hanger-access',axis:2,face:-1,
   origin:[left?bx:bx+bw-18,by+bh-41,bz],size:[18,41,b]});
 }
 return {bores,pockets};
}
