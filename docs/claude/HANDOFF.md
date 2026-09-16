> 2026-09-16 최신(5): **F21(세트 사이 적응과 시리즈 규칙) 완료.** 상세는 `BACKLOG.md`의 "F21" 절과 `DECISIONS.md`의 **D026**을 먼저 읽을 것. 요지: `aiPick`(실제 밴픽 결정 함수)이 같은 매치의 이전 세트(`m.sets`)를 전혀 안 읽고 있었다 — F07(상대 응수 탐색)과 헷갈리기 쉬운데 그건 "같은 드래프트 안 한 수 앞"이지 "시리즈 기억"이 아니라 완전히 다른 기능이었다. `seriesSignal(m,teamId)` 신설 — 상대가 이긴 세트의 상대 픽=밴 신호, 내가 진 세트의 내 픽=픽 감점 신호(내가 이긴 세트는 신호 없음). **가중치를 처음엔 감으로 대칭(+4/-3)으로 잡았다가 500시드 실측에서 밴 92.8%·픽 87%→3.3%로 사실상 하드 배제가 되는 걸 발견하고(F12와 똑같은 종류의 실수) 재보정**: 밴 `+3`(3.4%→44.8%), 픽 `-0.5`(87%→49.3%) — 밴/픽 점수식 스케일이 원래 다르다는 걸 실측 없이 넘어갔으면 놓쳤을 것. 피어리스 드래프트(밴이 세트 넘어 누적)는 이 게임이 이미 "미지원"이라 명시한 규칙이라 하드 배제가 아니라 점수 가산/감산으로만 구현 — 최종 결정은 여전히 전체 스코어 경쟁. `draftRecommendations`(사용자 추천)와 PREP 화면 배너에도 같은 신호를 노출해 AI만 아는 정보가 없게 함(F07 철학의 시리즈 단위 확장). 완료 조건 1번(세트 전환 시 컨디션·숙련·밴 풀 오초기화 금지)은 코드 감사로 이미 충족 확인(재구현 안 함) — `continue` 커맨드는 phase만 바꾸고, `DraftState`는 `startDraft`마다 새로 생성돼 밴 풀이 세트마다 새로 열림. 대회별 밴픽 규칙 분리도 `settings` 화면이 이미 "피어리스 미지원"을 정직하게 고지하고 있어 별도 시스템 불필요로 판단. `tests/series.test.mjs` 신설(3섹션), 첫 실행 PASS. `aiPick`은 세트1(`m.sets` 빈 배열)에서 가산항이 정확히 0이라 기존과 수학적으로 100% 동일 — 이 구조 덕에 회귀 위험이 낮음. tsc/build/`management.test.mjs`/`engine.test.mjs`(1106세트) 전부 재확인 PASS, 브라우저 확인(PREP·드래프트 화면 정상, 추천 패널에 `match` 전달 후에도 크래시 없음, 콘솔 에러 없음). **F19·F20·F21 전부 커밋 후 `git push` 완료**(사용자 지시 — 하나 끝나면 바로 push). **알려진 제한**: "선발"(로스터 교체)·"우선 라인"(tactic/focus) 자동 조정은 다루지 않음(밴/픽 우선순위만), 보정 상수는 F15급 대규모 검증 전. **다음 세션**: F22(시즌 서사와 규칙 버전별 메타)로 순차 진행 — 착수 전 이 파일의 F19/F20/F21 "알려진 제한" 문단부터 읽을 것. 완료 항목 재구현 금지.
>
> 2026-09-16 최신(4): **F20(재정·계약·스태프의 실제 선택) 완료.** 사용자 지시("차례차례 구현, 하나 끝나면 git push")에 따라 F19 Phase A 커밋·푸시 후 곧장 F20 착수. 상세는 `BACKLOG.md`의 "F20" 절과 `DECISIONS.md`의 **D025**를 먼저 읽을 것. 요지: `nextSeasonPayroll`/`annualBalance` 신설 — 재계약으로 예약된 다음 시즌 연봉과 만료 예정 계약을 반영한 "다음 시즌 확정 급여"를 계약 화면에서 바로 볼 수 있게 함. **더 중요한 발견**: 기존 파산 방지 비상 지원이 매주 3억을 무제한·무대가로 지급하고 있었다 — 완료 조건 "반복 지원으로 모든 선택이 무의미해지지 않게"를 정면으로 위반하는 상태였다. `Team.bailouts?`(시즌마다 리셋)로 반복될수록 지원액이 30→22→14→10억(하한)으로 줄고 2회째부터 팬 만족도가 깎이게 고쳤다 — 완전 차단은 안 함(다른 시스템이 현금 흐름에 의존해 영구 잠김 위험). 계약 화면에 규칙 설명 문구 + 이번 시즌 누적 횟수 상시 노출. 스태프 효과 격리는 grep 감사 결과 이미 충족돼 있어 재구현 안 함. `settleWeek`이 게임 전체에서 매우 자주 불리는 핵심 함수라 변경 전 기존 테스트가 `cash`/`fan` 정확값을 스냅샷 비교하지 않는지부터 확인하고 진행 — `tests/finance.test.mjs` 신설(4섹션), 첫 실행 PASS. tsc/build/`management.test.mjs`/`engine.test.mjs`(1097세트) 전부 재확인 PASS. 브라우저 확인: 계약 탭·코칭스태프 탭의 "연간 예상 운영 잔액"이 정확히 같은 값을 보임(리팩터링이 값을 안 바꿨다는 직접 증거), 콘솔 에러 없음. **F19·F20 모두 커밋 후 `git push` 완료**(사용자 지시 — 작업 유실 방지). **알려진 제한**: 비상 지원 상수는 설계 가설(F15급 대규모 검증 안 함), 예상 현금 흐름은 연간 요약 하나뿐(주 단위 그래프 아님). **다음 세션**: F21(세트 사이 적응과 시리즈 규칙)로 순차 진행 — 착수 전 이 파일의 F19/F20 "알려진 제한" 문단부터 읽을 것. 완료 항목 재구현 금지.
>
> 2026-09-16 최신(3): **F19 Phase A(스카우팅·유망주·영입 — FA 비교 도구 + 잠재력 불확실성 표시) 완료.** 사용자 지시("순차적으로 진행하되 완벽하게 만들기 위한 과정을 생각하며")에 따라 F19 착수. 상세는 `BACKLOG.md`의 "F19" 절과 `DECISIONS.md`의 **D024**를 먼저 읽을 것. 요지: 기존 선수 상세의 "성장 여력 높음/보통" 라벨이 숨은 `pot` 값을 문턱값만 씌워 사실상 그대로 노출하고 있었음을 발견(지시서가 금지한 "확정 숫자 공개") — `scoutPotential(p)` 순수 함수(id 해시 기반, F18 temperament와 같은 "저장 없이 결정적" 패턴)로 교체해 관측 범위(`lo~hi`)와 육성 거리 3단계(가까움/보통/멂)만 보여준다. 오차 폭은 나이가 어릴수록 커짐(25세 근방부터 좁아짐). 정확한 훈련 소요 "주수" 같은 숫자는 의도적으로 안 만듦(train()의 실제 성장식이 코치·훈련 종류에 의존해 단일 숫자면 거짓 정밀도). FA 시장 탭에 포지션·연봉 상한 필터 + 4종 정렬(즉시 전력/육성 상한/연봉/나이) 신설. `tests/prospect.test.mjs` 신설(6섹션 — 결정성, 범위 유효성, devTier 일치, 추정 오차가 실제로 존재함, 나이↔불확실성 상관관계, "즉시 전력 순위 ≠ 육성 상한 순위"), 첫 실행 PASS. tsc/build 통과, `management.test.mjs` 재확인 PASS. 브라우저 확인 완료(`localhost:5174`, 포지션 필터·정렬 전환 실제 조작, 콘솔 에러 없음). **알려진 제한**: 챔피언 풀 필터(지시서 세 번째 축)는 이번에 안 함, 보유 선수 관측 누적(오래 보유할수록 범위가 좁아지는 모델)도 새 영속 필드가 필요해 다음 조각으로 미룸. **다음 세션 첫 행동**: F19 Phase B(챔피언 풀 필터) 또는 F20(재정·계약·스태프 화면)으로 순차 진행 — 착수 전 BACKLOG.md "F19" 절 "다음" 문단부터 읽을 것. Phase A 재구현 금지.
>
> 2026-09-16 최신(2): **F18 Phase D(정보 확보·콜 성향을 실제 엔진 행동에 연결) 완료 — 4축(교전/자원/정보/콜) 전부 실제 결정 게이트에 연결됨.** 상세는 `docs/claude/BACKLOG.md`의 "F18" 절 "완료 — Phase D"와 `DECISIONS.md`의 **D023 "Phase D 추가"**를 먼저 읽을 것 — 이 파일의 아래 옛 기록(Phase A/B/C 완료 시점 기록)보다 우선한다. 요지: `info`(안전 확인↔적극 탐색)는 `resolveObjective`의 **condSlot**(로밍형 슬롯 — 전령 서포터/드래곤 탑, base=0.42)에만, `call`(계획 준수↔기회 제안)은 `resolveTeamfight`의 **engageP**(한타 실제 성사 여부, 실제 참가자 평균)에 연결했다. resource는 그대로 "핵심 참석" 슬롯(base=0.9)에만 남겨 둬 같은 확률에 두 축이 중복 가산되지 않게 슬롯을 나눴다(원래 코드의 base=0.9/0.42 구분을 그대로 축 분리 기준으로 썼다) — **부수 회귀 확인**: resource가 더 이상 condSlot에 안 닿는 것도 새 테스트로 검증(Phase B 때는 구분 없이 전체 비고정 슬롯에 적용돼 있었음). call은 F12의 `dEngage`와 같은 채널(교전 성사만, 승패는 안 건드림)을 재사용 — 새 확률 채널을 또 만들지 않았다. **실측(4000시드, 조합·시드 통제)**: info 로밍 합류율 38.9%(안전 확인)→47.7%(균형)→57.8%(적극 탐색), call NO_ENGAGE율 19.5%(계획 준수)→11.5%(균형)→4.7%(기회 제안) — F12가 처음 겪은 "지배적 레버"(무교전이 거의 사라짐) 수준은 아님을 확인. `tests/combat.test.mjs` 섹션 9d 신설(6개 검정: 단조성 2개·채널 비중첩 2개·승패 무관 1개·결정성 1개), 첫 실행 PASS. `app/manager.tsx`의 `TEMPERAMENT_COPY`에서 info/call `connected:true`로 전환, "아직 경기 행동에 연결 안 됨" 배지 제거(engage/resource와 동일한 강점/주의 문구로 교체). `narration.ts`에 두 채널 모두 F13 원칙(엔진 evidence에 실제로 찍힐 때만 언급) 그대로 연결. tsc/build 통과, `narration.test.mjs`·`ability.test.mjs`·`composition.test.mjs`·`broadcast.test.mjs`·`recap.test.mjs`·`challenges.test.mjs`·`temperament.test.mjs` 등 무관 스위트 재확인 PASS(나머지 백그라운드 확인은 아래 진행 상태 참조). **알려진 제한(유지)**: "실제 경기에서 드러난 사례" UI(사용자 지시 6번)는 Phase D에서도 구현하지 않음(scout/trainingLog 같은 영구 로그 필요, 다음 조각) — F15급 대규모 시즌 시뮬레이션 검증(정적 4000시드 격리 실험이 아니라 실제 시즌 진행에서의 팀간 격차)도 아직 안 함. **다음 세션 첫 행동**: 이 두 "알려진 제한" 중 하나를 사용자와 확인해 착수하거나, F19로 진행.
>
> 2026-09-15 최신: `docs/claude/PROTOCOL-Claude-Development-Orders.md`(F01~F27)를 순서대로 진행 중 — F01~F11 완료(F02는 모바일 픽셀 인수만 도구 제약 BLOCKED, F08·F11은 코드 변경 없이 이미 충족돼 있음을 검증만 함). F09에서 `combat.ts`에 `MatchState.wave`(라인 웨이브 집계, 공성 capacity에 반영) 신설, F10에서 `resolveObjective`가 미확보 시 그 웨이브를 나눠주도록 연결됨(F09/F10이 서로 이어짐) — 귀환 사건화·밀고/버리고 자원 분기·개인 파밍 수입·오브젝트 재생성 데이터화·시야 구역은 아직 없음(F03의 골드 통합 전제조건 부분 진전만). **F11(공성·넥서스 마무리)은 조사 결과 `resolveSiege`가 이미 실제 생존자·이동시간·웨이브·구조물 상태를 전부 연결하고 있었다** — `tests/f11-siege-sweep.mjs`(신설, assert 없는 진단 스크립트, `f11-siege-results.json`에 원자료)로 실측: 넥서스 종료율 99.2~100%(CAP_TIME은 5000+시드 중 0회), 한타 승리 직후 공성이 구조물 무변화로 끝나는 비율 27~31%("재정비가 나은 상황"이 이미 자연 발생). **부수 발견(F11 범위 밖, F15로 이관)**: 평균 스탯 ±10(5명 전원)만으로 세트 승률이 30%p 이상 흔들리고 ±20이면 95%+/3%대로 거의 결정론적 — 의도된 설계인지 미확인, F15가 반드시 다뤄야 함. **환경 참고**: 이 컴퓨터에서 사용자의 다른 프로젝트 dev 서버와 CPU 경합으로 `combat.test.mjs`가 평소보다 훨씬(10~24분) 느려질 수 있다 — 느리다고 성급하게 코드를 의심하거나 무관한 프로세스를 죽이지 말고 `Get-Process`로 실제 CPU 소모(진행 중인지)부터 확인할 것. **새 테스트를 combat.test.mjs에 추가할 땐 먼저 격리 스크립트(scratchpad)로 값을 직접 찍어보고 assert를 쓸 것** — 이번 세션에 `resource` 배열 크기(5칸 A관점 차이값, 10칸 아님)를 두 번(F09, F10) 헷갈렸다. 실제 완료/검증 기록은 `docs/claude/DEVELOPMENT_ORDERS_PROGRESS.md`를 먼저 읽을 것 — 이 파일의 아래 옛 기록보다 우선한다. F04에서 `Game.phase`에 `'TACTICAL'`이 추가되고 `case 'play'`의 동작이 바뀌었다(이제 즉시 세트를 끝내지 않고 라인전 미리보기 후 감독 지시를 기다린다). F05~F06에서 `lib/balance/composition.ts`에 `CURATED`(대표 21종 수동 프로필) + `sideline`(사이드 운영)·`pick`(픽/매복) 축이 추가됐다. F07에서 `aiPick`에 상대 응수 1단계 탐색(`bestOpponentReply`)이 추가됐다 — **사용자 실제 매치에서만** 돈다(배경 자동 매치는 성능 때문에 가드로 제외, 기존과 동일). **F15(밸런스 검증 도구)도 진행했다** — `tests/teamfight-review.mjs`(기존, 이번 세션 전까지 문서에 언급 안 됐던 자산)에 이미 McNemar 기반 페어 95% CI 인프라가 완성돼 있어 재사용만 함: N=3000 재확인 결과 **F11이 발견한 "스탯 ±10에 승률 30%p" 신호는 `team_all+10`(5명 전원 6축 전부 동시 강화)이라는 비현실적 시나리오에서만 나타났다** — 단일 역할·단일 축 +20은 +1.7~+4.1%p로 작고 유의미하며 정상 범위(우려했던 것보다 건전). `tests/f15-side-swap.mjs` 신설(진영 A/B 라벨 자체의 숨은 편향 점검, PASS — CI가 0 포함). `lib/game.ts`/`combat.ts` 변경 없음. 남은 건: 오프롤·숙련·조합 상성·AI난이도 스펙 확장(필요 시 `teamfight-review.mjs`의 `specs[]`에 추가), 그리고 **실제 시즌 진행이 team_all+10 수준의 극단적 팀간 격차를 만들어내는지는 미확인**(정적 강화 스펙이 아니라 시즌 시뮬레이션 관측치 필요 — F15의 진짜 다음 조각). **F12(감독 경기 중 지시)는 설계까지만 하고 구현은 다음 세션으로 미뤘다** — F04의 TACTICAL 결정 지점에 `③딜러 보호 ④위험 감수 진입` 두 directive를 추가하려면 `combat.ts`의 `resolveTeamfight`(가장 회귀 검증이 많이 된 핵심 함수, 과거 D022에서 시그니처 변경이 심각한 회귀를 낸 전례 있음)에 선택적 파라미터를 더해 `battlePlan()`의 `protectA/B`·`engageP`·`favWins`에 반영해야 하는데, 마침 이 조사 시점에 F10 확인용 `combat.test.mjs`가 30분+ 백그라운드 실행 중이었다 — 같은 파일에 새 위험을 얹기 나쁜 타이밍이라 코드는 안 건드렸다. 설계는 `DEVELOPMENT_ORDERS_PROGRESS.md`의 F12 절에 구체적 파라미터·행 번호까지 적어뒀다. **F12 구현 완료** — `combat.test.mjs`가 조용해진 뒤(F10 확인 PASS 확인 후) 착수: `resolveTeamfight`에 선택적 `directorBonus?:{protect,favor,engage}` 파라미터 추가(undefined면 기존과 100% 동일 — 모든 기존 호출·회귀 테스트 무변화). `TacticalChoice`에 `'protect'`(딜러 보호, `plan.protectA/B`에만 가산)·`'allin'`(위험 감수 진입, `engageP`·`favWins`에만 가산) 추가. **상수 튜닝 주의**: 처음 값(engage 0.10/favor 0.05)은 무교전을 거의 없애고 승률을 +11pp 흔들어 "지배적 레버 금지" 원칙을 어겼다 — 기존 `prepare`의 실측 효과(+4.06%p, 통제 1500시드)를 기준으로 `0.02/0.02`로 낮췄다. 앞으로 이 종류의 확률 채널 상수를 추가/조정할 땐 반드시 기존 채널(`TACTICAL_BONUS` 등)과 같은 통제 실험으로 크기를 맞출 것 — 감으로 정하지 말 것. `app/manager.tsx`의 `TacticalPrompt`에 버튼 2개 추가, `tests/combat.test.mjs` 섹션 9b·`tests/engine.test.mjs` TACTICAL 순환(3→5종) 갱신. tsc/build/8개 무관 스위트 전부 PASS. `engine.test.mjs`(1103 결정적 세트)·`combat.test.mjs`(신설 9b 포함) 백그라운드 확인도 **PASS**로 완료됨. **F13(해설)도 진행했다** — `narration.ts`(414줄)가 F13 요구사항 대부분(사건 간 기억, 강도 5단계, 양보/무교전/상호후퇴 구분, 근거 없는 칭찬 금지, "훈련 이력 없이 훈련 언급" 0건)을 이미 갖추고 있었음을 확인. 유일한 진짜 공백: teamfight 해설이 `cb.evidence`(엔진 원본 근거)를 전혀 참조하지 않아 F12의 감독 지시(딜러 보호/위험 감수) 근거가 화면에 한 번도 안 나왔다 — `narration.ts`의 teamfight 분기에 8줄 추가해 연결. `narration.test.mjs` 새 섹션 8 작성 중 **F09/F10에 이은 세 번째 테스트-설계 버그**를 스스로 발견(protect 세트의 한타 수를 allin 세트의 beat 수와 비교하는 실수 — 서로 다른 directive는 실제 세트 진행 자체가 달라질 수 있음, 로직은 처음부터 맞았고 테스트만 고침). tsc/build/7개 무관 스위트 PASS. `engine.test.mjs`(1103 세트)·`combat.test.mjs` 백그라운드 확인도 **PASS**로 완료(narration.ts는 예상대로 승패·rng 영향 없음). **F14(리캡)도 진행했다 — 이번엔 정말 미구현이었다**(pre-F01 HANDOFF가 이미 이 작업을 예고해뒀는데 F01~F13 아무도 안 건드림). `SetResult.recap`을 "계획→분기점(최대3, 퍼스트블러드/첫구조물/세트종료 사건을 실제 `events` 배열에서 찾아 `#N` 사건번호와 `e.detail` 그대로 인용)→핵심기여(POG)→잃은 자원(패자 기준, `cs` 최종 상태에서 재집계)→다음 세트 제안" 7카드로 재구성. `SetResult`에 `firstStructTeam?:string` 필드 신설(예전부터 지역변수였던 `firstStructSide`를 드디어 노출). `recap`을 참조하는 코드는 `app/manager.tsx` 단 한 곳뿐임을 grep으로 먼저 확인 후 진행(블라스트 반경 작음). `tests/recap.test.mjs` 신설(7섹션 — 분기점이 가리키는 사건의 phase·detail이 실제와 완전히 일치하는지, 손실 수치가 독립 재집계와 일치하는지까지 검증). **알려진 사소한 미해결**: 극히 드물게(420시드 중 0회) 첫 구조물 철거가 곧바로 세트를 끝내면 그 사건이 "(첫구조물)" 라벨로만 남고 "(세트종료)" 라벨은 중복이라 생략됨 — 내용은 정확, 라벨만 그런 경우가 있을 수 있음. tsc/build/8개 무관 스위트 PASS. `engine.test.mjs`(1103 세트)·`combat.test.mjs` 백그라운드 확인도 **PASS**로 완료. **F01~F14를 이번 세션에서 전부 한 번씩 다뤘다** — 사용자에게 AskUserQuestion으로 확인해 "계속 순차 진행(P3, F16부터)" 선택받음.

