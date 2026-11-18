import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Axis, Cabinet } from '../domain/cabinet';
import type { EvaluatedCabinet } from '../geometry/evaluate';
import { viewportThemes, type ThemeName } from '../design-system/themes';
import { CabinetViewport, type DimensionAnchor, type ViewName } from './adapter';
import { Button, IconButton } from '../ui/components';
interface Props {
  cabinet: Cabinet; evaluated: EvaluatedCabinet; selection: string; theme: ThemeName; preview: boolean; cutaway: boolean;
  onSelect(id: string): void; onEdit(axis: Axis): void; onDragStart(): void; onPreview(axis: Axis, value: number): void; onCommit(): void; onCancel(): void;
}
export function Viewport(props: Props) {
  const host = useRef<HTMLDivElement>(null), adapter = useRef<CabinetViewport | null>(null), latest = useRef(props);
  latest.current = props;
  const labels = useRef<Partial<Record<Axis, HTMLButtonElement | null>>>({});
  const handles = useRef<Partial<Record<Axis, HTMLButtonElement | null>>>({});
  const [error, setError] = useState(''), [view, setView] = useState<ViewName>('isometric');
  useLayoutEffect(() => {
    try {
      const instance = new CabinetViewport(host.current!, {
        select: id => latest.current.onSelect(id), dragStart: () => latest.current.onDragStart(),
        preview: (axis, value) => latest.current.onPreview(axis, value), commit: () => latest.current.onCommit(), cancel: () => latest.current.onCancel(),
        anchors: (positions: DimensionAnchor[]) => positions.forEach(p => {
          const label = labels.current[p.axis]; if (!label) return;
          label.style.left = `${p.x}px`; label.style.top = `${p.y}px`;
          label.style.visibility = p.x < 35 || p.x > host.current!.clientWidth - 35 || p.y < 70 || p.y > host.current!.clientHeight - 70 ? 'hidden' : 'visible';
          const handle = handles.current[p.axis]; if (handle) { handle.style.left = `${p.handleX}px`; handle.style.top = `${p.handleY}px`; }
        })
      }); adapter.current = instance;
      return () => { instance.dispose(); adapter.current = null; };
    } catch { setError('3D could not start. Enable WebGL in your browser. The inspector, history and cabinet files remain available.'); }
  }, []);
  useEffect(() => { adapter.current?.update(props.cabinet, props.evaluated, props.selection, viewportThemes[props.theme], props.preview, props.cutaway); }, [props.cabinet, props.evaluated, props.selection, props.theme, props.preview, props.cutaway]);
  return <div className="viewport" ref={host}>
    <div className="viewport-heading"><span className="eyebrow">YOUR WORKSPACE</span><h2>A shape to start with.</h2><p>Select a panel. Make it yours.</p></div>
    <div className="viewport-tag"><span className="status-dot"/> {props.preview ? 'Live preview' : 'Concept model'}<span className="tag-divider"/> mm</div>
    {error && <div className="viewport-error" role="alert">{error}</div>}
    {!error && (['width', 'height', 'depth'] as const).map(axis => <button key={axis} ref={el => { labels.current[axis] = el; }} className={`dimension-label dimension-${axis}`} onClick={() => props.onEdit(axis)} aria-label={`Edit ${axis}, ${props.cabinet.envelope[axis]} millimetres`} title={`Edit ${axis}`}><span>{props.cabinet.envelope[axis]}</span><small>{axis === 'height' ? 'H' : axis === 'width' ? 'W' : 'D'}</small></button>)}
    {!error && (['width', 'height', 'depth'] as const).map(axis => <button key={`handle-${axis}`} ref={el => { handles.current[axis] = el; }} className="resize-handle" aria-label={`Resize ${axis} handle. Drag to resize; press Enter to edit.`} title={`Drag to resize ${axis}`} onPointerDown={event => { event.preventDefault(); adapter.current?.startDrag(axis, event.nativeEvent); }} onClick={() => props.onEdit(axis)}><span/></button>)}
    <div className="camera-toolbar" role="toolbar" aria-label="Camera views">
      {(['isometric', 'front', 'side', 'top'] as const).map(name => <Button key={name} className={view === name ? 'active' : ''} aria-pressed={view === name} onClick={() => { adapter.current?.view(name); setView(name); }}>{name === 'isometric' ? '3D' : name[0].toUpperCase() + name.slice(1)}</Button>)}
      <span className="toolbar-divider"/><IconButton icon="fit" label="Fit cabinet" onClick={() => adapter.current?.fit()}/>
      <button aria-label="Zoom out" onClick={() => adapter.current?.zoom(1.15)}>−</button><button aria-label="Zoom in" onClick={() => adapter.current?.zoom(0.85)}>+</button>
    </div>
    <div className="viewport-hint">Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Gold handles resize</div>
    <div className="axis-key" aria-hidden="true"><span className="axis-y">Y</span><span className="axis-z">Z</span><span className="axis-x">X</span><svg width="56" height="56"><path d="M28 30V8M28 30l20 12M28 30 8 42" fill="none" stroke="currentColor"/></svg></div>
  </div>;
}
