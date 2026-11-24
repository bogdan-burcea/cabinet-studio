import test from 'node:test';
import assert from 'node:assert/strict';
import {sketchLinePositions} from '../src/viewport/assembly-sketch-lines';

test('sketch seams use actual millimetre endpoints on short and tall cabinets',()=>{
 for(const height of [720,2100]){
  const positions=sketchLinePositions([600,height,560],[{from:[0,300],to:[600,300],kind:'seam'}],[]);
  assert.deepEqual([...positions].filter((_,i)=>i%3!==2),[-300,300-height/2,300,300-height/2]);
  assert.ok(positions[2]>280&&positions[2]<280.1);assert.equal(positions[2],positions[5]);
 }
 assert.equal(sketchLinePositions([600,720,560],[],[]).length,0);
});
test('round handle strokes retain their radius and close exactly regardless of front aspect ratio',()=>{
 for(const height of [720,2100]){
  const positions=sketchLinePositions([600,height,560],[],[{ownerId:'door',shape:'circle',center:[450,400],radius:15}]);
  assert.equal(positions.length,64*6);
  for(let i=0;i<positions.length;i+=3)assert.ok(Math.abs(Math.hypot(positions[i]-150,positions[i+1]-(400-height/2))-15)<.0001);
  assert.deepEqual([...positions.slice(0,3)],[...positions.slice(-3)]);
 }
});
test('pulls, notches and opening diagonals remain independent, coplanar vector strokes',()=>{
 const positions=sketchLinePositions([600,720,560],[{from:[0,0],to:[600,720],kind:'opening'}],[{ownerId:'pull',shape:'line',from:[200,100],to:[352,100]},{ownerId:'notch',shape:'rectangle',center:[300,700],size:[100,40]}]);
 assert.equal(positions.length,6*6);assert.equal(positions[9]-positions[6],152);
 assert.deepEqual([...positions.slice(12,15)],[...positions.slice(-3)]);
 assert.equal(new Set([...positions].filter((_,i)=>i%3===2)).size,1);
});
