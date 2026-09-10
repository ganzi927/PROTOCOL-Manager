// 참여자 기반 전투 — ABIL-01 Phase 3 + 중계 상세 전투(같은 작업).
//
// 경기 스켈레톤(simulateSet의 9구간 승패 롤)은 그대로 둔다. 각 구간 "안에서" 실제 참여 선수,
// 처치·생존·후퇴, 개인 자원 변화를 결정적으로 계산한다. 전용 combat 난수(승부/골드/중계 난수와
// 분리)만 사용하므로 outcome 스트림 호출 순서·횟수는 바뀌지 않는다 → 재현성·기존 테스트 유지.
//
// 스킬·점멸·쿨다운·현상금은 모델링하지 않는다. 진입 / 포착 / 교환 / 생존 / 후퇴 수준의 추상 전투로
// 먼저 완결성을 확보한다. "점멸 소진" 같은 문구는 추상 탈출 자원의 표현일 뿐 상태로 관리하지 않는다.
//
// 이번 단위(1)에서 구현: 탑(라인 0)·미드(라인 1)의 2대1 갱킹. 바텀·오브젝트·한타는 다음 단위.

export type Side='A'|'B';
export const S_LNE=0,S_TF=1,S_OBJ=2,S_VIS=3,S_MEC=4,S_CAR=5;

export type Combatant={
 side:Side, slot:number, role:string, champ:string, player:string,
 stats:number[], mastery:number, off:boolean,
 alive:boolean, respawnAt:number,          // 초
 kills:number, deaths:number, assists:number,
 gold:number,                              // 개인 자원(세트 누적, 기준 0)
};
export type Ref={side:Side,slot:number};
export type KillRec={killer:Ref,victim:Ref,assists:Ref[],clock:number};

export type ObjectiveKind='herald'|'dragon';
export type TFResult='ONE_SIDED'|'DECISIVE'|'TRADE'|'NO_ENGAGE'|'NO_SHOW';
// 개인 기여(단위 6 POG 근거). damage는 가상 기여 점수이며 '실제 피해량'이 아니다(체력·피해 시스템 없음).
export type Contrib={ref:Ref, kill:number, engage:number, protect:number, damage:number, survived:boolean};
export type CombatEvent={
 seq:number, clock:number, kind:'gank'|'skirmish'|'objective'|'teamfight',
 lane:number|null, side:Side,               // 이 사건에서 이득을 본 팀(오브: 확보 팀 / 한타: 교전 승자, 없으면 유리 팀 — 기록용)
 committed:boolean,                         // 정글 합류(갱킹)
 followUp:boolean,                          // 같은 팀 정글러가 앞서 이미 합류했었다(연속 갱킹)
 spotted:boolean,                           // 수비가 정글 동선을 미리 확인(갱킹)
 participants:Ref[],
 kills:KillRec[], escaped:Ref[], noKill:boolean,
 firstBlood:boolean,
 resource:number[],                         // A 관점 슬롯별 골드 델타(이 사건, 단일 자원 경로)
 prior:number|null,                         // 이어지는 앞 사건 seq
 evidence:string[],                         // 중계가 그대로 인용할 사실
 objective?:{kind:ObjectiveKind, secured:Side|null, outcome:string}, // 오브전 전용
 fight?:{result:TFResult, winner:Side|null, aliveA:number, aliveB:number, contrib:Contrib[]}, // 한타 전용
 notJoined?:{ref:Ref,reason:string}[],      // 합류하지 못한 선수와 이유(오브·한타)
};

export type MatchState={
 A:Combatant[], B:Combatant[],
 firstKillDone:boolean,
 lastGankSeq:number|null,
 jglCommits:{A:number,B:number},           // 팀별 정글 합류 횟수(연속 갱킹 판정)
 pendingObjective:ObjectiveKind|null,      // 직전 오브가 미확보로 남았다(다음 사건에서 참조)
 events:CombatEvent[],
};

type StarterLike={stats:number[],name:string,role:string};

export function newMatchState(
 aStarters:StarterLike[], bStarters:StarterLike[],
 aPicks:string[], bPicks:string[],
 masteryFn:(side:Side,slot:number)=>number,
 offRoleFn:(side:Side,slot:number)=>boolean,
):MatchState{
 const mk=(side:Side,st:StarterLike[],picks:string[]):Combatant[]=>st.map((p,slot)=>({
  side,slot,role:p.role,champ:picks[slot]??'',player:p.name,stats:p.stats.slice(),
  mastery:masteryFn(side,slot),off:offRoleFn(side,slot),
  alive:true,respawnAt:0,kills:0,deaths:0,assists:0,gold:0,
 }));
 return {A:mk('A',aStarters,aPicks),B:mk('B',bStarters,bPicks),firstKillDone:false,lastGankSeq:null,jglCommits:{A:0,B:0},pendingObjective:null,events:[]};
}

