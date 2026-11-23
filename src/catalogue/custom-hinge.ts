import type {CustomHingeSpec} from '../domain/cabinet';
export const customHingeLimits={cupDiameter:[10,40],cupDepth:[1,25],screwPitch:[10,80],screwOffset:[-30,30],plateLine:[5,200],platePitch:[10,80],doorPilotDiameter:[1,10],doorPilotDepth:[1,25],platePilotDiameter:[1,10],platePilotDepth:[1,25],maxAngle:[90,180],mountingReach:[1,80],mountingHeight:[10,150],mountingDepth:[10,200],openProtrusion:[0,80],openingAdvance:[0,100]} as const;
export const defaultCustomHinge:CustomHingeSpec={article:'Custom hinge',plate:'Custom mounting plate',cupDiameter:35,cupDepth:12,screwPitch:45,screwOffset:9.5,plateLine:37,platePitch:32,doorPilotDiameter:2.5,doorPilotDepth:10,platePilotDiameter:2.5,platePilotDepth:8,maxAngle:110,mountingReach:12,mountingHeight:48,mountingDepth:56,openProtrusion:20,openingAdvance:32};
export function validCustomHinge(value:unknown):value is CustomHingeSpec{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const spec=value as Record<string,unknown>;
 return Object.keys(spec).length===Object.keys(defaultCustomHinge).length&&['article','plate'].every(key=>typeof spec[key]==='string'&&(spec[key] as string).trim().length>0&&(spec[key] as string).length<=100)&&Object.entries(customHingeLimits).every(([key,[min,max]])=>typeof spec[key]==='number'&&Number.isFinite(spec[key])&&(spec[key] as number)>=min&&(spec[key] as number)<=max&&Math.abs((spec[key] as number)*10-Math.round((spec[key] as number)*10))<1e-6);
}
