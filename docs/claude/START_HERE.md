# 실행과 Claude Code 시작

## 준비 조건
게임은 HTML 더블클릭 앱이 아니다. Node.js **22.13 이상**과 npm이 필요하다(`package.json.engines`). Claude Code 설치와 게임 의존성 설치는 별개다. Windows는 Git for Windows도 준비하면 소스 비교와 기록 관리에 편하다.

PowerShell에서 확인:
```powershell
node --version
npm --version
git --version
claude --version
```
`node.exe`를 못 찾으면 Node 설치/PATH 문제다. Node를 설치한 뒤 터미널을 다시 연다. PowerShell에서 npm.ps1 실행 정책 오류만 나면 npm 명령 대신 `npm.cmd`를 사용할 수 있다. 시스템 전체 실행 정책을 임의로 풀지 않는다.

Claude 미설치 시:
```powershell
winget install Anthropic.ClaudeCode
```
설치 후 새 터미널에서 프로젝트 폴더로 이동하고 `claude`를 실행한다. 첫 로그인은 브라우저 안내를 따른다. 이 패키지는 Claude 계정이나 API 키를 제공하지 않는다.

## 프로젝트 열기
`PROTOCOL-Manager`가 VS Code와 터미널의 루트가 되게 연다. 바깥 ZIP 폴더나 상위 폴더에서 시작하지 않는다.
```powershell
cd "C:\실제경로\PROTOCOL-Manager"
node scripts/claude-doctor.mjs
claude
```
위 `C:\실제경로`는 본인이 압축 해제한 경로로 바꾼다. Claude 안에서:
```text
/protocol-resume
```
명령이 보이지 않으면 루트 위치와 `.claude/commands/` 복사 여부를 확인하고 Claude를 다시 실행한다. 또는 `docs/claude/PROMPTS.md`의 첫 프롬프트를 붙여 넣는다. `/context`에서 CLAUDE.md가 읽혔는지 확인할 수 있다.

## 처음 게임 의존성 설치
```powershell
npm ci
```
락파일이 포함되어 있다. 이전 PC/OS에서 복사한 node_modules를 그대로 쓰지 않는다. 이 ZIP에는 의존성 캐시가 없다.

## 로컬 저장 DB 준비 — 새 폴더에서 처음 플레이할 때
`wrangler.local.jsonc`는 `vite.config.ts`와 같은 DB 바인딩·플레이스홀더 ID를 사용한다. 다음 명령은 로컬 DB에만 마이그레이션을 적용한다.
```powershell
node node_modules/wrangler/bin/wrangler.js d1 migrations apply site-creator-d1 --local --config wrangler.local.jsonc --persist-to .wrangler/state
```
도구가 적용할 SQL을 확인하라고 하면 목록을 확인한다. 이미 작업 중인 폴더의 DB에서 table/column already exists가 나오면 DB를 지우지 말고 기존 적용 기록을 확인한다. 원본 ZIP에는 로컬 DB 파일이 있었으나 이 개발 패키지에는 넣지 않았다.

## 개발 서버
```powershell
npm run dev
```
현재 portable 실행 경로의 기본 포트는 5173이다. 최종 주소는 터미널 출력으로 확인한다. 브라우저에서 localhost 또는 127.0.0.1 주소로 접속한다.

`sites({ mockAuth: !managedLinux })`의 로컬 인증은 기존 `build/sites-vite-plugin.ts`에 구현되어 있다. 로그인 버튼은 로컬에서 테스트 사용자로 이어지는 경로를 사용한다. ChatGPT 계정의 실제 라이브 세이브가 자동 동기화되는 기능이 아니다. 서버가 LAN IP로 열렸거나 managed-linux가 설정되어 있으면 이 로컬 인증 조건이 다르다.

`npm run start`는 별도 빌드 결과의 Wrangler 설정에 의존한다. 최초 시작은 `npm run dev`를 사용한다. 패키지에 start가 있다고 로컬 인증·DB까지 검증되었다고 가정하지 않는다.

## 작업 종료와 다음 세션
1. 변경을 한 단위씩 끝내고 관련 검증을 한다.
2. `/protocol-checkpoint`를 실행해 HANDOFF/BACKLOG/SESSION_LOG를 업데이트한다.
3. 같은 폴더를 다음 Claude 세션에서 열고 `/protocol-resume`을 실행한다.

기존 작업 폴더가 Git 저장소라면 그대로 사용한다. ZIP에서 새로 시작했고 Git 기록을 원하면 먼저 저장 대상에서 로컬 DB·환경파일·의존성이 제외되는지 확인하고 초기 커밋을 만든다. 원격 저장소나 Sites 도구 연결은 별도 설정이며 이 ZIP이 자동으로 연결하지 않는다.

## 환경 진단
| 증상 | 확인할 위치 / 대응 |
|---|---|
| node/npm 인식 불가 | Node 22.13+ 설치와 PATH, 새 터미널 |
| /protocol-resume 없음 | package.json 옆에서 실행했는지, .claude/commands가 존재하는지 |
| 저장 불가 / 503 | 로컬 migrations 적용, DB 바인딩, 서로 다른 persist 경로 확인 |
| 로컬 401 | portable/managed-linux, localhost 접속, 기존 로그인 경로 확인 |
| live 주소 403 | 사이트의 허용 계정과 브라우저 로그인 계정 확인. 게임 API 401과 구분 |
| 챔피언 그림 누락 | Community Dragon 외부 이미지 의존. 이름·문자 폴백 유지 |
| Windows 빌드 실패 | Node 버전, native 패키지 설치, portable 경로 확인; 강제로 managed-linux를 쓰지 않음 |

이 인수인계에서 검증한 범위는 CURRENT_STATE.md에 있다. PC의 Claude 로그인·전체 브라우저 플레이·새 로컬 DB 실행까지 검증했다는 뜻은 아니다.

공식 참고 (2026-09-09 확인):
- https://code.claude.com/docs/en/quickstart
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/skills
- https://developers.cloudflare.com/d1/wrangler-commands/