const clamp01=(v:number)=>Math.min(1,Math.max(0,v));
// 유효 능력 = 기본 스탯 + 숙련(레벨당 +2) − 오프롤 페널티. game.ts의 OFFROLE_PEN(6)과 맞춘다.
const eff=(c:Combatant,k:number)=>c.stats[k]+c.mastery*2-(c.off?6:0);
const RESPAWN=(clock:number)=>10+Math.min(42,clock/60*1.5); // 초, 게임 시간에 따라 증가

// 죽은 선수 되살리기(다음 단위의 오브젝트/한타에서 사용). 이번 단위 라인 0·1에선 아무도 안 죽은 상태로 진입.
export function reviveByClock(st:MatchState,clock:number){
 for(const c of [...st.A,...st.B]) if(!c.alive && clock>=c.respawnAt){ c.alive=true; c.respawnAt=0; }
}

const KILL_G=300, ASSIST_G=150, CS_HEAVY=150, CS_LIGHT=110, DEATH_G=210;

// 2대1 갱킹(탑=0 / 미드=1). 스켈레톤이 넘긴 phaseWinner(wa: A가 이 구간 우위)와 margin(0~1)으로
// "어떻게" 이겼는지 결정한다: 킬 / 합류했으나 놓침 / 발각·무산 / 순수 라인 판정. 참여자·처치·자원은
// 능력에서 유도하며, 죽은 선수는 참여하지 않고 처치자는 유효한 적만 처치한다.
export function resolveGank(
 st:MatchState, seq:number, lane:0|1, wa:boolean, margin:number, clock:number, crng:()=>number,
):CombatEvent{
 reviveByClock(st,clock);
 const laneSlot=lane===0?0:2;
 const winSide:Side=wa?'A':'B', loseSide:Side=wa?'B':'A';
 const attLaner=st[winSide][laneSlot], attJgl=st[winSide][1], defLaner=st[loseSide][laneSlot];

 // 정글 합류 확률: 이니시 능력↑, margin↑일수록 크고, 공격 라이너가 이미 라인을 크게 이기면 갱킹 필요↓
 const laneEdge=(eff(attLaner,S_LNE)-eff(defLaner,S_LNE))/40;
 const commitP=clamp01(0.30+0.42*margin+(eff(attJgl,S_TF)-55)/120-Math.max(0,laneEdge)*0.22);
 const committed=attJgl.alive && crng()<commitP;
 const followUp=committed && st.jglCommits[winSide]>=1;
 if(committed) st.jglCommits[winSide]++;
 // 수비가 정글 동선을 읽었나 = 수비 시야
 const spotP=committed?clamp01(0.14+(eff(defLaner,S_VIS)-52)/110):0;
 const spotted=crng()<spotP;
 // 처치 확률: 공격측(합류 시 정글 이니시 + 라이너 수행) vs 수비(회피 + 탈출 여지)
 const atk=(committed&&!spotted?eff(attJgl,S_TF)*0.5:0)+eff(attLaner,S_MEC)*0.5+eff(attLaner,S_LNE)*0.2;
 const dfn=eff(defLaner,S_MEC)*0.55+eff(defLaner,S_VIS)*0.2+26; // 26 = 추상 탈출 여지
 const killP=clamp01(0.04+0.85*margin*(committed&&!spotted?1:0.22)+(atk-dfn)/70);
 const kill=defLaner.alive && crng()<killP;

 const res=[0,0,0,0,0, 0,0,0,0,0]; // [A0..A4, B0..B4]
 const add=(c:Combatant,g:number)=>{c.gold+=g; res[(c.side==='A'?0:5)+c.slot]+=g;};
 const kills:KillRec[]=[]; const escaped:Ref[]=[]; let firstBlood=false;
 const ev:string[]=[`${lane===0?'탑':'미드'} — ${attLaner.player}(${attLaner.champ}) vs ${defLaner.player}(${defLaner.champ})`];
 if(committed) ev.push(spotted?`정글 ${attJgl.player} 합류 시도, 수비가 시야로 확인`:`정글 ${attJgl.player} 합류`);

 if(kill){
  const dbl=margin>0.30 && crng()<0.32;
  defLaner.alive=false; defLaner.deaths++; defLaner.respawnAt=clock+RESPAWN(clock);
  attLaner.kills+=dbl?1:1;
  const carFin=1+(eff(attLaner,S_CAR)-50)/220;
  add(attLaner, KILL_G*carFin + CS_HEAVY);
  const assists:Ref[]=[];
  if(committed&&!spotted){ attJgl.assists++; add(attJgl, ASSIST_G); assists.push({side:winSide,slot:1}); }
  add(defLaner, -(DEATH_G + CS_HEAVY*0.5));
  kills.push({killer:{side:winSide,slot:laneSlot},victim:{side:loseSide,slot:laneSlot},assists,clock});
  if(!st.firstKillDone){ st.firstKillDone=true; firstBlood=true; }
  ev.push(`${defLaner.player}(${defLaner.champ}) 처치${dbl?' · 연속 처치':''} — ${attLaner.player} 골드 +${Math.round(KILL_G*carFin+CS_HEAVY)}`);
 }else if(committed&&!spotted){
  escaped.push({side:loseSide,slot:laneSlot});
  add(attLaner, CS_HEAVY);
  add(defLaner, -CS_LIGHT*0.4);
  ev.push(`${defLaner.player} 탈출 — 탈출기 소진, 귀환. ${attLaner.player} 라인 압박 이득`);
 }else if(spotted){
  add(attLaner, CS_LIGHT*0.35);   // 갱킹은 무산됐지만 라인 우위 팀이 파밍 유지
  add(defLaner, CS_LIGHT*0.12);
  escaped.push({side:loseSide,slot:laneSlot});
  ev.push(`${defLaner.player} 갱킹 회피, 안전하게 성장`);
 }else{
  const s=0.6+margin*1.5;
  add(attLaner, CS_HEAVY*s);
  add(defLaner, -CS_LIGHT*s*0.4);
  ev.push(`${attLaner.player} 라인 주도권 · CS/경험치 우위`);
 }
 // 정글 템포: 합류하지 않아도 승리 라인 근처 파밍/카정 이득 (기존 RES_JGL_CARRY 대체 — 단일 소스)
 if(!committed) add(attJgl, CS_LIGHT*(0.25+margin*0.45));

 const prior=st.lastGankSeq;
 if(committed) st.lastGankSeq=seq;
 const resource=[0,1,2,3,4].map(s=>res[s]-res[5+s]);
 const participants:Ref[]=[{side:winSide,slot:laneSlot}];
 if(committed) participants.push({side:winSide,slot:1});
 participants.push({side:loseSide,slot:laneSlot});

 const ce:CombatEvent={
  seq,clock,kind:committed?'gank':'skirmish',lane,side:winSide,committed,followUp,spotted,
  participants,kills,escaped,noKill:kills.length===0,firstBlood,resource,prior,evidence:ev,
 };
 st.events.push(ce);
 return ce;
}

