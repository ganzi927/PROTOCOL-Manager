// F18 Phase A: 선수 성향(temperament) — 4개 연속 축, id 기반 순수 함수, 저장하지 않는다.
import assert from 'node:assert/strict';
import {temperamentOf,labelOf,shortLabelOf,TEMPERAMENT_BALANCED_BAND,TEMPERAMENT_LABEL} from '../lib/players/temperament.ts';

const AXES=['engage','resource','info','call'];

// --- 1. 안정성: 같은 id → 항상 같은 값(구세이브를 불러올 때마다 다시 추첨되지 않음의 근거) ---
{
 for(const id of ['p1-1','faker-id','emergency-nva-TOP','']){
  assert.deepEqual(temperamentOf(id),temperamentOf(id),`같은 id 반복 호출 동일 (${id||'(빈 문자열)'})`);
 }
}

// --- 2. 포지션(role) 입력 자체가 없다 — 함수 시그니처가 id 하나만 받는다(강제 고정 불가능을 구조로 보장) ---
{
 assert.equal(temperamentOf.length,1,'temperamentOf는 정확히 1개 인자(id)만 받는다 — role을 강제할 방법이 없다');
}

// --- 3. 범위·타입: 모든 축이 -1~+1 사이 유한수 ---
{
 for(let i=0;i<500;i++){
  const t=temperamentOf('id-'+i);
  for(const ax of AXES){
   assert.ok(Number.isFinite(t[ax]),`${ax} 유한수`);
   assert.ok(t[ax]>=-1&&t[ax]<=1,`${ax} 범위 [-1,1] 내 (${t[ax]})`);
  }
 }
}

// --- 4. 분포: 평균은 0 근처(중앙=균형형), 극단(>0.34)이 존재하되 다수는 아니다 ---
{
 const N=2000;
 const vals={engage:[],resource:[],info:[],call:[]};
 for(let i=0;i<N;i++){const t=temperamentOf('dist-probe-'+i);for(const ax of AXES)vals[ax].push(t[ax]);}
 for(const ax of AXES){
  const mean=vals[ax].reduce((a,b)=>a+b,0)/N;
  assert.ok(Math.abs(mean)<0.05,`${ax} 평균이 0에 가깝다(중앙=균형형): ${mean.toFixed(3)}`);
  const balanced=vals[ax].filter(v=>Math.abs(v)<TEMPERAMENT_BALANCED_BAND).length;
  assert.ok(balanced>N*0.4,`${ax} 균형형 비율이 상당하다(전부 극단이지 않음): ${balanced}/${N}`);
  const extreme=vals[ax].filter(v=>Math.abs(v)>TEMPERAMENT_BALANCED_BAND).length;
  assert.ok(extreme>N*0.15,`${ax} 극단형도 실제로 존재한다(전부 균형형은 아님): ${extreme}/${N}`);
 }
}

// --- 5. 축 간 독립성(느슨한 상관 확인 — 완전 독립 요구 X, 강한 상관만 배제) ---
{
 const N=2000;
 const vals={engage:[],resource:[],info:[],call:[]};
 for(let i=0;i<N;i++){const t=temperamentOf('corr-probe-'+i);for(const ax of AXES)vals[ax].push(t[ax]);}
 const corr=(xs,ys)=>{const n=xs.length,mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let num=0,dx=0,dy=0;for(let i=0;i<n;i++){num+=(xs[i]-mx)*(ys[i]-my);dx+=(xs[i]-mx)**2;dy+=(ys[i]-my)**2;}return num/Math.sqrt(dx*dy);};
 for(let i=0;i<AXES.length;i++)for(let j=i+1;j<AXES.length;j++){
  const c=corr(vals[AXES[i]],vals[AXES[j]]);
  assert.ok(Math.abs(c)<0.15,`${AXES[i]}/${AXES[j]} 상관 약함(독립적): ${c.toFixed(3)}`);
 }
}

// --- 6. 라벨: 문턱값 경계와 일치, 각 축의 3단계(lo/mid/hi) 모두 실제로 나타난다 ---
{
 for(const ax of AXES){
  assert.equal(labelOf(ax,-1),TEMPERAMENT_LABEL[ax].lo);
  assert.equal(labelOf(ax,1),TEMPERAMENT_LABEL[ax].hi);
  assert.equal(labelOf(ax,0),TEMPERAMENT_LABEL[ax].mid);
  assert.equal(labelOf(ax,-TEMPERAMENT_BALANCED_BAND),TEMPERAMENT_LABEL[ax].lo,'문턱값 경계는 lo쪽 포함');
  assert.equal(labelOf(ax,TEMPERAMENT_BALANCED_BAND),TEMPERAMENT_LABEL[ax].hi,'문턱값 경계는 hi쪽 포함');
  assert.ok(shortLabelOf(ax,1).endsWith('형'));
 }
 // 실제 표본에서 세 라벨이 전부 나타나는지
 for(const ax of AXES){
  const labels=new Set();
  for(let i=0;i<300;i++)labels.add(labelOf(ax,temperamentOf('label-probe-'+i)[ax]));
  assert.equal(labels.size,3,`${ax} lo/mid/hi 세 라벨이 300표본 안에서 전부 등장`);
 }
}

console.log('PASS temperament: stability, no role parameter, range, centered distribution with real extremes, axis independence, label boundaries');
