import test from 'node:test';
import assert from 'node:assert/strict';
import {createCabinet} from '../src/domain/cabinet';
import {addMetalDrawer} from '../src/commands/drawers';
import {addDivision} from '../src/commands/interiors';
import {evaluate} from '../src/geometry/evaluate';
import {flattenParts} from '../src/cnc/parts';
import {encodeQrCabinet,decodeQrCabinet} from '../src/docs/qr-cabinet';
import {partLink,linkedPart} from '../src/docs/project';
import {partLabels,defaultLabelStock} from '../src/docs/pdf';
import {CabinetStore} from '../src/commands/store';

test('label QR snapshot opens its exact cabinet and drawer part without a preloaded file',()=>{
 const base=createCabinet(),cabinet=addMetalDrawer(base,base.compartments.id).cabinet;
 const part=flattenParts(evaluate(cabinet)).find(p=>p.id.includes('/front'))!;
 assert.ok(part);
 const link=linkedPart(new URL(partLink('https://example.test/cabinet-studio/',cabinet.id,part.id,encodeQrCabinet(cabinet))).hash)!;
 const restored=decodeQrCabinet(link.model!);
 assert.deepEqual(restored,cabinet);
 assert.ok(flattenParts(evaluate(restored)).some(p=>p.id===link.part));
 const other=createCabinet(),store=new CabinetStore(other);
 assert.ok(store.commit(restored));store.undo();assert.deepEqual(store.getSnapshot().committed,other);
 const pdf=partLabels(cabinet,flattenParts(evaluate(cabinet)),{...defaultLabelStock,width:64,height:34},'https://example.test/cabinet-studio/').output();
 assert.match(pdf,/model=1\./);
});

test('QR codec preserves Unicode names, shelf identities and rejects corrupt snapshots',()=>{
 const base=createCabinet(),c=addDivision(base,base.compartments.id,'vertical',282).cabinet;
 c.name='Dulap · bucătărie';
 assert.deepEqual(decodeQrCabinet(encodeQrCabinet(c)),c);
 for(const invalid of ['','2.abc','1.not-a-snapshot','1.'+'a'.repeat(12000)])assert.throws(()=>decodeQrCabinet(invalid),/invalid or unsupported/);
 assert.deepEqual(linkedPart('#cabinet=old&part=side'),{cabinet:'old',part:'side'});
});
