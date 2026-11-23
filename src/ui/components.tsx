import {createPortal} from 'react-dom';
import {createContext,useContext,useId,useState,useEffect,useRef,useLayoutEffect,type ButtonHTMLAttributes,type InputHTMLAttributes,type ReactNode} from 'react';
import {Icon,type IconName} from '../design-system/Icon';
/** eBay Skin owns control styling; application components only adapt our API. */
export function Button({icon,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon?:IconName}){
 const variant=className.includes('primary-button')?'btn--primary':'btn--secondary';
 return <button {...props} className={`btn ${variant} ${className.includes('destructive-button')?'btn--destructive':''} ${className}`}>{icon&&<Icon name={icon}/>}<span className="btn__cell">{children}</span></button>;
}
export function Checkbox({children,className='',...props}:Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'className'>&{children:ReactNode;className?:string}){
 return <label className={`app-checkbox ${className}`}><span className="checkbox checkbox--large"><input {...props} className="checkbox__control" type="checkbox"/><span className="checkbox__icon" hidden><svg className="checkbox__checked" viewBox="0 0 24 24" aria-hidden="true"><use href={`${import.meta.env.BASE_URL}assets/evo-icons.svg#icon-checkbox-checked-24`}/></svg><svg className="checkbox__unchecked" viewBox="0 0 24 24" aria-hidden="true"><use href={`${import.meta.env.BASE_URL}assets/evo-icons.svg#icon-checkbox-unchecked-24`}/></svg></span></span><span>{children}</span></label>;
}
export function IconButton({icon,label,className='',onFocus,onBlur,onPointerEnter,onPointerLeave,onKeyDown,onPointerDown,tooltip=true,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:IconName;label:string;tooltip?:boolean}){
 const id=useId(),[show,setShow]=useState(false),button=useRef<HTMLButtonElement>(null),tip=useRef<HTMLSpanElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[position,setPosition]=useState({left:0,top:0,pointer:16,below:true});
 function stop(){clearTimeout(timer.current);}
 function hide(){stop();setShow(false);}
 function scheduleShow(){stop();window.dispatchEvent(new CustomEvent('evo-tooltip-request',{detail:id}));timer.current=setTimeout(()=>setShow(true),450);}
 function scheduleHide(){stop();timer.current=setTimeout(()=>setShow(false),1000);}
 useEffect(()=>{const other=(e:Event)=>{if((e as CustomEvent).detail!==id)hide();};const dismiss=()=>hide();const outside=(e:Event)=>{if(e.target!==button.current&&!button.current?.contains(e.target as Node))hide();};document.addEventListener('focusin',outside);document.addEventListener('pointerdown',outside);window.addEventListener('evo-tooltip-request',other);window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);return()=>{stop();document.removeEventListener('focusin',outside);document.removeEventListener('pointerdown',outside);window.removeEventListener('evo-tooltip-request',other);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);};},[id]);
 useLayoutEffect(()=>{if(!show||!button.current||!tip.current)return;const anchor=button.current.getBoundingClientRect(),rect=tip.current.getBoundingClientRect(),below=anchor.bottom+8+rect.height<=window.innerHeight-8,left=Math.max(8,Math.min(window.innerWidth-rect.width-8,anchor.left+anchor.width/2-rect.width/2));setPosition({left,top:below?anchor.bottom+8:Math.max(8,anchor.top-rect.height-8),pointer:Math.max(8,Math.min(rect.width-12,anchor.left+anchor.width/2-left-4)),below});},[show,label]);
 return <span className="app-icon-tooltip"><button {...props} ref={button} aria-label={label} aria-describedby={tooltip&&show?id:undefined} className={`icon-btn app-icon-button ${className}`} onFocus={e=>{if(tooltip)scheduleShow();onFocus?.(e);}} onBlur={e=>{scheduleHide();onBlur?.(e);}} onPointerEnter={e=>{if(tooltip)scheduleShow();onPointerEnter?.(e);}} onPointerLeave={e=>{scheduleHide();onPointerLeave?.(e);}} onPointerDown={e=>{hide();onPointerDown?.(e);}} onKeyDown={e=>{if(e.key==='Escape')hide();onKeyDown?.(e);}}><Icon name={icon}/></button>
 {tooltip&&show&&createPortal(<span className="tooltip tooltip--expanded app-tooltip-layer"><span ref={tip} id={id} role="tooltip" className="tooltip__overlay app-floating-tooltip" style={{left:position.left,top:position.top}}><span className={`tooltip__pointer tooltip__pointer--${position.below?'top':'bottom'}`} style={{left:position.pointer,top:position.below?-4:undefined,bottom:position.below?undefined:-4}}/><span className="tooltip__mask"><span className="tooltip__cell"><span className="tooltip__content">{label}</span></span></span></span></span>,document.body)}</span>;
}
const AccordionContext=createContext(false);
export function InspectorSections({children,accordion=true}:{children:ReactNode;accordion?:boolean}){if(!accordion)return <div className="inspector-static">{children}</div>;return <AccordionContext.Provider value={true}><ul className="accordion inspector-accordion" aria-roledescription="accordion">{children}</ul></AccordionContext.Provider>;}
export function Section({title,aside,children,className=''}:{title:string;aside?:ReactNode;children:ReactNode;className?:string}){
 const accordion=useContext(AccordionContext),[open,setOpen]=useState(title==='Dimensions');
 const heading=<div className="section-heading"><h3 className="medium-text">{title}</h3>{aside}</div>;
 if(!accordion)return <section className={`inspector-section ${className}`}>{heading}{children}</section>;
 if(title==='Cabinet type')return <li><section className="inspector-section">{heading}{children}</section></li>;
 return <li className={className}><details className="details inspector-details" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary className="details__summary"><h3 className="details__label">{title}</h3><span className="accordion-heading-aside">{aside}</span><span className="details__icon" hidden><Icon name="chevron" size={16}/></span></summary><div className="details__content inspector-section">{children}</div></details></li>;
}

