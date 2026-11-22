import type {Cabinet} from '../domain/cabinet';
export const SIDE_NOTCH_DEPTH=8;
export function wallHangingRearOffset(c:Cabinet){return c.cabinetType==='wall'&&c.installation.mounting.mode==='suspended-concept'&&c.installation.mounting.geometry.id==='blum-48n0510'&&(c.installation.mounting.sideNotch??0)>0?SIDE_NOTCH_DEPTH:0;}