// 바텀 2v2(+정글). ADC·SUP 중심. VIS(SUP)=시야·콜, TF(SUP)=피어/이니시, CAR·MEC(ADC)=딜, LNE(둘)=라인.
// 결과: ADC 처치 / SUP 보호 성공(딜러 생존) / SUP 희생 / 발각·후퇴 / 순수 라인.
// 죽은 선수 미참여, 처치자는 유효한 적, 어시스트는 실제 합류자만.
export function resolveBotLane(
 st:MatchState, seq:number, wa:boolean, margin:number, clock:number, crng:()=>number,
):CombatEvent{
 reviveByClock(st,clock);
 const winSide:Side=wa?'A':'B', loseSide:Side=wa?'B':'A';
 const wAdc=st[winSide][3], wSup=st[winSide][4], wJgl=st[winSide][1];
 const lAdc=st[loseSide][3], lSup=st[loseSide][4];

 const committed=wJgl.alive && crng()<clamp01(0.22+0.40*margin+(eff(wJgl,S_TF)-55)/135);
 const followUp=committed && st.jglCommits[winSide]>=1;
 if(committed) st.jglCommits[winSide]++;
 const spotted=committed && crng()<clamp01(0.12+(eff(lSup,S_VIS)-52)/120);

 const atk=eff(wAdc,S_MEC)*0.4+eff(wAdc,S_CAR)*0.25+eff(wSup,S_TF)*0.3+eff(wSup,S_VIS)*0.15
   +(committed&&!spotted?eff(wJgl,S_TF)*0.5:0);
 const peel=eff(lSup,S_TF)*0.45+eff(lSup,S_VIS)*0.25+eff(lAdc,S_MEC)*0.4+24;
 const killAdc=lAdc.alive && crng()<clamp01(0.05+0.78*margin*(committed&&!spotted?1:0.30)+(atk-peel)/72);
 const peeled=!killAdc && committed && !spotted && crng()<clamp01(0.32+(eff(lSup,S_TF)-55)/95);
 const killSup=lSup.alive && (killAdc ? (margin>0.28&&crng()<0.30) : (peeled&&crng()<0.35));

 const res=[0,0,0,0,0, 0,0,0,0,0];
 const add=(c:Combatant,g:number)=>{c.gold+=g; res[(c.side==='A'?0:5)+c.slot]+=g;};
 const kills:KillRec[]=[]; const escaped:Ref[]=[]; let firstBlood=false;
 const ev:string[]=[`바텀 — ${wAdc.player}·${wSup.player} vs ${lAdc.player}·${lSup.player}`];
 if(committed) ev.push(spotted?`정글 ${wJgl.player} 합류를 시야로 확인`:`정글 ${wJgl.player} 합류`);

 const registerKill=(victim:Combatant,primary:Combatant,assistList:Combatant[])=>{
  victim.alive=false; victim.deaths++; victim.respawnAt=clock+RESPAWN(clock); primary.kills++;
  const assists:Ref[]=[];
  for(const a of assistList){ if(a.alive&&a!==primary){ a.assists++; assists.push({side:a.side,slot:a.slot}); } }
  kills.push({killer:{side:primary.side,slot:primary.slot},victim:{side:victim.side,slot:victim.slot},assists,clock});
  if(!st.firstKillDone){ st.firstKillDone=true; firstBlood=true; }
 };

 if(killAdc){
  const carFin=1+(eff(wAdc,S_CAR)-50)/210;
  registerKill(lAdc, wAdc, [wSup, ...(committed&&!spotted?[wJgl]:[])]);
  add(wAdc, KILL_G*carFin + CS_HEAVY); add(wSup, ASSIST_G*0.8);
  if(committed&&!spotted) add(wJgl, ASSIST_G*0.7);
  add(lAdc, -(DEATH_G + CS_HEAVY*0.6));
  ev.push(`${lAdc.player}(${lAdc.champ}) 처치 — ${wAdc.player} 골드 +${Math.round(KILL_G*carFin+CS_HEAVY)}`);
  if(killSup){
   const finisher=wSup.alive?wSup:wAdc;
   registerKill(lSup, finisher, [wAdc]);
   add(finisher, KILL_G*0.5); add(lSup, -DEATH_G*0.8);
   ev.push(`${lSup.player}(${lSup.champ})까지 정리 — 바텀 붕괴`);
  }
 }else if(peeled){
  escaped.push({side:loseSide,slot:3});
  add(wAdc, CS_HEAVY*0.7); add(wSup, CS_LIGHT*0.3); add(lAdc, -CS_LIGHT*0.3);
  ev.push(`${lSup.player}의 보호로 ${lAdc.player} 생존, ${wAdc.player}는 라인·포탑 이득`);
  if(killSup){
   const finisher=committed&&!spotted&&wJgl.alive?wJgl:wAdc;
   registerKill(lSup, finisher, [wAdc,wSup]);
   add(finisher, KILL_G*0.55); add(lSup, -DEATH_G*0.8);
   ev.push(`${lSup.player}가 ${lAdc.player}를 살리고 대신 쓰러집니다`);
  }
 }else if(spotted){
  escaped.push({side:loseSide,slot:3},{side:loseSide,slot:4});
  add(wAdc, CS_LIGHT*0.32); add(lAdc, CS_LIGHT*0.14); // 무산됐지만 우위 팀이 파밍 유지
  ev.push(`${lSup.player}가 정글 동선을 콜, 바텀이 안전하게 빠집니다`);
 }else{
  const s=0.6+margin*1.5;
  add(wAdc, CS_HEAVY*s*0.9); add(wSup, CS_LIGHT*s*0.35); add(lAdc, -CS_LIGHT*s*0.35);
  ev.push(`${wAdc.player}·${wSup.player} 라인 주도권 · 포탑 압박`);
 }
 if(!committed) add(wJgl, CS_LIGHT*(0.25+margin*0.45)); // 정글 템포

 const prior=st.lastGankSeq; if(committed) st.lastGankSeq=seq;
 const resource=[0,1,2,3,4].map(s=>res[s]-res[5+s]);
 const participants:Ref[]=[
  {side:winSide,slot:3},{side:winSide,slot:4},
  ...(committed?[{side:winSide,slot:1} as Ref]:[]),
  {side:loseSide,slot:3},{side:loseSide,slot:4},
 ];
 const ce:CombatEvent={
  seq,clock,kind:committed?'gank':'skirmish',lane:2,side:winSide,committed,followUp,spotted,
  participants,kills,escaped,noKill:kills.length===0,firstBlood,resource,prior,evidence:ev,
 };
 st.events.push(ce);
 return ce;
}

