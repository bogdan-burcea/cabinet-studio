import type { Cabinet, EdgeKey, MaterialBinding, MaterialRole, ProductPin } from '../domain/cabinet';
export function changeMaterial(c: Cabinet, role: MaterialRole, value: MaterialBinding | null, panelId?: string): Cabinet {
  if (role === 'front') return { ...c, fronts: c.fronts.map(door => !panelId || door.id === panelId ? { ...door, material: value ? structuredClone(value) : null } : door) };
  if (role === 'plinth') return { ...c, installation: { ...c.installation, plinth: { ...c.installation.plinth, material: value ? structuredClone(value) : null } } };
  if (role !== 'interior' && value === null) throw new Error('Only interiors and plinth can inherit the carcass material.');
  return { ...c, materials: { ...c.materials, [role]: value ? structuredClone(value) : null } } as Cabinet;
}
export function setBanding(c: Cabinet, panelId: string, edge: EdgeKey, product: ProductPin | null): Cabinet {
  const banding = structuredClone(c.banding), panel = { ...banding[panelId] };
  if (product) panel[edge] = { ...product }; else delete panel[edge];
  if (Object.keys(panel).length) banding[panelId] = panel; else delete banding[panelId];
  return { ...c, banding };
}
