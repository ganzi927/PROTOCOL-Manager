# 다음 세션 인수인계

갱신: 2026-09-11 / **사용자 재우선순위 지시: 다음 작업은 리캡 확장이 아니라 "지속형 미니맵 완성"** · D020(POG 이중가산·고정슬롯 동점 수정 + 미니맵 사건-경계 이동 연속성) 완료 · **다음 = MINIMAP 2단계(접근 도착 시각 ↔ 합류 판정 통합) — 아래 "다음 첫 행동" 그대로 유지, MATCH-SYS 단위 6 step 5(리캡)는 그 다음**
Git: `9e2ac06`(미니맵 이동 정합+구조물+크래시, D018) → `025aedd`(D017/D018 인수인계) → `3198ce2`(단위 6 POG, D019) → `53a348e`(D019 인수인계) → `0b58edb`(POG 수정+미니맵 연속성, D020) → (이 문서 커밋). tag `minimap-pre-persistent` = MINIMAP-02 이전 상태(비교 영상용). 배포 없음.

## 현재 목표 — 우선순위 변경(사용자 지시, 2026-09-11)
**1순위: MINIMAP-01/02 완성.** 사용자가 명시: "다음 작업은 리캡 확장이 아니라 '지속형 미니맵 완성'이다." 요구: 10명 전체의 지속 이동과 사건 경계의 위치 연속성 구현 + 실제 브라우저에서 연속 구간 검증. 이번 세션에 핵심 결함 1건(사건-경계 재계획 가드)을 발견·수정하고 PC 브라우저로 재검증했다(D020). **남은 것**: MINIMAP 2단계(접근 도착 시각 ↔ 합류 판정 통합, 별도 체크포인트) + 모바일/탭전환 실기기 확인 — 아래 "다음 첫 행동" 참조. **모바일/탭전환이 실기기로 확인되기 전까지 MINIMAP을 완료로 표시하지 않는다.**
**2순위: MATCH-SYS 단위 6 step 5(리캡 근거 사건화).** MINIMAP 완성 다음으로 미룬다(사용자 지시).
원래 목표(계속 유효, 순서만 변경): ABIL-01·COMP-01·CAST-01을 **하나의 경기 시스템**으로 완성한다. 중심 원칙: 엔진이 사건을 계산하고 중계·골드 그래프·POG·리캡·조합 예측이 그 결과만 사용한다. 표시용 별도 추첨 금지, 표시값 전력 이중 반영 금지. `docs/claude/BACKLOG.md`의 **"MATCH-SYS" 절**·**"MINIMAP-01" 절**에 상세.

## 진행 상태
**MINIMAP**(이동형 미니맵 중계) — **1순위**
- ✅ 1단계 (D013): 지도·경로 골격 + 바텀 갱킹.
- ✅ **MINIMAP-02 (D016): 지속형 에이전트 재작성** — `WALK` 55노드 보행 그래프, 10명 독립 시뮬(고정 DT 간격, 노드 경로, 행동 변경마다 키프레임), `t=clock/SCALE` 균일, 위치 난수 분리. 사건 전 접근 계획→실제 경로 이동(순간이동 없음). 디버그 모드(통로·경로·행동·diag). **정지 없음·벽 침범 없음·결정성·라인 독립 활동** — replay.test PASS + 브라우저 육안 확인함.
- ✅ **엔진 REGION_DIST 이동 정합 + 구조물 SVG (D018)** — `TRAVEL_K=2.6`(WALK 속도를 엔진 지역 이동 시간에 정렬), `showDelay`(WALK 이동 시간이 엔진 간격보다 길면 화면 사건을 늦춤 — 엔진 판정 불변, `stime`/`eclock` 분리), 계획 재배정. "이동시간 부족"/"합류 실패" 12시드 96/335 → **0/0**, 남는 "합류 이동"은 전량 diag 기록. 구조물 24개 SVG(포탑·억제기·넥서스, `snap.struct`에서만 = 미래 미노출). `manager.tsx` RECAP `meta('').short` 크래시 수정. 브라우저 육안 확인함.
- ✅ **사건-경계 이동 연속성 (D020)** — **10명 전체 지속 이동은 이미 D016에서 완료 상태였다(재확인만)**. 실제 결함: "사건 종료 후 다음 armed 사건으로 재계획"(D018) 블록이 자기 가드 조건 때문에 방금 교전에 들어간 참가자에겐 항상 스킵되는 죽은 코드였음 — 재계획이 실제로 필요한 지점(`fightUntil` 만료·`arriving` 타임아웃)은 무조건 `homeNode`로 후퇴시켜, 한타 직후 거의 항상 붙는 공성을 놓치고 뒤늦게 걸어 합류했다. `nextOwnEvent(a)` 신설로 수정. 같은 시드 12개: 합류 이동 579→346(−40%), 원거리(>34u) 349→**55(−84%)**. **PC 브라우저로 고정 시드 연속 구간(드래곤 한타→바텀 공성→미드 한타) 재검증함** — 홈 왕복 없이 경로 유지, 다른 라인 독립 행동, 벽 통과 없음, 콘솔 에러 없음.
- ⬜ **2단계: 접근 도착 시각 ↔ 합류 판정 통합 ← 다음 첫 행동**(별도 체크포인트) — 아래 절 참조.
- ⬜ **모바일/탭전환 실기기 확인** — 이번 세션도 도구 제약(CDP 스크린샷 1568px 고정)으로 미확인. 실기기·수동 개발자도구 조작 가능한 세션에서 확인 전까지 미완료로 유지.

**MATCH-SYS**(참여자 기반 경기 엔진) — 2순위(MINIMAP 완성 다음)
- ✅ 단위 1~5 + 5 정합성 점검 (D010~D015, D017)
- ✅ 단위 6 첫 슬라이스 (D019, D020에서 점검·수정) — **POG를 실제 사건 기여로 계산**. `combat` 원자료(처치·어시·FB / 한타 `fight.contrib` / 공성 참여·넥서스 / 오브 확보) 슬롯별 집계. D020: 한타 처치 이중가산 제거("킬 관여"=처치+어시스트로 의미 일치), 동점 시 고정 슬롯(TOP) 편향을 선수 id 해시 tiebreak로 제거. `SetResult.pogReason?`. 골드 그래프(step 4)는 이미 정합.
- ⬜ 단위 6 step 5: 리캡 근거 사건화 — **MINIMAP 완성 다음**. `recap[]`를 반전 beat·첫 구조물(`firstStructSide`)·넥서스·`capDiag` 근거로. 훈련 이력 콜백. 골드 그래프=중계 골드 회귀 테스트도 이때.

**기타**: COMP-01 단계 3(조합 예측 UI)/4(AI 밴픽), 전체 밸런스 민감도 검사

## 기준 파일 / 보존
사용자 작업본. 140챔피언, mastery 배열(Lv0~4), DraftState, startDraft/draftPick/draftSwap, flex·스왑, 장기 커리어·저장 유지. 이번 변경들로 저장 형식 불변(새 필드 전부 선택, 구세이브는 폴백).

## 게임 실행 상태
`npm ci`(node_modules 설치됨), Node v22.12.0. 이번 세션은 `npm run dev` → **http://localhost:5173/**(백그라운드) + Claude in Chrome으로 실제 RECAP 조작·검증함. 다음 세션에서 서버가 안 떠 있으면 `npm run dev`로 재기동.

## 완료한 행동/파일 (POG 이중가산·고정슬롯 동점 수정 + 미니맵 사건-경계 이동 연속성, 결정 D020 · 커밋 `0b58edb`)
사용자 요청: 다음 작업을 "지속형 미니맵 완성"으로 재우선순위. 착수 전 (1) 완료된 POG(D019) 5개 항목 점검, (2) 미니맵 최신 상태 재확인(재구현 금지), (3) 미완료만 구현, (4) 실제 브라우저 인수 기준.

