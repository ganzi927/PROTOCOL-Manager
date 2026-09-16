// F27: 실제 조합 통계. g.scout(F16)에 이미 쌓이는 실제 픽·승패만 읽어 챔피언·역할별 관측 승률을
// 집계한다. 새 저장소를 만들지 않고(순수 읽기), 표본이 MIN_SAMPLE 미만이면 숫자를 지어내지 않고
// null(표본 부족)을 반환한다. composition.ts의 설계값(CompProfile)과는 완전히 분리된 출처다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,roster,ROLES,legalDraftCandidates,DRAFT_ORDER} from '../lib/game.ts';
import {observedChampStat,observedTeamStats,MIN_SAMPLE} from '../lib/balance/observed.ts';
import {compositionPlan} from '../lib/balance/composition.ts';

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

// --- 1. 새 게임(경기 0회)은 모든 챔피언에서 표본 부족(null)이다 — 데이터 실패 시 폴백. ---
{
 const g=upgradeGame(newGame('nva',11));
 const stat=observedChampStat(g,'Tfiora','TOP');
 assert.equal(stat.sampleSize,0);
 assert.equal(stat.winRate,null,'표본이 0이면 승률을 지어내지 않고 null을 반환한다');
 assert.equal(stat.seasonRange,null);
}

// --- 2. 실제로 경기를 치르면 g.scout에 쌓인 실제 픽·승패만으로 표본이 늘고, MIN_SAMPLE 이상이면
//        winRate가 [0,1] 범위의 실제 계산값으로 채워진다(설계값 아님, 그때그때 재계산). ---
{
 let g=upgradeGame(newGame('nva',7));
 let commands=0;
 while(g.season<3&&commands<8000){g=next(g);commands++;}
 assert.ok(g.scout&&Object.keys(g.scout).length>0,'경기를 치르면 g.scout이 채워진다');
 // 관측치가 있는 챔피언-역할 하나를 g.scout에서 직접 찾아 교차 검증한다.
 let found=null;
 for(const samples of Object.values(g.scout)){
  for(const s of samples){for(let i=0;i<5;i++){if(s.picks[i]){found={champ:s.picks[i],role:ROLES[i]};break;}} if(found)break;}
  if(found)break;
 }
 assert.ok(found,'테스트 전제: 최소 하나의 실제 픽 표본이 존재함');
 const stat=observedChampStat(g,found.champ,found.role);
 assert.ok(stat.sampleSize>=1);
 assert.ok(stat.wins<=stat.sampleSize&&stat.wins>=0);
 if(stat.sampleSize>=MIN_SAMPLE){
  assert.ok(stat.winRate!==null&&stat.winRate>=0&&stat.winRate<=1,'표본이 충분하면 실제 승률이 계산된다');
  assert.equal(Math.round(stat.winRate*stat.sampleSize),stat.wins,'winRate는 wins/sampleSize와 정확히 일치한다');
 }else{
  assert.equal(stat.winRate,null,'표본이 MIN_SAMPLE 미만이면 여전히 표본 부족으로 표시한다');
 }
}

// --- 3. 순수 읽기 전용 — 관측 통계를 계산해도 g.scout/g.replays를 전혀 건드리지 않는다. ---
{
 let g=upgradeGame(newGame('nva',9));
 let commands=0;
 while(g.season<2&&commands<3000){g=next(g);commands++;}
 const before=JSON.stringify({scout:g.scout,replays:g.replays});
 observedChampStat(g,'Tfiora','TOP');
 observedTeamStats(g,['Tfiora','Jvi','Mzed','Acaitlyn','Sthresh']);
 const after=JSON.stringify({scout:g.scout,replays:g.replays});
 assert.equal(after,before,'관측 통계 계산은 g.scout/g.replays를 절대 변경하지 않는다(순수 함수)');
}

// --- 4. 관측 승률(observed)과 모델 조합 전망(compositionPlan/design value)은 서로 다른 출처이며
//        한쪽 계산이 다른 쪽 출력에 영향을 주지 않는다(완전 분리 — 완료 조건). ---
{
 const g=upgradeGame(newGame('nva',11));
 const picks=['Tfiora','Jvi','Mzed','Acaitlyn','Sthresh'];
 const plan1=compositionPlan(picks);
 observedTeamStats(g,picks); // 관측치를 먼저 읽어도
 const plan2=compositionPlan(picks);
 assert.deepEqual(plan1,plan2,'observed.ts를 호출해도 composition.ts의 설계값 계산 결과는 전혀 안 바뀐다');
}

// --- 5. 5인 완전 조합 단위의 승률 집계 함수는 의도적으로 존재하지 않는다(희소 표본을 숫자로
//        지어내는 대신, 그 집계 자체를 코드 경로에서 없앤다). ---
{
 const {default: mod}=await import('../lib/balance/observed.ts').then(m=>({default:m}));
 const exportedNames=Object.keys(mod);
 assert.ok(!exportedNames.some(k=>/fiveStack|fullComp|lineupWinRate/i.test(k)),'5인 조합 단위 승률 집계는 v1 범위 밖으로 실제로 존재하지 않는다');
}

console.log('PASS observed-stats: 표본 부족 폴백(null), 실제 g.scout 기반 재계산, 순수 함수(무변경), composition.ts와 완전 분리, 5인 조합 집계 미구현 확인');