// ── 오브젝트 교전(전령=herald / 드래곤=dragon) ──────────────────────────────────────────
// edgeA = 스켈레톤이 넘긴 '유리한 시작 조건'(확정 확보가 아님). 실제 확보 팀(secured)은 참여자
// 기반 결과로 결정한다 — 단일 경로. 미확보(secured=null)면 momentum·보상 없음, 목표는 남는다.
// 참여자: 전령 = 정글·탑·미드(+조건부 서포터), 드래곤 = 정글·미드·원딜·서포터(+조건부 탑).
// 죽어서 리스폰 대기 중인 선수는 제외하고 이유를 남긴다. 처치자·어시스트는 실제 참여자만.
const OBJ_TEAM_G=55, OBJ_SECURE_BONUS=80; // 확보 팀 5칸 팀 보상 + 확보 정글 추가(초기 튜닝값)

export function resolveObjective(
 st:MatchState, seq:number, kind:ObjectiveKind, edgeA:boolean, margin:number, clock:number, crng:()=>number,
):CombatEvent{
 reviveByClock(st,clock);
 const favSide:Side=edgeA?'A':'B', othSide:Side=edgeA?'B':'A';
 const opp=(s:Side):Side=>s==='A'?'B':'A';
 const baseSlots=kind==='herald'?[1,0,2]:[1,2,3,4];
 const condSlot=kind==='herald'?4:0; // 전령: 서포터 로밍 / 드래곤: 탑 로밍

 const select=(side:Side)=>{
  const joined:number[]=[]; const notJoined:{ref:Ref,reason:string}[]=[];
  const consider=(slot:number, base:number)=>{
   const c=st[side][slot];
   if(!c.alive){ notJoined.push({ref:{side,slot},reason:'전투 이탈(리스폰 대기)'}); return; }
   const laneGap=c.gold-st[opp(side)][slot].gold; // + = 이 슬롯이 우세
   let arriveP:number;
   if(slot===1) arriveP=0.99;              // 정글: 오브 주변, 거의 확정
   else if(slot===2) arriveP=0.9;           // 미드: 중앙, 대체로 합류
   else arriveP=clamp01(base+laneGap/900+(eff(c,S_TF)-55)/230);
   if(crng()<arriveP) joined.push(slot);
   else notJoined.push({ref:{side,slot},reason:laneGap<-150?'라인 처리':'도착 지연'});
  };
  for(const s of baseSlots) consider(s,0.9);
  consider(condSlot,0.42);
  return {joined,notJoined};
 };
 const fav=select(favSide), oth=select(othSide);

 const power=(side:Side, slots:number[])=>{
  let v=0, bestVis=0;
  for(const slot of slots){ const c=st[side][slot];
   v+=eff(c,S_OBJ)*(slot===1?0.9:0.5)+eff(c,S_TF)*0.35+eff(c,S_MEC)*0.22;
   bestVis=Math.max(bestVis,eff(c,S_VIS));
  }
  return v+bestVis*0.4+slots.length*4;
 };
 const favPow=power(favSide,fav.joined), othPow=power(othSide,oth.joined);

 const res=[0,0,0,0,0, 0,0,0,0,0];
 const add=(c:Combatant,g:number)=>{c.gold+=g; res[(c.side==='A'?0:5)+c.slot]+=g;};
 const kills:KillRec[]=[]; let firstBlood=false;
 const registerKill=(victim:Combatant, primary:Combatant, assistRefs:Ref[])=>{
  if(!victim.alive||!primary.alive||victim.side===primary.side)return;
  victim.alive=false; victim.deaths++; victim.respawnAt=clock+RESPAWN(clock); primary.kills++;
  const carFin=1+(eff(primary,S_CAR)-50)/230;
  add(primary, KILL_G*carFin); add(victim, -DEATH_G);
  const assists:Ref[]=[];
  for(const r of assistRefs){ const a=st[r.side][r.slot]; if(a&&a.alive&&a!==primary){ a.assists++; add(a,ASSIST_G*0.7); assists.push(r); } }
  kills.push({killer:{side:primary.side,slot:primary.slot},victim:{side:victim.side,slot:victim.slot},assists,clock});
  if(!st.firstKillDone){ st.firstKillDone=true; firstBlood=true; }
 };
 const objKor=kind==='herald'?'전령':'드래곤';
 const ev:string[]=[`${objKor} — ${favSide} ${fav.joined.length}인 vs ${othSide} ${oth.joined.length}인`];
 if(st.pendingObjective) ev.push(`앞선 ${st.pendingObjective==='herald'?'전령':'드래곤'} 교전은 무산됐던 상황`);

 let secured:Side|null, outcome:string;
 const fN=fav.joined.length, oN=oth.joined.length;
 if(fN<2 && oN<2){
  secured=null; outcome='CANCELLED';
  ev.push('양 팀 모두 합류 인원이 부족해 시도 취소');
 }else if(oN<2 || oN<fN-1){
  secured=favSide; outcome='SECURE_UNCONTESTED';
  ev.push(`${othSide} 측이 물러나 ${favSide} 측이 무교전 확보`);
 }else{
  // 유리 팀(전술 우위)이 오브 교전을 더 자주 이긴다. 참여자 오브 파워·인원차·margin이 그 위에 얹힌다.
  // 역확보(UPSET)는 상대가 교전을 실제로 이길 때만 — 강팀 은닉 약화가 아니라 경기 사건으로.
  const swing=(favPow-othPow)/30+margin*2+(fN-oN)*0.6;
  const favWins=crng()<clamp01(0.62+0.5*Math.tanh(swing));
  const traded=crng()<0.16;
  const skirmish=(atk:Side, aS:number[], def:Side, dS:number[])=>{
   const liveD=dS.filter(s=>st[def][s].alive), liveA=aS.filter(s=>st[atk][s].alive);
   if(!liveD.length||!liveA.length||crng()>=0.45) return;
   const killer=st[atk][liveA[Math.floor(crng()*liveA.length)]];
   const victim=st[def][liveD[Math.floor(crng()*liveD.length)]];
   registerKill(victim, killer, liveA.filter(s=>s!==killer.slot).slice(0,1).map(s=>({side:atk,slot:s})));
  };
  if(traded){
   secured=null; outcome='CONTESTED_NO_SECURE';
   skirmish(favSide,fav.joined,othSide,oth.joined);
   skirmish(othSide,oth.joined,favSide,fav.joined);
   ev.push('양 팀 교전 후 서로 물러나 목표 유지');
  }else if(favWins){
   secured=favSide; outcome='SECURE_AFTER_FIGHT';
   skirmish(favSide,fav.joined,othSide,oth.joined);
   if(margin>0.3) skirmish(favSide,fav.joined,othSide,oth.joined);
   ev.push(`${favSide} 측이 교전을 이기고 ${objKor} 확보`);
  }else{
   secured=othSide; outcome='UPSET_SECURE';
   skirmish(othSide,oth.joined,favSide,fav.joined);
   ev.push(`${othSide} 측이 교전을 뒤집고 ${objKor} 역확보`);
  }
 }

 // 오브젝트 보상: 확보 팀 5칸(불참 포함) + 확보 정글 추가. 미확보면 없음. 한 사건에 1회.
 // 처치·어시스트 보상(registerKill)은 위에서 이미 적용됨 — 미확보여도 유지, 오브 보상만 0.
 if(secured){
  const mult=kind==='herald'?0.75:1.0;
  for(let s=0;s<5;s++) add(st[secured][s], OBJ_TEAM_G*mult);
  if(st[secured][1].alive) add(st[secured][1], OBJ_SECURE_BONUS*mult*(1+(eff(st[secured][1],S_OBJ)-50)/260));
  if(st.pendingObjective===kind) st.pendingObjective=null; // 미확보로 남았던 '바로 그' 목표를 확보했을 때만 해제
 }else{
  // 이 목표가 미확보로 남는다. 재시도 = 이후 같은 kind 오브 사건(현 9구간 구조엔 없음).
  // 만료 = 세트 종료(MatchState 재생성). 한타 구간(i>=5)에선 아무도 읽지 않음. 다른 kind 확보로는 해제되지 않는다.
  st.pendingObjective=kind;
 }

 const resource=[0,1,2,3,4].map(s=>res[s]-res[5+s]);
 const participants:Ref[]=[
  ...fav.joined.map(s=>({side:favSide,slot:s} as Ref)),
  ...oth.joined.map(s=>({side:othSide,slot:s} as Ref)),
 ];
 const ce:CombatEvent={
  seq,clock,kind:'objective',lane:null,side:secured??favSide,
  committed:false,followUp:false,spotted:false,
  participants,kills,escaped:[],noKill:kills.length===0,firstBlood,
  resource,prior:null,evidence:ev,
  objective:{kind,secured,outcome},notJoined:[...fav.notJoined,...oth.notJoined],
 };
 st.events.push(ce);
 return ce;
}

