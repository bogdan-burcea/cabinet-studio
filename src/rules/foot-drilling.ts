import type {Cabinet} from '../domain/cabinet';
import {resolveInstallation} from './installation';
import {stock} from '../catalogue/materials';
import type {CabineoBore} from './cabineo';
export function defaultFootDrilling(c:Cabinet){return {revision:'foot-pilot-1' as const,pattern:'rectangle' as const,pitchX:32,pitchZ:32,diameter:3,depth:Math.min(8,stock(c,'carcass').thickness-1),through:true};}
export function footDrilling(c:Cabinet):CabineoBore[]{
 if(c.installation.type!=='feet-concept')return [];
 const d=c.installation.feet.drilling??defaultFootDrilling(c),t=stock(c,'carcass').thickness;
 if(d.revision!=='foot-pilot-1'||!['single','pair','triangle','rectangle'].includes(d.pattern)||typeof d.through!=='boolean'||![d.pitchX,d.pitchZ,d.diameter,d.depth].every(n=>Number.isFinite(n)&&Math.abs(n*10-Math.round(n*10))<1e-6)||d.pitchX<4||d.pitchX>50||d.pitchZ<4||d.pitchZ>50||d.diameter<1||d.diameter>8||d.depth<1)throw Error('Foot pilots need 4–50 mm spacing, Ø1–8 mm, and a positive saved depth.');
 const points=d.pattern==='single'?[[0,0]]:d.pattern==='pair'?[[-d.pitchX/2,0],[d.pitchX/2,0]]:d.pattern==='triangle'?[[-d.pitchX/2,-d.pitchZ/2],[d.pitchX/2,-d.pitchZ/2],[0,d.pitchZ/2]]:[[-d.pitchX/2,-d.pitchZ/2],[d.pitchX/2,-d.pitchZ/2],[-d.pitchX/2,d.pitchZ/2],[d.pitchX/2,d.pitchZ/2]];
 const [ox,oy,oz]=c.envelope.origin;
 if(d.pattern!=='single'&&(d.pitchX<d.diameter+4||['triangle','rectangle'].includes(d.pattern)&&d.pitchZ<d.diameter+4))throw Error('Foot pilot spacing must exceed hole diameter by at least 4 mm.');
 return resolveInstallation(c).feet.flatMap(foot=>points.map(([x,z],i)=>{const p=foot.parts[0].center,px=p[0]+x,pz=p[2]+z;if(px-d.diameter/2-4<ox+t||px+d.diameter/2+4>ox+c.envelope.width-t||pz-d.diameter/2-4<oz||pz+d.diameter/2+4>oz+c.envelope.depth)throw Error('Foot pilot pattern leaves the bottom panel’s 4 mm safety margin. Reduce its spacing or move the feet inward.');return {id:`${foot.id}/pilot/${i}`,group:foot.id,panelId:`${c.id}/panel/bottom`,kind:'foot-pilot' as const,point:[px,oy,pz] as [number,number,number],axis:1 as const,sign:1 as const,diameter:d.diameter,depth:t,through:true};}));
}
