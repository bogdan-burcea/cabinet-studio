import {cnc} from '../rules/cnc';
import type {Cabinet} from '../domain/cabinet';
import {woodPilotDiameter} from '../catalogue/pilots';
import {defaultFootDrilling} from '../rules/foot-drilling';
import {backPilotLimits} from '../rules/applied-back';
export function standardisePilotHoles(c:Cabinet,diameter=woodPilotDiameter):Cabinet{
 const feet=c.installation.feet,joint=c.carcass.back.joint;
 const installation=feet.drilling||c.installation.type==='feet-concept'?{...c.installation,feet:{...feet,drilling:{...(feet.drilling??defaultFootDrilling(c)),diameter}}}:c.installation;
 const max=backPilotLimits(c).maxDiameter;
 const back=joint?.mode==='applied'?{...c.carcass.back,joint:{...joint,pilots:{revision:'back-pilot-1' as const,spacing:joint.pilots?.spacing??200,diameter}}}:c.carcass.back;
 return {...c,installation,carcass:{...c.carcass,back,machining:{...cnc(c),pilotDiameter:diameter}}};
}
