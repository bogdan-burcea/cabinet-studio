import {setCnc} from './cnc';
import {backPilotLimits} from '../rules/applied-back';
import type {Cabinet,Carcass} from '../domain/cabinet';
export type BackJoint=NonNullable<Carcass['back']['joint']>;
export const defaultBackJoint:BackJoint={revision:'back-1',mode:'inset',inset:10,depth:6,clearance:.2};
export function setBackPanel(c:Cabinet,patch:Partial<BackJoint>&{thickness?:number}):Cabinet{
 const {thickness,...joint}=patch;
 if(thickness!==undefined&&(!Number.isFinite(thickness)||thickness<3||thickness>24||Math.abs(thickness*10-Math.round(thickness*10))>1e-6))throw Error('Back thickness must be 3–24 mm in 0.1 mm steps.');
 if(joint.mode==='finger')c=setCnc(c,{dogbones:true});
 if(joint.mode==='applied'&&!joint.pilots&&!c.carcass.back.joint?.pilots)joint.pilots={revision:'back-pilot-1',spacing:200,diameter:Math.min(3,backPilotLimits(c).maxDiameter)};
 if(joint.mode==='finger'&&!c.carcass.back.joint?.fingerPitch&&joint.fingerPitch===undefined)joint.fingerPitch=50;
 return {...c,carcass:{...c.carcass,back:{...c.carcass.back,joint:{...defaultBackJoint,...c.carcass.back.joint,...joint}}},materials:{...c.materials,back:{...c.materials.back,stock:thickness?{id:`generic-back-${thickness}`,revision:'1'}:c.materials.back.stock}}};
}

/** One Undo step explicitly adopts the matched captured-back prerequisites. */
export function setBackFastener(c:Cabinet,enabled:boolean):Cabinet{
 const current=c.carcass.back.joint??defaultBackJoint;
 if(enabled)return setBackPanel(c,{mode:'groove',thickness:3,inset:Math.max(11,current.inset),depth:Math.min(6,current.depth),fastener:{id:'hafele-26009765',revision:'rpc-1',perSide:current.fastener?.perSide??2}});
 const {fastener,...joint}=current;
 return {...c,carcass:{...c.carcass,back:{...c.carcass.back,joint}}};
}
