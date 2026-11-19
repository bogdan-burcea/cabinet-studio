import type {Cabinet,CncSettings} from '../domain/cabinet';
export type {CncSettings} from '../domain/cabinet';
export const defaultCnc:CncSettings={revision:'cnc-1',tolerance:.2,bitDiameter:6,dogbones:false,throughOpposed:true,cabineoPerSide:0};
export function cnc(c:Cabinet):CncSettings{return c.carcass.machining??defaultCnc;}
export function validateCnc(c:Cabinet){const v=cnc(c);if(v.bottomFace!==undefined&&!['inside','outside'].includes(v.bottomFace))throw Error('Choose inside or outside bottom fastener access.');if(v.revision!=='cnc-1'||!Number.isFinite(v.tolerance)||v.tolerance<0||v.tolerance>10||!Number.isFinite(v.bitDiameter)||v.bitDiameter<1||v.bitDiameter>20||typeof v.dogbones!=='boolean'||typeof v.throughOpposed!=='boolean'||!Number.isInteger(v.cabineoPerSide)||v.cabineoPerSide<0||v.cabineoPerSide>20||[v.tolerance,v.bitDiameter].some(n=>Math.abs(n*10-Math.round(n*10))>1e-6))throw Error('Use 0–10 mm joint fit allowance, a 1–20 mm cutter, and 1–20 Cabineos per side (0 = automatic).');}
export function setCnc(c:Cabinet,patch:Partial<CncSettings>):Cabinet{return {...c,carcass:{...c.carcass,machining:{...cnc(c),...patch}}};}
