import type {ProductPin} from '../domain/cabinet';
// Adapted from Cabinet Workshop workbench/cabineo.js (read-only reference).
// Lamello operating instructions 26 February 2024, pp.1–2, surface collar option 1.
export const cabineoVariants = {
 'cabineo-8': {name:'Cabineo 8', screwDepth:8, article:'267.91.251'},
 'cabineo-12': {name:'Cabineo 12', screwDepth:12, article:'267.91.252'}
} as const;
export type CabineoId = keyof typeof cabineoVariants;
export const CABINEO_REVISION='surface-1';
export function validHardware(value:unknown):value is ProductPin[]{
 return Array.isArray(value)&&(value.length===0||(value.length===1&&!!value[0]&&Object.keys(value[0]).length===2&&Object.hasOwn(cabineoVariants,value[0].id)&&value[0].revision===CABINEO_REVISION));
}
