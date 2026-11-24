import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';import {CabinetStore} from '../src/commands/store';import {readSimpleCabinet} from '../src/persistence/simple';import {LIBRARY_KEY,librarySnapshot,readLibrary,writeLibrary,type LibraryEntry} from '../src/persistence/library';
function memory(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
function entry():LibraryEntry{return {id:'library-1',...librarySnapshot(createCabinet(),'Base cabinet'),savedAt:'2026-11-23T10:00:00Z',thumbnail:'data:image/webp;base64,YWJj',price:{cents:123450,missing:2,unplaced:0},info:{size:[600,720,560],doors:0,drawers:0,parts:5,stock:18,styles:[]}};}
test('library stores independent named native snapshots, thumbnails and estimate metadata without touching autosave',()=>{
 const s=memory(),c=createCabinet(),saved=entry();s.data.set('cabinet-studio.simple.autosave.v1','untouched');assert.deepEqual(readLibrary(s),[]);writeLibrary(s,[saved]);assert.deepEqual(readLibrary(s),[saved]);assert.equal(s.data.get('cabinet-studio.simple.autosave.v1'),'untouched');
 const snapshot=librarySnapshot(c,'  Shaker cabinet  ');c.envelope.height=1000;const opened=readSimpleCabinet(snapshot.document);assert.equal(opened.name,'Shaker cabinet');assert.equal(opened.envelope.height,720);assert.throws(()=>librarySnapshot(c,'  '),/name/);
 const store=new CabinetStore(c);assert.ok(store.commit(opened));store.undo();assert.deepEqual(store.getSnapshot().committed,c);store.redo();assert.deepEqual(store.getSnapshot().committed,opened);
});
test('library removal and undo preserve exact saved data and full storage never replaces existing entries',()=>{
 const s=memory(),saved=entry();writeLibrary(s,[saved]);writeLibrary(s,[]);assert.deepEqual(readLibrary(s),[]);writeLibrary(s,[saved]);const before=s.getItem(LIBRARY_KEY);assert.throws(()=>writeLibrary({getItem:s.getItem,setItem:()=>{throw Error('QuotaExceededError');}},[]),/full or unavailable/);assert.equal(s.getItem(LIBRARY_KEY),before);assert.deepEqual(readLibrary(s),[saved]);
});
test('malformed or duplicate library records fail without discarding their stored source',()=>{
 const s=memory();for(const bad of [{version:2,entries:[]},{version:1,entries:[entry(),entry()]},{version:1,entries:[{...entry(),thumbnail:'javascript:bad'}]},{version:1,entries:[{...entry(),price:{cents:-1}}]}]){const raw=JSON.stringify(bad);s.data.set(LIBRARY_KEY,raw);assert.throws(()=>readLibrary(s),/unchanged/);assert.equal(s.getItem(LIBRARY_KEY),raw);}
});

import {libraryConstructionInfo} from '../src/persistence/library';import {addSimpleDoors} from '../src/commands/simple-doors';import {defaultShaker} from '../src/rules/shaker';
test('library card metadata counts distinct CNC stock thicknesses and describes cabinet and door construction',()=>{
 const c=addSimpleDoors({...createCabinet(),cabinetType:'tall'},'pair').cabinet;c.fronts=c.fronts.map((d,i)=>({...d,style:'shaker-frame',shaker:{...defaultShaker,infill:i?'wood':'glass'}}));
 const info=libraryConstructionInfo(c);assert.equal(info.type,'Tall cabinet');assert.equal(info.thicknesses,2);assert.deepEqual(info.styles,['Overlay · glass shaker','Overlay · panel shaker']);
 const s=memory(),saved={...entry(),info:{...entry().info,...info}};writeLibrary(s,[saved]);assert.deepEqual(readLibrary(s),[saved]);
 const legacy=entry();writeLibrary(s,[legacy]);assert.deepEqual(readLibrary(s),[legacy]);assert.equal(libraryConstructionInfo(readSimpleCabinet(legacy.document)).type,'Custom cabinet');
});

import {putLibraryEntry,LibraryWorkingCopy,findLibrarySnapshot} from '../src/persistence/library';
test('overwrite replaces exactly one stable entry, save-as-new preserves it, and missing entries fail intact',()=>{
 const s=memory(),legacy=entry(),{price,...withoutPrice}=legacy,newEntry={...withoutPrice,id:'new-entry'};writeLibrary(s,[legacy]);
 assert.equal(putLibraryEntry(s,newEntry,legacy.id),legacy.id);assert.equal(readLibrary(s).length,1);assert.equal(readLibrary(s)[0].price,undefined);
 assert.equal(putLibraryEntry(s,newEntry),newEntry.id);assert.deepEqual(readLibrary(s).map(e=>e.id),['new-entry',legacy.id]);
 const before=s.getItem(LIBRARY_KEY);assert.throws(()=>putLibraryEntry(s,{...newEntry,id:'another'},'removed'),/removed/);assert.equal(s.getItem(LIBRARY_KEY),before);
});
test('working-copy library association follows edits, Undo/Redo, explicit opening and new cabinets',()=>{
 const saved=entry(),initial=readSimpleCabinet(saved.document),store=new CabinetStore(initial),a=store.getSnapshot().committed,links=new LibraryWorkingCopy(a,[saved]);assert.equal(links.entryId,entry().id);
 assert.ok(store.commit({...a,envelope:{...a.envelope,width:650}}));const b=store.getSnapshot().committed;links.update(b);assert.equal(links.entryId,entry().id);
 links.link(b,'second-version');store.undo();links.update(store.getSnapshot().committed);assert.equal(links.entryId,entry().id);store.redo();links.update(store.getSnapshot().committed);assert.equal(links.entryId,'second-version');
 assert.ok(store.commit(createCabinet()));links.update(store.getSnapshot().committed);assert.equal(links.entryId,null);store.undo();links.update(store.getSnapshot().committed);assert.equal(links.entryId,'second-version');
 links.link(b,null);assert.equal(links.entryId,null);assert.equal(findLibrarySnapshot([saved],{...initial,envelope:{...initial.envelope,width:650}}),null);
});

import {serializeLibrary} from '../src/persistence/library';
test('whole-library download retains every saved native document, thumbnail and stable entry ID',()=>{
 const a=entry(),b={...entry(),id:'second-entry'},text=serializeLibrary([a,b]);
 const loaded=readLibrary({getItem:()=>text,setItem:()=>{throw Error('export must not write');}});assert.deepEqual(loaded,[a,b]);assert.deepEqual(readSimpleCabinet(loaded[0].document),readSimpleCabinet(a.document));assert.deepEqual(JSON.parse(serializeLibrary([])),{version:1,entries:[]});
});
