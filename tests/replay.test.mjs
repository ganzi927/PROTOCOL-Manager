import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet} from '../lib/game.ts';
import {buildReplay,stateAt,posAt,MAP,pathBetween} from '../lib/simulation/replay.ts';

const g=upgradeGame(newGame('nva',7));
const M={id:'r',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const runSet=s=>{g.seed=s;return simulateSet(g,M);};
const nodeVals=Object.values(MAP.nodes);
const isNode=(p)=>nodeVals.some(n=>Math.abs(n[0]-p[0])<1e-6&&Math.abs(n[1]-p[1])<1e-6);
const edgeSet=new Set(MAP.edges.flatMap(([a,b])=>[a+'|'+b,b+'|'+a]));

// --- 1. 결정성: 같은 SetResult → 같은 ReplayData ---
{
 const set=runSet(88);
 assert.equal(JSON.stringify(buildReplay(set)),JSON.stringify(buildReplay(set)));
 // stateAt / posAt 도 순수
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
   // feed 는 t 이하 beat 만
   for(const f of s.feed)assert.ok(f.t<=t+1e-9,`피드가 미래 사건 노출 안 함 (seed ${seed})`);
   prevA=s.score[0];prevB=s.score[1];
  }
  assert.deepEqual(stateAt(rd,rd.duration+10).score,rd.finalScore,`끝까지 재생하면 최종 점수 일치 (seed ${seed})`);
  // 킬 beat 시점에 점수가 반영된다
  for(const b of rd.beats){
   if(b.kind!=='kill'||!b.scoreDelta)continue;
   const before=stateAt(rd,b.t-0.01).score, after=stateAt(rd,b.t+0.01).score;
   assert.deepEqual([after[0]-before[0],after[1]-before[1]],b.scoreDelta,`킬 적용 시점 일치 (seed ${seed}, t=${b.t.toFixed(2)})`);
  }
 }
}

// --- 3. 이동 경로가 정의된 통로를 벗어나지 않는다 ---
{
 for(const seed of [3,17,88,200]){
  const rd=buildReplay(runSet(seed));
  for(const tr of rd.tracks){
   let prevNode=null;
   for(const k of tr.key){
    if(k.state==='dead'){prevNode=null;continue;} // 사망/부활 후엔 경로 연속성이 끊긴다(리스폰 순간이동)
    assert.ok(isNode(k.pos),`키프레임이 지도 노드 위 (seed ${seed}, ${tr.side}${tr.slot} @${k.t.toFixed(1)}s [${k.pos}])`);
    const name=Object.keys(MAP.nodes).find(n=>Math.abs(MAP.nodes[n][0]-k.pos[0])<1e-6&&Math.abs(MAP.nodes[n][1]-k.pos[1])<1e-6);
    if(prevNode&&name&&prevNode!==name)
     assert.ok(edgeSet.has(prevNode+'|'+name),`연속 키프레임이 인접 노드 (seed ${seed}, ${prevNode}→${name})`);
    prevNode=name??prevNode;
   }
  }
 }
}

// --- 4. 사망 후 행동·조기 부활 없음 ---
{
 for(const seed of [42,88,120,200,240]){
  const set=runSet(seed);
  const rd=buildReplay(set);
  for(const b of rd.beats){
   if(b.kind!=='kill'||!b.ref)continue;
   const key=b.ref.side+b.ref.slot;
   const revive=rd.beats.find(x=>x.kind==='revive'&&x.ref&&x.ref.side===b.ref.side&&x.ref.slot===b.ref.slot&&x.t>b.t);
   assert.ok(!revive||revive.t>b.t,`부활은 처치 이후 (seed ${seed})`);
   assert.ok(!revive||revive.engineClock>=b.engineClock,`부활 엔진시각 ≥ 처치 엔진시각 (seed ${seed})`);
   // 처치~부활 사이 트랙 상태는 dead 여야
   const tr=rd.tracks.find(t=>t.side===b.ref.side&&t.slot===b.ref.slot);
   const until=revive?revive.t:rd.duration;
   for(const k of tr.key){
    if(k.t>b.t+1e-6&&k.t<until-1e-6)
     assert.equal(k.state,'dead',`처치 후 부활 전 키프레임은 dead (seed ${seed}, ${key} @${k.t.toFixed(1)})`);
   }
   // dead 상태에서 stateAt 이 살아있다고 하지 않음
   const mid=(b.t+until)/2;
   assert.equal(stateAt(rd,mid).dead[b.ref.side+' '+b.ref.slot],true,`처치~부활 구간엔 사망 표시 (seed ${seed})`);
  }
 }
}

