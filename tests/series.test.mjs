// F21: 세트 사이 적응. 같은 시리즈(m.sets) 안에서 실제로 관측된 결과만 신호로 써서 AI의 밴/픽
// 우선순위를 조정한다(하드 배제 아님 — 피어리스 드래프트는 이 게임이 지원하지 않는다). 세트 종료만으로
// 선수 컨디션·숙련·규칙상 사용 가능 픽이 잘못 바뀌지 않는지도 함께 확인한다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,legalDraftCandidates,DRAFT_ORDER,CHAMPIONS,seriesSignal,roster} from '../lib/game.ts';

const fakeSet=(winner,picksA,picksB)=>({winner,draft:{picksA,picksB,bans:[],actions:[]},events:[],recap:[],pog:'',powersA:[0,0,0,0,0],powersB:[0,0,0,0,0],lineupA:[],lineupB:[]});

// --- 1. seriesSignal: 순수 함수 — 진 세트의 내 픽만 myLossChamps, 상대가 이긴 세트의 상대 픽만
//     oppWinChamps에 들어간다. 내가 이긴 세트는 어느 쪽도 신호에 안 들어간다. ---
{
 const picksA=['a1','a2','a3','a4','a5'],picksB=['b1','b2','b3','b4','b5'];
 const lostMatch={id:'m',a:'nva',b:'crn',sets:[fakeSet('crn',picksA,picksB)]};
 const sig=seriesSignal(lostMatch,'nva');
 assert.deepEqual([...sig.oppWinChamps].sort(),picksB.sort(),'상대가 이긴 세트의 상대 픽만 oppWinChamps');
 assert.deepEqual([...sig.myLossChamps].sort(),picksA.sort(),'내가 진 세트의 내 픽만 myLossChamps');

 const wonMatch={id:'m',a:'nva',b:'crn',sets:[fakeSet('nva',picksA,picksB)]};
 const sig2=seriesSignal(wonMatch,'nva');
 assert.equal(sig2.oppWinChamps.size,0,'내가 이긴 세트는 상대 신호 없음');
 assert.equal(sig2.myLossChamps.size,0,'내가 이긴 세트는 내 패배 신호 없음');

 const empty=seriesSignal({id:'m',a:'nva',b:'crn',sets:[]},'nva');
 assert.equal(empty.oppWinChamps.size,0);assert.equal(empty.myLossChamps.size,0);
}

