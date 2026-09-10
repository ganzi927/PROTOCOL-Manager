import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);}
// 완전 대칭: 양 팀 같은 픽
const m={id:'eq',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'C',draft:{picksA:a,picksB:a,bans:[],actions:[]}};
const N=Number(process.argv[2]||4000);let wins=0,capW=0,cap=0,nexA=0,nexB=0;
for(let s=0;s<N;s++){const g=structuredClone(base);g.seed=s;const r=simulateSet(g,m);wins+=r.winner===m.a;
 if(r.endReason==='CAP'){cap++;capW+=r.winner===m.a;} }
console.log(`대칭 세트 A 승률 ${(wins/N*100).toFixed(2)}%  (N=${N})  CAP ${(cap/N*100).toFixed(1)}%  CAP중 A승 ${cap?(capW/cap*100).toFixed(1):'-'}%`);
