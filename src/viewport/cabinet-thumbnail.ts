import * as THREE from 'three';
import type {EvaluatedCabinet} from '../geometry/evaluate';
import {physicalPanels,physicalPockets,type ShakerPanel} from '../rules/shaker';
import {panelDisplayGeometry,panelDisplayEdges} from './part-mesh';
import {drawerDisplayGeometry,drawerDisplayEdges} from './drawer-mesh';
import {flattenParts} from '../cnc/parts';
import {fitCamera} from './camera-fit';
/** A closed, complete perspective snapshot; independent of the editor's camera and visibility. */
export function cabinetThumbnail(model:EvaluatedCabinet):string{
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);scene.background=new THREE.Color('#f7f7f7');
 try{
 renderer.setSize(480,360);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.HemisphereLight('#ffffff','#53616c',2));const light=new THREE.DirectionalLight('#ffffff',2.5);light.position.set(1500,2500,2200);scene.add(light);
 const cuts=physicalPockets(model),bores=model.shaker.bores;
 const add=(g:THREE.BufferGeometry,edge:THREE.BufferGeometry,center:number[],glass=false,metal=false)=>{const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:metal?'#b7bfc4':'#cececa',roughness:glass?.15:.82,metalness:metal?.35:0,transparent:glass,opacity:glass?.22:1,depthWrite:!glass,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));mesh.position.set(...center as [number,number,number]);mesh.add(new THREE.LineSegments(edge,new THREE.LineBasicMaterial({color:'#596168',transparent:true,opacity:.65})));root.add(mesh);};
 for(const p of physicalPanels(model)){const g=panelDisplayGeometry(p,cuts,bores);add(g,panelDisplayEdges(p,g,cuts,bores),p.coreCenter,!!(p as ShakerPanel).glass);}
 const boards=new Map(flattenParts(model).map(p=>[p.id,p]));
 for(const p of model.drawers.drawers.flatMap(d=>d.parts)){const board=boards.get(p.id),g=board?panelDisplayGeometry(board.panel,cuts,bores):drawerDisplayGeometry(p);add(g,board?panelDisplayEdges(board.panel,g,cuts,bores):drawerDisplayEdges(p,g),p.center,false,p.material==='steel');}
 for(const p of model.fronts.handles){const g=p.shape==='cylinder'?new THREE.CylinderGeometry(p.size[0]/2,p.size[0]/2,p.size[2],16).rotateX(Math.PI/2):new THREE.BoxGeometry(...p.size);add(g,new THREE.EdgesGeometry(g),p.center,false,true);}
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),camera=new THREE.PerspectiveCamera(36,480/360,1,50000);fitCamera(camera,bounds,new THREE.Vector3(1.25,.8,1.8),{width:480,height:360,usableHeight:360});renderer.render(scene,camera);
 return renderer.domElement.toDataURL('image/webp',.8);
 }finally{root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.forceContextLoss();}
}