**(1) POG 점검** — "분포가 고르다"로 덮지 않고 실제 결함 2건 발견:
- **이중가산**: 한타 처치가 `cb.kills`(공통, 처치+3.0/어시+1.4)와 `cb.fight.contrib.kill`(한타 전용, 처치=+1×2.2/어시=+0.5×2.2)로 **같은 처치를 두 번** 셌음 — "N킬 관여"가 "처치+어시스트"라는 표시 의미와 불일치(사용자 점검 항목 5). `lib/game.ts`: 한타 `contrib`에서 kill/engage 축 제거, `damage`(가상)·`survived`·`protect`만 반영. 처치·어시는 모든 사건 공통으로 `cb.kills`에서만. 한타 처치의 POG 선정 가중(`CB.TF_KB=1.1`)은 `total`에만 별도 가산 — "킬 관여" 표시 수치엔 미반영. `kaTot = kills + assists`로 재정의.
- **동점 시 고정 슬롯 편향**: `total`→`kaW+tfW`→`protW`까지 완전 동률이면 슬롯 순회로 **TOP이 항상 승리**(점검 항목 3). tiebreak 마지막 단계를 `hash(ws[s].id) > hash(ws[pogSlot].id)`로 교체.
- 점검 항목 2(오브/넥서스는 실제 참가자에게만)·4(POG가 마스터리 XP·pog 카운터에 연결됨) 확인 — 문제 없음.
- 역할 분포(통제 조합 4000시드: TOP~17·JGL~23·MID~9·ADC~34·SUP~18%)는 "고르다"고 단정하지 않고 원인(MID는 `rolePri` 2순위 표적이라 사망 잦음·ADC는 `adcSiege` 채널)을 기록. **POG 공식을 역할별로 재보정하지 않음**(그건 역할 고정 재도입).

**(2) 미니맵 재확인** — `replay.ts`를 D013/D016/D018 결정 기록과 함께 재독. 8개 요구 항목 중 6개(10명 전체 매 틱 갱신·라인 독립 행동·WALK 길찾기·사전 접근/집결·사망-부활-복귀 일관성·구조물 표시)는 **이미 완료**(재구현 안 함). "사건 종료 위치를 다음 사건에 유지"만 절반만 동작:
- 사건 해소 블록의 "다음 armed 사건으로 재계획"(D018) 로직이 `if(fightUntil[...]!==undefined || arriving[...]) continue` 가드 때문에 **방금 교전에 들어간 참가자에겐 항상 스킵되는 죽은 코드**였다(주석 의도와 실제 동작 불일치). 실제 재계획 지점(`fightUntil` 만료·`arriving` 타임아웃)은 조건 없이 `homeNode`로 후퇴 — 한타 직후 거의 항상 붙는 공성을 놓치고 뒤늦게 걸어 합류(D018이 "합류 이동 ~30/세트"로 남긴 잔여 문제의 원인).

**(3) 구현** — `lib/simulation/replay.ts`: `nextOwnEvent(a)` 신설(이미 armed된 사건 중 이 선수가 낀 것을 찾음). `fightUntil` 만료·`arriving` 타임아웃 시점에 확인해, 있으면 바로 그쪽으로 이어 이동(`route`로 실제 경로, 홈 왕복 없음), 없을 때만 기존처럼 후퇴. **합류 판정(`combat.participants`)·처치·보상은 그대로** — 이동 계획만 바뀜.

- 검증(자동): 7개 스위트 PASS(engine **1060 결정적 세트** deep-equal 유지), tsc 0, build 0. 같은 시드 12개 직접 비교 — 합류 이동 579→346(−40%), 원거리(>34u) 349→**55(−84%)**. 이동시간 부족/합류 실패는 그대로 0 근접(60시드 확장 표본 1건, 회귀 아님). `tests/combat.test.mjs` 11c(250시드)·11d(600시드) 갱신, `tests/teamfight-review.mjs`는 D019와 동일 하네스로 재측정(강화 CI 전부 D017/D019와 불변).
- **(4) 검증(브라우저, PC)**: dev 서버(`localhost:5173`) 기동 + Claude in Chrome으로 실제 조작. 기존 저장 커리어(T1 vs KT)의 RECAP을 디버그 모드로 재생 — 드래곤 한타(18:11)→**홈 왕복 없이 경로 유지**한 채 바텀 이동→바텀 포탑 공성(18:44)→미드/드래곤 한타(19:03~19:56)로 이어지는 연속 구간을 시간순 스크린샷 6장으로 관찰. 다른 라인 독립 행동, 벽 통과 없음, 사망(✕)/부활 텍스트 동기, 콘솔 에러 없음(`read_console_messages` 확인) 확인. GIF 6프레임 녹화·내보내기 성공했으나 **이 파일시스템에서 접근 불가**(D018과 동일한 환경 제약). **미확인**: 모바일 뷰포트(`resize_window`+새로고침 후에도 CDP 스크린샷 1568px 고정 — D018과 동일 제약), 탭 비활성/복귀 배지의 정확한 재현(자동화 중 정지는 관찰됐으나 실사용자 재현 필요).

## 완료한 행동/파일 (MATCH-SYS 단위 6 첫 슬라이스 — POG, 결정 D019 · 커밋 `3198ce2`)
목표: BACKLOG "단위 6" 절의 **정확한 첫 작업 = POG를 실제 개인 기여로 계산**. 골드 그래프(step 4)는 이미 정합이라 확인만. 리캡(step 5)은 후속.
- `lib/game.ts`:
  - `SetResult.pogReason?:string` 신규(선택 필드 — 저장 형식 불변, 구세이브 폴백).
  - `simulateSet` 말미 POG 블록 **재작성**: 역할별 고정 가중치(`e.index` 분기 + 슬롯 상수 배열 `[.15,.15,.2,.3,.2]` 등) → **사건(combat) 원자료 슬롯별 집계** `cSide:{A:SC[5],B:SC[5]}`.
    - 공통: `combat.kills` 처치 +3.0 / 어시 +1.4 / FIRST BLOOD +1.5.
    - 갱킹·스커미시 무처치 승리: 그 라인 참가자 +1.0(라인 주도권).
    - 오브 확보: 확보 팀 합류자 +0.7(정글 slot1 +1.5).
    - 한타: `cb.fight.contrib[]` 그대로 — `kill·2.2 + engage·1.2 + damage·0.16 + survived·0.25`, `protect·(2.2·1.1)`.
    - 공성: 철거 참가자 +1.0/구조물(원딜 slot3 +1.8/구조물 — `adcSiege` 채널과 정합), `siege.nexus` 참가자 +4.0.
  - POG = `winner===m.a?cSide.A:cSide.B` 최댓값 슬롯. tiebreak: `kaW+tfW` → `protW` → 슬롯 순.
  - `pogReason` = `"<ROLE> · <최대 3개 항목>"`. 항목: `${N}킬 관여`(=`kills+assists+round(Σcontrib.kill)`) / `한타 딜러 보호 ${M}회` / `오브젝트 ${K}회 확보` / `구조물 공성 ${S}회` / `넥서스 파괴 가담`, 전부 0이면 `라인·운영 주도권`. **`damage`(가상 점수)는 문자열에 미언급.**
  - `recap[]`에 4번째 문장(POG 근거) 추가.
  - **불변**: 승부(`rng`)·골드(`flavor`)·중계(`narr`)·전투(`crng`) 난수 스트림 호출 순서·횟수, `p`·`lead`·`advantage`·`pressure`. POG는 순수 사후 읽기.
- `app/manager.tsx`: RECAP 카드 PoG 줄에 `{last.pogReason&&<em className="pog-why">{last.pogReason}</em>}`.
- `app/globals.css`: `.pog-why` 규칙(1줄).
- `tests/combat.test.mjs`: import에 `CHAMPIONS` 추가. **섹션 11 신규** — 11a(pog·pogReason 결정성), 11b(POG는 승리 팀 선수), 11c(pogReason 각 항목 숫자·태그가 원자료 독립 재집계와 일치 + 역할 접두 일치 + **POG 전투 기여 ≥ 승리 팀 중앙값**, 250시드), 11d(통제 조합 POG 슬롯 분포 — 모든 역할 >3%·한 역할 <50%, 600시드).
- `tests/teamfight-review.mjs`: 승리 팀 POG 슬롯 분포(`pogDist`) 집계·출력.
- 검증: 7개 스위트 PASS, tsc 0, build 0. engine.test **1055 결정적 세트 deep-equal 유지**. combat 11c 250시드 전부 이유↔사건 일치 + POG가 승리 팀 전투 기여 중앙값 이상(역할 고정 아님). combat 11d(600) / teamfight-review(4000): POG 슬롯 분포 ≈ TOP 17 / JGL 24 / MID 12 / ADC 28 / SUP 18 %(한 역할 독식 없음). teamfight-review 강화별 승률 CI·행동 지표 D017 대비 **전부 불변**(`equal` Δ승률 +0). 상세 `VALIDATION.md` 2026-09-11 단위 6 절.

