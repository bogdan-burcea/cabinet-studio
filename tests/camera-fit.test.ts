import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitCamera} from '../src/viewport/camera-fit';

const bounds = new THREE.Box3(new THREE.Vector3(-80, -100, -80), new THREE.Vector3(680, 800, 640));
for (const area of [{width:704,height:656,usableHeight:500},{width:391,height:480,usableHeight:340}]) {
  for (const mode of ['3D','front','left','right','top','rear'] as const) test(`${mode} fits above toolbar at ${area.width}px`, () => {
    const camera = mode === '3D' ? new THREE.PerspectiveCamera(36, 1, 1, 50000) : new THREE.OrthographicCamera(-500,500,500,-500,1,50000);
    const directions = {'3D':[1.25,.8,1.8],front:[0,0,1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],rear:[0,0,-1]};
    if (mode === 'top') camera.up.set(0,0,-1);
    fitCamera(camera,bounds,new THREE.Vector3(...directions[mode]),area);
    const center = bounds.getCenter(new THREE.Vector3()).project(camera);
    assert.ok(Math.abs((1-center.y)*area.height/2-area.usableHeight/2)<.001);
    assert.ok(Math.abs(center.x)<.001);
    for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
      const p=new THREE.Vector3(x,y,z).project(camera), px=(p.x+1)*area.width/2, py=(1-p.y)*area.height/2;
      assert.ok(px>=55.9 && px<=area.width-55.9, `horizontal clipping: ${px}`);
      assert.ok(py>=55.9 && py<=area.usableHeight-55.9, `vertical clipping: ${py}`);
    }
    if (mode !== '3D') {
      const a=new THREE.Vector3(100,100,100), b=a.clone().addScaledVector(new THREE.Vector3(...directions[mode]),100);
      const pa=a.project(camera), pb=b.project(camera);
      assert.ok(Math.abs(pa.x-pb.x)<1e-8 && Math.abs(pa.y-pb.y)<1e-8,'Elevation must have no perspective convergence');
    }
  });
}
