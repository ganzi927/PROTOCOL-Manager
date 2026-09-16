// F25: 연습 모드. sandboxMatch는 simulateSet(순수 계산)만 쓰고 finishMatch를 부르지 않는다 — 그래서
// 시즌 기록·선수 상태·팀 승패에 구조적으로 안 섞인다. 여기서는 그 경계와 시드 재현성을 검증한다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand} from '../lib/game.ts';

// --- 1. 검증: 서로 다른 실존 팀만 허용, 시드는 정수만. ---
{
 const g=upgradeGame(newGame('nva',3));
 assert.throws(()=>applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'nva',seed:1}}),/서로 다른/,'같은 팀끼리는 거부');
 assert.throws(()=>applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'no-such-team',seed:1}}),/서로 다른/,'존재하지 않는 팀은 거부');
 assert.throws(()=>applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'crn',seed:'x'}}),/시드/,'정수가 아닌 시드는 거부');
}

// --- 2. 시즌 기록·선수 상태·팀 승패에 전혀 섞이지 않는다(본 시즌과 완전 분리). ---
{
 const g=upgradeGame(newGame('nva',3));
 const beforeHistory=JSON.stringify(g.history);
 const beforePlayers=JSON.stringify(g.players.map(p=>({id:p.id,stats:p.stats,burn:p.burn,form:p.form,mastery:p.mastery,pog:p.pog})));
 const beforeTeams=JSON.stringify(g.teams.map(t=>({id:t.id,wins:t.wins,losses:t.losses,sw:t.sw,sl:t.sl})));
 const beforeRound=g.round,beforeSeason=g.season,beforePhase=g.phase;
 const result=applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'crn',seed:42}});
 assert.equal(JSON.stringify(result.history),beforeHistory,'g.history 무변화');
 assert.equal(JSON.stringify(result.players.map(p=>({id:p.id,stats:p.stats,burn:p.burn,form:p.form,mastery:p.mastery,pog:p.pog}))),beforePlayers,'선수 상태(스탯·번아웃·폼·숙련·POG) 무변화');
 assert.equal(JSON.stringify(result.teams.map(t=>({id:t.id,wins:t.wins,losses:t.losses,sw:t.sw,sl:t.sl}))),beforeTeams,'팀 승패 무변화');
 assert.equal(result.round,beforeRound);assert.equal(result.season,beforeSeason);assert.equal(result.phase,beforePhase);
 assert.ok(result.sandboxLast,'sandboxLast에만 결과가 저장된다');
 assert.equal(result.sandboxLast.a,'nva');assert.equal(result.sandboxLast.b,'crn');assert.equal(result.sandboxLast.seed,42);
 assert.ok(result.sandboxLast.result.winner==='nva'||result.sandboxLast.result.winner==='crn','승자는 둘 중 하나');
}

// --- 3. 같은 매치업·같은 시드는 항상 같은 결과(재현 가능 — "같은 조건을 다시 비교"). ---
{
 const g=upgradeGame(newGame('nva',3));
 const r1=applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'crn',seed:7}});
 const r2=applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'crn',seed:7}});
 assert.deepEqual(r1.sandboxLast.result,r2.sandboxLast.result,'같은 팀·같은 시드는 결정적으로 동일한 결과');
}

// --- 4. 시드를 바꾸면 실제로 다른 결과가 나온다(고정된 "가짜 재생"이 아니라 매번 실제로 다시 계산됨). ---
{
 const g=upgradeGame(newGame('nva',3));
 const results=[];
 for(let seed=0;seed<20;seed++)results.push(JSON.stringify(applyCommand(g,{type:'sandboxMatch',payload:{a:'nva',b:'crn',seed}}).sandboxLast.result));
 assert.ok(new Set(results).size>1,'20개 시드 중 적어도 두 결과는 서로 다르다(매 실행이 실제로 재계산됨)');
}

console.log('PASS sandbox: rejects invalid/same teams, fully isolated from season/player/team state, deterministic per seed, runs across many seeds without error');
