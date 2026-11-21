import {isConstructionSelection} from '../domain/construction-selection';
import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
export function renameItem(c:Cabinet,id:string,value:string):Cabinet{
 const e=evaluate(c);if(!isConstructionSelection(c,id)&&![...e.panels,...e.openings,...e.installation.feet,...e.drawers.drawers].some(p=>p.id===id))throw Error('Choose a cabinet part or opening to rename.');
 const name=value.trim();if(!name||name.length>60)throw Error('Use an item name of 1–60 characters.');
 if(c.names?.[id]===name)return c;return {...c,names:{...c.names,[id]:name}};
}
