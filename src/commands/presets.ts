import type { Cabinet } from '../domain/cabinet';
import { presets, type PresetId } from '../catalogue/presets';
export function applyPreset(c: Cabinet, id: PresetId, suggestedSize = false): Cabinet {
  const preset = presets.find(p => p.id === id); if (!preset) throw new Error('Unavailable arrangement preset.');
  return { ...c, envelope: suggestedSize ? { ...c.envelope, width: preset.width, height: preset.height, depth: preset.depth } : c.envelope,
    carcass: { ...c.carcass, top: { ...c.carcass.top, mode: preset.top }, back: { ...c.carcass.back, mode: preset.back } },
    installation: { ...c.installation, type: preset.support, mounting: { ...c.installation.mounting, mode: preset.mounting } } };
}
