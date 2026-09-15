import assert from 'node:assert/strict';
import {newGame,upgradeGame,simulateSet,starters,ROLES,random,hash,CHAMPIONS} from '../lib/game.ts';
import {newMatchState,resolveGank,resolveBotLane,resolveObjective,resolveTeamfight,resolveSiege,hasArrived,regionTime,REGION_DIST} from '../lib/simulation/combat.ts';

function controlledBase(){
 const g=upgradeGame(newGame('nva',1));
 for(const p of g.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
 g.meta=[];
 for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
 return g;
}
const M={id:'cb',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};
const g0=upgradeGame(newGame('nva',7));
const REAL={id:'r',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'};

// --- 1. 결정성: 전체 SetResult 반복 호출에 동일(combat 포함) ---
{
 g0.seed=44;
 assert.equal(JSON.stringify(simulateSet(g0,REAL)),JSON.stringify(simulateSet(g0,REAL)));
}

// --- 2. 사망·처치·어시스트 규칙에 모순이 없다 ---
{
 for(let seed=0;seed<300;seed++){
  g0.seed=seed;const r=simulateSet(g0,REAL);
  let fbCount=0, firstKillClock=Infinity, fbClock=null;
  for(const e of r.events){
   if(!e.combat)continue;
   const cb=e.combat;
   assert.ok(cb.resource.length===5&&cb.resource.every(Number.isFinite),`resource 5칸 유한 (seed ${seed})`);
   assert.equal(cb.noKill,cb.kills.length===0,'noKill ↔ kills 비었음');
   const pset=new Set(cb.participants.map(p=>p.side+p.slot));
   for(const k of cb.kills){
    assert.notEqual(k.killer.side,k.victim.side,'처치자와 피해자는 다른 팀');
    assert.ok(pset.has(k.killer.side+k.killer.slot),'처치자는 참여자');
    assert.ok(pset.has(k.victim.side+k.victim.slot),'피해자는 참여자');
    for(const a of k.assists){
     assert.equal(a.side,k.killer.side,'어시스트는 처치자 팀');
     assert.notEqual(a.side+a.slot,k.killer.side+k.killer.slot,'어시스트 ≠ 처치자');
     assert.ok(pset.has(a.side+a.slot),'어시스트는 참여자');
    }
    firstKillClock=Math.min(firstKillClock,k.clock);
   }
   for(const es of cb.escaped)assert.ok(pset.has(es.side+es.slot),'탈출자는 참여자');
   // 한 사건 안에서 같은 피해자를 두 번 처치하지 않는다(부활 없이 재사망 금지)
   const vs=cb.kills.map(k=>k.victim.side+k.victim.slot);
   assert.equal(vs.length,new Set(vs).size,`한 사건 내 동일 피해자 중복 없음 (seed ${seed}, idx ${e.index})`);
   if(cb.firstBlood){fbCount++;assert.ok(cb.kills.length>=1,'firstBlood면 킬 존재');fbClock=cb.kills[0].clock;}
  }
  assert.ok(fbCount<=1,`세트당 firstBlood ≤ 1 (seed ${seed})`);
  if(fbCount===1)assert.equal(fbClock,firstKillClock,`firstBlood는 최초 처치 사건 (seed ${seed})`);
 }
}

// --- 3. 중계가 combat을 읽는다: firstBlood ↔ 'FIRST BLOOD' 비트, 킬 수 일치 ---
{
 for(let seed=0;seed<200;seed++){
  g0.seed=seed;const r=simulateSet(g0,REAL);
  for(const e of r.events){
   if(!e.combat)continue;
   const ka=e.combat.kills.filter(k=>k.killer.side==='A').length;
   const kb=e.combat.kills.filter(k=>k.killer.side==='B').length;
   assert.deepEqual(e.kills,{a:ka,b:kb},`이벤트 kills가 combat과 일치 (seed ${seed}, idx ${e.index})`);
   if(e.combat.firstBlood)assert.ok(e.beats.some(b=>b.label==='FIRST BLOOD'),`firstBlood면 비트에 FIRST BLOOD (seed ${seed})`);
  }
 }
}

// --- 4. 능력 → 행동: 갱킹 수행(LNE+MEC)과 시야 방어(VIS) ---
{
 const base=controlledBase(), atk=controlledBase(), def=controlledBase();
 starters(atk)[0].stats[0]=92; starters(atk)[0].stats[4]=92; // 우리 팀 탑: 라인전·메커닉↑
 starters(def)[0].stats[3]=95;                                // 우리 팀 탑: 시야↑ (피습 방어)
 let bK=0,aK_atk=0,bK_atk=0, aDeath_base=0,aDeath_def=0, N=5000;
 for(let s=0;s<N;s++){
  base.seed=s; const rb=simulateSet(base,M).events[0].combat;
  atk.seed=s;  const ra=simulateSet(atk,M).events[0].combat;
  def.seed=s;  const rd=simulateSet(def,M).events[0].combat;
  bK+=rb.kills.filter(k=>k.killer.side==='A').length;
  aK_atk+=ra.kills.filter(k=>k.killer.side==='A').length;
  bK_atk+=ra.kills.filter(k=>k.killer.side==='B').length;
  aDeath_base+=rb.kills.filter(k=>k.victim.side==='A').length;
  aDeath_def+=rd.kills.filter(k=>k.victim.side==='A').length;
 }
 assert.ok(aK_atk>bK*1.4,`탑 라인전·메커닉 강화 → A 갱킹 처치 증가: 기준 ${bK} → ${aK_atk}`);
 assert.ok(aK_atk>bK_atk*1.3,`강화 후 A가 상대보다 탑에서 더 처치: ${aK_atk} vs ${bK_atk}`);
 assert.ok(aDeath_def<aDeath_base*0.95,`탑 시야 강화 → A 탑 피살 감소: 기준 ${aDeath_base} → ${aDeath_def}`);
}

// --- 5. 자원 부호: 처치/확보가 난 사건은 이득 팀 쪽으로 순자원이 쏠린다 ---
{
 let ok=0,tot=0;
 for(let seed=0;seed<400;seed++){
  g0.seed=seed;
  for(const e of simulateSet(g0,REAL).events){
   if(!e.combat)continue;
   const cb=e.combat;
   // 미확보 오브·승자 없는 한타(트레이드·무교전)는 부호가 중립일 수 있어 제외
   if(cb.kind==='objective'&&!cb.objective.secured)continue;
   if(cb.kind==='teamfight'&&!cb.fight.winner)continue;
   if(!cb.kills.length&&cb.kind!=='objective')continue;
   tot++;
   const sum=cb.resource.reduce((x,y)=>x+y,0);
   if((cb.side==='A'&&sum>0)||(cb.side==='B'&&sum<0)||sum===0&&!cb.kills.length)ok++;
  }
 }
 assert.ok(tot>0&&ok/tot>0.96,`처치/확보 사건의 순자원 부호가 이득 팀과 일치: ${ok}/${tot}`);
}

// --- 6. 바텀 2v2: 능력 → 행동 (ADC 딜, SUP 시야·보호) ---
{
 const base=controlledBase(), dps=controlledBase(), vis=controlledBase(), pel=controlledBase();
 dps.seed=vis.seed=pel.seed=0;
 starters(dps)[3].stats[4]=92; starters(dps)[3].stats[5]=92;  // 우리 원딜: 메커닉·전환↑
 starters(vis)[4].stats[3]=95;                                 // 우리 서포터: 시야↑
 starters(pel)[4].stats[1]=95;                                 // 우리 서포터: 피어(TF)↑
 let baseK=0,dpsK=0, baseAdcDeath=0,visAdcDeath=0, basePeel=0,pelPeel=0, N=5000;
 const botOf=(gg,s)=>{gg.seed=s;return simulateSet(gg,M).events[2].combat;};
 const adcDeaths=cb=>cb.kills.filter(k=>k.victim.side==='A'&&k.victim.slot===3).length;
 const aPeel=cb=>(cb.escaped.some(e=>e.side==='A'&&e.slot===3)&&adcDeaths(cb)===0)?1:0;
 for(let s=0;s<N;s++){
  const b=botOf(base,s), d=botOf(dps,s), v=botOf(vis,s), pl=botOf(pel,s);
  baseK+=b.kills.filter(k=>k.killer.side==='A').length;
  dpsK+=d.kills.filter(k=>k.killer.side==='A').length;
  baseAdcDeath+=adcDeaths(b); visAdcDeath+=adcDeaths(v);
  basePeel+=aPeel(b); pelPeel+=aPeel(pl);
 }
 assert.ok(dpsK>baseK*1.15,`원딜 메커닉·전환↑ → A 바텀 처치 증가: ${baseK} → ${dpsK}`);
 assert.ok(visAdcDeath<baseAdcDeath*0.9,`서포터 시야↑ → A 원딜 바텀 피살 감소: ${baseAdcDeath} → ${visAdcDeath}`);
 assert.ok(pelPeel>basePeel*1.15,`서포터 피어↑ → A 원딜 보호 생존 증가: ${basePeel} → ${pelPeel}`);
}

// --- 7. 오브젝트 교전: 참여자 선정·확보 결과·보상·상태 유지 ---
function mkState(mut){
 const g=controlledBase();
 const sa=starters(g,'nva'),sb=starters(g,'crn');
 const picksA=ROLES.map((r,k)=>sa[k]?`p${k}`:'x'), picksB=ROLES.map((r,k)=>`q${k}`);
 const st=newMatchState(
  sa.map(p=>({stats:p.stats.slice(),name:p.name,role:p.role})),
  sb.map(p=>({stats:p.stats.slice(),name:p.name,role:p.role})),
  picksA,picksB,()=>0,()=>false);
 if(mut)mut(st);
 return st;
}
const CRNG=()=>random(hash('obj-test'));

// 7a. 리스폰 대기 중인 정글러는 오브전에 참여하지 못한다(이유 기록).
{
 const st=mkState(s=>{s.A[1].alive=false;s.A[1].respawnAt=99999;});
 const ce=resolveObjective(st,3,'herald',true,0.25,660,CRNG());
 assert.ok(!ce.participants.some(p=>p.side==='A'&&p.slot===1),'죽은 A 정글러 미참여');
 assert.ok((ce.notJoined||[]).some(n=>n.ref.side==='A'&&n.ref.slot===1&&n.reason.includes('리스폰')),'불참 이유에 리스폰');
}
// 7b. 부활 시각이 지난 정글러는 참여 가능하다.
{
 const st=mkState(s=>{s.A[1].alive=false;s.A[1].respawnAt=100;}); // clock 660 > 100
 const ce=resolveObjective(st,3,'herald',true,0.25,660,CRNG());
 assert.ok(ce.participants.some(p=>p.side==='A'&&p.slot===1),'부활한 A 정글러 참여');
}
// 7c. 한쪽만 인원이 되면 무교전 확보, 처치 없음.
{
 const st=mkState(s=>{for(const sl of [0,2,3,4]){s.B[sl].alive=false;s.B[sl].respawnAt=99999;}});
 const ce=resolveObjective(st,3,'herald',true,0.2,660,CRNG());
 assert.equal(ce.objective.secured,'A','A 무교전 확보');
 assert.equal(ce.objective.outcome,'SECURE_UNCONTESTED');
 assert.equal(ce.kills.length,0,'무교전이므로 처치 없음');
 assert.ok(ce.resource.reduce((x,y)=>x+y,0)>0,'확보 팀 순자원 +');
}
// 7d. 양쪽 다 인원 부족이면 미확보(취소), 보상 없음, 목표는 남는다.
{
 const st=mkState(s=>{for(const sd of ['A','B'])for(const sl of [0,1,2,3]){s[sd][sl].alive=false;s[sd][sl].respawnAt=99999;}});
 const ce=resolveObjective(st,4,'dragon',true,0.2,900,CRNG());
 assert.equal(ce.objective.secured,null,'미확보');
 assert.equal(ce.objective.outcome,'CANCELLED');
 assert.deepEqual(ce.resource,[0,0,0,0,0],'보상 없음');
 assert.equal(st.pendingObjective,'dragon','목표가 다음 사건으로 남는다');
}
// 7e. pendingObjective: 미확보로 남았던 '같은' 목표를 확보하면 해소, '다른' 목표 확보로는 유지(혼동·중복지급 방지).
{
 const k4=s=>{for(const sl of [0,2,3,4]){s.B[sl].alive=false;s.B[sl].respawnAt=99999;}};
 const st1=mkState(k4);st1.pendingObjective='dragon';
 const c1=resolveObjective(st1,4,'dragon',true,0.5,900,CRNG());
 assert.equal(c1.objective.secured,'A'); assert.equal(st1.pendingObjective,null,'같은 kind 확보 → pending 해소');
 const st2=mkState(k4);st2.pendingObjective='herald';
 const c2=resolveObjective(st2,4,'dragon',true,0.5,900,CRNG());
 assert.equal(c2.objective.secured,'A'); assert.equal(st2.pendingObjective,'herald','다른 kind 확보로는 pending 유지');
}
// 7f. 오브전 처치·어시스트는 실제 참여자에게만.
{
 for(let s=0;s<250;s++){
  const g0b=upgradeGame(newGame('nva',s));
  const r=simulateSet(g0b,{id:'r'+s,a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'});
  for(const e of r.events){
   if(e.combat?.kind!=='objective')continue;
   const pset=new Set(e.combat.participants.map(p=>p.side+p.slot));
   for(const k of e.combat.kills){
    assert.ok(pset.has(k.killer.side+k.killer.slot)&&pset.has(k.victim.side+k.victim.slot),`오브 처치자·피해자는 참여자 (seed ${s})`);
    for(const a of k.assists)assert.ok(pset.has(a.side+a.slot)&&a.side===k.killer.side,`오브 어시스트는 처치자 팀 참여자 (seed ${s})`);
   }
   // 미확보 사건은 팀 보상이 없다
   if(!e.combat.objective.secured&&!e.combat.kills.length)assert.deepEqual(e.combat.resource,[0,0,0,0,0],`미확보·무처치는 자원 0 (seed ${s})`);
  }
 }
}
// 7g. JGL OBJ 강화 → 오브 확보율 상승(목표 수행에 실제 효과).
{
 const bs=controlledBase(), js=controlledBase();
 starters(js)[1].stats[2]=92; // 우리 정글: 오브젝트 능력↑
 let bSec=0,jSec=0,bObj=0,jObj=0,N=4000;
 for(let s=0;s<N;s++){
  bs.seed=s; for(const e of simulateSet(bs,M).events)if(e.combat?.kind==='objective'){bObj++;if(e.combat.objective.secured==='A')bSec++;}
  js.seed=s; for(const e of simulateSet(js,M).events)if(e.combat?.kind==='objective'){jObj++;if(e.combat.objective.secured==='A')jSec++;}
 }
 assert.ok(jSec/jObj > bSec/bObj + 0.05, `JGL OBJ↑ → A 오브 확보율 상승: ${(bSec/bObj*100).toFixed(1)}% → ${(jSec/jObj*100).toFixed(1)}%`);
}

// --- 8. 단위 3 정합성: 미확보 오브의 확보·보상·승리점수 분리 ---
{
 // 8a. simulateSet 통합: 미확보 오브 사건은 advantage 이동 없음 + 표시 골드 균등 + edge 별도 기록.
 let sawUnsec=false;
 for(let seed=0;seed<200;seed++){
  const g0b=upgradeGame(newGame('nva',seed));
  const r=simulateSet(g0b,{id:'u'+seed,a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'});
  for(let i=3;i<=4&&i<r.events.length;i++){
   const e=r.events[i], pe=r.events[i-1];
   assert.ok(e.edge==='nva'||e.edge==='crn','edge 팀이 기록됨');
   if(e.combat?.objective?.secured)continue;
   sawUnsec=true;
   assert.equal(e.advantage,pe.advantage,`미확보 오브는 advantage 이동 없음 (seed ${seed}, idx ${i})`);
   const dA=e.goldA-pe.goldA, dB=e.goldB-pe.goldB;
   assert.ok(Math.abs(dA-dB)<Math.max(dA,dB)*0.35+120,`미확보 오브 표시 골드 균등 (seed ${seed}: ${dA} vs ${dB})`);
  }
 }
 assert.ok(sawUnsec,'미확보 오브 사건 표본 존재');
}
{
 // 8b. 처치 후 미확보: 처치/어시스트 자원은 반영(보상 유지), 확보 팀 5칸 팀 보상은 0.
 let checked=0, sawTeamBountyWhenSecured=false;
 for(let i=0;i<600;i++){
  // 미확보 + 처치 사례
  const st=mkState();
  const ce=resolveObjective(st,4,'dragon',true,0.14,900,random(hash('u3-'+i)));
  if(ce.objective.secured===null&&ce.kills.length>0){
   checked++;
   assert.ok(ce.resource.reduce((a,v)=>a+Math.abs(v),0)>=50,`처치가 자원에 반영됨(미확보라도) (i=${i}, res=[${ce.resource.map(x=>Math.round(x))}])`);
   const aAll=[0,1,2,3,4].every(s=>ce.resource[s]>=25), bAll=[0,1,2,3,4].every(s=>ce.resource[s]<=-25);
   assert.ok(!aAll&&!bAll,`미확보 오브엔 5칸 팀 보상 없음 (i=${i}, res=[${ce.resource.map(x=>Math.round(x))}])`);
  }
  // 대조: 확보 사례에는 5칸 팀 보상 패턴이 있어야(경로가 살아있음 확인)
  const st2=mkState(s=>{for(const sl of [0,2,3,4]){s.B[sl].alive=false;s.B[sl].respawnAt=99999;}});
  const c2=resolveObjective(st2,4,'dragon',true,0.5,900,random(hash('u3s-'+i)));
  if(c2.objective.secured==='A'&&[0,2,3,4].every(s=>c2.resource[s]>=25))sawTeamBountyWhenSecured=true;
 }
 assert.ok(checked>0,'처치+미확보 사례를 확보했다');
 assert.ok(sawTeamBountyWhenSecured,'확보 사건엔 팀 보상 패턴이 존재(대조)');
}

// --- 8c. F10: 오브젝트를 포기해도 실제 대안 이득(사이드 웨이브)이 있다 — 오브젝트 보상과는 별개 채널.
{
 // 확보한 쪽은 그대로, 확보하지 못한 쪽(B)만 탑 웨이브가 오른다. 동시에 B는 여전히 오브젝트
 // 5칸 팀 보상은 받지 않는다(8b가 이미 확인한 채널과 분리돼 있어야 함 — 이중 지급 아님).
 const st=mkState(s=>{s.clock=660;});
 const ce=resolveObjective(st,3,'herald',true,0.5,660,random(hash('f10-secure')));
 assert.equal(ce.objective.secured,'A','통제 상태에서 A가 확보(대조 기준)');
 assert.ok(st.wave.B[0]>0,`확보 실패한 B는 탑 웨이브를 얻는다: ${st.wave.B[0]}`);
 assert.equal(st.wave.A[0],0,'확보한 A는 이 웨이브 보너스를 받지 않는다(이미 오브젝트 보상을 받았음)');
 // resource는 A 관점 5칸 차이값(res_A−res_B)이다 — B가 5칸 팀 보상을 받았다면 전 슬롯이 크게
 // 음수(B 우세)로 쏠렸을 것. A가 확보했으므로 그 패턴이 없어야 한다(채널 분리, B 이중 지급 아님).
 assert.ok(![0,1,2,3,4].every(sl=>ce.resource[sl]<=-25),'확보 못 한 B가 오브젝트 5칸 팀 보상을 받은 패턴은 없다(채널 분리, 이중 지급 아님)');

 // 둘 다 확보 못 하면(합류 인원 부족) 둘 다 그 시간을 라인에 쓴 것으로 본다 — 양쪽 다 웨이브 증가.
 const st2=mkState(s=>{
  s.clock=660;
  for(const sl of [1,2,4]){ s.A[sl].alive=false; s.A[sl].respawnAt=99999; } // A: 정글·미드·서포터 이탈(탑은 생존)
  for(const sl of [1,2,4]){ s.B[sl].alive=false; s.B[sl].respawnAt=99999; } // B도 동일
 });
 const ce2=resolveObjective(st2,3,'herald',true,0.5,660,random(hash('f10-cancel')));
 assert.equal(ce2.objective.secured,null,'양쪽 다 합류 부족 → 시도 취소(통제 조건)');
 assert.ok(st2.wave.A[0]>0&&st2.wave.B[0]>0,`둘 다 확보 못 하면 둘 다 웨이브 증가: A=${st2.wave.A[0]} B=${st2.wave.B[0]}`);

 // 엣지 케이스: 웨이브 혜택을 받을 자격이 있어도 탑 라이너가 죽어 있으면 못 받는다(순간이동 없음).
 const st3=mkState(s=>{
  s.clock=660;
  s.A[0].alive=false; s.A[0].respawnAt=99999; // A 탑 사망
  for(const sl of [1,2,4]){ s.A[sl].alive=false; s.A[sl].respawnAt=99999; }
  for(const sl of [1,2,4]){ s.B[sl].alive=false; s.B[sl].respawnAt=99999; }
 });
 const ce3=resolveObjective(st3,3,'herald',true,0.5,660,random(hash('f10-dead-top')));
 assert.equal(ce3.objective.secured,null,'통제 조건 재확인(취소)');
 assert.equal(st3.wave.A[0],0,'탑 라이너가 죽어 있으면 웨이브 혜택도 못 받는다(자격은 있어도 실행 불가)');
 assert.ok(st3.wave.B[0]>0,'B는 탑이 살아있어 정상적으로 웨이브를 받는다(대조)');
}

// --- 9. 단위 4: 참여자 기반 한타(resolveTeamfight) — 구성 상태 고정 검증 ---
{
 const kill=(st,side,slots)=>{for(const sl of slots){st[side][sl].alive=false;st[side][sl].deaths++;st[side][sl].respawnAt=99999;}};
 const seedRng=tag=>random(hash(tag));
 const tfKills=ce=>ce.kills;
 const validKill=(ce,st)=>{
  const pset=new Set(ce.participants.map(p=>p.side+p.slot));
  const seen=new Set();
  for(const k of ce.kills){
   assert.ok(k.killer.side!==k.victim.side,'처치자·피해자는 다른 팀');
   assert.ok(pset.has(k.killer.side+k.killer.slot)&&pset.has(k.victim.side+k.victim.slot),'처치 관련자는 참여자');
   assert.ok(!seen.has(k.victim.side+k.victim.slot),'같은 피해자 두 번 처치되지 않음');
   seen.add(k.victim.side+k.victim.slot);
   for(const a of k.assists)assert.ok(a.side===k.killer.side&&pset.has(a.side+a.slot),'어시스트는 처치자 팀 참여자');
  }
 };

 // 9a. 정상 5v5: 여러 시드에서 결과 계약·불변식.
 {
  let sawDecisive=false,sawNoResult=false;
  for(let s=0;s<400;s++){
   const st=mkState();
   const ce=resolveTeamfight(st,5,s%2===0,0.12,1080,seedRng('tf9a-'+s));
   assert.equal(ce.kind,'teamfight');
   assert.ok(['ONE_SIDED','DECISIVE','TRADE','NO_ENGAGE','NO_SHOW'].includes(ce.fight.result));
   assert.equal(ce.fight.aliveA,5);assert.equal(ce.fight.aliveB,5);
   validKill(ce,st);
   if(ce.fight.winner){sawDecisive=true;assert.ok(ce.fight.winner==='A'||ce.fight.winner==='B');
    // 결판 = 이긴 팀 쪽으로 순자원이 쏠린다(동수 처치로 지역만 장악한 경우 0도 허용, 불리하진 않다).
    const net=ce.resource.reduce((a,v)=>a+v,0);
    assert.ok(ce.fight.winner==='A'?net>=-1:net<=1,`결판 한타는 승자 쪽 순자원 (s=${s}, winner ${ce.fight.winner}, net ${net.toFixed(2)})`);
   }else sawNoResult=true;
  }
  assert.ok(sawDecisive&&sawNoResult,'5v5에서 결판·무승부 사례 모두 관측');
 }

 // 9b. 유리한(edgeA) 팀이 전원 사망 → edgeA 팀이 한타를 이기지 못한다(ONE_SIDED, 상대 승).
 {
  for(let s=0;s<50;s++){
   const st=mkState(x=>kill(x,'A',[0,1,2,3,4])); // A 전원 사망, edgeA=A
   const ce=resolveTeamfight(st,5,true,0.9,1080,seedRng('tf9b-'+s));
   assert.equal(ce.fight.result,'ONE_SIDED');
   assert.equal(ce.fight.winner,'B','유리 팀 전멸 시 사전 edgeA로 이기지 않는다');
   assert.equal(ce.kills.length,0,'참가자 없는 쪽엔 처치 없음');
  }
 }
 // 9c. 양 팀 모두 참가자 없음 → NO_SHOW, 승자 없음.
 {
  const st=mkState(x=>{kill(x,'A',[0,1,2,3,4]);kill(x,'B',[0,1,2,3,4]);});
  const ce=resolveTeamfight(st,6,true,0.5,1320,seedRng('tf9c'));
  assert.equal(ce.fight.result,'NO_SHOW');
  assert.equal(ce.fight.winner,null);
  assert.deepEqual(ce.resource,[0,0,0,0,0]);
 }
 // 9d. 인원 열세(edgeA 팀 3인 vs 5인): 사전 edgeA·높은 margin에도 열세 팀 한타 승률 < 50%.
 {
  let favWin=0,decis=0;
  for(let s=0;s<1200;s++){
   const st=mkState(x=>kill(x,'A',[0,3])); // A는 TOP·ADC 사망 → 3v5, edgeA=A, margin 큼
   const ce=resolveTeamfight(st,5,true,0.35,1080,seedRng('tf9d-'+s));
   assert.equal(ce.fight.aliveA,3);assert.equal(ce.fight.aliveB,5);
   validKill(ce,st);
   if(ce.fight.winner){decis++;if(ce.fight.winner==='A')favWin++;}
  }
  assert.ok(favWin/decis<0.5,`3v5 열세 팀 한타 승률 ${(favWin/decis*100).toFixed(1)}% < 50% (실제 인원차가 사전 edgeA를 이긴다)`);
 }
 // 9e. 핵심 딜러(ADC) 부재: 죽은 A-ADC는 참가자·기여에 없고 불참 사유가 기록된다.
 {
  const st=mkState(x=>kill(x,'A',[3]));
  const ce=resolveTeamfight(st,7,true,0.2,1560,seedRng('tf9e'));
  assert.ok(!ce.participants.some(p=>p.side==='A'&&p.slot===3),'죽은 A-ADC 미참여');
  assert.ok(!ce.fight.contrib.some(c=>c.ref.side==='A'&&c.ref.slot===3),'죽은 A-ADC 기여 없음');
  assert.ok((ce.notJoined||[]).some(n=>n.ref.side==='A'&&n.ref.slot===3),'A-ADC 불참 사유 기록');
  assert.ok(!ce.kills.some(k=>k.victim.side==='A'&&k.victim.slot===3),'이미 죽은 딜러는 다시 죽지 않는다');
 }
 // 9f. 보호 성공 → 딜러 생존: SUP VIS·TF를 크게 올리면 보호 성공률·딜러 생존율이 오른다.
 {
  const mkSup=hi=>mkState(x=>{if(hi){x.A[4].stats[3]=98;x.A[4].stats[1]=98;}}); // VIS·TF
  const rate=hi=>{
   let att=0,ok=0,dead=0,part=0;
   for(let s=0;s<2500;s++){
    const st=mkSup(hi);
    const ce=resolveTeamfight(st,5,false,0.05,1080,seedRng('tf9f-'+hi+'-'+s)); // edgeA=false → A가 지는 편이 잦음
    const adc=ce.fight.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===3);
    const sup=ce.fight.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===4);
    if(!adc)continue; part++;
    if(ce.fight.winner==='B'){att++; if(sup&&sup.protect>0)ok++;}
    if(!adc.survived)dead++;
   }
   return {protPct:ok/att,survPct:1-dead/part};
  };
  const lo=rate(false), hi=rate(true);
  assert.ok(hi.protPct>lo.protPct+0.05,`SUP VIS·TF↑ → 보호 성공률 ${(lo.protPct*100).toFixed(1)}% → ${(hi.protPct*100).toFixed(1)}%`);
  assert.ok(hi.survPct>lo.survPct+0.03,`SUP VIS·TF↑ → 딜러 생존율 ${(lo.survPct*100).toFixed(1)}% → ${(hi.survPct*100).toFixed(1)}%`);
 }
 // 9g. FIRST BLOOD는 경기당 1회: firstKillDone가 이미 서면 한타에서 FB 안 뜬다.
 {
  const st1=mkState();
  const c1=resolveTeamfight(st1,5,true,0.4,1080,seedRng('tf9g-1'));
  if(c1.kills.length){assert.equal(c1.firstBlood,true,'첫 킬이 있으면 FB');
   assert.equal(st1.firstKillDone,true);}
  const st2=mkState(x=>{x.firstKillDone=true;});
  const c2=resolveTeamfight(st2,5,true,0.4,1080,seedRng('tf9g-2'));
  assert.equal(c2.firstBlood,false,'이미 첫 킬이 났으면 한타 FB 없음');
 }
 // 9h. 결정성: 같은 신규 상태 + 같은 crng 시드 → 동일 결과.
 {
  const a=resolveTeamfight(mkState(),5,true,0.2,1080,seedRng('tf9h'));
  const b=resolveTeamfight(mkState(),5,true,0.2,1080,seedRng('tf9h'));
  assert.equal(JSON.stringify(a),JSON.stringify(b));
 }
 // 9i. 무승부·무교전(winner=null)은 순자원이 한쪽으로 크게 쏠리지 않는다(TRADE/NO_ENGAGE).
 {
  let sawTrade=false,sawNoEngage=false;
  for(let s=0;s<3000;s++){
   const st=mkState();
   const ce=resolveTeamfight(st,5,true,0.0,1080,seedRng('tf9i-'+s)); // margin 0 → 무승부·무교전 가능
   if(ce.fight.result==='TRADE'){sawTrade=true;
    assert.equal(ce.fight.winner,null);
   }
   if(ce.fight.result==='NO_ENGAGE'){sawNoEngage=true;
    assert.equal(ce.fight.winner,null);
    assert.deepEqual(ce.resource,[0,0,0,0,0],'무교전은 자원 이동 없음');
    assert.equal(ce.kills.length,0,'무교전은 처치 없음');
   }
  }
  assert.ok(sawTrade,'margin 0에서 킬 교환(TRADE) 사례 존재');
  assert.ok(sawNoEngage,'margin 0에서 무교전(NO_ENGAGE) 사례 존재');
 }
}

// --- 9.5 D022: 이동↔전투 참여 단일 계약(hasArrived) — 직접 구성한 상태로 검증 ---
// 실제 시드 탐색이 아니라, mkState로 region·freeAt을 직접 조작해 5가지 요구 시나리오와
// 필수 불변 조건을 결정적으로 증명한다(오류 탐지 테스트가 아니라 계약 자체의 회귀 방지 테스트).
{
 const seedRng=tag=>random(hash(tag));
 const FR='mid'; // seq 9(≠5,6) → resolveTeamfight의 fightRegion='mid'
 const notJoinedOf=(ce,side,slot)=>(ce.notJoined||[]).find(n=>n.ref.side===side&&n.ref.slot===slot);
 const isParticipant=(ce,side,slot)=>ce.participants.some(p=>p.side===side&&p.slot===slot);
 const contribOf=(ce,side,slot)=>ce.fight.contrib.find(c=>c.ref.side===side&&c.ref.slot===slot);

 // 시나리오 1: 이전 교전 때문에 출발이 늦어진 선수 — top에서 이동을 마쳤어야 할 시각이 한타 시각을
 // 1초 넘긴다(hasArrived 경계값 바로 아래). 도착 전이므로 이번 한타에 참여하지 못한다.
 {
  const clock=1080;
  const short=regionTime('top','mid')-1; // 딱 1초 부족
  const st=mkState(s=>{ s.A[0].region='top'; s.A[0].freeAt=clock-short; });
  assert.ok(!hasArrived(st.A[0],FR,clock),'사전 조건: hasArrived가 false를 계산해야 시나리오 성립');
  const ce=resolveTeamfight(st,9,true,0.3,clock,seedRng('d022-1'));
  assert.equal(ce.fight.aliveA,4,'도착 못한 1명은 aliveA에서 빠진다(원 생존 인원 5명과 다름)');
  assert.ok(!isParticipant(ce,'A',0),'미도착 선수는 participants에 없다');
  assert.ok(!contribOf(ce,'A',0),'미도착 선수는 기여(contrib)도 없다 — 도착 전 공격·보호 행동 없음');
  const nj=notJoinedOf(ce,'A',0);
  assert.ok(nj,'미도착 선수는 notJoined에 기록된다');
  assert.equal(nj.reason,'이동 중(도착 전)','사망이 아니라 이동 중이라는 이유가 붙는다(리스폰 대기와 구분)');
  assert.ok(st.A[0].alive,'미도착이라고 사망 처리되지 않는다(살아있는 채로 계속 이동 중)');
 }

 // 시나리오 2: 처치 전에 도착하지 못한 선수 — 위 시나리오의 결과에서, 그 선수는 어떤 처치에도
 // 처치자·어시스트로 등장하지 않는다(합류 전 처치엔 기여 없음).
 {
  const clock=1080;
  const short=regionTime('top','mid')-1;
  const st=mkState(s=>{ s.A[0].region='top'; s.A[0].freeAt=clock-short; });
  const ce=resolveTeamfight(st,9,true,0.3,clock,seedRng('d022-2'));
  for(const k of ce.kills){
   assert.ok(!(k.killer.side==='A'&&k.killer.slot===0),'미도착 선수는 처치자가 될 수 없다');
   assert.ok(!k.assists.some(a=>a.side==='A'&&a.slot===0),'미도착 선수는 어시스트가 될 수 없다');
  }
 }

 // 시나리오 3: 부활 후 이동 중인 선수 — 죽어 있던 정글러가 이 한타 시각 6초 전에 부활했다.
 // reviveByClock이 region='base', freeAt=respawnAt으로 되돌리므로, base→mid 이동 시간(18초)을
 // 채우지 못해 도착하지 못한다 — 이때 이유는 '리스폰 대기'가 아니라 '이동 중(도착 전)'이어야 한다
 // (부활은 끝났고, 지금은 순수 이동 문제이기 때문).
 {
  const clock=1080;
  const st=mkState(s=>{ s.A[1].alive=false; s.A[1].respawnAt=clock-6; });
  const ce=resolveTeamfight(st,9,true,0.3,clock,seedRng('d022-3'));
  assert.ok(st.A[1].alive,'부활 시각이 지났으므로 되살아나 있다');
  assert.equal(st.A[1].region,'base','부활 직후 위치는 기지');
  assert.ok(!hasArrived(st.A[1],FR,clock),'기지→mid 이동 시간을 채우지 못해 미도착');
  assert.ok(!isParticipant(ce,'A',1),'부활 후 이동 중인 선수는 이번 한타 참가자가 아니다');
  const nj=notJoinedOf(ce,'A',1);
  assert.equal(nj.reason,'이동 중(도착 전)','부활은 끝났으므로 리스폰 대기가 아니라 이동 중으로 기록');
 }

 // 시나리오 4: 도착 지연으로 교전 인원이 달라지는 경우 — 원 생존자는 5명이지만 그중 2명이
 // 아직 이동 중이면 실제 교전 인원(fight.aliveA)은 3명으로 줄어야 한다(단순 alive 카운트가 아님).
 {
  const clock=1080;
  const short=regionTime('top','mid')-1;
  const st=mkState(s=>{
   s.A[0].region='top'; s.A[0].freeAt=clock-short;
   s.A[2].region='bot'; s.A[2].freeAt=clock-(regionTime('bot','mid')-1);
  });
  const rawAlive=[0,1,2,3,4].filter(sl=>st.A[sl].alive).length;
  assert.equal(rawAlive,5,'전제: 5명 모두 생존');
  const ce=resolveTeamfight(st,9,true,0.3,clock,seedRng('d022-4'));
  assert.equal(ce.fight.aliveA,3,'도착 게이트를 통과한 3명만 실제 교전 인원');
 }

 // 시나리오 5: 교전 후 공성까지 위치가 이어지는 경우 — 한타 종료 위치(river/mid)가 기지로
 // 재설정되지 않고, 다음 공성의 이동 시간 계산에 그대로 이어진다(사건 경계에서 위치 연속성 유지).
 {
  const clock=1080;
  const st=mkState();
  const tf=resolveTeamfight(st,9,true,0.3,clock,seedRng('d022-5'));
  assert.equal(st.region.A,FR,'한타 직후 팀 무게중심이 기지로 리셋되지 않고 한타 지역에 남는다');
  assert.equal(st.region.B,FR);
  for(const sl of [0,1,2,3,4]) if(st.A[sl].alive)
   assert.equal(st.A[sl].region,FR,'실제로 도착해 싸운 생존자는 개인 위치도 한타 지역으로 갱신된다');
  const sg=resolveSiege(st,10,st.clock,seedRng('d022-5s'));
  if(sg.siege && sg.siege.result!=='RESET'){
   const atk=sg.siege.side;
   for(const sl of [0,1,2,3,4]) if(st[atk][sl].alive)
    assert.equal(st[atk][sl].region,'river','공성 참가자는 사건 종료 후 중앙(river)으로 이어진다(기지 순간이동 아님)');
  }
 }

 // 필수 불변 조건 — 여러 무작위 도착-지연 구성에서 일괄 확인.
 {
  for(let s=0;s<300;s++){
   const clock=1080+s;
   const partial=s%3; // 0=지연 없음, 1=A 한 명 지연, 2=B 한 명 지연
   const st=mkState(m=>{
    if(partial===1){ m.A[s%5].region='top'; m.A[s%5].freeAt=clock-(regionTime('top','mid')-1); }
    if(partial===2){ m.B[s%5].region='bot'; m.B[s%5].freeAt=clock-(regionTime('bot','mid')-1); }
   });
   const ce=resolveTeamfight(st,9,s%2===0,0.25,clock,seedRng('d022-inv-'+s));
   // (1) 처치자는 처치 시각에 생존·도착해 있다.
   for(const k of ce.kills){
    assert.ok(isParticipant(ce,k.killer.side,k.killer.slot),'처치자는 이 한타의 참가자(=도착)여야 한다');
    // (2) 어시스트는 이 처치에 유효하게 기여한(같은 팀·참가자) 인원이다.
    for(const a of k.assists){
     assert.equal(a.side,k.killer.side,'어시스트는 처치자와 같은 팀');
     assert.ok(isParticipant(ce,a.side,a.slot),'어시스트도 참가자(=도착)여야 한다');
    }
   }
   // (3) 도착 전 공격·보호 행동 없음 — notJoined에 '이동 중'으로 기록된 인원은 contrib에 없다.
   for(const nj of ce.notJoined||[]){
    if(nj.reason==='이동 중(도착 전)') assert.ok(!contribOf(ce,nj.ref.side,nj.ref.slot),'미도착 인원은 기여 없음');
   }
  }
 }

 // (5) 동일 시드·입력 → 결정적 동일 결과(도착 게이트가 새 난수를 쓰지 않음을 재확인).
 {
  const build=()=>mkState(m=>{ m.A[0].region='top'; m.A[0].freeAt=1080-(regionTime('top','mid')-1); });
  const a=resolveTeamfight(build(),9,true,0.3,1080,seedRng('d022-det'));
  const b=resolveTeamfight(build(),9,true,0.3,1080,seedRng('d022-det'));
  assert.equal(JSON.stringify(a),JSON.stringify(b),'도착 게이트 포함 결과도 결정적이다');
 }
}

// --- 9b. F12: 감독 지시(딜러 보호/위험 감수 진입)의 resolveTeamfight 반영 ---
{
 const seedRng=tag=>random(hash(tag));
 const N=600;
 const runMany=directorBonus=>{
  let aWin=0,bWin=0,noEngage=0,tfN=0,bWinLossN=0,adcSurvWhenLost=0;
  for(let s=0;s<N;s++){
   const st=mkState();
   const ce=resolveTeamfight(st,5,false,0.6,1080,seedRng('f12b-'+s),undefined,directorBonus); // edgeA=false·margin 0.6 → B가 우세한 쪽
   tfN++;
   if(ce.fight.result==='NO_ENGAGE'){noEngage++;continue;}
   if(ce.fight.winner==='A')aWin++; else if(ce.fight.winner==='B'){
    bWin++; bWinLossN++;
    const adc=ce.fight.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===3);
    if(adc&&adc.survived)adcSurvWhenLost++;
   }
  }
  return {aWin,bWin,noEngage,tfN,bWinLossN,adcSurvWhenLost};
 };
 const base=runMany(undefined);

 // (1) directorBonus 없음(undefined)은 기존 호출과 완전히 동일한 경로 — 결정성 재확인(회귀 없음 보장).
 {
  const a=resolveTeamfight(mkState(),5,true,0.3,1080,seedRng('f12-det'));
  const b=resolveTeamfight(mkState(),5,true,0.3,1080,seedRng('f12-det'),undefined,undefined);
  assert.equal(JSON.stringify(a),JSON.stringify(b),'directorBonus 없음/undefined 경로 결과 동일');
 }
 // (2) 딜러 보호(protect): mkState의 기본 픽(실존하지 않는 id)은 조합 프로필이 0이라 protectA/B 기저값이
 //     0이다 — directorBonus.protect만큼 순수하게 오른다. A가 지는 한타에서 A ADC 생존율이 뚜렷이 오른다.
 {
  const withProtect=runMany({protect:0.08,favor:0,engage:0});
  const baseRate=base.adcSurvWhenLost/base.bWinLossN, protRate=withProtect.adcSurvWhenLost/withProtect.bWinLossN;
  assert.ok(protRate>baseRate*1.1,`딜러 보호 지시 → A ADC 생존율(진 한타 한정) 상승: ${(baseRate*100).toFixed(1)}% → ${(protRate*100).toFixed(1)}%`);
  // 승패 자체는 흔들지 않는다(그게 이 지시의 대가) — 승수 비율이 base와 크게 다르지 않아야 한다.
  assert.ok(Math.abs(withProtect.aWin-base.aWin)<=Math.round(N*0.06),'딜러 보호는 승패 분포를 크게 바꾸지 않는다');
 }
 // (3) 위험 감수 진입(engage/favor): 무교전이 줄고, A쪽으로 승수가 유의미하게 이동한다(부호·존재 확인 —
 //     실제 상수 크기는 game.ts의 DIRECTOR_* 튜닝값을 쓰는 통계적 검증을 별도 스크래치 스크립트로 이미 확인함).
 {
  const withAllin=runMany({protect:0,favor:0.4,engage:0.5}); // 메커니즘 존재를 크게 드러내려 과장된 값 사용(실제 튜닝값 아님)
  assert.ok(withAllin.noEngage<base.noEngage,`위험 감수 진입 → 무교전 감소: ${base.noEngage}/${N} → ${withAllin.noEngage}/${N}`);
  assert.ok(withAllin.aWin>base.aWin,`위험 감수 진입(A측 편향) → A 승수 증가: ${base.aWin} → ${withAllin.aWin}`);
 }
}

// --- 9c. F18 Phase B: 성향(temperament)이 결정 게이트(합류할지)에만 영향 — 처치·오브 확보 확률에는 안 닿는다 ---
{
 const seedRng=tag=>random(hash(tag));
 const S70=()=>Array(6).fill(70);
 const mkTempState=(temperFn)=>newMatchState(
  ROLES.map(r=>({stats:S70(),name:'A_'+r,role:r})),
  ROLES.map(r=>({stats:S70(),name:'B_'+r,role:r})),
  ['p0','p1','p2','p3','p4'],['q0','q1','q2','q3','q4'],
  ()=>0,()=>false,temperFn);
 const NEUTRAL=()=>({engage:0,resource:0,info:0,call:0});
 const withEngage=(side,slot,v)=>(s,sl)=>s===side&&sl===slot?{engage:v,resource:0,info:0,call:0}:NEUTRAL();
 const withResource=(side,slot,v)=>(s,sl)=>s===side&&sl===slot?{engage:0,resource:v,info:0,call:0}:NEUTRAL();

 // (1) 교전 성향(engage) — A 정글러(slot1)의 갱킹 합류율이 신중↔과감에 따라 유의미하게, 단조적으로 갈린다.
 {
  const N=1500;
  const commitRate=engageVal=>{let c=0;for(let s=0;s<N;s++){const st=mkTempState(withEngage('A',1,engageVal));const ce=resolveGank(st,0,0,true,0.3,150,seedRng('f18-gank-'+engageVal+'-'+s));if(ce.committed)c++;}return c/N;};
  const cautious=commitRate(-1), neutral=commitRate(0), bold=commitRate(1);
  assert.ok(bold>neutral+0.03,`과감(+1)이 균형(0)보다 합류율 높음: ${(bold*100).toFixed(1)}% > ${(neutral*100).toFixed(1)}%`);
  assert.ok(neutral>cautious+0.03,`균형(0)이 신중(-1)보다 합류율 높음: ${(neutral*100).toFixed(1)}% > ${(cautious*100).toFixed(1)}%`);
 }
 // (2) 성향=0(균형)은 기존(성향 도입 전) 공식과 수학적으로 동일 — mkState(temperamentFn 생략) 기반의
 //     기존 10j~10l 등 섹션이 전부 그대로 통과한다는 사실 자체가 이미 회귀 없음의 직접 증거(가산항이 0).
 // (3) 자원 우선순위(resource) — A 서포터(slot4, 전령 로밍 조건 슬롯)의 오브젝트 합류율이 성장↔합류에 따라 갈린다.
 {
  const N=1500;
  const joinRate=resourceVal=>{let j=0;for(let s=0;s<N;s++){const st=mkTempState(withResource('A',4,resourceVal));const ce=resolveObjective(st,3,'herald',true,0.3,660,seedRng('f18-obj-'+resourceVal+'-'+s));if(ce.participants.some(p=>p.side==='A'&&p.slot===4))j++;}return j/N;};
  const growth=joinRate(-1), neutral=joinRate(0), regroup=joinRate(1);
  assert.ok(regroup>neutral+0.03,`합류형(+1)이 균형(0)보다 오브 합류율 높음: ${(regroup*100).toFixed(1)}% > ${(neutral*100).toFixed(1)}%`);
  assert.ok(neutral>growth+0.03,`균형(0)이 성장형(-1)보다 오브 합류율 높음: ${(neutral*100).toFixed(1)}% > ${(growth*100).toFixed(1)}%`);
 }
 // (4) 성향이 처치 확률(killP) 자체엔 닿지 않는다 — 같은 committed 상태끼리 비교하면 처치율이 성향과 무관해야 한다
 //     (능력치와 같은 확률식에 중복 가산하지 않는다는 설계 원칙의 직접 검증).
 {
  const N=2000;
  const killRateGivenCommit=engageVal=>{let committed=0,kills=0;for(let s=0;s<N;s++){const st=mkTempState(withEngage('A',1,engageVal));const ce=resolveGank(st,0,0,true,0.6,150,seedRng('f18-killp-'+engageVal+'-'+s));if(ce.committed){committed++;if(ce.kills.length)kills++;}}return committed?kills/committed:0;};
  const kCautious=killRateGivenCommit(-1), kBold=killRateGivenCommit(1);
  assert.ok(Math.abs(kCautious-kBold)<0.05,`합류가 실제로 성사된 경우끼리는 처치율이 성향과 거의 무관(중복 가산 없음): 신중 ${(kCautious*100).toFixed(1)}% vs 과감 ${(kBold*100).toFixed(1)}%`);
 }
 // (5) 결정성: 같은 시드 + 같은 성향 → 같은 결과.
 {
  const st1=mkTempState(withEngage('A',1,0.7)), st2=mkTempState(withEngage('A',1,0.7));
  const a=resolveGank(st1,0,0,true,0.3,150,seedRng('f18-det')), b=resolveGank(st2,0,0,true,0.3,150,seedRng('f18-det'));
  assert.equal(JSON.stringify(a),JSON.stringify(b),'같은 시드·같은 성향 → 결정적 동일 결과');
 }
}

// --- 10. 단위 5: 공성(resolveSiege) — 구조물 진행 · 종료 · 이중 보상 방지 ---
{
 const seedRng=tag=>random(hash(tag));
 // 공격 상황 구성: 공격 팀 전원 생존, 수비 팀 3명 사망(리스폰 대기), 양 팀 river.
 const siegeState=(mut)=>{
  const st=mkState(s=>{
   s.clock=1200; s.region.A='river'; s.region.B='river';
   for(const sl of [0,1,2]){ s.B[sl].alive=false; s.B[sl].deaths++; s.B[sl].respawnAt=1230; } // 30초 뒤 복귀
   for(const c of [...s.A,...s.B]) c.gold=1500;
   mut&&mut(s);
  });
  return st;
 };

 // 10a. 정상 공성: 인원 우위 + 창(窓)이 있으면 라인 구조물 1~2개 철거, 자원 A로 쏠림.
 {
  const st=siegeState();
  const ce=resolveSiege(st,20,st.clock,seedRng('s10a'));
  assert.equal(ce.kind,'siege');
  assert.ok(['SIEGE','INHIB','HELD','NO_WINDOW'].includes(ce.siege.result));
  if(ce.siege.structuresDown>0){
   assert.equal(ce.siege.side,'A','공격자는 인원 우위 팀');
   assert.ok(ce.resource.reduce((a,v)=>a+v,0)>0,'철거 자원은 공격 팀으로');
   assert.ok(st.struct.B.reduce((a,v)=>a+v,0)===ce.siege.structuresDown || ce.siege.result==='INHIB','구조물 카운터가 철거 수와 일치');
  }
  assert.ok(st.clock>1200,'경기 시계가 진행된다(이동+공성 시간)');
 }

 // 10b. 상대 부활로 공성 중단: 수비 부활이 임박하면 NO_WINDOW, 구조물 변화 없음.
 {
  const st=siegeState(s=>{ for(const sl of [0,1,2]) s.B[sl].respawnAt=1205; }); // 5초 뒤 복귀 → 이동 시간에 못 미침
  const before=[...st.struct.B];
  const ce=resolveSiege(st,20,st.clock,seedRng('s10b'));
  assert.equal(ce.siege.result,'NO_WINDOW');
  assert.equal(ce.siege.structuresDown,0);
  assert.deepEqual(st.struct.B,before,'NO_WINDOW면 구조물 불변');
  assert.deepEqual(ce.resource,[0,0,0,0,0],'NO_WINDOW면 자원 이동 없음');
 }

 // 10c. 한타 승리만으로 자동 철거하지 않는다: 인원 우위 없으면(양 팀 생존) 공격자 없음 → RESET.
 {
  const st=mkState(s=>{ s.clock=1200; s.region.A='mid'; s.region.B='mid'; });
  const ce=resolveSiege(st,20,st.clock,seedRng('s10c'));
  assert.equal(ce.siege.result,'RESET');
  assert.equal(ce.siege.structuresDown,0);
  assert.deepEqual(st.struct.A,[0,0,0]); assert.deepEqual(st.struct.B,[0,0,0]);
 }

 // 10d. ADC 생존이 공성 기여: 여력이 경계 근처(수비 인원차 작음)일 때, A-ADC(CAR↑) 생존이면 죽어 있을 때보다 철거가 많다.
 //      보호 성공 → ADC 생존 → 공성 기여의 경로. 보호 자체엔 별도 보너스 없음(생존한 아이콘이 실제로 여력을 더할 뿐).
 {
  const marg=(adcAlive)=>mkState(s=>{
   s.clock=1200; s.region.A='river'; s.region.B='river';
   s.B[0].alive=false; s.B[0].deaths++; s.B[0].respawnAt=1218;   // 1명만, 곧 복귀(창이 좁음)
   for(const c of [...s.A,...s.B]) c.gold=1500;
   s.A[3].stats[5]=95;                                            // 살아남으면 철거를 크게 당기는 원딜
   if(!adcAlive){ s.A[3].alive=false; s.A[3].deaths++; s.A[3].respawnAt=99999; }
  });
  let dAlive=0, dDead=0, n=400;
  for(let i=0;i<n;i++){
   dAlive+=resolveSiege(marg(true), 20,1200,seedRng('s10d-a-'+i)).siege.structuresDown;
   dDead +=resolveSiege(marg(false),20,1200,seedRng('s10d-d-'+i)).siege.structuresDown;
  }
  assert.ok(dAlive/n > dDead/n + 0.15, `살아남은 ADC가 공성에 기여: ${(dAlive/n).toFixed(2)} vs ${(dDead/n).toFixed(2)}`);
 }

 // 10e. 이어서 공격 + 파괴 순서 + 라인 독립성: 두 번 공성해도 s3는 단조 증가, 3 초과 없음, 다른 라인 불변.
 {
  const st=siegeState(s=>{ for(const c of s.A) c.gold=3200; s.lanePush.A=[1.4,1.4,1.4]; });
  const c1=resolveSiege(st,20,st.clock,seedRng('s10e-1'));
  const mid1=[...st.struct.B];
  // 수비 다시 사망시키고(다음 한타 후) 이어서 공성
  for(const sl of [0,1,2]){ st.B[sl].alive=false; st.B[sl].respawnAt=st.clock+30; }
  st.region.A='river';
  const c2=resolveSiege(st,22,st.clock,seedRng('s10e-2'));
  for(let L=0;L<3;L++){
   assert.ok(st.struct.B[L]>=mid1[L],`라인 ${L} 진행도 단조 증가`);
   assert.ok(st.struct.B[L]<=3,`라인 ${L} 진행도 3 초과 없음`);
  }
  // 공성이 한 라인만 겨냥했으면 나머지 라인은 c1 시점 값 유지(또는 그 이상은 c2가 같은 라인일 때만)
  const touched=[c1.siege.lane,c2.siege.lane].filter(x=>x>=0);
  for(let L=0;L<3;L++) if(!touched.includes(L)) assert.equal(st.struct.B[L],0,`건드리지 않은 라인 ${L}은 그대로`);
 }

 // 10f. 실제 넥서스 파괴로만 정상 종료: 억제기 열림 + 넥서스 포탑 0 + 큰 여력 + 수비 소수 → NEXUS.
 {
  const st=mkState(s=>{
   s.clock=1800; s.region.A='mid'; s.region.B='base';
   s.struct.B=[3,2,1]; s.baseTurrets.B=0; s.lanePush.A=[1.6,1.6,1.6];
   for(const c of [...s.A,...s.B]) c.gold=3000;
   for(const c of s.A) c.gold=7000;
   for(const sl of [0,1,2,3]){ s.B[sl].alive=false; s.B[sl].deaths++; s.B[sl].respawnAt=1860; } // 4명 사망, SUP만 생존
  });
  const ce=resolveSiege(st,24,st.clock,seedRng('s10f'));
  assert.equal(ce.siege.result,'NEXUS');
  assert.equal(ce.siege.nexus,true);
  assert.equal(st.nexus.B,true,'B 넥서스 파괴 기록');
 }
 // 10g. 억제기가 안 열렸으면 넥서스로 못 간다(자동 연쇄 금지).
 {
  const st=siegeState(s=>{ s.struct.B=[2,2,2]; s.baseTurrets.B=2; for(const c of s.A) c.gold=6000; s.lanePush.A=[1.6,1.6,1.6]; });
  const ce=resolveSiege(st,24,st.clock,seedRng('s10g'));
  assert.equal(ce.siege.nexus,false,'억제기 없이 넥서스 불가');
  assert.equal(st.nexus.B,false);
 }

 // 10h. 결정성: 같은 신규 상태 + 같은 crng 시드 → 동일 결과.
 {
  const x=resolveSiege(siegeState(),20,1200,seedRng('s10h'));
  const y=resolveSiege(siegeState(),20,1200,seedRng('s10h'));
  assert.equal(JSON.stringify(x),JSON.stringify(y));
 }

 // 10i. simulateSet 통합: 정상 종료(NEXUS)와 상한 종료(CAP_TIME/CAP_EVENT)가 명시적으로 구분되고 capDiag가 채워진다.
 {
  let nexus=0,cap=0,capTime=0,capEvent=0,coin=0;
  for(let s=0;s<400;s++){
   const g=upgradeGame(newGame('nva',s));
   const r=simulateSet(g,{id:'s10i'+s,a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'R1'});
   assert.ok(['NEXUS','CAP_TIME','CAP_EVENT'].includes(r.endReason),'명시적 종료 사유');
   if(r.endReason==='NEXUS'){
    nexus++;
    const nx=r.events.find(e=>e.combat?.kind==='siege'&&e.combat.siege.nexus);
    assert.ok(nx,'NEXUS 종료엔 실제 넥서스 파괴 공성 사건이 있다');
    assert.ok(!r.events.some(e=>e.phase==='종료'),'정상 종료엔 상한 사건이 없다');
    assert.ok(!r.capDiag,'NEXUS 종료엔 capDiag 없음');
   }else{
    cap++; if(r.endReason==='CAP_TIME')capTime++; else capEvent++;
    assert.ok(!r.events.some(e=>e.combat?.kind==='siege'&&e.combat.siege.nexus),'CAP 종료엔 넥서스 파괴가 없다');
    assert.ok(r.events.some(e=>e.phase==='종료'),'CAP 종료엔 상한 판정 사건이 있다');
    assert.ok(!r.events.at(-1).detail.includes('넥서스를 파괴'),'CAP 중계는 넥서스 파괴를 말하지 않는다');
    // capDiag 계약
    const cd=r.capDiag;
    assert.ok(cd,'CAP 종료엔 capDiag가 채워진다');
    assert.equal(cd.reason,r.endReason==='CAP_TIME'?'TIME':'EVENT','capDiag.reason이 endReason과 일치');
    assert.ok(['struct','pressure','advantage','coin'].includes(cd.tiebreakStage),'tiebreak 단계 명시');
    assert.ok(Array.isArray(cd.structDealt)&&cd.structDealt.length===2,'구조물 피해 [A,B] 집계');
    // 판정이 tiebreakStage와 실제로 일치하는지(동전이 아니면 결정적 근거가 있어야)
    if(cd.tiebreakStage==='struct') assert.notEqual(cd.structDealt[0],cd.structDealt[1],'struct 단계면 구조물 피해가 다르다');
    if(cd.tiebreakStage==='coin'){ coin++; assert.equal(cd.structDealt[0],cd.structDealt[1],'coin 단계면 구조물 피해 동률'); }
   }
   assert.ok(r.events.filter(e=>e.combat?.kind==='siege'&&e.combat.siege.nexus).length<=1,'세트당 넥서스 1회');
  }
  assert.ok(nexus>0,'정상(NEXUS) 종료 사례 존재');
  // 시간/사건 상한 분리 기록(현 상수에서 CAP는 사실상 전부 EVENT — 시간 상한은 안전망). 값은 진단용, 강제하지 않음.
  console.log(`  · 10i: NEXUS ${nexus} · CAP ${cap} (TIME ${capTime} / EVENT ${capEvent}, 동전 판정 ${coin})`);
 }

 // 10j. 회귀(D017): 구조물에서 뒤진 팀도 유리한 교전을 이기면 구조물을 철거할 수 있다.
 //      "구조물 열세 = 견제만" 하드 게이트를 제거했으므로, 생존 인원차·창(窓)만 있으면 열세팀도 철거한다.
 {
  const behindWin=()=>mkState(s=>{
   s.clock=1500; s.region.A='river'; s.region.B='base';
   // A는 구조물에서 크게 뒤진다: B가 A 구조물을 많이 철거함(struct.A 높음), A는 B에 손도 못 댐(struct.B=0).
   s.struct.A=[3,2,2]; s.baseTurrets.A=1; s.struct.B=[0,0,0];
   // 그런데 방금 유리한 교전을 이겨 A 4명 생존 · B 4명 사망(리스폰 대기).
   for(const sl of [0,1,2,3]){ s.B[sl].alive=false; s.B[sl].deaths++; s.B[sl].respawnAt=1550; }
   for(const c of [...s.A,...s.B]) c.gold=1500;
  });
  let down=0,n=200;
  for(let i=0;i<n;i++) down+=resolveSiege(behindWin(),30,1500,seedRng('s10j-'+i)).siege.structuresDown;
  assert.ok(down/n>=0.8,`구조물 열세팀도 교전 승리 후 철거한다: 평균 ${(down/n).toFixed(2)}개/공성`);
  // 대조: 같은 구조물 열세 + 인원차/창 없음(양 팀 생존) → 공격자 자격 없음 → RESET(철거 0). 열세 자체가 원인이 아님을 보인다.
  const behindEven=()=>mkState(s=>{
   s.clock=1500; s.region.A='river'; s.region.B='river';
   s.struct.A=[3,2,2]; s.baseTurrets.A=1; s.struct.B=[0,0,0];
   for(const c of [...s.A,...s.B]) c.gold=1500;
  });
  const rc=resolveSiege(behindEven(),30,1500,seedRng('s10j-even'));
  assert.equal(rc.siege.structuresDown,0,'인원차·창이 없으면 (열세든 아니든) 철거 없음');
  assert.equal(rc.siege.result,'RESET');
 }

 // 10k. 통제 실험: 동일한 공성 직전 상태에서 죽은 A 슬롯만 ADC↔TOP로 바꾼다(생존 인원차·창·자원 전부 동일).
 //      두 팔 모두 A 4인 : B 3인(numAdv=1), B 2명 리스폰 대기. 차이는 '살아남은 게 CAR↑ 원딜이냐'뿐 → 순수 adcSiege 채널.
 {
  const arm=(deadSlot)=>mkState(s=>{           // deadSlot: 3=ADC 사망(TOP 생존) / 0=TOP 사망(ADC 생존)
   s.clock=1400; s.region.A='river'; s.region.B='river';
   s.B[0].alive=false; s.B[0].deaths++; s.B[0].respawnAt=1428;   // 수비 2명 사망(창 확보)
   s.B[1].alive=false; s.B[1].deaths++; s.B[1].respawnAt=1432;
   // 자원 통제: 생존 인원 합 골드가 양 팀 동일하도록(A 4인 1500 = B 3인 2000) → goldGap 항 ≈ 0.
   for(const c of s.A) c.gold=1500; for(const c of s.B) c.gold=2000;
   s.A[3].stats[5]=92;                                           // CAR 높은 원딜
   s.A[deadSlot].alive=false; s.A[deadSlot].deaths++; s.A[deadSlot].respawnAt=99999;
  });
  let adcDead=0,topDead=0,n=500;
  for(let i=0;i<n;i++){
   adcDead+=resolveSiege(arm(3),40,1400,seedRng('k-d-'+i)).siege.structuresDown; // ADC 사망
   topDead+=resolveSiege(arm(0),40,1400,seedRng('k-c-'+i)).siege.structuresDown; // TOP 사망(ADC 생존) — 인원차 동일
  }
  // 인원차·창·자원 완전 통제 후에도, 살아남은 게 CAR↑ 원딜이면 철거가 더 많다(순수 adcSiege 채널).
  assert.ok(topDead/n > adcDead/n + 0.2, `공성 직전 상태 동일, ADC 생존만 다름 → 철거: ADC생존 ${(topDead/n).toFixed(2)} > ADC사망 ${(adcDead/n).toFixed(2)}`);
  console.log(`  · 10k: 철거/공성 [A4:B3, 죽은 슬롯만 ADC↔TOP] — ADC사망 ${(adcDead/n).toFixed(2)} vs ADC생존 ${(topDead/n).toFixed(2)}`);
 }

 // 10l. F09: 통제 실험 — 10k와 동일한 공성 직전 상태(인원차·창·자원 전부 동일), 웨이브 유무만 바꾼다.
 //      "포탑을 때릴 조건에 아군 웨이브를 포함한다"(F09 완료 조건)를 직접 증명한다.
 //      대상 라인이 매번 확률적으로 정해질 수 있어(라인 압박 동률 시 crng() 미세값으로 결정) 세 라인
 //      전부에 웨이브를 둔다 — 그래야 어느 라인이 뽑혀도 같은 조건으로 비교된다.
 {
  const armW=(waveVal)=>mkState(s=>{
   s.clock=1400; s.region.A='river'; s.region.B='river';
   s.B[0].alive=false; s.B[0].deaths++; s.B[0].respawnAt=1428;
   s.B[1].alive=false; s.B[1].deaths++; s.B[1].respawnAt=1432;
   for(const c of s.A) c.gold=1500; for(const c of s.B) c.gold=2000;
   s.wave.A=[waveVal,waveVal,waveVal];
  });
  // 주 증거: capacity(공성 여력) 자체가 정확히 설계한 만큼(0.4·웨이브) 커진다 — 결정적, N 반복 불필요.
  const r0=resolveSiege(armW(0),40,1400,seedRng('w-cap-probe')),r1=resolveSiege(armW(4),40,1400,seedRng('w-cap-probe'));
  assert.ok(Math.abs((r1.siege.capacity-r0.siege.capacity)-1.6)<0.05,
   `웨이브 0→4는 capacity를 정확히 0.4×4=1.6 올린다: ${r0.siege.capacity} → ${r1.siege.capacity}`);
  // 실전 증거: structuresDown은 사건당 최대 2로 캡돼 있어(구조물 진행 규칙) 여력이 이미 충분히 큰
  // 상태에서는 웨이브 유무 차이가 가려진다 — 그래서 이 통제 상태는 캡에 걸릴 만큼 여력이 크다(10k와
  // 같은 세팅). 캡에 안 걸리는 낮은 여력 구간에서의 효과는 위 capacity 직접 비교가 이미 증명했다.
  console.log(`  · 10l: 웨이브 0→4 capacity ${r0.siege.capacity} → ${r1.siege.capacity} (structuresDown은 사건당 상한 2로 이미 포화: ${r0.siege.structuresDown}/${r1.siege.structuresDown})`);
  // 공성에 쓴 웨이브는 소모된다(무제한 재사용 방지) — 실제로 선택된 라인에서 확인.
  const stC=armW(4);
  const used=resolveSiege(stC,40,1400,seedRng('w-consume'));
  if(used.siege.lane>=0)assert.ok(stC.wave.A[used.siege.lane]<1.5,'공성에 쓴 웨이브는 소모된다');
 }

 // 10m. F09: 라인전 승자 쪽에 웨이브가 쌓이고 패자 쪽은 흩어진다(resolveGank/resolveBotLane).
 {
  const stG=mkState(s=>{s.clock=150;});
  const before=stG.wave.A[0];
  resolveGank(stG,0,0,true,0.6,150,seedRng('wave-gank')); // A가 탑에서 확실히 유리(margin 0.6)
  assert.ok(stG.wave.A[0]>before,`탑 라인전 승리 팀(A) 웨이브 증가: ${before} → ${stG.wave.A[0]}`);
  const stB=mkState(s=>{s.clock=498;});
  const beforeB=stB.wave.B[2];
  resolveBotLane(stB,2,false,0.6,498,seedRng('wave-bot')); // B가 바텀에서 확실히 유리
  assert.ok(stB.wave.B[2]>beforeB,`바텀 라인전 승리 팀(B) 웨이브 증가: ${beforeB} → ${stB.wave.B[2]}`);
 }
}

// --- 11. 단위 6: POG를 실제 개인 기여로 계산 ---
// 재추첨·재계산 없이 사건(combat) 원자료만 합산한다. POG = 승리 팀 최댓값 슬롯. 이유 문자열은 실제 사건과 일치한다.
{
 // 승리 팀 라인업에서 POG 슬롯을 찾는다.
 const pogSlot=r=>(r.winner===REAL.a?r.lineupA:r.lineupB).indexOf(r.pog);
 // 사건 원자료에서 (side,slot)의 기여 태그를 독립적으로 다시 센다(엔진 가중치와 무관).
 const rawTally=(events,side,slot)=>{
  // '킬 관여' = 처치 + 어시스트, 모든 사건에서 cb.kills로만 센다(한타 contrib.kill로 다시 세지 않는다 — 이중가산 방지).
  let kills=0,assists=0,protects=0,objSec=0,siegeS=0,nexus=false;
  for(const e of events){const cb=e.combat;if(!cb)continue;
   for(const k of cb.kills){
    if(k.killer.side===side&&k.killer.slot===slot)kills++;
    for(const as of k.assists)if(as.side===side&&as.slot===slot)assists++;
   }
   if(cb.kind==='objective'&&cb.objective.secured===side)
    for(const p of cb.participants)if(p.side===side&&p.slot===slot)objSec++;
   if(cb.kind==='teamfight')for(const c of cb.fight.contrib)
    if(c.ref.side===side&&c.ref.slot===slot)protects+=c.protect;
   if(cb.kind==='siege'){
    if(cb.siege.structuresDown>0)for(const p of cb.participants)if(p.side===side&&p.slot===slot)siegeS+=cb.siege.structuresDown;
    if(cb.siege.nexus)for(const p of cb.participants)if(p.side===side&&p.slot===slot)nexus=true;
   }
  }
  return {kaTot:kills+assists,protects:Math.round(protects),objSec,siegeS,nexus};
 };

 // 11a. 결정성: 같은 게임·시드에서 pog·pogReason 불변.
 {
  g0.seed=91;
  const x=simulateSet(g0,REAL),y=simulateSet(g0,REAL);
  assert.equal(x.pog,y.pog,'pog 결정적');
  assert.equal(x.pogReason,y.pogReason,'pogReason 결정적');
  assert.ok(typeof x.pogReason==='string'&&x.pogReason.length>0,'pogReason 문자열');
 }

 // 11b. POG는 승리 팀 선발 5인 중 하나.
 // 11c. pogReason이 실제 사건과 일치: 역할 접두 + 각 항목의 숫자/태그가 원자료 재집계와 같다.
 {
  let checked=0,atLeastMedian=0;
  for(let s=0;s<250;s++){
   g0.seed=s;const r=simulateSet(g0,REAL);
   const wLineup=r.winner===REAL.a?r.lineupA:r.lineupB;
   assert.ok(wLineup.includes(r.pog),`POG는 승리 팀 선수 (seed ${s})`);
   const side=r.winner===REAL.a?'A':'B', slot=pogSlot(r);
   assert.ok(slot>=0&&slot<5,'POG 슬롯 유효');
   const parts=r.pogReason.split(' · ');
   assert.equal(parts[0],ROLES[slot],`pogReason 역할 접두가 POG 슬롯과 일치 (seed ${s}: ${r.pogReason})`);
   const t=rawTally(r.events,side,slot);
   for(const tok of parts.slice(1)){
    let m;
    if(m=tok.match(/^(\d+)킬 관여$/)) assert.equal(+m[1],t.kaTot,`킬 관여 수 일치 (seed ${s}: ${r.pogReason})`);
    else if(m=tok.match(/^한타 딜러 보호 (\d+)회$/)) assert.equal(+m[1],t.protects,`보호 횟수 일치 (seed ${s}: ${r.pogReason})`);
    else if(m=tok.match(/^오브젝트 (\d+)회 확보$/)) assert.equal(+m[1],t.objSec,`오브 확보 수 일치 (seed ${s}: ${r.pogReason})`);
    else if(m=tok.match(/^구조물 공성 (\d+)회$/)) assert.equal(+m[1],t.siegeS,`공성 수 일치 (seed ${s}: ${r.pogReason})`);
    else if(tok==='넥서스 파괴 가담') assert.ok(t.nexus,`넥서스 가담 사실 (seed ${s})`);
    else if(tok==='라인·운영 주도권') assert.ok(t.kaTot===0&&t.protects===0&&t.objSec===0&&t.siegeS===0&&!t.nexus,`전투 기여 없을 때만 라인 주도권 (seed ${s})`);
    else assert.fail(`알 수 없는 pogReason 항목: "${tok}" (seed ${s})`);
   }
   // 역할 고정 점수로 뽑히지 않는지: POG의 실제 사건 기여(킬 관여+보호+오브+공성+넥서스)를 승리 팀과 비교.
   // total엔 소량의 생존·지속압박(가상 damage) 채널이 있어 근접 동률 시 POG의 '하드 카운트'가 중앙값을
   // 살짝 밑돌 수 있다(400시드 측정: 중앙값 미만 4.5%, 최대 격차 3). per-seed는 격차 상한, 집계로 대부분 중앙값 이상.
   const inv=sl=>{const x=rawTally(r.events,side,sl);return x.kaTot+x.protects+x.objSec+x.siegeS+(x.nexus?1:0);};
   const involve=[0,1,2,3,4].map(inv).sort((a,b)=>a-b);
   assert.ok(inv(slot)>=involve[2]-3,`POG 사건 기여가 승리 팀 중앙값 −3 이내 (seed ${s}: ${inv(slot)} vs med ${involve[2]})`);
   if(inv(slot)>=involve[2])atLeastMedian++;
   checked++;
  }
  assert.ok(checked>=250,'11c 표본 확보');
  assert.ok(atLeastMedian/checked>=0.90,`POG가 승리 팀 기여 중앙값 이상인 세트 비율 ${(atLeastMedian/checked*100).toFixed(1)}% (>=90%)`);
 }

 // 11d. 역할 편향 없음: 통제 조합(전스탯 70·대칭 픽)에서 슬롯별 POG 분포가 한 역할로 쏠리지 않는다.
 {
  const g=controlledBase();
  const a=[],b=[];
  for(const role of ROLES){
   const pool=CHAMPIONS.filter(c=>c.role===role);
   let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}
   a.push(pair[0].id);b.push(pair[1].id);
  }
  const m={id:'p11d',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'C',draft:{picksA:a,picksB:b,bans:[],actions:[]}};
  const dist=[0,0,0,0,0];const N=600;
  for(let s=0;s<N;s++){g.seed=s;const r=simulateSet(g,m);dist[pogSlot(r)]++;}
  const frac=dist.map(x=>x/N);
  assert.ok(frac.every(f=>f>0.03),`모든 역할이 POG로 뽑힌다: ${frac.map(f=>(f*100).toFixed(1)+'%').join(' ')}`);
  assert.ok(Math.max(...frac)<0.5,`한 역할이 POG를 독식하지 않는다: ${frac.map(f=>(f*100).toFixed(1)+'%').join(' ')}`);
  console.log(`  · 11d: POG 슬롯 분포(TOP JGL MID ADC SUP) — ${frac.map(f=>(f*100).toFixed(1)+'%').join(' ')}`);
 }
}

console.log('PASS combat: determinism, kill/survival invariants, narration binding, ability→action linkage, bot 2v2 linkage, objective participants/secure/reward/carry, unit-3 unsecured-objective separation, resource sign, unit-4 teamfight contract, D022 이동↔전투 참여 단일 계약(직접 구성한 상태: 이전 교전 지연·처치 전 미도착·부활 후 이동 중·인원차 변화·한타→공성 위치 연속성, 필수 불변 조건 300건, 결정성), unit-5 siege (window/ADC-contrib/order/no-double-reward/nexus-only-end/cap-vs-nexus), unit-6 POG (real-contribution aggregation, reason↔events match, no role bias)');
