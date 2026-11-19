import type {Cabinet} from '../domain/cabinet';
import {blumWallHanger} from '../rules/wall-hanging';
import {setBackPanel} from './back-panel';

export function setWallHanging(cabinet:Cabinet,enabled:boolean):Cabinet {
 const {installation}=cabinet,{mounting}=installation;
 if(!enabled)return {...cabinet,installation:{...installation,mounting:{...mounting,mode:'none'}}};
 if(cabinet.cabinetType!=='wall')throw Error('Choose the wall-style cabinet before adding wall hanging.');
 const inset=cabinet.carcass.back.joint?.inset??25;
 const next=setBackPanel(cabinet,{mode:'groove',inset:inset>=19&&inset<=31?inset:25});
 return {...next,installation:{...installation,type:'unassigned',plinth:{...installation.plinth,enabled:false},
  mounting:{...mounting,mode:'suspended-concept',geometry:blumWallHanger,topOffset:33}}};
}
