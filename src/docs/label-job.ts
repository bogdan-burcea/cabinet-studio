import type {FlatPart} from '../cnc/parts';
import type {planSheets} from '../cnc/layout';
import {stockOffcuts} from '../cnc/layout';
import type {Vec3} from '../domain/cabinet';
export type LabelMap={assembly:FlatPart[];sheets:{label:string;width:number;height:number;thickness:number;items:{id:string;x:number;y:number;width:number;height:number;rotated:boolean;offcut:boolean}[]}[]};
/** Same nested layout and reusable rectangle policy as Cut/costs; IDs remain stable. */
export function labelJob(parts:FlatPart[],plan:ReturnType<typeof planSheets>,cutter:number){
 const labels=[...parts];
 const sheets=plan.sheets.map(sheet=>{
  const offcuts=stockOffcuts(sheet,150,cutter),source=sheet.entries[0];
  const extra=offcuts.map((rect,i)=>{
   const id=`${sheet.id}/offcut/${i}`,label=`${sheet.label} · Offcut ${i+1}`;
   const size=[0,0,0] as Vec3;size[source.u]=rect.width;size[source.v]=rect.height;size[source.normal]=sheet.thickness;
   const center=size.map(n=>n/2) as Vec3;
   labels.push({...source,id,label,width:rect.width,height:rect.height,grain:'none',twoSided:false,edgeOperations:0,holes:[],cuts:[],panel:{...source.panel,id,label,size,center,coreSize:size,coreCenter:center}});
   return {id,...rect,rotated:false,offcut:true};
  });
  return {label:sheet.label,width:sheet.stock.width,height:sheet.stock.height,thickness:sheet.thickness,items:[...sheet.sheet.placements.map(p=>({id:p.part.id,x:p.x,y:p.y,width:p.width,height:p.height,rotated:p.rotated,offcut:false})),...extra]};
 });
 return {parts:labels,map:{assembly:parts,sheets} satisfies LabelMap};
}
