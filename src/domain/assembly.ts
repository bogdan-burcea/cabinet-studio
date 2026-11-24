import type {Cabinet,Vec3} from './cabinet';
export type QuarterTurn=0|90|180|270;
interface AssemblyPlacement {id:string;label:string;position:Vec3;rotation:QuarterTurn;attachedTo?:string;runDirection?:1|-1}
export type AssemblyItem=(AssemblyPlacement&{kind:'cabinet';cabinet:Cabinet;corner?:'blind'})|(AssemblyPlacement&{kind:'space'|'end-panel'|'mid-panel';size:Vec3});
export interface Assembly {id:string;snap:boolean;items:AssemblyItem[]}
export function createAssembly():Assembly{return {id:crypto.randomUUID(),snap:true,items:[]};}
export function assemblySize(item:AssemblyItem):Vec3{return item.kind==='cabinet'?[item.cabinet.envelope.width,item.cabinet.envelope.height,item.cabinet.envelope.depth]:item.size;}
export function validateAssembly(a:Assembly){
 if(!a||typeof a.id!=='string'||!a.id||typeof a.snap!=='boolean'||!Array.isArray(a.items)||a.items.length>100)throw Error('Invalid assembly. Use at most 100 items.');
 const ids=new Set<string>();for(const p of a.items){if(!p||!['cabinet','space','end-panel','mid-panel'].includes(p.kind)||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.label!=='string'||!p.label.trim()||p.label.length>100||![0,90,180,270].includes(p.rotation)||!Array.isArray(p.position)||p.position.length!==3||!p.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=100000))throw Error('Invalid assembly position or identity. Positions must be within ±100,000 mm and rotation in 90° steps.');if(p.kind==='cabinet'&&p.corner!==undefined&&p.corner!=='blind')throw Error('Unsupported corner cabinet type.');if(p.runDirection!==undefined&&p.runDirection!==1&&p.runDirection!==-1)throw Error('Unsupported cabinet run direction.');ids.add(p.id);if(p.attachedTo!==undefined&&(p.kind==='cabinet'||typeof p.attachedTo!=='string'||!a.items.some(parent=>parent.kind==='cabinet'&&parent.id===p.attachedTo)))throw Error('An attached filler must belong to an existing cabinet.');const size=assemblySize(p);if(size.length!==3||!size.every(n=>Number.isFinite(n)&&n>0&&n<=10000))throw Error('Assembly dimensions must be greater than zero and no larger than 10,000 mm.');}
}
