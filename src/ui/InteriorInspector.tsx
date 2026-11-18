import type { Cabinet, DivisionAxis } from '../domain/cabinet';
import { addDivision, duplicateDivision, findDivision, moveDivision, removeDivision } from '../commands/interiors';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { Section, Button } from './components';
import { DimensionField } from './DimensionField';
interface Props {
  cabinet: Cabinet; committed: Cabinet; evaluated: EvaluatedCabinet; selection: string;
  onSelect(id: string): void; onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void;
  onNotice(message: string): void; positionRef(element: HTMLInputElement | null): void;
}
export function InteriorInspector(p: Props) {
  const division = p.evaluated.divisions.find(d => d.id === p.selection);
  const opening = p.evaluated.openings.find(o => o.id === p.selection) ?? (p.selection === p.cabinet.id && p.evaluated.openings.length === 1 ? p.evaluated.openings[0] : undefined);
  function add(openingId: string, axis: DivisionAxis, position: number) {
    try {
      const next = addDivision(p.committed, openingId, axis, Math.round(position * 10) / 10);
      if (p.onCommit(next.cabinet)) p.onSelect(next.featureId);
    } catch (error) { p.onNotice((error as Error).message); }
  }
  if (division) {
    const base = findDivision(p.committed.compartments, division.id)!;
    const horizontal = division.axis === 'horizontal';
    const move = (value: number) => moveDivision(p.committed, division.id, value);
    function duplicate() {
      try { const next = duplicateDivision(p.committed, division!.id); if (p.onCommit(next.cabinet)) p.onSelect(next.featureId); }
      catch (error) { p.onNotice((error as Error).message); }
    }
    return <Section title={horizontal ? 'Fixed shelf position' : 'Divider position'} aside={<span className="unit-badge">{division.size[horizontal ? 1 : 0]} mm</span>}>
      <DimensionField key={division.id} label={horizontal ? 'Centre from bottom' : 'Centre from left'} value={division.position} cancelValue={base.position} limits={{ min: division.min, max: division.max }} register={p.positionRef}
        onPreview={value => p.onPreview(move(value))} onCommit={value => p.onCommit(move(value))} onCancel={p.onCancel}/>
      <p className="field-note">Measured inside the parent opening. Range {division.min.toFixed(1)}–{division.max.toFixed(1)} mm.</p>
      <div className="spacing-preview"><div><span>{horizontal ? 'Below' : 'Left'}</span><strong>{Number(division.before.toFixed(1))}<small>mm clear</small></strong></div><div><span>{horizontal ? 'Above' : 'Right'}</span><strong>{Number(division.after.toFixed(1))}<small>mm clear</small></strong></div></div>
      <div className="interior-actions"><Button onClick={() => p.onCommit(move(base.position - 10))}>− 10 mm</Button><Button onClick={() => p.onCommit(move(base.position + 10))}>+ 10 mm</Button><Button onClick={() => p.onCommit(move(Math.round((division.min + division.max) * 5) / 10))}>Centre</Button></div>
      <div className="interior-actions"><Button onClick={duplicate}>Duplicate {horizontal ? 'shelf' : 'divider'}</Button><Button disabled={!division.canRemove} onClick={() => { try { if (p.onCommit(removeDivision(p.committed, division.id))) p.onSelect(division.nodeId); } catch (error) { p.onNotice((error as Error).message); } }}>Remove</Button></div>
      {!division.canRemove && <p className="field-note">Remove the divisions inside the child openings first. Nested contents are preserved.</p>}
      <p className="field-note">Duplicate adds to the largest child opening. Drag the move handle for a live preview; Escape cancels. Fixed construction is conceptual; joinery is unassigned.</p>
    </Section>;
  }
  return <Section title="Build the interior" aside={<span className="unit-badge">{p.evaluated.openings.length} openings</span>}>
    {!opening && <label className="opening-picker">Choose an opening<select aria-label="Opening to divide" value="" onChange={e => p.onSelect(e.target.value)}><option value="" disabled>Select an opening…</option>{p.evaluated.openings.map(o => <option key={o.id} value={o.id}>{o.label} · {o.size[0].toFixed(0)} × {o.size[1].toFixed(0)} mm</option>)}</select></label>}
    {opening && <><div className="opening-size">{opening.size.map((n, i) => <div key={i}><span>{['Width', 'Height', 'Depth'][i]}</span><strong>{Number(n.toFixed(1))}<small>mm</small></strong></div>)}</div><div className="interior-actions add-actions"><Button className="primary-button" onClick={() => add(opening.id, 'horizontal', opening.size[1] / 2)}>Add fixed shelf</Button><Button onClick={() => add(opening.id, 'vertical', opening.size[0] / 2)}>Add divider</Button></div></>}
    <p className="field-note">Select an opening in 3D or Structure. Shelves divide it horizontally; dividers split it vertically. Each child opening can be divided again.</p>
    <p className="field-note">Adjustable shelves await a verified support fitting. No support holes or load capacity are inferred.</p>
  </Section>;
}
