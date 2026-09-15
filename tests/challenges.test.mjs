// F18 Phase C: 성장 과제. 선수당 활성 과제 1개, 관측 부족=실패 아님(평가 보류), 완료 후 재관측 없음
// (적용 상한 1회), 관측은 finishMatch()에서만 쌓인다(배속·되감기·재조회로 중복 지급되지 않음).
import assert from 'node:assert/strict';
import {newGame,applyCommand,ROLES,roster,ovr,legalDraftCandidates,DRAFT_ORDER,CHALLENGES,startChallenge,recordObservation,challengeSuccessRate} from '../lib/game.ts';

// --- 1. 순수 함수: 성공/실패/보류/완료 후 잠금 ---
{
 let c=startChallenge('safe_commit',1);
 for(const s of [true,true,true,true,true,true,false,true]) c=recordObservation(c,s);
 assert.equal(c.status,'completed','성공 비율이 임계값 이상이면 completed');
 assert.equal(challengeSuccessRate(c),0.875);

 let f=startChallenge('safe_commit',1);
 for(const s of [false,false,true,false,false,true,false,false]) f=recordObservation(f,s);
 assert.equal(f.status,'failed','성공 비율이 임계값 미만이면 failed');

 let h=startChallenge('obj_priority',1);
 h=recordObservation(h,true); h=recordObservation(h,false);
 assert.equal(h.status,'active','최소 관측 수 미달이면 active 유지(실패 아님 — 평가 보류)');
 assert.equal(challengeSuccessRate(h),0.5);

 let g=startChallenge('obj_priority',1);
 for(let i=0;i<8;i++) g=recordObservation(g,true);
 assert.equal(g.status,'completed');
 const frozen=JSON.stringify(g);
 g=recordObservation(g,false); // 완료 후 추가 관측은 무시(적용 상한 1회의 근거)
 assert.equal(JSON.stringify(g),frozen,'완료 후에는 관측이 더 이상 쌓이지 않는다');
}

// --- 2. 정의 완전성: 두 과제 모두 필수 필드를 전부 명시한다 ---
{
 for(const id of ['safe_commit','obj_priority']){
  const def=CHALLENGES[id];
  for(const key of ['name','summary','opportunity','observe','minObservations','evalWindowSeasons','cost','effect','successThreshold']){
   assert.ok(def[key]!==undefined&&def[key]!=='' ,`${id}.${key} 명시됨`);
  }
  assert.ok(def.minObservations>0);
  assert.ok(def.successThreshold>0&&def.successThreshold<1);
 }
}

// --- 3. 실제 커리어 통합: 배정→관측 누적→최종 상태(active/completed/failed 중 하나), 크래시 없음 ---
function next(g){
 if(g.phase==='PLAN'){
  const jgl=roster(g).find(p=>p.role==='JGL');
  if(jgl&&!jgl.challenge) g=applyCommand(g,{type:'assignChallenge',payload:{id:jgl.id,challenge:'safe_commit'}});
  g=applyCommand(g,{type:'training',payload:{id:'all',training:roster(g).some(p=>p.burn>45)?'rest':'scrim'}});
  return applyCommand(g,{type:'train'});
 }
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
{
 let g=newGame('nva',3);
 const jglId=roster(g).find(p=>p.role==='JGL').id;
 let commands=0;
 while(g.season<3){g=next(g);commands++;assert.ok(commands<4000);}
 const jgl=g.players.find(p=>p.id===jglId);
 assert.ok(jgl.challenge,'과제가 실제로 배정됐다');
 assert.ok(['active','completed','failed'].includes(jgl.challenge.status));
 assert.ok(jgl.challenge.observations.length<=CHALLENGES.safe_commit.minObservations,'완료 후 관측이 더 안 쌓임(상한 준수) 또는 아직 미달');
 console.log('integration run: final challenge status =',jgl.challenge.status,'observations',jgl.challenge.observations.length);
}

// --- 4. 결정성: 같은 시드로 같은 경로를 밟으면 같은 과제 진행 상태 ---
{
 const run=()=>{let g=newGame('nva',11);const jglId=roster(g).find(p=>p.role==='JGL').id;let n=0;while(g.season<2){g=next(g);n++;assert.ok(n<3000);}return g.players.find(p=>p.id===jglId).challenge;};
 assert.deepEqual(run(),run());
}

// --- 5. 배정 규칙: 존재하지 않는 과제 id·활성 과제가 있는 상태의 재배정은 거부된다 ---
{
 let g=newGame('nva',3);
 const jglId=roster(g).find(p=>p.role==='JGL').id;
 g=applyCommand(g,{type:'assignChallenge',payload:{id:jglId,challenge:'safe_commit'}});
 assert.equal(g.players.find(p=>p.id===jglId).challenge.status,'active');
 assert.throws(()=>applyCommand(g,{type:'assignChallenge',payload:{id:jglId,challenge:'obj_priority'}}),/진행 중/,'활성 과제가 있으면 재배정 거부');
 assert.throws(()=>applyCommand(g,{type:'assignChallenge',payload:{id:jglId,challenge:'no-such-id'}}),/확인/,'존재하지 않는 과제 id는 거부');
}

console.log('PASS challenges: pure-function success/fail/pending/lock, definitions complete, real-career integration, determinism, assignment rules');
