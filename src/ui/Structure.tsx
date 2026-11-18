import type { Cabinet } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { Icon } from '../design-system/Icon';
export function Structure({ cabinet, evaluated, selection, onSelect }: { cabinet: Cabinet; evaluated: EvaluatedCabinet; selection: string; onSelect(id: string): void }) {
  return <aside className="elements-panel" aria-label="Cabinet elements"><div className="panel-heading"><h2>Structure</h2><span className="count-badge">01</span></div>
    <button className={`tree-root ${selection === cabinet.id ? 'selected' : ''}`} onClick={() => onSelect(cabinet.id)} aria-pressed={selection === cabinet.id}><Icon name="cube"/><span>Cabinet body<small>Rectangular carcass</small></span><Icon name="chevron" size={13}/></button>
    <div className="tree-children"><span className="tree-caption">PANELS <span>{evaluated.panels.length}</span></span>{evaluated.panels.map((panel, i) => <button className={`tree-item ${selection === panel.id ? 'selected' : ''}`} key={panel.id} onClick={() => onSelect(panel.id)} aria-pressed={selection === panel.id}><Icon name="panel" size={16}/><span>{panel.label}</span><small>{String(i + 1).padStart(2, '0')}</small></button>)}</div>
    <div className="tree-children"><span className="tree-caption">OPENINGS <span>{evaluated.openings.length}</span></span>{evaluated.openings.map(opening => <button key={opening.id} className={`tree-item ${selection === opening.id ? 'selected' : ''}`} onClick={() => onSelect(opening.id)} aria-pressed={selection === opening.id}><Icon name="cube" size={16}/><span>{opening.label}</span></button>)}</div>
    <div className="structure-foot"><div className="little-cabinet"><Icon name="cabinet" size={32}/></div><span className="eyebrow">SHAPE THE SPACE INSIDE.</span><p>A place for everything.<br/>One opening at a time.</p><div className="stage-progress"><span/><span/><span/><span/><span/></div><small>Stage 2 · Shelves & dividers</small></div>
  </aside>;
}