## 완료한 행동/파일 (단위 5 정합성 점검, 결정 D017 · 커밋 `7167829`)
- `lib/simulation/combat.ts` `resolveSiege`: **`behind` 게이트 3줄 삭제**(`dealtMe`/`dealtOpp`/`behind`, `budget=min(budget,1)`, `targetBase&&behind` 차단). `capacity` 그대로. `REGION_DIST`·`regionTime` **export**(D018용).
- `lib/game.ts`: `SetResult.endReason` → `'NEXUS'|'CAP_TIME'|'CAP_EVENT'`. `CapDiag` 타입 + `SetResult.capDiag`. `simulateSet` CAP 블록 재작성: `capReason = cs.clock>=CLOCK_CAP ? 'TIME' : 'EVENT'`, tiebreak 4단계(struct/pressure/advantage/coin) + `tiebreakStage` 기록, `recentSiegeFails`(최근 5건). `endLine` 텍스트 분기.
- `tests/combat.test.mjs` 섹션 10: 10i(capDiag 계약) 재작성 + **10j**(구조물 열세팀이 교전 승리 후 철거 — 회귀 + 대조) + **10k**(공성 직전 상태 동일, 죽은 슬롯만 ADC↔TOP — 통제 실험, 1.00 vs 2.00).
- `tests/ability.test.mjs`: `endReason` 문자열 갱신.
- `tests/teamfight-review.mjs`: `setMetrics`에 CAP 시간/사건·tiebreak 단계·CAP/동전 A승률. `run()` 집계. `pairedCI`에 McNemar 산식 상세 주석 + `b`/`c` 반환. 출력에 페어 원자료.
- 검증: N=6000 — NEXUS 97.62% / CAP 2.38%(전부 EVENT, TIME 0%). CAP tiebreak 동전 실측 0. 강화 CI 전부 0 배제. 7개 스위트·tsc·build PASS. balance-review 비교(서로소 모집단) → VALIDATION 2026-09-11 절.

## 완료한 행동/파일 (미니맵 이동 정합 + 구조물 SVG + 크래시, 결정 D018 · 커밋 `9e2ac06`)
- `lib/simulation/replay.ts`:
  - `import {REGION_DIST,regionTime} from './combat.ts'`. `TRAVEL_K=2.6`(export), `walkNodeRegion`, `walkSeconds`, `travelAudit()`(export) — 엔진 지역쌍 이동 시간 vs WALK 그래프 대조.
  - 에이전트 `speed = SPEED[sl]*TRAVEL_K`. `evInfo`에 `eclock`(엔진, 불변)·`stime`(화면)·`showDelay`. `showDelay = clamp(walkSeconds(이전 노드→이 노드)*1.2+10 − 엔진 간격, 0, 34)` — 화면 사건을 늦춰 참가자가 실제로 걷게. 해소·arming 블록 타이밍 참조 전부 `stime`, `engineClock` 필드는 `eclock`.
  - 사건 종료 시 참가자를 다음 armed 사건으로 **재계획**. `fightUntil`/`arriving` 중인 에이전트는 재계획·이동 지시 금지(같은 tick 교전↔이동 키프레임 충돌 방지 — `emit` dedup이 앞 키프레임 덮어쓰는 것). `tail`을 다음 사건 `stime` 기준 클램프.
  - tick 끝 이동 키프레임(`dist(p0,posOf)>3`이면 emit — 긴 단일 구간 보간 폭증 방지). 종료 키프레임 `endClock+4`(루프 마지막 tick과 시각 겹침 방지). `ReplayData.travel = {k,lateJoins,farJoins,ratioMedian}`, `diag[0]` = 대조 요약. 남는 "합류 이동"은 전량 diag에 거리·`showDelay` 기록. `#N: rs 엔진 참가자이나 미니맵 사망`도 기록.
- `app/replay-theater.tsx`: `STR` 좌표 상수(팀별 라인 3×[외곽·내곽·억제기] + 넥서스포탑 2 + 넥서스). `structLayer` useMemo → `<g className="rt-structs">` (24개). `snap.struct`(재생 시각까지 집계)에서만 → 미래 미노출. 살아있음=팀색 채움, 파괴=회색 테두리(+넥서스 ✕).
- `app/globals.css`: `.rt-turret`/`.rt-inhib`/`.rt-nexus`/`.rt-nexus-x`.
- `app/manager.tsx`: RECAP 이벤트 로그 `<span className="event-team">{e.winner?meta(e.winner).short:''}</span>` — `winner:''`(공성 HELD/NO_WINDOW·noMove 한타)에서 `meta('').short` 크래시(**D015 잠재 버그**) 수정.
- `tests/replay.test.mjs`: 섹션 3 step 상한 8→16(요구 변경 주석). **섹션 10 신규**: REGION_DIST 대조(크기 80%+ 정렬, 큰 차이 순서 보존, 모든 참가자가 창 종료까지 'fight/사망/diag 기록' 중 하나, `farJoins` 유한·전량 로그).
- 검증: 12시드 — "이동시간 부족" 96→0, "합류 실패" 335→0. 7개 스위트·tsc·build PASS. **브라우저 육안 확인함**(dev 서버 RECAP: t=0 홈 정지 → 전령 FB → 다음 사건, 구조물 24개, 넥서스 파괴 시 해당 팀만 회색+✕, 디버그 이동 대조 패널, 배속 2×·시크·다음 사건, 콘솔 크래시 없음).

## 완료한 행동/파일 (MINIMAP-02 지속형 미니맵, 결정 D016)
- `lib/simulation/replay.ts` **내부 완전 재작성**(공개 API 유지: `buildReplay`·`stateAt`·`posAt`·`MAP`·`pathBetween`):
  - **`WALK`**(export): `MAP` 세분(각 통로 중점 `w{i}`) + 정글 캠프 `*C` 4점 + 분수대 `A_ft`/`B_ft` = 55노드 보행 그래프. `route(from,to)`=WALK adj Dijkstra. `distToCorridor(p)`·`WALL_TOL`(export) = 벽 침범 검사.
  - **에이전트 시뮬**: 10개 `Agent{route:string[],seg,segT,fixedPos,act,speed,nextDecide,alive,respawnAt,plan,lane,jgIdx,pushBias}`. 고정 `DT=2.5`초 tick 루프. 매 tick: 부활 → 사건 해소(arm된 것 중 `clock>=ev.clock`) → 접근 계획 부여(`ev.clock-lead` 이전, lead는 참가자 최장 이동시간 기반) → `decide` → 이동(노드 단위, 여러 노드 지나면 경유 키프레임 시각 거리 비례 분산).
  - **decide**: `a.plan`(사건 집결) > `groupSoon`(58초 내 큰 교전 참가 예정) > 역할별. 라이너 = farm zone(pushBias로 중심, 그 부근 2~3노드 왕복, zone이 라인 위를 드리프트) / 정글 = 캠프 순찰 + 오브·갱킹 접근(`pickDiff` — 현재 노드 제외) / 서포터 = 원딜 zone 한 칸 앞 지원(좌표 복제 아님) + 로밍. 정글 위험 감지 → `L.own`으로 `turn` 반전 후퇴. 교전 후 → 자기 홈으로 물러났다 `nextDecide=clock+5` 뒤 재판단.
  - **사건 연결**: 발생 순간 `dist≤5`면 그 자리 fight / `5<d≤26`면 `arriving`(경로대로 계속 이동, 도착 시 fight) / `d>26`이면 `diag` "합류 실패". 처치·승패는 엔진 `combat` 데이터 그대로(이동 모듈은 전투 결과 안 만듦). `headTo`가 현재 구간 보존(일반=앞 노드부터 이어붙임, `turn`=구간 반전) → 역주행·순간이동 없음.
  - **시각**: `t = clock/SCALE`(SCALE=18 균일). 위치·상태·beat·골드 모두 `t`의 함수. `RESPAWN`을 `combat.ts`와 동일하게(`10+min(42,clock/60*1.5)`) 맞춰 `notJoined` 판정 일치.
  - **난수**: `mulberry32(hashStr(sig))`, `sig` = `events[].{index,prob,goldA,winner}` + picks. outcome/narration과 분리. `buildReplay(set)` 순수·결정적.
  - `ReplayData`에 `nav:{segs}`(디버그 통로)·`diag:string[]`·`scale`. `TrackKey`에 `act?`·`reason?`. `stateAt`에 `gameClock`. `posAt`가 `act`/`reason` 반환·`fight` 키프레임도 정지. **`agentsAt(rd,t)`**(export) = 전 선수 pos·state·act·reason·남은 경로.
