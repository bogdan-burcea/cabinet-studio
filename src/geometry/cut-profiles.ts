import type {Polygon} from 'polygon-clipping';
import type {BackPocket} from '../rules/back-panel';
const precision=(n:number)=>Math.round(n*1e6)/1e6;
const clean=(p:Polygon):Polygon=>p.map(r=>r.map(q=>[precision(q[0]),precision(q[1])]));
export const rectProfile=(x:number,y:number,w:number,h:number):Polygon=>clean([[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]);
export const circleProfile=(x:number,y:number,r:number):Polygon=>{const ring=Array.from({length:48},(_,i)=>[precision(x+Math.cos(i*Math.PI/24)*r),precision(y+Math.sin(i*Math.PI/24)*r)] as [number,number]);ring.push([...ring[0]]);return [ring];};
export function pocketProfiles(p:BackPocket,u:number,v:number,ou=0,ov=0):Polygon[]{if(p.triangle){const ring=p.triangle.map(q=>[q[u]-ou,q[v]-ov] as [number,number]);return [clean([[...ring,ring[0]]])];}return [rectProfile(p.origin[u]-ou,p.origin[v]-ov,p.size[u],p.size[v]),...(p.reliefs??[]).map(r=>circleProfile(r.center[u]-ou,r.center[v]-ov,r.radius))];}
