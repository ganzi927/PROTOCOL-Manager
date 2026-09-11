import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet} from '../lib/game.ts';
import {buildReplay,stateAt,posAt,agentsAt,MAP,WALK,pathBetween,distToCorridor,WALL_TOL,travelAudit,TRAVEL_K} from '../lib/simulation/replay.ts';
import {REGION_DIST} from '../lib/simulation/combat.ts';

const g=upgradeGame(newGame('nva',7));
const M={id:'r',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const runSet=s=>{g.seed=s;return simulateSet(g,M);};
const edgeSet=new Set(MAP.edges.flatMap(([a,b])=>[a+'|'+b,b+'|'+a]));

// --- 1. 결정성: 같은 SetResult → 같은 ReplayData / stateAt·posAt 순수 ---
{
 const set=runSet(88);
 assert.equal(JSON.stringify(buildReplay(set)),JSON.stringify(buildReplay(set)),'buildReplay 결정적');
 const rd=buildReplay(set);
 for(const t of [0,5,11.3,20,rd.duration/2,rd.duration]){
  assert.deepEqual(stateAt(rd,t),stateAt(rd,t),`stateAt 순수 (t=${t})`);
  for(const tr of rd.tracks)assert.deepEqual(posAt(tr,t),posAt(tr,t),'posAt 순수');
 }
}

// --- 2. 스포일러 방지 + 적용 시점 일치 ---
{
 for(const seed of [3,17,42,88,120,240]){
  const rd=buildReplay(runSet(seed));
  let prevA=0,prevB=0;
  for(let t=0;t<=rd.duration+1;t+=0.4){
   const s=stateAt(rd,t);
   assert.ok(s.score[0]>=prevA&&s.score[1]>=prevB,`점수 역행 없음 (seed ${seed}, t=${t.toFixed(1)})`);
   assert.ok(s.score[0]<=rd.finalScore[0]&&s.score[1]<=rd.finalScore[1],`재생 중 최종 점수 초과 노출 없음 (seed ${seed})`);
   for(const f of s.feed)assert.ok(f.t<=t+1e-9,`피드가 미래 사건 노출 안 함 (seed ${seed})`);
   prevA=s.score[0];prevB=s.score[1];
  }
  assert.deepEqual(stateAt(rd,rd.duration+10).score,rd.finalScore,`끝까지 재생하면 최종 점수 일치 (seed ${seed})`);
  for(const b of rd.beats){
   if(b.kind!=='kill'||!b.scoreDelta)continue;
   const before=stateAt(rd,b.t-0.01).score, after=stateAt(rd,b.t+0.01).score;
   assert.deepEqual([after[0]-before[0],after[1]-before[1]],b.scoreDelta,`킬 적용 시점 일치 (seed ${seed}, t=${b.t.toFixed(2)})`);
  }
 }
}

// --- 3. 이동이 보행 가능 영역(통로)을 벗어나지 않는다 (연속 보간 포함) ---
// 요구 변경(MINIMAP-02): 고정 노드 왕복이 아니라 임의 경로 → '노드 위' 검사 대신 '통로 허용치 이내' 검사.
// 교전·사망 클러스터(사건 노드 주변 ~2~3u)는 벽이 아니므로 제외.
{
 for(const seed of [0,3,17,42,88,120,200,240]){
  const rd=buildReplay(runSet(seed));
  for(const tr of rd.tracks){
   let prev=null, prevT=0;
   for(let t=0;t<=rd.duration;t+=0.25){
    const {pos,state}=posAt(tr,t);
    if(state!=='dead'&&state!=='fight'){
     assert.ok(distToCorridor(pos)<=WALL_TOL+1.2,
      `이동/대기 위치가 통로 위 (seed ${seed}, ${tr.side}${tr.slot} @${t.toFixed(1)}s d=${distToCorridor(pos).toFixed(1)})`);
     if(prev){
      const step=Math.hypot(pos[0]-prev[0],pos[1]-prev[1]);
      // 요구 변경(D018): TRAVEL_K로 미니맵 속도를 엔진 REGION_DIST에 맞추면서 스텝 크기가 커졌다.
      // 0.25s 재생 = 4.5 엔진초 × 최대 속도(≈2.76) ≈ 12.4u. 폭증/순간이동 감지 목적이므로 상한 16u.
      assert.ok(step<16,`한 스텝 이동이 폭증하지 않음 (seed ${seed}, ${tr.side}${tr.slot} @${t.toFixed(1)}s step=${step.toFixed(1)})`);
     }
    }
    prev=(state==='dead'||state==='fight')?null:pos; prevT=t;
   }
  }
 }
}

// --- 4. 사망 후 행동·조기 부활 없음 ---
{
 for(const seed of [42,88,120,200,240]){
  const rd=buildReplay(runSet(seed));
  for(const b of rd.beats){
   if(b.kind!=='kill'||!b.ref)continue;
   const revive=rd.beats.find(x=>x.kind==='revive'&&x.ref&&x.ref.side===b.ref.side&&x.ref.slot===b.ref.slot&&x.t>b.t);
   assert.ok(!revive||revive.t>b.t,`부활은 처치 이후 (seed ${seed})`);
   assert.ok(!revive||revive.engineClock>=b.engineClock,`부활 엔진시각 ≥ 처치 엔진시각 (seed ${seed})`);
   const tr=rd.tracks.find(t=>t.side===b.ref.side&&t.slot===b.ref.slot);
   const until=revive?revive.t:rd.duration;
   for(const k of tr.key){
    if(k.t>b.t+1e-6&&k.t<until-1e-6)
     assert.equal(k.state,'dead',`처치 후 부활 전 키프레임은 dead (seed ${seed}, ${b.ref.side}${b.ref.slot} @${k.t.toFixed(1)})`);
   }
   const mid=(b.t+until)/2;
   assert.equal(stateAt(rd,mid).dead[b.ref.side+' '+b.ref.slot],true,`처치~부활 구간엔 사망 표시 (seed ${seed})`);
  }
 }
}

// --- 5. 불참자가 사건 위치에 나타나지 않는다 ---
{
 for(const seed of [3,17,88,120,200,240]){
  const set=runSet(seed);
  const rd=buildReplay(set);
  for(const e of set.events){
   if(!e.combat)continue;
   const w=rd.windows.find(w=>w.seq===e.index); if(!w)continue;
   const evNode=eventNodeOf(e);
   const engage=rd.beats.find(b=>b.seq===e.index&&b.kind==='engage');
   // 접근 lead 구간은 다른 사건이 같은 노드에서 벌어질 수 있으므로, 실제 교전 시점~창 종료만 검사.
   const from=engage?engage.t-0.3:w.start;
   for(const nj of (e.combat.notJoined||[])){
    const tr=rd.tracks.find(t=>t.side===nj.ref.side&&t.slot===nj.ref.slot);
    for(let t=from;t<=w.end;t+=0.3){
     const {pos,state}=posAt(tr,t);
     if(state==='dead')continue;
     const d=Math.hypot(pos[0]-evNode[0],pos[1]-evNode[1]);
     assert.ok(d>4,`불참자가 사건 위치에 없음 (seed ${seed}, #${e.index}, ${nj.ref.side}${nj.ref.slot} d=${d.toFixed(1)} @t${t.toFixed(1)})`);
    }
   }
   const parts=new Set(e.combat.participants.map(p=>p.side+p.slot));
   for(const k of e.combat.kills)
    assert.ok(parts.has(k.killer.side+k.killer.slot)&&parts.has(k.victim.side+k.victim.slot),`처치 관련자는 참여자 (seed ${seed})`);
  }
 }
}
function eventNodeOf(e){
 if(e.combat.kind==='objective')return e.combat.objective.kind==='herald'?MAP.nodes.baron:MAP.nodes.dragon;
 if(e.combat.kind==='teamfight')return e.index===5?MAP.nodes.dragon:e.index===6?MAP.nodes.baron:MAP.nodes.mid;
 if(e.combat.kind==='siege'){
  const def=e.combat.side==='A'?'B':'A', L=e.combat.siege?.lane;
  if(L==null||L<0)return def==='A'?MAP.nodes.A_base:MAP.nodes.B_base;
  return (def==='A'?[MAP.nodes.A_top,MAP.nodes.mid,MAP.nodes.A_bot]:[MAP.nodes.B_top,MAP.nodes.mid,MAP.nodes.B_bot])[L];
 }
 // 갱킹: 라인 대치 지점(WALK 세분 노드) — 근사로 라인 중앙
 return e.combat.lane===0?MAP.nodes.top_mid:e.combat.lane===1?MAP.nodes.mid:MAP.nodes.bot_mid;
}

// --- 6. 고정 시드: 정글 합류/불참 beat, 처치 ref 유효 ---
{
 let sawJoin=false,sawNoCommit=false,sawKill=false;
 for(let seed=0;seed<120;seed++){
  const set=runSet(seed);
  const bot=set.events[2]?.combat; if(!bot||bot.kind==='objective')continue;
  const rd=buildReplay(set);
  const approach=rd.beats.find(b=>b.seq===2&&b.kind==='approach');
  const botKills=rd.beats.filter(b=>b.seq===2&&b.kind==='kill'&&b.ref);
  if(bot.committed){sawJoin=true; assert.ok(approach,`합류했으면 approach beat (seed ${seed})`);}
  else {sawNoCommit=true; assert.ok(!approach,`정글 불참이면 합류 beat 없음 (seed ${seed})`);}
  if(botKills.length){sawKill=true;
   const parts=new Set(bot.participants.map(p=>p.side+p.slot));
   for(const k of botKills)assert.ok(k.ref&&k.by&&parts.has(k.ref.side+k.ref.slot)&&parts.has(k.by.side+k.by.slot),`바텀 처치 ref 유효 (seed ${seed})`);
  }
 }
 assert.ok(sawJoin&&sawNoCommit,'정글 합류/불참 사례 모두 존재');
 assert.ok(sawKill,'바텀 처치 사례 존재');
}

// --- 7. 지도 경로 그래프 정합 ---
{
 const p=pathBetween('A_jg_b','B_bot');
 assert.ok(p[0]==='A_jg_b'&&p[p.length-1]==='B_bot','경로 시작/끝');
 for(let i=1;i<p.length;i++)assert.ok(edgeSet.has(p[i-1]+'|'+p[i]),`경로 각 구간이 통로 (${p[i-1]}→${p[i]})`);
 assert.deepEqual(pathBetween('mid','mid'),['mid']);
 // WALK 그래프: 모든 노드가 연결(고립 없음), 통로 선분 위 좌표
 for(const [n,pos] of Object.entries(WALK.nodes)){
  assert.ok(WALK.adj[n]&&WALK.adj[n].length>0,`WALK 노드 ${n} 연결됨`);
  assert.ok(distToCorridor(pos)<1e-6,`WALK 노드 ${n}는 통로 위`);
 }
}

// --- 8. 단위 5: 공성 사건 — 미니맵·중계·구조물 상태 일치 ---
{
 let sawSiegeBeat=false, sawNexus=false, sawHeld=false;
 for(let seed=0;seed<60;seed++){
  const set=runSet(seed);
  const rd=buildReplay(set);
  let prev=null;
  for(const bt of rd.beats){
   if(!bt.struct)continue;
   if(prev){
    for(const S of ['A','B']) for(let L=0;L<3;L++)
     assert.ok(bt.struct[S][L]>=prev[S][L],`구조물 진행도 단조 (seed ${seed}, ${S}${L})`);
    assert.ok(bt.struct.baseA<=prev.baseA&&bt.struct.baseB<=prev.baseB,`넥서스포탑은 줄기만 (seed ${seed})`);
    assert.ok(bt.struct.nexusA>=prev.nexusA&&bt.struct.nexusB>=prev.nexusB,`넥서스 파괴는 유지 (seed ${seed})`);
   }
   prev=bt.struct;
  }
  for(const e of set.events){
   const cb=e.combat; if(cb?.kind!=='siege')continue;
   const sg=cb.siege;
   const b=rd.beats.find(x=>x.seq===e.index&&(x.kind==='siege'||x.kind==='nexus'));
   assert.ok(b,`공성 사건엔 공성 beat (seed ${seed}, #${e.index})`);
   if(sg.structuresDown>0){ sawSiegeBeat=true;
    assert.ok(/철거|파괴/.test(b.text),`철거가 있으면 파괴 문구 (seed ${seed})`);
    if(sg.nexus){sawNexus=true;assert.equal(b.kind,'nexus');}
   }else{ sawHeld=true;
    assert.ok(!/억제기 파괴|넥서스 파괴|포탑 \d 철거/.test(b.text),`철거 없으면 파괴라고 안 함 (seed ${seed}, "${b.text}")`);
   }
  }
  const endStruct=stateAt(rd,rd.duration+5).struct;
  if(set.endReason==='NEXUS') assert.ok(endStruct.nexusA||endStruct.nexusB,`NEXUS 종료면 재생 끝에 넥서스 파괴 (seed ${seed})`);
 }
 assert.ok(sawSiegeBeat&&sawNexus&&sawHeld,'공성 철거·넥서스·무산 사례 모두 존재');
}

// --- 9. MINIMAP-02: 지속형 — 정지 없음 · 경계 넘어 경로 연속 · 라인 독립 활동 ---
{
 for(const seed of [0,3,17,42,88,120,200,240]){
  const rd=buildReplay(runSet(seed));
  // (a) 어떤 선수도 경기 내내 길게 정지하지 않는다. 사망 구간을 빼고 이동 프레임이 충분하다.
  for(const tr of rd.tracks){
   let moved=0,live=0,prev=null,frozenRun=0,maxFrozen=0;
   for(let t=0;t<=rd.duration;t+=0.4){
    const {pos,state}=posAt(tr,t);
    if(state==='dead'){prev=pos;frozenRun=0;continue;}
    live++;
    if(prev){ const d=Math.hypot(pos[0]-prev[0],pos[1]-prev[1]);
     if(d>0.05){moved++;frozenRun=0;} else {frozenRun++;maxFrozen=Math.max(maxFrozen,frozenRun);} }
    prev=pos;
   }
   assert.ok(moved/live>0.35,`${tr.side}${tr.slot} 경기 내내 활동 (seed ${seed}, moved ${(moved/live*100|0)}%)`);
   // 후반 미드/바론 대치에서 연속 한타 사이 대기는 실제 경기에도 있다. 그래도 12초 이상 완전 정지는 없어야.
   assert.ok(maxFrozen*0.4<12,`${tr.side}${tr.slot} 12초 이상 정지 없음 (seed ${seed}, ${(maxFrozen*0.4).toFixed(1)}s)`);
  }
  // (b) 같은 선수의 경로가 사건 경계를 넘어 연속: 연속 키프레임을 잇는 직선이 통로 위(벽 침범 없음).
  //     거리는 제한하지 않는다(한 통로 구간이 길 수 있음). 순간이동은 그 직선이 통로를 벗어나는 것으로 잡힌다.
  for(const tr of rd.tracks){
   for(let i=1;i<tr.key.length;i++){
    const a=tr.key[i-1],b=tr.key[i];
    if(a.state==='dead'||b.state==='dead')continue;
    if(a.state==='fight'||b.state==='fight')continue;
    for(let r=0;r<=1.0001;r+=0.1){
     const p=[a.pos[0]+(b.pos[0]-a.pos[0])*r, a.pos[1]+(b.pos[1]-a.pos[1])*r];
     assert.ok(distToCorridor(p)<=WALL_TOL+1.4,
      `연속 키프레임 사이가 통로 위(순간이동/벽 침범 없음) (seed ${seed}, ${tr.side}${tr.slot} #${i} r=${r.toFixed(1)} d=${distToCorridor(p).toFixed(1)})`);
    }
   }
  }
  // (c) 바텀 갱킹(#2) 구간 동안 탑·미드 라이너는 자기 라인에서 계속 활동한다.
  const set=runSet(seed);
  const e2=set.events[2];
  if(e2?.combat&&e2.combat.kind!=='objective'){
   const w=rd.windows.find(x=>x.seq===2);
   const parts=new Set(e2.combat.participants.map(p=>p.side+p.slot));
   for(const [side,slot] of [['A',0],['B',0],['A',2],['B',2]]){
    if(parts.has(side+slot))continue;                    // 갱킹 참가자면 제외
    const tr=rd.tracks.find(t=>t.side===side&&t.slot===slot);
    let mv=0,n=0,prev=null;
    for(let t=w.start;t<=w.end;t+=0.3){const {pos,state}=posAt(tr,t);n++;
     if(prev&&Math.hypot(pos[0]-prev[0],pos[1]-prev[1])>0.05)mv++;prev=pos;}
    assert.ok(mv>0,`갱킹 구간에도 ${side}${slot} 라이너 활동 (seed ${seed})`);
   }
  }
  // (d) 진단(diag)은 유한하고, 대부분 소폭 지연.
  assert.ok(rd.diag.length<160,`진단 건수 유한 (seed ${seed}, ${rd.diag.length})`);
 }
 // (e) 위치 난수 분리 + 결정성: 같은 set 두 번 → 동일 tracks. narration 밀도와 무관.
 const set=runSet(55);
 assert.equal(JSON.stringify(buildReplay(set).tracks),JSON.stringify(buildReplay(set).tracks),'tracks 결정적');
 // agentsAt: 전 선수 위치·행동·남은 경로
 const rd=buildReplay(set);
 const A=agentsAt(rd,rd.duration*0.4);
 assert.equal(A.length,10);
 for(const a of A)assert.ok(Array.isArray(a.path)&&a.path.length>=1&&typeof a.act==='string','agentsAt 필드');
}

// --- 10. 엔진 REGION_DIST ↔ 미니맵 WALK 이동 시간 대조 (모순을 순간이동/과속으로 숨기지 않는다) ---
{
 // (a) 대표 지역쌍: 미니맵 이동 시간이 엔진 표와 같은 크기대(위상 차이로 정확히는 아님).
 //     허용치: 대부분 0.5~2.0배 안. 통로 우회로 큰 쌍(top↔river)은 명시적으로 예외 기록.
 const aud=travelAudit();
 assert.ok(aud.length>0&&TRAVEL_K>1,'travelAudit 제공, 보정 계수 존재');
 let within=0, exceptions=[];
 for(const r of aud){
  assert.ok(r.engine>0&&r.walk>0,`${r.pair} 두 모델 모두 양수`);
  if(r.ratio>=0.5&&r.ratio<=2.05) within++;
  else exceptions.push(`${r.pair}(비율 ${r.ratio})`);
 }
 assert.ok(within/aud.length>=0.8,`지역쌍 이동 시간 80%+ 정렬 (정렬 ${within}/${aud.length}, 예외 ${exceptions.join(', ')})`);
 // (b) 큰 차이는 순서 보존: 엔진이 8s+ 더 먼 쌍은 미니맵에서도 더 멀다(±10 slack, river 우회쌍 제외).
 //     두 모델은 위상이 달라(하드 오써링된 표 vs 기하 그래프) 근소한 쌍의 순서까지는 맞추지 않는다.
 const norm=aud.filter(r=>!/top->river|river->top/.test(r.pair));
 for(let i=0;i<norm.length;i++)for(let j=0;j<norm.length;j++){
  if(norm[j].engine-norm[i].engine>=8)
   assert.ok(norm[i].walk<=norm[j].walk+10,`큰 차이 순서 보존 (${norm[i].pair} ${norm[i].walk}s vs ${norm[j].pair} ${norm[j].walk}s)`);
 }
 // (c) 사건 시각에 '논리 도착 vs 화면 이동 중' 모순을 숨기지 않는다:
 //     - showDelay(엔진 REGION_DIST 기준)로 화면 사건을 늦춰 참가자가 실제로 걸어서 합류하게 한다.
 //     - 그래도 남는 '합류 이동'은 전부 diag에 거리·지연과 함께 기록된다(순간이동·과속 금지).
 //     - 참가자는 창 종료까지 fight에 도달하거나 / 사망이거나 / diag에 합류 이동으로 명시된다.
 for(const seed of [0,17,42,88,120,240,404,555]){
  const set=runSet(seed); const rd=buildReplay(set);
  assert.ok(rd.travel&&rd.travel.k===TRAVEL_K,'rd.travel 요약 존재');
  assert.ok(rd.diag[0]&&rd.diag[0].startsWith('이동 대조'),'diag 첫 줄 = 이동 대조 요약');
  // 원거리 합류는 '전부 로그된다'가 핵심(숨기지 않는다). 건수는 유한.
  assert.ok(rd.travel.farJoins<=45,`원거리 합류가 폭주하지 않음 (seed ${seed}, ${rd.travel.farJoins})`);
  const loggedFar=rd.diag.filter(d=>d.includes('원거리 합류 이동')).length;
  assert.equal(loggedFar,rd.travel.farJoins,`원거리 합류는 전부 diag에 기록 (seed ${seed})`);
  for(const e of set.events){
   const cb=e.combat; if(!cb)continue;
   const w=rd.windows.find(x=>x.seq===e.index); if(!w)continue;
   const nj=new Set((cb.notJoined||[]).map(n=>n.ref.side+n.ref.slot));
   for(const p of cb.participants){
    if(nj.has(p.side+p.slot))continue;
    const tr=rd.tracks.find(t=>t.side===p.side&&t.slot===p.slot);
    // 창 종료 시점: fight 도달했거나(정상), 죽었거나, diag에 이 사건 합류 이동 기록이 있어야 한다.
    const atEnd=posAt(tr,w.end-0.05);
    const reachedFight=tr.key.some(k=>k.state==='fight'&&k.t>=w.start-0.01&&k.t<=w.end+0.2);
    const logged=rd.diag.some(d=>d.startsWith(`#${e.index}:`)&&d.includes(`${p.side}${p.slot}`));
    assert.ok(reachedFight||atEnd.state==='dead'||logged,
     `#${e.index} ${p.side}${p.slot}: 도착하거나(fight) 사망이거나 diag에 합류 이동 기록 (seed ${seed})`);
   }
  }
 }
}

// --- 11. MINIMAP 2단계 1번: 남은 '합류 이동' 원인 분류 + 도착↔참여 고정 사례 7종 ---
// 정상 장거리 이동을 없애려고 과속·순간이동·이벤트 위치 변경을 하지 않는다(사용자 지시) — 여기선 관찰·분류만.
{
 // (a) 원인 분류가 전부 태그된다: 이전사건충돌/이동시간부족/지연전환/장거리 중 하나.
 const CAUSES=['이전사건충돌','이동시간부족','지연전환','장거리'];
 for(const seed of [0,17,42,88,120]){
  const rd=buildReplay(runSet(seed));
  for(const d of rd.diag){
   const m=d.match(/\[(.+?)\]$/); if(!m || !d.includes('합류 이동'))continue;
   assert.ok(CAUSES.includes(m[1]),`합류 이동 원인 태그가 알려진 4종 중 하나 (seed ${seed}): ${d}`);
  }
  assert.ok(rd.travel.causes && Object.keys(rd.travel.causes).length>0 || rd.travel.lateJoins===0,
   'travel.causes가 lateJoins와 함께 채워짐');
 }

 // (b) 고정 사례 7종 — 넓은 시드 범위에서 최소 1건씩 발견 + 각 사례의 불변식 확인.
 const found={onTime:null,midJoin:null,postFight:null,reviveMiss:null,replan:null,chained:null,independent:null};
 for(let seed=0;seed<150 && Object.values(found).some(v=>!v);seed++){
  const set=runSet(seed); const rd=buildReplay(set);

  for(const e of set.events){
   const cb=e.combat; if(!cb)continue;
   const w=rd.windows.find(x=>x.seq===e.index); if(!w)continue;
   const nj=new Set((cb.notJoined||[]).map(n=>n.ref.side+n.ref.slot));

   // 1. 제시간 도착: 사건 시각에 이미 fight 상태.
   if(!found.onTime) for(const p of cb.participants){ if(nj.has(p.side+p.slot))continue;
    const tr=rd.tracks.find(t=>t.side===p.side&&t.slot===p.slot);
    if(posAt(tr,w.start+0.15).state==='fight'){ found.onTime={seed,idx:e.index,who:p}; break; } }

   // 2. 교전 중 도착: diag에 '합류 이동'(원거리 아님) 기록 + 결국 fight 도달 + 그 사이 처치의 어시스트 미표시(2단계 4번).
   if(!found.midJoin) for(const p of cb.participants){ if(nj.has(p.side+p.slot))continue;
    const tag=`#${e.index}: ${p.side}${p.slot} `;
    if(!rd.diag.some(d=>d.startsWith(tag)&&d.includes('합류 이동')&&!d.includes('원거리')))continue;
    const tr=rd.tracks.find(t=>t.side===p.side&&t.slot===p.slot);
    const fightKf=tr.key.find(k=>k.state==='fight'&&k.t>=w.start-0.01&&k.t<=w.end+0.2);
    if(!fightKf)continue;
    // 이 참가자의 fight 진입 이전에 찍힌 이 사건의 처치 beat엔 이 참가자가 어시스트로 없어야 한다.
    const early=rd.beats.filter(b=>b.kind==='kill'&&b.seq===e.index&&b.t<fightKf.t-1e-6);
    const leaked=early.some(b=>(b.assists||[]).some(a=>a.side===p.side&&a.slot===p.slot));
    if(!leaked) found.midJoin={seed,idx:e.index,who:p};
   }

   // 3. 종료 후 도착: diag에 '원거리 합류 이동' + 창 종료까지 fight 상태 도달 못 함(사망도 아님) — 끝내 못 낀 것.
   if(!found.postFight) for(const p of cb.participants){ if(nj.has(p.side+p.slot))continue;
    const tag=`#${e.index}: ${p.side}${p.slot} `;
    if(!rd.diag.some(d=>d.startsWith(tag)&&d.includes('원거리 합류 이동')))continue;
    const tr=rd.tracks.find(t=>t.side===p.side&&t.slot===p.slot);
    const reachedFight=tr.key.some(k=>k.state==='fight'&&k.t>=w.start-0.01&&k.t<=w.end+0.2);
    const atEnd=posAt(tr,w.end-0.05);
    if(!reachedFight && atEnd.state!=='dead') found.postFight={seed,idx:e.index,who:p};
   }
  }

  // 4. 부활 후 이동하느라 불참: 엔진은 참가자로 셌지만 미니맵상 사망(부활 대기) 진단.
  if(!found.reviveMiss){ const d=rd.diag.find(d=>d.includes('엔진 참가자이나 미니맵 사망')); if(d)found.reviveMiss={seed,line:d}; }

  // 5. 이동 중 집결 지시 변경: 같은 트랙에서 '#N 집결'로 이동하다 새 목적지로 재계획되어도 위치가 연속(점프 없음).
  if(!found.replan) for(const tr of rd.tracks){
   for(let i=1;i<tr.key.length;i++){
    const a=tr.key[i-1],b=tr.key[i];
    if(a.reason && b.reason && /집결|접근|준비/.test(a.reason) && a.reason!==b.reason && b.state==='move'){
     const dgap=Math.hypot(a.pos[0]-b.pos[0],a.pos[1]-b.pos[1]), dt=(b.t-a.t)*rd.scale;
     if(dgap<=2.8*dt+3){ found.replan={seed,at:b.t}; break; }
    }
   }
   if(found.replan)break;
  }

  // 6. 연속 교전에서 이전 위치 유지: '#N 재합류'(nextOwnEvent) reason이 실제로 등장.
  if(!found.chained){ const tr=rd.tracks.find(t=>t.key.some(k=>k.reason&&k.reason.includes('재합류')));
   if(tr)found.chained={seed}; }

  // 7. 교전 미참여 다른 라인의 지속 행동: 참가자 5인 미만인 사건 동안, 비참가자 트랙이 그 창 동안 2개 이상의 키프레임(정지 아님)을 갖는다.
  if(!found.independent) for(const e of set.events){
   const cb=e.combat; if(!cb || cb.participants.length>=8)continue;
   const w=rd.windows.find(x=>x.seq===e.index); if(!w)continue;
   const inEvent=new Set(cb.participants.map(p=>p.side+p.slot));
   for(const tr of rd.tracks){ if(inEvent.has(tr.side+tr.slot))continue;
    const activity=tr.key.filter(k=>k.t>=w.start&&k.t<=w.end);
    if(activity.length>=2){ found.independent={seed,idx:e.index}; break; } }
   if(found.independent)break;
  }
 }
 for(const [k,v] of Object.entries(found)) assert.ok(v,`고정 사례 발견: ${k} (150시드 내에서 못 찾음)`);
 console.log(`  · 11: 고정 사례 7종 대표 — ${Object.entries(found).map(([k,v])=>`${k}=seed${v.seed}${v.idx!==undefined?'#'+v.idx:''}`).join(' ')}`);
}

console.log('PASS replay: determinism, no-spoiler & timing sync, corridor-constrained motion, no post-death/early-revive, absent players, fixed-seed cases, map graph, unit-5 siege, MINIMAP-02 persistent agents, REGION_DIST travel-time cross-check, arrival↔join fixed scenarios (D021)');
