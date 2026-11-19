import type {Cabinet} from '../domain/cabinet';
/** Update inherited carcass/interior stock without replacing identities or finish pins. */
export function setStockThickness(c:Cabinet,thickness:number):Cabinet{if(!Number.isFinite(thickness)||thickness<3||thickness>24||Math.abs(thickness*10-Math.round(thickness*10))>1e-6)throw Error('Stock thickness must be 3–24 mm in 0.1 mm steps.');return {...c,materials:{...c.materials,carcass:{...c.materials.carcass,stock:{id:`generic-panel-${+thickness.toFixed(1)}`,revision:'1'}}}};}
export function setPuzzleCorners(c:Cabinet,enabled:boolean):Cabinet{
 if(enabled)return {...c,carcass:{...c.carcass,corner:{mode:'puzzle',revision:'puzzle-1',pitch:50}}};
 const {corner,...carcass}=c.carcass;return {...c,carcass};
}
