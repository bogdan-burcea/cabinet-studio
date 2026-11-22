import {Icon} from '../design-system/Icon';
import {evoViewportTheme} from '../design-system/evo-viewport';
import type {RenderMode} from './display';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Axis, Cabinet } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { type ThemeName } from '../design-system/themes';
import { CabinetViewport, type DimensionAnchor, type ViewName } from './adapter';
import { IconButton } from '../ui/components';
interface Props {
  onToggleDoors?():void;doorsOpen?:boolean;hiddenIds?:string[]; simple?:boolean; selectedIds?:string[];
  cabinet: Cabinet; evaluated: EvaluatedCabinet; selection: string; theme: ThemeName; preview: boolean; cutaway: boolean; plinthVisible: boolean; frontsVisible:boolean; doorAngles:Record<string,number>;
  onSelect(id: string,additive?:boolean): void; onEditDivision(): void; onPreviewDivision(id: string, value: number): void; onEdit(axis: Axis): void; onDragStart(): void; onPreview(axis: Axis, value: number): void; onCommit(): void; onCancel(): void;
}
export function Viewport(props: Props) {
  const host = useRef<HTMLDivElement>(null), adapter = useRef<CabinetViewport | null>(null), latest = useRef(props);
  latest.current = props;
  const labels = useRef<Partial<Record<Axis, HTMLButtonElement | null>>>({});
  const divisionHandle = useRef<HTMLButtonElement>(null),cameraToolbar=useRef<HTMLDivElement>(null);
  const division = [...props.evaluated.divisions, ...props.evaluated.adjustable.shelves].find(d => d.id === props.selection&&!props.hiddenIds?.includes(d.id));
  const handles = useRef<Partial<Record<Axis, HTMLButtonElement | null>>>({});
  const [error, setError] = useState(''), [view, setView] = useState<ViewName>('perspective');
  const [renderMode,setRenderMode]=useState<RenderMode>('solid'),[exploded,setExploded]=useState(false);
  useLayoutEffect(() => {
    try {
      const instance = new CabinetViewport(host.current!, {
        usableHeight: () => {
          const usable = Math.max(80, (cameraToolbar.current?.offsetTop ?? host.current!.clientHeight) - 16);
          host.current!.parentElement?.style.setProperty('--camera-toolbar-clearance', `${host.current!.clientHeight - usable}px`);
          return usable;
        },
        editDivision:()=>latest.current.onEditDivision(),
        previewDivision: (id, value) => latest.current.onPreviewDivision(id, value),
        divisionAnchor: point => { if (divisionHandle.current) { divisionHandle.current.style.visibility = point ? 'visible' : 'hidden'; if (point) { divisionHandle.current.style.left = `${point.x}px`; divisionHandle.current.style.top = `${point.y}px`; } } },
        select: (id,additive) => latest.current.onSelect(id,additive), dragStart: () => latest.current.onDragStart(),
        preview: (axis, value) => latest.current.onPreview(axis, value), commit: () => latest.current.onCommit(), cancel: () => latest.current.onCancel(),
        anchors: (positions: DimensionAnchor[]) => positions.forEach(p => {
          const label = labels.current[p.axis]; if (!label) return;
          const y=Math.min(p.y,(cameraToolbar.current?.offsetTop??Infinity)-24);
          label.style.left = `${p.x}px`; label.style.top = `${y}px`;
          label.style.visibility = p.x < 35 || p.x > host.current!.clientWidth - 35 || p.y < 0 || p.y > host.current!.clientHeight || y < 32 ? 'hidden' : 'visible';
          const handle = handles.current[p.axis]; if (handle) { handle.style.left = `${p.handleX}px`; handle.style.top = `${p.handleY}px`; }
        })
      }); adapter.current = instance;
      return () => { instance.dispose(); adapter.current = null; };
    } catch { setError('3D could not start. Enable WebGL in your browser. The inspector, history and cabinet files remain available.'); }
  }, []);
  useEffect(() => { adapter.current?.update(props.cabinet, props.evaluated, props.selection, evoViewportTheme(props.theme), props.preview, props.cutaway, props.plinthVisible,props.frontsVisible,props.doorAngles,renderMode,exploded?80:0,props.selectedIds,props.hiddenIds); }, [props.hiddenIds,props.cabinet, props.evaluated, props.selection, props.selectedIds, props.theme, props.preview, props.cutaway, props.plinthVisible,props.frontsVisible,props.doorAngles,renderMode,exploded]);
  return <div className="viewport" ref={host}>
    {error && <div className="viewport-error" role="alert">{error}</div>}
    {!error && !exploded && (['width', 'height', 'depth'] as const).map(axis => <button key={axis} ref={el => { labels.current[axis] = el; }} className={`viewport-pill dimension-label dimension-${axis}`} onClick={() => props.onEdit(axis)} aria-label={`Edit ${axis}, ${props.cabinet.envelope[axis]} millimetres`} title={`Edit ${axis}`}><span>{props.cabinet.envelope[axis]}</span><small>{axis === 'height' ? 'H' : axis === 'width' ? 'W' : 'D'}</small></button>)}
    {!error && !exploded && (['width', 'height', 'depth'] as const).map(axis => <button key={`handle-${axis}`} ref={el => { handles.current[axis] = el; }} className="resize-handle" aria-label={`Resize ${axis} handle. Drag to resize; press Enter to edit.`} title={`Drag to resize ${axis}`} onPointerDown={event => { event.preventDefault(); adapter.current?.startDrag(axis, event.nativeEvent); }} onClick={() => props.onEdit(axis)}><span/></button>)}
    {!error && !exploded && division && (props.selectedIds?.length??1)===1 && <button ref={divisionHandle} type="button" className={`viewport-pill division-move-handle ${division.axis==='horizontal'?'move-vertical':'move-horizontal'}`} aria-label={`Move ${division.axis==='horizontal'?'shelf':'divider'}: ${Number(division.before.toFixed(1))} / ${Number(division.after.toFixed(1))} mm. Drag to move; press Enter to edit.`} onPointerDown={event=>{event.preventDefault();adapter.current?.startDivisionDrag(event.nativeEvent);}} onClick={props.onEditDivision}><Icon name={division.axis==='horizontal'?'move-vertical':'move-horizontal'} size={16}/><span className="division-clearances">{Number(division.before.toFixed(1))} / {Number(division.after.toFixed(1))}<small>mm</small></span></button>}

    <div ref={cameraToolbar} className="camera-toolbar" role="toolbar" aria-label="Camera views"><div className="segmented-buttons camera-presets"><ul>
      {(['perspective','front','side','top','rear'] as const).map(name=><li key={name}><button type="button" className="segmented-buttons__button" aria-current={view===name?'true':undefined} aria-pressed={view===name} onClick={()=>{adapter.current?.view(name);setView(name);}}>{name==='perspective'?'3D':name[0].toUpperCase()+name.slice(1)}</button></li>)}
      </ul></div><div className="camera-actions"><span className="toolbar-divider"/><IconButton icon="cube" label="Fit cabinet" onClick={() => adapter.current?.fit()}/>
      <span className="toolbar-divider"/>{([{mode:'transparent',icon:'transparent',label:'Transparent view'},{mode:'wireframe',icon:'wireframe',label:'Wireframe view'}] as const).map(item=><IconButton key={item.mode} icon={item.icon} label={item.label} className={renderMode===item.mode?'active':''} aria-pressed={renderMode===item.mode} onClick={()=>setRenderMode(renderMode===item.mode?'solid':item.mode)}/>)}
      <IconButton icon="exploded" label="Exploded view" className={exploded?'active':''} aria-pressed={exploded} onClick={()=>setExploded(v=>!v)}/>
      {props.onToggleDoors&&<><span className="toolbar-divider"/><IconButton icon={props.doorsOpen?'door-close':'door-open'} label={props.doorsOpen?'Close doors and drawers':'Open doors and drawers'} aria-pressed={props.doorsOpen} disabled={exploded} onClick={props.onToggleDoors}/></>}
      </div>
    </div>

  </div>;
}
