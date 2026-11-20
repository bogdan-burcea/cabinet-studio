import {drillSizes} from '../cnc/tooling';
import type {CabineoBore} from '../rules/cabineo';

const operation:Record<CabineoBore['kind'],string>={
 housing:'Connector pocket',receiver:'Connector pilot','back-fixing':'Back fixing',pilot:'Pilot',
 'shelf-support':'Shelf support','hinge-cup':'Hinge cup','hinge-pilot':'Hinge pilot',
 handle:'Handle','foot-pilot':'Foot pilot',
};

export function DrillingDetails({holes,cutter,limit}:{holes:CabineoBore[];cutter?:number;limit?:number}){
 const rows=drillSizes(holes);
 if(!rows.length&&cutter===undefined)return <p className="field-note">No drilled holes on this face.</p>;
 return <div className="table table--density-compact machining-table"><table aria-label={cutter!==undefined?'Cut bits':'Machining details'}>
  <thead><tr><th scope="col">Operation</th><th scope="col" className="table-cell--numeric">Ø (mm)</th>
   <th scope="col" className="table-cell--numeric">Depth</th><th scope="col" className="table-cell--numeric">Qty</th></tr></thead>
  <tbody>
   {cutter!==undefined&&<tr><th scope="row">Profile cutter</th><td className="table-cell--numeric">{cutter}</td>
    <td className="table-cell--numeric">—</td><td className="table-cell--numeric">—</td></tr>}
   {limit!==undefined&&cutter!==undefined&&cutter>limit&&<tr><th scope="row">Narrow slot cutter</th>
    <td className="table-cell--numeric">≤ {+limit.toFixed(2)}</td><td className="table-cell--numeric">—</td><td className="table-cell--numeric">—</td></tr>}
   {rows.map(row=><tr key={JSON.stringify(row)}><th scope="row">{operation[row.kind as CabineoBore['kind']]}</th>
    <td className="table-cell--numeric">{row.diameter}</td><td className="table-cell--numeric">{row.through?'Through':`${row.depth} mm`}</td>
    <td className="table-cell--numeric">{row.count}</td></tr>)}
  </tbody>
 </table></div>;
}
