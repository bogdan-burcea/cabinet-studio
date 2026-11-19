import type {Cabinet} from '../domain/cabinet';
import {presets,type PresetId} from '../catalogue/presets';
import {resizeEnvelope} from './dimensions';
import {evaluate} from '../geometry/evaluate';
/** Size suggestions never activate supports; wall style disables floor supports in the same transaction. */
export function applySimplePreset(c:Cabinet,id:PresetId):Cabinet{
 const preset=presets.find(p=>p.id===id);if(!preset)throw new Error('Unknown cabinet size preset.');
 const next={...resizeEnvelope(c,{width:preset.width,height:preset.height,depth:preset.depth}),cabinetType:id,...id==='wall'?{installation:{...c.installation,type:'unassigned' as const,plinth:{...c.installation.plinth,enabled:false}}}:{}};evaluate(next);return next;
}
