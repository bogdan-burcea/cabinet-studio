import {defaultFootDrilling} from '../rules/foot-drilling';
import type {Cabinet,Installation} from '../domain/cabinet';
/** Contextual base support edits reuse pinned installation geometry and validation. */
export function setSimpleSupport(c:Cabinet,type:'unassigned'|'feet-concept'):Cabinet{
 const installation={...c.installation,type,feet:{...c.installation.feet,...type==='feet-concept'&&!c.installation.feet.drilling?{drilling:defaultFootDrilling(c)}:{}},plinth:{...c.installation.plinth,...type==='unassigned'?{enabled:false}:{}}};
 return {...c,installation};
}
export function setSimpleFeet(c:Cabinet,patch:Partial<Installation['feet']>):Cabinet{return {...c,installation:{...c.installation,feet:{...c.installation.feet,...patch}}};}
export function setSimplePlinth(c:Cabinet,patch:Partial<Installation['plinth']>):Cabinet{
 return {...c,installation:{...c.installation,...patch.enabled?{type:'feet-concept' as const}:{},plinth:{...c.installation.plinth,...patch.enabled&&c.installation.plinth.footGap===undefined?{footGap:5}:{},...patch}}};
}
