import {panelDisplayGeometry,panelDisplayEdges} from './part-mesh';
import {fitCamera, updateProjection, type CabinetCamera} from './camera-fit';
import {explodedLayout,type RenderMode} from './display';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Axis, Cabinet, Vec3 } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { inspectionRotation } from './front-pose';
import {openingPivot} from '../rules/door-motion';
import { pickCabinetElement } from './picking';
import { finishColor, type ViewportTheme } from '../design-system/themes';
export type ViewName = 'isometric' | 'front' | 'side' | 'top' | 'rear';
export interface DimensionAnchor { axis: Axis; x: number; y: number; handleX: number; handleY: number }
interface Callbacks {
  usableHeight?(): number; editDivision?():void;
  select(id: string,additive?:boolean): void; dragStart(): void; preview(axis: Axis, value: number): void; commit(): void; cancel(): void;
  anchors(anchors: DimensionAnchor[]): void; divisionAnchor(point: { x: number; y: number } | null): void; previewDivision(id: string, value: number): void;
}
export class CabinetViewport {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(36, 1, 1, 50000);
  private elevation = new THREE.OrthographicCamera(-500, 500, 500, -500, 1, 50000);
  private camera: CabinetCamera = this.perspective;
  private controls: OrbitControls;
  private model = new THREE.Group();
  private handles = new THREE.Group();
  private dimensions = new THREE.Group();
  private grid = new THREE.GridHelper(5000, 50, '#ffffff', '#ffffff');
  private raycaster = new THREE.Raycaster();
  private resizeObserver: ResizeObserver;
  private cabinet!: Cabinet;
  private geometry!: EvaluatedCabinet;
  private selected = '';
  private explosion = 0;
  private theme!: ViewportTheme;
  private down: { x: number; y: number } | null = null;
  private drag: { axis: Axis; x: number; y: number; initial: number; px: number; py: number; featureId?: string; centre?: number } | null = null;
  private disposed = false;
  private doorGroups=new Map<string,{group:THREE.Group;handing:'left'|'right';target:number}>();
  private displayedAngles=new Map<string,number>();
  private frameTime=0;
  constructor(private host: HTMLElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', '3D cabinet. Arrow keys orbit, plus and minus zoom, F fits. Use dimension fields to resize.');
    this.renderer.domElement.setAttribute('role', 'img');
    host.prepend(this.renderer.domElement);
    this.scene.add(this.model, this.handles, this.dimensions, this.grid);
    this.scene.add(new THREE.HemisphereLight('#fff9ee', '#687b83', 2.7));
    const key = new THREE.DirectionalLight('#ffffff', 3.2); key.position.set(1500, 2500, 2200); this.scene.add(key);
    const fill = new THREE.DirectionalLight('#dce5eb', 1.4); fill.position.set(-1200, 700, -800); this.scene.add(fill);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 250; this.controls.maxDistance = 12000;
    this.controls.maxPolarAngle = Math.PI * 0.98;
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.pointerDown, true);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('keydown', this.keyDown);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host);
    this.resize();
    this.renderer.setAnimationLoop((time) => { if (this.disposed) return; const delta=Math.min(.05,Math.max(0,(time-this.frameTime)/1000));this.frameTime=time;for(const [id,entry] of this.doorGroups){const current=this.displayedAngles.get(id)??0,next=current+Math.sign(entry.target-current)*Math.min(Math.abs(entry.target-current),120*delta);this.displayedAngles.set(id,next);entry.group.rotation.y=inspectionRotation(entry.handing,next);} this.controls.update(); this.renderer.render(this.scene, this.camera); this.updateAnchors(); });
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(width, height); updateProjection(this.camera, this.area());
  }
  private clear(group: THREE.Group) {
    for (const child of [...group.children]) {
      child.traverse(obj => { const mesh = obj as THREE.Mesh; mesh.geometry?.dispose(); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose()); });
      group.remove(child);
    }
  }
  update(cabinet: Cabinet, geometry: EvaluatedCabinet, selected: string, theme: ViewportTheme, preview: boolean, cutaway: boolean, plinthVisible: boolean, frontsVisible:boolean, doorAngles:Record<string,number>,renderMode:RenderMode='solid',explosion=0,selectedIds:string[]=[selected],hiddenIds:string[]=[]) {
    this.explosion=explosion;
    const first = !this.cabinet; this.cabinet = cabinet; this.geometry = geometry; this.theme = theme; this.selected = selected;
    this.scene.background = new THREE.Color(theme.background);
    (this.grid.material as THREE.LineBasicMaterial).color.set(theme.grid);
    (this.grid.material as THREE.Material).transparent = true; (this.grid.material as THREE.Material).opacity = 0.007; // 20% of the previous grid intensity.
    (this.grid.material as THREE.Material).depthWrite = false;
    this.clear(this.model); this.clear(this.handles); this.clear(this.dimensions);
    const frontGroups=new Map<string,THREE.Group>();this.doorGroups.clear();
    if(frontsVisible)for(const door of geometry.fronts.doors.filter(d=>!hiddenIds.includes(d.id))){const group=new THREE.Group();group.position.set(...openingPivot(door));const target=explosion?0:doorAngles[door.id]??0;if(explosion)this.displayedAngles.set(door.id,0);group.rotation.y=inspectionRotation(door.handing,this.displayedAngles.get(door.id)??0);this.doorGroups.set(door.id,{group,handing:door.handing,target});frontGroups.set(door.id,group);this.model.add(group);}
    const offsets=explodedLayout(geometry.panels,explosion);
    const attach=(mesh:THREE.Object3D,center:Vec3,id:string)=>{const group=frontGroups.get(id);mesh.position.set(...center);const panel=geometry.panels.find(p=>p.id===id);if(panel&&explosion)mesh.position.add(new THREE.Vector3(...offsets.get(panel.id)!));if(group){mesh.position.sub(group.position);group.add(mesh);}else this.model.add(mesh);};
    for (const panel of geometry.panels) {
      if(hiddenIds.includes(panel.id))continue;
      if(panel.role==='door'&&!frontsVisible)continue;
      if (panel.installationPart === 'plinth' && !plinthVisible) continue;
      const isSelected = selectedIds.includes(panel.id);
      const material = new THREE.MeshStandardMaterial({ color: preview ? theme.ghost : isSelected ? theme.selected : finishColor(panel.finish.id, theme),
        polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1, roughness: 0.82, metalness: 0, transparent: (cutaway && panel.constructionPart === 'back') || preview, opacity: cutaway && panel.constructionPart === 'back' ? 0.12 : preview ? 0.68 : 1 });
      const mesh = new THREE.Mesh(panelDisplayGeometry(panel,geometry.pockets,[...geometry.cabineo.flatMap(j=>j.bores),...geometry.backFasteners,...geometry.drilling]), material);
      mesh.position.set(...panel.coreCenter); mesh.userData.id = panel.id; mesh.userData.pickKind = panel.role==='door'?'front':panel.role === 'shelf' || panel.role === 'divider' ? 'interior' : panel.constructionPart === 'back' ? 'back' : 'part'; mesh.userData.pickThrough = cutaway && panel.constructionPart === 'back';
      const edge = new THREE.LineSegments(panelDisplayEdges(panel,mesh.geometry,geometry.pockets,[...geometry.cabineo.flatMap(j=>j.bores),...geometry.backFasteners,...geometry.drilling]), new THREE.LineBasicMaterial({ color: isSelected ? theme.selected : renderMode==='wireframe'?theme.wire:theme.edge, transparent: true, opacity: renderMode==='wireframe'?1:(theme.edgeOpacity??.65) }));

      mesh.add(edge); attach(mesh,panel.coreCenter,panel.id);
      for (const band of panel.edges.filter(edge => edge.product)) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(...band.size), material.clone()); strip.position.set(...band.center); strip.userData.id = panel.id; strip.userData.pickKind = mesh.userData.pickKind; strip.userData.pickThrough = mesh.userData.pickThrough;
        if (isSelected) strip.add(new THREE.LineSegments(new THREE.EdgesGeometry(strip.geometry), new THREE.LineBasicMaterial({ color: theme.handle, transparent: true, opacity: 0.9 })));
        attach(strip,band.center,panel.id);
      }
    }
    if(frontsVisible)for(const part of geometry.fronts.handles.filter(p=>!hiddenIds.includes(p.ownerId))){
      const shape=part.shape==='cylinder'?new THREE.CylinderGeometry(part.size[0]/2,part.size[0]/2,part.size[2],24):new THREE.BoxGeometry(...part.size);
      const mesh=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({color:preview?theme.ghost:theme.frontHandle,metalness:0.65,roughness:0.35,transparent:preview,opacity:preview?0.65:1}));if(part.shape==='cylinder')mesh.rotation.x=Math.PI/2;
      mesh.userData.id=part.ownerId;mesh.userData.pickKind='front';attach(mesh,part.center,part.ownerId);
    }
    for(const drawer of geometry.drawers.drawers)for(const part of drawer.parts){
      const active=selected===drawer.id,metal=part.material==='steel';
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...part.size),new THREE.MeshStandardMaterial({color:preview?theme.ghost:active?theme.selected:metal?'#e2e4e5':theme.panel,roughness:metal?.45:.82,metalness:metal?.35:0,transparent:preview,opacity:preview?.65:1}));
      mesh.position.set(...part.center);mesh.position.z+=part.moving?(doorAngles[drawer.id]??0)*5:0;
      mesh.userData.id=drawer.id;mesh.userData.pickKind='interior';
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:active?theme.selected:theme.edge,transparent:true,opacity:.5})));this.model.add(mesh);
    }
    if(renderMode!=='solid')this.model.traverse(object=>{
      if(object instanceof THREE.Mesh){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){material.transparent=true;material.opacity=object.userData.accessory?(renderMode==='wireframe'?.18:.65):object.userData.bore?.7:renderMode==='wireframe'?0:.23;material.depthWrite=false;material.side=THREE.DoubleSide;material.forceSinglePass=true;}}
    });
    for (const pad of geometry.adjustable.supports) {
      if(cabinet.contents.find(s=>s.id===pad.ownerId)?.drilling)continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...pad.size), new THREE.MeshStandardMaterial({ color: preview ? theme.ghost : selected === pad.ownerId ? theme.selected : theme.support, roughness: 0.6, transparent: preview, opacity: preview ? 0.65 : 1 }));
      mesh.position.set(...pad.center); mesh.userData.id = pad.ownerId; mesh.userData.pickKind = 'interior'; this.model.add(mesh);
    }
    for (const part of geometry.mounting.parts) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...part.size), new THREE.MeshStandardMaterial({ color: preview ? theme.ghost : selected === part.id ? theme.selected : theme.mounting, roughness: 0.6, metalness: 0.2, transparent: preview, opacity: preview ? 0.65 : 1 }));
      mesh.position.set(...part.center); mesh.userData.id = part.id;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: theme.edge })));
      this.model.add(mesh);
    }
    const { width: w, height: h, depth: d, origin: [ox, oy, oz] } = cabinet.envelope;
    this.grid.position.set(ox + w / 2, geometry.installation.floorY - 1, oz + d / 2);
    for (const space of geometry.openings) {
      if(explosion)break;
      if(hiddenIds.includes(space.id))continue;
      const opening = new THREE.Mesh(new THREE.PlaneGeometry(space.size[0], space.size[1]), new THREE.MeshBasicMaterial({ visible: selectedIds.includes(space.id), side: THREE.DoubleSide, color: theme.selected, transparent: true, opacity: 0.1, depthWrite: false }));
      opening.position.set(space.origin[0] + space.size[0] / 2, space.origin[1] + space.size[1] / 2, space.origin[2] + space.size[2] - 1);
      opening.userData.id = space.id; opening.userData.pickKind = 'opening'; this.model.add(opening);
    }
    const activeDivision = [...geometry.divisions, ...geometry.adjustable.shelves].find(d => d.id === selected&&!hiddenIds.includes(d.id));
    if (activeDivision) {
      const axis = activeDivision.axis === 'horizontal' ? 1 : 0, cross = 1 - axis;
      for (const position of ('legalPositions' in activeDivision ? activeDivision.legalPositions as number[] : [activeDivision.min, (activeDivision.min + activeDivision.max) / 2, activeDivision.max])) {
        const start = new THREE.Vector3(...activeDivision.origin), end = start.clone();
        start.setComponent(axis, activeDivision.origin[axis] + activeDivision.size[axis] / 2 + position - activeDivision.position);
        start.z += activeDivision.size[2] + 2; end.copy(start); end.setComponent(cross, start.getComponent(cross) + activeDivision.size[cross]);
        this.dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), new THREE.LineDashedMaterial({ color: theme.ghost, transparent: true, opacity: 0.5, dashSize: 8, gapSize: 6 })).computeLineDistances());
      }
    }
    const specs: [Axis, Vec3, Vec3, Vec3][] = [
      ['width', [0, -80, d + 45], [w, -80, d + 45], [w, -80, d + 45]],
      ['height', [-85, 0, d + 45], [-85, h, d + 45], [-85, h, d + 45]],
      ['depth', [w + 85, -40, 0], [w + 85, -40, d], [w + 85, -40, d]]
    ];
    for (const [axis, from, to, handle] of specs) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to].map(v => new THREE.Vector3(v[0] + ox, v[1] + oy, v[2] + oz))), new THREE.LineBasicMaterial({ color: theme.handle, transparent: true, opacity: 0.65 })); this.dimensions.add(line);
      for (const point of [from, to]) {
        const delta: Vec3 = axis === 'height' ? [12, 0, 0] : [0, 12, 0];
        const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([-1, 1].map(sign => new THREE.Vector3(point[0] + ox + sign * delta[0], point[1] + oy + sign * delta[1], point[2] + oz))), new THREE.LineBasicMaterial({ color: theme.handle })); this.dimensions.add(tick);
      }
      const ball = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), new THREE.MeshBasicMaterial({ color: theme.handle, depthTest: false }));
      ball.renderOrder = 10; ball.position.set(handle[0] + ox, handle[1] + oy, handle[2] + oz); ball.userData.axis = axis; this.handles.add(ball);
    }
    this.handles.visible=!explosion;this.dimensions.visible=!explosion;
    if (first) this.view('isometric');
  }
  private project(point: THREE.Vector3) {
    const v = point.clone().project(this.camera); return { x: (v.x + 1) * this.host.clientWidth / 2, y: (1 - v.y) * this.host.clientHeight / 2 };
  }
  private updateAnchors() {
    if (!this.cabinet) return;
    const { width: w, height: h, depth: d, origin: [x, y, z] } = this.cabinet.envelope;
    const positions: [Axis, Vec3][] = [['width', [w / 2, -80, d + 45]], ['height', [-85, h / 2, d + 45]], ['depth', [w + 85, -40, d / 2]]];
    const division = [...this.geometry.divisions, ...this.geometry.adjustable.shelves].find(d => d.id === this.selected);
    this.callbacks.divisionAnchor(division ? this.project(new THREE.Vector3(division.origin[0] + division.size[0] / 2, division.origin[1] + division.size[1] / 2, division.origin[2] + division.size[2] + 12)) : null);
    this.callbacks.anchors(positions.map(([axis, p]) => {
      const handle = this.handles.children.find(h => h.userData.axis === axis)!;
      const at = this.project(handle.position);
      return { axis, ...this.project(new THREE.Vector3(p[0] + x, p[1] + y, p[2] + z)), handleX: at.x, handleY: at.y };
    }));
  }
  private setPointerRay(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
  }
  private hits(event: PointerEvent, objects: THREE.Object3D[]) {
    this.setPointerRay(event);
    return this.raycaster.intersectObjects(objects, false);
  }
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.down = { x: event.clientX, y: event.clientY };
    const hit = this.explosion?undefined:this.hits(event, this.handles.children)[0];
    if (hit) {
      event.stopImmediatePropagation(); this.startDrag(hit.object.userData.axis, event);
    }
  };
  startDrag(axis: Axis, event: PointerEvent, point?: THREE.Vector3) {
    if(this.explosion)return;
    if (event.button !== 0) return;
    this.controls.enabled = false; this.renderer.domElement.setPointerCapture(event.pointerId);
    const start = point ?? this.handles.children.find(h => h.userData.axis === axis)!.position.clone();
    const direction = axis === 'width' ? new THREE.Vector3(1, 0, 0) : axis === 'height' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const a = this.project(start), b = this.project(start.clone().add(direction.multiplyScalar(100)));
    this.drag = { axis, x: event.clientX, y: event.clientY, initial: this.cabinet.envelope[axis], px: (b.x - a.x) / 100, py: (b.y - a.y) / 100 };
    this.callbacks.dragStart(); this.renderer.domElement.focus({ preventScroll: true });
  }
  startDivisionDrag(event: PointerEvent) {
    if (event.button !== 0) return;
    const division = [...this.geometry.divisions, ...this.geometry.adjustable.shelves].find(d => d.id === this.selected); if (!division) return;
    const axis = division.axis === 'horizontal' ? 'height' : 'width';
    this.startDrag(axis, event, new THREE.Vector3(division.origin[0] + division.size[0] / 2, division.origin[1] + division.size[1] / 2, division.origin[2] + division.size[2] + 12));
    this.drag!.initial = division.position; this.drag!.featureId = division.id; this.drag!.centre = (division.min + division.max) / 2;
  }
  private pointerMove = (event: PointerEvent) => {
    if (this.drag) {
      const { axis, x, y, initial, px, py, featureId, centre } = this.drag, denominator = px * px + py * py;
      if (denominator < 0.002) return;
      const delta = ((event.clientX - x) * px + (event.clientY - y) * py) / denominator;
      if (featureId) {
        const value = this.cabinet.contents.some(s => s.id === featureId) ? initial + delta : Math.abs(initial + delta - centre!) < 5 ? centre! : Math.round((initial + delta) / 5) * 5;
        this.callbacks.previewDivision(featureId, Math.round(value * 10) / 10);
      } else this.callbacks.preview(axis, Math.round(initial + delta));
    } else this.renderer.domElement.style.cursor = !this.explosion&&this.hits(event, this.handles.children).length ? 'ew-resize' : 'grab';
  };
  private pointerUp = (event: PointerEvent) => {
    if (this.drag) { const tap=this.drag.featureId&&Math.hypot(event.clientX-this.drag.x,event.clientY-this.drag.y)<4; this.drag = null; this.controls.enabled = true; if(tap){this.callbacks.cancel();this.callbacks.editDivision?.();}else this.callbacks.commit(); }
    else if (this.down && Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) < 5) {
      this.setPointerRay(event);
      this.callbacks.select(pickCabinetElement(this.raycaster, this.model.children, this.cabinet.id),event.shiftKey||event.metaKey||event.ctrlKey);
    }
    this.down = null;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };
  private pointerCancel = () => { this.drag = null; this.down = null; this.controls.enabled = true; this.callbacks.cancel(); };
  private keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); this.pointerCancel(); return; }
    const actions: Record<string, () => void> = { ArrowLeft: () => this.orbit(-0.15, 0), ArrowRight: () => this.orbit(0.15, 0), ArrowUp: () => this.orbit(0, -0.15), ArrowDown: () => this.orbit(0, 0.15), '+': () => this.zoom(0.85), '=': () => this.zoom(0.85), '-': () => this.zoom(1.15), f: () => this.fit() };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  };
  private displayBounds() {
    const {width,height,depth,origin:[x,y,z]}=this.cabinet.envelope;
    this.model.updateMatrixWorld(true);
    const bounds=new THREE.Box3(new THREE.Vector3(x,this.geometry.installation.floorY,z),new THREE.Vector3(x+width,y+height,z+depth));
    return bounds.expandByObject(this.model);
  }
  private area() {
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    return {width, height, usableHeight: Math.max(80, Math.min(height, this.callbacks.usableHeight?.() ?? height))};
  }
  view(name: ViewName) {
    if (!this.cabinet) return;
    // Flush pending damping before changing the camera and its coordinate frame.
    this.controls.enableDamping = false; this.controls.update();
    this.camera = name === 'isometric' ? this.perspective : this.elevation;
    this.controls.object = this.camera;
    this.controls.enableRotate = name === 'isometric';
    this.camera.up.set(...(name === 'top' ? [0, 0, -1] : [0, 1, 0]) as Vec3);
    const directions: Record<ViewName, Vec3> = {isometric: [1.25, .8, 1.8], front: [0, 0, 1], side: [1, 0, 0], rear: [0, 0, -1], top: [0, 1, 0]};
    this.controls.target.copy(this.displayBounds().getCenter(new THREE.Vector3()));
    fitCamera(this.camera, this.displayBounds(), new THREE.Vector3(...directions[name]), this.area());
    this.controls.update(); this.controls.enableDamping = true;
  }
  fit() {
    if (!this.cabinet) return;
    this.controls.enableDamping = false; this.controls.update();
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(this.displayBounds().getCenter(new THREE.Vector3()));
    fitCamera(this.camera, this.displayBounds(), direction, this.area());
    this.controls.update(); this.controls.enableDamping = true;
  }
  orbit(theta: number, phi: number) {
    if (this.camera instanceof THREE.OrthographicCamera) return;
    const offset = this.camera.position.clone().sub(this.controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += theta; spherical.phi = Math.max(0.02, Math.min(Math.PI - 0.02, spherical.phi + phi));
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update();
  }
  zoom(factor: number) { if (this.camera instanceof THREE.OrthographicCamera) { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom / factor, .1, 10); this.camera.updateProjectionMatrix(); return; } const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor); offset.clampLength(250, 12000); this.camera.position.copy(this.controls.target).add(offset); this.controls.update(); }
  dispose() {
    this.disposed = true; this.renderer.setAnimationLoop(null); this.resizeObserver.disconnect(); this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown, true); canvas.removeEventListener('pointermove', this.pointerMove); canvas.removeEventListener('pointerup', this.pointerUp); canvas.removeEventListener('pointercancel', this.pointerCancel); canvas.removeEventListener('keydown', this.keyDown);
    this.clear(this.model); this.clear(this.handles); this.clear(this.dimensions); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); this.renderer.dispose(); canvas.remove();
  }
}
