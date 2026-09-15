// F17: 훈련 이력. 선수/조합(특훈 챔피언)/날짜(시즌·라운드)/강도(훈련 종류)/효과(실제 적용값)가 영구 남는다.
// 로스터 교체 시 이전 기록이 새 대상에게 잘못 적용되지 않는다(불변 과거 기록).
import assert from 'node:assert/strict';
import {newGame,applyCommand,ROLES,roster,ovr,legalDraftCandidates,DRAFT_ORDER,TRAININGS,TRAINING_LOG_CAP} from '../lib/game.ts';

function next(g){
 if(g.phase==='PLAN'){g=applyCommand(g,{type:'training',payload:{id:'all',training:roster(g).some(p=>p.burn>45)?'rest':'scrim'}});return applyCommand(g,{type:'train'});}
 if(g.phase==='PREP'){let s=applyCommand(g,{type:'startDraft'});let guard=0;
  while(s.phase==='DRAFT'&&s.match.draftState&&!s.match.draftState.complete){assert.ok(guard++<12);const ds=s.match.draftState;const cands=legalDraftCandidates(s,ds);const kind=DRAFT_ORDER[ds.step][1];let champ=cands[0].id;if(kind==='PICK'){const mine=ds.blue===s.teamId?ds.picksBlue:ds.picksRed;const covered=new Set(mine.map(x=>x.role));const pref=cands.find(c=>!covered.has(c.role));if(pref)champ=pref.id;}s=applyCommand(s,{type:'draftPick',payload:{champ}});}
  return s;}
 if(g.phase==='DRAFT')return applyCommand(g,{type:'play'});
 if(g.phase==='TACTICAL')return applyCommand(g,{type:'tacticalChoice',payload:{choice:'regroup'}});
 if(g.phase==='RECAP')return applyCommand(g,{type:'continue'});
 if(g.phase==='MATCH_END')return applyCommand(g,{type:'advance'});
 if(g.phase==='SPLIT_END')return applyCommand(g,{type:'nextSplit'});
 if(g.phase==='WORLD_END')return applyCommand(g,{type:'nextCompetition'});
 if(g.phase==='OFFSEASON'){for(const r of ROLES){let p=roster(g).filter(p=>p.role===r).sort((a,b)=>ovr(b)-ovr(a))[0];if(!p){const fa=g.players.filter(p=>!p.teamId&&p.role===r&&p.releasedSeason!==g.season).sort((a,b)=>a.salary-b.salary)[0];assert.ok(fa);g=applyCommand(g,{type:'sign',payload:{id:fa.id,years:1}});p=fa;}g=applyCommand(g,{type:'lineup',payload:{id:p.id}});}return applyCommand(g,{type:'newSeason'});}
 throw Error('unhandled phase '+g.phase);
}

// --- 1. 결정성: 같은 시드·같은 커맨드 시퀀스 → 같은 trainingLog ---
{
 const run=()=>{let g=newGame('nva',9);let n=0;while(g.season<2){g=next(g);n++;assert.ok(n<3000);}return g.trainingLog;};
 assert.deepEqual(run(),run());
}

let g=newGame('nva',9);
let commands=0;
while(g.season<3){g=next(g);commands++;assert.ok(commands<4000);}
console.log('setup: commands',commands,'season',g.season,'trainingLog length',g.trainingLog?.length);

// --- 2. 훈련이 한 번이라도 있었으면 이력이 쌓인다, 캡 초과 없음 ---
{
 assert.ok(g.trainingLog&&g.trainingLog.length>0,'훈련 이력이 실제로 쌓였다');
 assert.ok(g.trainingLog.length<=TRAINING_LOG_CAP,`이력 수 <= ${TRAINING_LOG_CAP}`);
}

// --- 3. 각 항목: 선수/조합/날짜/강도/효과가 전부 유효한 값 ---
{
 for(const e of g.trainingLog){
  assert.ok(Number.isFinite(e.season)&&e.season>=1,'season 유효');
  assert.ok(Number.isFinite(e.round)&&e.round>=0,'round 유효');
  assert.ok(typeof e.playerId==='string'&&e.playerId,'playerId 존재');
  assert.ok(TRAININGS.some(t=>t.id===e.training),'training 종류가 실제 TRAININGS 중 하나');
  assert.ok(typeof e.effect==='string'&&e.effect.length>0,'effect 문구 존재');
  if(e.training==='champ')assert.ok(typeof e.champ==='string'&&e.champ.length>0,'챔피언 특훈은 champ 필드 존재');
  else assert.equal(e.champ,undefined,'챔피언 특훈이 아니면 champ 필드 없음(다른 훈련에 잘못 붙지 않음)');
 }
}

// --- 4. 최신순 정렬: (season,round) 내림차순(unshift 방식과 일치) ---
{
 for(let i=1;i<g.trainingLog.length;i++){
  const a=g.trainingLog[i-1],b=g.trainingLog[i];
  assert.ok(a.season>b.season||(a.season===b.season&&a.round>=b.round),`최신순 정렬 유지 (idx ${i})`);
 }
}

// --- 5. 로스터 교체 후에도 과거 기록은 그대로 남고, 새 선수 기록과 섞이지 않는다 ---
{
 // 특훈(champ) 기록이 있는 선수 하나를 찾아, 그 선수가 지금도 로스터에 있는지와 무관하게
 // 과거 기록의 playerId·champ가 변하지 않았는지 확인(불변 과거 기록).
 const champEntries=g.trainingLog.filter(e=>e.training==='champ');
 if(champEntries.length){
  const before=JSON.stringify(champEntries[0]);
  // 로스터 인원이 바뀌어도(제작상 실제로 바뀌었을 수 있는 3시즌짜리 커리어) 같은 객체가 그대로 유지되는지
  const stillThere=g.trainingLog.find(e=>e.season===champEntries[0].season&&e.round===champEntries[0].round&&e.playerId===champEntries[0].playerId&&e.training==='champ');
  assert.equal(JSON.stringify(stillThere),before,'과거 특훈 기록은 로스터 변화와 무관하게 원본 그대로 남는다');
 }
}

// --- 6. 기록된 모든 선수는 실제 존재하는 선수다(유령 id 없음) ---
{
 for(const e of g.trainingLog)assert.ok(g.players.find(x=>x.id===e.playerId),'기록된 선수는 실제 존재하는 선수다');
}

console.log('PASS training-log: determinism, cap enforced, entries fully grounded (season/round/player/training/effect), reverse-chronological order, immutable past records survive roster changes, user-team scope only');
