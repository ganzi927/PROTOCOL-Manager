import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {champProfile,draftEffects} from '../lib/balance/composition.ts';
function cb(){const g=upgradeGame(newGame('nva',1));for(const p of g.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}g.meta=[];for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}return g;}
const pickBy=score=>ROLES.map(r=>{const pool=CHAMPIONS.filter(c=>c.role===r);return pool.map(c=>({id:c.id,s:score(champProfile(c.id))})).sort((x,y)=>y.s-x.s)[0].id;});
const frontComp=pickBy(p=>p.frontline+p.engage+p.peel), pokeComp=pickBy(p=>p.poke+p.range-p.frontline);
console.log('de.fight',draftEffects(frontComp,pokeComp).fight.toFixed(2),'de.lane',draftEffects(frontComp,pokeComp).lane.toFixed(2));
const M=(pa,pb)=>({id:'c',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'T',draft:{picksA:pa,picksB:pb,bans:[],actions:[]}});
const run=(pa,pb)=>{const g=cb();const N=5000;let win=0,cap=0,capW=0,nexW=0,nex=0,tfW=0,tfN=0,evS=0;
 const m=M(pa,pb);
 for(let s=0;s<N;s++){g.seed=s;const r=simulateSet(g,m);win+=r.winner===m.a;evS+=r.events.length;
  if(r.endReason==='CAP'){cap++;capW+=r.winner===m.a;}else{nex++;nexW+=r.winner===m.a;}
  for(const e of r.events)if(e.combat?.kind==='teamfight'){tfN++;tfW+=e.winner===m.a;}}
 return {set:win/N,cap:cap/N,capW:cap?capW/cap:0,nexW:nex?nexW/nex:0,tf:tfW/tfN,ev:evS/N};
};
const f=run(frontComp,pokeComp), s=run(pokeComp,frontComp);
console.log('front A:',JSON.stringify(f,(k,v)=>typeof v==='number'?+v.toFixed(3):v));
console.log('swap  A:',JSON.stringify(s,(k,v)=>typeof v==='number'?+v.toFixed(3):v));