**F16(다음 상대 분석실)도 진행했다 — 이번엔 진짜 완전 신규 구현이었다**(F08/F11/F13처럼 "이미 있었다"가 아님). `g.history:RecordMatch[]`가 스코어라인 7필드뿐이라 과거 경기의 픽·내용이 전혀 저장 안 되고 있었다(`finishMatch`가 `Match.sets`를 스코어라인으로 뭉개고 버림) — 상대 분석 자체가 구조적으로 불가능했다. `SetScout` 타입 신설(팀당 최근 `SCOUT_CAP=15`세트 요약만 보존 — 세이브 무한 증가 방지), `Game.scout?:Record<string,SetScout[]>`(선택 필드, 구세이브는 마이그레이션 없이 그냥 빈 상태로 시작). `scoutReport(g,teamId)`는 `g.scout`만 읽고 `g.match`(진행/다음 경기 상태)는 전혀 참조 안 함 — 테스트로 `g.match=null`을 넣어도 결과가 똑같음을 직접 증명해 "미래 정보 미참조"를 구조적으로 보장. `app/manager.tsx`에 `ScoutPanel` 신설, PREP 화면 밴픽 버튼 바로 아래 배치. **브라우저 확인 중 실수 하나 발견·수정**: `localhost:5173`으로 접속했더니 완전히 무관한, 로그인된 다른 사용자의 사이트(콘마켓)가 떴다 — 이 컴퓨터에서 5173을 사용자의 다른 프로젝트가 이미 점유 중이라 내 dev 서버는 자동으로 **5174**로 올라가 있었다. 즉시 그 탭을 닫고 5174로 재접속해 확인 완료(남의 세션 건드리지 않음). **다음 세션은 반드시 dev 서버 로그(`bhe6m8gk0.output` 류)에서 실제 포트를 확인하고 접속할 것 — 5173을 가정하지 말 것.** `tests/scout.test.mjs` 신설(7섹션, 첫 실행 PASS). tsc/build/10개 무관 스위트 PASS. `engine.test.mjs`(1103 세트)·`combat.test.mjs` 백그라운드 확인도 **PASS**로 완료.

