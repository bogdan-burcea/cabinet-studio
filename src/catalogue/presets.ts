// Reviewed transformations of the universal cabinet; all fittings remain conceptual.
export const presets = [
  { id: 'open', revision: '1', name: 'Open cabinet', width: 600, height: 720, depth: 400, top: 'full', back: 'rails', support: 'unassigned', mounting: 'none' },
  { id: 'base', revision: '1', name: 'Base cabinet', width: 600, height: 720, depth: 560, top: 'rails', back: 'full', support: 'feet-concept', mounting: 'none' },
  { id: 'wall', revision: '1', name: 'Wall-style cabinet', width: 600, height: 720, depth: 350, top: 'full', back: 'full', support: 'unassigned', mounting: 'suspended-concept' },
  { id: 'tall', revision: '1', name: 'Tall cabinet', width: 600, height: 2100, depth: 560, top: 'full', back: 'full', support: 'feet-concept', mounting: 'restraint-concept' }
] as const;
export type PresetId = typeof presets[number]['id'];
