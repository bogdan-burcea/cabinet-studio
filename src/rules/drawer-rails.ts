import type {Cabinet,ProductPin} from '../domain/cabinet';
import {drawerPack,matchingDrawerPacks} from '../catalogue/drawers';
import {drawerFrontSetback,drawerOpenings} from './drawer-layout';
import {stock} from '../catalogue/materials';
/** Longest matched length after back construction and inset-front clearance. */
export function bestDrawerPack(c:Cabinet,openingId:string,pin:ProductPin,inset=0):ProductPin{
 const current=drawerPack(pin),opening=drawerOpenings(c).find(o=>o.id===openingId);
 if(!opening)return pin;
 const choices=matchingDrawerPacks(current).sort((a,b)=>b.nominalLength-a.nominalLength);
 const fitted=choices.find(p=>p.minimumDepth+inset<=opening.size[2])??choices.at(-1)!;
 return {id:fitted.id,revision:fitted.revision};
}
export function fitDrawerRails(c:Cabinet):Cabinet{
 if(!c.drawers?.length)return c;
 const drawers=c.drawers.map(d=>{
  if(d.manualRail)return d;
  const inset=drawerFrontSetback(c,d);
  const pack=bestDrawerPack(c,d.openingId,d.pack,inset);
  return pack.id===d.pack.id?d:{...d,pack};
 });
 return drawers.some((d,i)=>d!==c.drawers![i])?{...c,drawers}:c;
}
