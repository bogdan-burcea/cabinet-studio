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
    for(const p of part.pockets){
      const low = p.low <= -thickness + 1e-6 ? p.low-overcut : p.low;
      const high = p.high >= -1e-6 ? p.high+overcut : p.high;
      const face = makePolygon(p.points.slice(0,-1).map(([px,py])=>transform([px,py,low])));
      const extent = new Vector(direction([0,0,high-low]));
      try { subtract(basicFaceExtrusion(face,extent)); }
      finally { face.delete();extent.delete(); }
    }
    for(const bore of part.bores){
      const start = bore.point.map((n,i)=>n-bore.direction[i]*overcut) as Vec3;
      subtract(makeCylinder(bore.diameter/2,bore.depth+overcut*(bore.through?2:1),transform(start),direction(bore.direction)));
    }
    if(!(measureVolume(shape)>0))throw Error('Machining removed the whole part.');
    return shape;
  }catch(error){shape.delete();throw error;}
}

// A single product lets CAD readers import these named solids as bodies.
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
  const stock=new Set(model.parts.map(part=>part.material));
  if(stock.size===1&&model.parts[0].material)material(model.parts[0].material,`#${definition}`);
  let index=0;
  const named=file.replace(/^(#\d+) = MANIFOLD_SOLID_BREP\('(?:''|[^'])*'/gm,(_match,brep)=>{
    const part=model.parts[index++];
    if(!part)throw Error('STEP contains an extra solid. Review the part cuts.');
    const name=stepName(part.name);
    if(part.material&&stock.size>1){
      const aspect=write('SHAPE_ASPECT',`'${name}','body material',#${shape},.T.`);
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
  let compound:ReturnType<typeof makeCompound>|undefined;
  try{
    for(const part of model.parts){
      try{solids.push(buildSheetSolid(part));}
      catch(error){throw Error(`${part.name}: ${(error as Error).message || 'CAD cut failed.'}`);}
      progress(solids.length,model.parts.length);
    }
    compound=makeCompound(solids);
    const file=await exportSTEP([{shape:compound,name:'StudioBodies',color:'#c7b396'}],{unit:'MM',modelUnit:'MM'}).text();
    return nameAndMaterial(file,model);
  }finally{
    compound?.delete();
    solids.forEach(solid=>solid.delete());
  }
}
