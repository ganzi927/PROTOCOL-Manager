// F15 "진영 교환" 축: 같은 두 로스터/조합을 A/B 라벨만 바꿔 실행했을 때, 라벨 자체가 숨은 우위를 만들지
// 않는지 확인한다(밸런스 튜닝이 아니라 정합성 점검 — assert 없는 진단 스크립트, balance-review.mjs와 동일 계열).
// m.id를 다르게 둬 실제 RNG 스트림이 달라지게 하고(hash(seed|matchId|...) 구조), 같은 두 팀을
// (a) 원래 배정(nva=A, crn=B) (b) 라벨만 뒤집은 배정(crn=A, nva=B, 조합도 함께 스왑)으로 각각 굴려
// "A 라벨"의 승률이 조합 실력과 무관하게 체계적으로 높거나 낮은지 페어 McNemar CI로 검정한다.
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';

const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}

// 일부러 비대칭 조합을 쓴다(균형 픽이면 라벨 편향이 있어도 숨을 수 있다) — 한쪽은 라인전 특성, 다른 쪽은 후반 성장 특성.
const laneHeavy=[],scaleHeavy=[];
for(const role of ROLES){
 const pool=CHAMPIONS.filter(c=>c.role===role);
 laneHeavy.push(pool[0].id);
 scaleHeavy.push(pool[Math.min(pool.length-1,3)].id);
}

const N=2000;
function runSet(matchId,aTeam,bTeam,aPicks,bPicks,seed){
 const g=structuredClone(base); g.teamId=aTeam; g.seed=seed;
 const m={id:matchId,a:aTeam,b:bTeam,bestOf:3,scoreA:0,scoreB:0,sets:[],label:'F15_SWAP',draft:{picksA:aPicks,picksB:bPicks,bans:[],actions:[]}};
 return simulateSet(g,m);
}

// 배정 1: nva=A(laneHeavy), crn=B(scaleHeavy). 배정 2(라벨 뒤집기): crn=A(laneHeavy), nva=B(scaleHeavy).
// "laneHeavy 조합이 이겼는가"를 공통 관측치로 정렬해서 비교한다 — 라벨이 아니라 조합 실력 기준 승패.
const laneHeavyWinsAsA=new Uint8Array(N), laneHeavyWinsAsB=new Uint8Array(N);
for(let seed=0;seed<N;seed++){
 const r1=runSet('f15-swap-orig',   'nva','crn', laneHeavy, scaleHeavy, seed);
 laneHeavyWinsAsA[seed]=r1.winner==='nva'?1:0;
 const r2=runSet('f15-swap-flipped','crn','nva', laneHeavy, scaleHeavy, seed);
 laneHeavyWinsAsB[seed]=r2.winner==='crn'?1:0; // crn은 배정2에서 B고 laneHeavy를 쓴다
}

function pairedCI(x,y,n){
 let b=0,c=0;
 for(let i=0;i<n;i++){ if(x[i]===1&&y[i]===0)b++; else if(x[i]===0&&y[i]===1)c++; }
 const d=(c-b)/n, varD=(b+c-(c-b)*(c-b)/n)/(n*n), se=Math.sqrt(Math.max(varD,0));
 return {d:d*100, lo:(d-1.96*se)*100, hi:(d+1.96*se)*100, b, c, disc:b+c};
}

const laneHeavyWinPctAsA=laneHeavyWinsAsA.reduce((s,v)=>s+v,0)/N*100;
const laneHeavyWinPctAsB=laneHeavyWinsAsB.reduce((s,v)=>s+v,0)/N*100;
const ci=pairedCI(laneHeavyWinsAsA,laneHeavyWinsAsB,N);

console.log(`=== F15 진영 교환(side-swap) 정합성 점검, N=${N} ===`);
console.log(`laneHeavy 조합 승률 — A 라벨일 때 ${laneHeavyWinPctAsA.toFixed(2)}%  vs  B 라벨일 때 ${laneHeavyWinPctAsB.toFixed(2)}%`);
console.log(`라벨 효과(A측−B측) ${ci.d>=0?'+':''}${ci.d.toFixed(2)}p  [${ci.lo.toFixed(2)}, ${ci.hi.toFixed(2)}]  b=${ci.b} c=${ci.c} (불일치 ${ci.disc}/${N})`);
console.log(ci.lo<=0&&ci.hi>=0
 ? 'PASS: 95% CI가 0을 포함 — A/B 라벨 자체가 체계적 우위를 만든다는 증거 없음.'
 : 'WARN: 95% CI가 0을 포함하지 않음 — 라벨(A/B) 자체에 숨은 비대칭이 있을 수 있음, 원인 조사 필요.');