// --- 5. 불참자가 교전에 나타나지 않는다 (combat 사건) ---
{
 for(const seed of [3,17,88,120,200,240]){
  const set=runSet(seed);
  const rd=buildReplay(set);
  for(const e of set.events){
   if(!e.combat)continue;
   const w=rd.windows.find(w=>w.seq===e.index);
   const parts=new Set(e.combat.participants.map(p=>p.side+p.slot));
   const evNode=eventNodeOf(e);
   for(const nj of (e.combat.notJoined||[])){
    const tr=rd.tracks.find(t=>t.side===nj.ref.side&&t.slot===nj.ref.slot);
    // 이 사건 구간 동안 불참자는 사건 위치로 이동하지 않는다
    for(const k of tr.key){
     if(k.t<w.start-1e-6||k.t>w.end+1e-6)continue;
     const dToEv=Math.hypot(k.pos[0]-evNode[0],k.pos[1]-evNode[1]);
     assert.ok(dToEv>2||k.state==='dead',`불참자가 사건 위치에 없음 (seed ${seed}, #${e.index}, ${nj.ref.side}${nj.ref.slot} d=${dToEv.toFixed(1)})`);
    }
   }
   // 처치자·피해자·어시스트는 참여자
   for(const k of e.combat.kills){
    assert.ok(parts.has(k.killer.side+k.killer.slot)&&parts.has(k.victim.side+k.victim.slot),`처치 관련자는 참여자 (seed ${seed})`);
   }
  }
 }
}
function eventNodeOf(e){
 if(e.combat.kind==='objective')return e.combat.objective.kind==='herald'?MAP.nodes.baron:MAP.nodes.dragon;
 const lose=e.combat.side==='A'?'B':'A';
 return e.combat.lane===0?(lose==='A'?MAP.nodes.A_top:MAP.nodes.B_top)
  :e.combat.lane===1?MAP.nodes.mid
  :(lose==='A'?MAP.nodes.A_bot:MAP.nodes.B_bot);
}

// --- 6. 고정 시드: 바텀 처치 / 생존(보호·탈출) / 합류 불발 사례 ---
{
 let sawKill=false, sawEscape=false, sawNoCommit=false, sawJoin=false;
 for(let seed=0;seed<120;seed++){
  const set=runSet(seed);
  const bot=set.events[2]?.combat; if(!bot||bot.kind==='objective')continue;
  const rd=buildReplay(set);
  const botKills=rd.beats.filter(b=>b.seq===2&&b.kind==='kill'&&b.ref);
  const botEsc=rd.beats.filter(b=>b.seq===2&&b.kind==='escape');
  const approach=rd.beats.find(b=>b.seq===2&&b.kind==='approach');
  if(botKills.length){sawKill=true;
   // 처치 beat 에 실제 피해자·처치자 ref, 참여자
   const parts=new Set(bot.participants.map(p=>p.side+p.slot));
   for(const k of botKills)assert.ok(k.ref&&k.by&&parts.has(k.ref.side+k.ref.slot)&&parts.has(k.by.side+k.by.slot),`바텀 처치 ref 유효 (seed ${seed})`);
  }
  if(botEsc.length){sawEscape=true;
   for(const es of botEsc)assert.ok(bot.escaped.some(x=>x.side===es.ref.side&&x.slot===es.ref.slot),`탈출 beat가 실제 escaped 기록과 일치 (seed ${seed})`);
  }
  if(bot.committed){sawJoin=true; assert.ok(approach,`합류했으면 approach beat 있음 (seed ${seed})`);}
  else {sawNoCommit=true; assert.ok(!approach,`정글 불참이면 합류 beat 없음 (seed ${seed})`);}
 }
 assert.ok(sawKill,'고정 시드 중 바텀 처치 사례 존재');
 assert.ok(sawEscape,'바텀 생존/탈출 사례 존재');
 assert.ok(sawJoin&&sawNoCommit,'정글 합류/불참 사례 모두 존재');
}

