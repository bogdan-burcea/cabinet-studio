import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCabinet} from '../src/domain/cabinet';
import {evaluate} from '../src/geometry/evaluate';
import {setConstructionMode,defaultFrontRails} from '../src/commands/construction';
import {constructionRows,constructionOwner,isConstructionSelection} from '../src/domain/construction-selection';
import {renameItem} from '../src/commands/item-names';
import {flattenParts} from '../src/cnc/parts';
import {pickCabinetElement} from '../src/viewport/picking';

test('Top and Back remain stable Build selections across full, open and rail layouts while Cut keeps separate boards',()=>{
 const base=createCabinet();
 for(const mode of ['full','rails','open'] as const){
  let c=setConstructionMode(setConstructionMode(base,'top',mode),'back',mode);c.carcass.frontRails=defaultFrontRails();c.carcass.frontRails.top.enabled=true;c.carcass.frontRails.bottom.enabled=true;
  const model=evaluate(c),rows=constructionRows(c,model.panels);
  assert.equal(rows.length,5);assert.deepEqual(rows.map(r=>r.role),['left','right','bottom','top','back']);
  for(const role of ['top','back'] as const){const id=`${c.id}/panel/${role}`;assert.ok(isConstructionSelection(c,id));assert.ok(rows.some(r=>r.id===id));c=renameItem(c,id,`${role} custom`);assert.equal(c.names![id],`${role} custom`);}
  for(const p of model.panels){const owner=constructionOwner(c,p.id);if(p.role.startsWith('top-'))assert.equal(owner,`${c.id}/panel/top`);if(p.role.startsWith('back-'))assert.equal(owner,`${c.id}/panel/back`);if(p.role.startsWith('front-'))assert.equal(owner,c.compartments.id);}
  const parts=flattenParts(model);assert.equal(parts.length,mode==='rails'?9:mode==='full'?7:5);assert.equal(parts.filter(p=>p.panel.role.startsWith('front-')).length,2);
 }
});

test('open construction planes are selectable without preventing front or interior part selection',()=>{
 const proxy=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,visible:false}));proxy.userData.id='back';proxy.userData.pickKind='construction';proxy.updateMatrixWorld();
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,-1));assert.equal(pickCabinetElement(ray,[proxy],'cabinet'),'back');
 const shelf=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial());shelf.position.z=-3;shelf.userData.id='shelf';shelf.userData.pickKind='interior';shelf.updateMatrixWorld();assert.equal(pickCabinetElement(ray,[proxy,shelf],'cabinet'),'shelf');
 proxy.geometry.dispose();shelf.geometry.dispose();
});
