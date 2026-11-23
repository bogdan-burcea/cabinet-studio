import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet,type Vec3} from '../src/domain/cabinet';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {defaultHinge} from '../src/catalogue/hinges';
import {evaluate} from '../src/geometry/evaluate';
import {doorOpeningPose,safeDoorAngles} from '../src/rules/door-motion';
import type {FrontBody} from '../src/rules/fronts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function transform(e:ReturnType<typeof evaluate>,door:FrontBody,angle:number,point:Vec3){
 const p=doorOpeningPose(e,door,angle),x=point[0]-p.pivot[0],z=point[2]-p.pivot[2];
 return [p.origin[0]+Math.cos(p.angle)*x+Math.sin(p.angle)*z,point[1],p.origin[2]-Math.sin(p.angle)*x+Math.cos(p.angle)*z];
}
test('155 degree poses match published overlay/inset protrusions at 90 and full opening, mirrored on both hands',()=>{
 for(const placement of ['overlay','inset'] as const){
  const b=addSimpleDoors(createCabinet(),'pair').cabinet,c={...b,fronts:b.fronts.map(d=>({...d,placement,reveal:placement==='inset'?2.5:2,clearance:1.5,hinge:defaultHinge('blum-clip-155')}))},e=evaluate(c),[left,right]=e.fronts.doors;
  for(const angle of [0,20,60,90,120,155]){
   const l=transform(e,left,angle,left.center),r=transform(e,right,angle,right.center);close(l[0]+r[0],600);close(l[2],r[2]);
  }
  for(const door of [left,right]){
   const closed=transform(e,door,0,door.center);closed.forEach((n,i)=>close(n,door.center[i]));
   const sign=door.handing==='left'?1:-1,face=door.handing==='left'?18:582;
   for(const angle of [90,155]){
    const center=transform(e,door,angle,door.center),a=Math.abs(doorOpeningPose(e,door,angle).angle),protrusion=sign*(center[0]-face)+Math.abs(Math.cos(a))*door.size[0]/2+Math.abs(Math.sin(a))*door.size[2]/2;
    close(protrusion,placement==='inset'?16.2:angle===90?-2.3:2.3);
   }
   let last=transform(e,door,0,door.center);
   for(let angle=1;angle<=155;angle++){const next=transform(e,door,angle,door.center);assert.ok(Math.hypot(next[0]-last[0],next[2]-last[2])<8);last=next;}
  }
  const open=safeDoorAngles(e,{},c.fronts.map(d=>d.id),155);assert.equal(open.blocked,false);assert.equal(safeDoorAngles(e,open.angles,c.fronts.map(d=>d.id),0).blocked,false);
 }
});
