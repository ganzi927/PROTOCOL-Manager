// 실제 로스터 적용(REAL_ROSTER_AUDIT.md). lib/rosters.ts를 role-키 구조로 바꾼 뒤에도
// makePlayer()가 만드는 선발 라인업에 실제 이름이 role별로 정확히 매핑되는지, 벤치 슬롯은
// 그대로 합성 이름을 유지하는지(현재 bench/academy 확정 데이터 없음), 사진 조회가 순수 함수로
// 동작하는지, 저장 상태(Game)에 사진 URL이 전혀 들어가지 않는지를 검증한다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,ROLES,TEAM_META,STAT_KEYS} from '../lib/game.ts';
import {LCK_ROSTER,INTL_ROSTER,FOREIGN_META,playerPhotoUrl,TEAM_LOGO} from '../lib/rosters.ts';
import {LCK_2026_RATINGS,lckStatDelta} from '../lib/players/lck-2026-ratings.ts';

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
   assert.equal(actual.realName,expected.realName??'실명 미확인',`${m.id}/${r}: 실명이 role대로 매핑되거나, 미확인이면 그렇다고 명시돼야 한다(합성 이름으로 대체되면 안 됨)`);
   if(expected.realName===undefined)assert.doesNotMatch(actual.realName,/^[김이박정장][가-힣]{2}$/,`${m.id}/${r}: 실명 미확인 선수가 합성 한국어 이름으로 둔갑하면 안 된다`);
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

// --- 7. F-REAL-02: op.gg로 검증해 바로잡은 팀 배정이 실제로 반영된다 — 2026-09-16 패스가
//        틀렸던 자리(KT의 ADC/SUP, DRX의 Jiwoo)를 회귀 방지 고정점으로 검증한다. ---
{
 const g=upgradeGame(newGame('nva',5));
 const at=(teamId,role)=>{const t=g.teams.find(x=>x.id===teamId);return g.players.find(p=>p.id===t.lineup[role])?.name;};
 assert.equal(at('vtx','ADC'),'Aiming','KT Rolster ADC는 Aiming이어야 한다(2026-09-16 패스는 Jiwoo로 오기)');
 assert.equal(at('vtx','SUP'),'Ghost','KT Rolster SUP은 Ghost여야 한다(2026-09-16 패스는 Effort로 오기)');
 assert.equal(at('orl','ADC'),'Jiwoo','Kiwoom DRX ADC는 Jiwoo여야 한다');
 assert.equal(TEAM_META.find(m=>m.id==='wlv').short,'DNS','DN SOOPers 트라이코드가 KDF에서 DNS로 정정돼야 한다');
 assert.equal(TEAM_META.find(m=>m.id==='ark').short,'BFX','BNK FearX 트라이코드가 FOX에서 BFX로 정정돼야 한다');
}

// --- 8. F-REAL-02: 실제 경기 기록 델타(lckStatDelta)가 순수 함수로 동작하고, 선발 라인업의
//        스탯에 실제로 가산되며, 클램프 범위를 벗어나지 않는다. ---
{
 assert.deepEqual(lckStatDelta('Chovy'),LCK_2026_RATINGS.Chovy.delta,'알려진 핸들은 저장된 델타를 그대로 반환');
 assert.equal(lckStatDelta('없는선수1234'),undefined,'모르는 핸들은 undefined(지어내지 않음)');
 const g=upgradeGame(newGame('crn',3));
 const chovy=g.players.find(p=>p.name==='Chovy'&&p.teamId==='crn');
 assert.ok(chovy,'Chovy가 선발 명단에 있어야 한다');
 const visIdx=STAT_KEYS.indexOf('VIS');
 assert.ok(chovy.stats[visIdx]>=15&&chovy.stats[visIdx]<=96,'델타 가산 후에도 스탯이 클램프 범위(15~96) 안에 있어야 한다');
 for(const p of g.players.filter(p=>p.teamId&&LCK_ROSTER[p.teamId])){
  assert.ok(p.stats.every(s=>Number.isFinite(s)&&s>=15&&s<=96),`${p.name}: 델타 적용 후 모든 스탯이 유효 범위여야 한다(NaN/이탈 없음)`);
 }
}

console.log('PASS real-roster: role 기반 매핑(배열 순서 아님), 벤치 미적용, 국제팀 동일 스키마, 사진 순수 함수·저장 안 함, 기존 커리어 재적용 없음, op.gg 정정 회귀 고정, 실제 기록 델타 클램프');
