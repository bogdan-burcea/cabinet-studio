import type {Cabinet,Carcass} from '../domain/cabinet';
export type BackJoint=NonNullable<Carcass['back']['joint']>;
export const defaultBackJoint:BackJoint={revision:'back-1',mode:'inset',inset:10,depth:6,clearance:.2};
export function setBackPanel(c:Cabinet,patch:Partial<BackJoint>&{thickness?:number}):Cabinet{
 const {thickness,...joint}=patch;
 return {...c,carcass:{...c.carcass,back:{...c.carcass.back,joint:{...defaultBackJoint,...c.carcass.back.joint,...joint}}},materials:{...c.materials,back:{...c.materials.back,stock:thickness?{id:`generic-back-${thickness}`,revision:'1'}:c.materials.back.stock}}};
}

/** One Undo step explicitly adopts the matched captured-back prerequisites. */
export function setBackFastener(c:Cabinet,enabled:boolean):Cabinet{
 const current=c.carcass.back.joint??defaultBackJoint;
 if(enabled)return setBackPanel(c,{mode:'groove',thickness:3,inset:Math.max(11,current.inset),depth:Math.min(6,current.depth),fastener:{id:'hafele-26009765',revision:'rpc-1',perSide:current.fastener?.perSide??2}});
 const {fastener,...joint}=current;
 return {...c,carcass:{...c.carcass,back:{...c.carcass.back,joint}}};
}
