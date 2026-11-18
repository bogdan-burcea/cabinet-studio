import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Group, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { pickCabinetElement, type PickKind } from '../src/viewport/picking.ts';
function box(id: string, kind: PickKind, size: [number,number,number], position: [number,number,number]) {
  const mesh = new Mesh(new BoxGeometry(...size),new MeshBasicMaterial({side:DoubleSide}));mesh.position.set(...position);mesh.userData={id,pickKind:kind};mesh.updateMatrixWorld(true);return mesh;
}
function opening() { const mesh=new Mesh(new PlaneGeometry(200,200),new MeshBasicMaterial({visible:false,side:DoubleSide}));mesh.position.z=100;mesh.userData={id:'opening',pickKind:'opening'};mesh.updateMatrixWorld(true);return mesh; }
const ray=(origin: [number,number,number],direction: [number,number,number])=>new Raycaster(new Vector3(...origin),new Vector3(...direction).normalize());
test('visible fixed/adjustable shelf surfaces and divider faces can be picked behind an invisible opening proxy',()=>{
  for(const id of ['fixed-shelf','adjustable-shelf','divider']){
    const part=box(id,'interior',id === 'divider' ? [16,100,100] : [100,16,100],[0,0,0]);
    const pointer=id === 'divider' ? ray([80,0,300],[-80,0,-300]) : ray([0,80,300],[0,-80,-300]);
    assert.equal(pickCabinetElement(pointer,[opening(),part],'cabinet'),id);
  }
});
test('empty openings remain selectable against a full back or rear rail, and also with no back',()=>{
  const pointer=ray([0,0,300],[0,0,-1]);
  for(const size of [[200,200,6],[200,40,18]] as [number,number,number][]){const back=box('back','back',size,[0,0,-40]);assert.equal(pickCabinetElement(pointer,[back,opening()],'cabinet'),'opening');}
  assert.equal(pickCabinetElement(pointer,[opening()],'cabinet'),'opening');
});
test('opaque cabinet parts occlude shelves and back panels are selectable from behind',()=>{
  const shelf=box('shelf','interior',[100,100,16],[0,0,0]),side=box('side','part',[150,150,18],[0,0,150]);
  assert.equal(pickCabinetElement(ray([0,0,300],[0,0,-1]),[shelf,opening(),side],'cabinet'),'side');
  const back=box('back','back',[200,200,6],[0,0,-40]);
  assert.equal(pickCabinetElement(ray([0,0,-300],[0,0,1]),[shelf,opening(),back],'cabinet'),'back');
});
test('cutaway back construction passes clicks through to interiors, including band strips',()=>{
  const shelf=box('shelf','interior',[100,100,16],[0,0,0]),back=box('back','back',[200,200,6],[0,0,-40]),band=box('back','back',[200,2,6],[0,0,-45]);
  back.userData.pickThrough=true;band.userData.pickThrough=true;
  assert.equal(pickCabinetElement(ray([0,0,-300],[0,0,1]),[opening(),back,band,shelf],'cabinet'),'shelf');
});
test('banded shelf strips and support pads resolve to their owning shelf, and empty space selects the cabinet',()=>{
  const pointer=ray([0,0,300],[0,0,-1]);
  for(const name of ['band','pad']){const part=box('shelf','interior',[30,10,10],[0,0,0]);part.name=name;assert.equal(pickCabinetElement(pointer,[opening(),part],'cabinet'),'shelf');}
  assert.equal(pickCabinetElement(pointer,[],'cabinet'),'cabinet');
});

test('carcass interior walls behind the opening proxy preserve empty-opening selection',()=>{
  const side=box('inside-side','part',[20,200,100],[0,0,0]);
  assert.equal(pickCabinetElement(ray([0,0,300],[0,0,-1]),[side,opening()],'cabinet'),'opening');
});

test('closed and inset fronts occlude opening proxies while opened door groups remain pickable',()=>{
  const front=box('door','front',[100,100,18],[0,0,50]);
  assert.equal(pickCabinetElement(ray([0,0,300],[0,0,-1]),[opening(),front],'cabinet'),'door');
  const group=new Group();group.add(front);group.updateMatrixWorld(true);
  assert.equal(pickCabinetElement(ray([0,0,300],[0,0,-1]),[opening(),group],'cabinet'),'door');
  group.position.x=200;group.updateMatrixWorld(true);
  assert.equal(pickCabinetElement(ray([0,0,300],[0,0,-1]),[opening(),group],'cabinet'),'opening');
});
