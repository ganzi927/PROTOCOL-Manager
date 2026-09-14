import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet,ROLES,CHAMPIONS} from '../lib/game.ts';
import {travelSeconds,MAP} from '../lib/simulation/arena.ts';
const g=upgradeGame(newGame('nva',1));
const m={id:'spatial',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'spatial',draft:{picksA:ROLES.map(r=>CHAMPIONS.find(c=>c.role===r).id),picksB:ROLES.map(r=>CHAMPIONS.filter(c=>c.role===r)[1].id),bans:[],actions:[]}};
for(let seed=0;seed<300;seed++){
 g.seed=seed;const r=simulateSet(g,m),positions=new Map(),respawns=new Map();
 for(const e of r.events){const cb=e.combat;if(!cb)continue;
  assert.ok(MAP.nodes[cb.location],'actual scene node');
  for(const move of cb.movements){
   const key=move.ref.side+move.ref.slot;
   assert.ok(Math.abs(move.arrive-move.depart-travelSeconds(move.from,move.to,move.ref.slot))<1e-6,'shared route timing');
   assert.ok(move.arrive<=cb.clock+1e-6,`participants arrive before event ${seed}/${cb.seq}/${key}: ${move.arrive}>${cb.clock}`);
   if(respawns.has(key)){assert.ok(move.depart>=respawns.get(key)-1e-6,'respawn before departure');assert.equal(move.from,move.ref.side+'_base');respawns.delete(key);}
   else if(positions.has(key))assert.equal(move.from,positions.get(key),'position persists between scenes');
   positions.set(key,move.to);
  }
  for(const kill of cb.kills){
   for(const ref of [kill.killer,...kill.assists])assert.ok(cb.movements.some(m=>m.ref.side===ref.side&&m.ref.slot===ref.slot&&m.arrive<=kill.clock+1e-6),'killer/assistant has arrived');
   respawns.set(kill.victim.side+kill.victim.slot,kill.clock+10+Math.min(42,kill.clock/60*1.5));
  }
  if(cb.siege?.nexus)assert.equal(cb.location,cb.side==='A'?'B_base':'A_base','nexus scene in losing base');
 }
}
console.log('PASS spatial: 300 sets, shared path durations, arrived participants, respawn departure, persistent positions, losing nexus');
