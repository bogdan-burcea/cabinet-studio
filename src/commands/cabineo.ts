import type {Cabinet} from '../domain/cabinet';
import {CABINEO_REVISION,type CabineoId} from '../catalogue/cabineo';
export function setCabineo(c:Cabinet,id:CabineoId|''):Cabinet{return {...c,hardware:id?[{id,revision:CABINEO_REVISION}]:[]};}
