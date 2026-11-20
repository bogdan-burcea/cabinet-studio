import {edgeProduct} from '../catalogue/materials';
import type {Vec3} from '../domain/cabinet';
import {pocketProfiles, rectProfile} from '../geometry/cut-profiles';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {acrossSign, flattenParts} from './parts';
import type {NestedSheet, Placement, StockSheet, Rect} from './nesting';

export type Point2 = [number, number];
export type Bore = {id:string; kind:string; point:Vec3; direction:Vec3; diameter:number; depth:number; through:boolean};
export type Pocket = {points:Point2[]; low:number; high:number; through:boolean};
export type SheetPart = {
  name:string; origin:Point2; width:number; height:number; thickness:number;
  bores:Bore[]; pockets:Pocket[];
  frame?: {corner:Vec3; axes:[Vec3,Vec3,Vec3]};
  round?:boolean;
  material?:string;
  role?:'stock'|'offcut';
};
export type ExportModel = {name?:string; parts:SheetPart[]};
export type ExportSheet = ExportModel & {width:number; height:number};

export function toSheetCoordinates(placement: Placement, height:number, x:number, y:number):Point2 {
  return placement.rotated
    ? [placement.x + placement.part.height - y, height - placement.y - x]
    : [placement.x + x, height - placement.y - y];
}

function placedPart(placement:Placement,sheetHeight:number):SheetPart {
    const {part, width, height, x, y} = placement;
    const {panel, face, u, v, normal, thickness} = part;
    const min = panel.coreCenter.map((c,i) => c-panel.coreSize[i]/2);
    const mirror = acrossSign(panel, face) < 0;
    const xy = (a:number,b:number) => toSheetCoordinates(placement,sheetHeight,mirror ? part.width-(a-min[u]) : a-min[u],part.height-(b-min[v]));
    const z = (n:number) => face*(n-panel.coreCenter[normal])-thickness/2;
    const transform = (p:Vec3):Vec3 => [...xy(p[u],p[v]),z(p[normal])];
    const bores:Bore[] = part.holes.map(bore => {
      const point=transform(bore.point), next=[...bore.point] as Vec3;
      next[bore.axis]+=bore.sign;
      const direction=transform(next).map((coordinate,i) => Math.round(coordinate-point[i])) as Vec3;
      return {id:bore.id,kind:bore.kind,point,direction,diameter:bore.diameter,depth:bore.depth,through:!!bore.through || (bore.axis===normal && bore.depth>=thickness-1e-6)};
    });
    const pockets:Pocket[]=[];
    for (const cut of part.cuts) {
      if (cut.axis !== normal) throw Error(`${part.label}: edge routing needs its own setup.`);
      const ends = [z(cut.origin[normal]),z(cut.origin[normal]+cut.size[normal])];
      const low=Math.min(...ends),high=Math.max(...ends),through=high-low>=thickness-1e-6;
      const profile = cut.triangle||cut.outline ? pocketProfiles({...cut,reliefs:[]},u,v)
        : [rectProfile(cut.origin[u],cut.origin[v],cut.size[u],cut.size[v])];
      for (const polygon of profile) pockets.push({points:polygon[0].map(([a,b])=>xy(a,b)),low,high,through});
      for (const relief of cut.reliefs??[]) {
        const [rx,ry]=xy(relief.center[u],relief.center[v]);
        bores.push({id:cut.id,kind:'relief',point:[rx,ry,high],direction:[0,0,-1],diameter:2*relief.radius,depth:high-low,through});
      }
    }
    return {name:part.label,material:part.material,origin:[x,sheetHeight-y-height],width,height,thickness,bores,pockets};
}

function blank(name:string,width:number,height:number,thickness:number,origin:Point2):SheetPart {
  return {name,width,height,thickness,origin,bores:[],pockets:[]};
}

// Millimetres, sheet lower-left in XY and the machining face at Z=0.
export function sheetForExport(sheet:NestedSheet,stock:StockSheet,offcuts:readonly Rect[]=[],includeStock=false):ExportSheet {
  if (!sheet.placements.length) throw Error('Choose a sheet containing parts.');
  const {thickness,material}=sheet.placements[0].part;
  return {width:stock.width,height:stock.height,parts:[
    ...sheet.placements.map(p=>placedPart(p,stock.height)),
    ...offcuts.map(({x,y,width,height},i):SheetPart=>({...blank(`Offcut ${i+1}`,width,height,thickness,[x,stock.height-y-height]),material,role:'offcut'})),
    ...includeStock?[{...blank('Stock sheet',stock.width,stock.height,thickness,[0,0]),material,role:'stock' as const}]:[],
  ]};
}

// CAD uses right-handed Z-up coordinates: the cabinet faces negative Y.
const cabinetToStep=([x,y,z]:Vec3):Vec3=>[x,-z,y];

// Return the flattened cut geometry to its evaluated closed assembly pose.
export function cabinetForExport(cabinet:EvaluatedCabinet,name:string):ExportModel {
  const parts=flattenParts(cabinet).map(part=>{
    const {width,height,panel,u,v,normal,thickness,face}=part;
    const across=acrossSign(panel,face);
    const local=placedPart({part,rotated:false,x:0,y:0,width,height},height);
    const corner=panel.coreCenter.map((n,i)=>n+(i===u?-across*width:i===v?-height:face*thickness)/2) as Vec3;
    const axis=(i:number,sign:number)=>[0,1,2].map(j=>i===j?sign:0) as Vec3;
    return {...local,frame:{corner:cabinetToStep(corner),axes:[cabinetToStep(axis(u,across)),cabinetToStep(axis(v,1)),cabinetToStep(axis(normal,face))] as [Vec3,Vec3,Vec3]}};
  });
  const solid=(label:string,size:Vec3,center:Vec3,round=false,material?:string):SheetPart=>({
    ...blank(label,size[0],size[1],size[2],[0,0]),round,material,
    frame:{corner:cabinetToStep([center[0]-size[0]/2,center[1]-size[1]/2,center[2]+size[2]/2]),axes:[[1,0,0],[0,0,1],[0,-1,0]]},
  });
  const bands=cabinet.panels.flatMap(panel=>panel.edges.filter(edge=>edge.product)
    .map(edge=>solid(`${panel.label} · ${edge.label} band`,edge.size,edge.center,false,edgeProduct(edge.product!).name)));
  const handles=cabinet.fronts.handles.map(handle=>{
    const owner=cabinet.panels.find(p=>p.id===handle.ownerId);
    return solid(`${owner?.label??'Door'} · ${handle.id.split('/').at(-1)}`,handle.size,handle.center,handle.shape==='cylinder');
  });
  const drawerHandles=cabinet.drawers.drawers.flatMap(drawer=>drawer.parts.filter(part=>part.id.includes('/handle/')).map(part=>solid(`${drawer.label} · handle ${part.id.split('/').at(-1)}`,part.size,part.center,part.shape==='cylinder')));
  return {name,parts:[...parts,...bands,...handles,...drawerHandles]};
}