- `app/replay-theater.tsx`: 디버그 토글(🐞) — WALK 통로(`.rt-nav`)·선수별 남은 경로(`.rt-path`)·아이콘 아래 행동(`.rt-actlabel`)·diag 패널(`.rt-diag`). 교전/사망 시 `scatter(slot)` 표시 보정(~2.4u, 논리 위치와 구분). `snap.gameClock` 사용. 배속 1×/2×/4×.
- `app/globals.css`: `.rt-nav/.rt-path/.rt-actlabel/.rt-diag` 규칙.
- `tests/replay.test.mjs`: **section 3 재작성**(고정 노드 → `distToCorridor` 허용치 + 0.25s step<8). **section 9 신설**(정지 없음·경로 연속·라인 독립·diag 유한·결정성·`agentsAt`). section 5는 교전 시점~창 종료만 검사.
- 체크포인트: git tag `minimap-pre-persistent` (재작성 이전 = `595b3ea`).

## 완료한 행동/파일 (MATCH-SYS 단위 5, 결정 D015)
- `lib/simulation/combat.ts`:
  - `MatchState`에 `clock`(경기 시계 초)·`struct:{A,B:number[3]}`(수비 팀 라인별 진행도 0~3)·`baseTurrets:{A,B}`(2→0)·`nexus:{A,B}`·`lanePush:{A,B:number[3]}`(운영 주도권, 미니언 아님)·`region:{A,B:Region}`. `newMatchState` 초기화. `Region='base'|'top'|'mid'|'bot'|'river'`, `REGION_DIST` 이동 시간 표.
  - `resolveTeamfight`: 교전 후 `st.clock += 14`, `st.region` = 교전 지역, `registerKill`의 `respawnAt`에 `+ kills.length*4`(계단식 부활 → 다음 사건에 5v5/4v5 섞임). 결판 승자 `lanePush` +0.18, 전 라인 0.85배 감쇠.
  - **신규 `resolveSiege(st, seq, clock, crng)`** (~95줄): 공격 자격 → 목표 라인/베이스 → `windowTime = 부활까지 − 이동시간`(≤2면 NO_WINDOW) → 여력 `numAdv*1.15 + timeF*1.15 + clamp(goldGap,-0.6,0.85) + (bestObj-55)/44 + adcSiege*0.75 + momentum*1.0` → 구조물 진행(라인 최대 2, 억제기 1개 열려야 베이스, 넥서스 = `baseTurrets===0 && budget충분 && def≤3`). 구조물 열세(−4)면 `budget=min(budget,1)` 견제만. 구조물 골드 `resource[]`로 1회. `CombatEvent.siege={result,side,lane,from,structuresDown,reinforceIn,capacity,structAfter,baseTurretsAfter,nexus}`. `SiegeResult='SIEGE'|'INHIB'|'NEXUS'|'NO_WINDOW'|'HELD'|'RESET'`. 상수 `TOWER_G=110·INHIB_G=175·NEXUS_TURRET_G=125·NEXUS_G=220`.
- `lib/game.ts` `simulateSet`: 루프 재구성 — `rollFight(phase,access)`·`finalize(idx,i,cb,r,waIn)`·`doSiege(idx)` 클로저. 스켈레톤 `for(i<9)` 각 한타 뒤 `doSiege` → 넥서스면 `endReason='NEXUS'` break. 이후 **연장 루프** `while(!nexusDown && clock<3600 && ei<29)` 한타+공성. 넥서스 없으면 `endReason='CAP'`, `phase:'종료'` 사건 push(판정: 구조물 피해 > pressure > advantage > `random(hash(seed|tiebreak|...))`). `pressure===3` break **삭제**(tiebreak 입력만). `SetResult.endReason`. POG 기여 필터에 `e.combat` 가드 + `kind==='siege'` 가중치 `[.15,.1,.15,.4,.2]`.
- `lib/simulation/narration.ts`: 공성 브랜치(`c.combat.kind==='siege'` — RESET/NO_WINDOW/HELD/SIEGE/INHIB/NEXUS별 문구, 넥서스 사건이 '돌아보기'+FB 콜백). 한타 브랜치의 `c.last||i===8` 넥서스 주장 **삭제**. `EVENT_MIN[i>=9]` 폴백.
- `lib/simulation/replay.ts`: `eventNode` 공성 분기(수비 팀 라인 노드). `StructSnapshot`·`beat.struct`(공성 beat마다 양 팀 구조물 스냅샷)·`stateAt().struct`. 사건 앵커 부활(참가자로 복귀 시 그 창에서 부활 beat — `clockMap`/`engineToPlay` 삭제). `e.phase==='종료'` 스킵. 철거된 구조물만 `siege`/`nexus` beat.
- `app/replay-theater.tsx`: 사이드 패널에 구조물 상태 텍스트(`snap.struct` — 억제/포탑/넥서스포탑 카운트, 미니맵 아이콘 미구현의 명시적 대체 표시). `snapKey`에 struct 포함.
- 테스트: `tests/combat.test.mjs` 섹션 10(공성 — 창/ADC 기여/순서/이중 보상 방지/넥서스만 종료/CAP vs NEXUS 구분). `tests/replay.test.mjs` 섹션 8(구조물 스냅샷 단조·철거만 파괴 표시·재생 끝=엔진 최종). `tests/teamfight-review.mjs` 단위 5 지표 + 페어 95% CI(McNemar). `ability.test`·`composition.test`·`engine.test` 필터·상한 갱신(요구 변경, 주석).

## 완료한 행동/파일 (MATCH-SYS 단위 4, 결정 D014)
- **단위 3 정합성 점검**: 1a·1b·1c 이미 정합(수정 없음), 회귀 테스트 `combat.test` 7e·8a·8b로 고정. 1d(라인 우위 전달 경로 표)·1e(숙련·오프롤 이중 아님, 통제 실험)는 D014에 표로 기록. **수정 불필요.**
- 신규 `resolveTeamfight(st, seq, edgeA, margin, clock, crng)` (`lib/simulation/combat.ts`):
  - `reviveByClock` 후 생존자만 `participants`, 죽은 인원 `notJoined`(사유 `전투 이탈(리스폰 대기)`).
  - **edgeA/margin = '교전 전 유리함'**. `favWins = crng()<clamp01(0.5 + margin*0.75 + numAdvFav)`. `numAdvFav=(nFav−nOth)*0.16` = 실제 생존 인원차(p에 없던 새 채널). **`p`(확률) 안 건드림** → 전력 이중 반영 없음.
  - 능력치 = '누가 죽고 누가 살리나'만: 표적 우선순위 `rolePri={ADC:0,MID:1,SUP:2,JGL:3,TOP:4}`, 동순위는 MEC+VIS 낮은 쪽. SUP peel = 한타당 1회(`clamp01(0.12+(TF+VIS−110)/150)`), 성공 시 그 한타 내내 ADC 표적 제외 + `contrib.protect`. 어시스트 = 처치자 제외 생존 공격자 중 TF 가중 무작위 최대 2명.
  - **승패 = 실제 처치 수**: `wkA>lkA` → wSide, `lkA>wkA` → lSide(역전), 동수는 `trade`(margin<0.05) 또는 양쪽 0이면 무승부, 아니면 wSide 지역 장악. `nFav===0` → ONE_SIDED 상대 승. 양쪽 0 → NO_SHOW. `crng()>=engageP` → NO_ENGAGE.
  - `TFResult='ONE_SIDED'|'DECISIVE'|'TRADE'|'NO_ENGAGE'|'NO_SHOW'`. `Contrib={ref,kill,engage,protect,damage,survived}` (`damage`는 CAR·MEC 기반 **가상 점수** — 주석 명시, '실제 피해량' 아님). `CombatEvent.fight={result,winner,aliveA,aliveB,contrib}`. `CombatEvent.kind`에 `'teamfight'`. `TF_KILL_G=280·TF_ASSIST_G=125·TF_DEATH_G=200`.
- `lib/game.ts` `simulateSet` `i>=5`: `resolveTeamfight(cs,i,edgeA,margin,[1080,1320,1560,1800][i-5],crng)` → `lead[s]+=ce.resource[s]`. `wa = fight.winner ?? edgeA`. `tfNoWin = i>=5 && !fight.winner` → `noMove`(advantage·momentum·표시 골드 균등, pressure 증가 없음). **pressure는 `fight.winner==='A'|'B'`에서만**. `events.push`에 `edge:edgeTeam`(전술적 우위 분리 기록). POG 기여 필터에 `!(e.combat?.fight && !e.combat.fight.winner)`. `p` 불변.
- `lib/simulation/narration.ts`: `c.combat && c.combat.kind==='teamfight'` 분기 — 인원 표기(5v5 or "N인, M인") → 공백(notJoined) → 진입(`contrib.engage` 최고) → 보호(`contrib.protect>0`) → FB(`at(6)`, `mem.fb.clock=fmt(climax-6)`) → 반전(fed 캐리 사망) → 연계 → 결과. NO_ENGAGE→해산, TRADE→교환 beat. 구세이브 휴리스틱 폴백 유지.
- `lib/simulation/replay.ts`: `eventNode` 한타 분기(seq 5→dragon,6→baron,7→mid,8→B_base). **`deaths[]`(사망마다 1건)** → 부활 beat도 사망마다 1건(test4가 처치_n↔부활_n 짝지음). 부활은 베이스 회색 키프레임만(라인 복귀 걷기 제거 — 다음 접근이 `homeNode`에서 출발하므로 시간 겹침·순간이동 방지). 접근 루프: 직전 키프레임이 `dead`면 `nearestNode` 대신 `homeNode(p)`에서 출발.
- `tests/combat.test.mjs`: 섹션 9 신설(위 검증). `tests/teamfight-review.mjs` 신규(통제 한타 실험 하네스, `balance-review.mjs`와 같은 통제 조건).
- `tests/ability.test.mjs`·`tests/combat.test.mjs`: 일부 크기 임계값 완화(방향·부호 유지, 회귀 0·음수만 차단). 근거 주석. **목표 승률 맞춤 전역 계수 조정 없음.**

