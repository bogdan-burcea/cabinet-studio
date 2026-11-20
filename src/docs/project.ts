import type {Cabinet} from '../domain/cabinet';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {cabineoVariants} from '../catalogue/cabineo';
import {BACK_FASTENER} from '../rules/back-fasteners';
import {usesBlumWallHanger} from '../rules/wall-hanging';
import {planSheets} from '../cnc/layout';

export function billOfMaterials(cabinet:Cabinet,model:EvaluatedCabinet,plan:ReturnType<typeof planSheets>){
 const stock=new Map<string,{id:string;label:string;count:number;size:string}>();
 for(const sheet of plan.sheets){
  const line=stock.get(sheet.key);
  if(line)line.count++;
  else stock.set(sheet.key,{id:sheet.key,label:sheet.material,count:1,size:`${sheet.stock.width} × ${sheet.stock.height} mm`});
 }
 const hardware=new Map<string,number>();
 function add(label:string,count=1){if(count>0)hardware.set(label,(hardware.get(label)??0)+count);}
 for(const joint of model.cabineo)add(cabineoVariants[joint.variant].name);
 for(const hinge of model.doorHardware.hinges){add(`Blum hinge ${hinge.article}`);add(`Blum mounting plate ${hinge.plate}`);}
 for(const door of cabinet.fronts){
  if(door.handle.kind==='knob')add('Knob');
  if(door.handle.kind==='pull')add(`Pull handle · ${door.handle.pitch} mm`);
 }
 add(BACK_FASTENER.name,model.backFasteners.length);
 add('Cabinet feet',model.installation.feet.length);
 add('Shelf supports',model.adjustable.shelves.filter(s=>cabinet.contents.some(c=>c.id===s.id&&c.drilling)).length*4);
 add('Applied-back screws',model.drilling.filter(h=>h.id.includes('/back-pilot/')).length);
 if(usesBlumWallHanger(cabinet))add('Blum wall hanger 48N0510',2);
 return {stock:[...stock.values()],hardware:[...hardware].map(([label,count])=>({id:label,label,count}))};
}

export function partLink(base:string,cabinetId:string,partId:string){
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol))throw Error('Enter an HTTP or HTTPS app address.');
 url.hash=new URLSearchParams({cabinet:cabinetId,part:partId}).toString();
 return url.toString();
}
export function linkedPart(hash:string){
 const values=new URLSearchParams(hash.replace(/^#/,''));
 const cabinet=values.get('cabinet'),part=values.get('part');
 return cabinet&&part?{cabinet,part}:null;
}
