// F22: 시즌 서사. g.history/standings/로스터의 실제 기록만 읽어서 연승·라이벌전·주전 경쟁·플레이오프
// 경쟁을 감지한다 — 새 무작위 뉴스를 만들지 않는다. 게임 내 메타 교체도 news에 시점·이유를 남긴다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,seasonNarrative,roster,team,ROLES,standings,legalDraftCandidates,DRAFT_ORDER} from '../lib/game.ts';

const H=(a,b,winner,season,i)=>({id:`h${i}`,a,b,sa:winner===a?2:1,sb:winner===a?1:2,winner,label:`SPRING R${i}`,season});

// --- 1. 연승/연패: 최신 기록(인덱스0)부터 연속된 결과만 센다. 2연승은(3 미만) 감지 안 함. ---
{
 let g=upgradeGame(newGame('nva',3));
 g.history=[H('nva','crn','nva',g.season,4),H('nva','hle','nva',g.season,3),H('nva','dk','nva',g.season,2),H('nva','kdf','crn',g.season,1)];
 const stories=seasonNarrative(g,'nva');
 const streak=stories.find(s=>s.kind==='streak');
 assert.ok(streak,'3연승이 감지된다');
 assert.ok(streak.headline.includes('3연승'),`헤드라인에 정확한 연승 수: ${streak.headline}`);

 g.history=[H('nva','crn','nva',g.season,2),H('nva','hle','crn',g.season,1)];
 assert.ok(!seasonNarrative(g,'nva').some(s=>s.kind==='streak'),'2연승(3 미만)은 감지하지 않는다');

 g.history=[H('nva','crn','crn',g.season,3),H('nva','hle','crn',g.season,2),H('nva','dk','crn',g.season,1)];
 const lose=seasonNarrative(g,'nva').find(s=>s.kind==='streak');
 assert.ok(lose&&lose.headline.includes('3연패'),'연패도 같은 방식으로 감지된다');
}

// --- 2. 라이벌전: 이번 시즌 2번 이상 맞붙었고 승패 차가 가장 작은 상대만 뽑는다. ---
{
 let g=upgradeGame(newGame('nva',3));
 g.history=[H('nva','crn','nva',g.season,4),H('nva','crn','crn',g.season,3),H('nva','hle','nva',g.season,2),H('nva','hle','nva',g.season,1)];
 const rivalry=seasonNarrative(g,'nva').find(s=>s.kind==='rivalry');
 assert.ok(rivalry,'2번 이상 맞붙은 상대가 있으면 라이벌전이 감지된다');
 assert.ok(rivalry.detail.includes('1승 1패'),`crn과 팽팽한 전적(1승1패)이 라이벌로 뽑힌다: ${rivalry.detail}`);
}

// --- 3. 주전 경쟁: 벤치 선수 OVR이 선발과 근접하면 감지, 확실히 낮으면 감지하지 않는다. ---
{
 let g=upgradeGame(newGame('nva',3));
 const top=roster(g,'nva').find(p=>p.role==='TOP');
 const bench=roster(g).find(p=>p.role==='TOP'&&p.teamId!==null&&p.id!==top.id)??(()=>{const p=structuredClone(top);p.id='bench-top-test';p.teamId='nva';p.name='BenchTop';return p;})();
 if(!g.players.some(p=>p.id===bench.id))g.players.push(bench);
 bench.teamId='nva';
 bench.stats=top.stats.map(s=>s); // 선발과 동일한 능력 → OVR 근접(경쟁 감지돼야 함)
 const close=seasonNarrative(g,'nva').find(s=>s.kind==='competition'&&s.headline.startsWith('TOP'));
 assert.ok(close,'벤치 선수 OVR이 선발과 근접하면 주전 경쟁이 감지된다');

 bench.stats=top.stats.map(s=>Math.max(1,s-30)); // 확실히 낮은 능력 → 경쟁 아님
 const notClose=seasonNarrative(g,'nva').find(s=>s.kind==='competition'&&s.headline.startsWith('TOP'));
 assert.ok(!notClose,'벤치 선수가 확실히 약하면 주전 경쟁으로 감지하지 않는다');
}

// --- 4. 플레이오프 경쟁: 6위 컷과 승수 차가 1 이하일 때만 감지, REGULAR 단계에서만. ---
{
 let g=upgradeGame(newGame('nva',3));
 g.stage='REGULAR';
 const table=standings(g);
 assert.ok(table.length>6,'표본 확보');
 const mine=team(g,'nva');
 mine.wins=table[5].wins; mine.losses=5; // 6위와 승수 동일
 const race=seasonNarrative(g,'nva').find(s=>s.kind==='race');
 assert.ok(race,'6위 컷과 승수가 같으면 플레이오프 경쟁이 감지된다');

 g.stage='PLAYOFF';
 assert.ok(!seasonNarrative(g,'nva').some(s=>s.kind==='race'),'플레이오프 단계에서는 진출 경쟁을 감지하지 않는다(이미 확정된 사실이므로)');
}

// --- 5. 게임 내 메타 교체가 news에 시점·이유와 함께 기록된다(실데이터 아님을 문구에 명시).
//     메타 개편은 nextYear()에서만 일어난다(OFFSEASON→SPRING 전환의 newSeason이 아니라, 그 이전
//     WORLD_END→다음 시즌 전환에서) — 실제 전체 시즌 사이클을 한 바퀴 돌려서 확인한다. ---
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
 if(g.phase==='OFFSEASON'){for(const r of ROLES){let p=roster(g).filter(p=>p.role===r).sort((a,b)=>b.stats.reduce((s,v)=>s+v,0)-a.stats.reduce((s,v)=>s+v,0))[0];if(!p){const fa=g.players.filter(p=>!p.teamId&&p.role===r&&p.releasedSeason!==g.season).sort((a,b)=>a.salary-b.salary)[0];assert.ok(fa);g=applyCommand(g,{type:'sign',payload:{id:fa.id,years:1}});p=fa;}g=applyCommand(g,{type:'lineup',payload:{id:p.id}});}return applyCommand(g,{type:'newSeason'});}
 throw Error('unhandled phase '+g.phase);
}
{
 let g=upgradeGame(newGame('nva',11));
 let commands=0;
 while(g.season<2){g=next(g);commands++;assert.ok(commands<4000);}
 assert.ok(g.news.some(s=>s.includes('메타')&&s.includes('실제 통계 연동 아님')),'시즌 전환 시 메타 개편이 news에 "실제 통계 아님"과 함께 기록된다');
}

console.log('PASS narrative: streak detection grounded in real history, rivalry from closest repeated matchup, starter competition from real OVR gap, playoff race only pre-playoff, meta rotation announced honestly');
