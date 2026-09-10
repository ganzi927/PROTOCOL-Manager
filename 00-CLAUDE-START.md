# 클로드로 이어서 개발하기

이 ZIP은 **사용자 수정본의 소스 + Claude Code 인수인계 설정**이다.
게임 코드를 이전 버전으로 바꾸지 않았으며, 이 패키지를 만드는 과정에서 라이브 사이트도 배포하지 않았다.

## 가장 빠른 시작
1. `PROTOCOL-Manager` 폴더를 압축 해제한다. `package.json`과 `CLAUDE.md`가 같은 폴더에 있어야 한다.
2. Claude Code가 없다면 Windows PowerShell에서 `winget install Anthropic.ClaudeCode`로 설치한 뒤 터미널을 다시 연다.
3. 해당 프로젝트 폴더에서 `claude`를 실행하고 본인의 Claude 계정으로 로그인한다.
4. Claude 안에서 `/protocol-resume`을 입력한다.

Claude Code는 루트 `CLAUDE.md`를 프로젝트 맥락으로 읽는다. `.claude/commands`의 세 명령은 명시적으로 실행하는 재사용 프롬프트다. 자동 외부 작업 서비스가 아니다.
상세 설치·실행 및 기존 폴더에 적용하는 방법은 `docs/claude/START_HERE.md`에 있다.

## 들어 있는 준비물
- `CLAUDE.md`: 세션 시작 시 읽을 핵심 개발 지침
- `docs/claude/DESIGN_GUIDE.md`: 기존 디자인 토큰, 컴포넌트, 모바일·밴픽·중계 UI 기준
- `docs/claude/DEVELOPMENT_GUIDE.md`: 실행, API, DB, 파일별 역할, 테스트와 변경 절차
- `docs/claude/GAME_RULES.md`: 현재 구현된 140챔피언·Lv4 숙련·메타·밴픽 규칙
- `docs/claude/CURRENT_STATE.md`, `BACKLOG.md`: 현재 상태와 우선 작업
- `docs/claude/HANDOFF.md`, `SESSION_LOG.md`, `DECISIONS.md`: 이어받기 기록
- `docs/claude/PROMPTS.md`: Claude Code와 웹 대화에 붙여 넣을 프롬프트
- `.claude/commands/`: 이어하기·체크포인트·검증 명령
- `wrangler.local.jsonc`: 로컬 D1 마이그레이션용 설정. 운영 배포용 아님
- `scripts/claude-doctor.mjs`: 설치 전후 환경 및 준비 파일 확인

## 기존 작업 폴더를 계속 쓸 경우
게임 소스를 다시 덮어쓸 필요가 없다. 이 패키지의 `CLAUDE.md`, `00-CLAUDE-START.md`, `.claude/commands/`, `docs/claude/`, `scripts/claude-doctor.mjs`, `wrangler.local.jsonc`만 기존 `package.json` 옆의 대응 경로로 복사한다. 같은 이름의 개인 설정이 이미 있다면 비교해 합친다. 기존 `.wrangler`의 로컬 세이브는 그대로 둔다.

이 배포용 개발 ZIP에서는 node_modules, dist, .next, .vinext, .wrangler, tsconfig.tsbuildinfo를 제외했다. 원본 업로드 ZIP은 그대로 보존되어 있다. 로컬 DB/세이브가 필요하면 원래 작업 폴더를 사용한다.

Claude 설치·로그인과 실제 PC 실행은 사용자의 컴퓨터에서 진행해야 한다. 이 파일을 열었다고 Claude가 자동 설치되거나 실행되는 것은 아니다.

참고: [Claude Code 설치](https://code.claude.com/docs/en/quickstart), [CLAUDE.md](https://code.claude.com/docs/en/memory), [사용자 명령](https://code.claude.com/docs/en/skills) — 2026-09-09 확인.