**F17(훈련의 기회비용)도 진행했다 — 핵심 메커니즘(번아웃이 실전 한타 파워를 직접 깎는 진짜 트레이드오프, 성장 체감, 훈련 종류별 효과 격리, 로스터 교체 시 자동 격리)은 이미 다 있었다.** 진짜 빠진 건 "훈련 이력에 선수/조합/날짜/강도/효과가 남는다" 하나 — `g.planNotice`가 `train()` 시작마다 통째로 지워져 영구 기록이 없었다. `TrainingLogEntry` 타입 + `TRAINING_LOG_CAP=60` + `Game.trainingLog?`를 F16의 `SetScout`/`SCOUT_CAP` 패턴 그대로 신설, `train()`의 기존 `planNotice.push` 3곳 옆에 `logT()` 나란히 추가. `app/manager.tsx` 훈련 센터 화면 하단에 "훈련 이력" 패널(최근 20건). `tests/training-log.test.mjs` 신설(6섹션, 첫 실행 PASS). tsc/build/11개 무관 스위트 PASS. `engine.test.mjs`(1103 세트)·`combat.test.mjs` 백그라운드 확인도 **PASS**로 완료. 다음은 F18(선수 스타일·성장·컨디션).

**브라우저 검증 시 알게 된 것(다음 세션도 유의)**: 이 컴퓨터에서 `npm run dev`는 5173이 사용자의 다른(무관한) 프로젝트로 이미 점유돼 있어 **자동으로 5174**로 뜬다. dev 서버 로그(`bhe6m8gk0.output` 류)에서 실제 포트를 반드시 먼저 확인할 것 — 5173으로 바로 들어가면 완전히 무관한 남의 로그인 사이트가 뜬다(이번 세션에 실제로 겪음, 즉시 탭 닫고 복구함). 다음 세션은 이 변경들을 재구현하지 말고 필요하면 `draftRecommendations`에도 같은 탐색을 재사용할 것. 완료 항목 재구현 금지.

> 2026-09-16 최신: **F18(선수의 스타일·성장·컨디션)을 사용자가 직접 게임 디자인 사양까지 준 뒤 Phase A/B/C를 완료했다.** 상세는 `docs/claude/BACKLOG.md`의 "F18" 절과 `DECISIONS.md`의 **D023**을 먼저 읽을 것 — 이 파일의 위 옛 기록보다 우선한다. 요지: `lib/players/temperament.ts`(성향 4축 engage/resource/info/call, id 기반 순수 함수 — **저장 안 함**, Player 필드 추가 없음, 구세이브 영향 전혀 없음), `lib/players/challenges.ts`(성장 과제 2종 `safe_commit`/`obj_priority`), `lib/rng.ts`(random/hash를 game.ts에서 분리, 순환 의존 회피 — game.ts는 재수출이라 기존 import 전부 무변화). `combat.ts`에 `Combatant.temperament`/`challengeBonus` + `newMatchState`의 선택적 `temperamentFn`/`challengeFn`(둘 다 생략하면 기존과 100% 동일) 신설 — 교전 성향→갱킹 `commitP`, 자원 우선순위→오브젝트 `arriveP`에 **결정 게이트로만** 연결(처치·오브 확보 확률은 무변경, 사용자가 명시적으로 금지한 "직접 승률 보너스" 없음). `Player.challenge?`(선택 필드) + `assignChallenge` 명령, 관측은 `finishMatch()`에서 완료된 세트만 1회 순회(리플레이로 중복 지급 안 됨). 선수 상세 다이얼로그에 `TemperamentPanel`·`ChallengePanel` 신설, 브라우저 확인함(`localhost:5174`, PLAN 단계 아니면 배정 버튼 올바르게 비활성화됨 확인). `tests/temperament.test.mjs`·`tests/challenges.test.mjs` 신설 + `tests/combat.test.mjs` 섹션 9c 추가, 전부 첫 실행 PASS. tsc/build/13개 무관 스위트 PASS, `engine.test.mjs`(1105 세트)·`combat.test.mjs` 백그라운드 확인도 **PASS**로 완료. **다음 세션 첫 행동**: F18 Phase D(정보 확보·콜 성향을 실제 엔진 행동에 연결) — 착수 전 BACKLOG.md "F18" 절 마지막 "알려진 제한" 문단부터 읽을 것. 완료 항목(Phase A/B/C) 재구현 금지.

