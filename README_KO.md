# PROTOCOL e스포츠 매니저 — 소스 패키지

PC·모바일 웹에서 플레이하는 게임의 소스 코드입니다.
압축을 푼 뒤 HTML을 더블클릭하는 독립 실행형 게임이나 EXE/APK가 아닙니다.

## 현재 플레이 주소
https://esports-manager-bosung.ganzi927.chatgpt.site

## 포함 내용
- app/: 한국어 화면, 게임 진행 API, 사용자 토너먼트 드래프트 UI, 글로벌 골드 그래프
- lib/game.ts: 경기·국내리그·국제대회·계약·육성 엔진, 사용자 드래프트, 해설 중계, 시즌 메타
- lib/champions.ts: 실제 롤 챔피언명(한글) 약 140종 로스터 데이터
- db/, drizzle/: 저장 구조와 DB 마이그레이션
- public/: 아이콘 및 웹앱 매니페스트
- tests/: 커리어 및 매니지먼트 검증
- package.json, package-lock.json: 설치할 의존성과 고정 버전
- IMPLEMENTATION.md: 구현 기능과 제외 범위
- docs/GDD.html: 확장 기획서

## 개발 준비
Node.js 22.13 이상과 npm이 필요합니다. 게임 프로젝트 폴더에서:

```bash
npm ci
npm run dev
```

화면은 개발 서버의 터미널에 표시되는 주소로 엽니다.
이 원본은 Cloudflare Workers의 D1 바인딩 DB와 Sites의 인증 사용자 헤더를 사용하는 서버 게임입니다.
따라서 위 명령만으로 로컬 로그인·저장까지 자동 설정되지는 않습니다.
전체 플레이를 로컬 또는 다른 서버로 이전하려면 DB 마이그레이션 적용과 해당 환경의 인증 연동이 필요합니다.
개발 PC에서 저장된 실제 사용자 데이터나 인증 키를 제공하는 패키지가 아닙니다.

## 엔진 검증 (사이트 로그인·DB 없이 실행)
```bash
node --experimental-strip-types tests/engine.test.mjs
node --experimental-strip-types tests/management.test.mjs
```

## 빌드
```bash
npm run build
```

서버 배포는 Cloudflare Workers 호환 환경과 D1을 구성해야 합니다.
기존 .openai/hosting.json에는 현재 사이트의 식별자가 보존되어 있습니다.
새 사이트로 복제할 경우 기존 사이트에 덮어쓰지 않도록 새 사이트 설정을 사용하세요.

## 참고
라이브 커리어의 실제 저장 데이터는 들어 있지 않습니다.
게임 내 설정에서 JSON으로 기록을 내보낼 수 있으며 파일 불러오기는 현재 지원하지 않습니다.
의존성 폴더와 임시 실행 파일은 제외했습니다. 가상 구단·가상 선수로 진행하며, 챔피언명은 실제 리그 오브 레전드 명칭을 연출용으로만 차용한 비라이선스 표기입니다.
기존 세이브는 실행 시 스키마 버전 3으로 자동 업그레이드됩니다(시그니처 → 숙련 풀 전환, 시즌 메타 백필).

소스 리비전: 72f5e90daca65bae075834b88b7ff41a9f87316b
