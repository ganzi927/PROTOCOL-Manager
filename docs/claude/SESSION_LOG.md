# 세션 기록

## 2026-09-09 — Claude 준비
- 기준: 사용자 수정 ZIP의 소스. 게임 코드 수정 없음.
- 확인: 140챔피언/실존 팀과 선수, 직접 밴픽·스왑·Lv4 숙련·특훈·시즌 메타·골드 그래프.
- 추가: CLAUDE 지침/개발·디자인 가이드/명령/로컬 DB 설정/진단/인수인계.
- 검증: 엔진3구단×4시즌/1,115세트 및 management PASS. 자세한 결과 VALIDATION.md.
- 다음: 사용자 요청을 우선하며, 이어서 할 경우 TRAIN-01 재현.
- 배포: 안 함.

이후 항목은 날짜, 작업 ID, 변경 파일, 결정 이유, 실제 검증, 남은 일을 간단히 추가한다. 대화 전문이나 비밀 값을 복사하지 않는다.

## 2026-09-10 — TRAIN-01 미등록 챔피언 특훈 목표 불일치 수정
- 문제: 챔피언 특훈에서 mastery에 없는 목표를 고르면 `train()`이 최저 숙련 챔피언으로 조용히 대체 → 사용자 선택·뉴스·XP 불일치.
- 변경: `lib/game.ts` — `MASTERY_POOL=8` 상수, `gainMastery` 매직넘버 치환, `training` 명령에서 (실존 챔피언 검증 + 풀 8칸 가득 시 명시적 오류), `train()`에서 사용자 목표 우선·신규 목표 등록·풀 초과 시 보류 공지. `app/manager.tsx` — `champTrainOptions`가 풀이 가득 차면 미등록 챔피언을 숨기고 신규 항목에 ‘신규 등록’ 표기, `MASTERY_POOL` import.
- 결정: D006. 풀 초과는 교체 흐름 대신 거부. 저장 형식 불변.
- 검증: `node --experimental-strip-types tests/management.test.mjs` PASS (TRAIN-01 케이스 4종 추가: 신규 등록·정확 XP·기존 챔피언 불변·피로 유지 / 풀 초과 거부·방어 로직 / 잘못된 ID 거부 / 등록 챔피언·폴백 회귀). `tests/engine.test.mjs` PASS (3구단×4시즌, 1,115세트, 커맨드 수 1478/1495/1135 baseline 동일 = 회귀 없음).
- 미검증: `tsc --noEmit`·`npm run build` — node_modules 미설치로 실행 불가(정적 검토만). 브라우저/모바일 미검증.
- 다음: BACKLOG 다음 P1은 CAST-01 또는 SAVE-01.
- 배포: 안 함.

## 2026-09-10 — ABIL-01 Phase 1: 라인·시야 → 개인 자원 → 후속 전투 전력
- 근거: docs/claude/PROTOCOL-Ability-Review.md. 사용자 지시 "라인전 → 개인 자원 → 후속 전투력 연결부터".
- 추가: tests/balance-review.mjs(리뷰 부록 재현 스크립트)로 베이스라인 측정 — 리뷰 표와 일치(균형 50.62, TOP LNE+20 51.12, SUP VIS+20 50.90).
- 변경: lib/game.ts `simulateSet`에 결정적 개인 자원 모델. 라인 이벤트(0~2) 격차(`dom`)를 슬롯별 `lead[]`에 적립(바텀 ADC/SUP 분배, 정글 편승), 가중 시야 우위를 자원 보호로 적립, 자원 합계를 데드존·상한·tanh·CAR 전환계수로 오브젝트/한타 유효 전력 `resPow`로 환산해 확률식에 가산. 누적 우위 계수 0.35→0.32. `RES_*` 튜닝 상수는 `simulateSet` 바로 위. 타입: `SetResult.leadA`, `GameEvent.leadA/resPowA` 선택 필드.
- 승부 난수: outcome 스트림 호출 순서·횟수 불변(자원 계산은 결정적, 난수 미소비). flavor 스트림도 불변.
- 저장 호환: 새 필드는 모두 선택. `upgradeGame` 변경 없음. 세이브에 SetResult가 남는 경우는 RECAP 중뿐이고 이를 필수로 읽는 코드 없음.
- 결정: D007. 튜닝 5회 반복 후 확정.
- 검증: 6000시드 통제 실험(전→후) TOP LNE+20 51.12→53.38, SUP VIS+20 50.90→51.88, 균형 50.62→50.93, ADC TF+20 57.88→57.65, 팀 전체+10 74.55→78.60(표본오차 셀당 ±0.65%p). `tests/management.test.mjs` PASS, `tests/engine.test.mjs` PASS(3구단×4시즌, 1,115 결정적 세트, 커맨드 1476/1502/1132 — ABIL-01 전 1478/1495/1135에서 소폭 이동. 승부 확률이 바뀌었으므로 시즌 경로 변화는 예상된 것이고, 불변식(hall 16개·영웅 숙련 증가·숙련 범위·자금 유한·유한 종료)은 모두 유지), 신규 `tests/ability.test.mjs` PASS(결정성·대칭 무편향·라인→자원→승률·자원→전투 전환·CAR 게이팅·경계).
- 미검증: `tsc --noEmit`·`npm run build` — node_modules 미설치. 브라우저/모바일 미검증. 표시(중계·골드그래프·POG·리캡)는 미변경 = Phase 4.
- 남은 일: ABIL-01 Phase 3(참여자 기반 교전·스노볼·구조물 종료), Phase 4(표시), Phase 5(팀 전체+10 상승분 재튜닝). BACKLOG ABIL-01 참조.
- 배포: 안 함.

## 2026-09-10 — 게임 로컬 실행
- `npm ci`(675패키지, exit 0, EBADENGINE 경고만 — Node 22.12 < 요구 22.13), 로컬 D1 마이그레이션 2개 적용(`.wrangler/state`), `npm run dev` → http://localhost:5176/ (5173~5175 사용 중). HTTP 200, `/api/game`는 401(로컬 로그인 필요, 503 아님 = DB 정상). 개발 서버 백그라운드 유지.

