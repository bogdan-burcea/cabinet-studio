import type {Cabinet} from '../domain/cabinet';
import {cnc,type CncSettings} from '../rules/cnc';
export function setCnc(c:Cabinet,patch:Partial<CncSettings>):Cabinet{return {...c,carcass:{...c.carcass,machining:{...cnc(c),...patch}}};}
