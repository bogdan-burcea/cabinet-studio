import { useEffect, useRef, useState } from 'react';
import type { Axis } from '../domain/cabinet';
import { dimensionLimits } from '../rules/validate';
export function DimensionField({ axis, label, value, cancelValue, onPreview, onCommit, onCancel, register, limits }: {
  axis?: Axis; label: string; value: number; cancelValue: number; limits?: { min: number; max: number }; onPreview(value: number): void; onCommit(value: number): boolean; onCancel(): void; register?(element: HTMLInputElement | null): void;
}) {
  const [draft, setDraft] = useState(String(value)), editing = useRef(false), canceled = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(String(value)); }, [value]);
  function commit() { if (canceled.current) { canceled.current = false; return; } editing.current = false; if (!onCommit(draft.trim() ? Number(draft) : NaN)) setDraft(String(cancelValue)); }
  const range = limits ?? dimensionLimits[axis!];
  return <label className="dimension-field"><span>{label}<small>{axis ? axis === 'width' ? 'overall' : 'body' : ''}</small></span><div className="input-unit"><input ref={register} aria-label={label} type="number" inputMode="decimal" step="0.1" min={range.min} max={range.max} value={draft}
    onFocus={() => { editing.current = true; }}
    onChange={event => { setDraft(event.target.value); onPreview(event.target.value.trim() ? Number(event.target.value) : NaN); }}
    onBlur={commit}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') { canceled.current = true; editing.current = false; setDraft(String(cancelValue)); onCancel(); event.currentTarget.blur(); }
    }}/><span>mm</span></div></label>;
}