> 최신 후속: `BROADCAST_CONTINUATION.md` 우선. 현재 KDA·역할 진형·키프레임 상태 시각·완료 사건 공개·재생 제어 수정. Git 작업 없음.

> 2026-09-14 Codex 업데이트: `BROADCAST_UPDATE.md`를 먼저 읽을 것. D022 이후 공통 경로·도착, 조합 전투, 적 넥서스 재생을 구현했다. 다음 인수는 PC/모바일 브라우저 확인이며 과거 미완료 절차를 그대로 재구현하지 않는다.

# 다음 세션 인수인계

갱신: 2026-09-11 / **MINIMAP 2단계 2부(D022): 이동·도착·전투 참여·기록의 단일화** 완료 — 엔진(`combat.ts`)에 실제 이동 시간 기반 도착 게이트(`hasArrived`)를 구현해, D021의 "화면 전용 어시스트 필터"를 폐기하고 엔진 자체가 참가·처치·어시스트·골드·POG를 단일 원본으로 판정하게 했다. **다음 = 잔여 teamfight 킬러-표시 불일치(16.7%, WALK/REGION 모델 격차) 정렬 + resolveGank/resolveBotLane/resolveObjective로 도착 게이트 확장 여부 검토.** MATCH-SYS 단위 6 step 5(리캡)는 그 다음(사용자 지시로 계속 보류).
Git: `025aedd`(D017/D018 인수인계) → `3198ce2`(단위 6 POG, D019) → `53a348e`(D019 인수인계) → `0b58edb`(POG 수정+미니맵 연속성, D020) → `a15915a`(D020 인수인계) → `3e644ba`(MINIMAP 2단계 1부, D021) → `ef30e40`(MINIMAP 2단계 2부 코드, D022) → (이 문서 커밋). tag `minimap-pre-persistent` = MINIMAP-02 이전 상태(비교 영상용). 배포 없음.

## 현재 목표 — 우선순위(사용자 지시, 2026-09-11 유지)
**1순위: MINIMAP-01/02 완성.** D020에서 사건-경계 이동 연속성을, D021에서 "합류 이동 원인 분류 + 표시 계층 안전한 부분"을 마쳤고, **D022에서 사용자가 명시적으로 반려한 D021의 화면 전용 필터를 폐기**하고 엔진 `combat.ts`에 실제 이동↔전투 참여 단일 계약(`region`/`freeAt`/`hasArrived`)을 구현했다. resolveTeamfight의 참가자 판정이 이제 "생존 + 실제 도착"만 통과시키며, 이 판정 하나로 참가자·처치·어시스트·골드·POG·화면 표시가 전부 갈라진다(같은 원본, 별도 필터 없음). **다만 MINIMAP은 여전히 완료로 표시하지 않는다**: (a) teamfight 한정 킬러-표시 불일치 16.7%가 WALK/REGION 모델 격차로 분류만 됐고 정렬은 안 됐음, (b) resolveGank/resolveBotLane/resolveObjective는 이번 라운드에서 도착 게이트를 적용받지 않음(참가자가 여전히 확률 기반), (c) 모바일 실기기 확인이 4개 세션 연속(D018/D020/D021/D022) 도구 제약으로 미확인. 이 세 가지가 다음 착수 조건이다.
**2순위: MATCH-SYS 단위 6 step 5(리캡 근거 사건화).** MINIMAP 완성 다음으로 미룬다(사용자 지시, D020부터 유지). POG/리캡 확장 자체도 D022 세션 내내 사용자 지시로 보류됨.
원래 목표(계속 유효, 순서만 변경): ABIL-01·COMP-01·CAST-01을 **하나의 경기 시스템**으로 완성한다. 중심 원칙: 엔진이 사건을 계산하고 중계·골드 그래프·POG·리캡·조합 예측이 그 결과만 사용한다. 표시용 별도 추첨 금지, 표시값 전력 이중 반영 금지. `docs/claude/BACKLOG.md`의 **"MATCH-SYS" 절**·**"MINIMAP-01" 절**에 상세.

## 진행 상태
**MINIMAP**(이동형 미니맵 중계) — **1순위**
- ✅ 1단계 (D013) · **MINIMAP-02 지속형 에이전트** (D016) · **엔진 REGION_DIST 이동 정합 + 구조물 SVG** (D018) · **사건-경계 이동 연속성** (D020, `nextOwnEvent`) — 상세는 이전 인수인계 참조, 요지는 진행 상태 아래 유지.
- ✅ **MINIMAP 2단계 1부: 합류 이동 원인 분류 + 도착 기반 어시스트 표시 필터 (D021)**
  - **원인 분류**(관찰만, 로직 변경 없음): "합류 이동" N=300시드 34,100건 참가 기회 중 7,870건(23.08%), 원거리 1,180건(3.46%). 4종 태그(이전사건충돌/이동시간부족/지연전환/장거리) 실측 — **이전사건충돌 7,859 · 이동시간부족 11 · 지연전환·장거리 0건**. 잔여는 "교전 중엔 물리적으로 다음 목적지로 이동 불가"라는 제약의 결과(결함 아님) — 과속·순간이동·이벤트 위치 변경으로 없애지 않음. 위치/경로 불연속은 별도로 0건 확인(80시드 445,482 키프레임 쌍).
  - **`nextOwnEvent` 경계 감사**: 처치·승자는 안 읽고 "이미 armed된 사건의 확정 참가자 명단"만 읽음을 확인 — 재생 경로 구성 용도로 허용된 범위. 코드 주석으로 경계 명시(로직 변경 없음). 시야 추상성(능력치 기반, 실거리 미모델링)도 명시.
  - **도착↔참여 표시 슬라이스**: `arrivalEst`(새 확률 없는 순수 기하) → 합류 전 처치엔 어시스트 미표시(엔진 골드·POG 불변, 표시 필터). 교전 시작 전 도착=초기 참가자·종료 후 도착 소급 없음·부활 후 기지 이동은 기존 로직이 이미 보장.
  - **발견(미수정)**: killer가 처치 시각에 아직 fight 상태 아닌 사례 464/2,504건(18.5%) — 어시스트만 요청 범위라 이번엔 손 안 댐.
  - 검증: `replay.test` 섹션 11 — 고정 사례 7종 150시드 내 전부 발견. 7개 스위트·tsc·build PASS. `game.ts`/`combat.ts` 무변경 → 엔진 결과 D020과 구조적으로 100% 동일.
  - **브라우저 육안 확인함**(PC): 디버그 패널에 새 원인 분류 실시간 표시, D020 연속성 재확인, 콘솔 에러 없음. GIF 녹화·내보내기 성공했으나 파일시스템 접근 불가 — 시각 찍힌 연속 스크린샷 4장으로 대체.
