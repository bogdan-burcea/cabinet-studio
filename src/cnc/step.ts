import {basicFaceExtrusion, exportSTEP, makeBox, makeCompound, makeCylinder, makePolygon, measureVolume, Vector} from 'replicad';
import type {Vec3} from '../domain/cabinet';
import type {ExportModel, SheetPart} from './sheet-export';

const overcut = .001; // Extend tool entry beyond the face without changing cut depth.
const stepName = (s:string) => s.replaceAll('\\','\\X2\\005C\\X0\\').replaceAll("'","''")
  .replace(/[^\x20-\x7e]/g,c=>'\\X2\\'+c.charCodeAt(0).toString(16).padStart(4,'0').toUpperCase()+'\\X0\\');

export function buildSheetSolid(part:SheetPart) {
  const {origin:[x,y],width,height,thickness} = part;
  const direction=(point:Vec3):Vec3=>part.frame
    ? [0,1,2].map(i=>part.frame!.axes.reduce((sum,axis,j)=>sum+axis[i]*point[j],0)) as Vec3
    : point;
  const transform=(point:Vec3):Vec3=>direction(point).map((n,i)=>n+(part.frame?.corner[i]??0)) as Vec3;
  const [a,b]=[transform([x,y,-thickness]),transform([x+width,y+height,0])];
  let shape=part.round?makeCylinder(width/2,thickness,transform([x+width/2,y+height/2,-thickness]),direction([0,0,1]))
    : makeBox(a.map((n,i)=>Math.min(n,b[i])) as Vec3,a.map((n,i)=>Math.max(n,b[i])) as Vec3);
  function subtract(tool: ReturnType<typeof makeBox>) {
    try { const next=shape.cut(tool);shape.delete();shape=next; }
    finally { tool.delete(); }
  }
  try {
    for(const [index,p] of part.pockets.entries()){
      const low = p.low <= -thickness + 1e-6 ? p.low-overcut : p.low;
      const high = p.high >= -1e-6 ? p.high+overcut : p.high;
      // Profile generators may repeat tangent joins or the closing vertex.
      // OpenCascade needs a wire without zero-length edges and closes it itself.
      const points:typeof p.points=[];
      const samePoint=(a:typeof p.points[number],b:typeof p.points[number])=>Math.hypot(a[0]-b[0],a[1]-b[1])<=1e-7;
      for(const point of p.points)if(!points.length||!samePoint(points[points.length-1],point))points.push(point);
      if(points.length>1&&samePoint(points[0],points[points.length-1]))points.pop();
      if(points.length<3)throw Error(`Routed cut ${index+1} has fewer than three distinct outline points.`);
      try {
        const face = makePolygon(points.map(([px,py])=>transform([px,py,low])));
        try {
          const extent = new Vector(direction([0,0,high-low]));
          try { subtract(basicFaceExtrusion(face,extent)); }
          finally { extent.delete(); }
        } finally { face.delete(); }
      } catch(error) {
        throw Error(`CAD cut failed at routed cut ${index+1}. Review the part’s routed profiles.`,{cause:error});
      }
    }
    for(const bore of part.bores){
      const start = bore.point.map((n,i)=>n-bore.direction[i]*overcut) as Vec3;
      subtract(makeCylinder(bore.diameter/2,bore.depth+overcut*(bore.through?2:1),transform(start),direction(bore.direction)));
    }
    if(!(measureVolume(shape)>0))throw Error('Machining removed the whole part.');
    return shape;
  }catch(error){shape.delete();throw error;}
}

