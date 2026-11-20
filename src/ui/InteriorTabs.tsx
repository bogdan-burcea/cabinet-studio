import {useRef} from 'react';
export type InteriorCategory='shelves'|'doors'|'drawers';
const categories=[['shelves','Shelves'],['doors','Doors'],['drawers','Drawers']] as const;
export function InteriorTabs({value,onChange}:{value:InteriorCategory;onChange(value:InteriorCategory):void}){
 const items=useRef(new Map<string,HTMLDivElement>());
 return <div className="tabs interior-tabs"><div className="tabs__items" role="tablist" aria-label="Interior elements">
  {categories.map(([id,label],index)=><div className="tabs__item" role="tab" key={id}
   id={`interior-tab-${id}`} aria-controls="interior-creation-panel" aria-selected={value===id}
   tabIndex={value===id?0:-1} ref={element=>{if(element)items.current.set(id,element);else items.current.delete(id);}}
   onClick={()=>onChange(id)} onKeyDown={event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();onChange(id);return;}
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=categories[event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowLeft'?-1:1)+3)%3][0];
    onChange(next);items.current.get(next)?.focus();
   }}>{label}</div>)}
 </div></div>;
}