## 완료한 행동/파일 (단위 2, 결정 D011)
- `lib/simulation/combat.ts`: `resolveBotLane(st,seq,wa,margin,clock,crng)` 신설 — ADC·SUP 2v2(+정글 합류 시 3인). 결과 5종(ADC 처치 / SUP 보호 성공 / SUP 희생 / 발각·후퇴 / 순수 라인). `MatchState.jglCommits`, `CombatEvent.followUp` 추가.
- `lib/game.ts` `simulateSet` `i===2`: `dom` 대신 `resolveBotLane` 자원. **`RES_LANE_LEAD`·`RES_BOT`·`RES_JGL_CARRY` 상수 삭제** — 정글 자원은 combat 단일 소스(합류=어시스트, 미합류=템포). `visEdge*RES_VIS_PROTECT`(팀 맵 시야)는 단위 3·4까지 유지.
- `lib/simulation/narration.ts`: 바텀도 `c.combat` 경로(딜러 보호 흐름 서술). `euro(laner)` 조사 수정. "앞선 합류에 이어" 콜백을 `cb.followUp`로.
- `tests/combat.test.mjs`: 바텀 2v2 능력→행동 케이스 추가.
- 검증: `SUP VIS만 +20` 51.95→52.85(원래 50.90 대비 +1.95%p). balance ±0.5%p(단 `팀 전체+10` 79.33, D009 대비 +0.7%p 누적 — 단위 5 후 재튜닝 대상). combat 바텀 케이스·전체 스위트·tsc·build PASS.

## 완료한 행동/파일 (MINIMAP-01 1단계, 결정 D013)
- 신규 `lib/simulation/replay.ts` (순수 — 난수·Date 없음, `buildReplay`는 SetResult만 읽음):
  - `MAP`: 0~100 좌표, **SVG y↓**, A(블루) 좌하 / B(레드) 우상. `nodes`(라인·강·정글·베이스·`baron`(전령/바론)·`dragon`) + `edges`(통로). `pathBetween(from,to)` Dijkstra → 이동은 통로 위에서만.
  - `buildReplay(set)` → `ReplayData{duration, windows[{seq,start,end,engineClock,label,kind}], tracks[10]{key:{t,pos,state}}, beats[{t,seq,kind,ref,by,assists,side,scoreDelta,fb}], goldKeys, finalScore}`. **연출 재생 시각(t) ↔ 엔진 시각(engineClock) 분리**. 원본 사건 id(`seq`) 유지. 골드는 엔진 `goldA/goldB` 매핑(재계산 없음).
  - `stateAt(rd,t)` — t 이하 beat만 집계(배속·정지·되감기 무관, 미래 미노출). `posAt(track,t)` — 선분 보간, 사망 시 정지.
  - 바텀(사건 2) 완전 연결. 탑·미드·오브는 위치·처치·불참 표시(접근 애니는 정글만). 한타(5~8): combat 미구현 → 팀 단위 킬 피드.
- 신규 `app/replay-theater.tsx`: SVG 미니맵 + 단일 재생 시계(`tRef`+rAF, 위치는 SVG `transform` 직접 갱신 = 프레임당 리렌더 없음). 컨트롤: 재생/정지·1×2×·다음 사건(⏭)·시크바·처음부터. `visibilitychange`→자동 일시정지. 초상화 `champImageUrl`+약칭 폴백. 아이콘 팀색 테두리·클릭→`onSelectPlayer(playerId)`.
- `app/manager.tsx` RECAP: `<ReplayTheater>` 를 이벤트 로그 위에 배치. `onProgress(seq)`→`setReveal(v=>Math.max(v,seq+1))` (텍스트 로그 = 미니맵과 같은 시계). 기존 `setTimeout` 공개 루프·`speed`·`결과 보기` 제거(스포일러 방지). `app/globals.css`에 `.replay-theater`·`.rt-*` 규칙.
- 엔진 무변경. `tests/replay.test.mjs` 신설.
- 검증: `tests/replay.test.mjs` PASS + 전체 스위트/tsc/build PASS. 실제 RECAP 육안 확인(이동·스컬·점수/골드/시각 진행·킬 피드·컨트롤). 미확인: t=0 정지, 탭 비활성 일시정지, 모바일 비율, 아이콘 클릭.

## 완료한 행동/파일 (MATCH-SYS 단위 3, 결정 D012)
- **설계 경계**: `simulateSet` 구간 롤 `edgeA=rng()<p`의 의미 분리. 라인(0~2)·한타(5~8) = 확정 승자. **오브전(3·4) = 유리한 시작**. 확보 팀은 `resolveObjective` 결과로 결정, `wa = secured ?? edgeA`. `advantage`는 확보 팀 기준으로만 이동(미확보면 없음). `rng()` 사건당 1회 유지 → 재현성·다른 사건 불변.
- 신규 `resolveObjective(st, seq, kind:'herald'|'dragon', edgeA, margin, clock, crng)` (`lib/simulation/combat.ts`):
  - 참여자: 전령=정글·탑·미드(+조건부 SUP), 드래곤=정글·미드·원딜·SUP(+조건부 TOP). `reviveByClock` 후 생존 확인, 도착 확률 = 개인 자원차+TF. 불참 이유(`전투 이탈(리스폰 대기)`/`라인 처리`/`도착 지연`)를 `notJoined`에 기록.
  - 능력→행동: OBJ(정글 가중 0.9)·TF·MEC·VIS(`bestVis`)·CAR(마무리 골드).
  - 결과 5종: `SECURE_UNCONTESTED`/`SECURE_AFTER_FIGHT`/`CONTESTED_NO_SECURE`(secured=null, `pendingObjective` 남김)/`UPSET_SECURE`/`CANCELLED`. 스틸 제외.
  - 자원: 처치+어시스트(참여자만)+오브 팀보상(확보 팀 5칸, 불참 포함, `OBJ_TEAM_G` 전령 0.75×)+확보 정글 보너스. 미확보 0.
- `lib/game.ts` `simulateSet` 루프 재구성: `edgeA`/`margin`/`wa` 분리. `i<5` 브랜치가 `resolveObjective` 호출 → `lead[s]+=ce.resource[s]`. `advantage`·`w`는 secured 기준. `access`·`resPow`는 확률/전력 채널(자원과 별개). `CombatEvent.kind`에 `'objective'`, `objective`/`notJoined` 필드. `MatchState.pendingObjective`.
- `lib/simulation/narration.ts`: 오브전 `c.combat` 경로 — 접근/시야 → 합류/공백(불참 이유) → 교전 → 확보/미확보/역확보 → 해설. FB가 오브에서 나면 1회. 감독 레버('초반 압박을…') 오브 미확보·early·열세일 때만.
- `tests/combat.test.mjs`: 오브 섹션 7 추가.

## 완료한 행동/파일 (단위 1, 결정 D010)
- 신규 `lib/simulation/combat.ts` (순수 모듈, game.ts 런타임 import 없음):
  - `newMatchState(aStarters,bStarters,aPicks,bPicks,masteryFn,offRoleFn)` → `MatchState` (10인 `Combatant`: side/slot/role/champ/player/stats/mastery/off/alive/respawnAt/kills/deaths/assists/gold).
  - `resolveGank(st, seq, lane 0|1, wa, margin, clock, crng)` → `CombatEvent`. 탑/미드 2대1 갱킹. 능력→행동: 합류=TF+margin−LNE우위, 발각=수비 VIS, 처치=공격 MEC·LNE+정글 이니시 vs 수비 회피 MEC·VIS+탈출 여지, 마무리 골드=CAR. 결과 4종. `resource`는 A 관점 슬롯별 골드 델타.
  - `reviveByClock(st, clock)` — 단위 3~4용(라인 0·1에선 아무도 안 죽은 상태 진입).
  - `CombatEvent`: seq/clock/kind/lane/side/committed/spotted/participants/kills(killer·victim·assists·clock)/escaped/noKill/firstBlood/resource/prior/evidence.
