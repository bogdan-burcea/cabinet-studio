import { useEffect, useState } from 'react';
import type { Cabinet } from '../domain/cabinet';
import { applyPreset } from '../commands/presets';
import { presets, type PresetId } from '../catalogue/presets';
import {Checkbox, Section, Button } from './components';
interface Props { committed: Cabinet; preview: Cabinet | null; error: string | null; onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void }
export function PresetInspector(p: Props) {
  const [id,setId] = useState<PresetId | ''>(''), [size,setSize] = useState(false), [valid,setValid] = useState(true);
  const candidate = id ? applyPreset(p.committed,id,size) : null;
  const reset = () => { setId(''); setSize(false); setValid(true); };
  useEffect(reset,[p.committed]);
  useEffect(() => { if (id && ((!p.preview && !p.error) || (p.preview && JSON.stringify(p.preview) !== JSON.stringify(candidate)))) reset(); },[p.preview,p.error]);
  function review(next: PresetId | '', suggested: boolean) { setId(next); setSize(suggested); if (!next) { p.onCancel(); return; } setValid(p.onPreview(applyPreset(p.committed,next,suggested))); }
  function cancel() { reset(); p.onCancel(); }
  const preset = presets.find(r => r.id === id);
  return <div onKeyDown={e => { if(e.key === 'Escape') { e.stopPropagation(); cancel(); } }}><Section title="Arrangement presets" aside={<span className="unit-badge">PREVIEW → APPLY</span>}>
    <label className="construction-choice">Arrangement<select aria-label="Arrangement preset" value={id} onChange={e => review(e.target.value as PresetId | '',size)}><option value="">Choose an arrangement…</option>{presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
    {preset && <><Checkbox className="material-inheritance" checked={size} onChange={e => review(id,e.target.checked)}>Use suggested body size</Checkbox><p className="field-note">Suggested: {preset.width} × {preset.height} × {preset.depth} mm. Current size is retained unless selected.</p>
      <div className="construction-review" role="status"><strong>{valid ? 'Arrangement preview' : 'Arrangement needs a correction'}</strong><p>{valid ? `Top: ${candidate!.carcass.top.mode === 'full' ? 'full' : 'rails'}; back: ${candidate!.carcass.back.mode === 'full' ? 'full' : 'rails'}. Support: ${preset.support === 'feet-concept' ? 'four concept feet' : 'unassigned'}; wall layout: ${preset.mounting === 'none' ? 'none' : preset.mounting === 'restraint-concept' ? 'concept restraint' : 'concept suspension'}.` : 'Existing contents or installation constraints prevent this combination. Cancel and correct the identified feature; nothing is deleted or substituted.'}</p><p>Custom divisions, adjustable shelves, material bindings, banding and dormant installation settings are retained.</p><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(candidate!)}>Apply arrangement</Button><Button onClick={cancel}>Cancel arrangement preview</Button></div></div></>}
    <p className="field-note">One cabinet model, four starting arrangements. Each previews construction/support changes as one Undo step. Presets do not add verified fittings or establish stability.</p>
  </Section></div>;
}
