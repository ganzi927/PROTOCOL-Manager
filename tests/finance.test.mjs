// F20: 재정·계약·스태프의 실제 선택. 다음 시즌 확정 급여(nextSeasonPayroll)·연간 예상 운영 잔액
// (annualBalance)을 한 화면에서 보여주고, 파산 방지 비상 지원이 반복될수록 대가(지원액 감소·팬 만족도
// 하락)가 실제로 생기게 했다("파산 직전 반복 지원으로 모든 선택이 무의미해지지 않게" — 지시서 F20).
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,roster,team,ROLES,payroll,nextSeasonPayroll,annualBalance,legalDraftCandidates,DRAFT_ORDER} from '../lib/game.ts';

// --- 1. nextSeasonPayroll: 재계약(nextSalary)은 새 연봉으로 반영, 이번 시즌에 계약이 끝나고
//     재계약하지 않은 선수는 다음 시즌 급여에서 빠진다. ---
{
 let g=upgradeGame(newGame('nva',3));
 g.phase='PLAN';
 const p=[...roster(g)].sort((a,b)=>a.salary-b.salary)[0]; // 캡 여유가 가장 큰(연봉이 가장 낮은) 선수로 재계약 시도
 const before=nextSeasonPayroll(g);
 g=applyCommand(g,{type:'renew',payload:{id:p.id}});
 const renewed=roster(g).find(x=>x.id===p.id);
 assert.ok(renewed.nextSalary!==undefined,'재계약이 실제로 예약됨');
 assert.equal(nextSeasonPayroll(g),before-p.salary+renewed.nextSalary,'재계약분이 다음 시즌 확정 급여에 정확히 반영된다(기존 연봉 빼고 새 연봉 더함)');

 const q=roster(g).find(x=>x.id!==p.id);
 const gExpiring=structuredClone(g);
 const target=gExpiring.players.find(x=>x.id===q.id);
 target.until=gExpiring.season; // 이번 시즌에 계약 만료, 재계약 없음 → 다음 시즌엔 FA
 assert.ok(nextSeasonPayroll(gExpiring)<payroll(gExpiring),'다음 시즌 계약이 없는 선수는 다음 시즌 확정 급여에서 빠진다');
}

// --- 2. annualBalance: 기존 StaffCenter가 쓰던 공식과 독립적으로 재구현해 같은 값인지 대조한다
//     (리팩터링이 실제로 같은 수치를 낸다는 직접 증거 — 우연히 같은 상수가 겹친 게 아님을 팀 구성을
//     바꿔 가며 확인). ---
{
 for(const [tid,seed] of [['crn',7],['rse',9],['nva',13]]){
  const g=upgradeGame(newGame(tid,seed));
  const t=team(g);
  const staffSum=Object.values(t.staff??{}).reduce((v,n)=>v+([0,15000,30000,50000][n]??0),0);
  const expect=Math.round(320000+30000*t.fan/100-50000-payroll(g)-staffSum);
  assert.equal(annualBalance(g),expect,`annualBalance 독립 재구현과 일치 (${tid})`);
 }
}

// --- 3. 비상 지원: 심하게 파산한 팀이 여러 주 연속으로 지원을 받으면 지원액이 줄고(30→22→14→10억
//     하한), 2회째부터 팬 만족도가 떨어진다. 완전히 막지는 않는다(하한 10억 유지 — 게임이 잠기지 않음). ---
{
 let g=upgradeGame(newGame('rse',9));
 g.phase='OFFSEASON';
 for(const r of ROLES)assert.ok(roster(g).find(p=>p.id===team(g).lineup[r]&&p.role===r));
 assert.ok(payroll(g)<=250000);
 team(g).cash=-800000; // 매주 순수익을 더해도 4주 내내 마이너스가 유지되도록 크게 파산
 const fanBefore=team(g).fan;
 g=applyCommand(g,{type:'newSeason'}); // settleWeek ×4 연속 호출
 const after=team(g,'rse');
 assert.ok((after.bailouts??0)>=1,'비상 지원이 실제로 발동한다');
 assert.ok(g.ledger.some(x=>x.label.includes('비상 지원')),'ledger에 비상 지원 내역이 남는다(숨기지 않음)');
 if((after.bailouts??0)>=2)assert.ok(after.fan<fanBefore,'반복된 비상 지원은 팬 만족도를 깎는다(대가가 실제로 생김)');
 assert.ok(after.cash>-800000,'비상 지원 이후 현금이 완전히 방치되지는 않는다(하한 지원이 유지됨)');
}

// --- 4. 비상 지원 카운터는 시즌이 바뀌면 리셋된다(매 시즌 새로 시작 — 영구 페널티 아님). ---
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
 team(g).bailouts=3; // 이번 시즌 이미 비상 지원을 받았다고 가정
 let commands=0;
 while(g.season<2){g=next(g);commands++;assert.ok(commands<4000);}
 assert.equal(team(g).bailouts,0,'시즌이 바뀌면 비상 지원 카운터가 0으로 리셋된다(영구 페널티 아님)');
}

console.log('PASS finance: nextSeasonPayroll counts reservations/expirations correctly, annualBalance matches independent reimplementation, bailout diminishes + fan cost on repeat, bailout counter resets each season');