// --- 7. 지도 경로 그래프 정합 ---
{
 const p=pathBetween('A_jg_b','B_bot');
 assert.ok(p[0]==='A_jg_b'&&p[p.length-1]==='B_bot','경로 시작/끝');
 for(let i=1;i<p.length;i++)assert.ok(edgeSet.has(p[i-1]+'|'+p[i]),`경로 각 구간이 통로 (${p[i-1]}→${p[i]})`);
 assert.deepEqual(pathBetween('mid','mid'),['mid']);
}

// --- 8. 단위 5: 공성 사건 — 미니맵·중계·구조물 상태 일치 ---
{
 let sawSiegeBeat=false, sawNexus=false, sawHeld=false;
 for(let seed=0;seed<60;seed++){
  const set=runSet(seed);
  const rd=buildReplay(set);
  // 구조물 스냅샷은 단조: 포탑/억제기 진행도만 증가, 넥서스포탑만 감소, 넥서스는 latch.
  let prev=null;
  for(const bt of rd.beats){
   if(!bt.struct)continue;
   if(prev){
    for(const S of ['A','B']) for(let L=0;L<3;L++)
     assert.ok(bt.struct[S][L]>=prev[S][L],`구조물 진행도 단조 (seed ${seed}, ${S}${L})`);
    assert.ok(bt.struct.baseA<=prev.baseA&&bt.struct.baseB<=prev.baseB,`넥서스포탑은 줄기만 (seed ${seed})`);
    assert.ok(bt.struct.nexusA>=prev.nexusA&&bt.struct.nexusB>=prev.nexusB,`넥서스 파괴는 유지 (seed ${seed})`);
    for(const S of ['A','B']) for(let L=0;L<3;L++) assert.ok(bt.struct[S][L]<=3,`진행도 3 이하`);
   }
   prev=bt.struct;
  }
  // 공성 사건: structuresDown>0 일 때만 siege/nexus '파괴' beat, 그 외엔 무산/중단 문구.
  for(const e of set.events){
   const cb=e.combat; if(cb?.kind!=='siege')continue;
   const sg=cb.siege;
   const b=rd.beats.find(x=>x.seq===e.index&&(x.kind==='siege'||x.kind==='nexus'));
   assert.ok(b,`공성 사건엔 공성 beat (seed ${seed}, #${e.index})`);
   if(sg.structuresDown>0){
    sawSiegeBeat=true;
    assert.ok(/철거|파괴/.test(b.text),`철거가 있으면 파괴 문구 (seed ${seed})`);
    if(sg.nexus){sawNexus=true;assert.equal(b.kind,'nexus');assert.ok(b.struct[sg.side==='A'?'nexusB':'nexusA'],'넥서스 스냅샷 반영');}
   }else{
    sawHeld=true;
    assert.ok(!/억제기 파괴|넥서스 파괴|포탑 \d 철거/.test(b.text),`철거 없으면 파괴라고 안 함 (seed ${seed}, "${b.text}")`);
   }
  }
  // 재생 끝의 구조물 상태 = 엔진 최종. NEXUS 종료면 진 팀 nexus=true.
  const endStruct=stateAt(rd,rd.duration+5).struct;
  if(set.endReason==='NEXUS'){
   assert.ok(endStruct.nexusA||endStruct.nexusB,`NEXUS 종료면 재생 끝에 넥서스 파괴 (seed ${seed})`);
   assert.equal(endStruct.nexusA&&endStruct.nexusB,false,'양 팀 동시 파괴 없음');
  }
 }
 assert.ok(sawSiegeBeat,'공성 철거 beat 사례 존재');
 assert.ok(sawNexus,'넥서스 파괴 beat 사례 존재');
 assert.ok(sawHeld,'공성 무산/중단 beat 사례 존재');
}

console.log('PASS replay: determinism, no-spoiler & timing sync, corridor-constrained motion, no post-death action / early revive, absent players not in fights, fixed-seed bot cases, map graph, unit-5 siege/structure consistency');
