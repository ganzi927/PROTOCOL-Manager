import {travelSeconds} from './arena.ts';
import {battlePlan} from '../balance/composition.ts';
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
 navNode?:string, // New simulations retain an actual arena node; old fixtures use region fallback.
 region:Region, freeAt:number,             // 이동↔전투 참여 단일 계약(D022): 마지막으로 확인된 위치 ·
                                            // 그 위치에서 이동을 시작할 수 있는 시각(직전 행동이 끝난 시각).
                                            // hasArrived()가 다음 사건 참여 자격을 이 값들로만 판정한다.
};
export type Ref={side:Side,slot:number};
export type KillRec={killer:Ref,victim:Ref,assists:Ref[],clock:number};

export type ObjectiveKind='herald'|'dragon';
export type TFResult='ONE_SIDED'|'DECISIVE'|'TRADE'|'NO_ENGAGE'|'NO_SHOW';
// 공성 결과: 구조물 철거 / 억제기 / 넥서스 파괴 / 부활 병력 도착으로 창(窓) 없음 / 수비가 막음 / 양 팀 정비.
export type SiegeResult='SIEGE'|'INHIB'|'NEXUS'|'NO_WINDOW'|'HELD'|'RESET';
// 개인 기여(단위 6 POG 근거). damage는 가상 기여 점수이며 '실제 피해량'이 아니다(체력·피해 시스템 없음).
export type Contrib={ref:Ref, kill:number, engage:number, protect:number, damage:number, survived:boolean};
export type CombatEvent={
 location?:string,
 movements?:{ref:Ref,from:string,to:string,depart:number,arrive:number}[],
 seq:number, clock:number, kind:'gank'|'skirmish'|'objective'|'teamfight'|'siege',
 lane:number|null, side:Side,               // 이 사건에서 이득을 본 팀(오브: 확보 팀 / 한타: 교전 승자, 없으면 유리 팀 — 기록용 / 공성: 공격 팀)
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
 strategy?:{a:string,b:string,preparation:number,entry:number,growth:number},
 fight?:{result:TFResult, winner:Side|null, aliveA:number, aliveB:number, contrib:Contrib[]}, // 한타 전용
 siege?:{result:SiegeResult, side:Side, lane:number, from:string,          // 공성 전용
  structuresDown:number, reinforceIn:number, capacity:number,
  structAfter:number[], baseTurretsAfter:number, nexus:boolean, targetBase?:boolean},
 notJoined?:{ref:Ref,reason:string}[],      // 합류하지 못한 선수와 이유(오브·한타)
};

export type Region='base'|'top'|'mid'|'bot'|'river';

export type MatchState={
 A:Combatant[], B:Combatant[],
 firstKillDone:boolean,
 lastGankSeq:number|null,
 jglCommits:{A:number,B:number},           // 팀별 정글 합류 횟수(연속 갱킹 판정)
 pendingObjective:ObjectiveKind|null,      // 직전 오브가 미확보로 남았다(다음 사건에서 참조)
 clock:number,                             // 경기 시계(초). 한타·공성이 실제로 진행시킨다(연출 재생 시각과 분리).
 struct:{A:number[], B:number[]},          // 공격받는 팀 기준 라인별 진행도 [탑,미드,바텀]: 0 온전 · 1 외곽 · 2 내곽 · 3 억제기 파괴
 baseTurrets:{A:number, B:number},         // 넥서스 쌍둥이 포탑 남은 수(2→0)
 nexus:{A:boolean, B:boolean},             // 넥서스 파괴 여부(정상 종료의 유일한 근거)
 lanePush:{A:number[], B:number[]},        // 추상 라인 압박(공격 팀 관점, 라인별 −1~+1.4). 오브 확보·한타 승리에서 옴 — 미니언 웨이브를 계산하지 않는다.
 wave:{A:number[], B:number[]},            // F09(2026-09-15): 라인별 웨이브 집계(0~4, 개별 미니언 미생성). 라인전 승자 쪽에 쌓이고
                                            // 한타 때 감쇠, 공성에 쓰이면 소모된다 — "포탑을 때릴 조건에 아군 웨이브를 포함"의 근거.
 region:{A:Region, B:Region},              // 팀 무게중심 지역(구간 간 이동 시간 계산용 추상 위치)
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
  region:'base' as Region,freeAt:0,
 }));
 return {A:mk('A',aStarters,aPicks),B:mk('B',bStarters,bPicks),firstKillDone:false,lastGankSeq:null,jglCommits:{A:0,B:0},pendingObjective:null,
  clock:0,struct:{A:[0,0,0],B:[0,0,0]},baseTurrets:{A:2,B:2},nexus:{A:false,B:false},lanePush:{A:[0,0,0],B:[0,0,0]},wave:{A:[0,0,0],B:[0,0,0]},region:{A:'base',B:'base'},events:[]};
}