- ✅ **MINIMAP 2단계 2부: 이동·도착·전투 참여·기록의 단일화 (D022)** — 상세는 아래 "완료한 행동/파일 (D022)" 절. 요지: `combat.ts`에 `region`/`freeAt`/`hasArrived()` 도입 → `resolveTeamfight`가 실제 도착 여부로 참가자를 게이트(D021의 화면 전용 어시스트 필터는 폐기, `arrivalEst`는 디버그 전용 모순 진단으로 강등). 구현 도중 스켈레톤 clock 체이닝의 제로-버퍼 구조로 인한 심각한 회귀(ONE_SIDED/NO_SHOW 34~35%)를 발견·수정(원리적 버퍼 재배분, 계수 튜닝 아님). 464/2504(18.5%) 킬러-미도착 표시 불일치를 분류: gank 0%·objective 0%·teamfight 16.7%(358/2145, WALK/REGION 모델 격차로 확인 — "실제 불가능한 참여"는 이번 수정으로 해소됨). 통제 실험(4000시드) 재확인: 승률·NEXUS/CAP 비율·POG 분포 불변, "사망 불참 슬롯" 지표만 의도대로 +2.74%p. `combat.test.mjs`에 직접 구성한 상태(mkState) 기반 5개 시나리오 + 필수 불변 조건 300건 신설(시드 탐색이 아닌 결정적 증명).
- ⬜ **잔여: teamfight 킬러-표시 불일치 16.7% 정렬 ← 다음 첫 행동** — WALK 그래프(replay.ts)와 REGION_DIST(combat.ts)의 이동 시간 모델이 최대 ~1.2배(top↔river는 2.2배) 어긋나는 D018 이래의 기존 문제. "실제 불가능한 참여"는 D022로 해소됐지만, 두 모델의 불일치 자체는 남아 있다 — 아래 "다음 첫 행동" 절 참조.
- ⬜ **resolveGank/resolveBotLane/resolveObjective 도착 게이트 확장 검토** — 이번 라운드는 "이동→한타→다음 공성" 구간만 범위였다(사용자 지시). 갱킹·바텀·오브전은 여전히 확률 기반 참가자 판정이라 이론상 동일한 미도착 문제가 있을 수 있음 — 조사 안 됨, 임의로 범위 밖이라 단정하지 않고 명시적 미결 항목으로 남긴다.
- ⬜ **모바일/탭전환 실기기 확인** — 4연속 세션(D018·D020·D021·D022) 도구 제약(CDP 스크린샷 1568px 고정, `resize_window` 무시됨)으로 미확인.

**MATCH-SYS**(참여자 기반 경기 엔진) — 2순위(MINIMAP 완성 다음)
- ✅ 단위 1~5 + 5 정합성 점검 (D010~D015, D017)
- ✅ 단위 6 첫 슬라이스 (D019, D020에서 점검·수정) — **POG를 실제 사건 기여로 계산**. `combat` 원자료(처치·어시·FB / 한타 `fight.contrib` / 공성 참여·넥서스 / 오브 확보) 슬롯별 집계. D020: 한타 처치 이중가산 제거("킬 관여"=처치+어시스트로 의미 일치), 동점 시 고정 슬롯(TOP) 편향을 선수 id 해시 tiebreak로 제거. `SetResult.pogReason?`. 골드 그래프(step 4)는 이미 정합.
- ⬜ 단위 6 step 5: 리캡 근거 사건화 — **MINIMAP 완성 다음**. `recap[]`를 반전 beat·첫 구조물(`firstStructSide`)·넥서스·`capDiag` 근거로. 훈련 이력 콜백. 골드 그래프=중계 골드 회귀 테스트도 이때.

**기타**: COMP-01 단계 3(조합 예측 UI)/4(AI 밴픽), 전체 밸런스 민감도 검사

## 기준 파일 / 보존
사용자 작업본. 140챔피언, mastery 배열(Lv0~4), DraftState, startDraft/draftPick/draftSwap, flex·스왑, 장기 커리어·저장 유지. 이번 변경들로 저장 형식 불변(새 필드 전부 선택, 구세이브는 폴백).

## 게임 실행 상태
`npm ci`(node_modules 설치됨), Node v22.12.0. 이번 세션도 `npm run dev` → **http://localhost:5173/**(백그라운드) + Claude in Chrome으로 실제 RECAP 조작·검증함(HMR로 코드 변경 즉시 반영됨). 다음 세션에서 서버가 안 떠 있으면 `npm run dev`로 재기동.

## 완료한 행동/파일 (MINIMAP 2단계 2부 — 이동·도착·전투 참여·기록의 단일화, 결정 D022 · 커밋 `ef30e40`)
사용자 요청: "MINIMAP 2단계는 미완료다. 다음 작업은 이동·도착·전투 참여·기록의 단일화다." — D021의 접근을 명시적으로 반려: "도착하지 않은 것으로 보이는 어시스트를 화면에서만 숨기면서 엔진의 어시스트·골드·POG를 그대로 두는 상태를 해소한다." POG/리캡 확장·추가 시각 효과는 보류.

**(1) 화면 전용 어시스트 필터 폐기**: `replay.ts`의 D021 `arrivalEst` 기반 display filter(`k.assists`를 도착 추정으로 재필터링)를 제거 — 이제 `k.assists`는 엔진(`combat.ts`) 원본을 그대로 쓴다. `arrivalEst`는 삭제하지 않고 **디버그 전용 진단**으로 강등: WALK 그래프 추정이 엔진의 (이제 권위 있는) 도착 판정과 어긋나면 `diag`에 `#N: 슬롯 어시스트 도착 모순 — 엔진은 인증, WALK 추정은 처치 시각 이후 도착` 기록. 공식 KDA·킬 피드·중계·골드·POG는 전부 같은 `combat.ts` 원본 사건을 쓴다(단일 출처, 표시 필터 없음).

**(2) 464/2504(18.5%) 킬러 미도착 원인 분류**: 엔진 시계/사건 시작·처치 시계/재생-엔진 시간 변환/이동 시작 위치·시각/이전 행동 종료 시각/경로 거리·이동 시간 단위/사망·부활 상태를 대조. 사건 종류별로 나누면 **gank 0% · objective 0% · teamfight만 16.7%(358/2145)**로 전량 수렴 — gank/objective는 원래도 참가자가 라인/오브 위치에 고정돼 이동 문제가 생길 구조가 아니었다. teamfight 잔여는 `combat.ts`의 성긴 5구역(`REGION_DIST`) 모델과 `replay.ts`의 정밀 55노드 WALK 그래프가 최대 ~1.2배(top↔river 2.2배, D018부터 기록된 기존 격차) 어긋나 생기는 **모델 불일치**이지, "실제 불가능한 참여"가 아니다 — (3)의 엔진 게이트 도입으로 "실제 불가능한 참여"는 이제 구조적으로 0이 됐고, 남은 16.7%는 두 이동 시간 모델을 맞추는 별도 작업으로 분류·이관한다(태그가 붙었다고 정상으로 판정하지 않았음 — WALK/REGION 대조 수치로 직접 확인).

**(3) 공통 이동 계약 구현(핵심)** — `lib/simulation/combat.ts`:
- `Combatant`에 `region:Region, freeAt:number` 추가(마지막 확인 위치·그 위치에서 이동을 시작할 수 있는 시각). `newMatchState`가 전원 `region:'base', freeAt:0`으로 초기화.
- `export const hasArrived=(c,targetRegion,clock)=>c.freeAt+regionTime(c.region,targetRegion)<=clock` — **새 확률 롤 없는 순수 기하 게이트**(결정적, RNG 스트림 호출 순서·횟수 불변).
- `resolveTeamfight`: 내부 `alive(s)`가 `st[s][sl].alive && hasArrived(...)`로 재정의 — 생존만으로는 부족하고 실제 도착까지 확인해야 참가자(`aA0`/`aB0`)에 든다. `fight.aliveA/aliveB`는 이 게이트를 통과한 인원 수(원 생존자 수와 다를 수 있음). `notJoined`에 새 사유 `'이동 중(도착 전)'`을 추가(기존 `'전투 이탈(리스폰 대기)'`와 구분 — 죽어서 못 온 것과 살아있지만 아직 이동 중인 것을 별개로 기록). SUP peel·표적 선정도 게이트를 통과한 `alive(def)`만 대상으로 하도록 수정. 한타 종료 후 **실제로 도착해 싸운 생존자만** `region=fightRegion, freeAt=st.clock`으로 갱신 — 이번에 못 낀 인원은 계속 '이동 중' 상태로 다음 사건에서 재평가된다(강제 순간이동 없음).
- `reviveByClock`: 부활 시 `region='base', freeAt=respawnAt` — 사망자는 부활 시각부터 기지에서 실제 이동을 시작한다(이동 계약과 부활 로직을 하나로 묶음).
- `resolveSiege`: 공격 팀 개인 `region`/`freeAt`를 두 지점(NO_WINDOW 조기 이탈 / 정상 종료)에서 전파. **완료 후 개인 위치는 항상 `'river'`(중앙 허브)** — "+8/+12 정비·귀환" 버퍼의 의미 그대로(라인 구석에 남지 않고 중앙으로 물러남). `freeAt = clock+moveTime(+siegeTime)` — 버퍼의 마지막 부분을 **다음 사건으로의 초기 이동 시간으로 재해석**해 소진하지 않는다(아래 (4) 참조, 이게 이번 세션의 핵심 버그와 직결).
- `lib/simulation/narration.ts`: 한타 notJoined 표시 텍스트를 `reason.includes('리스폰')?'부활 대기':'도착 전'`로 분기 — 새 '이동 중' 사유가 '부활 대기'로 잘못 표시되지 않게.
- **미래 사건 참조 경계 유지**: `nextOwnEvent`는 이번 세션에서 손대지 않음(D021 경계 그대로) — 재생 경로 구성 전용, 엔진 판정에는 미사용. `combat.ts`의 새 게이트는 오직 현재 시점까지 알 수 있는 `region`/`freeAt`만 참조하며 미래 확정 참가자 명단을 읽지 않는다.

