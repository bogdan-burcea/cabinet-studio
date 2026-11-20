import type {NestOverride} from './nesting';
export type PlacementChoices=Record<string,NestOverride>;
export class PlacementHistory{
 private past:PlacementChoices[]=[];private future:PlacementChoices[]=[];
 private state={choices:{} as PlacementChoices,canUndo:false,canRedo:false};
 private listeners=new Set<()=>void>();
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 getSnapshot=()=>this.state;
 private emit(choices:PlacementChoices){this.state={choices,canUndo:!!this.past.length,canRedo:!!this.future.length};this.listeners.forEach(fn=>fn());}
 commit=(choices:PlacementChoices)=>{if(JSON.stringify(choices)===JSON.stringify(this.state.choices))return;this.past.push(this.state.choices);if(this.past.length>100)this.past.shift();this.future=[];this.emit(structuredClone(choices));};
 undo=()=>{const old=this.past.pop();if(old){this.future.push(this.state.choices);this.emit(old);}};
 redo=()=>{const next=this.future.pop();if(next){this.past.push(this.state.choices);this.emit(next);}};
 reset=()=>{this.past=[];this.future=[];this.emit({});};
}
