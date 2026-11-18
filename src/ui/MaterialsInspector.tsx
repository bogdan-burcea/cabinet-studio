import { useEffect, useState } from 'react';
import type { Cabinet, EdgeKey, MaterialBinding, MaterialRole } from '../domain/cabinet';
import { binding, edgeProducts, finishes, materials, stock } from '../catalogue/materials';
import { changeMaterial, setBanding } from '../commands/materials';
import type { EvaluatedCabinet, Panel } from '../geometry/evaluate';
import { Button, Section } from './components';
interface Props {
  committed: Cabinet; preview: Cabinet | null; error: string | null; evaluated: EvaluatedCabinet; panel?: Panel;
  onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void;
}
const settings = (c: Cabinet) => JSON.stringify([c.materials, c.banding, c.installation.plinth.material, c.fronts.map(door=>[door.id,door.material])]);
export function MaterialsInspector(p: Props) {
  const [draft, setDraft] = useState<Cabinet | null>(null), [valid, setValid] = useState(true), [role, setRole] = useState<MaterialRole>('carcass');
  const model = draft ?? p.committed, frontId=p.panel?.role==='door'?p.panel.id:undefined, selected = binding(model, role,frontId), inherited = (role === 'interior' && model.materials.interior === null) || (role === 'plinth' && model.installation.plinth.material === null) || (role==='front' && (frontId?model.fronts.find(door=>door.id===frontId)?.material===null:model.fronts.every(door=>door.material===null)));
  const pending = settings(model) !== settings(p.committed);
  function reset() { setDraft(null); setValid(true); }
  useEffect(reset, [p.committed]);
  useEffect(()=>{if(role==='front'&&!model.fronts.length)setRole('carcass');},[model.fronts.length,role]);
  useEffect(() => { if (p.panel) setRole(p.panel.materialRole); }, [p.panel?.id,p.panel?.materialRole,p.committed.fronts.length]);
  useEffect(() => { if (pending && ((!p.preview && !p.error) || (p.preview && settings(p.preview) !== settings(model)))) reset(); }, [p.preview, p.error]);
  function update(next: Cabinet) { setDraft(next); if (settings(next) === settings(p.committed)) { setValid(true); p.onCancel(); return; } const ok = p.onPreview(next); setValid(ok); }
  function materialChange(value: MaterialBinding | null) { update(changeMaterial(model, role, value,frontId)); }
  function cancel() { reset(); p.onCancel(); }
  const inactive = Object.keys(model.banding).filter(id => !p.evaluated.panels.some(panel => panel.id === id)).length;
  return <div onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } }}><Section title="Materials & edge banding" aside={<span className="unit-badge">PINNED REVISIONS</span>}>
    <label className="construction-choice">Material role<select aria-label="Material role" value={role} onChange={e => setRole(e.target.value as MaterialRole)}><option value="carcass">Carcass & construction rails</option><option value="interior">Shelves & dividers</option><option value="back">Full back panel</option><option value="plinth">Plinth panels</option><option value="front" disabled={!model.fronts.length}>Slab doors</option></select></label>
    {(role === 'interior' || role === 'plinth' || role==='front') && <label className="material-inheritance"><input type="checkbox" checked={inherited} onChange={e => materialChange(e.target.checked ? null : structuredClone(binding(model, 'carcass')))}/> Use carcass material, finish & grain</label>}
    <label className="construction-choice">Stock<select aria-label="Material stock" disabled={inherited} value={selected.stock.id} onChange={e => materialChange({ ...selected, stock: { id: e.target.value, revision: '1' } })}>{Object.values(materials).filter(record => record.kind === (role === 'back' ? 'back' : 'panel')).map(record => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
    <p className="field-note">{inherited ? 'Inherited from carcass.' : (role === 'interior' || role === 'plinth' || role==='front') ? `Explicit ${role} override.` : 'Applies to all panels using this role.'} {role==='front'?(frontId?' Selected slab door.':' Applies to all slab doors; the first door binding is shown.'):''} Actual thickness: {stock(model, role,frontId).thickness} mm. Generic stock is conceptual.</p>
    <details className="advanced-material"><summary>Finish & grain intent</summary>
      <label className="construction-choice">Finish<select aria-label="Material finish" value={selected.finish.id} disabled={inherited} onChange={e => materialChange({ ...selected, finish: { id: e.target.value, revision: '1' } })}>{Object.values(finishes).map(record => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
      <label className="construction-choice">Grain<select aria-label="Material grain" value={selected.grain} disabled={inherited} onChange={e => materialChange({ ...selected, grain: e.target.value as MaterialBinding['grain'] })}><option value="none">No specified direction</option><option value="u">Along first face dimension (U)</option><option value="v">Along second face dimension (V)</option></select></label>
      <p className="field-note">Sides/dividers: U depth, V height. Horizontal panels: U width, V depth. Back panels/rails/slab doors: U width, V height. Grain is stored intent; no cutting layout is generated.</p>
    </details>
    {p.panel ? <div className="panel-banding"><h4>{p.panel.label} · edges</h4>{p.panel.edges.map(edge => <label key={edge.key} className="construction-choice edge-choice">{edge.label}<select aria-label={`${edge.label} edge banding`} value={model.banding[p.panel!.id]?.[edge.key]?.id ?? 'none'} onChange={e => update(setBanding(model, p.panel!.id, edge.key as EdgeKey, e.target.value === 'none' ? null : { id: e.target.value, revision: '1' }))}><option value="none">Unbanded</option>{Object.values(edgeProducts).map(record => <option key={record.id} value={record.id}>{record.thickness} mm · generic band</option>)}</select></label>)}
      <p className="field-note">Finished size: {p.panel.size.map(n => Number(n.toFixed(1))).join(' × ')} mm.<br/>Board core: {p.panel.coreSize.map(n => Number(n.toFixed(1))).join(' × ')} mm.</p>
      <p className="field-note">Bands fit inside the finished envelope. Core dimensions exclude bands; they are not manufacturing cut sizes. Corners are schematic. Band finish matches the panel concept.</p>
    </div> : <p className="field-note">Select a panel to assign its four edges individually.</p>}
    {inactive > 0 && <p className="field-note">Edge settings for {inactive} inactive construction panel(s) are retained for switching back.</p>}
    {pending && <div className="construction-review" role="status"><strong>{valid ? 'Material / banding preview' : 'Material edit needs a correction'}</strong><p>{valid ? `${p.evaluated.panels.length} panels, ${p.evaluated.openings.length} openings. Construction choices and interior positions are preserved; dimensions reflect the selected stock.` : 'The previous cabinet is preserved. Resolve the highlighted dependency or cancel.'}</p><div className="interior-actions"><Button className="primary-button" disabled={!valid} onClick={() => p.onCommit(model)}>Apply materials & edges</Button><Button onClick={cancel}>Cancel material preview</Button></div></div>}
  </Section></div>;
}
