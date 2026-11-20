import {Icon} from '../design-system/Icon';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {evoViewportTheme} from '../design-system/evo-viewport';
import type {ThemeName} from '../design-system/themes';
import {IconButton} from '../ui/components';
import type {RenderMode} from './display';
import {CabinetViewport} from './adapter';
import type {CncScene} from './cnc-scene';

interface Props {
  scene: CncScene;
  onMovePart?(partId:string,sheetId:string):void;onRotatePart?():void;
  selection: string;
  selectedIds?:string[];
  reverse: boolean;
  theme: ThemeName;
  onSelect(id: string,additive?:boolean): void;
}

export function CncViewport({scene, selection, selectedIds, reverse, theme, onSelect,onMovePart,onRotatePart}: Props) {
  const rotateButton=useRef<HTMLButtonElement>(null),move=useRef(onMovePart);move.current=onMovePart;
 const host = useRef<HTMLDivElement>(null), toolbar = useRef<HTMLDivElement>(null);
  const sheetLabels=useRef(new Map<string,HTMLButtonElement>());
  const viewport = useRef<CabinetViewport | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [view, setView] = useState<'top' | 'isometric'>('top');
  const [mode, setMode] = useState<RenderMode>('solid');
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    const ignore = () => {};
    try {
      const instance = new CabinetViewport(host.current!, {
        usableHeight: () => Math.max(80, (toolbar.current?.offsetTop ?? host.current!.clientHeight) - 16),
        cncMovePart:(part,sheet)=>move.current?.(part,sheet),cncPartAnchor:point=>{const button=rotateButton.current;if(button){button.style.visibility=point?'visible':'hidden';if(point){button.style.left=point.x+'px';button.style.top=(point.y-24)+'px';}}},
        select: (id,additive) => select.current(id,additive), dragStart: ignore, preview: ignore, commit: ignore, cancel: ignore,
        cncAnchors: anchors=>{for(const {id,x,y} of anchors){const label=sheetLabels.current.get(id);if(label){label.style.left=x+'px';label.style.top=y+'px';label.style.visibility='visible';}}},
        anchors: ignore, divisionAnchor: ignore, previewDivision: ignore,
      });
      viewport.current = instance;
      return () => { instance.dispose(); viewport.current = null; };
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    viewport.current?.updateCnc(scene, selection, reverse, evoViewportTheme(theme), mode,selectedIds);
  }, [scene, selection, selectedIds, reverse, theme, mode]);

  return <div className="viewport" ref={host}>
    {onRotatePart&&<button ref={rotateButton} type="button" className="viewport-pill cnc-part-rotate" aria-label="Rotate selected part 90 degrees" onClick={onRotatePart}><Icon name="rotate" size={16}/><span>90°</span></button>}
    {failed ? <div className="viewport-error" role="alert">3D could not start. Use the sheet list and part preview to inspect this layout.</div> :
      <div ref={toolbar} className="camera-toolbar" role="toolbar" aria-label="Camera views">
        <div className="segmented-buttons camera-presets"><ul>
          {(['isometric', 'top'] as const).map(preset => <li key={preset}><button type="button" className="segmented-buttons__button"
            aria-current={view === preset ? 'true' : undefined} aria-pressed={view === preset} onClick={() => { viewport.current?.view(preset); setView(preset); }}>{preset === 'top' ? 'Top' : '3D'}</button></li>)}
        </ul></div>
        <span className="toolbar-divider"/>
        <IconButton icon="fit" label="Fit layout" onClick={() => viewport.current?.fit()}/>
        <span className="toolbar-divider"/>
        {([{mode:'solid',icon:'cube',label:'Normal view'},{mode:'transparent',icon:'transparent',label:'Transparent view'},{mode:'wireframe',icon:'wireframe',label:'Wireframe view'}] as const).map(item =>
          <IconButton key={item.mode} icon={item.icon} label={item.label} aria-pressed={mode === item.mode} onClick={() => setMode(item.mode)}/>)}
      </div>}
  </div>;
}
