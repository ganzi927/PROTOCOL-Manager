import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'sm',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'C',draft:{picksA:a,picksB:b,bans:[],actions:[]}};
const N=Number(process.argv[2]||1500);
let nexus=0,cap=0,evSum=0,evMax=0,evMin=99,siegeEv=0,nexusEv=0,inhibEv=0,noWin=0,held=0,reset=0;
const evCounts={};
let detSample;
for(let s=0;s<N;s++){
 const g=structuredClone(base);g.seed=s;
 const r=simulateSet(g,m);
 if(s===7){detSample=JSON.stringify(r);}
 if(r.endReason==='NEXUS')nexus++;else cap++;
 evSum+=r.events.length;evMax=Math.max(evMax,r.events.length);evMin=Math.min(evMin,r.events.length);
 evCounts[r.events.length]=(evCounts[r.events.length]||0)+1;
 for(const e of r.events){ if(e.combat?.kind==='siege'){siegeEv++;const rr=e.combat.siege.result;
   if(rr==='NEXUS')nexusEv++;else if(rr==='INHIB')inhibEv++;else if(rr==='NO_WINDOW')noWin++;else if(rr==='HELD')held++;else if(rr==='RESET')reset++;}}
}
// determinism
{const g=structuredClone(base);g.seed=7;const r2=JSON.stringify(simulateSet(g,m));console.log('determinism seed7:', r2===detSample);}
console.log(`N=${N}  NEXUS ${(nexus/N*100).toFixed(1)}%  CAP ${(cap/N*100).toFixed(1)}%`);
console.log(`events/set avg ${(evSum/N).toFixed(1)}  min ${evMin}  max ${evMax}`);
console.log('event-count histogram', JSON.stringify(evCounts));
console.log(`siege events: total ${siegeEv}  NEXUS ${nexusEv}  INHIB ${inhibEv}  NO_WINDOW ${noWin}  HELD ${held}  RESET ${reset}  SIEGE(tower) ${siegeEv-nexusEv-inhibEv-noWin-held-reset}`);
