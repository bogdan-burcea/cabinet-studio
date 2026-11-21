import {usesBlumWallHanger} from '../rules/wall-hanging';
import {validHardware} from '../catalogue/cabineo';
import type {Cabinet,Compartment} from './cabinet';
/** The small UX sandbox has independent storage and never strips an advanced file. */
function interiorsOnly(node:Compartment):boolean{return node.kind==='opening'||(['horizontal','vertical'].includes(node.axis)&&node.children.every(interiorsOnly));}
export function isSimpleCabinet(c:Cabinet):boolean{
 return ['full','rails','open'].includes(c.carcass.top.mode)&&['full','rails','open'].includes(c.carcass.back.mode)&&interiorsOnly(c.compartments)&&c.contents.every(s=>!!s.drilling)&&c.fronts.every(d=>d.material===null)&&['unassigned','floor','feet-concept'].includes(c.installation.type)&&(c.installation.mounting.mode==='none'||usesBlumWallHanger(c))&&c.installation.plinth.material===null&&Object.keys(c.banding).length===0&&validHardware(c.hardware);
}
