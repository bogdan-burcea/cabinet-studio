import type {IconName} from '../design-system/Icon';
export function elementIcon(role:string,adjustable=false):IconName{
 if(role==='plinth-front')return 'element-bottom';if(role==='plinth-left')return 'element-left';if(role==='plinth-right')return 'element-right';
 if(adjustable)return 'element-adjustable';if(role==='door')return 'element-door';
 return role==='shelf'?'element-shelf':role==='divider'?'element-divider':role==='back'?'element-back':role==='top'?'element-top':role==='bottom'?'element-bottom':role==='left'?'element-left':role==='right'?'element-right':'panel';
}