// --- 2. 드래프트 실전 구동: 시리즈 신호가 있으면(상대가 세트1에서 특정 챔피언으로 이김) AI가 세트2에서
//     그 챔피언을 밴할 확률이 신호 없을 때보다 뚜렷이 높다. ---
{
 const N=200;
 const driveDraft=(g)=>{
  let s=applyCommand(g,{type:'startDraft'});let guard=0;
  while(s.phase==='DRAFT'&&s.match.draftState&&!s.match.draftState.complete){
   assert.ok(guard++<12);
   const ds=s.match.draftState;const cands=legalDraftCandidates(s,ds);const kind=DRAFT_ORDER[ds.step][1];
   let champ=cands[0].id;
   if(kind==='PICK'){const mine=ds.blue===s.teamId?ds.picksBlue:ds.picksRed;const covered=new Set(mine.map(x=>x.role));const pref=cands.find(c=>!covered.has(c.role));if(pref)champ=pref.id;}
   s=applyCommand(s,{type:'draftPick',payload:{champ}});
  }
  return s.match.draftState;
 };
 const setup=(seed,priorSets)=>{
  let g=upgradeGame(newGame('nva',seed));
  g.phase='PREP';
  g.match={id:'series-test-'+seed,a:'nva',b:'crn',bestOf:3,scoreA:priorSets.filter(s=>s.winner==='nva').length,scoreB:priorSets.filter(s=>s.winner==='crn').length,sets:priorSets,label:'TEST'};
  return g;
 };
 const target=CHAMPIONS.find(c=>c.role==='ADC').id; // 검증 대상 챔피언(사용자가 세트1에서 승리에 썼다고 가정)
 const restA=CHAMPIONS.filter(c=>c.role!=='ADC').slice(0,4).map(c=>c.id);
 const restB=CHAMPIONS.slice(20,25).map(c=>c.id);
 const banRate=(withSignal)=>{
  let banned=0;
  for(let seed=1;seed<=N;seed++){
   const priorSets=withSignal?[fakeSet('nva',[target,...restA],restB)]:[];
   const ds=driveDraft(setup(seed,priorSets));
   const crnSide=ds.blue==='crn'?'B':'R';
   if(ds.bans.some(b=>b.side===crnSide&&b.champ===target))banned++;
  }
  return banned/N;
 };
 const baseline=banRate(false), withSignal=banRate(true);
 assert.ok(withSignal>baseline+0.15,`시리즈 신호가 있으면 상대가 이긴 챔피언의 밴율이 뚜렷이 오른다: 신호 없음 ${(baseline*100).toFixed(1)}% → 신호 있음 ${(withSignal*100).toFixed(1)}%`);
 assert.ok(withSignal<1,'하드 배제가 아니다 — 밴율이 100%로 고정되지는 않는다(피어리스 아님, 확률적 우선순위일 뿐)');

 // PICK 쪽도 같은 방식으로 확인한다: crn(AI)의 ADC 선수가 target에 Lv4 숙련을 갖도록 강제해 baseline
 // 픽률을 높게 만든 뒤, "이 챔피언으로 진 세트가 있다"는 신호를 주면 픽률이 뚜렷이 낮아진다(0으로
 // 떨어지지는 않는다 — 감점일 뿐 하드 배제가 아니다).
 const pickRate=(withSignal)=>{
  let picked=0;
  for(let seed=1;seed<=N;seed++){
   const g=upgradeGame(newGame('nva',seed));g.phase='PREP';
   const adc=roster(g,'crn').find(p=>p.role==='ADC');
   adc.mastery=[{champ:target,level:4,xp:0},...adc.mastery.filter(m=>m.champ!==target)];
   const priorSets=withSignal?[fakeSet('nva',restB.slice(0,4),[target,...restA.slice(0,4)])]:[];
   g.match={id:'series-pick-test-'+seed,a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:priorSets,label:'TEST'};
   const ds=driveDraft(g);
   const crnPicks=ds.blue==='crn'?ds.picksBlue:ds.picksRed;
   if(crnPicks.some(p=>p.champ===target))picked++;
  }
  return picked/N;
 };
 const pickBase=pickRate(false), pickWith=pickRate(true);
 assert.ok(pickBase>0.6,`전제 확인: 숙련이 강제된 챔피언은 신호 없이도 대개 선택된다(테스트가 실제로 뭔가를 재는지 확인): ${(pickBase*100).toFixed(1)}%`);
 assert.ok(pickWith<pickBase-0.2,`우리 팀이 이 챔피언으로 진 세트가 있으면 AI의 재선택률이 뚜렷이 낮아진다: ${(pickBase*100).toFixed(1)}% → ${(pickWith*100).toFixed(1)}%`);
 assert.ok(pickWith>0,'하드 배제가 아니다 — 픽률이 0%로 고정되지는 않는다(숙련이 워낙 높으면 그래도 다시 고를 수 있다)');
}

// --- 3. 세트 종료만으로 선수 컨디션·숙련이 잘못 초기화되지 않는다. 세트1에서 쓴/밴한 챔피언도
//     세트2 드래프트에서는 다시 합법 후보다(피어리스 미지원 — 세트마다 밴 풀이 새로 열린다). ---
{
 let g=upgradeGame(newGame('nva',5));
 g.phase='PREP';
 const p=roster(g)[0];
 const beforeForm=p.form,beforeBurn=p.burn,beforeMastery=p.mastery.map(m=>[m.champ,m.level,m.xp]);
 const usedChamp=CHAMPIONS[0].id;
 g.match={id:'series-cond-test',a:'nva',b:'crn',bestOf:3,scoreA:1,scoreB:0,sets:[fakeSet('nva',[usedChamp,'x2','x3','x4','x5'],['y1','y2','y3','y4','y5'])],label:'TEST'};
 const s=applyCommand(g,{type:'startDraft'});
 const p2=s.players.find(x=>x.id===p.id);
 assert.equal(p2.form,beforeForm,'드래프트 진입만으로 폼이 바뀌지 않는다');
 assert.equal(p2.burn,beforeBurn,'드래프트 진입만으로 번아웃이 바뀌지 않는다');
 assert.deepEqual(p2.mastery.map(m=>[m.champ,m.level,m.xp]),beforeMastery,'드래프트 진입만으로 숙련도가 바뀌지 않는다');
 const cands=legalDraftCandidates(s,s.match.draftState);
 assert.ok(cands.some(c=>c.id===usedChamp),'세트1에서 쓴 챔피언도 세트2 드래프트에서 다시 합법 후보다(피어리스 미지원)');
}

console.log('PASS series: seriesSignal pure derivation, AI ban rate shifts with real series signal (not hard exclusion), set-transition preserves condition/mastery and re-opens champion pool');