**(4) 발견·수정한 심각한 회귀(중요)**: 게이트를 처음 구현한 직후 `composition.test.mjs`가 실패(앞라인 조합 우위 0.6%p, 요구 >3%p). 원인 조사(`_comp_check.mjs` 스크래치 스크립트 + `DBG_TF` 임시 디버그 로그) 결과 **전체 한타의 34~35%가 ONE_SIDED/NO_SHOW**로 붕괴하고 있었다. 근본 원인: `simulateSet`의 스켈레톤이 `resolveSiege`의 종료 시계를 **제로 갭으로** 바로 다음 `resolveTeamfight`의 clock 인자로 넘기는데, 최초 구현이 공성 종료 시 개인 `freeAt`을 `+8`/`+12` 버퍼 **전체를 소진한 시각**으로 설정해 다음 이동에 쓸 시간이 정말로 0이 되고 있었다. **수정**: (a) 공성 후 개인 위치를 공격한 라인이 아니라 항상 `'river'`(어디로든 최단 경로의 중앙 허브)로, (b) `freeAt`에서 버퍼의 마지막 구간(+8/+12)을 빼 "다음 사건으로의 초기 이동 시간"으로 재배정. 전역 계수 조정이 아니라 버퍼의 의미를 정확히 한 원리적 수정 — **ONE_SIDED/NO_SHOW 35%→0.00%**, composition 격차 4.07pp로 정상화(요구 >3pp 충족), 전체 회귀 스위트 재확인 그린.

**(5) 검증**: `tests/combat.test.mjs` 신규 절("D022: 이동↔전투 참여 단일 계약") — 시드 탐색이 아니라 `mkState`로 `region`/`freeAt`을 직접 조작한 **5개 구성 시나리오**(이전 교전 지연/처치 전 미도착/부활 후 이동 중/도착 지연에 따른 인원차/한타→공성 위치 연속성) + **필수 불변 조건 300건**(처치자=참가자, 어시스트=같은 팀 참가자, 미도착 인원은 기여 없음) + 결정성 재확인. `tests/replay.test.mjs` 섹션 5(불참자 위치 불변식)를 두 차례 수정: raw 거리 검사(`d>4`) → 상태 검사(`state!=='fight'`) → 최종적으로 `reason.startsWith('#N ')`으로 "이 사건" 한정(사건 시간창이 겹치는 진짜 케이스와 새 로직이 만든 우연한 근접을 구분). `git stash`로 D022 변경분만 격리해 D021 대비 `teamfight-review.mjs`(N=4000) 전/후 비교: 승률·NEXUS/CAP 비율·POG 분포·강화 델타 전부 기존 노이즈 범위 내, **"사망 불참 슬롯" 지표만 의도대로 +2.74%p**(이동 중 불참이 새로 드러난 결과) — 전역 계수를 손대 옛 승률을 복원하지 않았다. 7개 스위트·tsc·build 전부 PASS.

**(6) 브라우저 인수(PC)**: dev 서버(`localhost:5173`) + Claude in Chrome, 동일 저장 커리어(T1 vs KT) RECAP 재생. 디버그 패널에서 새 진단 라인 실측 확인: `#11: B2 어시스트 도착 모순 — 엔진은 인증, WALK 추정은 처치 시각(1280s) 이후 도착(1296s)` — 엔진 판정이 권위 있고 WALK 불일치는 디버그 정보로만 노출됨을 실화면에서 확인. 게임 시계 20:13(공성)→21:44(한타, T1 3:0 승리)→22:34(무교전 대치, 부분 처치 1건)로 이어지는 연속 구간에서 **퇴화한(ONE_SIDED/전멸) 장면 없이** 다양한 결과가 자연스럽게 이어짐을 확인(측정된 0.00% 수치와 일치). GIF 5프레임 녹화·내보내기는 성공 응답을 받았으나 **이 파일시스템에서 다운로드 파일에 접근 불가**(D018/D020/D021과 동일한 환경 제약, PowerShell로 Downloads 폴더 재확인해도 없음) — 영상 검증을 했다고 주장하지 않고 시각(게임 시계) 찍힌 연속 스크린샷 3장(20:13/21:44/22:34)과 재현 절차로 대체:
  1. `npm run dev` 기동 → `http://localhost:5173/` 접속(기존 저장 커리어 자동 로드).
  2. "매치 센터" → "리캡" 탭 → 디버그 모드(⚙) 켜기 → 배속 4×.
  3. "다음 사건"을 반복 클릭하며 진행 — 20:13 부근에서 공성, 21:44 부근에서 한타, 22:34 부근에서 무교전 대치가 순서대로 관측됨(결정적 시드이므로 재현 가능).
  4. 디버그 패널의 "디버그·진단" 목록에서 "어시스트 도착 모순" 항목이 뜨면 클릭 위치의 사건 상세와 대조 — killer/assist가 항상 공식 KDA·현재 사건 참가자 목록과 일치함을 확인.
  - **모바일**: `resize_window(390×844)` 후 스크린샷이 여전히 1568×744 데스크톱 레이아웃으로 캡처됨 — CDP 스크린샷 뷰포트가 4개 세션째(D018/D020/D021/D022) 고정돼 있어 실제 모바일 레이아웃 검증은 이번에도 불가능. **완료로 표시하지 않고 별도 인수 항목으로 유지.**

## 완료한 행동/파일 (MINIMAP 2단계 1부 — 합류 이동 원인 분류 + 도착 기반 어시스트 표시 필터, 결정 D021 · 커밋 `3e644ba`)
사용자 요청: MINIMAP 2단계(접근 도착 시각 ↔ 합류 판정 통합) 진행, 단 먼저 (1) 남은 이동 사례 분류 (2) 미래 사건 참조 경계 확인 (3) 도착-참여 연결 (4) 교전 처리 (5) 미니맵 연결 (6) 검증 (7) 화면 인수 순서로.

**범위 결정(가장 중요)**: 사용자 지시의 핵심(엔진 `combat.ts`의 참가 판정을 이동 시간 기반으로 재설계)은 결과-영향 변경이다. 이 프로젝트의 결과-영향 엔진 변경(D014/D015/D017)은 전부 수천 시드 통제 실험 + McNemar CI로 검증해왔다 — 한 세션에 새 확률 채널을 설계·구현·검증까지 책임 있게 마칠 수 없다고 판단해, **이번 세션은 표시(replay.ts) 계층에서 안전한 부분만 구현**하고 엔진 재설계는 다음 세션으로 명시적으로 미뤘다. 이 경계 판단 자체가 이번 결정의 핵심이다(DECISIONS D021에 상세 이유).

