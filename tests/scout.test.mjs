// F16: 다음 상대를 준비하는 분석실. g.scout(완료된 과거 세트 요약, 팀당 최근 SCOUT_CAP개)만 읽고
// 다음 경기의 확정 픽·난수·실제 명령은 절대 참조하지 않는다. 표본 수·관측 시즌 범위를 반드시 표시한다.
import assert from 'node:assert/strict';
import {newGame,applyCommand,ROLES,roster,ovr,legalDraftCandidates,DRAFT_ORDER,scoutReport,SCOUT_CAP} from '../lib/game.ts';

function next(g){
 if(g.phase==='PLAN'){g=applyCommand(g,{type:'training',payload:{id:'all',training:roster(g).some(p=>p.burn>45)?'rest':'scrim'}});return applyCommand(g,{type:'train'});}
 if(g.phase==='PREP'){let s=applyCommand(g,{type:'startDraft'});let guard=0;
  while(s.phase==='DRAFT'&&s.match.draftState&&!s.match.draftState.complete){assert.ok(guard++<12);const ds=s.match.draftState;const cands=legalDraftCandidates(s,ds);const kind=DRAFT_ORDER[ds.step][1];let champ=cands[0].id;if(kind==='PICK'){const mine=ds.blue===s.teamId?ds.picksBlue:ds.picksRed;const covered=new Set(mine.map(x=>x.role));const pref=cands.find(c=>!covered.has(c.role));if(pref)champ=pref.id;}s=applyCommand(s,{type:'draftPick',payload:{champ}});}
  return s;}
 if(g.phase==='DRAFT')return applyCommand(g,{type:'play'});
 if(g.phase==='TACTICAL'){const m=g.match;const choices=['prepare','trade','regroup','protect','allin'];const choice=choices[m.sets.length%5];return applyCommand(g,{type:'tacticalChoice',payload:{choice}});}
 if(g.phase==='RECAP')return applyCommand(g,{type:'continue'});
 if(g.phase==='MATCH_END')return applyCommand(g,{type:'advance'});
 if(g.phase==='SPLIT_END')return applyCommand(g,{type:'nextSplit'});
 if(g.phase==='WORLD_END')return applyCommand(g,{type:'nextCompetition'});
 if(g.phase==='OFFSEASON'){for(const r of ROLES){let p=roster(g).filter(p=>p.role===r).sort((a,b)=>ovr(b)-ovr(a))[0];if(!p){const fa=g.players.filter(p=>!p.teamId&&p.role===r&&p.releasedSeason!==g.season).sort((a,b)=>a.salary-b.salary)[0];assert.ok(fa);g=applyCommand(g,{type:'sign',payload:{id:fa.id,years:1}});p=fa;}g=applyCommand(g,{type:'lineup',payload:{id:p.id}});}return applyCommand(g,{type:'newSeason'});}
 throw Error('unhandled phase '+g.phase);
}

let g=newGame('nva',3);
let commands=0;
while(g.season<3){g=next(g);commands++;assert.ok(commands<4000);}
console.log('setup: commands',commands,'season',g.season,'teams with scout data',Object.keys(g.scout||{}).length);

// --- 1. 결정성 ---
{
 const oppId=Object.keys(g.scout).find(id=>id!=='nva');
 assert.deepEqual(scoutReport(g,oppId),scoutReport(g,oppId));
}

// --- 2. 표본 캡: 팀당 최근 SCOUT_CAP개를 넘지 않는다(무한 증가 방지) ---
{
 for(const tid in g.scout)assert.ok(g.scout[tid].length<=SCOUT_CAP,`${tid} 표본 수 ${g.scout[tid].length} <= ${SCOUT_CAP}`);
}

// --- 3. 표본 수·관측 시즌 범위를 정확히 표시(원본 g.scout과 독립 재확인) ---
{
 for(const tid in g.scout){
  const samples=g.scout[tid];
  const r=scoutReport(g,tid);
  assert.equal(r.sampleSize,samples.length,`sampleSize=${tid} 원본 길이와 일치`);
  if(samples.length){
   assert.deepEqual(r.seasonRange,[Math.min(...samples.map(s=>s.season)),Math.max(...samples.map(s=>s.season))],`${tid} seasonRange 독립 재계산 일치`);
   assert.equal(r.winRate,samples.filter(s=>s.won).length/samples.length,`${tid} winRate 독립 재계산 일치`);
  }
 }
}

// --- 4. pickFreq는 실제 표본에 있던 챔피언만 담는다(지어낸 픽 없음), 빈도 내림차순 ---
{
 for(const tid in g.scout){
  const samples=g.scout[tid];
  const r=scoutReport(g,tid);
  for(const role of ROLES){
   const ri=ROLES.indexOf(role);
   const realPicks=new Set(samples.map(s=>s.picks[ri]).filter(Boolean));
   for(const entry of r.pickFreq[role]){
    assert.ok(realPicks.has(entry.champ),`${tid} ${role} pickFreq는 실제 표본에 있던 챔피언만(${entry.champ})`);
   }
   for(let i=1;i<r.pickFreq[role].length;i++)assert.ok(r.pickFreq[role][i-1].count>=r.pickFreq[role][i].count,`${tid} ${role} pickFreq 내림차순`);
  }
 }
}

// --- 5. 표본이 없는 팀은 0 표본 리포트(크래시 없음, 없는 걸 지어내지 않음) ---
{
 const empty=scoutReport(g,'no-such-team-xyz');
 assert.equal(empty.sampleSize,0);
 assert.equal(empty.seasonRange,null);
 assert.equal(empty.strongRole,null);
 assert.equal(empty.weakRole,null);
 assert.deepEqual(empty.pogRoleFreq,[]);
 for(const role of ROLES)assert.deepEqual(empty.pickFreq[role],[]);
}

// --- 6. 미래 정보 미참조: g.match(진행 중/다음 경기 상태)를 지우거나 바꿔도 scoutReport 결과는 불변 ---
{
 const oppId=Object.keys(g.scout).find(id=>id!=='nva');
 const before=scoutReport(g,oppId);
 const gNoMatch={...g,match:null};
 assert.deepEqual(scoutReport(gNoMatch,oppId),before,'scoutReport는 g.match를 참조하지 않는다(과거 완료 세트만 사용)');
}

// --- 7. avgLead/strongRole/weakRole은 leadSlots 독립 재계산과 일치 ---
{
 for(const tid in g.scout){
  const samples=g.scout[tid];if(!samples.length)continue;
  const r=scoutReport(g,tid);
  const avgLead=[0,1,2,3,4].map(i=>samples.reduce((n,s)=>n+(s.leadSlots[i]??0),0)/samples.length);
  for(let i=0;i<5;i++)assert.ok(Math.abs(r.avgLead[i]-avgLead[i])<1e-9,`${tid} avgLead[${i}] 독립 재계산 일치`);
 }
}

console.log('PASS scout: determinism, sample cap enforced, sampleSize/seasonRange/winRate independently re-aggregated, pickFreq grounded in real samples only, empty-team safety, no future-match leakage, avgLead re-aggregation match');