## 2026-09-10 — COMP-01 단계 2 첫 슬라이스: 조합 프로필 → 구간 효과
- 근거: docs/claude/PROTOCOL-Composition-Meta-Design.md. 사용자 지시로 읽고 작업.
- 신규: `lib/balance/composition.ts` — 순수 모듈. `champProfile(id)`(태그 2개+타입+역할 → engage/peel/poke/scale/frontline/range/early/late 8특성, 전부 명시적 게임 설계값), `draftEffects(picksA,picksB)`(완성도 tanh·아군 궁합 상한·상대 매치업[포크는 상대 진입 약할 때/다이브는 상대 보호 약할 때만] → `{lane,obj,fight}` A 관점 차이, 구간별 ±3, `draftEffects(a,b) === −draftEffects(b,a)`, 같은 픽이면 0).
- 변경: `lib/game.ts` — `powers()`에서 즉석 `composition` 배열 삭제. `simulateSet`이 세트당 `draftEffects` 1회 호출해 라인(0~2)/오브젝트(3~4)/한타(5~8) 사건 확률식에 각각 1회 가산 = 단일 경로, 이중 보정 없음. 승부 난수 스트림 미소비(결정적). `isMeta(+2)`는 이 계층 미참조. 타입 `SetResult.draftFx`, `GameEvent.compA` 선택 필드.
- 저장 호환: 새 필드 전부 선택. `upgradeGame` 변경 없음. 저장 형식 불변.
- `powersA/powersB`(리캡 파워 바)는 이제 조합 항 제외 = 선수+픽 스탯 전력만. 조합은 별도 채널.
- 결정: D008.
- 검증:
  - `tests/balance-review.mjs`(태그·타입 매칭 페어) 수치 **완전 불변**(균형 50.93, TOP LNE+20 53.38, 팀 전체+10 78.60 …) — 태그 같으면 `draftEffects≈0`이라 능력치 채널 회귀 없음 확인.
  - 조합 민감도 8000시드(전원 스탯 70, 숙련/메타 없음): 앞라인/이니시(Tornn,Jjarvan,Mgalio,Asamira,Sthresh) vs 포크/물몸(Tfiora,Jkhazix,Msyndra,Acaitlyn,Snami) = 세트 58.1%(상대 42.8% → 대칭), 균형 vs 균형 50.3%, 앞라인 vs 균형 53.4%. 구간: 앞라인 조합 한타 55.4%·오브젝트 52.2%·라인 49.6% = 후반형 조합의 초반/후반 특성 구분 확인. `de(front,poke)={lane:-0.48,obj:1.35,fight:2.88}`.
  - `tests/composition.test.mjs`(신규) PASS: 프로필 유도, 순수·완전 대칭, 매치업 방향, 엔진 구간 민감도, 단일 경로·결정성·±3.
  - `tests/management.test.mjs` PASS. `tests/engine.test.mjs` PASS(3구단×4시즌, 1,107 결정적 세트, 커맨드 1467/1481/1138 — 혼합 조합이므로 시즌 경로 이동은 의도된 것, 불변식 유지). `tests/ability.test.mjs` PASS.
- 타입·빌드: `node node_modules/typescript/bin/tsc --noEmit --incremental false` exit 0(클린), `npm run build` exit 0(5개 환경 성공). node_modules 설치 후 실행.
- 미착수: 표시(단계 3 UI)·AI 밴픽(단계 4)·메타/패치(단계 5)·외부 데이터(단계 6). isMeta+2 제거는 단계 5.
- 다음 첫 행동: BACKLOG COMP-01 "남은 작업" 참조 — 단계 3(예측 3분리 + 밴픽 카드 다중 추천) 또는 단계 4(AI 공통 평가). ABIL-01 Phase 3와 독립.
- 배포: 안 함.

## 2026-09-10 — CAST-01 1차: 상태 기반 구조화 중계
- 근거: 사용자 피드백 4항목(교전 전 준비·긴장 / 앞 사건 기억 / 강도·읽기 밀도 차등 / 감독 결정 노출).
- 신규: `lib/simulation/narration.ts` — 순수 모듈. `narrateEvent(ctx,mem,rng)` → `{detail, beats[], tier, kills}`. `NarrMemory`가 9사건을 관통(게임 시각 초 단조, 라인별/팀 킬, 첫 킬 시각·라인, 정글 개입, 오브젝트 수). 전용 `narr` 난수(승부/골드 스트림과 분리). 조사 헬퍼는 game.ts에서 이 모듈로 이동.
  - beats: 준비 → 정글 합류 → (시야) → 교전 → 결과 → (해설). tier quiet/build/clash/decisive/close로 강도 차등.
  - 콜백: 재갱킹, 성장한 바텀 캐리, "가장 잘 큰 캐리가 끊깁니다" 반전, 마무리 "돌아보기"가 실제 첫 킬 시각 인용.
  - `managerLever`: 사용자 팀이 경기에 있고 de.fight·전술·advantage가 상태로 확인될 때만. 불참 경기엔 없음.
  - 킬 정합: 문구 "누적 X:Y" ≡ `e.kills` 누적(테스트 강제). 상세 전투(점멸·현상금)는 상태 계산 전엔 미언급.
- 변경: `lib/game.ts` — 기존 `narrate()` 제거, `simulateSet`이 사건별 해결 컨텍스트로 `narrateEvent` 호출. outcome/flavor 난수 스트림 호출 순서·횟수 불변(SetResult deep-equal 유지). `GameEvent.beats?/tier?/kills?` 선택 필드.
- 변경: `app/manager.tsx` — RECAP 이벤트 로그에 밀도 토글(요약/상세/결정적, localStorage 저장, try/catch). 상세=beats 표시, 결정적=decisive/close만 확대. 배속·결과 보기 유지. `app/globals.css`에 `.event-beats`/`.beat`.
- 저장 호환: 새 필드 전부 선택. 구세이브 이벤트는 `detail`만 → 클라이언트가 폴백(요약 모드와 동일 렌더).
- 결정: D009.
- 검증: 신규 `tests/narration.test.mjs` PASS(결정성 / 필드 유효 / 시각 단조 / 첫 킬→마무리 콜백 시각 일치 / 재갱킹 콜백 등장 / 킬 누적 정합 / tier 2종 이상 / 근거 있는 레버·불참 경기 무레버). management/engine/ability/composition PASS(engine 커맨드 1467/1481/1138·1107 세트 — COMP-01 직후와 동일 = 승패 불변). `tsc --noEmit` exit 0, `npm run build` exit 0.
- 미검증: 브라우저에서 밀도 토글 실제 확인(dev 서버 HMR 반영됨, 육안 미확인). 참여자 기반 상세 전투는 ABIL-01 Phase 3.
- 다음 첫 행동: BACKLOG CAST-01 "남은 작업" — 참여자 기반 전투(ABIL-01 Phase 3와 공유), 리캡 확대, 훈련 이력 콜백. 또는 COMP-01 단계 3/4.
- 배포: 안 함.

## 2026-09-10 — MATCH-SYS 단위 1: 참여자 기반 전투 골격 + 탑/미드 2대1 갱킹
- 근거: 사용자 요청("ABIL-01·COMP-01·구조화 중계를 하나의 경기 시스템으로, 의존성 순서대로 작은 단위"). D007/D008/D009 코드·결정 재확인 후 착수.
- 방침: 9구간 승패 롤(스켈레톤)은 보존. 그 롤 결과를 입력으로 각 구간 "안에서" 참여자·처치·생존·자원을 계산. 재작성 아님, 확장.
- 신규 `lib/simulation/combat.ts` (순수 모듈): `newMatchState`(10인 상태 alive/respawnAt/kills/deaths/assists/gold), `resolveGank`(탑=0·미드=1의 2대1 갱킹), `reviveByClock`(다음 단위용). 전용 `combat` 난수(`hash(seed|combat|matchId|setIdx)`) — outcome/flavor/narr와 분리.
  - 능력→행동: 합류=이니시(TF)+margin−라인우위(LNE), 발각=수비 시야(VIS), 처치=공격 수행(MEC·LNE)+정글 이니시 vs 수비 회피(MEC·VIS)+추상 탈출 여지, 마무리 골드=CAR 전환. 오프롤 −6, 숙련 레벨당 +2.
  - 결과 4종: 킬 / 합류했으나 놓침(탈출) / 발각·무산 / 순수 라인 판정. 죽은 선수 미참여, 처치자=유효한 적, 어시스트=실제 합류자, 첫 킬=최초 처치에서만.
