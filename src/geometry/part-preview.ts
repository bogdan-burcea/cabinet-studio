import clipping,{type MultiPolygon,type Polygon} from 'polygon-clipping';
import type {Panel} from './evaluate';
import type {CabineoBore} from '../rules/cabineo';
import type {BackPocket} from '../rules/back-panel';
import {faceAxes} from './banding';
import {partFace} from './part-face';
import {rectProfile,circleProfile,pocketProfiles} from './cut-profiles';
export const svgPath=(shape:MultiPolygon)=>shape.flatMap(p=>p.map(r=>'M'+r.map(q=>q.join(',')).join('L')+'Z')).join('');
/** Clip every visible cut to the finished part silhouette, including reliefs. */
export function partPreview(panel:Panel,bores:CabineoBore[],pockets:BackPocket[],sign:1|-1){
 const face=partFace(panel,bores,sign),[u,v]=faceAxes[panel.orientation],min=panel.center.map((n,i)=>n-panel.size[i]/2),mirror=sign===(face.axis===1?-1:1);
 const round=(n:number)=>Math.round(n*1e6)/1e6;
 const local=(p:Polygon):Polygon=>p.map(r=>r.map(q=>[round(mirror?face.width-(q[0]-min[u]):q[0]-min[u]),round(face.height-(q[1]-min[v]))]));
 const cuts=pockets.filter(p=>p.panelId===panel.id&&(p.face===sign||p.size[p.axis]>=panel.size[p.axis]-.001)),through=cuts.filter(p=>p.size[p.axis]>=panel.size[p.axis]-.001).flatMap(p=>pocketProfiles(p,u,v).map(local)),base=rectProfile(0,0,face.width,face.height),profile:MultiPolygon=through.length?clipping.difference(base,...through):[base];
 const blind=cuts.filter(p=>p.size[p.axis]<panel.size[p.axis]-.001).flatMap(p=>pocketProfiles(p,u,v).map(local));
 const slots=blind.length?clipping.intersection(profile,clipping.union(blind[0],...blind.slice(1))):[];
 const boresByKind=(['housing','receiver','back-fixing'] as const).map(kind=>{const circles=face.bores.filter(b=>b.kind===kind).map(b=>circleProfile(b.x,b.y,b.diameter/2));return {kind,path:circles.length?svgPath(clipping.intersection(profile,clipping.union(circles[0],...circles.slice(1)))):''};});
 return {face,profile,outline:svgPath(profile),slots:svgPath(slots),bores:boresByKind};
}
