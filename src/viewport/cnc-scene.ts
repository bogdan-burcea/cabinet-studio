import * as THREE from 'three';
import {acrossSign, type FaceSign} from '../cnc/parts';
import type {Placement,Rect} from '../cnc/nesting';
import type {ViewportTheme} from '../design-system/themes';
import type {RenderMode} from './display';
import {panelDisplayEdges, panelDisplayGeometry} from './part-mesh';

export interface CncScene {
  key: string;
  width: number;
  height: number;
  margin: number;
  stock: boolean;
  parts: readonly Placement[];
  sheets?: readonly SceneSheet[];
  offcuts?: readonly Rect[];
}

export type SceneSheet = Rect & {id:string;label:string;margin:number;thickness:number;offcuts:readonly Rect[]};

export function faceUpRotation(part: Placement['part'], face: FaceSign, rotated: boolean) {
  const across = new THREE.Vector3().setComponent(part.u, acrossSign(part.panel, face));
  const up = new THREE.Vector3().setComponent(part.normal, face);
  const along = new THREE.Vector3().setComponent(part.v, -1);
  const flatten = new THREE.Matrix4().makeBasis(across, up, along).transpose();
  return rotated ? new THREE.Matrix4().makeRotationY(-Math.PI / 2).multiply(flatten) : flatten;
}

export function drawCncScene(model: THREE.Group, scene: CncScene, selection: string, reverse: boolean, theme: ViewportTheme, mode: RenderMode,selectedIds:string[]=[selection]) {
  const wire = mode === 'wireframe';
  function frame(x: number, z: number, width: number, height: number, y: number, dashed = false, color = theme.edge) {
    const vertices = [[x, z], [x + width, z], [x + width, z + height], [x, z + height], [x, z]]
      .map(([a, b]) => new THREE.Vector3(a, y, b));
    const material = dashed ? new THREE.LineDashedMaterial({color, dashSize: 10, gapSize: 7})
      : new THREE.LineBasicMaterial({color,toneMapped:false});
    model.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), material).computeLineDistances());
  }
  for(const sheet of scene.sheets??[]){
    const {x,y,width,height,margin,id,offcuts}=sheet, color=selectedIds.includes(id)?theme.handle:theme.stockEdge??theme.edge;
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(width,height),
      new THREE.MeshBasicMaterial({color, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide}));
    bed.rotation.x=-Math.PI/2;
    bed.position.set(x+width/2,-1,y+height/2);
    bed.userData.id=id;
    model.add(bed);
    frame(x,y,width,height,-.5,false,color);
    if(margin)frame(x+margin,y+margin,width-2*margin,height-2*margin,-.5,true,theme.stockEdge??theme.edge);
    for(const [index,cut] of offcuts.entries()){
     const cutId=id+'/offcut/'+index;
     frame(x+cut.x,y+cut.y,cut.width,cut.height,1,true,selection===cutId?theme.handle:theme.stockEdge??theme.edge);
     const proxy=new THREE.Mesh(new THREE.PlaneGeometry(cut.width,cut.height),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
     proxy.rotation.x=-Math.PI/2;proxy.position.set(x+cut.x+cut.width/2,0,y+cut.y+cut.height/2);proxy.userData.id=cutId;model.add(proxy);
    }
  }
  for (const placement of scene.parts) {
    const {part, rotated, x, y, width, height} = placement, active = selectedIds.includes(part.id);
    const geometry = panelDisplayGeometry(part.panel, part.cuts, part.holes);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: active ? theme.selected : theme.panel, roughness: .84, polygonOffset: true,
      polygonOffsetFactor: 1, polygonOffsetUnits: 1, transparent: mode !== 'solid',
      opacity: wire ? 0 : mode === 'transparent' ? .26 : 1, depthWrite: mode === 'solid',
    }));
    const face = reverse && active ? -part.face as FaceSign : part.face;
    mesh.setRotationFromMatrix(faceUpRotation(part, face, rotated));
    mesh.position.set(x + width / 2, part.thickness / 2, y + height / 2);
    mesh.userData.id = part.id;
    mesh.add(new THREE.LineSegments(panelDisplayEdges(part.panel, geometry, part.cuts, part.holes),
      new THREE.LineBasicMaterial({color: wire ? theme.wire : active ? theme.selectedEdge??theme.handle : theme.edge, toneMapped:false, transparent: true, opacity: wire ? 1 : theme.edgeOpacity??.75})));
    model.add(mesh);
  }
}