const clamp01=(v:number)=>Math.min(1,Math.max(0,v));
const clampN=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));

// 지역 간 이동 시간(초). 정밀 좌표 대신 라인/강/베이스 추상 이동 — 미니맵 좌표가 판정을 바꾸지 않는다.
// export: 미니맵(replay.ts)이 자기 WALK 그래프 이동 시간을 이 표에 대조한다(단일 출처).
export const REGION_DIST:Record<Region,Record<Region,number>>={
 base:{base:0,top:22,mid:18,bot:22,river:20},
 top:{base:22,top:0,mid:15,bot:26,river:12},
 mid:{base:18,top:15,mid:0,bot:15,river:8},
 bot:{base:22,top:26,mid:15,bot:0,river:12},
 river:{base:20,top:12,mid:8,bot:12,river:0},
};
export const regionTime=(from:Region,to:Region)=>REGION_DIST[from][to];
// 이동↔전투 참여 단일 계약(D022): 이 조합원이 targetRegion에 clock까지 도착할 수 있는지 —
// 새 확률 롤 없음(결정적 기하). freeAt(직전 행동 종료 시각) + regionTime(마지막 위치→목표) <= clock.
// 기존 확률 기반 참가 판정(예: resolveObjective의 arriveP)과 겹치지 않는다 — 이 게이트를 통과한
// 인원 안에서만 그 확률이 작동한다(같은 실패 확률을 두 번 적용하지 않음).
export const hasArrived=(c:Combatant,targetRegion:Region,clock:number,targetNode?:string)=>{
 const target=targetNode??({base:c.side+'_base',top:'top_mid',mid:'mid',bot:'bot_mid',river:'dragon'}[targetRegion]);
 return c.freeAt+(c.navNode?travelSeconds(c.navNode,target,c.slot):regionTime(c.region,targetRegion))<=clock;
};
const opp=(s:Side):Side=>s==='A'?'B':'A';
// 유효 능력 = 기본 스탯 + 숙련(레벨당 +2) − 오프롤 페널티. game.ts의 OFFROLE_PEN(6)과 맞춘다.
const eff=(c:Combatant,k:number)=>c.stats[k]+c.mastery*2-(c.off?6:0);
const RESPAWN=(clock:number)=>10+Math.min(42,clock/60*1.5); // 초, 게임 시간에 따라 증가

