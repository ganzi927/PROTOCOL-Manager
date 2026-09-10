import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet} from '../lib/game.ts';
import {buildReplay,stateAt,posAt,agentsAt,MAP,WALK,pathBetween,distToCorridor,WALL_TOL} from '../lib/simulation/replay.ts';

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
      assert.ok(step<8,`한 스텝 이동이 폭증하지 않음 (seed ${seed}, ${tr.side}${tr.slot} @${t.toFixed(1)}s step=${step.toFixed(1)})`);
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

console.log('PASS replay: determinism, no-spoiler & timing sync, corridor-constrained motion, no post-death/early-revive, absent players, fixed-seed cases, map graph, unit-5 siege, MINIMAP-02 persistent agents (no freeze / continuity / independent lanes)');