- **(1) 원인 분류**(`lib/simulation/replay.ts`, 관찰만·로직 불변): `Agent.freeSince`(직전 fightUntil/arriving 해제 시각) + `shortfallFlags`(arm 시점 이동시간부족 진단 추적) 추가. "합류 이동" 로그마다 4종 태그: **이전사건충돌**(사건 armed 시점에 이전 사건에 아직 묶여 있었음)/**이동시간부족**(arm 시점에 이미 ETA 초과 경고됨)/**지연전환**(showDelay로 흡수된 정상 전환)/**장거리**(자유로운데 거리 자체가 큼). `ReplayData.travel.causes/causesFar` 신규, diag에 `[원인]` 태그.
  - **실측**(N=300시드): 총 참가 기회 34,100건 중 합류 이동 7,870건(23.08%), 원거리(>34u) 1,180건(3.46%). 원인: 이전사건충돌 7,859 · 이동시간부족 11 · **지연전환·장거리 0건**.
  - **핵심 판단**: 잔여 사례가 거의 전부 "이전사건충돌" 하나로 수렴 — "교전 중엔 물리적으로 다음 목적지로 이동 불가"라는 당연한 제약의 결과이지 결함이 아니다. **정상 장거리 이동을 없애려고 과속·순간이동·이벤트 위치 변경을 하지 않았다**(사용자 명시 지시 준수).
  - 위치/경로 불연속 별도 확인: 80시드 445,482개 키프레임 쌍(정지·교전 스냅 제외) 전수 검사 — **0건**.
- **(2) `nextOwnEvent` 경계 감사**: 소비 지점 2곳(`fightUntil` 만료·`arriving` 타임아웃) 모두 "이미 armed된 사건의 확정 참가자 명단"만 읽고 처치·승자·이후 결과는 읽지 않음 확인. `buildReplay`가 완성된 경기 전체를 받는 후처리 단계이므로 사용자가 명시 허용한 "재생 경로 구성" 용도에 해당한다고 판단 — **코드 변경 없이 경계를 명확히 하는 주석만 추가**(파일 상단). 시야가 추상적(능력치 기반 확률, 실제 거리·감지 미모델링)이라는 기존 한계도 명시.
- **(3)(4) 도착↔참여 공통 계약 — 표시 계층 첫 슬라이스**: `arrivalEst`(사건 참가자별 화면 도착 추정 — 이미 도착=사건 시각, 아직이면 사건시각+거리/속도, **새 확률 롤 없는 순수 기하** → 기존 확률과 중복 적용 여지 자체 없음) 계산 → 처치 beat의 `assists`를 `arrivalEst<=처치 시각`인 선수로 필터(**합류 전 처치의 어시스트 미표시**, 엔진의 실제 어시스트 골드·POG 기여는 불변 — 표시 필터일 뿐, 현재 UI엔 아직 안 그려짐). 교전 시작 전 도착=초기 참가자·종료 후 도착 소급 없음·부활 후 기지 이동 시작은 **기존 로직이 이미 보장**(재확인만, 변경 없음).
  - **발견(미수정)**: killer가 처치 시각에 아직 'fight' 상태 아닌 사례 150시드 2,504개 처치 중 **464건(18.5%)** — 사용자 지시는 어시스트만 명시해 이번엔 손대지 않음, 다음 세션 과제로 기록.
- **(5) 미니맵 연결**: 화면 이동 시간(showDelay/arrivalEst)은 여전히 표시 전용, 판정과 어긋나지 않음. 사건 경계 연속성(D020)·미참여 라인 독립 행동은 재확인만.
- **(6) 검증**: `tests/replay.test.mjs` **섹션 11 신규** — 고정 사례 7종(제시간 도착·교전 중 도착·종료 후 도착·부활 후 이동하느라 불참·이동 중 집결 지시 변경·연속 교전 위치 유지·미참여 라인 독립 행동) 150시드 내 전부 발견 + 불변식 확인(대표: seed0 #0/#6/#9, seed14). 7개 스위트 PASS(engine **1060 결정적 세트** — D020과 완전히 동일, `lib/game.ts`·`combat.ts` 무변경이라 엔진 결과 구조적으로 100% 동일 보장). tsc 0, build 0.
- **(7) 화면 인수(브라우저, PC)**: dev 서버(`localhost:5173`) + Claude in Chrome. 디버그 패널에 새 원인 분류가 실시간 표시됨(`원인 {"이전사건충돌":23}`) 확인. D020에서 검증한 드래곤 한타→바텀 공성 연속 구간을 재생해 동일 연속성 재확인(회귀 없음). 콘솔 에러 없음. 시각(게임 시계) 찍힌 연속 스크린샷 4장(18:42/18:52/19:04/19:14) 확보. GIF 3프레임 녹화·내보내기 성공했으나 **이 파일시스템에서 접근 불가**(D018/D020과 동일한 환경 제약) — **영상 검증을 했다고 주장하지 않고** 스크린샷 + 아래 재현 절차로 대체. 모바일 뷰포트·탭 비활성 정확한 재현은 이번에도 미확인.

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
- **teamfight 킬러-표시 불일치 16.7%(D022 분류, 미정렬)**: `combat.ts`의 성긴 5구역 `REGION_DIST`와 `replay.ts`의 55노드 WALK 그래프가 최대 ~1.2배(top↔river 2.2배) 어긋나는 D018 이래의 기존 모델 격차가 원인 — "실제 불가능한 참여"는 D022의 엔진 게이트로 해소됐음을 확인했다(gank 0%·objective 0%). 두 모델을 맞추는 작업 자체는 아직 안 함 — 아래 "다음 첫 행동" 참조.
- **resolveGank/resolveBotLane/resolveObjective는 이동 게이트 미적용**(D022 범위 밖, 사용자가 "첫 범위는 이동→한타→다음 공성"으로 명시): 이 세 함수의 참가자 판정은 여전히 확률 기반(`arriveP` 등)이며 `hasArrived`를 참조하지 않는다. 이론상 동일한 종류의 미도착 문제가 있을 수 있으나 조사 자체를 안 함 — "범위 밖이라 문제 없음"으로 단정하지 않는다.
- **모바일 뷰포트 실기기 미확인**(D018·D020·D021·D022 4연속 동일 제약): `resize_window(390×844)` + 새로고침 후에도 CDP 스크린샷이 1568px 고정 — 코드상 `@media(max-width:820px)` 반응형 규칙은 정적 확인만. **실제 모바일 기기나 브라우저 개발자 도구를 직접 조작할 수 있는 환경에서 확인 전까지 이 항목을 완료로 표시하지 않는다.**
- **탭 비활성/복귀 정확한 재현 미확인**: D020에서 자동화 도중 "탭 비활성 — 일시정지됨" 배지가 뜨고 재생이 실제로 멈추는 것은 관찰(핸들러 동작 방증)했으나, 자동화의 포커스 전환이 실제 사용자 탭 전환과 동일한 신호인지 불확실하고 배지가 재생 재개 후 바로 사라지지 않았다. 실사용자 재현 필요.
- **비교 영상 미첨부**(D018·D020·D021·D022): 네 세션 모두 자동화 Chrome이 GIF를 녹화·내보내기(다운로드)까지는 성공했으나 이 파일시스템에서 접근 불가 — Chrome 확장의 다운로드 경로가 이 세션 파일시스템과 분리된 것으로 보임(원인 미확정, 4연속 재현, D022도 PowerShell로 Downloads 재확인함). 대신 D022는 시각 찍힌 연속 스크린샷 3장을 남김(아래 재현 절차). 변경 전 화면 = `git checkout minimap-pre-persistent` 필요(현재 코드로는 재현 불가).
- **직접 구성한 엔진 단위 테스트는 combat.ts에만 있음(D022)**: `hasArrived`/`region`/`freeAt` 시나리오는 `combat.test.mjs`에 mkState 기반으로 증명했지만, `replay.ts`(화면 재생) 쪽은 여전히 시드 탐색(section 11) 기반 검증뿐 — 화면 쪽도 직접 구성한 고정 상태 테스트로 보강할 여지가 있다.
- **"합류 이동" 잔여치는 구조적**(D021 분류): N=300시드 34,100 기회 중 7,870건(23.08%) — 그 99.86%가 "이전사건충돌"(직전 사건에 묶여 있다 풀려난 직후라 물리적으로 시간이 없었음), 이동시간부족 11건, "정상 장거리"·"지연전환" 단독 사례는 0건. 이건 "교전 중엔 다음 목적지로 이동 불가"라는 제약의 정직한 결과이지 결함이 아니다 — 과속·순간이동·이벤트 위치 변경으로 없애지 않았다(사용자 지시 준수).
- **`top↔river` WALK 이동 비율 2.2**(D018, D020·D021에서 미변경): WALK 그래프에 강↔탑 직결 통로 없어 우회. 다른 지역쌍은 0.66~1.45(중앙값 1.23). `replay.test` 섹션 10에서 명시적 예외.
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

**D020~D022로 이미 끝난 것**(재구현 금지): 10명 전체 지속 이동(D016), 사건 경계 위치 연속성(D020, `nextOwnEvent`), 합류 이동 원인 분류(D021), 미래 사건 참조 경계 확인(D021), **엔진(`combat.ts`)의 실제 이동↔전투 참여 단일 계약**(`region`/`freeAt`/`hasArrived`, D022 — `resolveTeamfight`가 이제 이동 시간으로 참가자를 게이트하며, 이게 참가·처치·어시스트·골드·POG·화면 표시의 유일한 원본이다). D021의 화면 전용 어시스트 필터는 D022에서 **폐기됐다** — 다시 만들지 말 것.

**남은 핵심(작아짐)**: D022로 "엔진 참가 판정에 이동 시간 실제 통합"이라는 가장 큰 덩어리는 끝났다. 남은 건 (1) 두 이동 시간 모델(WALK vs REGION_DIST)의 정렬, (2) 이번 라운드에서 손 안 댄 세 함수(gank/botLane/objective)로 게이트를 확장할지 검토, (3) 모바일/탭전환/GIF 같은 환경 제약 항목이다. **(1)·(2)는 결과에 영향을 줄 수 있는 엔진 변경이므로 여전히 D014~D017급 통계 검증(McNemar CI)이 필요** — 착수하되 한 세션에 설계+구현+검증을 못 끝내면 이전처럼 범위를 명시적으로 쪼갤 것.

### 미완료 조건 (이 중 하나라도 남아 있으면 "MINIMAP 완성"을 계속 최우선으로 선택할 것)
1. **teamfight 킬러-표시 불일치 16.7% 미정렬** — 아래 "착수 절차 A" 참조.
2. **gank/botLane/objective 도착 게이트 미검토** — 아래 "착수 절차 B" 참조.
3. **모바일 뷰포트 실기기 확인 안 됨** — 4세션(D018·D020·D021·D022) 연속 브라우저 자동화 도구의 CDP 스크린샷이 1568px에 고정되어 실측 불가.
4. **탭 비활성/복귀 정확한 재현 안 됨** — 자동화 중 정지는 관찰했으나 실사용자 탭 전환과 같은 신호인지 불확실.
5. **비교 영상(변경 전 대비) 미첨부** — GIF는 네 세션 다 녹화·내보내기 성공했으나 파일시스템에서 회수 불가(원인 미확정).

### 착수 절차 A — teamfight 킬러-표시 불일치(WALK↔REGION_DIST 정렬)
1. **먼저 확인**(재구현 방지): `replay.ts`의 `arrivalEst`는 이미 WALK 기준 도착 추정을 계산해 두고 있다(D022부터 디버그 진단 전용). 새로 만들 필요 없이 이 값과 `combat.ts`의 `hasArrived` 판정을 **같은 사건에 대해** 대조하는 것부터 시작.
2. **정렬 방향을 먼저 정한다**: (a) `REGION_DIST`를 WALK 그래프 실측에 맞춰 재보정(단, `top↔river` 2.2배처럼 그래프 구조 자체가 다른 경우는 상수 조정만으로 못 맞출 수 있음), 또는 (b) 두 모델의 불일치를 계약으로 인정하고 `arrivalEst` 진단을 참고 정보로만 유지하며 표시 쪽에서 "엔진 인증, 화면 추정 지연" 같은 문구로 투명하게 남긴다(이미 D022가 이 방향으로 한 걸음 감). 사용자가 어느 쪽을 원하는지 다음 세션 시작 시 확인하거나, 명확한 지시가 없으면 (b)를 유지한 채 격차 크기만 줄이는 보수적 접근을 우선한다.
3. **금지**: WALK/REGION 격차를 없애려고 REGION_DIST 상수를 임의로 눈대중 조정해 전역 승률/참가율을 흔들지 않는다 — 조정한다면 `teamfight-review.mjs`로 반드시 재검증.

### 착수 절차 B — resolveGank/resolveBotLane/resolveObjective 게이트 확장 검토
1. 이 세 함수가 실제로 "물리적으로 불가능한 참여"를 만들어내는지부터 **조사**(D022의 `_killer_bykind.mjs` 방식처럼 사건 종류별로 분해해서 측정 — gank/objective는 D022에서 이미 0%로 확인됐으니 우선순위는 낮을 수 있음, 재확인 차원).
2. 문제가 실측되면 D022와 같은 패턴(region/freeAt 전파 + hasArrived 게이트, notJoined 사유 분리)으로 확장. 문제가 실측 안 되면 "조사함, 문제 없음"으로 기록하고 게이트 확장을 보류(불필요한 변경 방지).
3. 어느 쪽이든 `combat.test.mjs`에 D022와 같은 수준의 mkState 기반 직접 구성 시나리오를 추가.

### 그다음 — 모바일/탭전환/GIF (환경 제약, 도구 접근 방식이 바뀌지 않는 한 매 세션 재확인만 가능)
4세션 연속 동일하게 막혔다 — 새 시도 전에 이 세션의 "완료한 행동/파일" 절의 재현 절차를 그대로 따르되, 혹시 Claude in Chrome 도구가 갱신됐다면 `resize_window` 실효성과 GIF 다운로드 경로부터 재확인.

### 그다음 — MATCH-SYS 단위 6 step 5 (리캡 근거 사건화, BACKLOG "단위 6" 절 5번)
MINIMAP이 위 조건을 모두 충족한 뒤 착수. 단위 6의 POG(step 1~3, D019/D020)·골드 그래프 확인(step 4)은 이미 끝났다. 남은 건 `recap[]`뿐:
1. 현재 `recap[]` = 전력 격차 2문장 + 마지막 교전 확률 1문장 + POG 근거 1문장. **흐름을 바꾼 실제 사건**으로 재구성: 반전 beat(`narration.ts` `NarrMemory`), 첫 구조물 선취(`simulateSet` 내 `firstStructSide` — 현재 지역 변수, 필요 시 `SetResult`로 노출), 넥서스/CAP 판정(`endReason`·`capDiag`).
2. "이 선수 덕분에 +8%" 같은 **미계산 % 설명 금지**. 준비한 계획(전술·focus) 이행 여부, 다음 세트 밴/전술 제안.
3. 훈련 이력 콜백(실제 `trainChamp`·성과 기록이 있고 관련 행동이 나왔을 때만, 반복 방지).
4. 검증: 결정성, 리캡 문장이 실제 사건과 일치(지어낸 수치 없음), **골드 그래프 = 중계 골드 회귀 테스트**(D019에서 미작성 — 여기서 추가).
주의: `GoldGraph`·POG 집계는 이미 정합 — **건드리지 말 것**.

## 재현 시드/경로
- **D022 도착 게이트 직접 구성(권장 — 시드 탐색보다 결정적)**: `tests/combat.test.mjs`의 `mkState(mut)`으로 신선한 `MatchState`를 만들고, `mut`에서 `st.A[슬롯].region='top'; st.A[슬롯].freeAt=clock-(regionTime('top','mid')-1)`처럼 도착 1초 부족 상태를 직접 구성 → `resolveTeamfight(st,seq,edgeA,margin,clock,crng)` 호출 → `ce.fight.aliveA/aliveB`(게이트 통과 인원)·`ce.notJoined`(사유 `'이동 중(도착 전)'`)·`ce.fight.contrib`(미도착자 없음)로 확인. 새 절 "D022: 이동↔전투 참여 단일 계약" 전체가 이 패턴.
- **D022 회귀(ONE_SIDED/NO_SHOW) 재현·검증**: `node tests/composition.test.mjs`(대표 재현) 또는 `node tests/teamfight-review.mjs 4000` 실행 → `_comp_check.mjs` 스타일 스크래치 스크립트(저장 안 함, 필요 시 재작성 — `controlledBase()` + `frontComp`/`pokeComp` 태그쌍으로 4000시드 반복하며 `fight.result==='ONE_SIDED'||'NO_SHOW'` 비율 집계)로 직접 측정 가능. 수정 전 상태 재현: `git stash`(D022 변경분만 있을 때) 후 같은 스크립트 실행 → `git stash pop`으로 복귀.
- **D022 killer 미도착 464/2504 분류 재현**: `rd.beats`에서 `kind==='kill'`인 항목마다 `by` 슬롯의 트랙 상태를 그 시각 직전 키프레임으로 조회해 `state!=='fight'`인 비율을 사건 종류(`kind`)별로 나눠서 센다(D022의 `_killer_bykind.mjs` 방식, 저장 안 함). gank/objective≈0%, teamfight≈16.7%로 수렴하는지 확인.
- combat 샘플: `newGame('nva',7)` → `upgradeGame` → `g.seed=<n>` → `simulateSet(g,{a:'nva',b:'crn',...})`. `r.endReason`('NEXUS'|'CAP_TIME'|'CAP_EVENT'), `r.capDiag`(CAP일 때), `r.events[i].combat`.
- **미니맵 사건-경계 연속성(D020)**: 수정 전/후 비교는 `git stash`로 코드를 되돌린 뒤 같은 스크립트를 두 번 돌리는 방식(임시 스크립트, 저장 안 함) — `buildReplay(simulateSet(g,M)).travel.lateJoins`/`.farJoins`를 seed 0~11(또는 0~59)에서 합산. `rd.diag`에서 `d=>d.includes('합류 이동')`/`d=>d.includes('원거리 합류')`로 직접 세도 같은 값. 브라우저 재현: dev 서버 RECAP → 디버그(⚙) 켜고 "다음 사건"으로 한타 직전까지 이동 → 배속 1~2×로 재생하며 한타 종료~다음 공성 구간을 관찰(디버그 경로선이 홈으로 갔다가 되돌아오면 회귀, 곧장 이어지면 정상).
- **합류 이동 원인 분류(D021)**: `buildReplay(set).travel.causes`/`.causesFar`(원인별 집계) 또는 `rd.diag`에서 `[이전사건충돌]`/`[이동시간부족]`/`[지연전환]`/`[장거리]` 태그로 직접 셀 수 있다. 대표: seed 0 사건 #6(이전사건충돌), seed 49 사건 #24(이동시간부족). `tests/replay.test.mjs` 섹션 11이 고정 사례 7종을 150시드 내에서 탐색·검증하며, 실행 시 콘솔에 대표 시드(`· 11: 고정 사례 7종 대표 — onTime=seed0#0 midJoin=seed0#6 postFight=seed0#9 reviveMiss=seed14 ...`)를 출력한다. killer 타이밍 불일치(18.5%) 재현: `rd.beats`에서 `kind==='kill'`인 것마다 `by` 슬롯의 트랙을 그 beat 시각 직전 키프레임으로 조회해 `state!=='fight'`인 비율을 센다(위 D021 검증 스크립트 참조, 저장 안 함 — 필요 시 재작성).
- **브라우저 확인 절차(D020·D021 공통, 재현 가능)**: dev 서버(`localhost:5173`) → 매치 센터 → RECAP → 디버그(⚙) 토글 → 배속 4×로 "다음 사건"을 여러 번 눌러 첫 대형 한타 직전까지 이동 → 배속 1~2×로 재생하며 그 한타 종료부터 다음 공성/한타까지 관찰. 디버그 패널 첫 줄에 `이동 대조: ... 원인 {...}`(D021 신규)가 실시간 갱신되는지, 경로선이 홈으로 갔다 되돌아오지 않고 다음 목적지로 곧장 이어지는지(D020) 확인. 이번 세션 스크린샷은 T1 vs KT SET 1(로컬 저장 슬롯 1, 기존 커리어) 기준 18:42~19:14 구간.
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
