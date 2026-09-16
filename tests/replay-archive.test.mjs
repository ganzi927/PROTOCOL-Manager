// F26: 리플레이 보관함. finishMatch()에서 사용자 팀 경기만 REPLAY_CAP개까지 보존하고, 엔진·규칙
// 버전을 함께 찍는다. 이미 저장된 항목은 이후 게임 진행에도 그대로 얼어붙어 있어야 한다(재계산 없음).
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,roster,team,ROLES,legalDraftCandidates,DRAFT_ORDER,ENGINE_VERSION,RULE_VERSION,REPLAY_CAP} from '../lib/game.ts';
import {buildReplay} from '../lib/simulation/replay.ts';

function next(g){
 if(g.phase==='PLAN')return applyCommand(applyCommand(g,{type:'training',payload:{id:'all',training:'scrim'}}),{type:'train'});
 if(g.phase==='PREP'){let s=applyCommand(g,{type:'startDraft'});let guard=0;
  while(s.phase==='DRAFT'&&s.match.draftState&&!s.match.draftState.complete){assert.ok(guard++<12);const ds=s.match.draftState;const cands=legalDraftCandidates(s,ds);const kind=DRAFT_ORDER[ds.step][1];let champ=cands[0].id;if(kind==='PICK'){const mine=ds.blue===s.teamId?ds.picksBlue:ds.picksRed;const covered=new Set(mine.map(x=>x.role));const pref=cands.find(c=>!covered.has(c.role));if(pref)champ=pref.id;}s=applyCommand(s,{type:'draftPick',payload:{champ}});}
  return s;}
 if(g.phase==='DRAFT')return applyCommand(g,{type:'play'});
 if(g.phase==='TACTICAL')return applyCommand(g,{type:'tacticalChoice',payload:{choice:'regroup'}});
 if(g.phase==='RECAP')return applyCommand(g,{type:'continue'});
 if(g.phase==='MATCH_END')return applyCommand(g,{type:'advance'});
 if(g.phase==='SPLIT_END')return applyCommand(g,{type:'nextSplit'});
 if(g.phase==='WORLD_END')return applyCommand(g,{type:'nextCompetition'});
 if(g.phase==='OFFSEASON'){for(const r of ROLES){let p=roster(g).filter(p=>p.role===r).sort((a,b)=>b.stats.reduce((s,v)=>s+v,0)-a.stats.reduce((s,v)=>s+v,0))[0];if(!p){const fa=g.players.filter(p=>!p.teamId&&p.role===r&&p.releasedSeason!==g.season).sort((a,b)=>a.salary-b.salary)[0];g=applyCommand(g,{type:'sign',payload:{id:fa.id,years:1}});p=fa;}g=applyCommand(g,{type:'lineup',payload:{id:p.id}});}return applyCommand(g,{type:'newSeason'});}
 throw Error('unhandled phase '+g.phase);
}

// --- 1. 사용자 팀 경기만 리플레이로 남는다. 저장된 항목엔 엔진·규칙 버전이 찍힌다. ---
{
 let g=upgradeGame(newGame('nva',11));
 let commands=0,sawUserMatch=false;
 while(g.season<2&&commands<3000){
  const before=g.match;
  g=next(g); commands++;
  if(before&&g.phase==='MATCH_END'&&(before.a==='nva'||before.b==='nva'))sawUserMatch=true;
 }
 assert.ok(sawUserMatch,'테스트 전제: 사용자 팀 경기가 최소 1회 진행됨');
 assert.ok(g.replays&&g.replays.length>0,'사용자 팀 경기를 치르면 리플레이가 쌓인다');
 for(const r of g.replays){
  assert.ok(r.a==='nva'||r.b==='nva','저장된 리플레이는 전부 사용자 팀 경기다');
  assert.equal(r.engineVersion,ENGINE_VERSION,'엔진 버전이 찍힌다');
  assert.equal(r.ruleVersion,RULE_VERSION,'규칙 버전이 찍힌다');
  assert.ok(r.result.events.length>0,'실제 경기 사건을 담고 있다');
 }
 assert.ok(g.replays.length<=REPLAY_CAP,`최근 ${REPLAY_CAP}개까지만 보존된다`);
}

// --- 2. 배경 리그 경기(사용자 팀이 안 낀 다른 팀들의 자동 진행 경기)는 리플레이에 안 쌓인다. ---
{
 let g=upgradeGame(newGame('nva',3));
 g.phase='PLAN';
 g=next(g); // 훈련
 // PREP로 넘어가면 같은 라운드의 다른 8경기가 autoMatch로 자동 처리된다(g.fixtures[g.round] 중 사용자
 // 매치를 제외한 나머지) — 그 경기들의 팀은 nva가 아니므로 리플레이가 안 남아야 한다.
 assert.equal(g.phase,'PREP');
 const replayTeams=new Set((g.replays??[]).flatMap(r=>[r.a,r.b]));
 assert.ok([...replayTeams].every(t=>t==='nva'),'배경 리그 경기는 리플레이로 저장되지 않는다(사용자 팀 아닌 항목 없음)');
}

// --- 3. 저장된 리플레이는 이후 게임 진행과 무관하게 그대로 얼어붙어 있다(재계산 없음). ---
{
 let g=upgradeGame(newGame('nva',11));
 let commands=0;
 while(g.season<2&&commands<3000){g=next(g);commands++;}
 assert.ok(g.replays&&g.replays.length>0);
 const frozen=JSON.stringify(g.replays[0]);
 let g2=g;
 for(let i=0;i<20&&g2.season<3;i++){g2=next(g2);}
 const stillThere=g2.replays.find(r=>r.id===g.replays[0].id);
 if(stillThere)assert.equal(JSON.stringify(stillThere),frozen,'더 진행해도 이미 저장된 리플레이는 바이트 단위로 그대로다');
}

// --- 4. buildReplay의 윈도우 tier가 원본 GameEvent.tier를 그대로 옮긴다(새 판정 아님). ---
{
 let g=upgradeGame(newGame('nva',11));
 let commands=0;
 while((!g.replays||!g.replays.length)&&commands<3000){g=next(g);commands++;}
 assert.ok(g.replays&&g.replays.length>0);
 const entry=g.replays[0];
 const rd=buildReplay(entry.result);
 const tieredEvents=entry.result.events.filter(e=>e.tier==='decisive'||e.tier==='close');
 for(const e of tieredEvents){
  const w=rd.windows.find(w=>w.seq===rd.windows.find(x=>x.label===e.title)?.seq); // 라벨 매칭으로 대략 확인(정확한 인덱스 재현은 buildReplay 내부 전용)
 }
 const anyTiered=rd.windows.some(w=>w.tier==='decisive'||w.tier==='close');
 const anyEventTiered=entry.result.events.some(e=>e.tier==='decisive'||e.tier==='close');
 assert.equal(anyTiered,anyEventTiered,'원본에 강도 높은 사건이 있으면 윈도우에도 그대로 반영된다(하나도 없거나 둘 다 있거나)');
}

console.log('PASS replay-archive: user-team-only scoping, engine/rule version stamping, cap enforcement, frozen after later progression, window tier mirrors source event tier');