- 변경 `lib/game.ts` `simulateSet`: 라인 0·1의 `dom` 자원 산출을 `resolveGank`의 슬롯별 자원 델타로 대체(정글 슬롯에 어시스트 골드). 라인 2·오브젝트·한타는 단위 2~4까지 기존 유지. `GameEvent.combat?` 선택 필드. outcome/flavor/narr 난수 스트림 불변.
- 변경 `lib/simulation/narration.ts`: `NarrCtx.combat?` 추가. 라인 0·1은 `combat`의 실제 참여자·피해자·어시스트·생존으로 beats 생성. 첫 킬 선언은 `combat.firstBlood`에서만. `e.kills` ≡ combat 집계.
- 저장 호환: `GameEvent.combat` 선택. `upgradeGame` 변경 없음. 구세이브 이벤트는 combat 없음 → 중계 폴백(단위 2까지 라인 2와 동일 경로).
- 결정: D010.
- 검증:
  - `tests/combat.test.mjs`(신규) PASS: 결정성 / 사망·처치·어시스트 규칙(처치자≠피해자·참여자만·재처치 없음·세트당 firstBlood≤1·최초 처치 시각 일치) / 중계 바인딩(firstBlood↔FIRST BLOOD 비트, `e.kills`↔combat) / 능력→행동(탑 LNE·MEC +20 → A 갱킹 처치 1.4배↑, 탑 VIS +95 → A 탑 피살 감소) / 처치 갱킹 자원 부호 97%+ 이득 팀 일치.
  - `tests/balance-review.mjs` 6000시드: `equal` 50.93→50.60, `TOP LNE+20` 53.38→53.12, `팀 전체+10` 78.60→78.92 — 전부 ±0.5%p(≈0.8·SE). 라인 자원이 참여자 기반이 됐는데도 집계 동등 = 밸런스 회귀 없음, D007/D008 채널 불변.
  - management/engine/ability/composition/narration PASS(engine 1,115 결정적 세트 복귀, 커맨드 재이동은 라인 자원 근거 변경에 따른 것). `tsc --noEmit` exit 0, `npm run build` exit 0.
- 미검증: 브라우저 육안. 바텀/오브/한타는 아직 휴리스틱. respawn·구조물·넥서스 종료는 단위 5.
- 다음 첫 행동: MATCH-SYS 단위 2 — 바텀 2v2(+정글) 교전. `resolveGank` 확장 또는 `resolveBotLane` 신설, 라인 2의 `dom` 대체, `RES_JGL_CARRY` 이중 편승 점검, balance-review 재측정.
- 배포: 안 함.

## 2026-09-10 — MATCH-SYS 단위 2: 바텀 2v2(+정글) 교전
- 신규 `resolveBotLane` (`lib/simulation/combat.ts`): ADC·SUP 중심 2v2, 정글 합류 시 3인. 능력→행동(정글 TF 합류, SUP VIS 발각, ADC MEC·CAR + SUP TF·VIS 공격 vs SUP TF·VIS + ADC MEC 보호, ADC CAR 마무리 골드). 결과 5종: ADC 처치 / SUP 보호 성공(딜러 생존) / SUP 희생 / 발각·후퇴 / 순수 라인.
- 변경 `lib/game.ts` `simulateSet`: `i===2`가 `dom` 대신 `resolveBotLane` 자원 델타 사용. `RES_LANE_LEAD`·`RES_BOT`·`RES_JGL_CARRY` 상수 삭제 — 정글 자원은 이제 combat 한 곳에서만(합류=어시스트, 미합류=정글 템포). `visEdge*RES_VIS_PROTECT`는 단위 3·4까지 유지.
- 신규 `CombatEvent.followUp` + `MatchState.jglCommits`: 같은 팀 정글러 2회차+ 합류 판정. 중계 "앞선 합류에 이어…" 콜백을 `mem.ganked.size` 휴리스틱(바텀마다 오발동)에서 이 플래그로 교체. spotted 자원 부호를 phase winner와 일치.
- 변경 `lib/simulation/narration.ts`: 바텀도 `c.combat` 경로. "딜러 보호" 흐름을 combat 상태(SUP 생존/희생·ADC 딜)로 서술. `euro(laner)` 조사 수정("바텀으로").
- 결정: D011.
- 검증:
  - `tests/combat.test.mjs` 바텀 케이스 추가 PASS: 원딜 MEC·CAR +20 → A 바텀 처치 1.15배↑, SUP VIS +20 → A 원딜 바텀 피살 10%↓, SUP TF +20 → 보호 생존 1.15배↑.
  - `tests/balance-review.mjs` 6000시드(단위 1→2): `equal` 50.60→50.68, `SUP VIS만 +20` 51.95→**52.85**(원래 베이스라인 50.90 대비 +1.95%p — 바텀 2v2에서 SUP 시야가 갱킹 콜·딜러 생존으로 연결), `TOP LNE+20` 53.48, `팀 전체+10` 78.92→79.33(D009 대비 +0.7%p 누적 — 라인 자원 근거 변경, 밸런스 증폭 아님).
  - management/engine/ability/composition/narration PASS(engine 1,105 결정적 세트). `tsc --noEmit` exit 0, `npm run build` exit 0.
- 미검증: 브라우저 육안. 오브젝트(3·4)·한타(5~8)는 아직 휴리스틱. respawn 활용·구조물·넥서스 종료는 단위 5.
- 다음 첫 행동: MATCH-SYS 단위 3 — 오브전 실제 합류자. `resolveObjective`(전령·드래곤). 현재 위치/생존/합류 가능 조건 또는 명시적 추상 이동 규칙으로 참여자 결정. 라인 결과 `access` 항과 오브 보상의 이중 반영 점검. balance-review 재측정.
- 배포: 안 함.

## 2026-09-10 — MATCH-SYS 단위 3: 오브전 실제 합류자 + wa 재정의
- 설계 경계(사용자 요청): 구간 롤 `edgeA`의 의미를 분리. 라인·한타 = 확정 승자, **오브전 = '유리한 시작'**. 오브 확보 팀은 `resolveObjective` 참여자 결과로 결정하고 `wa = secured ?? edgeA`. `advantage`는 확보 팀 기준으로만 이동, 미확보면 이동 없음. `rng()` 호출은 사건당 1회 유지(재현성).
- 신규 `resolveObjective` (`lib/simulation/combat.ts`): 전령=정글·탑·미드(+조건부 SUP), 드래곤=정글·미드·원딜·SUP(+조건부 TOP). 생존+도착 확률(개인 자원차·TF)로 참여자 선정, 불참 이유(`전투 이탈(리스폰 대기)`/`라인 처리`/`도착 지연`) 기록. 능력→행동: OBJ(정글 가중 0.9)·TF·MEC·VIS(`bestVis`)·CAR(마무리 골드). 결과 5종: 무교전 확보 / 교전 후 확보 / 미확보-철수(`pendingObjective` 남김) / 역확보(UPSET) / 취소. 스틸은 목표 체력 상태 없어 제외.
- 자원 단일 경로: 처치+어시스트(참여자만)+오브 팀보상(확보 팀 5칸, 불참 포함)+확보 정글 보너스. 미확보 0. `simulateSet` `i>=3&&i<5`가 `lead[s]+=ce.resource[s]` 1회. `access`·`resPow`는 확률/전력 채널로 분리(이중 아님).
- `lib/game.ts` `simulateSet` 루프 재구성: `edgeA`/`margin`/`wa` 분리, `i<5` 브랜치에서 `resolveObjective` 호출, `advantage`·`w`를 secured 기준으로. `GameEvent.combat` 그대로(objective/notJoined 필드 추가). `CombatEvent.kind`에 `'objective'` 추가, `MatchState.pendingObjective`.
- `lib/simulation/narration.ts`: 오브전도 `c.combat` 경로. 접근/시야 → 합류/공백(불참 이유) → 교전 → 확보/미확보/역확보 → 해설. 첫 킬이 오브에서 나면 FB 1회. 감독 레버('초반 압박을…')를 오브 미확보·early·열세일 때만.
- 결정: D012.
- 검증:
  - `tests/combat.test.mjs` 오브 섹션 신설 PASS: 리스폰 대기 정글러 불참·부활 후 참여·무교전 확보(처치 0)·양측 부족 취소(보상 0)·확보 시 pending 해소·참여자만 처치/어시·JGL OBJ↑ → 확보율 +5%p 이상.
  - 통제 8000시드 (강화−해당버전 균형): TOP LNE +20 **+2.30%p**(확보율 +4.4%p), SUP VIS +20 **+2.19%p**(+4.2%p), **JGL OBJ +20 +3.74%p(확보율 +10.6%p, 오브당 자원 +138)**, 팀 전체 +10 +29.93%p. 통제 균형 50.61%·확보율 A 42.9%≈B 42.5% → **오브 코드에 편향 없음**.
  - balance-review 6000시드: `균형` 50.68→51.18. 이 테스트 페어의 원래 바텀 파워 비대칭(`powerDelta[2]=+4.8`, 최초 50.62 시절부터)이 오브가 비중을 얻으며 드러난 것 — `powers()` 불변(powerDelta 동일), 대칭 테스트(ability·composition) PASS = 이중 보상·계산 오류 아님. `팀 전체+10` 79.33→79.55(+0.2%p, 오브 보상이 지배 팀 증폭 안 함 — 강화−균형 28.65→28.37로 오히려 감소).
  - management/engine/ability/composition/narration PASS(engine 1,107 결정적 세트). `tsc --noEmit` exit 0, `npm run build` exit 0.