// A sheet component contains named solids; ordinary exports retain one product.
function nameAndMaterial(file:string,model:ExportModel){
  let next=0;
  for(const match of file.matchAll(/^#(\d+) =/gm))next=Math.max(next,Number(match[1]));
  const definition=/^#(\d+) = PRODUCT_DEFINITION\(/m.exec(file)?.[1];
  const shape=/^#(\d+) = PRODUCT_DEFINITION_SHAPE\(/m.exec(file)?.[1];
  const context=/^#\d+ = (?:ADVANCED_BREP_)?SHAPE_REPRESENTATION\('(?:''|[^'])*',\s*\([\s\S]*?\),\s*#(\d+)\);/m.exec(file)?.[1];
  if(!definition||!shape||!context)throw Error('STEP product definition is missing.');
  const added:string[]=[];
  const write=(kind:string,body:string)=>{const id=++next;added.push(`#${id} = ${kind}(${body});`);return id;};
  function material(name:string,target:string){
    const item=write('DESCRIPTIVE_REPRESENTATION_ITEM',`'${stepName(name)}',''`);
    const representation=write('REPRESENTATION',`'material name',(#${item}),#${context}`);
    const property=write('PROPERTY_DEFINITION',`'material property','material name',${target}`);
    write('PROPERTY_DEFINITION_REPRESENTATION',`#${property},#${representation}`);
  }
  const componentNames=[...new Set(model.parts.map(p=>p.component??'StudioBodies'))];
  const definitions=[...file.matchAll(/^#(\d+) = PRODUCT_DEFINITION\(/gm)].map(m=>m[1]);
  const shapes=[...file.matchAll(/^#(\d+) = PRODUCT_DEFINITION_SHAPE\(/gm)].map(m=>m[1]);
  const uniform=new Set<string>();
  for(const [i,name] of componentNames.entries()){
   const parts=model.parts.filter(p=>(p.component??'StudioBodies')===name),materials=new Set(parts.map(p=>p.material));
   if(materials.size===1&&parts[0].material){if(!definitions[i])throw Error('STEP sheet component is missing.');material(parts[0].material,`#${definitions[i]}`);uniform.add(name);}
  }
  let index=0;
  const named=file.replace(/^(#\d+) = MANIFOLD_SOLID_BREP\('(?:''|[^'])*'/gm,(_match,brep)=>{
    const part=model.parts[index++];
    if(!part)throw Error('STEP contains an extra solid. Review the part cuts.');
    const name=stepName(part.name);
    if(part.material&&!uniform.has(part.component??'StudioBodies')){
      const component=componentNames.indexOf(part.component??'StudioBodies');
      const aspect=write('SHAPE_ASPECT',`'${name}','body material',#${shapes[component]??shape},.T.`);
      material(part.material,`#${aspect}`);
    }
    return `${brep} = MANIFOLD_SOLID_BREP('${name}'`;
  });
  if(index!==model.parts.length)throw Error('STEP body count differs from the model. Review the part cuts.');
  const name=stepName(model.name??'Nested sheet');
  return named.replace(/PRODUCT\('StudioBodies','StudioBodies'/,()=>`PRODUCT('${name}','${name}'`)
    .replace(/FILE_NAME\('[^']*'/,()=>`FILE_NAME('${name}'`)
    .replace(/ENDSEC;(?=\s*END-ISO-10303-21;)/,()=>`${added.join('\n')}\nENDSEC;`);
}

export async function exportSheetStep(model:ExportModel, progress:(done:number,total:number)=>void=()=>{}) {
  if(!model.parts.length)throw Error('There are no parts to export.');
  const solids:ReturnType<typeof buildSheetSolid>[]=[];
  const compounds:ReturnType<typeof makeCompound>[]=[];
  try{
    for(const part of model.parts){
      try{solids.push(buildSheetSolid(part));}
      catch(error){throw Error(`${part.name}: ${(error as Error).message || 'CAD cut failed.'}`);}
      progress(solids.length,model.parts.length);
    }
    const groups=[...new Set(model.parts.map(p=>p.component??'StudioBodies'))];
    const shapes=groups.map(name=>{const compound=makeCompound(solids.filter((_,i)=>(model.parts[i].component??'StudioBodies')===name));compounds.push(compound);return {shape:compound,name,color:'#c7b396'};});
    const file=await exportSTEP(shapes,{unit:'MM',modelUnit:'MM'}).text();
    return nameAndMaterial(file,model);
  }finally{
    compounds.forEach(compound=>compound.delete());
    solids.forEach(solid=>solid.delete());
  }
}
