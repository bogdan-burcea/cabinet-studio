import {useEffect,useRef,useState} from 'react';
import {Icon,type IconName} from '../design-system/Icon';
import {IconButton} from './components';
export function StructureItem(p:{id:string;label:string;icon:IconName;selected:boolean;hidden:boolean;alert:boolean;onSelect(id:string,additive:boolean):void;onRename?(id:string,label:string):void;onToggleVisibility?(id:string):void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(p.label),cancel=useRef(false),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(editing){input.current?.focus();input.current?.select();}},[editing]);
 const save=()=>{try{if(!cancel.current&&draft.trim()&&draft.trim()!==p.label)p.onRename?.(p.id,draft.trim());}finally{cancel.current=false;setEditing(false);}};
 return <div className={`tree-item-row ${p.hidden?'tree-item-row--hidden':''}`}>
 {editing?<span className="textbox tree-rename"><input ref={input} className="textbox__control" aria-label={`Rename ${p.label}`} maxLength={60} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancel.current=true;e.currentTarget.blur();}}}/></span>:<button className={`tree-item ${p.selected?'selected':''}`} aria-label={p.label} aria-pressed={p.selected} onClick={e=>p.onSelect(p.id,e.shiftKey||e.metaKey||e.ctrlKey)} onDoubleClick={()=>{if(p.onRename){setDraft(p.label);setEditing(true);}}}><Icon name={p.icon} size={16}/><span>{p.label}</span></button>}
 {p.alert&&<span className="item-alert" role="img" aria-label={`${p.label} needs attention`}><Icon name="attention-filled" size={16}/></span>}
 {p.onToggleVisibility&&<IconButton tooltip={false} icon="eye" className={`icon-btn--transparent ${p.hidden?'item-hidden':''}`} label={`${p.hidden?'Show':'Hide'} ${p.label}`} aria-pressed={p.hidden} onClick={()=>p.onToggleVisibility?.(p.id)}/>}
 </div>;
}
