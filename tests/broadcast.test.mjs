import assert from 'node:assert/strict';
import {formationOffset,playbackDestination} from '../lib/simulation/broadcast.ts';
import {buildReplay,stateAt,posAt} from '../lib/simulation/replay.ts';
import {newGame,upgradeGame,simulateSet} from '../lib/game.ts';

const track={side:'A',slot:3,key:[{t:0,pos:[40,40],state:'move'},{t:10,pos:[50,50],state:'fight'},{t:15,pos:[50,50],state:'dead'},{t:25,pos:[12,88],state:'move'}]};
assert.equal(posAt(track,9.99).state,'move','arrival cannot leak before timestamp');
assert.equal(posAt(track,10).state,'fight');
assert.equal(posAt(track,14.99).state,'fight','death cannot leak before timestamp');
assert.equal(posAt(track,15).state,'dead');
assert.deepEqual(posAt(track,24.9).pos,[50,50]);
assert.equal(posAt(track,25).state,'move');
assert.deepEqual(formationOffset(track,10,'poke'),[0,0],'formation blends from arrival');
const before=formationOffset(track,10.449,'poke'),after=formationOffset(track,10.451,'poke');
assert.ok(Math.hypot(before[0]-after[0],before[1]-after[1])<.01);
assert.deepEqual(formationOffset(track,16,'poke'),formationOffset(track,14,'poke'),'death keeps battle display location');
const sup={...track,slot:4};assert.notDeepEqual(formationOffset(sup,14,'engage'),formationOffset(sup,14,'protect'));
// F23: reducedMotion=true는 0.45초 완만한 전환 없이 목표 가중치로 즉시 스냅한다(모션 감소 접근성) —
// 생략하면(기존 모든 호출부) 기존과 100% 동일해야 한다.
assert.deepEqual(formationOffset(track,10.001,'poke'),formationOffset(track,10.001,'poke',false),'reducedMotion 생략은 명시적 false와 동일(기존 호출부 전부 무변화)');
assert.notDeepEqual(formationOffset(track,10.001,'poke'),formationOffset(track,10.001,'poke',true),'reducedMotion=true는 완만한 전환 도중 다른(즉시 스냅된) 값을 낸다');
assert.deepEqual(formationOffset(track,10.001,'poke',true),formationOffset(track,10.2,'poke',true),'reducedMotion=true는 도착 직후부터 이미 최종 가중치(스냅) — 시간에 따라 더 안 움직인다');
assert.deepEqual(playbackDestination(-5,50),{time:0,ended:false,notifyEnd:false});
assert.deepEqual(playbackDestination(60,50),{time:50,ended:true,notifyEnd:true});
assert.deepEqual(playbackDestination(NaN,50),{time:0,ended:false,notifyEnd:false});
assert.equal(playbackDestination(50,50,true).notifyEnd,false,'end callback cannot repeat while ended');
assert.equal(playbackDestination(10,50,true).ended,false,'rewind leaves terminal state before painting');
assert.equal(playbackDestination(50,50,playbackDestination(10,50,true).ended).notifyEnd,true,'replaying can complete again');
const g=upgradeGame(newGame('nva',7)),m={id:'broadcast',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'control'};
for(let seed=0;seed<50;seed++){
 g.seed=seed;const result=simulateSet(g,m),rd=buildReplay(result);
 const start=stateAt(rd,0),end=stateAt(rd,rd.duration);
 assert.equal(start.completed,0);assert.ok(Object.values(start.kda).every(k=>k.kills+k.deaths+k.assists===0));
 const expected=Object.fromEntries(rd.tracks.map(t=>[t.side+t.slot,{kills:0,deaths:0,assists:0}]));
 for(const e of result.events)for(const kill of e.combat?.kills??[]){
  expected[kill.killer.side+kill.killer.slot].kills++;
  expected[kill.victim.side+kill.victim.slot].deaths++;
  for(const a of kill.assists)expected[a.side+a.slot].assists++;
 }
 assert.deepEqual(end.kda,expected,'live KDA equals original combat records');
 assert.equal(end.completed,rd.windows.length);
 const first=rd.beats.find(b=>b.kind==='kill');if(first){
  assert.ok(Object.values(stateAt(rd,first.t-.00001).kda).every(k=>k.kills===0));
  assert.equal(Object.values(stateAt(rd,first.t).kda).reduce((n,k)=>n+k.kills,0),1);
 }
 assert.deepEqual(stateAt(rd,0),start,'rewind fully resets visible state');
}
console.log('PASS broadcast: 50 matches, source KDA, no future death/arrival, completed events, rewind, smooth formations, reduced-motion instant snap, seek boundaries');
