import { snappedShelfCentre } from '../rules/adjustable';
import type { Cabinet } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { addAdjustable, duplicateAdjustable, moveAdjustable, removeAdjustable, setShelfSetback } from '../commands/adjustable';
import { Section, Button } from './components';
import { DimensionField } from './DimensionField';
interface Props { committed: Cabinet; evaluated: EvaluatedCabinet; selection: string; onSelect(id: string): void; onPreview(c: Cabinet): boolean; onCommit(c: Cabinet): boolean; onCancel(): void; onNotice(message: string): void; positionRef(element: HTMLInputElement | null): void }
export function AdjustableInspector(p: Props) {
  const shelf = p.evaluated.adjustable.shelves.find(s => s.id === p.selection); if (!shelf) return null;
  const original = p.committed.contents.find(s => s.id === shelf.id);
  // Conversion previews can show a not-yet-committed shelf; apply/cancel owns that draft.
  if (!original) return <Section title="Adjustable shelf preview"><p className="field-note">Centre {shelf.position} mm; underside {shelf.underside} mm. Apply the conversion to edit this shelf.</p></Section>;
  const baseCentre = shelf.position + (original.level - shelf.level)*shelf.pitch;
  const move = (value: number) => moveAdjustable(p.committed,shelf.id,value);
  function duplicate() { try { const next=duplicateAdjustable(p.committed,shelf!.id); if(p.onCommit(next.cabinet)) p.onSelect(next.featureId); } catch(error) { p.onNotice((error as Error).message); } }
  return <Section title="Adjustable shelf position" aside={<span className="unit-badge">CONCEPT</span>}>
    <DimensionField key={shelf.id} label="Centre from bottom" normalize={v => snappedShelfCentre(v,shelf.size[1],shelf.support)} value={shelf.position} cancelValue={baseCentre} limits={{min:shelf.min,max:shelf.max}} register={p.positionRef} onPreview={v => p.onPreview(move(v))} onCommit={v => p.onCommit(move(v))} onCancel={p.onCancel}/>
    <p className="field-note">Local to its parent opening. Snaps to declared {shelf.pitch} mm concept levels; underside {shelf.underside} mm. No manufacturer hole pattern or drilling is selected.</p>
    <label className="construction-choice">Available level<select aria-label="Adjustable shelf level" value={shelf.position} onChange={e => p.onCommit(move(Number(e.target.value)))}>{shelf.legalPositions.map(position => <option key={position} value={position}>Centre {position} mm</option>)}</select></label>
    <div className="spacing-preview"><div><span>Below</span><strong>{Number(shelf.before.toFixed(1))}<small>mm clear</small></strong></div><div><span>Above</span><strong>{Number(shelf.after.toFixed(1))}<small>mm clear</small></strong></div></div>
    <div className="interior-actions"><Button onClick={() => p.onCommit(move(baseCentre-shelf.pitch))}>Down one level</Button><Button onClick={() => p.onCommit(move(baseCentre+shelf.pitch))}>Up one level</Button></div>
    <DimensionField key={`${shelf.id}/setback`} label="Shelf front setback" value={shelf.frontSetback} cancelValue={original.frontSetback} limits={{min:0,max:50}} onPreview={v => p.onPreview(setShelfSetback(p.committed,shelf.id,v))} onCommit={v => p.onCommit(setShelfSetback(p.committed,shelf.id,v))} onCancel={p.onCancel}/>
    <div className="interior-actions"><Button onClick={duplicate}>Duplicate adjustable shelf</Button><Button onClick={() => { if(p.onCommit(removeAdjustable(p.committed,shelf.id))) p.onSelect(shelf.nodeId); }}>Remove adjustable shelf</Button></div>
    <p className="field-note">Four visible support pads and side clearance are conceptual. Materials/edges use the interior role. This shelf does not divide the opening or act as a structural panel; no fitting, bore, engagement or load capacity is verified.</p>
  </Section>;
}
export function addAdjustableToOpening(p: Pick<Props,'committed'|'onCommit'|'onSelect'|'onNotice'>, openingId: string) {
  try { const next=addAdjustable(p.committed,openingId); if(p.onCommit(next.cabinet)) p.onSelect(next.featureId); } catch(error) { p.onNotice((error as Error).message); }
}