- 미검증: 브라우저 육안. 5v5 한타(5~8)는 아직 휴리스틱. 구조물·넥서스 종료는 단위 5.
- 다음 첫 행동: MATCH-SYS 단위 4 — 5v5 한타 `resolveTeamfight`. BACKLOG "MATCH-SYS 단위 4" 절 참조. **이번 요청 범위는 단위 3까지 — 단위 4·5·조합 예측 UI는 다음.**
- 배포: 안 함.

## 2026-09-10 — MINIMAP-01 1단계: 이동형 미니맵 재생 (골격 + 바텀 갱킹 연결)
- 확인: MATCH-SYS 단위 4(한타 combat) 미완. `CombatEvent`는 참가자·처치(victim/killer/assists)·escaped·notJoined·resource·단일 clock. 한타(i=5~8)는 combat 없음.
- 신규 `lib/simulation/replay.ts` (순수, 난수·Date 없음):
  - `MAP`(0~100, SVG y↓, A 좌하/B 우상, `nodes`+통로 `edges`), `pathBetween`(Dijkstra 최단 경로 — 통로 위 이동 보장).
  - `buildReplay(set)→ReplayData{duration, windows, tracks, beats, goldKeys, finalScore}`. 연출용 재생 시각(t)과 엔진 시각(engineClock) 분리. 원본 사건 ID(seq) 유지. 골드는 엔진 `goldA/goldB` 매핑(재계산 없음).
  - `stateAt(rd,t)` — t 이하 beat만 집계(배속·정지·되감기 무관, 미래 미노출). `posAt(track,t)` — 키프레임 선분 보간(사망 시 정지).
  - 바텀(사건 2) 완전 연결: 정글 접근(합류 시만)→합류→교전→실제 처치/생존(escaped)→후퇴→부활(엔진 시각 기준). 탑·미드·오브는 위치·처치·불참 표시(접근은 정글만 간단). 한타는 팀 단위 킬 피드(개별 피해자 스컬 없음 — 단위 4 전).
- 신규 `app/replay-theater.tsx`: SVG 미니맵 + 단일 재생 시계(`tRef` ref + rAF, 위치는 SVG `transform` 직접 갱신 = 프레임당 리렌더 없음). 이산 상태(점수·골드·피드·중계)만 `setState`. 컨트롤: 재생/정지·1×2×·다음 사건·시크바·처음부터. `visibilitychange` → 자동 일시정지. 초상화는 `champImageUrl`+약칭 폴백. 아이콘 팀색 테두리·클릭 시 `onSelectPlayer`.
- `app/manager.tsx` RECAP 배선: `<ReplayTheater>` 를 이벤트 로그 위에. `onProgress(seq)` → `setReveal(v=>max(v,seq+1))` 로 텍스트 로그를 미니맵과 같은 시계로 공개. 기존 `setTimeout` 공개 루프·`speed`(1×/4×)·`결과 보기` 버튼 제거(스포일러 방지). `app/globals.css`에 `.replay-theater` 등.
- 엔진 무변경 — `simulateSet`/combat/narration 그대로. replay는 읽기만.
- 결정: D013.
- 검증:
  - `tests/replay.test.mjs`(신설) PASS: 결정성 / 스포일러 방지+킬·골드 적용 시점 일치 / 이동이 정의된 통로 이탈 없음(모든 비-사망 키프레임이 노드, 연속 키프레임은 인접 노드) / 사망 후 행동·조기 부활 없음(처치~부활 구간 트랙 dead, 부활 t>처치 t, 부활 engineClock≥처치) / 불참자가 사건 위치에 안 나타남 / 고정 시드 바텀: 처치 ref 유효·탈출 beat가 실제 escaped와 일치·정글 합류 시 approach beat 있고 불참 시 없음 / 지도 그래프 경로 정합.
  - management/engine/ability/composition/narration/combat PASS(engine 1,107 결정적 세트 — replay는 엔진 미변경). `tsc --noEmit` exit 0, `npm run build` exit 0.
  - **실제 화면**: 진행 중이던 커리어 RECAP에서 미니맵(통로·베이스 팀색·전령/드래곤 라벨), 10 아이콘 이동, 스컬, 점수 0→5·인게임 시각 02:30→18:00·골드 2.8k/3.0k→8.1k/12.1k(스포일러 없음), 킬 피드("교전 3킬"·"드래곤 확보"·"Morgan 불참·라인 처리"), 컨트롤·시크바 동작 육안 확인.
  - 미확인: t=0 정지 상태, 탭 비활성 일시정지, 모바일 지도 비율, 아이콘 클릭→선수 상세.
- 다음 첫 행동: MINIMAP-01 2단계 — 탑·미드 갱킹(0·1) + 오브전(3·4) 사건 상세 연결(BACKLOG "MINIMAP-01" 절). 또는 MATCH-SYS 단위 4(한타 combat) 후 한타 개별 피해자 연결.
- 배포: 안 함.

## 2026-09-10 — RECAP 화면 UX 3건 (사용자 요청, 엔진 변경 아님)
- `app/manager.tsx`: (1) 중계 공개 간격 `speed===1?1000:250` → `1700:450`ms(조금 느리게). (2) `matchBanner`에 `scoreShown?` 옵션 인자 추가 — RECAP 진행 중(`reveal<events.length`)엔 이번 세트 결과를 뺀 스코어를 보여주고, 중계가 끝나면 실제 스코어로 갱신. (3) `recap-card`(매치 결산)를 이벤트 로그 하단 → 이벤트 로그 **상단**으로 이동(중계 종료 시 `.recap-card.recap-card-top`, "중계하고 있습니다…" 자리 대체). `app/globals.css`에 `.recap-card-top` 마진 규칙.
- 검증: `tsc --noEmit` exit 0, `npm run build` exit 0. 엔진/테스트 무관(순수 UI). dev 서버 HMR 반영.

