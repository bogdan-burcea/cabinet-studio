import {usesBlumWallHanger} from '../rules/wall-hanging';
import {validHardware} from '../catalogue/cabineo';
import type {Cabinet,Compartment} from './cabinet';
/** The small UX sandbox has independent storage and never strips an advanced file. */
function interiorsOnly(node:Compartment):boolean{return node.kind==='opening'||(['horizontal','vertical'].includes(node.axis)&&node.children.every(interiorsOnly));}
export function isSimpleCabinet(c:Cabinet):boolean{
 return c.carcass.top.mode==='full'&&c.carcass.back.mode==='full'&&interiorsOnly(c.compartments)&&c.contents.every(s=>!!s.drilling)&&c.fronts.every(d=>d.material===null)&&['unassigned','floor','feet-concept'].includes(c.installation.type)&&(c.installation.mounting.mode==='none'||usesBlumWallHanger(c))&&c.installation.plinth.material===null&&Object.keys(c.banding).length===0&&validHardware(c.hardware);
}
