import {fitDrawerRails} from '../rules/drawer-rails';
import type {Axis,Cabinet} from '../domain/cabinet';
import {attachFrontBoundaries} from '../rules/front-links';
export function resizeCabinet(c:Cabinet,axis:Axis,value:number):Cabinet {return resizeEnvelope(c,{[axis]:value});}
export function resizeEnvelope(c:Cabinet,size:Partial<Pick<Cabinet['envelope'],'width'|'height'|'depth'>>):Cabinet {const linked=attachFrontBoundaries(c);const next={...linked,envelope:{...linked.envelope,...size}};return size.depth===undefined?next:fitDrawerRails(next);}
