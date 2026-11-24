import {useEffect,useRef} from 'react';
import {Button,IconButton} from './components';
export function LibrarySaveDialog({busy,onCancel,onSave}:{busy:boolean;onCancel():void;onSave(overwrite:boolean):void}){
 const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="lightbox-dialog cost-dialog library-save-dialog" aria-labelledby="library-save-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}><div className="lightbox-dialog__window"><div className="lightbox-dialog__header cost-title"><h2 id="library-save-title">Save to library</h2><IconButton icon="close" label="Cancel library save" disabled={busy} onClick={onCancel}/></div><div className="lightbox-dialog__main"><p>This cabinet is already in your library. Overwrite its saved version or save a new item?</p><div className="library-save-actions"><Button disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy} onClick={()=>onSave(false)}>Save as new</Button><Button className="primary-button" disabled={busy} onClick={()=>onSave(true)}>Overwrite</Button></div></div></div></dialog>;
}
