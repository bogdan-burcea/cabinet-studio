import {useLayoutEffect,useId,useRef,type ReactNode} from 'react';
import {IconButton} from './components';

export function PartPreviewDialog({title,expanded,onClose,drawing,children,actions,orientation}:{
 title:string;expanded:boolean;onClose():void;drawing:ReactNode;children:ReactNode;actions?:ReactNode;orientation?:string;
}){
 void children;
 const dialog=useRef<HTMLDialogElement>(null),label=useId();
 useLayoutEffect(()=>{
  const element=dialog.current;
  if(expanded&&!element?.open)element?.showModal();
  else if(!expanded&&element?.open)element.close();
 },[expanded]);
 return <dialog ref={dialog} aria-labelledby={label} className="lightbox-dialog part-preview-dialog"
  onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="lightbox-dialog__window">
   <div className="lightbox-dialog__header"><h2 id={label}>{title}</h2>
    <div className="part-sheet-actions">
     <IconButton icon="close" label="Close part preview" tooltip={false} onClick={onClose}/>
    </div>
   </div>
   <div className="lightbox-dialog__main">
    {expanded&&<div className="part-sheet-drawing">{drawing}<span className="drawing-orientation">{orientation}</span></div>}

   </div>
   {actions&&<div className="lightbox-dialog__footer">{actions}</div>}
  </div>
 </dialog>;
}
