import {Icon} from '../design-system/Icon';
import {useRef} from 'react';

type Tab<Id extends string> = {id:Id; label:string; controls?:string};
const tabs = [
  {id:'box', label:'Build', controls:'workspace-box'},
  {id:'assembly',label:'Assembly',controls:'workspace-assembly'},
  {id:'cnc', label:'Cut', controls:'workspace-cnc'},
] as const;
export type Workspace = typeof tabs[number]['id'];

export function SegmentedTabs<Id extends string>({tabs,value,label,prefix,className,onChange}:{
  tabs:readonly Tab<Id>[];value:Id;label:string;prefix:string;className:string;onChange(value:Id):void;
}) {
  const items = useRef(new Map<Id,HTMLButtonElement>());
  return <div className={`segmented-buttons ${className}`}>
    <ul role="tablist" aria-label={label}>
      {tabs.map((tab, i) => <li key={tab.id} role="presentation"><button type="button" ref={el => {
        if(el)items.current.set(tab.id,el);else items.current.delete(tab.id);
      }} role="tab" id={`${prefix}-${i}`} aria-controls={tab.controls} className="segmented-buttons__button"
        aria-current={value===tab.id?'true':undefined} aria-selected={value===tab.id} tabIndex={value===tab.id?0:-1}
        onClick={()=>onChange(tab.id)}
        onKeyDown={event=>{
          if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
          event.preventDefault();
          const next=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length].id;
          onChange(next);items.current.get(next)?.focus();
        }}><span className="segmented-buttons__button-cell">{prefix==='workspace-tab'&&<Icon name={tab.id==='box'?'cabinet':tab.id==='assembly'?'assembly':'cut'} size={20}/>} {tab.label}</span></button></li>)}
    </ul>
  </div>;
}

export function WorkspaceTabs({value,onChange}:{value:Workspace;onChange(value:Workspace):void}){
  return <SegmentedTabs tabs={tabs} value={value} onChange={onChange} label="Workspace" prefix="workspace-tab" className="workspace-tabs"/>;
}
