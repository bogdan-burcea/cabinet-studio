import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../design-system/Icon';
export function Button({ icon, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName }) {
  return <button {...props}>{icon && <Icon name={icon}/>} {children}</button>;
}
export function IconButton({ icon, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return <Button {...props} icon={icon} aria-label={label} title={label} className={`icon-button ${props.className || ''}`}/>;
}
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return <section className="inspector-section"><div className="section-heading"><h3>{title}</h3>{aside}</div>{children}</section>;
}
