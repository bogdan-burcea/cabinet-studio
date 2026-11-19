import type {Vec3} from '../domain/cabinet';
export type RenderMode='solid'|'transparent'|'wireframe';
// Presentation offsets only; canonical geometry and saved intent are never changed.
export function explodedOffset(role:string,center:Vec3,bodyCenter:Vec3,amount:number):Vec3 {
 if(!amount)return [0,0,0];
 if(role==='left')return [-amount,0,0];if(role==='right')return [amount,0,0];
 if(role==='bottom'||role==='foot')return [0,-amount,0];if(role==='top'||role.startsWith('top-'))return [0,amount,0];
 if(role==='back'||role.startsWith('back-')||role==='mounting')return [0,0,-amount];
 if(role==='door'||role.startsWith('plinth'))return [0,0,amount];
 if(role==='divider')return [(center[0]>=bodyCenter[0]?1:-1)*amount*.6,0,amount*.3];
 return [0,(center[1]>=bodyCenter[1]?1:-1)*amount*.35,amount*.5];
}