- `lib/game.ts` `simulateSet`:
  - `crng=random(hash(seed|combat|matchId|setIdx))` 전용 난수. `cs=newMatchState(...)` 세트당 생성.
  - 루프에서 `i<2`(라인 0·1): `resolveGank` 호출 → `for(s) lead[s]+=ce.resource[s]` (기존 `dom`·`RES_LANE_LEAD` 산출 대체). `i===2`(바텀): 기존 휴리스틱 + 정글 편승 + 시야 보호 그대로.
  - `GameEvent.combat?` 선택 필드. `narrateEvent` ctx에 `combat:combatEvt` 전달.
  - **outcome/flavor/narr 난수 스트림 호출 순서·횟수 불변** → `SetResult` deep-equal 결정성 유지.
- `lib/simulation/narration.ts`: `NarrCtx.combat?` 추가. 라인 0·1은 `c.combat`의 실제 참여자·피해자·어시스트·생존으로 beats. 첫 킬은 `combat.firstBlood`에서만. `e.kills`=combat 집계. 라인 2는 기존 휴리스틱 유지.
- 신규 `tests/combat.test.mjs`.

## 검증 명령과 결과 (단위 5 시점)
- `combat.test` 섹션 10, `replay.test` 섹션 8 신설 PASS. `ability/composition/narration/management/engine` PASS(engine 1,082 세트). `tsc --noEmit` exit 0, `npm run build` exit 0.
- **`tests/teamfight-review.mjs 8000`(단위 5)**: 정상(NEXUS) 96.2% / 상한(CAP) 3.8%, 사건/세트 16.8. 오브 확보→구조물 진행 90.5%. 첫 구조물 선취 팀 승률 68%. 공성 시 A-ADC 생존이면 철거 1.76 vs 사망 0.18. 대칭(동일 픽) 승률 49.75%(편향 없음), 태그쌍 균형 48.7%.
- 강화 효과(동일 시드 페어, 95% CI): TOP LNE +1.48[0.64,2.31] · SUP VIS +1.75[0.98,2.52](딜러 생존 +7.1%p) · JGL OBJ +1.54[0.63,2.45](확보 +10.1%p) · ADC CAR +4.47[3.20,5.75] · ADC MEC +2.95[1.80,4.10] · SUP TF +4.14[2.85,5.42] · 팀+10 +25.76[24.38,27.15]. **모든 CI 0 배제** — 단위 4의 pressure-레이스 압축이 공성→넥서스 경로로 풀림. 단, 작은 효과는 스트림 의존(위 "미검증" 참조).
- `ability.test`(사건 수 상한·`kind==='teamfight'` 필터·초반 한타 한정)·`composition.test`(동일)·`engine.test`(사건 수 상한)는 **요구 변경**에 맞춰 갱신 — 임계값 하향 아님, 근거 주석. 상세 `VALIDATION.md`(2026-09-10 단위 5 절).

