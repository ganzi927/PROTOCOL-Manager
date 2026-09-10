import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
function cb(){const g=upgradeGame(newGame('nva',1));for(const p of g.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}g.meta=[];for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}return g;}
const a=[],b=[];for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}a.push(pair[0].id);b.push(pair[1].id);}
const M=(pa,pb)=>({id:'c',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'T',draft:{picksA:pa,picksB:pb,bans:[],actions:[]}});
const lo=cb(),hi=cb();
for(const gg of [lo,hi])starters(gg).forEach(p=>{p.stats[0]=88;});
starters(lo)[2].stats[5]=45;starters(lo)[3].stats[5]=45;
starters(hi)[2].stats[5]=95;starters(hi)[3].stats[5]=95;
const m=M(a,b);const N=2000;
for(const [name,g] of [['lo',lo],['hi',hi]]){
 let all=0,ca=0, first3=0,cf=0, byIdx={};
 for(let s=0;s<N;s++){g.seed=s;let tf=0;
  for(const e of simulateSet(g,m).events)if(e.combat?.kind==='teamfight'){all+=e.resPowA;ca++;if(tf<3){first3+=e.resPowA;cf++;}byIdx[tf]=(byIdx[tf]||[0,0]);byIdx[tf][0]+=e.resPowA;byIdx[tf][1]++;tf++;}}
 console.log(name,'all',(all/ca).toFixed(2),'first3',(first3/cf).toFixed(2),'byTf',Object.entries(byIdx).slice(0,6).map(([k,v])=>k+':'+(v[0]/v[1]).toFixed(2)).join(' '));
}