## 2026-09-10 — MATCH-SYS 단위 4: 참여자 기반 5v5 한타 (+ 단위 3 정합성 점검)
- **단위 3 점검(수정 없음)**: 1a(확보 팀 없음 → `wa=secured??edgeA`, momentum·보상·표시 골드 이동 없음, `edge` 별도 기록) / 1b(처치 후 미확보 → 처치·어시 보상 유지, 오브 팀보상만 0) / 1c(`pendingObjective` 같은 kind 확보로만 해소) 모두 이미 정합, 회귀 테스트로 고정(combat 7e·8a·8b). 1d(access=확률 채널·resPow=전력 채널·lead=자원 원본·advantage=momentum, 서로 다른 행동, `access` 영향 <0.1%p) / 1e(숙련·오프롤이 `powers()`와 `combat.eff()` 양쪽에 있으나 다른 산출물, `p`에 이중 안 더함, 통제 실험 오프롤 0.0%p·숙련 +0.9%p) → 표는 D014.
- **단위 4**: 신규 `resolveTeamfight` (`lib/simulation/combat.ts`). edgeA/margin = '교전 전 유리함', `favWins=clamp01(0.5+margin*0.75+numAdvFav)`(`numAdvFav`=실제 생존 인원차, p에 없던 새 채널). 능력치는 '누가 죽고 누가 살리나'만: 캐리 우선 표적, SUP peel(한타당 1회, TF+VIS)→`contrib.protect`, 어시스트 TF 가중 무작위. **승패=실제 처치 수**(역전 가능), TRADE/NO_ENGAGE/NO_SHOW/ONE_SIDED→`winner=null`/상대(사전 edgeA로 안 이김). `TFResult`·`Contrib`·`CombatEvent.fight` 추가.
- `lib/game.ts` `simulateSet` `i>=5`: `resolveTeamfight` 호출, `lead[s]+=ce.resource[s]`, **pressure는 `fight.winner`에서만**, `wa=fight.winner??edgeA`, 승자 없으면 `noMove`(advantage·momentum·표시 골드 이동 없음), `GameEvent.edge`에 전술적 우위 분리 기록. POG 기여 필터에 `!(combat.fight && !combat.fight.winner)`. `p`(확률) 불변.
- `lib/simulation/narration.ts`: `c.combat.kind==='teamfight'` 경로(진입·보호·FB·반전·연계·결과를 실제 처치/생존/불참으로). 구세이브 휴리스틱 폴백 유지.
- `lib/simulation/replay.ts`: `eventNode` 한타 분기, **사망마다 1건 부활**(`deaths[]` — 죽고-부활-재사망 시 test4가 처치_n↔부활_n 짝지음), 부활 라인 복귀 걷기 키프레임 제거(다음 접근이 홈에서 출발 → 겹침 방지), 접근 루프가 직전 사망자는 `homeNode` 출발.
- 결정: D014.
- 검증:
  - `tests/combat.test.mjs` 섹션 9 신설 PASS: NO_SHOW / 유리 팀 전멸→ONE_SIDED 상대 승 / 3v5 열세→한타 승률 <50% / 핵심 딜러 부재→미참여·재처치 금지 / SUP VIS·TF↑→보호 성공률·딜러 생존율↑ / FB 1회 / 결정성 / TRADE·NO_ENGAGE winner=null.
  - `tests/teamfight-review.mjs`(신규, 8000 페어 시드): 균형 50.06%(편향 없음). SUP VIS +20 → 딜러 생존 +6.96%p·보호 성공 +13.13%p. SUP TF +20 → +3.2%p 세트·딜러 생존 +6.76%p. ADC CAR +20 → +3.2%p 세트·한타 승 +1.99%p. JGL OBJ +20 → 확보 +10.07%p. 원자료: 한타 30,189·결판 28,209·무승부 1,980·보호 시도 14,055.
  - 단위 3 vs 단위 4(같은 스펙, 단위 3은 기록값): TOP LNE +2.30→+0.46%p, SUP VIS +2.19→+0.10%p(대신 딜러 생존율로 발현), JGL OBJ +3.74→+0.98%p(확보율 +10.6→+10.1%p 유지), 팀+10 +29.93→+20.80%p. **참여자 기반 한타의 의도된 압축·재분배 — 전역 계수 조정 없음(사용자 지시).**
  - `ability.test`·`combat.test` 일부 크기 임계값 완화(방향·부호 유지, 회귀만 차단), 근거는 주석·D014.
  - management/engine(1,134 세트)/composition/narration/replay PASS. `tsc --noEmit` exit 0, `npm run build` exit 0.
- 중계 예시(재현 시드): seed 0 #7(보호 성공→A-ADC 생존, 중계 일치), seed 6 #5(edgeA=A인데 실제 winner=B — 사전 픽으로 안 이김 + 한타 FB), seed 50 #8(TRADE, winner=null — 무승부는 승리로 안 셈). 상세 VALIDATION.md.
- 미검증: 브라우저 육안(한타 미니맵 개별 스컬·`notJoined` 연출, t=0 정지, 탭 비활성, 모바일 비율). 구조물·넥서스 종료는 단위 5. `numAdvFav`는 9구간 스켈레톤에선 거의 항상 0(reviveByClock가 전원 부활) — 구성 상태 테스트에서만 활성.
- 다음 첫 행동: MATCH-SYS 단위 5 — `resolveTeamfight` 결과를 구조물 진행으로 잇기(`MatchState`에 towers/inhibs/nexusOpen, DECISIVE 후 승자 생존 인원·상대 리스폰 조건 → 구조물 파괴, 종료 조건을 pressure→구조물/넥서스로 교체, 강제 종료 규칙). BACKLOG "단위 5" 절.
- 배포: 안 함.