// 죽은 선수 되살리기(다음 단위의 오브젝트/한타에서 사용). 이번 단위 라인 0·1에선 아무도 안 죽은 상태로 진입.
export function reviveByClock(st:MatchState,clock:number){
 for(const c of [...st.A,...st.B]) if(!c.alive && clock>=c.respawnAt){
  const at=c.respawnAt; c.alive=true; c.respawnAt=0;
  c.region='base'; c.freeAt=at;if(c.navNode)c.navNode=c.side+'_base'; // 사망자는 부활 후 기지에서 실제 이동을 시작한다(부활 시각부터 이동 가능).
 }
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
 // F09: 이 라인전 승자 쪽에 웨이브가 쌓인다(처치>탈출>회피>순수 라인전 순). 패자 쪽은 흩어진다.
 st.wave[winSide][lane]=clampN(st.wave[winSide][lane]+(kill?1.4:(committed&&!spotted)?1.0:spotted?0.3:0.6+margin*0.6),0,4);
 st.wave[loseSide][lane]=clampN(st.wave[loseSide][lane]*0.4,0,4);

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
 // F09: 바텀 라인(2)도 같은 웨이브 축적 규칙(처치>탈출/보호>회피>순수 라인전).
 st.wave[winSide][2]=clampN(st.wave[winSide][2]+(killAdc?1.4:peeled?1.0:spotted?0.3:0.6+margin*0.6),0,4);
 st.wave[loseSide][2]=clampN(st.wave[loseSide][2]*0.4,0,4);

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
   if(!hasArrived(c,'river',clock,kind==='herald'?'baron':'dragon')){notJoined.push({ref:{side,slot},reason:'이동 중(도착 전)'});return;}
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
 // F10: "포기에도 실제 자원·구조물 이득이 있을 수 있게 한다" — 오브젝트를 확보하지 못한 쪽(둘 다
 // 못 챙겼으면 둘 다)은 그 시간을 라인(탑 기준)에 썼다고 보고 웨이브가 쌓인다. 오브젝트 팀 보상
 // (OBJ_TEAM_G)과는 다른 채널이라 "미확보인데 보상 받음"과 모순되지 않는다 — 오브젝트 자체의
 // 보상은 여전히 0이고, 별개로 라인 웨이브만 오른다.
 for(const s of ['A','B'] as Side[]) if(s!==secured && st[s][0].alive){
  st.wave[s][0]=clampN(st.wave[s][0]+0.5,0,4);
  ev.push(`${s} 측은 ${objKor} 대신 그 시간을 라인에 씀 — 사이드 웨이브 확보`);
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

// F12: 감독 지시(딜러 보호/위험 감수 진입)의 한타 반영분. 없으면(undefined) 기존 결과와 100% 동일 —
// protect는 A 기준 부호(양수=A 보호 강화), favor도 A 기준 부호, engage는 크기만(교전 성사 확률에 가산, 양쪽 공용).
export type DirectorBonus={protect:number,favor:number,engage:number};
export function resolveTeamfight(
 st:MatchState, seq:number, edgeA:boolean, margin:number, clock:number, crng:()=>number, targetNode=seq===5?'dragon':seq===6?'baron':'mid',
 directorBonus?:DirectorBonus,
):CombatEvent{
 reviveByClock(st,clock);
 const favSide:Side=edgeA?'A':'B', othSide:Side=edgeA?'B':'A';
 const fightRegion:Region=seq===5||seq===6?'river':'mid';
 // 도착 게이트(이동↔전투 참여 단일 계약, D022): 생존자 중 이 한타 시각까지 fightRegion에 실제로
 // 도착할 수 있는 인원만 싸운다(hasArrived — 새 확률 없음). 도착 못한 생존자는 이번 한타에 끼지
 // 않는다(소급 참여 없음) — notJoined에 남고, 다음 사건에서 자기 위치·시각 기준으로 재평가된다.
 const alive=(s:Side)=>[0,1,2,3,4].filter(sl=>st[s][sl].alive&&hasArrived(st[s][sl],fightRegion,clock,targetNode));
 const aA0=alive('A'), aB0=alive('B');
 const partRefs:Ref[]=[...aA0.map(sl=>({side:'A' as Side,slot:sl})),...aB0.map(sl=>({side:'B' as Side,slot:sl}))];
 const notJoined:{ref:Ref,reason:string}[]=[];
 for(const sl of [0,1,2,3,4]){
  if(!st.A[sl].alive) notJoined.push({ref:{side:'A',slot:sl},reason:'전투 이탈(리스폰 대기)'});
  else if(!aA0.includes(sl)) notJoined.push({ref:{side:'A',slot:sl},reason:'이동 중(도착 전)'});
  if(!st.B[sl].alive) notJoined.push({ref:{side:'B',slot:sl},reason:'전투 이탈(리스폰 대기)'});
  else if(!aB0.includes(sl)) notJoined.push({ref:{side:'B',slot:sl},reason:'이동 중(도착 전)'});
 }
 const plan=battlePlan(aA0.map(sl=>st.A[sl].champ),aB0.map(sl=>st.B[sl].champ),clock);
 // F12: 딜러 보호 지시는 지시한 팀 쪽 protect만 올린다(다른 축은 손대지 않음 — 그게 이 지시의 대가:
 // prepare/trade가 주는 일반 전투 확률 우위를 protect는 받지 못한다).
 if(directorBonus?.protect){
  if(directorBonus.protect>0) plan.protectA=clampN(plan.protectA+directorBonus.protect,0,0.3);
  else plan.protectB=clampN(plan.protectB-directorBonus.protect,0,0.3);
 }
 const dEngage=directorBonus?.engage??0, dFavor=directorBonus?.favor??0;
 const nFav=(favSide==='A'?aA0:aB0).length, nOth=(favSide==='A'?aB0:aA0).length;

 const res=[0,0,0,0,0, 0,0,0,0,0];
 const add=(c:Combatant,g:number)=>{c.gold+=g; res[(c.side==='A'?0:5)+c.slot]+=g;};
 const kills:KillRec[]=[]; let firstBlood=false;
 const contrib:Contrib[]=partRefs.map(r=>({ref:r,kill:0,engage:0,protect:0,damage:0,survived:true}));
 const cRec=(r:Ref)=>contrib.find(c=>c.ref.side===r.side&&c.ref.slot===r.slot);
 const registerKill=(victim:Combatant, primary:Combatant, assistList:Combatant[])=>{
  if(!victim.alive||!primary.alive||victim.side===primary.side)return;
  // 처치 시점을 조금씩 벌려 부활도 계단식으로 — 다음 사건에 5v5/4v5가 섞인다(고정 간격 문제 완화).
  victim.alive=false; victim.deaths++; victim.respawnAt=clock+RESPAWN(clock)+kills.length*4; primary.kills++;
  add(primary, TF_KILL_G*(1+(eff(primary,S_CAR)-50)/240)); add(victim, -TF_DEATH_G);
  cRec({side:primary.side,slot:primary.slot})!.kill+=1;
  const vc=cRec({side:victim.side,slot:victim.slot}); if(vc)vc.survived=false;
  const assists:Ref[]=[];
  for(const a of assistList){ if(a.alive&&a!==primary&&a.side===primary.side){ a.assists++; add(a,TF_ASSIST_G); cRec({side:a.side,slot:a.slot})!.kill+=0.5; assists.push({side:a.side,slot:a.slot}); } }
  kills.push({killer:{side:primary.side,slot:primary.slot},victim:{side:victim.side,slot:victim.slot},assists,clock});
  if(!st.firstKillDone){ st.firstKillDone=true; firstBlood=true; }
 };

 const ev:string[]=[`한타 — ${favSide} ${nFav}인 vs ${othSide} ${nOth}인`,`A ${plan.a.label} / B ${plan.b.label}`];
 if(directorBonus?.protect) ev.push(`${directorBonus.protect>0?'A':'B'} 감독 지시: 딜러 보호 강화`);
 if(directorBonus?.engage) ev.push(`감독 지시: 위험을 감수하고 교전을 강제`);
 let result:TFResult, winner:Side|null;

 if(nFav===0&&nOth===0){ result='NO_SHOW'; winner=null; ev.push('양 팀 모두 인원이 없어 교전 불성립'); }
 else if(nFav===0){ result='ONE_SIDED'; winner=othSide; ev.push(`${favSide} 전원 이탈 — ${othSide}가 무혈 장악`); }
 else if(nOth===0){ result='ONE_SIDED'; winner=favSide; ev.push(`${othSide} 전원 이탈 — ${favSide}가 무혈 장악`); }
 else {
  const numAdvFav=(nFav-nOth)*0.16;                       // 실제 사망이 만든 인원차 — p에 없던 새 채널
  // F12: 위험 감수 진입 지시는 교전 성사 확률을 밀어 올린다(dEngage, 크기만·양쪽 공용) — 안 열렸을 무교전을
  // 강제로 열게 만드는 것 자체가 이 지시의 대가다(margin이 불리해도 fight는 열리고, 지면 그대로 진다).
  const engageP=clamp01(0.88+margin*0.05+Math.abs(plan.entry)-Math.abs(plan.preparation)*.6+dEngage);               // 대부분 교전 성립. 무교전은 팽팽한 경기의 드문 예외
  if(crng()>=engageP){ result='NO_ENGAGE'; winner=null; ev.push('양 팀 대치만 하다 물러남 — 무교전'); }
  else {
   // 승패 = margin(이미 p에 반영된 전력·자원·조합의 요약) + 실제 인원차 + (있다면) 위험 감수 진입의 소폭 편향.
   const favWins=crng()<clamp01(0.5+margin*0.75+numAdvFav+(edgeA?1:-1)*(plan.preparation+plan.entry+plan.growth)+(favSide==='A'?dFavor:-dFavor));
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
    if(alive(def).includes(4) && alive(def).includes(3) && alive(def).length>1 &&
       crng()<clamp01(0.12+(eff(dSup,S_TF)+eff(dSup,S_VIS)-110)/150+(def==='A'?plan.protectA:plan.protectB))){
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
 // 경기 시계·위치 진행: 교전은 한 지역에서 벌어지고 ~30초를 쓴다(연출 재생 시각과 별개).
 st.region.A=fightRegion; st.region.B=fightRegion;
 st.clock=clock+14;   // 교전 자체는 짧다. 큰 시간은 후속 이동·공성(resolveSiege).
 // 실제로 도착해 싸운 생존자만 위치·가용 시각 갱신 — 이번에 못 낀 인원은 계속 '이동 중'(다음 사건에서 재평가).
 for(const sl of aA0) if(st.A[sl].alive){ st.A[sl].region=fightRegion; st.A[sl].freeAt=st.clock; }
 for(const sl of aB0) if(st.B[sl].alive){ st.B[sl].region=fightRegion; st.B[sl].freeAt=st.clock; }
 // 라인 압박: 결판 승자가 다음 공성의 라인 우선순위를 얻는다(추상값, 미니언 아님). 매 사건 소폭 감쇠.
 for(const s of ['A','B'] as Side[]) for(let L=0;L<3;L++) st.lanePush[s][L]*=0.85;
 if(winner) for(let L=0;L<3;L++) st.lanePush[winner][L]=clampN(st.lanePush[winner][L]+0.18,-1,1.4);
 // F09: 한타로 시선이 쏠리는 사이 라인 웨이브는 빠르게 무의미해진다(양쪽 다 방치 — lanePush보다 가파른 감쇠).
 for(const s of ['A','B'] as Side[]) for(let L=0;L<3;L++) st.wave[s][L]*=0.55;
 const ce:CombatEvent={
  seq,clock,kind:'teamfight',lane:null,side:winner??favSide,
  committed:false,followUp:false,spotted:false,
  participants:partRefs,kills,escaped:[],noKill:kills.length===0,firstBlood,
  resource,prior:null,evidence:ev,notJoined,
  strategy:{a:plan.a.label,b:plan.b.label,preparation:plan.preparation,entry:plan.entry,growth:plan.growth},
  fight:{result,winner,aliveA:aA0.length,aliveB:aB0.length,contrib},
 };
 st.events.push(ce);
 return ce;
}

// ── 공성(한타 후속 행동) ────────────────────────────────────────────────────────────────
// 한타 승리만으로 구조물을 부수지 않는다. 실제 생존 공격자 · 목표까지 이동 시간 · 상대 부활까지 남은 시간
// · 살아 있는 수비자 · 라인 압박 · 개인 자원/공성 능력에서 공성 가능량을 산출한다.
// 살아남은 원딜(보호 성공 포함)의 CAR·자원이 철거에 반영된다 — 보호 자체엔 별도 승리 보너스 없음.
// 무승부라고 일괄 금지하지 않는다: 생존/수비 상태로 실제 행동 가능 여부를 판단한다.
// 미지원(문서화): 스플릿 푸시·백도어·바론/장로 버프 공성·라인 스왑·미니언 웨이브 수치.
const TOWER_G=110, INHIB_G=175, NEXUS_TURRET_G=125, NEXUS_G=220;

export function resolveSiege(st:MatchState, seq:number, clock:number, crng:()=>number):CombatEvent{
 reviveByClock(st,clock);
 const alive=(s:Side)=>[0,1,2,3,4].filter(sl=>st[s][sl].alive);
 const preceding=st.events.at(-1);
 const attackReady=(s:Side)=>alive(s).filter(sl=>preceding?.kind!=='teamfight'||preceding.participants.some(p=>p.side===s&&p.slot===sl));
 const aA=attackReady('A'), aB=attackReady('B');
 const deadGap=(s:Side)=>[0,1,2,3,4].filter(sl=>!st[s][sl].alive).map(sl=>st[s][sl].respawnAt-clock).filter(x=>x>0);
 let siegeTargetBase=false,contactClock=clock;
 const mk=(atkSide:Side|null,result:SiegeResult,lane:number,evd:string[],res:number[],structuresDown:number,reinforceIn:number,capacity:number,nexus:boolean):CombatEvent=>{
  const resource=[0,1,2,3,4].map(sl=>res[sl]-res[5+sl]);
  const side=atkSide??'A';
  const ce:CombatEvent={
   seq,clock:contactClock,kind:'siege',lane:lane<0?null:lane,side,
   committed:false,followUp:false,spotted:false,
   participants:atkSide?attackReady(atkSide).map(sl=>({side:atkSide,slot:sl})):[],
   kills:[],escaped:[],noKill:true,firstBlood:false,
   resource,prior:null,evidence:evd.length?evd:['양 팀 정비·귀환 — 구조물 변화 없음'],
   siege:{result,side,lane:lane<0?-1:lane,from:st.region[side],structuresDown,
    reinforceIn:Math.round(reinforceIn),capacity:Math.round(capacity*100)/100,
    structAfter:[...st.struct[opp(side)]],baseTurretsAfter:st.baseTurrets[opp(side)],nexus,targetBase:siegeTargetBase},
  };
  st.events.push(ce);
  return ce;
 };

 // 공격 자격: 생존 인원이 더 많고, 상대에 리스폰 대기자가 있거나(창이 있음) 인원차 2+.
 let atkSide:Side|null=null;
 const dA=aA.length-alive('B').length,dB=aB.length-alive('A').length;
 if(dA>=1 && (deadGap('B').length>0 || dA>=2)) atkSide='A';
 else if(dB>=1 && (deadGap('A').length>0 || dB>=2)) atkSide='B';
 if(!atkSide){ st.clock=clock+22; return mk(null,'RESET',-1,[],[0,0,0,0,0,0,0,0,0,0],0,0,0,false); }

 const defSide=opp(atkSide);
 const atk=attackReady(atkSide), def=alive(defSide);
 const gaps=deadGap(defSide);
 const reinforceIn=gaps.length?Math.min(...gaps):999;      // 수비 병력 도착까지(초)
 const s3=st.struct[defSide];

 // 목표 라인: 진행도 최대(단 <3) + 라인 압박. 억제기가 하나라도 열렸으면 대체로 베이스로 전환.
 const openInhib=s3.some(v=>v>=3);
 let lane=-1,best=-1e9;
 for(let L=0;L<3;L++){ if(s3[L]>=3)continue; const v=s3[L]*1.0+st.lanePush[atkSide][L]*0.5+crng()*0.15; if(v>best){best=v;lane=L;} }
 const targetBase=lane<0 || (openInhib && crng()<0.62);   // 억제기 열림 → 베이스 압박 선택(라인 타워 연쇄로 넥서스까지 한 번에는 못 간다 — openInhib는 이번 사건 진입 시점 기준)
 siegeTargetBase=targetBase;
 const laneRegion:Region=targetBase?'base':(['top','mid','bot'][lane] as Region);
 const targetNode=targetBase?defSide+'_base':(['A','B'].includes(defSide)?({top:defSide+'_top',mid:'mid',bot:defSide+'_bot'} as Record<string,string>)[laneRegion]:'mid');
 const moveTime=atk.some(sl=>st[atkSide!][sl].navNode)?Math.max(...atk.map(sl=>travelSeconds(st[atkSide!][sl].navNode??atkSide+'_base',targetNode,sl))):regionTime(st.region[atkSide],laneRegion);
 contactClock=clock+moveTime;
 const windowTime=reinforceIn-moveTime;                    // 도착 후 실제 공성 가능 시간

 if(windowTime<=2){
  st.clock=clock+moveTime+8; st.region[atkSide]='river'; st.region[defSide]='base';
  // freeAt은 st.clock에서 정비 여유(+8)를 뺀다 — 그 여유 시간이 다음 사건으로의 초기 이동에 그대로 쓰인다
  // (같은 순간에 다음 사건이 바로 이어질 수 있는 스켈레톤 구조상 별도 유휴 시간이 없다 — D022).
  for(const sl of atk) if(st[atkSide][sl].alive){ st[atkSide][sl].region='river'; st[atkSide][sl].freeAt=clock+moveTime; }
  return mk(atkSide,'NO_WINDOW',lane,[`${atkSide} 진입했지만 ${defSide} 부활 병력 복귀 — 물러납니다`],[0,0,0,0,0,0,0,0,0,0],0,reinforceIn,0,false);
 }

 // 공성 가능량 = 인원차 + 시간 + 자원차(D007 스노볼 경로, 이미 쌓인 gold) + 공성 능력 + 생존 원딜 CAR + 운영 주도권(momentum).
 const numAdv=atk.length-def.length;
 const timeF=Math.min(windowTime,45)/45;
 const goldGap=(atk.reduce((v,sl)=>v+st[atkSide!][sl].gold,0)-def.reduce((v,sl)=>v+st[defSide][sl].gold,0))/1000;
 const bestObj=Math.max(...atk.map(sl=>eff(st[atkSide!][sl],S_OBJ)));
 const adcAlive=st[atkSide][3].alive;
 const adcSiege=adcAlive?(eff(st[atkSide][3],S_CAR)-50)/70:-0.4;   // 살아남은 원딜이 철거를 크게 당긴다
 const momentum=Math.max(...st.lanePush[atkSide]);               // 연속 공성 주도권(오브·한타 승리·직전 철거에서 누적)
 // F09: 아군 웨이브 없이는 포탑을 오래 못 때린다(미니언 아그로 없이 혼자 타워를 맞는 실제 제약의 추상화).
 // targetBase(라인 특정 안 됨)는 세 라인 중 가장 쌓인 웨이브를 쓴다(어느 방향이든 그 웨이브를 앞세워 밀 수 있음).
 const waveHelp=lane>=0?st.wave[atkSide][lane]:Math.max(...st.wave[atkSide]);
 // 공성 가능량은 실제 상황(생존 공격자·수비자·이동 시간·부활 창·라인 압박·웨이브·개인 자원)에서만 유도한다.
 //  - 구조물에서 뒤졌다는 사실 자체는 공성을 막지 않는다(D017): 열세팀도 유리한 교전을 이기면 구조물을 철거할 수 있어야 한다.
 //  - 스노볼 되돌리기는 인위적 보너스로 막지 않는다. 자연스러운 제동(goldGap 하한 −0.6, 넥서스는 openInhib+baseTurrets 0+수비 소수 필요)만 유지.
 // 교전 결과(numAdv)와 운영 주도권(momentum)이 주 동력. 자원차는 이미 확률 채널(resPow)에도 쓰였으므로 여기선 보조.
 let capacity=numAdv*1.15+timeF*1.15+clampN(goldGap,-0.6,0.85)+(bestObj-55)/44+adcSiege*0.75+momentum*1.0+waveHelp*0.4;
 capacity=Math.max(0,capacity);

 const res=[0,0,0,0,0,0,0,0,0,0];
 const add=(sl:number,g:number)=>{ st[atkSide!][sl].gold+=g; res[(atkSide==='A'?0:5)+sl]+=g; };
 const evd:string[]=[`${atkSide} ${atk.length}인 공성 vs ${defSide} ${def.length}인 수비 · 부활까지 ${Math.round(reinforceIn)}초 · 여력 ${capacity.toFixed(1)}`];
 if(waveHelp>1)evd.push(`아군 웨이브가 함께 포탑을 압박합니다(웨이브 ${waveHelp.toFixed(1)})`);
 else if(waveHelp<0.3)evd.push('미니언 웨이브 없이 홀로 포탑을 두드리는 중 — 오래 버티지 못함');
 if(lane>=0)st.wave[atkSide][lane]=clampN(st.wave[atkSide][lane]*0.3,0,4); // 공성에 쓴 웨이브는 소모된다(밀어 넣고 나면 사라짐)
 let structuresDown=0,inhib=false,nexus=false;
 let budget=Math.floor(capacity);

 if(targetBase){
  if(!openInhib){ evd.push(`${atkSide} 베이스 앞 — 억제기가 열리지 않아 진입 불가`); }
  else {
   const btDown=Math.min(st.baseTurrets[defSide],Math.max(0,budget));
   for(let k=0;k<btDown;k++){ st.baseTurrets[defSide]--; structuresDown++; add(3,NEXUS_TURRET_G); add(0,NEXUS_TURRET_G*0.5); evd.push(`${atkSide} 넥서스 쌍둥이 포탑 철거`); }
   budget-=btDown;
   if(st.baseTurrets[defSide]===0 && (budget>=2 || (budget>=1 && def.length<=1)) && def.length<=3){
    st.nexus[defSide]=true; nexus=true; structuresDown++;
    for(const sl of atk) add(sl,NEXUS_G*0.5);
    evd.push(`${atkSide}가 넥서스를 파괴합니다 — 경기 종료`);
   } else if(st.baseTurrets[defSide]===0){
    evd.push(`넥서스 앞 — 여력(또는 수비 인원) 부족으로 마무리 실패`);
   }
  }
 } else {
  const step=Math.min(budget,2,3-s3[lane]);                 // 1회 최대 2개, 라인 진행도는 순서대로만
  for(let k=0;k<step;k++){
   s3[lane]++; structuresDown++;
   const isInhib=s3[lane]===3; if(isInhib)inhib=true;
   add(3,isInhib?INHIB_G:TOWER_G); add(1,(isInhib?INHIB_G:TOWER_G)*0.5); add(0,(isInhib?INHIB_G:TOWER_G)*0.3);
   evd.push(isInhib?`${atkSide} ${laneRegion} 억제기 파괴`:`${atkSide} ${laneRegion} ${s3[lane]===1?'외곽':'내곽'} 포탑 철거`);
  }
  if(structuresDown===0) evd.push(`${atkSide} 압박했지만 ${defSide} 수비에 막혀 철거 실패`);
 }

 // 운영 주도권: 철거에 성공하면 공격 팀 전 라인 압박↑, 수비 팀 압박↓(다음 공성이 쉬워짐 = 스노볼).
 for(let L=0;L<3;L++){
  st.lanePush[atkSide][L]=clampN(st.lanePush[atkSide][L]+(structuresDown>0?0.28:-0.3),-1,1.6);
  st.lanePush[defSide][L]=clampN(st.lanePush[defSide][L]*(structuresDown>0?0.55:0.9),-1,1.6);
 }
 const siegeTime=10+structuresDown*14+(structuresDown===0?6:0);
 st.clock=clock+moveTime+siegeTime+12;                      // + 정비·귀환
 st.region[atkSide]=structuresDown>0?laneRegion:'river';
 st.region[defSide]='base';
 // 공격 참가자 위치·가용 시각 갱신(이동↔전투 참여 단일 계약, D022) — 다음 한타의 도착 게이트가 참조한다.
 // 개인 위치는 항상 river(중앙 허브)로 — "+12 정비·귀환" 시간이 뜻하는 바가 정확히 이거다(라인 구석에
 // 남지 않고 중앙으로 물러난다). st.region[atkSide](라인별 공성 판정에 쓰는 팀 단위 값)는 그대로 둔다.
 // freeAt은 st.clock에서 정비 여유(+12)를 뺀다 — 스켈레톤 구조상 다음 사건이 같은 순간 바로 이어질 수
 // 있어(사건 사이 별도 유휴 시간 없음) 이 여유가 곧 다음 사건으로의 초기 이동 시간이 된다.
 for(const sl of atk) if(st[atkSide][sl].alive){ st[atkSide][sl].region='river'; st[atkSide][sl].freeAt=clock+moveTime+siegeTime; }
 const result:SiegeResult=nexus?'NEXUS':inhib?'INHIB':structuresDown>0?'SIEGE':'HELD';
 return mk(atkSide,result,lane,evd,res,structuresDown,reinforceIn,capacity,nexus);
}
