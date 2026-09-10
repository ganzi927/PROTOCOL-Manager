# 바로 붙여 넣는 프롬프트

## Claude Code 첫 시작 또는 대화 초기화 후
```text
이 폴더의 CLAUDE.md와 docs/claude/HANDOFF.md, CURRENT_STATE.md를 읽고 이어서 개발해줘.
현재 소스는 내가 수정한 140챔피언·Lv4 숙련·포지션 스왑 버전이므로 이전60챔피언 코드로 되돌리지 마.
새 요청이 없다면 BACKLOG.md의 TRAIN-01부터 재현하고 수정·검증해줘.
각 작업 단위가 끝날 때 HANDOFF.md와 SESSION_LOG.md를 갱신해줘.
```
동일한 시작점: `/protocol-resume`.

## 디자인 수정
```text
DESIGN_GUIDE.md와 실제 globals.css, 해당 화면을 읽고 요청한 UI를 수정해줘.
기존 차콜·라임 테마와 직접 밴픽·스왑을 유지하고 모바일390px에서 확정 버튼과 이름을 읽기 쉽게 해줘.
실제로 실행한 확인과 못 한 확인을 나눠 보고하고 작업 기록을 갱신해줘.
```

## 중계 수정
```text
BACKLOG.md의 CAST-01과 현재 narrate/simulateSet을 읽고 중계를 경기 해설처럼 확장해줘.
실제 픽과 이벤트 상태를 근거로 캐스터와 해설 문장을 만들고 첫 킬·조기 종료 선언을 일치시켜줘.
승부 난수와 기존 사용자 소스의140챔피언/스왑/골드 그래프 기능은 유지해줘.
```

## 토큰/세션 한도 전에
```text
지금까지의 작업을 체크포인트로 남겨줘. 실제 수정 파일과 테스트 결과, 실패/미완료, 결정 이유,
다음 세션에서 바로 실행할 첫 행동을 HANDOFF.md에 적고 BACKLOG.md와 SESSION_LOG.md도 갱신해줘.
```
동일한 작업: `/protocol-checkpoint`.

## Claude 웹 채팅만 쓸 때
웹 채팅은 로컬 폴더의 CLAUDE.md나 명령을 자동 실행하는 환경과 다르다. 이 ZIP과 아래 프롬프트를 함께 제공한다.
```text
첨부 ZIP의 00-CLAUDE-START.md, CLAUDE.md, docs/claude/HANDOFF.md, CURRENT_STATE.md를 읽어줘.
필요한 소스를 확인해서 내가 요청한 작업을 구현하고 변경 파일을 다운로드할 수 있게 제공해줘.
실행 도구가 없으면 테스트를 했다고 말하지 말고 내가 실행할 명령과 변경 내용을 제공해줘.
다음 대화로 넘길 HANDOFF.md도 함께 업데이트해줘.
```