## 2026-09-10 — MATCH-SYS 단위 5: 스노볼 + 구조물 기반 종료 (D015)
- **기준선 보존**: 저장소 없어 `git init` + 단위 4 상태를 최초 커밋(`9a15df3`). 이후 단위 5(`19e4421`), scratch 제외(`d7a1473`). 기존 사용자 소스 덮어쓰기·이력 재작성 없음. 실험 조건·시드·명령·코드 버전은 VALIDATION에 기록.
- **실제 경기 시계** `MatchState.clock`: `resolveTeamfight` 교전당 +14초 + 계단식 부활(처치 순서로 `respawnAt` 지연). 부활 시간 자체는 안 늘림. 연출 재생 시각과 분리.
- **`resolveSiege(st, seq, clock, crng)`** 신설: 공격 자격(생존 인원차 + 부활 창) → 추상 지역 이동 시간(`Region`+`REGION_DIST`, 정밀 좌표 없음) → 창(`부활까지−이동`, ≤2면 NO_WINDOW) → 여력(인원차·시간·자원차 D007 ±0.85·OBJ·**생존 원딜 CAR**·운영 주도권 `lanePush`) → 구조물 진행(라인별 0~3, 한 사건 최대 2, 억제기 1개 열려야 베이스, 넥서스 = 넥서스포탑 0 + 여력 + 수비 ≤3). 구조물 열세(−4)면 견제만. 구조물 골드 `resource`로 1회.
- **`simulateSet`**: 9구간 유지 + 각 한타 뒤 `doSiege`. 넥서스면 `endReason='NEXUS'` 즉시 종료. 아니면 연장 루프(한타+공성)를 `nexus || clock≥3600 || 사건≥30`까지. **9번째 사건이라는 이유로 승자 안 정함.** 상한 = `endReason='CAP'` + `phase:'종료'` 사건(판정: 구조물 피해 > pressure > advantage > 전용 동전, edgeA·마지막 방향 안 씀). `pressure===3` break 삭제.
- **중계**: 한타 브랜치의 "억제기를 밀어 넥서스까지 파괴" 삭제. 공성 사건 = 실제 철거/억제기/넥서스만(피해만 입은 구조물을 파괴라고 안 함). NO_WINDOW/HELD/RESET은 무산·정비. CAP는 "판정승(정상 종료와 구분)". 중계 시각은 연출 페이싱(경기 시계와 별개).
- **미니맵**(`replay.ts` + `app/replay-theater.tsx`): 공성 사건 = 공격자만 수비 구조물 앞 이동, `beat.struct`(양 팀 구조물 스냅샷), `stateAt().struct`. 사이드 패널 텍스트 구조물 상태(SVG 아이콘 미구현의 명시적 대체 표시). `'종료'` 사건 지도 스킵. 부활 연출을 사건 앵커 방식으로(clockMap·engineToPlay 폐지).
- 결정: D015.
- 검증:
  - `combat.test` 섹션 10(공성 — 창/ADC 기여/파괴 순서/이중 보상 방지/한 라인 개방이 다른 라인 안 건드림/넥서스만 정상 종료/CAP vs NEXUS 명시 구분/결정성). `replay.test` 섹션 8(구조물 스냅샷 단조·철거된 것만 파괴 표시·재생 끝 = 엔진 최종). 전체 스위트·`tsc`·`build` PASS.
  - `tests/teamfight-review.mjs 8000`(단위 5): 정상(NEXUS) **96.2%** / 상한(CAP) **3.8%**, 사건/세트 16.8. 오브 확보→구조물 진행 90.5%. 첫 구조물 선취 팀 승률 68%. 공성 시 A-ADC 생존이면 철거 1.76 vs 사망 0.18(보호→생존→공성 경로). 대칭(동일 픽) 세트 승률 49.75%(구조적 편향 없음). 태그쌍 균형 48.7%(픽쌍 비대칭, 단위 4 대비 ~−1.4%p).
  - 강화 효과(동일 시드 페어, McNemar 95% CI): TOP LNE+20 +1.48%p[0.64,2.31] · SUP VIS+20 +1.75%p[0.98,2.52] · JGL OBJ+20 +1.54%p[0.63,2.45] · ADC CAR+20 +4.47%p[3.20,5.75] · ADC MEC+20 +2.95%p[1.80,4.10] · SUP TF+20 +4.14%p[2.85,5.42] · 팀+10 +25.76%p[24.38,27.15]. **모든 CI가 0 배제** — 단위 4의 압축이 공성→넥서스로 풀림. 작은 효과는 RNG 스트림 의존이라 **확정적 개선으로 단정 안 함**.
  - `ability.test`·`composition.test`·`engine.test`: 사건 수 상한·한타 kind 필터·초반 한타 한정으로 갱신 — **요구 변경**(스켈레톤 뒤 운영 사건 추가), 임계값 하향 아님, 근거 주석.
- 미검증: 브라우저 육안(공성 미니맵·구조물 텍스트·t=0·탭 비활성·모바일). 구조물 SVG 아이콘 미구현. 개인 성장 곡선 없음(자원 누적만). `RES_VIS_PROTECT` 미이관. CAP 동전 소편향(전체 <0.3%p).
- 다음 첫 행동: MATCH-SYS 단위 6 — POG를 실제 개인 기여(`combat.fight.contrib` + 공성/오브 참여) 합으로 계산. BACKLOG "단위 6" 절.
- 배포: 안 함.

## 2026-09-10 — MINIMAP-02: 지속형 에이전트 미니맵 (D016)
- 문제(D013 재생 증상): `buildReplay`가 사건 참가자만 키프레임을 찍는 컴파일러 → 사건 전 정지, 사건에 급이동, 사건 후 홈 왕복, 다른 라인 정지, 고정 노드 왕복, 경기 시각↔재생 시각 임의 대응.
- 체크포인트: git tag `minimap-pre-persistent` (재작성 이전 `595b3ea`). 기존 사용자 소스·이력 무변경.
- `lib/simulation/replay.ts` 내부 완전 재작성(공개 API 유지):
  - `WALK` 55노드 보행 그래프(MAP 세분 + 정글 캠프 + 분수대), `route` Dijkstra, `distToCorridor`/`WALL_TOL`.
  - 10명 지속 에이전트. 고정 `DT=2.5`초 tick 루프: 부활 → 사건 해소 → 접근 계획(lead 이전) → decide → 노드 경로 이동. **사건 끝나도 위치 초기화 없음.**
  - 역할별 지속 행동(라이너 farm zone 드리프트·왕복, 정글 캠프 순찰+접근, 서포터 원딜 zone 추종+로밍, 큰 교전 전 드리프트, 위험 시 반전 후퇴, 교전 후 홈으로 물러났다 재판단). 무작위 흔들림·원점 왕복 아님.
  - 사건 연결: 발생 전 접근 계획 → 실제 경로. 발생 순간 순간이동 없음(근처면 그 자리, 조금 멀면 도착 시 교전, 많이 멀면 diag). 처치·승패는 엔진 데이터 그대로.
  - `t = clock/SCALE`(18 균일) — 프레임률·배속 무관. 속도 균일(≈15~19 u/s). `RESPAWN`을 combat.ts와 동일하게 정렬.
  - 위치 난수 `mulberry32(hashStr(setSignature))` — outcome/narration과 분리. `buildReplay` 순수·결정적.
  - `ReplayData.nav/diag/scale`, `TrackKey.act/reason`, `stateAt.gameClock`, `agentsAt`.
- `app/replay-theater.tsx` + `globals.css`: 디버그 토글(통로·경로·행동 라벨·diag 패널), `scatter` 표시 보정, gameClock, 1×/2×/4×.
- 결정: D016.
- 검증:
  - `tests/replay.test.mjs` section 3 재작성(통로 허용치) + section 9 신설(정지 없음·경로 연속·라인 독립·diag 유한·결정성·agentsAt). 전 스위트(combat/replay/narration/ability/composition/management/engine) + tsc + build PASS.
  - 8시드 스모크: 정지 트랙 0/10, 비-교전/사망 벽 침범 0, 결정성 100%, diag 30~90.
  - **브라우저 육안 확인함**: dev 서버 RECAP 재생 — 00:07/00:15/09:00/13:17/13:47 각 시점 아이콘이 서로 다른 위치에서 이동, 라인·정글·집결 분산, 디버그 경로·행동 라벨·diag 패널, 클록·골드·스코어·피드 동기, t=0 정지 프레임, 재생/정지/배속/처음부터/다음사건 동작, 콘솔 오류 없음. (자동화 Chrome이 GIF 녹화했으나 파일시스템 접근 불가.)
- 미검증/남은 것: 접근 도착 시각↔합류 판정 통합(현재 `combat.participants`가 authoritative), 한타/오브/공성 애니 타이밍 다듬기, `notJoined` 연출, 구조물 아이콘 SVG, 모바일 비율, 아이콘 클릭.
- 다음 첫 행동: MATCH-SYS 단위 6(표시 데이터 통합) 또는 MINIMAP 접근↔합류 통합. HANDOFF "다음 첫 행동" A/B.
- 배포: 안 함.

## 2026-09-11 — 단위 5 정합성 점검 (D017) + 미니맵 이동 정합·구조물 (D018)

사용자 요청: 단위 6(POG) 앞에 (1) 단위 5 정합성 점검 — 별도 체크포인트, (2) 지속형 미니맵 현황 확인·미완 연결 + Region/REGION_DIST 대조 + 구조물 표시, (3) 브라우저 확인·비교 영상.