## 검증 명령과 결과 (단위 4 시점)
- `node --experimental-strip-types tests/combat.test.mjs` → PASS: 기존(결정성·재처치 금지·중계 바인딩·갱킹·오브전) + **섹션 9(resolveTeamfight 구성 상태 고정)**: 5v5 결과 계약 / 유리 팀 전멸→ONE_SIDED 상대 승 / 양 팀 없음→NO_SHOW / **3v5 열세→한타 승률 <50%** / 핵심 딜러 부재→미참여·재처치 금지 / SUP VIS·TF↑→보호 성공률·딜러 생존율↑ / FB 1회 / 결정성 / TRADE·NO_ENGAGE winner=null.
- `node --experimental-strip-types tests/teamfight-review.mjs [N]` (신규, 기본 8000 페어 시드): 통제 한타 실험. 균형 50.06%(편향 없음), 결판 93.4%, 딜러 생존 65.2%, 보호 성공 32.1%. 강화별(강화−균형): **SUP VIS +20 딜러 생존 +6.96%p·보호 성공 +13.13%p**, SUP TF +20 세트 +3.2%p·딜러 생존 +6.76%p, ADC CAR +20 세트 +3.2%p·한타 승 +1.99%p, JGL OBJ +20 확보 +10.07%p, TOP LNE +20 세트 +0.46%p. 원자료: 한타 30,189·결판 28,209·무승부 1,980·보호 시도 14,055.
- **단위 3 vs 단위 4**(같은 스펙, 단위 3은 VALIDATION 기록값): TOP LNE +2.30→+0.46%p, SUP VIS +2.19→+0.10%p(대신 딜러 생존율로 발현), JGL OBJ +3.74→+0.98%p(확보율 +10.6→+10.1%p 유지), 팀+10 +29.93→+20.80%p. 참여자 기반 한타의 의도된 압축·재분배 — **전역 계수 조정 없음**.
- `tests/ability.test.mjs`·`tests/combat.test.mjs` 일부 크기 임계값 완화(방향·부호 유지, 회귀 0·음수만 차단). 근거는 각 테스트 주석·D014 대안 절.
- `tests/management.test.mjs`·`tests/engine.test.mjs`(1,134 세트)·`tests/ability.test.mjs`·`tests/composition.test.mjs`·`tests/narration.test.mjs`·`tests/replay.test.mjs` → PASS.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` → exit 0. `npm run build` → exit 0.
- 전체 표·중계 예시는 `docs/claude/VALIDATION.md`(2026-09-10 단위 4 절).

## edgeA / margin ↔ 결과 / 종료 (단위 3~5)
- **라인(0~2)**: `edgeA=rng()<p` = 확정 승자. combat은 '어떻게'만.
- **오브전(3·4)**: `edgeA` = 유리한 시작. `resolveObjective`가 실제 확보 팀 결정. `wa = secured ?? edgeA`. `advantage`는 `secured` 기준. 확보 → 그 라인 `lanePush` +0.5.
- **한타(5~8 + 연장)** (D014): `edgeA`/`margin` = **교전 전 유리함**. `favWins=clamp01(0.5+margin*0.75+numAdvFav)`, **실제 처치 수로 승패 확정**. `wa = fight.winner ?? edgeA`. **pressure는 `fight.winner`에서만**(이제 tiebreak 입력일 뿐). TRADE/NO_ENGAGE/NO_SHOW/ONE_SIDED → 사전 edgeA로 안 이김. `p` 불변.
- **공성(단위 5, D015)**: 한타 뒤 `resolveSiege`. 승자만·생존 인원차·부활 창·자원·주도권으로 구조물 진행. 한타 승리만으로 자동 철거 안 함. 구조물 골드는 `lead`로 1회(`p`에 별도 항 없음).
- **종료** (D015): **정상 = 실제 넥서스 파괴 사건에서만**(`endReason='NEXUS'`). 상한(`endReason='CAP'`, `phase:'종료'` 사건) = 구조물 피해 > pressure > advantage > `random(hash(seed|tiebreak))`. **edgeA·마지막 사건 방향을 숨은 기본 승자로 쓰지 않음.** 9번째 사건이라는 이유로 승자 안 정함. `CLOCK_CAP=3600s / EVENT_CAP=30`.

## 아직 실패하거나 미검증인 것
- **MINIMAP 2단계 미착수**(D020 다음): 접근 도착 시각 ↔ 합류 판정 통합. 아래 "다음 첫 행동" 참조. **이게 이번 세션 이후 최우선 미완료 항목.**
- **모바일 뷰포트 실기기 미확인**(D018·D020 동일 제약): `resize_window(390×844)` + 새로고침 후에도 CDP 스크린샷이 1568px 고정 — 코드상 `@media(max-width:820px)` 반응형 규칙은 정적 확인만, 런타임 확인 두 세션 연속 불가. **실제 모바일 기기나 브라우저 개발자 도구를 직접 조작할 수 있는 환경에서 확인 전까지 이 항목을 완료로 표시하지 않는다.**
- **탭 비활성/복귀 정확한 재현 미확인**: D020에서 자동화 도중 "탭 비활성 — 일시정지됨" 배지가 뜨고 재생이 실제로 멈추는 것은 관찰(핸들러 동작 방증)했으나, 자동화의 포커스 전환이 실제 사용자 탭 전환과 동일한 신호인지 불확실하고 배지가 재생 재개 후 바로 사라지지 않았다. 실사용자 재현 필요.
- **비교 영상 미첨부**(D018·D020): 두 세션 모두 자동화 Chrome이 GIF를 녹화·내보내기(다운로드)까지는 성공했으나 이 파일시스템에서 접근 불가 — Chrome 확장의 다운로드 경로가 이 세션 파일시스템과 분리된 것으로 보임(D018에서도 동일 증상, 원인 미확정). 변경 전 화면 = `git checkout minimap-pre-persistent` 필요(현재 코드로는 재현 불가).
- **접근 도착 시각 ↔ 합류 판정 미통합**(D018, D020에서도 미착수): `showDelay`/`nextOwnEvent`는 화면 렌더·이동 계획만 조정, 결과 불변. `combat.participants`가 여전히 authoritative. 다음 첫 행동.
- **`top↔river` WALK 이동 비율 2.2**(D018, D020에서 미변경): WALK 그래프에 강↔탑 직결 통로 없어 우회. 다른 지역쌍은 0.66~1.45(중앙값 1.23). `replay.test` 섹션 10에서 명시적 예외.
- **단위 6 리캡(step 5) 미착수**(D019): `recap[]`는 아직 전력 격차 문장 + 마지막 교전 확률 + POG 근거 1줄. **MINIMAP 완성 다음으로 미룸**(사용자 지시).
- **골드 그래프 = 중계 골드 회귀 테스트 미작성**(D019): `GoldGraph`가 `e.goldA/goldB` 단일 소스임은 정적 확인만. 자동 테스트는 step 5와 함께.
- **`contrib.damage`(가상 점수)는 POG total에 ×0.16 소량 반영**(D019/D020): `pogReason` 문자열엔 미노출(체력·피해 시스템 없음 — 의도). POG가 승리 팀 "실제 사건 기여" 중앙값 미만인 세트가 400시드 중 4.5%(최대 격차 3) 존재 — `damage`/`survived`의 소액 타이브레이크 채널 때문, `combat.test` 11c에 근사 허용치로 반영(D020).
- **POG 슬롯 분포가 균등하지 않음(D020 발견·기록, 보정 안 함)**: 통제 조합 4000시드 TOP~17·JGL~23·**MID~9**·**ADC~34**·SUP~18%. POG 집계 공식 자체는 역할별 가중치 차이가 없음(모든 슬롯 동일 계산) — 편차는 밑바탕 전투 모델(한타 `rolePri`가 MID를 2순위 표적으로 삼아 사망이 잦음, `adcSiege` 채널이 생존 원딜의 공성 기여를 가중)에서 비롯된 것으로 판단. 실제 커리어의 다양한 스탯 분포·숙련에서는 미확인.
- **넥서스 조건이 교착에서 다소 빡빡**(D017): CAP_EVENT 2.4%의 대부분이 양 팀 억제기 부근까지 갔으나 넥서스(수비 소수 + budget 정렬)를 못 낸 교착. 회귀 아님. 후속 검토.
- **작은 강화 효과 부호 흔들림**(D017): SUP_VIS·TOP_LNE 등 |Δ|<3%p는 teamfight-review CI가 0 배제해도 balance-review(다른 해시 스트림 = 서로소 모집단)에선 크기 불확실. 큰 효과(ADC_CAR·SUP_TF·팀+10)와 행동 지표는 견고. VALIDATION 2026-09-11 절.
- **스노볼 = 개인 성장(레벨/골드 곡선) 없음**: 자원은 `Combatant.gold`로 누적돼 공성 여력·`resPow`에 반영되지만, "성장한 캐리가 끊겨 역전" 같은 명시적 성장 곡선은 없다. `numAdvFav`(실제 인원차)는 계단식 부활 + 좁은 창으로 이제 **가끔** 활성(사망 불참 슬롯 1.3%). 단위 6/후속에서 개인 레벨 근사 검토.
- **`RES_VIS_PROTECT`(i=2 팀 맵 시야) 여전히 미이관**: 단위 5에서 손대지 않음(D014 결정 유지). 후속 전체 밸런스 패스 대상.
- **태그쌍 균형 48.7%** (a-vs-b 픽쌍, 단위 4 대비 ~−1.4%p 이동): 이 픽쌍 고유의 `powerDelta` 비대칭이 공성 경로로 다르게 가중된 것. **동일 픽 대칭 = 49.75%(편향 없음)**. 강화 비교는 같은 픽쌍 페어라 무영향. 후속 밸런스 패스에서 `powers()` 픽쌍 비대칭 자체를 별도 검토.
- **CAP 판정 동전 (D017로 완화)**: `endReason` `CAP_TIME`/`CAP_EVENT` 분리 + `capDiag.tiebreakStage`. 동전은 struct==·pressure==·advantage==0 완전 동률일 때만 — 실측 도달 0(N=6000, CAP n=143 중 struct 127/pressure 14/advantage 2). 전용 해시 스트림(경기 난수와 분리) 50/50.
- **작은 강화 효과는 확정 아님 (D017 문서화)**: SUP_VIS·TOP_LNE 등 |Δ|<3%p는 teamfight-review CI가 0 배제해도 balance-review(`m.id` 다름 = 서로소 게임 모집단)에선 크기 불확실(SUP_VIS +2.2 vs +0.4). 균형 자체도 두 하네스 47.62% vs 48.75%. 견고: 큰 효과(ADC_CAR·SUP_TF·팀+10)와 행동 지표(딜러 생존·보호 성공·오브 확보·첫 구조물). VALIDATION 2026-09-11 절에 산식·복구.
- `powersA/powersB`는 D008에서 조합 항 제외.

## 다음 첫 행동 — MINIMAP 완성 (사용자 지시로 최우선. MATCH-SYS 단위 6 step 5는 그 다음)

**사용자가 명시한 다음 첫 작업(그대로 인용)**: "10명 전체의 지속 이동과 사건 경계의 위치 연속성을 구현하고, 실제 브라우저에서 연속 구간을 검증한다."

이 문장 자체는 **이번 세션(D020)에서 대부분 달성했다** — 10명 전체 지속 이동은 D016에서 이미 완료 상태였고(재확인함, 재구현 안 함), "사건 경계의 위치 연속성"은 이번 세션에 실제 결함(`nextOwnEvent` 부재)을 찾아 고쳤고 PC 브라우저로 고정 시드 연속 구간(드래곤 한타→바텀 공성→미드 한타)을 재생해 검증했다. **`/protocol-resume`가 다음 세션에도 "MINIMAP 완성"을 계속 선택해야 하는 이유**는 이 문장이 완전히 끝나지 않았기 때문이다:

### 미완료 조건 (이 중 하나라도 남아 있으면 "MINIMAP 완성"을 계속 최우선으로 선택할 것)
1. **모바일 뷰포트 실기기 확인 안 됨** — 이 세션(그리고 D018)에서 브라우저 자동화 도구의 CDP 스크린샷이 1568px에 고정되어 실측 불가. `@media(max-width:820px)` 반응형 규칙은 코드로만 확인.
2. **탭 비활성/복귀 정확한 재현 안 됨** — 자동화 중 정지는 관찰했으나 실사용자 탭 전환과 같은 신호인지 불확실.
3. **접근 도착 시각 ↔ 합류 판정 통합 미착수** — 아래 "정확한 착수 절차" 참조. 이게 남은 작업 중 유일하게 새 코드가 필요한 큰 덩어리다.
4. **비교 영상(변경 전 대비) 미첨부** — GIF는 두 세션 다 녹화·내보내기 성공했으나 파일시스템에서 회수 불가(원인 미확정).

### 정확한 착수 절차 — 접근 도착 시각 ↔ 합류 판정 통합 (별도 체크포인트)
1. **먼저 확인**(재구현 방지): `lib/simulation/replay.ts`의 `evInfo[i].showDelay`·`d`(사건 시각 참가자-사건노드 거리)·`arriving{}`·`nextOwnEvent`(D020)가 이미 무엇을 계산해 두었는지 다시 읽는다. 이번 단계는 그 값을 **합류 판정에 연결**하는 것이지, 이동 시뮬레이션을 다시 만드는 게 아니다.
2. **설계를 먼저 문서화**(코드 전에): 미니맵의 이동 도착 시각(`d<=6`/`5<d<=26`/`d>26` 판정)을 엔진의 능력치 기반 판정(`resolveObjective`의 `arriveP`, `resolveTeamfight`의 인원차 `numAdvFav`)과 **정확히 어떻게 결합할지** DECISIONS.md 초안으로 먼저 적는다 — "독립 확률을 두 번 적용하지 않는다"는 사용자 원칙을 지키는 구체적 산식(예: 이동 도착이 이미 불참을 결정했다면 능력치 기반 도착 확률은 그 참가자에 대해 생략, 등)을 정하고 나서 코드를 짠다.
3. **엔진 변경과 시각화 변경을 분리**: `combat.ts`(`resolveObjective`/`resolveTeamfight`)가 참가자 목록을 결정하는 방식이 바뀌면 그건 **결과에 영향을 주는 변경**이다. `replay.ts`만 건드리는 지금까지의 패턴(D018/D020, 결과 불변)과 **명확히 다른 종류의 변경**임을 인지하고 별도 커밋으로 분리한다.
4. **결과가 바뀌는 부분을 명시 기록**: 어느 유형의 사건에서 어떤 참가자가 새로 불참 처리되는지(또는 그 반대) 표로 남긴다. `combat.test`/`teamfight-review.mjs`로 이전 D017/D019/D020 측정치와 나란히 재측정 — 방향과 크기를 both 보고한다(개선이라 주장하지 말고 변화를 있는 그대로).
5. **완료 조건**: (a) 설계 문서화 완료, (b) 엔진 참가자 결정 로직 변경(필요한 경우) + 결과 변화 표, (c) `replay.ts` 연결, (d) `combat.test`/`replay.test`/`teamfight-review` 갱신 + PASS, (e) tsc/build 0, (f) PC+모바일 브라우저로 새 합류 판정이 만든 화면(예: 전에는 화면에 보이던 참가자가 이제 `notJoined`로 빠지는 경우)을 실제로 관찰.
6. 이 단계를 마친 뒤에도 모바일/탭전환 실기기 확인이 안 됐다면, MINIMAP을 여전히 미완료로 두고 그 사실만 정확히 기록한다(과장 금지).

### 그다음 — MATCH-SYS 단위 6 step 5 (리캡 근거 사건화, BACKLOG "단위 6" 절 5번)
MINIMAP이 위 조건을 모두 충족한 뒤 착수. 단위 6의 POG(step 1~3, D019/D020)·골드 그래프 확인(step 4)은 이미 끝났다. 남은 건 `recap[]`뿐:
1. 현재 `recap[]` = 전력 격차 2문장 + 마지막 교전 확률 1문장 + POG 근거 1문장. **흐름을 바꾼 실제 사건**으로 재구성: 반전 beat(`narration.ts` `NarrMemory`), 첫 구조물 선취(`simulateSet` 내 `firstStructSide` — 현재 지역 변수, 필요 시 `SetResult`로 노출), 넥서스/CAP 판정(`endReason`·`capDiag`).
2. "이 선수 덕분에 +8%" 같은 **미계산 % 설명 금지**. 준비한 계획(전술·focus) 이행 여부, 다음 세트 밴/전술 제안.
3. 훈련 이력 콜백(실제 `trainChamp`·성과 기록이 있고 관련 행동이 나왔을 때만, 반복 방지).
4. 검증: 결정성, 리캡 문장이 실제 사건과 일치(지어낸 수치 없음), **골드 그래프 = 중계 골드 회귀 테스트**(D019에서 미작성 — 여기서 추가).
주의: `GoldGraph`·POG 집계는 이미 정합 — **건드리지 말 것**.

## 재현 시드/경로
- combat 샘플: `newGame('nva',7)` → `upgradeGame` → `g.seed=<n>` → `simulateSet(g,{a:'nva',b:'crn',...})`. `r.endReason`('NEXUS'|'CAP_TIME'|'CAP_EVENT'), `r.capDiag`(CAP일 때), `r.events[i].combat`.
- **미니맵 사건-경계 연속성(D020)**: 수정 전/후 비교는 `git stash`로 코드를 되돌린 뒤 같은 스크립트를 두 번 돌리는 방식(임시 스크립트, 저장 안 함) — `buildReplay(simulateSet(g,M)).travel.lateJoins`/`.farJoins`를 seed 0~11(또는 0~59)에서 합산. `rd.diag`에서 `d=>d.includes('합류 이동')`/`d=>d.includes('원거리 합류')`로 직접 세도 같은 값. 브라우저 재현: dev 서버 RECAP → 디버그(⚙) 켜고 "다음 사건"으로 한타 직전까지 이동 → 배속 1~2×로 재생하며 한타 종료~다음 공성 구간을 관찰(디버그 경로선이 홈으로 갔다가 되돌아오면 회귀, 곧장 이어지면 정상).
- **단위 6 POG(D019, D020에서 수정)**: `combat.test` 섹션 11 — 11c는 `simulateSet(g0,REAL)`(seed 0~249)로 `r.pog`·`r.pogReason`을 `rawTally(r.events,side,slot)` 독립 재집계와 대조(D020: `rawTally`에서 `tfInv` 제거, `kaTot=kills+assists`). 11d/`teamfight-review.mjs 4000`은 통제 조합(`controlledBase` + 태그쌍 픽)에서 승리 팀 POG 슬롯 분포(런마다 변동, TOP~17·JGL~23·MID~9·ADC~34·SUP~18% 근방). `r.pogReason` 형식 `"<ROLE> · N킬 관여 · …"`. POG 슬롯 = `(r.winner===m.a?r.lineupA:r.lineupB).indexOf(r.pog)`.
- **단위 5 점검(D017)**: `combat.test` 10j(구조물 열세팀 철거 회귀 — `mkState`에 `struct.A=[3,2,2]`·`baseTurrets.A=1`·B 4명 사망), 10k(공성 직전 상태 동일, 죽은 A 슬롯만 3↔0). `teamfight-review.mjs 6000` → CAP 시간/사건·tiebreak·CAP A승률·페어 b/c 출력. `balance-review.mjs`와 승률 비교 시 `m.id` 다름(서로소 모집단) 유의.
- **미니맵 이동 정합(D018)**: `travelAudit()` = 지역쌍 엔진 초 vs WALK 초 vs 비율. `rd.travel = {k,lateJoins,farJoins,ratioMedian}`. `rd.diag[0]` = "이동 대조: TRAVEL_K=... · WALK/REGION_DIST 비율 중앙값 ... · 지연 합류 N(원거리 M)". 개별 "합류 이동(거리 Nu, T=...s +지연 Ks)". `replay.test` 섹션 10 = 대조 검사.
- **공성/종료(단위 5)**: 통제 base(전스탯70) + `structuredClone` + `g.seed=<seed>`. `tests/teamfight-narration-examples.mjs` 실행 → NO_WINDOW/INHIB/NEXUS/CAP/TRADE 각 사례 + 재현 시드 출력. `resolveSiege` 직접 호출: `mkState`(combat.test 섹션 7) + `s.clock`·`s.struct.B`·`s.baseTurrets.B` 설정 + `s.B[sl].alive=false; respawnAt=...`(창 조절).
- **한타(단위 4)**: seed 0 #7 = 보호 성공→A-ADC 생존, seed 6 #5 = edgeA=A인데 winner=B, seed 50 #8 = TRADE.
- 실험 하네스: `node --experimental-strip-types tests/teamfight-review.mjs 8000`(단위 4·5 지표 + 페어 95% CI). `tests/balance-review.mjs`. 임시 대칭 체크: 동일 픽으로 `simulateSet` N회.
- 결정성: 같은 seed 2회 `JSON.stringify(simulateSet)` 동일.
- 미니맵 재생: `buildReplay(simulateSet(g,m))` → `rd`. `stateAt(rd,t)` = 점수·골드·피드·중계·구조물·gameClock. `posAt(rd.tracks[k],t)` = 위치·state·act·reason. `agentsAt(rd,t)` = 전 선수 pos·act·reason·남은 경로(디버그). `rd.diag` = 이동↔사건 일정 진단. `rd.nav.segs` = WALK 통로.
- MINIMAP 검증: `replay.test`(section 9 = 정지 없음·경로 연속·라인 독립). 임시 스모크: `buildReplay(set)` 두 번 `JSON.stringify` 동일(결정성), 트랙별 `posAt`를 0.4s 간격 샘플 → 이동 프레임 >35%·`distToCorridor ≤ WALL_TOL+1.2`. 브라우저: dev 서버(`localhost:5176`) RECAP, 디버그 토글(🐞)로 경로·행동·diag 확인.

## 작업 경계
라이브 배포 없음. Claude 연결 계정 없음. 세이브 삭제/마이그레이션 수정 없음. package.json/lockfile 변경 없음(`npm ci`만). 과거 완료 경기를 새 엔진으로 재계산하지 않음.

## 다음 갱신 양식
- 현재 목표 / 완료한 행동·파일 / 검증 명령·결과 / 미완·미검증 / 결정·이유 / 다음 첫 행동 / 재현 시드·경로
