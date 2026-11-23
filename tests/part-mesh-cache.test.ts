import test from 'node:test';import assert from 'node:assert/strict';
import {createCabinet,type Vec3} from '../src/domain/cabinet';import {evaluate} from '../src/geometry/evaluate';import {panelDisplayGeometry,panelDisplayEdges} from '../src/viewport/part-mesh';import type {BackPocket} from '../src/rules/back-panel';
test('cached outlines return independently disposable copies and invalidate when real cuts change',()=>{
 const panel=evaluate(createCabinet()).panels.find(p=>p.role==='left')!,origin=panel.coreCenter.map((n,i)=>n-panel.coreSize[i]/2) as Vec3;
 const cut:BackPocket={id:'cache-test-cut',panelId:panel.id,origin:[origin[0],origin[1]+30,origin[2]+40],size:[5,60,80],axis:0,face:-1,kind:'front-profile'};
 const mesh=panelDisplayGeometry(panel,[]),first=panelDisplayEdges(panel,mesh,[],[]),expected=Array.from(first.getAttribute('position').array);first.dispose();
 const second=panelDisplayEdges(panel,mesh,[],[]);assert.deepEqual(Array.from(second.getAttribute('position').array),expected);second.getAttribute('position').setX(0,9999);second.dispose();
 const third=panelDisplayEdges(panel,mesh,[],[]);assert.deepEqual(Array.from(third.getAttribute('position').array),expected);third.dispose();mesh.dispose();
 for(const cuts of [[cut],[{...cut,size:[8,90,110] as Vec3}]]){const m=panelDisplayGeometry(panel,cuts),a=panelDisplayEdges(panel,m,cuts,[]),b=panelDisplayEdges(panel,m,cuts,[]);assert.notDeepEqual(Array.from(a.getAttribute('position').array),expected);assert.deepEqual(Array.from(a.getAttribute('position').array),Array.from(b.getAttribute('position').array));m.dispose();a.dispose();b.dispose();}
});
