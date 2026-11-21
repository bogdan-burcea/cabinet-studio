import {useRef} from 'react';
export function UtilitiesTabs({value,onChange}:{value:'costs'|'labels';onChange(v:'costs'|'labels'):void}){
 const refs=useRef(new Map<string,HTMLDivElement>()),tabs=[['costs','Costs'],['labels','Part labels']] as const;
 return <div className="tabs utilities-tabs"><div className="tabs__items" role="tablist" aria-label="Utilities">
 {tabs.map(([id,label],index)=><div className="tabs__item" role="tab" id={`utility-tab-${id}`} aria-controls={`utility-panel-${id}`} aria-selected={value===id} tabIndex={value===id?0:-1} key={id} ref={e=>{if(e)refs.current.set(id,e);}} onClick={()=>onChange(id)} onKeyDown={e=>{
 if(['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key)){e.preventDefault();const next=tabs[e.key==='Home'?0:e.key==='End'?1:e.key==='Enter'||e.key===' '?index:1-index][0];onChange(next);refs.current.get(next)?.focus();}
 }}>{label}</div>)}
 </div></div>;
}
