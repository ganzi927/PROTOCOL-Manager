// 실제 로스터 적용(REAL_ROSTER_AUDIT.md). lib/rosters.ts를 role-키 구조로 바꾼 뒤에도
// makePlayer()가 만드는 선발 라인업에 실제 이름이 role별로 정확히 매핑되는지, 벤치 슬롯은
// 그대로 합성 이름을 유지하는지(현재 bench/academy 확정 데이터 없음), 사진 조회가 순수 함수로
// 동작하는지, 저장 상태(Game)에 사진 URL이 전혀 들어가지 않는지를 검증한다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,ROLES,TEAM_META} from '../lib/game.ts';
import {LCK_ROSTER,INTL_ROSTER,FOREIGN_META,playerPhotoUrl,TEAM_LOGO} from '../lib/rosters.ts';

// --- 1. 국내(LCK) 선발 5인이 role별로 정확한 실명·핸들을 받는다(배열 순서가 아니라 role 매칭). ---
{
 const g=upgradeGame(newGame('nva',7));
 for(const m of TEAM_META){
  const roster=LCK_ROSTER[m.id];
  assert.ok(roster,`${m.id}의 LCK_ROSTER 항목이 있어야 한다`);
  for(const r of ROLES){
   const expected=roster.players.find(p=>p.role===r&&p.status==='starter');
   const startId=g.teams.find(t=>t.id===m.id)?.lineup[r];
   const actual=g.players.find(p=>p.id===startId);
   assert.ok(expected&&actual,`${m.id}/${r}: 선발과 로스터 데이터가 모두 있어야 한다`);
   assert.equal(actual.name,expected.handle,`${m.id}/${r}: 핸들이 role대로 매핑돼야 한다`);
   assert.equal(actual.realName,expected.realName,`${m.id}/${r}: 실명이 role대로 매핑돼야 한다`);
   assert.equal(actual.role,r,'선수 자신의 role도 일치해야 한다');
  }
 }
}

// --- 2. 벤치 슬롯(선발 아님)은 확정 bench/academy 데이터가 없으므로 합성 이름을 유지한다 —
//        role 매핑이 "등록 5인"에 대한 것만 적용되고 조용히 다른 선수에 새는 일이 없어야 한다. ---
{
 const g=upgradeGame(newGame('nva',11));
 const t1Roster=g.players.filter(p=>p.teamId==='nva');
 assert.equal(t1Roster.length,7,'도메스틱 팀은 7명(선발5+벤치2) 생성');
 const starterHandles=new Set(LCK_ROSTER.nva.players.filter(p=>p.status==='starter').map(p=>p.handle));
 const benchPlayers=t1Roster.filter(p=>!starterHandles.has(p.name));
 assert.equal(benchPlayers.length,2,'벤치 2명은 실제 핸들을 갖지 않는다(확정 bench 데이터 없음)');
}

// --- 3. 국제대회 팀도 같은 TeamRosterEntry 스키마로 role 매칭된다. ---
{
 const g=upgradeGame(newGame('nva',7));
 const foreign=FOREIGN_META[0];
 const roster=INTL_ROSTER[foreign.id];
 for(const r of ROLES){
  const expected=roster.players.find(p=>p.role===r&&p.status==='starter');
  const t=g.teams.find(x=>x.id===foreign.id);
  const actual=g.players.find(p=>p.id===t.lineup[r]);
  assert.equal(actual.name,expected.handle,`${foreign.id}/${r}: 국제팀도 role 매칭이 맞아야 한다`);
 }
}

// --- 4. 사진 조회는 순수 함수 — 알려진 핸들은 URL을, 모르는 핸들은 undefined를 돌려주고
//        Game/Player 저장 상태 어디에도 사진 필드가 저장되지 않는다. ---
{
 const g=upgradeGame(newGame('nva',9));
 assert.equal(typeof playerPhotoUrl('Faker'),'string','알려진 선수는 URL 문자열을 반환');
 assert.equal(playerPhotoUrl('없는선수1234'),undefined,'모르는 핸들은 undefined(지어내지 않음)');
 const anyPlayerHasPhotoField=g.players.some(p=>'photo' in p);
 assert.equal(anyPlayerHasPhotoField,false,'사진은 Player 객체에 저장되지 않는다 — 항상 렌더 시점 조회');
}

// --- 5. 팀 로고·선수 사진 URL은 전부 문자열이고 빈 값이 없다(값을 채웠다면 실제로 값이 있어야). ---
{
 for(const [id,url] of Object.entries(TEAM_LOGO))assert.ok(url&&url.startsWith('http'),`${id} 로고 URL이 유효한 형태여야 한다`);
 for(const [handle,url] of Object.entries(playerPhotoUrlTable()))assert.ok(url&&url.startsWith('http'),`${handle} 사진 URL이 유효한 형태여야 한다`);
 function playerPhotoUrlTable(){
  // PLAYER_PHOTO를 직접 export하지 않으므로 알려진 샘플 핸들로 간접 확인.
  const known=['Faker','Gumayusi','Chovy','Doran','Keria','Oner','Peanut','Ruler','Zeus','Bdd'];
  return Object.fromEntries(known.map(h=>[h,playerPhotoUrl(h)]));
 }
}

// --- 6. 기존 커리어(이미 만들어진 세이브)는 로스터 데이터 변경에도 소속·이름이 재적용되지 않는다 —
//        newGame()은 최초 1회만 실행되므로, 이미 만들어진 Player 객체를 다시 순회해 덮어쓰는
//        코드 경로가 없어야 한다(구조적 보장, F26/F27과 동일 패턴). ---
{
 const g1=upgradeGame(newGame('nva',13));
 const before=JSON.stringify(g1.players.filter(p=>p.teamId==='nva').map(p=>({id:p.id,name:p.name,realName:p.realName})));
 const g2=upgradeGame(JSON.parse(JSON.stringify(g1))); // 저장→재적용 왕복
 const after=JSON.stringify(g2.players.filter(p=>p.teamId==='nva').map(p=>({id:p.id,name:p.name,realName:p.realName})));
 assert.equal(after,before,'upgradeGame을 다시 돌려도 이미 생성된 국내 선수의 이름은 그대로다');
}

console.log('PASS real-roster: role 기반 매핑(배열 순서 아님), 벤치 미적용, 국제팀 동일 스키마, 사진 순수 함수·저장 안 함, 기존 커리어 재적용 없음');