export function Notice({message,error=false,persistent=false,onDismiss,onAction}:{message:string;error?:boolean;persistent?:boolean;onDismiss():void;onAction?():void}){
 const callback=useRef(onDismiss);callback.current=onDismiss;
 const [paused,setPaused]=useState(false),[leaving,setLeaving]=useState(false),[details,setDetails]=useState(false);
 const ending=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),closing=useRef(false);
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 const hasDetails=message.length>64||message.includes('\n');
 const body=hasDetails?error?'This issue needs attention':'Cabinet update available':message.replace(/[.!]$/,'');
 const dismiss=()=>{if(closing.current)return;closing.current=true;setLeaving(true);clearTimeout(ending.current);ending.current=setTimeout(()=>callback.current(),200);};
 const resolve=()=>{onAction?.();dismiss();};
 // Focus and the details dialog pause expiry. Dismissal has its own timer.
 useEffect(()=>{closing.current=false;setLeaving(false);setDetails(false);clearTimeout(ending.current);},[message]);
 useEffect(()=>{if(persistent||paused||leaving||details)return;const timer=setTimeout(dismiss,6000);return()=>clearTimeout(timer);},[message,persistent,paused,leaving,details]);
 useEffect(()=>()=>clearTimeout(ending.current),[]);
 useEffect(()=>{if(details)dialog.current?.showModal();},[details]);
 return <>
  <section className={`notice snackbar-dialog snackbar-dialog--transition ${leaving?'snackbar-dialog--hide':'snackbar-dialog--show'}`} aria-label={error?'Attention':'Cabinet update'} onPointerEnter={()=>setPaused(true)} onPointerLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={()=>setPaused(false)} role={error?'alert':'status'}>
   <div className="snackbar-dialog__window">
    <div className="snackbar-dialog__main">{error&&<Icon name="attention" size={24}/>}<p>{body}</p></div>
    <div className="snackbar-dialog__actions"><button type="button" className="link-button" onClick={hasDetails?()=>setDetails(true):onAction?resolve:dismiss}>{hasDetails?'View details':onAction?'Resolve':'Dismiss'}</button></div>
   </div>
  </section>
  {details&&createPortal(<dialog ref={dialog} className="lightbox-dialog notice-details" aria-labelledby={titleId} onClose={()=>{setDetails(false);dismiss();}}>
   <div className="lightbox-dialog__window">
    <div className="lightbox-dialog__header">
     <h2 id={titleId}>{error?'Issue details':'Cabinet update'}</h2>
     <IconButton icon="close" label="Close details" tooltip={false} onClick={()=>dialog.current?.close()}/>
    </div>
    <div className="lightbox-dialog__main"><p>{message}</p>{onAction&&<Button onClick={()=>{setDetails(false);resolve();}}>Resolve</Button>}</div>
   </div>
  </dialog>,document.body)}
 </>;
}

export function FieldPair({children}:{children:ReactNode}){return <div className="field-pair">{children}</div>;}
