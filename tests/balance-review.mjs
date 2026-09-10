import {newGame,upgradeGame,starters,team,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {writeFileSync} from 'node:fs';
const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const other=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(other){pair=[c,other];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'controlled-1',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'CONTROL',draft:{picksA:a,picksB:b,bans:[],actions:[]}};
const specs=[['equal',()=>{}],...ROLES.map((r,j)=>[r+'_all20',g=>starters(g)[j].stats.fill(90)]),['team_all10',g=>starters(g).forEach(p=>p.stats.fill(80))],['TOP_LNE20',g=>starters(g)[0].stats[0]=90],['ADC_TF20',g=>starters(g)[3].stats[1]=90],['SUP_VIS20',g=>starters(g)[4].stats[3]=90]];
const N=6000,results=[];
for(const [name,change] of specs){const g=structuredClone(base);change(g);let wins=0,laneWins=0,powers;for(let seed=0;seed<N;seed++){g.seed=seed;const s=simulateSet(g,m);wins+=s.winner===m.a;laneWins+=s.events[0].winner===m.a;powers=s.powersA.map((p,i)=>p-s.powersB[i]);}results.push({name,n:N,wins,setWinPct:Math.round(wins/N*10000)/100,topLaneWinPct:Math.round(laneWins/N*10000)/100,powerDelta:powers.map(x=>Math.round(x*100)/100)});console.log(JSON.stringify(results.at(-1)));}
writeFileSync('balance-results.json',JSON.stringify({method:'6000 paired seeds, same compositions by tags/type, no mastery/meta/form/burn differences, all base stats70, isolated no progression sets',draft:m.draft,results},null,2));
