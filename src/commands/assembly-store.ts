import {createAssembly,validateAssembly,type Assembly} from '../domain/assembly';
export class AssemblyStore {
 private past:Assembly[]=[];private future:Assembly[]=[];private listeners=new Set<()=>void>();private state:{assembly:Assembly;canUndo:boolean;canRedo:boolean;revision:number};
 constructor(a=createAssembly()){validateAssembly(a);this.state={assembly:a,canUndo:false,canRedo:false,revision:0};}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>this.listeners.delete(fn);};getSnapshot=()=>this.state;
 private emit(a:Assembly){this.state={assembly:a,canUndo:!!this.past.length,canRedo:!!this.future.length,revision:this.state.revision+1};this.listeners.forEach(fn=>fn());}
 commit(a:Assembly){validateAssembly(a);if(JSON.stringify(a)===JSON.stringify(this.state.assembly))return;this.past.push(this.state.assembly);if(this.past.length>100)this.past.shift();this.future=[];this.emit(a);}
 undo=()=>{const a=this.past.pop();if(a){this.future.push(this.state.assembly);this.emit(a);}};
 redo=()=>{const a=this.future.pop();if(a){this.past.push(this.state.assembly);this.emit(a);}};
}
