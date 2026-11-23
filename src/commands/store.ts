import type { Cabinet } from '../domain/cabinet';
import { evaluate } from '../geometry/evaluate';
import { validate } from '../rules/validate';
export interface Snapshot { committed: Cabinet; preview: Cabinet | null; error: string | null; issueFeatureId: string | null; canUndo: boolean; canRedo: boolean; revision: number }
export class CabinetStore {
  private past: Cabinet[] = [];
  private future: Cabinet[] = [];
  private listeners = new Set<() => void>();
  private state: Snapshot;
  constructor(cabinet: Cabinet) { evaluate(cabinet); this.state = { committed: structuredClone(cabinet), preview: null, error: null, issueFeatureId: null, canUndo: false, canRedo: false, revision: 0 }; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<Snapshot>) {
    this.state = { ...this.state, ...patch, canUndo: !!this.past.length, canRedo: !!this.future.length, revision: this.state.revision + 1 };
    this.listeners.forEach(fn => fn());
  }
  preview = (candidate: Cabinet) => {
    try { evaluate(candidate); } catch (e) {const errors=validate(candidate).filter(i=>i.severity==='error');this.emit({preview:null,error:(e as Error).message,issueFeatureId:errors[0]?.featureId??null});return false;}
    this.emit({ preview: structuredClone(candidate), error: null, issueFeatureId: null }); return true;
  };
  commit = (candidate = this.state.preview) => {
    if (!candidate || !this.preview(candidate)) return false;
    if (JSON.stringify(candidate) === JSON.stringify(this.state.committed)) { this.cancel(); return true; }
    this.past.push(this.state.committed); if (this.past.length > 100) this.past.shift();
    this.future = []; this.emit({ committed: structuredClone(candidate), preview: null, error: null }); return true;
  };
  cancel = () => this.emit({ preview: null, error: null, issueFeatureId: null });
  undo = () => { const previous = this.past.pop(); if (previous) { this.future.push(this.state.committed); this.emit({ committed: previous, preview: null, error: null, issueFeatureId: null }); } };
  redo = () => { const next = this.future.pop(); if (next) { this.past.push(this.state.committed); this.emit({ committed: next, preview: null, error: null, issueFeatureId: null }); } };
}
