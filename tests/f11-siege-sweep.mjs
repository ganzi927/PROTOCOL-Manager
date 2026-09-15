// F11 검증 도구: 공성·넥서스 마무리의 완료 조건을 실측으로 확인한다(assert 없음, balance-review.mjs와 같은 진단 스크립트).
// 확인 대상: (1) 정상 종료=실제 넥서스 파괴 비율, (2) CAP_TIME/CAP_EVENT 발생률과 원인, (3) 전력차별 승률 민감도,
// (4) "한타 승리 후 재정비가 더 좋은 상황"이 실제로 존재하는가(한타 승 직후 공성 시도가 구조물 무변화로 끝나는 빈도).
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {writeFileSync} from 'node:fs';

const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}

const a=[],b=[];
for(const role of ROLES){
 const pool=CHAMPIONS.filter(c=>c.role===role);
 let pair;
 for(const c of pool){const other=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(other){pair=[c,other];break;}}
 if(!pair)throw Error(role);
 a.push(pair[0].id);b.push(pair[1].id);
}
const m={id:'f11-sweep',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'F11_SWEEP',draft:{picksA:a,picksB:b,bans:[],actions:[]}};

const N=1500;
const deltas=[0,10,20,-10,-20];
const results=[];

for(const delta of deltas){
 const g=structuredClone(base);
 if(delta!==0) starters(g).forEach(p=>p.stats=p.stats.map(v=>Math.max(1,Math.min(99,v+delta))));
 const endCounts={NEXUS:0,CAP_TIME:0,CAP_EVENT:0};
 const winByReason={NEXUS:{a:0,b:0},CAP_TIME:{a:0,b:0},CAP_EVENT:{a:0,b:0}};
 const clockBuckets={early:0,mid:0,late:0}; // <1800s(30분) / <2800s(약 47분) / 그 이상
 let regroupEvidence=0, siegeAttemptsAfterFightWin=0, aWins=0;
 for(let seed=0;seed<N;seed++){
  g.seed=seed;
  const s=simulateSet(g,m);
  const reason=s.endReason??'CAP_EVENT';
  endCounts[reason]++;
  const aWon=s.winner===m.a;
  if(aWon)aWins++;
  winByReason[reason][aWon?'a':'b']++;
  const clock=s.events.at(-1)?.combat?.clock ?? 0;
  if(clock<1800)clockBuckets.early++; else if(clock<2800)clockBuckets.mid++; else clockBuckets.late++;
  for(let i=0;i<s.events.length-1;i++){
   const ev=s.events[i], next=s.events[i+1];
   if(ev.phase==='한타' && ev.combat?.fight?.winner && next.phase==='공성'){
    siegeAttemptsAfterFightWin++;
    if((next.combat?.siege?.structuresDown??0)===0) regroupEvidence++;
   }
  }
 }
 results.push({
  delta, N,
  aWinPct:Math.round(aWins/N*10000)/100,
  endCounts,
  nexusEndPct:Math.round(endCounts.NEXUS/N*10000)/100,
  winByReason,
  clockBuckets,
  siegeAttemptsAfterFightWin,
  regroupEvidence,
  regroupPct:Math.round(regroupEvidence/siegeAttemptsAfterFightWin*10000)/100, // 한타 승 직후 공성이 구조물 무변화로 끝난 비율("재정비가 나은 상황"의 실측 근거
 });
 console.log(JSON.stringify(results.at(-1)));
}

writeFileSync('f11-siege-results.json',JSON.stringify({
 method:`${N} paired seeds x 5 power deltas, same compositions by tags/type, no mastery/meta/form/burn differences, base stats70±delta, isolated no progression sets`,
 draft:m.draft, results,
},null,2));
console.log('F11 sweep done — see f11-siege-results.json');
