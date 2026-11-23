import type {Cabinet} from './cabinet';
/** Build selections describe features; Cut retains the physical board identities. */
export function constructionOwner(c:Cabinet,id:string):string{
 const owner=c.fronts.find(d=>id.startsWith(d.id+'/shaker/'));if(owner)return owner.id;
 if(id===`${c.id}/construction/top`)return `${c.id}/panel/top`;if(id===`${c.id}/construction/back`)return `${c.id}/panel/back`;
 const prefix=`${c.id}/panel/`;if(!id.startsWith(prefix))return id;
 const role=id.slice(prefix.length);
 if(role==='top'||role.startsWith('top-'))return prefix+'top';
 if(role==='back'||role.startsWith('back-'))return prefix+'back';
 if(role==='front-upper-rail'||role==='front-lower-rail')return c.compartments.id;
 return id;
}
export function isConstructionSelection(c:Cabinet,id:string){return id===`${c.id}/panel/top`||id===`${c.id}/panel/back`;}
export function constructionRows(c:Cabinet,panels:readonly {id:string;label:string;role:string}[]){
 const remaining=panels.filter(p=>p.role!=='door'&&![`${c.id}/panel/top`,`${c.id}/panel/back`,c.compartments.id].includes(constructionOwner(c,p.id)));
 const base=remaining.filter(p=>['left','right','bottom'].includes(p.role));
 return [...base,...(['top','back'] as const).map(role=>({id:`${c.id}/panel/${role}`,role,label:c.names?.[`${c.id}/panel/${role}`]??(role==='top'?'Top':'Back')})),...remaining.filter(p=>!['left','right','bottom'].includes(p.role))];
}
