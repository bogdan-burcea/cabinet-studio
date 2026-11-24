import {useEffect,useMemo,useRef,useState} from 'react';
import type {Cabinet} from '../domain/cabinet';
import {downloadLibrary,libraryConstructionInfo,readLibrary,writeLibrary,type LibraryEntry} from '../persistence/library';
import {readSimpleCabinet} from '../persistence/simple';
import {downloadCabinet} from '../persistence/files';
import {Button,IconButton,Notice} from './components';
export function CabinetLibrary({onOpen,onClose}:{onOpen(c:Cabinet,entryId:string):boolean;onClose():void}){
 const dialog=useRef<HTMLDialogElement>(null),[entries,setEntries]=useState<LibraryEntry[]>([]),[message,setMessage]=useState(''),[error,setError]=useState(false),[blocked,setBlocked]=useState(false),[removed,setRemoved]=useState<LibraryEntry|null>(null);
 useEffect(()=>{dialog.current?.showModal();try{setEntries(readLibrary(localStorage));}catch(e){setBlocked(true);feedback((e as Error).message,true);}},[]);
 function feedback(text:string,isError=false){setMessage(text);setError(isError);}
 function persist(next:LibraryEntry[]){try{writeLibrary(localStorage,next);setEntries(next);return true;}catch(e){feedback((e as Error).message,true);return false;}}
 const cards=useMemo(()=>entries.map(entry=>{let info=entry.info;if(!info.type||info.thicknesses===undefined||info.styles.some(s=>!s.startsWith('Inset · ')&&!s.startsWith('Overlay · '))){try{info={...info,...libraryConstructionInfo(readSimpleCabinet(entry.document))};}catch{/* Retain unreadable snapshots for download/error feedback. */}}return {entry,info:{...info,type:info.type??'Cabinet',thicknesses:info.thicknesses??1}};}),[entries]);
 function open(entry:LibraryEntry){try{if(onOpen(readSimpleCabinet(entry.document),entry.id))onClose();}catch(e){feedback((e as Error).message,true);}}
 return <dialog ref={dialog} className="lightbox-dialog cost-dialog library-dialog" id="cabinet-library" aria-labelledby="library-title" onCancel={e=>{e.preventDefault();onClose();}}><div className="lightbox-dialog__window">
 <div className="lightbox-dialog__header cost-title"><h2 id="library-title">Library</h2><div className="library-title-actions"><IconButton icon="undo" label="Undo removal" disabled={!removed} onClick={()=>{if(removed&&persist([removed,...entries]))setRemoved(null);}}/><IconButton icon="save" label="Download library" disabled={blocked||!entries.length} onClick={()=>{try{downloadLibrary(entries);}catch(error){feedback((error as Error).message,true);}}}/><IconButton icon="close" label="Close library" onClick={onClose}/></div></div>
 <div className="lightbox-dialog__main cost-fields">
 {message&&<div className="library-feedback" role="status"><Notice message={message} error={error} onDismiss={()=>feedback('')}/></div>}

 <div className={`library-entries ${!entries.length?'library-entries--empty':''}`}>{!entries.length&&!blocked?<p className="field-note library-empty">make a box and save it to the library</p>:cards.map(({entry,info})=><article className="library-card" key={entry.id}><div className="library-thumbnail"><img src={entry.thumbnail} alt={`3D preview of ${info.type}`} loading="lazy" width={480} height={360}/></div><div className="library-card-info"><h3>{info.type}</h3><p className="field-note library-dimensions">{entry.info.size.join(' × ')} mm</p><p className="field-note">{info.styles.join(' · ')||'No doors'}</p><p className="field-note">{entry.info.parts} CNC parts</p><p className="field-note">{info.thicknesses} stock thickness{info.thicknesses===1?'':'es'}</p><div className="library-actions"><Button onClick={()=>open(entry)}>Open</Button><IconButton icon="save" label={`Download ${info.type}`} onClick={()=>{try{downloadCabinet(readSimpleCabinet(entry.document));}catch(e){feedback((e as Error).message,true);}}}/><IconButton icon="delete" label={`Remove ${info.type}`} onClick={()=>{if(persist(entries.filter(e=>e.id!==entry.id)))setRemoved(entry);}}/></div></div></article>)}</div>
 </div></div></dialog>;
}
