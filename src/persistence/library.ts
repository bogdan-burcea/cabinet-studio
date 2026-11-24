import {presets} from '../catalogue/presets';
import {evaluate} from '../geometry/evaluate';
import {flattenParts,type FlatPart} from '../cnc/parts';
import type {Cabinet} from '../domain/cabinet';
import {serialize} from './files';
export const LIBRARY_WORKING_COPY_KEY='cabinet-studio.library-working-copy.v1';
export const LIBRARY_KEY='cabinet-studio.library.v1';
export interface LibraryEntry {id:string;name:string;savedAt:string;document:string;thumbnail:string;price?:{cents:number;missing:number;unplaced:number;basis?:'sheet'|'area';deductOffcuts?:boolean};info:{size:number[];doors:number;drawers:number;parts:number;stock:number;styles:string[];type?:string;thicknesses?:number}}
type StorageAccess=Pick<Storage,'getItem'|'setItem'>;
export function readLibrary(storage:StorageAccess):LibraryEntry[]{
 const raw=storage.getItem(LIBRARY_KEY);if(!raw)return [];
 try{const value=JSON.parse(raw),ids=new Set<string>();
 if(value?.version!==1||!Array.isArray(value.entries)||value.entries.length>100)throw Error();
 for(const e of value.entries){if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||typeof e.savedAt!=='string'||!Number.isFinite(Date.parse(e.savedAt))||typeof e.document!=='string'||e.document.length>2_000_000||typeof e.thumbnail!=='string'||e.thumbnail.length>300_000||!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.thumbnail)||![e.info?.doors,e.info?.drawers,e.info?.parts,e.info?.stock].every(n=>Number.isFinite(n)&&n>=0)||!Array.isArray(e.info?.size)||e.info.size.length!==3||!e.info.size.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0)||!Array.isArray(e.info.styles)||!e.info.styles.every((s:unknown)=>typeof s==='string'))throw Error();if(e.price!==undefined&&(!e.price||![e.price.cents,e.price.missing,e.price.unplaced].every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||e.price.basis!==undefined&&!['sheet','area'].includes(e.price.basis)||e.price.deductOffcuts!==undefined&&typeof e.price.deductOffcuts!=='boolean'))throw Error();if(e.info.type!==undefined&&typeof e.info.type!=='string'||e.info.thicknesses!==undefined&&(!Number.isInteger(e.info.thicknesses)||e.info.thicknesses<1))throw Error();ids.add(e.id);}
 return value.entries;
 }catch{throw Error('The saved library could not be read. Its data has been kept unchanged.');}
}
export function writeLibrary(storage:StorageAccess,entries:LibraryEntry[]){
 if(entries.length>100)throw Error('The library holds up to 100 cabinets. Remove an entry or download a backup before saving another.');
 const text=JSON.stringify({version:1,entries});readLibrary({getItem:()=>text,setItem:()=>{}});
 try{storage.setItem(LIBRARY_KEY,text);}catch{throw Error('The library could not be saved. Browser storage may be full or unavailable. Download cabinets as files to keep a backup.');}
}
export function librarySnapshot(cabinet:Cabinet,name:string){
 const clean=name.trim();if(!clean||clean.length>80)throw Error('Enter a cabinet name between 1 and 80 characters.');
 return {name:clean,document:serialize({...cabinet,name:clean})};
}

export function libraryConstructionInfo(cabinet:Cabinet,parts:FlatPart[]=flattenParts(evaluate(cabinet))){
 const type=presets.find(p=>p.id===cabinet.cabinetType)?.name??'Custom cabinet';
 const styles=[...new Set(cabinet.fronts.map(d=>`${d.placement==='inset'?'Inset':'Overlay'} · ${d.style==='shaker-routed'?'routed panel':d.style==='shaker-routed-panel'?d.shaker?.infill==='glass'?'routed glass shaker':'routed panel':d.style==='shaker-frame'?d.shaker?.infill==='glass'?'glass shaker':'panel shaker':'panel'}`))];
 return {type,styles,thicknesses:new Set(parts.map(p=>p.thickness)).size};
}

export function putLibraryEntry(storage:StorageAccess,entry:LibraryEntry,overwriteId?:string){
 const entries=readLibrary(storage);
 if(overwriteId&&!entries.some(e=>e.id===overwriteId))throw Error('This library entry was removed. Save the cabinet as a new item instead.');
 const saved={...entry,id:overwriteId??entry.id};
 writeLibrary(storage,overwriteId?entries.map(e=>e.id===overwriteId?saved:e):[saved,...entries]);return saved.id;
}
export function findLibrarySnapshot(entries:LibraryEntry[],cabinet:Cabinet){
 const snapshot=JSON.stringify(cabinet);return entries.find(e=>{try{return JSON.stringify(JSON.parse(e.document).cabinet)===snapshot;}catch{return false;}})?.id??null;
}
/** Follow the working copy across edits and the store's existing Undo/Redo objects. */
export class LibraryWorkingCopy {
 private origins=new WeakMap<Cabinet,string|null>();private current:Cabinet;entryId:string|null;
 constructor(cabinet:Cabinet,entries:LibraryEntry[]=[]){this.current=cabinet;this.entryId=findLibrarySnapshot(entries,cabinet);this.origins.set(cabinet,this.entryId);}
 update(cabinet:Cabinet){if(this.origins.has(cabinet))this.entryId=this.origins.get(cabinet)!;else{if(cabinet.id!==this.current.id)this.entryId=null;this.origins.set(cabinet,this.entryId);}this.current=cabinet;}
 link(cabinet:Cabinet,entryId:string|null){this.origins.set(cabinet,entryId);this.current=cabinet;this.entryId=entryId;}
}

export function serializeLibrary(entries:LibraryEntry[]){
 const text=JSON.stringify({version:1,entries},null,2);readLibrary({getItem:()=>text,setItem:()=>{}});return text;
}
export function downloadLibrary(entries:LibraryEntry[]){
 const url=URL.createObjectURL(new Blob([serializeLibrary(entries)],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download='WeMakeBox.library.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
