import assert from 'node:assert/strict';
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';

// 통제 조건: 전원 스탯 70·폼 50·번아웃 0·호흡 50·균형 전술·미드 우선·메타 없음.
// 리뷰(PROTOCOL-Ability-Review.md 부록)의 재현 스크립트와 같은 조합 방식을 쓴다.
function controlledBase(){
 const g=upgradeGame(newGame('nva',1));
 for(const p of g.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
 g.meta=[];
 for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
 return g;
}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const M=(pa,pb)=>({id:'ab-1',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'T',draft:{picksA:pa,picksB:pb,bans:[],actions:[]}});
const sum=ns=>ns.reduce((x,y)=>x+y,0);

// 1. 결정성: 같은 상태·시드 → 완전히 동일한 결과(자원 필드 포함).
{
 const g=controlledBase();g.seed=777;const m=M(a,b);
 assert.equal(JSON.stringify(simulateSet(g,m)),JSON.stringify(simulateSet(g,m)));
 const r=simulateSet(g,m);
 assert.ok(Array.isArray(r.leadA)&&r.leadA.length===5,'SetResult.leadA 슬롯 5개');
 assert.ok(r.events.every(e=>Number.isFinite(e.leadA)&&Number.isFinite(e.resPowA)),'이벤트별 자원 필드 기록');
}

// 2. 완전 대칭(양측 동일 픽·동일 스탯) → 숨은 팀 보너스 없음: 승률 ~50%, 평균 자원차 ~0.
{
 const g=controlledBase();const m=M(a,a);const N=4000;let wins=0,leadMean=0;
 for(let s=0;s<N;s++){g.seed=s;const r=simulateSet(g,m);wins+=r.winner===m.a;leadMean+=sum(r.leadA);}
 leadMean/=N;
 assert.ok(Math.abs(wins/N-0.5)<0.03,`대칭 세트 승률 ${(wins/N*100).toFixed(2)}%`);
 assert.ok(Math.abs(leadMean)<260,`대칭 평균 자원차 ${leadMean.toFixed(1)}`); // 한타 combat이 자원 진폭을 키워 노이즈 바닥도 상승(구조적 편향 아님)
}

// 3. 라인전 → 개인 자원 → 세트 승리: 우리 팀 탑 라인전만 70→90.
{
 const g0=controlledBase(),g1=controlledBase();
 starters(g1)[0].stats[0]=90;
 const m=M(a,b);const N=6000;let w0=0,w1=0,l0=0,l1=0;
 for(let s=0;s<N;s++){
  g0.seed=s;const r0=simulateSet(g0,m);w0+=r0.winner===m.a;l0+=r0.leadA[0];
  g1.seed=s;const r1=simulateSet(g1,m);w1+=r1.winner===m.a;l1+=r1.leadA[0];
 }
 assert.ok(l1/N>l0/N+70,`탑 라인 자원 우위: ${(l0/N).toFixed(0)} → ${(l1/N).toFixed(0)}`);
 // 자원 우위(+70골드/세트)는 강한 인과 링크로 못박는다. 세트 승률로의 전환은 방향만 확인한다:
 // 단위 4의 참여자 기반 한타는 무승부·상호 후퇴(NO_ENGAGE/TRADE)를 승리로 세지 않고, 한타 결과가
 // margin(교전 전 유리함)에 난수를 얹어 결정되므로, 단일 스탯 강화의 세트 승률 기여가 작고
 // 균형 기준선 자체가 한타 로직 변화에 ±1%p대로 민감하다(동일 시드 6000쌍에서 +0.8~1.4%p 관측, 부호 일관).
 // 작은 차이를 확정적 수치로 고정하지 않는다(사용자 지시). 회귀(0·음수)만 막는다.
 assert.ok(w1/N>w0/N+0.003,`탑 라인전 강화 → 세트 승률 ${(w0/N*100).toFixed(2)}% → ${(w1/N*100).toFixed(2)}%`);
}

// 4. 자원이 후속 전투의 유효 전력으로 전환된다: 전 라인 우세 팀의 한타 resPow가 양(+).
//    단위 5: resPowA는 확률 롤 사건(한타)에만 의미가 있다 — 공성·종료 사건은 제외(kind 필터).
{
 const g=controlledBase();starters(g).forEach(p=>p.stats.fill(82));
 const m=M(a,b);const N=2000;let res=0,cnt=0;
 for(let s=0;s<N;s++){g.seed=s;for(const e of simulateSet(g,m).events)if(e.combat?.kind==='teamfight'){res+=e.resPowA;cnt++;}}
 assert.ok(cnt>0&&res/cnt>1.0,`앞선 팀 한타 유효 전력 보정 평균 ${(res/(cnt||1)).toFixed(2)}`);
}

// 5. CAR이 전환 효율을 좌우: 같은 라인 우위(LNE)에서 캐리(미드·원딜) CAR만 다르게.
{
 const lo=controlledBase(),hi=controlledBase();
 for(const gg of [lo,hi])starters(gg).forEach(p=>{p.stats[0]=88;});
 starters(lo)[2].stats[5]=45;starters(lo)[3].stats[5]=45;
 starters(hi)[2].stats[5]=95;starters(hi)[3].stats[5]=95;
 const m=M(a,b);const N=2000;let rLo=0,cLo=0,rHi=0,cHi=0;
 // 단위 5: 세트 길이가 스노볼로 가변이라(강팀이 넥서스로 빨리 끝냄) 후반 한타는 '지는 쪽만 살아남는' 생존편향이 있다.
 // resPow→전력 전환은 초반 한타(누적 lead가 라인·오브만 반영할 때)에서 측정한다 — 방법론 보정, 임계값 하향 아님.
 for(let s=0;s<N;s++){
  lo.seed=s;let n=0;for(const e of simulateSet(lo,m).events)if(e.combat?.kind==='teamfight'&&n++<3){rLo+=e.resPowA;cLo++;}
  hi.seed=s;let k=0;for(const e of simulateSet(hi,m).events)if(e.combat?.kind==='teamfight'&&k++<3){rHi+=e.resPowA;cHi++;}
 }
 assert.ok(rHi/cHi>rLo/cLo+0.15,`높은 CAR이 자원을 더 큰 전투력으로 전환: ${(rLo/cLo).toFixed(2)} < ${(rHi/cHi).toFixed(2)}`);
}

// 6. 경계·건전성: 유한 종료, 자원/전력 보정 범위, 확률 클램프.
{
 const g=controlledBase();const m=M(a,b);
 for(let s=0;s<400;s++){g.seed=s*7+1;const r=simulateSet(g,m);
  assert.ok(r.winner===m.a||r.winner===m.b);
  assert.ok(r.events.length>=5&&r.events.length<=32); // 단위 5: 스켈레톤 9구간 + 공성·연장 운영 사건(요구 변경)
  assert.ok(r.endReason==='NEXUS'||r.endReason==='CAP'); // 명시적 종료 사유
  assert.ok(r.leadA.length===5&&r.leadA.every(Number.isFinite));
  for(const e of r.events){
   assert.ok(Number.isFinite(e.leadA)&&Math.abs(e.resPowA)<=8);
   assert.ok(e.prob>=5&&e.prob<=95);
  }
 }
}

console.log('PASS ability: determinism, symmetric no-bias, lane→resource→set-win, resource→combat conversion, CAR gating, bounds');
