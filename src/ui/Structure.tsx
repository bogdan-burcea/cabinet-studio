import {StructureItem} from './StructureItem';
import {affectedItems} from './MachiningChecks';
import {IconButton} from './components';
import {elementIcon} from './element-icons';
import {useState,type ReactNode} from 'react';
import type { Cabinet } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { Icon } from '../design-system/Icon';
export function StructureGroup({title,count,children,initiallyOpen=true}:{title:string;count:number;children:ReactNode;initiallyOpen?:boolean}){
 const [open,setOpen]=useState(initiallyOpen);
 return <details className="tree-children structure-disclosure details" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary className="tree-caption details__summary"><span className="details__label">{title.toLowerCase().replace(/^./,c=>c.toUpperCase())}</span><small>{count}</small><span className="details__icon"><Icon name="chevron" size={16}/></span></summary><div className="details__content">{children}</div></details>;
}
export function Structure({ cabinet, evaluated, selection, selectedIds, onSelect, simple = false, nameEditor, hiddenIds=[],onToggleVisibility,onRename }: { cabinet: Cabinet; evaluated: EvaluatedCabinet; selection: string; selectedIds?:string[]; onSelect(id: string,additive?:boolean): void; simple?:boolean; nameEditor?:ReactNode; hiddenIds?:string[];onToggleVisibility?(id:string):void;onRename?(id:string,label:string):void }) {
  const alertIds=new Set(evaluated.issues.filter(i=>i.code.startsWith('machining-')).flatMap(affectedItems));
  const row=(p:{id:string;label:string},icon:Parameters<typeof StructureItem>[0]['icon'])=><StructureItem key={p.id} id={p.id} label={cabinet.names?.[p.id]??p.label} icon={icon} selected={(selectedIds??[selection]).includes(p.id)} hidden={hiddenIds.includes(p.id)} alert={alertIds.has(p.id)} onSelect={onSelect} onRename={onRename} onToggleVisibility={onToggleVisibility}/>;
  return <aside className="elements-panel" aria-label="Cabinet elements"><div className="panel-heading"><h2>Structure</h2><span className="count-badge">1</span></div>
    {nameEditor?<div className={`cabinet-name-row ${selection===cabinet.id?'selected':''}`}>{nameEditor}</div>:(
    <button className={`tree-root ${selection === cabinet.id ? 'selected' : ''}`} onClick={() => onSelect(cabinet.id)} aria-pressed={selection === cabinet.id}><Icon name="cube"/><span>Cabinet body<small>Rectangular carcass</small></span><Icon name="chevron" size={13}/></button>)}

    <StructureGroup title="PANELS" count={evaluated.panels.filter(p=>p.role!=='door').length}>{evaluated.panels.filter(p=>p.role!=='door').map(p=>row(p,elementIcon(p.role,cabinet.contents.some(s=>s.id===p.id))))}</StructureGroup>
    {!!evaluated.fronts.doors.length&&<StructureGroup title="SLAB DOORS" count={evaluated.fronts.doors.length}>{evaluated.fronts.doors.map(p=>row(p,'element-door'))}</StructureGroup>}
    <StructureGroup title="OPENINGS" count={evaluated.openings.length} initiallyOpen={false}>{evaluated.openings.map(p=>row(p,'element-opening'))}</StructureGroup>
    {evaluated.installation.feet.length>0&&<StructureGroup title="Feet" count={evaluated.installation.feet.length}>{evaluated.installation.feet.map(p=>row(p,'element-foot'))}</StructureGroup>}
    {evaluated.mounting.parts.length > 0 && <StructureGroup title="CONCEPT MOUNTING" count={evaluated.mounting.parts.length}>{evaluated.mounting.parts.map(part => <button key={part.id} className={`tree-item ${selection === part.id ? 'selected' : ''}`} onClick={() => onSelect(part.id)} aria-pressed={selection === part.id}><Icon name="panel" size={16}/><span>{part.label}</span></button>)}</StructureGroup>}
    {!!evaluated.doorHardware.hinges.length&&<StructureGroup title="Hinges" count={evaluated.doorHardware.hinges.length} initiallyOpen={false}>{evaluated.doorHardware.hinges.map(h=><StructureItem key={h.id} id={h.id} label={`${evaluated.fronts.doors.find(d=>d.id===h.ownerId)?.label} · Hinge ${Number(h.id.split('/').at(-1))+1}`} icon="element-door" selected={(selectedIds??[selection]).includes(h.id)} hidden={false} alert={false} onSelect={onSelect}/>)}</StructureGroup>}
    {!!evaluated.drawers.drawers.length&&<StructureGroup title="Drawers" count={evaluated.drawers.drawers.length}>{evaluated.drawers.drawers.map(d=>row(d,'cube'))}</StructureGroup>}
    {!simple&&<div className="structure-foot"><div className="little-cabinet"><Icon name="cabinet" size={32}/></div><span className="eyebrow">SHAPE THE SPACE INSIDE.</span><p>A place for everything.<br/>One opening at a time.</p><div className="stage-progress"><span/><span/><span/><span/><span/></div><small>Stage 4 · Metal drawers</small></div>}
  </aside>;
}
