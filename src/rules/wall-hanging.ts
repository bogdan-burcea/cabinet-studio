import type {Cabinet} from '../domain/cabinet';
import type {BackPocket} from './back-panel';
import type {CabineoBore} from './cabineo';
import {backLayout} from './back-panel';
import {stock} from '../catalogue/materials';

export const blumWallHanger = {id:'blum-48n0510',revision:'1'} as const;
export const usesBlumWallHanger = (c:Cabinet) =>
 c.installation.mounting.mode==='suspended-concept' && c.installation.mounting.geometry.id===blumWallHanger.id;

/** Workshop's screw-on pattern in Studio coordinates, with the rear at minimum Z. */
export function wallHangingCuts(c:Cabinet){
 const bores:CabineoBore[]=[],pockets:BackPocket[]=[];
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
  for(const [index,offset] of [14,46].entries()){
   bores.push({id:`${group}/pilot/${index}`,group,panelId:`${c.id}/panel/${side}`,kind:'pilot',axis:0,sign:left?-1:1,
    point:[left?x+t:x+width-t,y+height-33,z+joint.inset+offset],diameter:2.5,depth:10});
  }
  pockets.push({id:`${group}/back-notch`,panelId:`${c.id}/panel/back`,kind:'hanger-access',axis:2,face:-1,
   origin:[left?bx:bx+bw-18,by+bh-41,bz],size:[18,41,b]});
 }
 return {bores,pockets};
}
