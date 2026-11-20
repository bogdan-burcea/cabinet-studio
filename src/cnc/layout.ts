import {defaultSheet,nestStock,nestAssignedStock,type NestOverride,reusableOffcuts,type StockSheet} from './nesting';
import {groupPartsByStock,type FlatPart} from './parts';

export type SheetSettings=Record<string,StockSheet>;
export function planSheets(parts:FlatPart[],settings:SheetSettings,allowance:number,overrides:Record<string,NestOverride>={}){
 const groups=[...groupPartsByStock(parts)].map(([key,entries])=>{
  const options=settings[key]??defaultSheet;
  const stock={...options,gap:options.gap+allowance};
  return {key,entries,options,stock,layout:nestAssignedStock(entries,stock,overrides)};
 });
 return {
  groups,
  sheets:groups.flatMap(group=>group.layout.sheets.map((sheet,index)=>({
   id:`stock/${group.key}/${index}`,...group,sheet,thickness:group.entries[0].thickness,material:group.entries[0].material,
  }))).map((sheet,index)=>({...sheet,label:`Sheet ${index+1}`})),
  unplaced:groups.flatMap(group=>group.layout.unplaced),
 };
}
export type PlannedSheet=ReturnType<typeof planSheets>['sheets'][number];
export function stockOffcuts(entry:PlannedSheet,minimum:number,cutter:number){
 return reusableOffcuts(entry.sheet,entry.stock,minimum,cutter);
}

/** Two sheets per row at model scale, with uniform gutters between actual edges. */
export function sheetOverview(sheets:readonly {width:number;height:number}[],gap=170){
 let x=gap,y=gap,rowHeight=0,width=gap;
 const positions=sheets.map((sheet,index)=>{
  if(index>0&&index%2===0){x=gap;y+=rowHeight+gap;rowHeight=0;}
  const point={x,y};
  x+=sheet.width+gap;
  width=Math.max(width,x);
  rowHeight=Math.max(rowHeight,sheet.height);
  return point;
 });
 return {width,height:y+rowHeight+gap,positions};
}