### D017 (커밋 `7167829`) — 단위 5 점검
- `resolveSiege`: **`behind`(구조물 격차 −4 → 견제만) 게이트 완전 제거**. 공성 가능량은 생존 인원차·이동/부활 창·자원·라인 압박에서만. 인위적 역전 보너스 없음. `REGION_DIST`/`regionTime` export.
- `lib/game.ts`: `endReason` → `NEXUS`/`CAP_TIME`/`CAP_EVENT`. `SetResult.capDiag`(직전 구조물·최근 공성 실패·tiebreak 단계). CAP 판정 struct > pressure > advantage > 전용 동전(분리 해시).
- `combat.test` 10i(capDiag 계약) 재작성 + **10j**(구조물 열세팀이 교전 승리 후 철거 — 회귀) + **10k**(공성 직전 상태 동일, 죽은 슬롯만 ADC↔TOP — 통제 실험, 철거 1.00 vs 2.00).
- `teamfight-review.mjs`: CAP 시간/사건 분리·tiebreak 분포·CAP/동전 A승률 집계, `pairedCI`에 McNemar 산식 주석 + 페어 원자료(b,c).
- 결과(N=6000): NEXUS 97.62% / CAP 2.38%(전부 EVENT, TIME 0%). CAP 동전 실측 도달 0. 강화 CI 전부 0 배제. balance-review는 `m.id` 차이로 서로소 모집단 → 작은 효과(SUP_VIS +0.4 vs +2.2) 부호 흔들림, 큰 효과는 일치 — VALIDATION에 복구·설명.

### D018 (커밋 `9e2ac06`) — 미니맵 이동 정합 + 구조물 + 크래시
- **현황 표**(HANDOFF): MINIMAP-02 8개 요구 중 대부분 완료·부분 2·미완 3(도착↔합류 통합, 구조물 SVG, 모바일/탭). 이번에 구조물 SVG + Region 대조를 연결.
- `replay.ts`: `import {REGION_DIST,regionTime}`. `TRAVEL_K=2.6`(속도 정렬), `travelAudit()`/`walkSeconds` export. `showDelay`(화면 렌더 지연 — WALK 이동시간이 엔진 간격보다 길면 화면 사건을 늦춤, `stime`/`eclock` 분리, **엔진 판정 불변**). 계획 재배정(사건 종료 시 다음 armed 사건으로) + `fightUntil`/`arriving` 중 재계획·이동 지시 금지(같은 tick 키프레임 충돌). tick 끝 이동 키프레임(긴 구간 보간 폭증 방지). 종료 키프레임 `endClock+4`. `ReplayData.travel`.
- 결과(12시드): "이동시간 부족" 96→0, "합류 실패" 335→0. 남는 "합류 이동"은 전량 `diag`에 거리·지연 기록(순간이동·과속 아님). `travelAudit` 비율 중앙값 1.23.
- `replay-theater.tsx`: **구조물 SVG 24개**(포탑 18 + 넥서스포탑 4 + 넥서스 2). `snap.struct`에서만 → 미래 미노출. 살아있음=팀색, 파괴=회색+✕. 데이터가 0..3뿐 → 부분 피해 바 없음.
- `replay.test`: 섹션 3 step 상한 8→16(요구 변경 주석). 섹션 10 신규(REGION_DIST 대조).
- **크래시 수정**: `manager.tsx` RECAP 이벤트 로그가 `winner:''`(공성 HELD/noMove)에서 `meta('').short` 크래시 — D015 잠재 버그. `e.winner` 가드.
- **브라우저 육안 확인함**: RECAP 재생(t=0 홈 정지 → 전령 FB → 다음 사건), 구조물 24개·넥서스 파괴 표시(해당 팀만), 디버그 이동 대조 패널, 배속/시크/다음사건, 콘솔 크래시 없음. 미확인: 모바일 뷰포트(CDP 고정), 탭 전환. GIF는 Chrome 다운로드했으나 파일시스템 접근 불가.

### 검증
- 7개 스위트(combat/replay/ability/composition/narration/management/engine) PASS, tsc 0, build 0. 상세 `VALIDATION.md` 2026-09-11 절.

### 다음
- MATCH-SYS 단위 6(POG·골드 그래프·리캡 — 실제 개인 기여). BACKLOG "단위 6" 절.
- MINIMAP: 접근 도착 시각 ↔ 합류 판정 통합(별도 체크포인트), 모바일/탭전환 브라우저 확인, 비교 영상.
- 배포: 안 함.

## 2026-09-11 — MATCH-SYS 단위 6 첫 슬라이스: POG를 실제 개인 기여로 (D019)

사용자 요청: `/protocol-resume` — 현재 요청 없음 → 첫 미완료 우선 작업 한 단위. HANDOFF "다음 첫 행동 A"(MATCH-SYS 단위 6) 선택. 현재 사용자 작업본(140챔피언·mastery 배열·DraftState) 보존.

### 완료한 행동/파일
- `lib/game.ts`:
  - `SetResult.pogReason?:string` 신규(선택 필드 — 저장 형식 불변, 구세이브 폴백).
  - `simulateSet` 말미 POG 블록 **재작성**: 역할별 고정 가중치(`e.index`로 분기 + 슬롯 상수 배열) → **사건(combat) 원자료 슬롯별 집계**. `cSide[A|B][slot]`에 처치(+3.0)·어시(+1.4)·FB(+1.5)·라인 무처치 승리(+1.0)·오브 확보 합류(+0.7, 정글 +1.5)·한타 `fight.contrib`(kill·2.2 + engage·1.2 + damage·0.16 + survived·0.25, protect·2.42)·공성 철거 참가(+1.0/구조물, 원딜 +1.8)·넥서스 파괴 참가(+4.0). **재추첨·재계산 없음** — 승부·골드·중계 난수 미소비, `p`·`lead`·`advantage` 불변.
  - POG = 승리 팀 최댓값 슬롯. tiebreak: 전투 기여(`kaW+tfW`) → 보호(`protW`) → 슬롯 순.
  - `pogReason` = `"<ROLE> · N킬 관여 · 한타 딜러 보호 M회 · 오브젝트 K회 확보 · 구조물 공성 S회 · 넥서스 파괴 가담"` 중 기여 큰 순 최대 3개, 전투 기여 0이면 `"라인·운영 주도권"`. 킬 관여 수 = `kills + assists + round(Σ contrib.kill)`. `damage`(가상 점수)는 이유에 미언급.
  - `recap[]`에 4번째 문장(POG 근거) 추가.
- `app/manager.tsx`: RECAP 카드 PoG 줄에 `{last.pogReason}` 표시. `app/globals.css`: `.pog-why`.
- `tests/combat.test.mjs`: **섹션 11 신규** — 11a(pog·pogReason 결정성), 11b(POG는 승리 팀 선수), 11c(pogReason 각 항목 숫자·태그가 원자료 재집계와 일치 + 역할 접두 일치 + POG 전투 기여 ≥ 승리 팀 중앙값, 250시드), 11d(통제 조합 POG 슬롯 분포 — 모든 역할 >3%·한 역할 <50%, 600시드). import에 `CHAMPIONS` 추가.
- `tests/teamfight-review.mjs`: 승리 팀 POG 슬롯 분포(`pogDist`) 집계·출력.

### 결정: D019 (코드 커밋 `3198ce2`, 문서 커밋은 이 갱신).

