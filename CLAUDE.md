# PROTOCOL Manager — Claude 작업 지침

한국어로 소통한다. 이 프로젝트는 웹·모바일 반응형 e스포츠 구단 운영 시뮬레이션이다.

## 매 세션 시작
1. `docs/claude/HANDOFF.md`와 `docs/claude/CURRENT_STATE.md`를 먼저 읽는다.
2. 현재 사용자 요청, Git 상태(저장소가 있을 때), 관련 소스의 실제 상태를 확인한다.
3. 필요한 작업의 가이드만 읽는다. GDD 전체·node_modules·dist를 매번 읽지 않는다.
4. 요청이 구현을 뜻하면 계획만 답하지 말고 수정·검증·작업 기록까지 마친다.

## 기준 작업본
- 사용자가 수정해 올린 `PROTOCOL-Manager-Source(2).zip`의 소스가 기준이다.
- 실제 챔피언 **140종**, `lib/champions.ts`, `lib/rosters.ts`를 보존한다.
- 현재 저장 형식: `Player.mastery: {champ,level,xp}[]`, `Game.meta: string[]`, `Match.draftState`.
- 숙련도 Lv0~4와 특훈, 자유 픽·자동 포지션 배정·사용자 스왑을 보존한다.
- 이전 ChatGPT 실험본의 챔피언 60종·mastery 객체·draftChoose API를 덮어쓰지 않는다.
- 코드가 현재 동작의 근거이며, 기획서는 목표다. 둘이 다르면 차이를 기록하고 실제 사용자 요청에 따라 수정한다.

## 작업별 참조
- 실행/Claude 설치: `docs/claude/START_HERE.md`
- 화면/UX/CSS: `docs/claude/DESIGN_GUIDE.md`
- 엔진/API/저장: `docs/claude/DEVELOPMENT_GUIDE.md`
- 실제 수치/명령: `docs/claude/GAME_RULES.md`
- 다음 작업/수락 기준: `docs/claude/BACKLOG.md`
- 세션 전환: `docs/claude/HANDOFF.md`, `docs/claude/SESSION_LOG.md`

## 구현 원칙
- TypeScript strict, React 19, Vinext/Vite, Tailwind 4 및 기존 UI 컴포넌트를 유지한다.
- 승패·자금·선수·밴픽 변경은 `lib/game.ts`의 `applyCommand`가 담당한다.
- 클라이언트는 명령을 전송하고 서버 응답을 표시한다. 화면에서 상태를 임의 확정하지 않는다.
- 시뮬레이션은 시드로 재현 가능해야 한다. 해설/이미지 변경으로 승패 난수를 바꾸지 않는다.
- 저장 버전 숫자만 같다고 데이터가 호환된다고 가정하지 않는다. 데이터 모양도 확인한다.
- 기존 마이그레이션 SQL을 수정하거나 세이브를 삭제해 오류를 숨기지 않는다.
- 패키지 매니저는 npm. 필요한 경우 외에는 package.json/lockfile을 변경하지 않는다.
- 챔피언 그림 로딩 실패 시 현재 문자 폴백과 이름을 유지한다.

## 검증
- 빠른 엔진 기능은 `node --experimental-strip-types tests/management.test.mjs`.
- 경기/밴픽/대회 변경은 `node --experimental-strip-types tests/engine.test.mjs`.
- 타입은 설치 후 `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- 배포용 소스 변경은 `npm run build`. 문서만 변경했으면 불필요하게 빌드하지 않는다.
- 필요한 실패 조건만 추가 검증한다. 실행하지 않은 브라우저·모바일·실서비스 테스트를 통과했다고 쓰지 않는다.

## 작업 경계
- `.openai/hosting.json`은 기존 사이트 식별자다. 새 프로젝트로 초기화하거나 공유 범위를 임의로 바꾸지 않는다.
- 이번 인수인계는 로컬 개발 준비다. 배포 요청이 있으면 연결된 Sites 도구와 기존 식별자로 수행한다. Claude에 해당 도구가 없으면 로컬 결과를 제공하고 배포 제약을 명시한다.
- 외부 배포·DB 파괴·권한 확대는 기존 사용자 승인 범위를 확인한다. 일반적인 소스 수정과 검증은 계속 진행한다.
- 인증 키/세션/로컬 DB 내용을 문서·로그·커밋에 넣지 않는다. 개발용 인증을 운영 인증으로 전용하지 않는다.

## 맥락이 끊겨도 이어가기
- 의미 있는 작업 단위가 끝날 때마다 `HANDOFF.md`를 갱신한다. 토큰이 거의 소진될 때까지 미루지 않는다.
- 목표, 완료, 수정 파일, 테스트 명령/결과, 미완료, 다음 첫 행동을 기록한다.
- 확정 제품 결정은 `DECISIONS.md`, 완료 기록은 `SESSION_LOG.md`, 작업 상태는 `BACKLOG.md`에 남긴다.
- 필요 시 `/protocol-checkpoint`, 새 세션에서 `/protocol-resume`을 실행한다.
- 보고는 실제 완료와 남은 일 중심으로 짧게 한다. 중요 선택 이유는 기록에 남긴다.
