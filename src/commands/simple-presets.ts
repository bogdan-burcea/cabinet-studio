import type {Cabinet} from '../domain/cabinet';
import {presets,type PresetId} from '../catalogue/presets';
import {resizeEnvelope} from './dimensions';
import {evaluate} from '../geometry/evaluate';
/** Size suggestions only: never activate construction or installation features. */
export function applySimplePreset(c:Cabinet,id:PresetId):Cabinet{
 const preset=presets.find(p=>p.id===id);if(!preset)throw new Error('Unknown cabinet size preset.');
 const next=resizeEnvelope(c,{width:preset.width,height:preset.height,depth:preset.depth});evaluate(next);return next;
}
