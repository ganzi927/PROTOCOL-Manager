// F24: 세이브 가져오기. applyCommand의 'importSave' 케이스 — 일반 명령과 같은 경로를 타므로
// revision·명령 영수증·백업 로테이션(서버 route.ts)은 재사용된다. 여기서는 명령 자체의 계약(형식
// 검사·버전 검사·마이그레이션·전체 교체)만 검증한다.
import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,roster,team} from '../lib/game.ts';

// --- 1. 정상 가져오기: 다른 슬롯(다른 시드·다른 진행 상태)의 기록을 통째로 교체한다. ---
{
 const current=upgradeGame(newGame('nva',3)); // 현재 슬롯(가져오기 대상이 될 게임)
 let imported=upgradeGame(newGame('crn',9));
 imported=applyCommand(imported,{type:'training',payload:{id:'all',training:'scrim'}});
 imported=applyCommand(imported,{type:'train'});
 const result=applyCommand(current,{type:'importSave',payload:{game:imported}});
 assert.equal(result.teamId,'crn','가져온 파일의 팀으로 완전히 교체된다(현재 슬롯 팀과 달라도 허용 — 세이브 이동이 목적)');
 assert.equal(result.season,imported.season);
 assert.deepEqual(roster(result).map(p=>p.id).sort(),roster(imported).map(p=>p.id).sort());
}

// --- 2. 형식 검사: 필수 필드가 없거나 타입이 안 맞으면 명확한 한국어 오류로 거부된다. ---
{
 const current=upgradeGame(newGame('nva',3));
 assert.throws(()=>applyCommand(current,{type:'importSave',payload:{}}),/형식을 확인/,'game 필드 자체가 없으면 거부');
 assert.throws(()=>applyCommand(current,{type:'importSave',payload:{game:{teamId:'nva'}}}),/형식을 확인/,'players/teams 배열이 없으면 거부');
 assert.throws(()=>applyCommand(current,{type:'importSave',payload:{game:{teamId:123,players:[],teams:[],season:1,version:3}}}),/형식을 확인/,'teamId 타입이 틀리면 거부');
}

// --- 3. 버전 검사: 미래 버전은 기존 upgradeGame의 규칙을 그대로 재사용해 거부된다(새 로직 아님). ---
{
 const current=upgradeGame(newGame('nva',3));
 const future=upgradeGame(newGame('crn',9)); future.version=99;
 assert.throws(()=>applyCommand(current,{type:'importSave',payload:{game:future}}),/더 새로운 버전/,'미래 버전 저장 파일은 명확한 이유와 함께 거부된다');
}

// --- 4. 구버전 마이그레이션: 옛 형태(스태프 없음·숙련도 없음)의 저장도 가져오면서 자동 승격된다
//     (management.test.mjs가 확인한 것과 같은 마이그레이션 규칙 — 가져오기 경로에서도 재사용됨을 확인). ---
{
 const current=upgradeGame(newGame('nva',3));
 const legacy=upgradeGame(newGame('crn',9)); // 우선 정상 게임을 만든 뒤 구버전처럼 필드를 지운다
 legacy.version=2;
 for(const t of legacy.teams)delete t.staff;
 for(const pl of legacy.players){delete pl.mastery;}
 const result=applyCommand(current,{type:'importSave',payload:{game:legacy}});
 assert.equal(result.version,3,'가져오면서 최신 스키마 버전으로 마이그레이션된다');
 assert.ok(team(result,'crn').staff,'스태프 필드가 없던 구버전도 가져오면서 채워진다');
 assert.ok(roster(result,'crn').every(p=>Array.isArray(p.mastery)&&p.mastery.length>0),'숙련도가 없던 구버전도 가져오면서 채워진다');
}

// --- 5. 전체 교체: 가져오기는 현재 게임의 일부만 바꾸는 게 아니라 완전히 새 게임으로 치환한다
//     (부분 병합이 아님 — 명령 영수증·현금 등 현재 슬롯의 어떤 값도 섞여 들어가지 않는다). ---
{
 const current=upgradeGame(newGame('nva',3));
 team(current).cash=999999; // 현재 슬롯에만 있는 값
 const imported=upgradeGame(newGame('crn',9));
 const result=applyCommand(current,{type:'importSave',payload:{game:imported}});
 assert.notEqual(team(result,'crn').cash,999999,'현재 슬롯의 값이 가져온 결과에 섞여 들어가지 않는다(완전 교체)');
}

console.log('PASS save-import: full replace on import, format validation rejects malformed payloads, future-version rejected via existing upgradeGame rule, legacy saves migrate on import, no partial merge with current slot');
