import type {Vec3} from '../domain/cabinet';
export type ViewName='perspective'|'isometric'|'front'|'side'|'top'|'rear';
export function viewDirection(view:ViewName):Vec3{
 const directions:Record<ViewName,Vec3>={perspective:[1.25,.8,1.8],isometric:[1.25,.8,1.8],front:[0,0,1],side:[1,0,0],top:[0,1,0],rear:[0,0,-1]};
 return directions[view];
}
/** 3D uses perspective; selecting an elevation automatically uses parallel projection. */
export function perspectiveView(view:ViewName,_flatLayout=false){return view==='perspective'||view==='isometric';}
