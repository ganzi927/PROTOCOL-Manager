// F19: 유망주 잠재력을 확정 숫자로 공개하지 않고 스카우트 관측 범위(오차 포함)·육성 거리로 보여준다.
// scoutPotential(p)은 순수 함수 — 저장하지 않는다, id/age/stats/pot로만 결정된다(재추첨 없음).
import assert from 'node:assert/strict';
import {newGame,upgradeGame,ovr,avg,scoutPotential} from '../lib/game.ts';

const g=upgradeGame(newGame('nva',5));
const pool=g.players; // 로스터 전체 + FA(어린 선수 포함) — 나이 분포가 실제로 섞여 있다.
assert.ok(pool.length>50,'표본 확보');

// --- 1. 결정성: 같은 선수에 두 번 호출해도 같은 결과(재추첨 없음, 구세이브 재계산에도 불변). ---
{
 for(const p of pool.slice(0,30)){
  assert.deepEqual(scoutPotential(p),scoutPotential(p),`결정적 결과 (${p.id})`);
 }
}

// --- 2. 범위 유효성: lo<=hi<=99, lo는 현재 즉시 전력(OVR) 아래로 내려가지 않는다(이미 보여준 폼이 하한). ---
{
 for(const p of pool){
  const est=scoutPotential(p);
  assert.ok(est.lo<=est.hi,`lo<=hi (${p.id})`);
  assert.ok(est.hi<=99,`hi<=99 (${p.id})`);
  assert.ok(est.lo>=Math.floor(avg(p.stats))-1,`lo가 현재 평균 스탯 아래로 크게 내려가지 않음 (${p.id}): lo=${est.lo} avgStats=${avg(p.stats).toFixed(1)}`);
  assert.ok(['가까움','보통','멂'].includes(est.devTier),`devTier 유효 (${p.id})`);
 }
}

// --- 3. devTier는 정의대로(hi-OVR 격차 크기)와 항상 일치한다 — 화면 라벨이 계산과 다르게 보이지 않는다. ---
{
 for(const p of pool.slice(0,40)){
  const est=scoutPotential(p);
  const gap=est.hi-ovr(p);
  const expect=gap<=6?'가까움':gap<=16?'보통':'멂';
  assert.equal(est.devTier,expect,`devTier가 hi-OVR 격차와 일치 (${p.id}): gap=${gap}`);
 }
}

// --- 4. "확정 숫자 공개 아님": 화면에 보이는 범위의 중심이 실제 숨은 pot 평균과 항상 같지는 않다
//     (오차가 실제로 존재해야 한다 — 단순히 avg(pot)을 반올림해 보여주는 게 아니라는 직접 증거). ---
{
 let differing=0;
 for(const p of pool){
  const est=scoutPotential(p);
  const center=(est.lo+est.hi)/2;
  if(Math.abs(center-avg(p.pot))>0.5)differing++;
 }
 assert.ok(differing>pool.length*0.5,`대다수 선수는 추정 중심이 실제 pot 평균과 다르다(오차 존재): ${differing}/${pool.length}`);
}

// --- 5. 나이 상관관계: 어린 선수 집단의 관측 폭(hi-lo)이 나이 든 선수 집단보다 평균적으로 넓다
//     ("실전 표본이 적어 예측이 어렵다"는 설계 의도의 직접 검증). ---
{
 const withAge=pool.map(p=>({p,age:p.age,width:(()=>{const e=scoutPotential(p);return e.hi-e.lo;})()}));
 const young=withAge.filter(x=>x.age<=20), old=withAge.filter(x=>x.age>=25);
 assert.ok(young.length>5&&old.length>5,'양쪽 연령대 표본 확보');
 const avgWidth=xs=>xs.reduce((s,x)=>s+x.width,0)/xs.length;
 const wYoung=avgWidth(young), wOld=avgWidth(old);
 assert.ok(wYoung>wOld,`어린 선수 평균 관측 폭이 더 넓다: 20세 이하 ${wYoung.toFixed(1)} > 25세 이상 ${wOld.toFixed(1)}`);
}

// --- 6. "싼 유망주가 무조건 최선이 아니다": 즉시 전력(OVR)과 육성 상한(hi)의 순위가 항상 일치하지는
//     않는다 — 즉시 전력이 낮아도 hi가 높은(반대로 즉시 전력이 높아도 hi가 낮은) 선수가 실제로 존재한다.
{
 const sortedByOvr=[...pool].sort((a,b)=>ovr(b)-ovr(a));
 const sortedByCeiling=[...pool].sort((a,b)=>scoutPotential(b).hi-scoutPotential(a).hi);
 const topOvrIds=new Set(sortedByOvr.slice(0,10).map(p=>p.id));
 const topCeilIds=new Set(sortedByCeiling.slice(0,10).map(p=>p.id));
 const overlap=[...topOvrIds].filter(id=>topCeilIds.has(id)).length;
 assert.ok(overlap<10,'즉시 전력 상위 10명과 육성 상한 상위 10명이 완전히 일치하지는 않는다(서로 다른 정렬 기준)');
}

console.log('PASS prospect: determinism, range validity, devTier grounded, estimate differs from hidden truth, age→uncertainty correlation, ovr-vs-ceiling ranking differs');
