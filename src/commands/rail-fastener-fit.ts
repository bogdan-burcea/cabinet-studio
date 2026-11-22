import type {Cabinet} from '../domain/cabinet';
import {resolveCabineo} from '../rules/cabineo';
import {RailCabineoClearanceError} from '../rules/rail-cabineo-clearance';
import {evaluate} from '../geometry/evaluate';
import type {EditRepair} from './edit-repairs';
const dimensions={
 'top-front-rail':['top','frontDepth'],'top-rear-rail':['top','rearDepth'],
 'back-upper-rail':['back','upperHeight'],'back-lower-rail':['back','lowerHeight'],
 'front-upper-rail':['frontRails','top'],'front-lower-rail':['frontRails','bottom']
} as const;
/** Widen only implicated rails. The shared planner supplies the safe positions. */
export function railFastenerFitRepairs(c:Cabinet):EditRepair[]{
 let roles:string[]=[];try{evaluate(c);return [];}catch(e){if(e instanceof RailCabineoClearanceError)roles=e.roles;else try{resolveCabineo(c);return [];}catch(layoutError){if(!(layoutError instanceof RailCabineoClearanceError))return [];roles=layoutError.roles;}}
 const options:EditRepair[]=[];
 const width=(role:string)=>{const [owner,key]=dimensions[role as keyof typeof dimensions];return owner==='frontRails'?c.carcass.frontRails![key as 'top'|'bottom'].width:(c.carcass[owner] as unknown as Record<string,number>)[key];};
 const widen=(changed:string[],delta:number)=>{
  const next=structuredClone(c);
  for(const role of changed){const [owner,key]=dimensions[role as keyof typeof dimensions],value=Math.ceil(width(role))+delta;if(value>600)return;
   if(owner==='frontRails')next.carcass.frontRails![key as 'top'|'bottom'].width=value;else (next.carcass[owner] as unknown as Record<string,number>)[key]=value;
  }
  try{const model=evaluate(next);if(model.issues.some(i=>i.code==='machining-collision'||i.code==='machining-hole-collision'))return;}catch{return;}
  return next;
 };
 for(const role of roles.filter(role=>role in dimensions))for(let delta=1;delta<=600-Math.ceil(width(role));delta++){
  const cabinet=widen([role],delta);if(!cabinet)continue;
  options.push({label:`Widen ${role.replaceAll('-',' ')} to ${Math.ceil(width(role))+delta} mm and place Cabineos with 10 mm clearance`,cabinet});break;
 }
 if(!options.length&&roles.length>1)for(let delta=1;delta<=100;delta++){
  const cabinet=widen(roles,delta);if(!cabinet)continue;
  options.push({label:`Widen adjoining rails by ${delta} mm and place Cabineos with 10 mm clearance`,cabinet});break;
 }
 return options;
}
