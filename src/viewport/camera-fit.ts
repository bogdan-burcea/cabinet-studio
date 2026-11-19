import * as THREE from 'three';

export type CabinetCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;
export interface ViewportArea { width: number; height: number; usableHeight: number }

/** Keep the orbit target centred in the unobscured area above the camera toolbar. */
export function updateProjection(camera: CabinetCamera, area: ViewportArea) {
  const width = Math.max(1, area.width), height = Math.max(1, area.height);
  if (camera instanceof THREE.PerspectiveCamera) camera.aspect = width / height;
  else {
    const halfHeight = (camera.top - camera.bottom) / 2;
    camera.left = -halfHeight * width / height;
    camera.right = halfHeight * width / height;
  }
  camera.setViewOffset(width, height, 0, (height - area.usableHeight) / 2, width, height);
  camera.updateProjectionMatrix();
}

/** Fit actual displayed bounds, including exploded parts, in the available area. */
export function fitCamera(camera: CabinetCamera, bounds: THREE.Box3, direction: THREE.Vector3, area: ViewportArea) {
  const center = bounds.getCenter(new THREE.Vector3());
  camera.zoom = 1;
  camera.position.copy(center).add(direction.clone().normalize());
  camera.lookAt(center);
  const rotation = camera.quaternion.clone().invert();
  const corners: THREE.Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    corners.push(new THREE.Vector3(x, y, z).sub(center).applyQuaternion(rotation));
  }
  const availableWidth = Math.max(40, area.width - 112);
  const availableHeight = Math.max(40, area.usableHeight - 112);
  let distance = bounds.getSize(new THREE.Vector3()).length() * 2 + 1000;
  if (camera instanceof THREE.PerspectiveCamera) {
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distance = Math.max(...corners.map(p => p.z + Math.max(Math.abs(p.x) * area.height / (tangent * availableWidth), Math.abs(p.y) * area.height / (tangent * availableHeight))));
  } else {
    const halfHeight = Math.max(...corners.map(p => Math.max(Math.abs(p.x) * area.height / availableWidth, Math.abs(p.y) * area.height / availableHeight)));
    camera.top = halfHeight; camera.bottom = -halfHeight;
  }
  camera.position.copy(center).add(direction.clone().normalize().multiplyScalar(distance));
  updateProjection(camera, area);
  camera.updateMatrixWorld(true);
}