// ── 5v5 한타 (중반·후반·마지막 진격·기지 결전) ─────────────────────────────────────────
// edgeA/margin = '교전 전 유리한 조건'(스켈레톤 확률 p에서 나온 값). 교전 승패는 여기서
// margin(=이미 p에 반영된 전력·자원·조합의 요약) + 실제 인원차(새 채널, 실제 사망 반영) + 소량 난수로
// 결정한다. 능력치는 '누가 죽고 누가 살고 누가 기여했는가'만 정한다(p에 든 전력을 다시 더하지 않음).
// 무승부·상호 후퇴·무교전·양측 전멸은 승리로 세지 않는다(winner=null → pressure·advantage 이동 없음).
const TF_KILL_G=280, TF_ASSIST_G=125, TF_DEATH_G=200;

export function resolveTeamfight(
 st:MatchState, seq:number, edgeA:boolean, margin:number, clock:number, crng:()=>number,
):CombatEvent{
 reviveByClock(st,clock);
 const favSide:Side=edgeA?'A':'B', othSide:Side=edgeA?'B':'A';
 const alive=(s:Side)=>[0,1,2,3,4].filter(sl=>st[s][sl].alive);
 const aA0=alive('A'), aB0=alive('B');
 const partRefs:Ref[]=[...aA0.map(sl=>({side:'A' as Side,slot:sl})),...aB0.map(sl=>({side:'B' as Side,slot:sl}))];
 const notJoined:{ref:Ref,reason:string}[]=[];
 for(const s of ['A','B'] as Side[]) for(let sl=0;sl<5;sl++) if(!st[s][sl].alive) notJoined.push({ref:{side:s,slot:sl},reason:'전투 이탈(리스폰 대기)'});
 const nFav=(favSide==='A'?aA0:aB0).length, nOth=(favSide==='A'?aB0:aA0).length;

 const res=[0,0,0,0,0, 0,0,0,0,0];
 const add=(c:Combatant,g:number)=>{c.gold+=g; res[(c.side==='A'?0:5)+c.slot]+=g;};
 const kills:KillRec[]=[]; let firstBlood=false;
 const contrib:Contrib[]=partRefs.map(r=>({ref:r,kill:0,engage:0,protect:0,damage:0,survived:true}));
 const cRec=(r:Ref)=>contrib.find(c=>c.ref.side===r.side&&c.ref.slot===r.slot);
 const registerKill=(victim:Combatant, primary:Combatant, assistList:Combatant[])=>{
  if(!victim.alive||!primary.alive||victim.side===primary.side)return;
  victim.alive=false; victim.deaths++; victim.respawnAt=clock+RESPAWN(clock); primary.kills++;
  add(primary, TF_KILL_G*(1+(eff(primary,S_CAR)-50)/240)); add(victim, -TF_DEATH_G);
  cRec({side:primary.side,slot:primary.slot})!.kill+=1;
  const vc=cRec({side:victim.side,slot:victim.slot}); if(vc)vc.survived=false;
  const assists:Ref[]=[];
  for(const a of assistList){ if(a.alive&&a!==primary&&a.side===primary.side){ a.assists++; add(a,TF_ASSIST_G); cRec({side:a.side,slot:a.slot})!.kill+=0.5; assists.push({side:a.side,slot:a.slot}); } }
  kills.push({killer:{side:primary.side,slot:primary.slot},victim:{side:victim.side,slot:victim.slot},assists,clock});
  if(!st.firstKillDone){ st.firstKillDone=true; firstBlood=true; }
 };

 const ev:string[]=[`한타 — ${favSide} ${nFav}인 vs ${othSide} ${nOth}인`];
 let result:TFResult, winner:Side|null;

 if(nFav===0&&nOth===0){ result='NO_SHOW'; winner=null; ev.push('양 팀 모두 인원이 없어 교전 불성립'); }
 else if(nFav===0){ result='ONE_SIDED'; winner=othSide; ev.push(`${favSide} 전원 이탈 — ${othSide}가 무혈 장악`); }
 else if(nOth===0){ result='ONE_SIDED'; winner=favSide; ev.push(`${othSide} 전원 이탈 — ${favSide}가 무혈 장악`); }
 else {
  const numAdvFav=(nFav-nOth)*0.16;                       // 실제 사망이 만든 인원차 — p에 없던 새 채널
  const engageP=clamp01(0.93+margin*0.05);               // 대부분 교전 성립. 무교전은 팽팽한 경기의 드문 예외
  if(crng()>=engageP){ result='NO_ENGAGE'; winner=null; ev.push('양 팀 대치만 하다 물러남 — 무교전'); }
  else {
   // 승패 = margin(이미 p에 반영된 전력·자원·조합의 요약) + 실제 인원차. 작은 margin도 pressure 경쟁에서 누적된다.
   const favWins=crng()<clamp01(0.5+margin*0.75+numAdvFav);
   const decisive=margin>0.16||Math.abs(nFav-nOth)>=2;
   const wSide:Side=favWins?favSide:othSide, lSide:Side=favWins?othSide:favSide;
   const trade=margin<0.05 && Math.abs(nFav-nOth)<2 && crng()<0.25; // 킬 교환·무승부는 정말 팽팽할 때만
   // 능력치는 '누가 죽나·누가 살리나'만 정한다(p에 든 전력을 다시 더하지 않음).
   //  - 표적 우선순위: 캐리(ADC>MID)가 먼저, 동순위는 MEC+VIS 낮은 쪽. 프런트(TOP·JGL)는 마지막.
   //  - SUP peel: 한타당 1회 판정. 성공하면 그 한타 내내 ADC를 표적에서 제외(보호 성공 → 딜러 생존·후속 행동).
   //  - 어시스트: 처치자 제외 생존 공격자 중 TF 가중 무작위로 최대 2명. 고정 정렬(동률→슬롯 순) 편향 제거.
   const rolePri:Record<number,number>={3:0,2:1,4:2,1:3,0:4};
   const doKills=(atk:Side, def:Side, n:number)=>{
    const dSup=st[def][4];
    let adcSafe=false;
    if(dSup.alive && st[def][3].alive && alive(def).length>1 &&
       crng()<clamp01(0.12+(eff(dSup,S_TF)+eff(dSup,S_VIS)-110)/150)){
     adcSafe=true; cRec({side:def,slot:4})!.protect+=1;
     ev.push(`${dSup.player}의 보호로 ${st[def][3].player} 생존`);
    }
    for(let x=0;x<n;x++){
     const ld=alive(def).filter(s=>!(adcSafe&&s===3));
     if(!ld.length)break;
     ld.sort((s1,s2)=>(rolePri[s1]-rolePri[s2])
      ||((eff(st[def][s1],S_MEC)+eff(st[def][s1],S_VIS))-(eff(st[def][s2],S_MEC)+eff(st[def][s2],S_VIS))));
     const victim=st[def][ld[0]];
     const la=alive(atk); if(!la.length)break;
     const killer=st[atk][la[Math.floor(crng()*la.length)]];
     const pool=la.filter(s=>s!==killer.slot);
     const asst:Combatant[]=[];
     for(let q=0;q<2 && pool.length;q++){
      const wts=pool.map(s=>Math.max(1,eff(st[atk][s],S_TF)-40));
      let roll=crng()*wts.reduce((p,c)=>p+c,0), pick=0;
      while(pick<wts.length-1 && (roll-=wts[pick])>0) pick++;
      asst.push(st[atk][pool[pick]]); pool.splice(pick,1);
     }
     for(const a of asst){ const c=cRec({side:atk,slot:a.slot}); if(c)c.engage+=0.5; }
     cRec({side:killer.side,slot:killer.slot})!.engage+=1;
     registerKill(victim,killer,asst);
    }
   };
   const wk=decisive?(2+(margin>0.4?1:0)+(crng()<0.4?1:0)):(1+(crng()<0.5?1:0));
   const lk=trade?(1+(crng()<0.35?1:0)):(decisive?0:(crng()<0.4?1:0));
   doKills(wSide,lSide,wk);
   if(lk)doKills(lSide,wSide,lk);
   const wkA=kills.filter(k=>k.killer.side===wSide).length, lkA=kills.filter(k=>k.killer.side===lSide).length;
   // 승패는 실제 처치 수로 확정한다. 사전 favWins는 '어느 쪽에 유리한가'까지만 —
   //  - 진 편이 더 많이 잡으면 사건이 사전 예측(favWins)을 뒤집는다.
   //  - 동수 처치: 정말 팽팽했으면(trade) 무승부, 아니면 교전 우위를 잡은 쪽(wSide)이 지역을 장악한다.
   //  - 처치가 아예 없으면(양쪽 0) 무승부.
   if(wkA>lkA){ result='DECISIVE'; winner=wSide; ev.push(`${wSide}가 ${wkA}:${lkA}로 교전 승리`); }
   else if(lkA>wkA){ result='DECISIVE'; winner=lSide; ev.push(`${lSide}가 ${lkA}:${wkA}로 교전을 뒤집었습니다`); }
   else if(trade || wkA===0){ result='TRADE'; winner=null; ev.push(`${wkA}:${lkA} 킬 교환 후 양 팀 후퇴 — 승패 없음`); }
   else { result='DECISIVE'; winner=wSide; ev.push(`${wSide}가 ${wkA}:${lkA} 교전 우위로 지역을 장악합니다`); }
  }
 }
 // 유효 공격 기여(가상 점수 — '실제 피해량' 아님)
 for(const c of contrib){
  const cm=st[c.ref.side][c.ref.slot];
  c.survived=cm.alive;
  c.damage=Math.round((eff(cm,S_CAR)*0.6+eff(cm,S_MEC)*0.4)/10 * (c.survived?1:0.55) * (c.kill>0?1.3:1));
 }
 const resource=[0,1,2,3,4].map(s=>res[s]-res[5+s]);
 const ce:CombatEvent={
  seq,clock,kind:'teamfight',lane:null,side:winner??favSide,
  committed:false,followUp:false,spotted:false,
  participants:partRefs,kills,escaped:[],noKill:kills.length===0,firstBlood,
  resource,prior:null,evidence:ev,notJoined,
  fight:{result,winner,aliveA:aA0.length,aliveB:aB0.length,contrib},
 };
 st.events.push(ce);
 return ce;
}
