import {useId,useState,type ButtonHTMLAttributes,type ReactNode} from 'react';
import {Icon,type IconName} from '../design-system/Icon';
/** eBay Skin owns control styling; application components only adapt our API. */
export function Button({icon,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon?:IconName}){
 const variant=className.includes('primary-button')?'btn--primary':'btn--secondary';
 return <button {...props} className={`btn ${variant} ${className.includes('destructive-button')?'btn--destructive':''} ${className}`}>{icon&&<Icon name={icon}/>}<span className="btn__cell">{children}</span></button>;
}
export function IconButton({icon,label,className='',onFocus,onBlur,onPointerEnter,onPointerLeave,onKeyDown,tooltip=true,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:IconName;label:string;tooltip?:boolean}){
 const id=useId(),[show,setShow]=useState(false);
 if(!tooltip)return <button {...props} aria-label={label} className={`icon-btn app-icon-button ${className}`} onFocus={onFocus} onBlur={onBlur} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onKeyDown={onKeyDown}><Icon name={icon}/></button>;
 return <span className={`tooltip app-icon-tooltip ${show?'tooltip--expanded':''}`}><button {...props} aria-label={label} aria-describedby={show?id:undefined} className={`icon-btn app-icon-button tooltip__host ${className}`} onFocus={e=>{setShow(true);onFocus?.(e);}} onBlur={e=>{setShow(false);onBlur?.(e);}} onPointerEnter={e=>{setShow(true);onPointerEnter?.(e);}} onPointerLeave={e=>{setShow(false);onPointerLeave?.(e);}} onKeyDown={e=>{if(e.key==='Escape')setShow(false);onKeyDown?.(e);}}><Icon name={icon}/></button><span id={id} role="tooltip" className="tooltip__overlay"><span className="tooltip__pointer tooltip__pointer--bottom"/><span className="tooltip__mask"><span className="tooltip__cell"><span className="tooltip__content">{label}</span></span></span></span></span>;
}
export function Section({title,aside,children}:{title:string;aside?:ReactNode;children:ReactNode}){
 return <section className="inspector-section"><div className="section-heading"><h3 className="medium-text">{title}</h3>{aside}</div>{children}</section>;
}

export function Notice({message,error=false,onDismiss}:{message:string;error?:boolean;onDismiss():void}){
 return <section className="notice snackbar-dialog" role={error?'alert':'status'}><div className="snackbar-dialog__window"><Icon name={error?'attention':'information'} size={16}/><div className="snackbar-dialog__main"><p>{message}</p></div><div className="snackbar-dialog__actions"><IconButton icon="close" label="Dismiss message" onClick={onDismiss}/></div></div></section>;
}
