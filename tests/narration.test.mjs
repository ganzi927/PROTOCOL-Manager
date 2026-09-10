import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet,TEAM_META} from '../lib/game.ts';

const g=upgradeGame(newGame('nva',7));                 // 사용자 팀 = nva
const mUser={id:'m-user',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const other=TEAM_META.map(t=>t.id).filter(id=>id!=='nva').slice(0,2);
const mAway={id:'m-away',a:other[0],b:other[1],bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const toSec=t=>{const[m,s]=t.split(':').map(Number);return m*60+s;};

// --- 1. 결정성: 전체 SetResult가 반복 호출에 동일(beats 포함) ---
{
 g.seed=44;
 assert.equal(JSON.stringify(simulateSet(g,mUser)),JSON.stringify(simulateSet(g,mUser)));
}

// --- 2. 사건마다 detail·beats·tier·kills가 유효 ---
{
 g.seed=88;const r=simulateSet(g,mUser);
 for(const e of r.events){
  assert.ok(typeof e.detail==='string'&&e.detail.length>0,'detail 비어있지 않음');
  assert.ok(Array.isArray(e.beats)&&e.beats.length>=1,'beats 존재');
  assert.ok(e.beats.every(b=>b.t&&b.label&&b.text),'beat 필드 완전');
  assert.ok(['quiet','build','clash','decisive','close'].includes(e.tier),'tier 유효');
  assert.ok(e.kills&&Number.isFinite(e.kills.a)&&Number.isFinite(e.kills.b),'kills 객체');
 }
 assert.equal(r.events.at(-1).tier,'close','마지막 사건은 close');
}

// --- 3. 타임스탬프 단조 증가(사건 사이·사건 내부) ---
{
 for(const seed of [1,2,3,10,50,120]){
  g.seed=seed;const r=simulateSet(g,mUser);
  let prev=-1;
  for(const e of r.events)for(const b of e.beats){
   const s=toSec(b.t);
   assert.ok(s>=prev-1,`시간 역행 없음 (seed ${seed}, ${b.t} < ${prev}s)`);
   prev=Math.max(prev,s);
  }
 }
}

// --- 4. 중계가 앞 사건을 기억: 첫 킬 시각이 마무리 '돌아보기'와 일치 ---
{
 let sawCallback=false, sawReGank=false;
 for(let seed=0;seed<200;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  const fbBeat=r.events.flatMap(e=>e.beats).find(b=>b.label==='FIRST BLOOD');
  const back=r.events.at(-1).beats.find(b=>b.label==='돌아보기');
  if(fbBeat&&back&&back.text.includes('첫 킬이 흐름을 갈랐습니다')){
   const stamp=back.text.slice(0,5);
   assert.equal(stamp,fbBeat.t,`돌아보기가 실제 첫 킬 시각(${fbBeat.t})을 인용 (seed ${seed})`);
   sawCallback=true;
  }
  if(r.events.flatMap(e=>e.beats).some(b=>b.text.includes('앞선 합류에 이어')))sawReGank=true;
 }
 assert.ok(sawCallback,'첫 킬 → 마무리 콜백이 실제로 등장');
 assert.ok(sawReGank,'재갱킹 콜백이 실제로 등장');
}

// --- 5. 킬 수를 지어내지 않음: 결과 문구의 '누적 X : Y'가 e.kills 누적과 일치 ---
{
 for(let seed=0;seed<120;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  let a=0,b=0;
  for(const e of r.events){
   a+=e.kills.a;b+=e.kills.b;
   const m=(e.beats.find(x=>x.label==='결과')?.text||'').match(/누적 (\d+) : (\d+)/)
        ||(e.beats.find(x=>x.label==='돌아보기')?.text||'').match(/스코어 (\d+) : (\d+)/);
   if(m)assert.deepEqual([+m[1],+m[2]],[a,b],`킬 누적 일치 (seed ${seed}, idx ${e.index})`);
  }
 }
}

// --- 6. 강도 변화: 한 세트에 서로 다른 tier가 최소 2종, 매번 decisive는 아님 ---
{
 let allSameCount=0;
 for(let seed=0;seed<120;seed++){
  g.seed=seed;const tiers=simulateSet(g,mUser).events.map(e=>e.tier);
  if(new Set(tiers).size<2)allSameCount++;
  assert.ok(tiers.filter(t=>t==='decisive').length<tiers.length,'전부 decisive는 아님');
 }
 assert.equal(allSameCount,0,'모든 세트에서 tier가 2종 이상');
}

// --- 7. 감독 레버는 실제 상태에서만: 사용자 불참 경기엔 '벤치' 문구 없음 ---
{
 const LEVERS=['이번 주 준비한 보호형','초반 압박을 준비했지만','후반을 보고 준비한 팀'];
 for(let seed=0;seed<80;seed++){
  g.seed=seed;
  const away=simulateSet(g,mAway).events.flatMap(e=>e.beats);
  assert.ok(!away.some(b=>b.label==='벤치'),`사용자 불참 경기엔 감독 레버 없음 (seed ${seed})`);
  const user=simulateSet(g,mUser).events.flatMap(e=>e.beats).filter(b=>b.label==='벤치');
  for(const b of user)assert.ok(LEVERS.some(l=>b.text.startsWith(l)),`레버 문구는 정해진 것만 (seed ${seed}): ${b.text}`);
 }
}

console.log('PASS narration: determinism, event fields, monotonic clock, memory callbacks, kill-count integrity, intensity variety, grounded manager levers');
