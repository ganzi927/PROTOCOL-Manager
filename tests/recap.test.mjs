// F14: 리캡을 "경기 전 계획 → 분기점(최대 3) → 핵심 기여 → 잃은 자원 → 다음 세트 제안"으로 재구성.
// 검증 원칙(사용자 지시): 리캡 수치는 원본 사건을 독립 재집계해 일치시킨다. 지어낸 수치를 쓰지 않는다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet,TEAM_META} from '../lib/game.ts';

const g=upgradeGame(newGame('nva',7));
const mUser={id:'m-user',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const other=TEAM_META.map(t=>t.id).filter(id=>id!=='nva').slice(0,2);
const mAway={id:'m-away',a:other[0],b:other[1],bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};

// --- 1. 결정성 ---
{
 g.seed=44;
 assert.deepEqual(simulateSet(g,mUser).recap,simulateSet(g,mUser).recap);
}

// --- 2. 구조: 계획 → 분기점(1~3) → 핵심 기여(POG) → 잃은 자원 → 다음 세트 제안, 매 세트 동일 개수(7) ---
{
 for(let seed=0;seed<150;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  assert.equal(r.recap.length,7,`계획 1 + 분기점 3 + POG 1 + 잃은 자원 1 + 다음 세트 1 = 7 (seed ${seed})`);
  assert.ok(r.recap[0].includes('조합은'),'첫 줄은 계획/조합');
  const tp=r.recap.slice(1,4);
  assert.ok(tp.every(l=>l.startsWith('분기점(')),'2~4번째 줄은 분기점');
  assert.ok(new Set(tp.map(l=>l.match(/사건 #(\d+)/)[1])).size===tp.length,'분기점은 서로 다른 사건을 가리킨다(중복 없음)');
  assert.ok(tp.some(l=>l.includes('세트 종료')),'분기점 중 하나는 반드시 세트 종료 사건');
  assert.ok(r.recap[4].startsWith('핵심 기여'),'5번째 줄은 핵심 기여(POG)');
  assert.ok(r.recap[5].startsWith('잃은 자원'),'6번째 줄은 잃은 자원');
  assert.ok(r.recap[6].startsWith('다음 세트 제안'),'7번째 줄은 다음 세트 제안');
 }
}

// --- 3. 분기점이 가리키는 사건 번호가 실제 events 배열에 존재하고, 인용한 detail이 그 사건의 실제 detail과 일치 ---
{
 for(let seed=0;seed<80;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  for(const line of r.recap.slice(1,4)){
   const m=line.match(/사건 #(\d+)\(([^)]+)\) — (.+)$/);
   assert.ok(m,`분기점 형식 파싱 가능 (seed ${seed}): ${line}`);
   const idx=+m[1]-1, phase=m[2], detail=m[3];
   const ev=r.events[idx];
   assert.ok(ev,`분기점이 가리키는 사건 #${idx+1}이 실제로 존재 (seed ${seed})`);
   assert.equal(ev.phase,phase,`분기점 phase가 실제 사건과 일치 (seed ${seed})`);
   assert.equal(ev.detail,detail,`분기점 detail이 실제 사건 detail과 정확히 일치(지어낸 문구 없음, seed ${seed})`);
  }
 }
}

// --- 4. '세트 종료' 분기점은 항상 마지막 사건(events.at(-1))을 가리킨다 ---
{
 for(let seed=0;seed<80;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  const endTp=r.recap.slice(1,4).find(l=>l.includes('세트 종료'));
  const idx=+endTp.match(/사건 #(\d+)/)[1]-1;
  assert.equal(idx,r.events.length-1,`세트 종료 분기점은 마지막 사건을 가리킨다 (seed ${seed})`);
 }
}

// --- 5. '잃은 자원' 수치를 원본 events에서 독립 재집계해 일치시킨다 ---
{
 for(let seed=0;seed<150;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  const loserSide=r.winner===mUser.a?'B':'A';
  const structLost=r.events.filter(e=>e.combat?.kind==='siege'&&e.combat.siege.side===(r.winner===mUser.a?'A':'B'))
   .reduce((n,e)=>n+(e.combat.siege.structuresDown??0),0);
  const objSecuredByLoser=r.events.filter(e=>e.combat?.kind==='objective'&&e.combat.objective.secured===loserSide).length;
  const objSecuredByWinner=r.events.filter(e=>e.combat?.kind==='objective'&&e.combat.objective.secured===(r.winner===mUser.a?'A':'B')).length;
  const objTotal=r.events.filter(e=>e.combat?.kind==='objective').length;
  const line=r.recap[5];
  const mm=line.match(/구조물 (\d+)개/);
  assert.equal(+mm[1],structLost,`잃은 구조물 수 독립 재집계 일치 (seed ${seed})`);
  const om=line.match(/오브젝트 (\d+)\/(\d+)회 확보\(상대 (\d+)회\)/);
  assert.deepEqual([+om[1],+om[2],+om[3]],[objSecuredByLoser,objTotal,objSecuredByWinner],`오브젝트 확보 수 독립 재집계 일치 (seed ${seed})`);
 }
}

// --- 6. 사용자 불참 경기: 계획 줄에 전술 언급 없음(그 팀의 전술이 사용자 것이 아니므로 과장하지 않는다) ---
{
 for(let seed=0;seed<40;seed++){
  g.seed=seed;const r=simulateSet(g,mAway);
  assert.ok(!r.recap[0].includes('출전 전 계획'),`사용자 불참 경기엔 전술 계획 문구 없음 (seed ${seed})`);
  assert.ok(r.recap[0].startsWith('조합은'),`사용자 불참 경기도 조합 언급은 유지 (seed ${seed})`);
 }
}

// --- 7. firstStructTeam은 실제 맨 처음 구조물을 철거한 팀과 일치(있을 때만), 없으면 undefined ---
{
 for(let seed=0;seed<150;seed++){
  g.seed=seed;const r=simulateSet(g,mUser);
  const firstSiege=r.events.find(e=>e.combat?.kind==='siege'&&(e.combat.siege.structuresDown??0)>0);
  if(firstSiege){
   assert.ok(r.firstStructTeam,`구조물 철거가 있었으면 firstStructTeam 존재 (seed ${seed})`);
   const expectedTeam=firstSiege.combat.siege.side==='A'?mUser.a:mUser.b;
   assert.equal(r.firstStructTeam,expectedTeam,`firstStructTeam이 실제 첫 철거 팀과 일치 (seed ${seed})`);
  } else assert.equal(r.firstStructTeam,undefined,`구조물 철거가 없으면 firstStructTeam undefined (seed ${seed})`);
 }
}

console.log('PASS recap: determinism, 7-card structure, turning points reference real events, resource-loss independently re-aggregated, no unearned tactic claims, firstStructTeam accuracy');