### 검증 명령/결과
- `node --experimental-strip-types tests/combat.test.mjs` → PASS(섹션 11 포함). 11d 출력: POG 슬롯 분포 TOP 20.5% JGL 21.8% MID 10.0% ADC 26.8% SUP 20.8%(600시드).
- `tests/engine.test.mjs` → PASS. **1055 결정적 사용자 세트 deep-equal**(pogReason 추가 후에도 유지).
- `ability`·`narration`·`management`·`composition`·`replay` → PASS.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` → exit 0. `npm run build` → exit 0.
- `node --experimental-strip-types tests/teamfight-review.mjs 4000`: POG 슬롯 분포 16.85/24.15/12.35/28.28/18.38%(한 역할 독식 없음). 강화별 승률 CI·행동 지표 D017 대비 전부 불변, `equal` Δ승률 +0(POG 변경이 결과 난수 불흔들).

### 미완/미검증
- **단위 6 step 5(리캡 근거 사건화)**: 미착수. 현재 `recap[]`은 전력 격차 문장 + POG 근거 1줄. 반전 beat·첫 구조물·넥서스 근거로 재구성은 후속.
- **단위 6 step 4(골드 그래프)**: 변경 없음 — `GoldGraph`가 이미 `e.goldA/goldB`(엔진 사건 골드)를 reveal-gate로 그림. 정합 확인만 함.
- **브라우저 육안 미확인**: 이번 세션 dev 서버·브라우저 미기동. RECAP PoG 줄·recap 4번째 문장 렌더는 정적 확인만.
- `damage` 가상 점수는 total엔 소량(×0.16) 반영되지만 이유 문자열엔 미노출 — 의도(체력 시스템 없음).

### 다음
- MATCH-SYS 단위 6 step 5: 리캡을 근거 사건(반전 beat·첫 구조물·넥서스)으로. 훈련 이력 콜백. DRAFT-01·CAST-01 후속과 조율.
- 또는 MINIMAP: 접근 도착 시각 ↔ 합류 판정 통합(별도 체크포인트).
- 배포: 안 함.

## 2026-09-11 — 사용자 요청 재우선순위: 지속형 미니맵 완성 (D020)

사용자 명시 요청: 다음 작업은 리캡 확장이 아니라 "지속형 미니맵 완성"이다. 착수 전 (1) 완료된 POG(D019)를 5개 항목으로 짧게 점검, (2) 미니맵을 D019 이전 결정 기록 포함 최신 코드 상태부터 재확인(이미 완료한 이동 작업 재구현 금지), (3) 미완료 부분만 구현, (4) 고정 시드의 연속 구간(접근 전→교전→후퇴/공성→다음 행동)을 실제 브라우저로 인수 기준 삼아 확인 — 브라우저 미확인이면 시각적 완료로 처리하지 않음, (5) 인수인계.

### 1. POG 점검(D019) — 문제 없음으로 넘기지 않고 실제 결함 2건 발견·수정
- **처치·어시스트 이중가산**: 한타 사건에서 `cb.kills`(공통)와 `cb.fight.contrib.kill`(한타 전용)이 같은 처치를 두 번 셌다 — "N킬 관여"가 "처치+어시스트"라는 표시 의미와 불일치(사용자 점검 항목 5). 한타 `contrib`에서 kill/engage 축 제거, damage(가상)·survived·protect만 반영. 한타 처치의 POG 선정 가중(`TF_KB=1.1`)은 total에만 별도 가산, "킬 관여" 수치엔 미반영.
- **동점 시 고정 슬롯 편향**: 완전 동률에서 슬롯 순회로 항상 TOP이 이겼다(사용자 점검 항목 3). tiebreak 마지막 단계를 `hash(playerId)`로 교체.
- 오브젝트/넥서스 기여는 실제 참가자에게만(점검 항목 2, 문제 없음 확인). POG 변경은 finishMatch에서 마스터리 +3 XP·pog 카운터로 실제 연결됨(점검 항목 4, 문제 없음 확인 — 단 대상이 바뀌므로 장기 마스터리 성장 분포 이동 가능성 기록만).
- 역할 분포(TOP~17·JGL~23·MID~9·ADC~33·SUP~18%, 4000시드)는 "고르다"고 단정하지 않고 **MID 낮음/ADC 높음의 원인**(밑바탕 전투 모델의 rolePri 표적 우선순위·adcSiege 채널)을 밝혀 기록. 공식을 MID 쪽으로 보정하지 않음(역할 고정 재도입 방지).

### 2. 미니맵 최신 상태 재확인 — 완료/부분/미구현 분류(코드 재독 기반, 재구현 없음)
| 항목 | 상태 |
|---|---|
| 10명 전체 매 틱 행동 갱신 | ✅ 완료(D016) |
| 사건 종료 위치를 다음 사건에 유지 | 🟡 부분 → ✅ 이번 세션에 완료(재계획 가드 결함 발견·수정) |
| 다른 라인 독립 행동 | ✅ 완료(D016) |
| 현재 위치→목적지 길찾기(WALK 그래프) | ✅ 완료(D016) |
| 사건 전 접근·집결 | ✅ 완료(D016/D018) |
| 사망·부활·귀환·복귀 일관성 | ✅ 완료(D016) |
| 단위 5 공성·구조물 표시 | ✅ 완료(D018) |
| 실제 브라우저 검증 | 🟡 PC 재검증 완료(이번 세션) / 모바일·탭전환 여전히 도구 제약으로 미확인 |

**발견한 구조적 결함**: `replay.ts`의 "사건 종료 후 다음 armed 사건으로 재계획" 블록은 `fightUntil`/`arriving` 가드 때문에 방금 교전에 들어간 참가자에겐 항상 스킵되는 **죽은 코드**였다(주석의 의도와 실제 동작 불일치). 실제 재계획이 필요한 지점(`fightUntil` 만료·`arriving` 타임아웃)은 조건 없이 `homeNode`로 후퇴시켰다 — 한타 직후 거의 항상 붙는 공성을 놓치고 뒤늦게 걸어 합류(D018이 "합류 이동 ~30/세트"로 남긴 잔여 문제의 원인).

### 3. 구현 — `nextOwnEvent(a)` 신설
`fightUntil` 만료·`arriving` 타임아웃 시점에 이미 armed된 다음 사건 중 이 선수가 낀 것을 찾아, 있으면 바로 그쪽으로 이어 이동(실제 경로, 홈 왕복 없음), 없을 때만 기존처럼 후퇴. 합류 판정(`combat.participants`)·처치·보상은 그대로 — 이동 **계획**만 바뀜.

### 4. 검증
- 같은 시드 12개 직접 비교(수정 전/후): "합류 이동" 579→346(−40%), 원거리(>34u) 349→55(**−84%**). "이동시간 부족"/"합류 실패"는 그대로 0에 근접(60시드 확장 표본 1건, 회귀 아님).
- 7개 스위트 PASS(engine 1060 결정적 세트 deep-equal 유지), tsc 0, build 0.
- **브라우저 육안 확인함**(dev 서버 `localhost:5173`, PC): 기존 저장 커리어 RECAP에서 디버그 모드로 고정 시드 재생 — 드래곤 한타(18:11) → 홈 왕복 없이 경로 유지한 채 바텀 이동 → 바텀 포탑 공성(18:44) → 미드/드래곤 한타(19:03~19:56)로 이어지는 연속 구간 관찰. 다른 라인 독립 행동·벽 통과 없음·사망/부활 동기·콘솔 에러 없음 확인. GIF 6프레임 녹화·내보내기 성공했으나 이 파일시스템에서 접근 불가(D018과 동일 제약).
- 미확인(도구 제약, D018과 동일): 모바일 뷰포트(CDP 스크린샷 1568px 고정), 탭 비활성/복귀 배지 정확한 재현.

### 결정: D020(커밋 `0b58edb`).

### 다음
- MINIMAP 2단계: 접근 도착 시각 ↔ 합류 판정 통합(별도 체크포인트) — 이번 변경은 이동 계획만, 합류 판정은 `combat.participants` 그대로.
- 사용자가 실기기로 모바일/탭전환 확인 가능하면 그 결과 반영. 그 전까지 `/protocol-resume`은 이 항목을 미완료로 유지.
- 배포: 안 함.
