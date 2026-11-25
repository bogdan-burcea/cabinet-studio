import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet,defaultBinding} from '../src/domain/cabinet';
import {addSimpleDoors} from '../src/commands/simple-doors';
import {setBanding} from '../src/commands/materials';
import {readSimpleCabinet} from '../src/persistence/simple';
import {serialize} from '../src/persistence/files';
import {createAssembly} from '../src/domain/assembly';
import {syncAssemblyCabinet} from '../src/rules/assembly';
import {serializeAssembly,deserializeAssembly} from '../src/persistence/assembly';
import {resizeCabinet} from '../src/commands/dimensions';

test('supported explicit door stock survives repeated refreshes without new cabinet or assembly identities',()=>{
 let cabinet=addSimpleDoors(createCabinet(),'pair').cabinet;
 cabinet={...cabinet,fronts:cabinet.fronts.map(d=>({...d,material:defaultBinding({id:'generic-panel-19',revision:'1'})}))};
 cabinet=setBanding(cabinet,cabinet.fronts[0].id,'v-max',{id:'generic-edge-1',revision:'1'});
 const original=syncAssemblyCabinet(createAssembly(),cabinet),itemId=original.itemId,id=cabinet.id;
 let assembly=original.assembly;
 for(let reload=0;reload<5;reload++){
  cabinet=readSimpleCabinet(serialize(cabinet));assembly=deserializeAssembly(serializeAssembly(assembly));
  // Restored link and a missing/stale link must both reconnect by cabinet identity.
  const synced=syncAssemblyCabinet(assembly,cabinet,reload%2?undefined:itemId);assembly=synced.assembly;
  assert.equal(cabinet.id,id);assert.equal(synced.itemId,itemId);assert.equal(assembly.items.length,1);
 }
 const edited=resizeCabinet(cabinet,'width',800),synced=syncAssemblyCabinet(assembly,edited,itemId);
 assert.equal(synced.assembly.items.length,1);assert.equal(synced.itemId,itemId);
 assert.equal(synced.assembly.items[0].kind==='cabinet'&&synced.assembly.items[0].cabinet.envelope.width,800);
});
test('explicit door finishes, grain and stock are preserved instead of stripping the override on load',()=>{
 const initial=addSimpleDoors(createCabinet(),'single').cabinet;
 const cabinet={...initial,fronts:initial.fronts.map(d=>({...d,material:{...defaultBinding({id:'generic-panel-18',revision:'1'}),grain:'v' as const,finish:{id:'oak-concept',revision:'1'}}}))};
 assert.deepEqual(readSimpleCabinet(serialize(cabinet)),cabinet);
});
