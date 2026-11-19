import {Icon} from '../design-system/Icon';
import { useEffect, useRef, useState, useId } from 'react';
import type { Axis } from '../domain/cabinet';
import { dimensionLimits } from '../rules/validate';
export function DimensionField({ plain = false, axis, label, value, cancelValue, onPreview, onCommit, onCancel, register, limits, normalize, retainInvalid = false }: {
  plain?:boolean; normalize?(value: number): number; axis?: Axis; label: string; value: number; cancelValue: number; limits?: { min: number; max: number }; retainInvalid?: boolean; onPreview(value: number): void; onCommit(value: number): boolean; onCancel(): void; register?(element: HTMLInputElement | null): void;
}) {
  const inputId=useId();
  const [draft, setDraft] = useState(String(value)), editing = useRef(false), canceled = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(String(value)); }, [value]);
  function commit() { if (canceled.current) { canceled.current = false; return; } editing.current = false; const raw = draft.trim() ? Number(draft) : NaN, value = normalize ? normalize(raw) : raw; if (!onCommit(value)) { if (!retainInvalid) setDraft(String(cancelValue)); } else if (normalize) setDraft(String(value)); }
  const range = limits ?? dimensionLimits[axis!];
  function increment(direction:number){const current=Number(draft),next=Math.max(range.min,Math.min(range.max,Math.round(((Number.isFinite(current)?current:value)+direction)*10)/10));editing.current=false;if(onCommit(next))setDraft(String(next));else if(!retainInvalid)setDraft(String(cancelValue));}
  const paddle=(direction:1|-1)=><button type="button" tabIndex={-1} aria-hidden="true" className={`icon-btn icon-btn--small icon-btn--transparent number-input__${direction===1?'increment':'decrement'}`} disabled={direction===1?Number(draft)>=range.max:Number(draft)<=range.min} onPointerDown={e=>e.preventDefault()} onClick={()=>increment(direction)}><Icon name={direction===1?'add':'remove'} size={24}/></button>;
  return <div className="dimension-field field"><label htmlFor={inputId} className="field__label">{label}{!plain&&<small>{axis?axis==='width'?'overall':'body':''}</small>}</label><span className="number-input"><span className="textbox">{paddle(-1)}<input id={inputId} className="textbox__control" ref={register} aria-label={label} type="number" inputMode="decimal" step="0.1" min={range.min} max={range.max} value={draft} onFocus={()=>{editing.current=true;}} onChange={event=>{setDraft(event.target.value);onPreview(event.target.value.trim()?Number(event.target.value):NaN);}} onBlur={commit} onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();increment(event.key==='ArrowUp'?1:-1);}if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){canceled.current=true;editing.current=false;setDraft(String(cancelValue));onCancel();event.currentTarget.blur();}}}/>{paddle(1)}</span></span></div>;
}
