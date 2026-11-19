import {validHardware} from '../catalogue/cabineo';
import type {Cabinet,Compartment} from './cabinet';
/** The small UX sandbox has independent storage and never strips an advanced file. */
function interiorsOnly(node:Compartment):boolean{return node.kind==='opening'||(['horizontal','vertical'].includes(node.axis)&&(node.frontSetback??0)===0&&node.children.every(interiorsOnly));}
export function isSimpleCabinet(c:Cabinet):boolean{
 return c.carcass.top.mode==='full'&&c.carcass.back.mode==='full'&&interiorsOnly(c.compartments)&&c.contents.length===0&&c.fronts.length===0&&!(c.drawers?.length)&&c.installation.type==='unassigned'&&c.installation.mounting.mode==='none'&&!c.installation.plinth.enabled&&Object.keys(c.banding).length===0&&validHardware(c.hardware);
}
