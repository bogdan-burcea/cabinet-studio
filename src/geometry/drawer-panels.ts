import type {Panel} from './evaluate';
import type {EvaluatedDrawer} from '../rules/drawers';
export function drawerBoardPanels(drawers:EvaluatedDrawer[],source:Panel):Panel[]{
 return drawers.flatMap(drawer=>drawer.parts.filter(part=>part.material!=='steel').map(part=>{
  const normal=part.id.endsWith('/bottom')?1:2,orientation=normal===1?'xz':'xy';
  return {...source,id:part.id,label:drawer.label+' · '+part.label.replace(/^Drawer /,'').replace(/^16 mm drawer /,'').replace(/^slab front$/i,'Slab front').replace(/^bottom$/,'Bottom').replace(/^back$/,'Back'),role:part.material==='front-stock'?'door':'shelf',orientation,
   size:part.size,center:part.center,coreSize:part.size,coreCenter:part.center,
   materialId:part.material==='front-stock'?source.materialId:'generic-panel-16',materialRevision:'1',grain:'none',edges:[],provenance:drawer.id,
  } as Panel;
 }));
}
