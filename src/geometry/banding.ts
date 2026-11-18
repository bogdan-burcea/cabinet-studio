import type { Cabinet, EdgeKey, MaterialBinding, MaterialRole, ProductPin, Vec3 } from '../domain/cabinet';
import { binding, edgeProduct, material } from '../catalogue/materials';
export interface PanelEdge { id: string; key: EdgeKey; label: string; product: ProductPin | null; thickness: number; size: Vec3; center: Vec3 }
export const faceAxes = { yz: [2, 1], xz: [0, 2], xy: [0, 1] } as const;
export const edgeNames = { yz: ['Rear', 'Front', 'Bottom', 'Top'], xz: ['Left', 'Right', 'Rear', 'Front'], xy: ['Left', 'Right', 'Bottom', 'Top'] } as const;
export function panelMaterials(c: Cabinet, panel: { id: string; materialRole: MaterialRole; size: Vec3; center: Vec3; orientation: keyof typeof faceAxes }) {
  const selected: MaterialBinding = binding(c, panel.materialRole), record = material(selected.stock);
  const [u, v] = faceAxes[panel.orientation], keys: EdgeKey[] = ['u-min', 'u-max', 'v-min', 'v-max'];
  const products = keys.map(key => c.banding[panel.id]?.[key] ?? null), widths = products.map(pin => pin ? edgeProduct(pin).thickness : 0);
  const lower = panel.center.map((n, i) => n - panel.size[i] / 2) as Vec3;
  const coreSize = [...panel.size] as Vec3; coreSize[u] -= widths[0] + widths[1]; coreSize[v] -= widths[2] + widths[3];
  if (coreSize.some(n => !Number.isFinite(n) || n <= 0)) throw new Error(`${panel.id}: edge bands leave no board core. The previous cabinet is preserved.`);
  const coreOrigin = [...lower] as Vec3; coreOrigin[u] += widths[0]; coreOrigin[v] += widths[2];
  const edges: PanelEdge[] = keys.map((key, index) => {
    const size = [...panel.size] as Vec3, origin = [...lower] as Vec3, axis = index < 2 ? u : v;
    size[axis] = widths[index];
    if (index % 2) origin[axis] += panel.size[axis] - widths[index];
    if (index < 2) { origin[v] += widths[2]; size[v] -= widths[2] + widths[3]; }
    return { id: `${panel.id}/edge/${key}`, key, label: edgeNames[panel.orientation][index], product: products[index], thickness: widths[index], size, center: origin.map((n, i) => n + size[i] / 2) as Vec3 };
  });
  return { materialId: record.id, materialRevision: record.revision, finish: selected.finish, grain: selected.grain,
    coreSize, coreCenter: coreOrigin.map((n, i) => n + coreSize[i] / 2) as Vec3, edges };
}
