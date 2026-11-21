import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createCabinet} from '../src/domain/cabinet';
import {setConstructionMode} from '../src/commands/construction';
import {setBackPanel} from '../src/commands/back-panel';
import {setCabineo} from '../src/commands/cabineo';
import {setCnc} from '../src/commands/cnc';
import {addDivision} from '../src/commands/interiors';
import {evaluate} from '../src/geometry/evaluate';
import {ConstructionThumbnail} from '../src/ui/ConstructionThumbnail';
import {CabinetStore} from '../src/commands/store';

test('construction preview retains the back groove with and without Cabineos',()=>{
 const c=setConstructionMode(setBackPanel(createCabinet(),{mode:'groove',inset:10}),'top','rails');
 const paths:string[]=[];
 for(const hardware of ['', 'cabineo-8'] as const){
  const m=evaluate(setCabineo(c,hardware)),html=renderToStaticMarkup(React.createElement(ConstructionThumbnail,{panels:m.panels.filter(p=>p.role.startsWith('top-')),joints:m.cabineo,pockets:m.pockets,drilling:m.drilling,backBores:m.backFasteners}));
  const grooves=[...html.matchAll(/class="back-pocket" d="([^"]*)"/g)].map(m=>m[1]);
  assert.equal(grooves.filter(Boolean).length,1);paths.push(grooves.find(Boolean)!);
 }
 assert.equal(paths[0],paths[1]);
});

test('global Cabineo counts remain editable when a 50 mm rail can fit just one per end',()=>{
 let c=setCnc(setCabineo(setConstructionMode(createCabinet(),'top','rails'),'cabineo-8'),{cabineoPerSide:3});
 const store=new CabinetStore(c);c=structuredClone(c);c.carcass.top.frontDepth=50;assert.ok(store.commit(c));
 const before=evaluate(c);assert.equal(before.cabineo.filter(j=>j.hostId.endsWith('/top-front-rail')).length,2);
 c=setCnc(c,{cabineoPerSide:2});assert.ok(store.commit(c));
 const m=evaluate(c);assert.equal(m.cabineo.filter(j=>j.hostId.endsWith('/top-front-rail')).length,2);
 assert.equal(m.cabineo.filter(j=>j.hostId.endsWith('/bottom')).length,4);
 assert.equal(c.carcass.machining!.cabineoPerSide,2);assert.deepEqual(m.issues,[]);
 store.undo();assert.equal(store.getSnapshot().committed.carcass.machining!.cabineoPerSide,3);store.redo();assert.deepEqual(store.getSnapshot().committed,c);
 // Short contacts from a divider into that rail need the same per-contact cap.
 const split=addDivision(c,c.compartments.id,'vertical',282);assert.doesNotThrow(()=>evaluate(split.cabinet));
});
