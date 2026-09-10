# 개발 가이드

## 구조
| 파일 | 책임 |
|---|---|
| app/page.tsx | 게임 진입 |
| app/manager.tsx | 주요 화면, 명령 요청·저장 충돌 처리, LiveDraft/DraftSummary/GoldGraph |
| app/expansion.tsx | 스태프·트레이드·국제대회 화면 |
| app/globals.css | 디자인 토큰, 반응형, 밴픽·골드 그래프 스타일 |
| lib/game.ts | 타입, applyCommand, 시뮬레이션, 시즌·경제·숙련·밴픽·세이브 업그레이드 |
| lib/champions.ts | 140챔피언, primary/flex, 피해유형·태그·이미지 URL |
| lib/rosters.ts | 팀 표시 메타와 실존 선수명 매핑 |
| app/api/game/route.ts | 계정별 슬롯 CRUD, revision, idempotency, 자동 백업 |
| db/store.ts | cloudflare:workers의 env.DB 접근 |
| db/schema.ts / drizzle/ | SQLite 스키마와 0000/0001 적용 기록 |
| build/sites-vite-plugin.ts | 개발용 로컬 인증과 빌드 보조 |
| vite.config.ts | Vinext, Sites, Cloudflare 플러그인 및 로컬 바인딩 |
| scripts/execution-profile.mjs | portable / managed-linux 선택 |
| docs/GDD.html | 이전 확장 기획서. 현행 코드와 다른 부분은 CURRENT_STATE/GAME_RULES를 참고 |

## 실행 경로
Windows 로컬의 깨끗한 복제본은 portable 기본값이다. `npm run dev`는 Vinext CLI, 기본 5173 포트를 사용한다. managed-linux는 제공된 관리 환경용으로 Vite 및 제한된 빌드 스크립트를 쓴다. Claude가 개발 PC에서 이전 /workspace 또는 /root 경로를 그대로 실행하게 하지 않는다.

설치·D1 초기화·개발 서버 명령은 START_HERE.md에 있다. 새 DB용 wrangler.local.jsonc는 이번 인수인계에서 추가했으며 실제 사용자 PC의 적용 상태는 확인하지 않았다.

## 변경 흐름
1. 요청에 대응하는 BACKLOG 항목을 고르거나 추가한다. 현재 코드와 차이를 좁힌다.
2. 관련 파일을 읽고 기존 동작이 어디서 결정되는지 확인한다.
3. 최소 변경을 한다. 기존 데이터·UI·계약·국제대회 기능을 삭제하지 않는다.
4. 상태/수치 변경은 엔진, 표현 변경은 UI, 타입/스키마 변경은 저장 호환성까지 반영한다.
5. 실제 위험에 대응하는 테스트·타입·필요한 빌드를 실행한다.
6. HANDOFF/SESSION_LOG/BACKLOG를 실제 결과로 갱신한다.

## API 계약
GET `/api/game?slot=1`은 game/revision/updatedAt/restorePoints를 반환한다. POST의 예:
```json
{"slot":1,"revision":12,"commandId":"새 명령의 고유 ID","command":{"type":"draftPick","payload":{"champ":"Acaitlyn"}}}
```
- 같은 행동의 네트워크 재시도는 같은 commandId와 payload를 사용한다.
- 다른 행동은 새 commandId를 사용한다.
- 409는 충돌이다. 최신 데이터를 반영하거나 다시 불러온 뒤 사용자에게 상태를 표시한다.
- 최근 명령 영수증 40개, 백업 3개를 보관한다. 영구 중복방지 로그가 아니다.
- owner+slot이 저장 키다. 클라이언트가 owner를 고르도록 바꾸지 않는다.
- 서버 DB의 revision 조건 UPDATE가 동시 수정 여부를 판정한다.

## 인증 경계
현재 API는 Sites가 넣는 `oai-authenticated-user-id` 헤더를 신뢰한다. 이것은 일반 공개 서버에서 클라이언트 헤더를 그대로 신뢰해도 된다는 의미가 아니다. 다른 호스팅으로 옮길 때는 검증된 세션으로 사용자 식별을 교체해야 한다.
로컬 mock 인증은 loopback 호스트/연결 조건과 요청 헤더 제거 로직을 갖고 있다. 그 조건을 무력화해 접속 문제를 해결하지 않는다.

## 저장과 데이터 변경
- `applyCommand`는 입력을 structuredClone한 뒤 upgradeGame을 적용한다.
- `version=3`의 현재 스키마는 mastery 배열이다. 과거 ChatGPT 작업본도 3을 썼지만 다른 타입이었다. 버전 값만으로 병합하지 않는다.
- champion ID와 team ID는 기존 세이브의 참조다. 이름 교정으로 ID까지 교체하지 않는다.
- 구버전 챔피언 ID의 보존/매핑은 별도 회귀 검증이 필요하다. fallback이 있다고 의미가 보존된 것은 아니다.
- db/schema 변경 시 새 마이그레이션을 생성·검토한다. 이미 적용한 0000/0001을 수정하지 않는다.
- `.wrangler`는 로컬 저장 데이터다. 캐시와 동일하게 취급해 삭제하지 않는다.

## 난수와 중계
`seed + match.id + set index`에서 분리된 draft/outcome/condition/flavor 난수를 사용한다. balance 계산과 flavor 문구를 섞지 않는다. 현재 flavor 난수는 골드 연출과 문구가 함께 소비한다. 문구 수정으로 그래프가 달라지는 문제를 개선할 때도 승부 난수는 보존한다.

## 검사 명령
```text
node scripts/claude-doctor.mjs
node --experimental-strip-types tests/management.test.mjs
node --experimental-strip-types tests/engine.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```
`npm test` 스크립트는 현재 없다. 엔진 테스트는 직접 Node로 실행한다. CSS/문서만 수정했으면 전 시즌 시뮬레이션을 반복할 필요가 없다. lint 스크립트는 존재하나 전체 기존 파일의 lint 통과 여부는 이 인수인계에서 확인하지 않았다.

## 기존 테스트가 증명하지 않는 것
세 시즌/수천 턴 테스트가 통과해도 모든 저장 구버전, 중계 문장 의미, 모바일 터치, 이미지 로딩, 라이브 인증을 보증하지 않는다. 버그에 해당하는 재현을 별도로 추가한다. 결과를 바꾸어 테스트를 맞추기 전에 규칙이 바뀐 것인지 구현이 잘못된 것인지 확인한다.

## 배포
로컬 준비와 라이브 반영은 구분한다. `.openai/hosting.json`의 기존 사이트를 재사용한다. Sites 도구가 없는 Claude 환경에서는 해당 운영 배포를 완료했다고 말하지 않는다. 이 패키지에는 배포 토큰이 없다. 이번 작업은 배포하지 않았다.
