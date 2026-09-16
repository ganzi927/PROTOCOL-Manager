# 결정 기록

## D001 — 사용자 수정본을 기준으로 유지
2026-09-09. 사용자 ZIP은 이전 ChatGPT 실험본보다 챔피언/스왑/특훈 기능이 확장되어 있다. 이전 실험본과 양쪽 저장 버전이3이지만 구조는 다르다. 사용자 소스를 기본으로 하고 파일 단위 덮어쓰기를 하지 않는다.

## D002 — 현재 메타는 게임 밸런스
현행 metaChampions는 seed/season으로 결정한다. ‘현재 실제 롤 메타’로 부르지 않는다. 현실 통계와 연결하는 것은 별도 요구와 근거가 필요하다.

## D003 — 안내 문서는 필요한 때만 읽기
루트 CLAUDE.md에는 매 세션 필요한 핵심만 둔다. 긴 디자인·개발·기획서는 관련 작업에서 읽는다. 매번 기획서와 소스 전체를 자동 가져오지 않는다.

## D004 — 프로젝트 안에 체크포인트 보존
도구별 대화 기억에 의존하지 않고 HANDOFF/SESSION_LOG/BACKLOG를 소스와 함께 보존한다. 토큰 소진 직전 자동 저장을 보장할 수 없으므로 의미 있는 작업 단위마다 기록한다.

## D005 — 사용자 PC의 기본 권한/계정 유지
프로젝트용 명령과 문서를 추가한다. 자동 실행 훅, 권한 우회, API 키, 기기별 절대 경로는 넣지 않는다. Claude 설치·로그인은 사용자가 자기 컴퓨터에서 진행한다.

## D006 — 챔피언 특훈 목표는 사용자 선택을 그대로 따른다 (TRAIN-01)
2026-09-10. 문제: `train()`이 미등록 목표를 최저 숙련 챔피언으로 조용히 대체해 사용자가 고른 챔피언과 XP·뉴스가 어긋났다.
선택: (a) 목표가 실존 챔피언이고 숙련 풀(8칸)에 자리가 있으면 새로 등록하고 그 챔피언에 XP 지급. (b) 풀이 가득 차면 조용히 대체하지 않고 `training` 명령에서 명시적 오류(교체 흐름 대신 거부). (c) `train()`에는 우회 상태 대비 방어 로직(보류 공지, XP 미지급)을 둔다. (d) 존재하지 않는 챔피언 ID는 서버에서 거부.
이유: CLAUDE.md·BACKLOG의 “다른 챔피언으로 조용히 대체하지 않음” 요건. UI 재설계 없이 즉시 피드백 제공.
영향: `lib/game.ts`의 `training` 명령·`train()`, `app/manager.tsx`의 `champTrainOptions`(풀이 가득 차면 미등록 챔피언 숨김, 신규 항목은 ‘신규 등록’ 표기). 저장 형식 변화 없음. `MASTERY_POOL=8` 상수 신설.
대안: 자동 교체 확인 다이얼로그(향후 UI 작업으로 미룸).
관련: TRAIN-01.

## D007 — 라인·시야 우위를 개인 자원으로, 자원을 후속 전투 전력으로 연결 (ABIL-01 1단계)
2026-09-10. 문제: `PROTOCOL-Ability-Review.md`가 지적한 대로 `powers()`는 세트 시작에 파워를 한 번만 계산하고, 라인 이벤트는 승패 여부(±1 advantage)만 남겨 "라인전 압승과 신승이 같은 이득"이었다. 통제 실험에서 TOP LNE만 +20은 탑 라인 승률 67%인데 세트 승률은 +0.5%p였다.
선택: `simulateSet` 안에 결정적(승부 난수 미소비) 개인 자원 모델을 추가.
- 라인 이벤트(0~2) 결과를 `dom=(승자부호)*(0.55+1.7*|p-0.5|)`로 격차 스케일해 슬롯별 `lead[]`(A 관점 골드 단위)에 적립. 바텀은 ADC 0.72/SUP 0.5, 정글은 라인 합의 16%를 편승.
- 가중 시야 우위(`RES_VIS_W`, 정글·서포터 우대)를 라인 단계 후 슬롯별 자원 보호치로 적립(피습·불리한 진입 감소).
- 자원 합계를 데드존(42)·총량 상한(±165)·tanh(스케일 150) 포화 곡선과 캐리(미드·원딜) CAR 전환 계수(`conv`)를 거쳐 오브젝트(상한 3.0)/한타(상한 4.6) 이벤트의 유효 전력 `resPow`로 환산해 확률식에 가산.
- 이중 보상 방지를 위해 누적 우위 계수를 0.35→0.32로 축소(리뷰 3-C).
- `SetResult.leadA`(최종 슬롯별), `GameEvent.leadA`/`resPowA`를 선택 필드로 기록(표시/POG/리캡용 후속 단계 대비).
이유: 사용자·리뷰가 요청한 "라인전 → 개인 자원 → 후속 전투력" 연결의 최소 구현. 승부 난수 스트림 호출 순서·횟수 불변이라 재현성 유지.
영향: `lib/game.ts` `simulateSet`/타입. 6000시드 통제 실험(전=베이스라인 재현, 후):
TOP LNE만 +20 51.12→53.38%p(+2.26), SUP VIS만 +20 50.90→51.88(+0.98), 균형 50.62→50.93(+0.31), ADC TF만 +20 57.88→57.65(−0.23), 팀 전체 +10 74.55→78.60(+4.05). 표본오차 셀당 약 ±0.65%p.
알려진 부작용: 팀 전체 +10이 +4%p 상승(리뷰가 이미 74.55%를 높다고 지적) — Phase 5 밸런스에서 재튜닝 대상. 시야의 세트 기여는 여전히 약함 — 참여자 기반 한타(Phase 3)에서 보강.
대안: 확률식 분모만 축소(리뷰가 반대), 전 스탯 계수 증폭(리뷰가 반대), 개인별 승률 보너스 직가산(리뷰가 반대).
관련: ABIL-01. 후속: 중간 스노볼·참여자 기반 교전·구조물 종료(Phase 3), 표시(Phase 4), 밸런스 재튜닝(Phase 5).

## D008 — 조합 효과를 전용 모듈의 단일 경로로 분리 (COMP-01 단계 2 첫 슬라이스)
2026-09-10. 근거: `PROTOCOL-Composition-Meta-Design.md` §4·§6·§12. 문제: 조합 유불리가 `powers()` 안의 즉석 `composition` 배열(태그 scale/engage/peel와 AD/AP 개수만)로만 반영돼 거칠고, 상대 매치업이 전혀 없었다.
선택:
- 신규 순수 모듈 `lib/balance/composition.ts`. `champProfile(id)`가 태그 2개+타입+역할에서 8개 파생 특성(engage/peel/poke/scale/frontline/range/early/late)을 결정적으로 유도. 모두 명시적 게임 설계값(외부 데이터 없음).
- `draftEffects(picksA,picksB)` → `{lane,obj,fight}` A 관점 차이값. 완성도(앞라인·보호·피해유형 다양성, tanh 체감), 아군 궁합(이니시×보호·포크, 상한), 상대 매치업(포크는 상대 진입 약할 때·다이브는 상대 보호 약할 때만 유효)을 합쳐 구간별 ±3 상한.
- `draftEffects(a,b) === −draftEffects(b,a)`(완전 대칭), 같은 픽이면 정확히 0.
- `powers()`에서 기존 `composition` 배열 제거. `simulateSet`이 세트당 `draftEffects` 1회 호출해 라인/오브젝트/한타 사건 확률식에 각각 1회 가산 = 단일 경로, 이중 보정 없음. 승부 난수 미소비(결정적).
- `isMeta(+2)`는 이 계층에서 참조하지 않음. isMeta+2(픽 챔피언 스탯 가산) 자체의 제거는 별도 단위로 미룸(측정+버전 게이트 필요).
- 타입: `SetResult.draftFx`, `GameEvent.compA` 선택 필드(단계 3 조합 분석 패널 대비).
영향: `lib/game.ts` `powers()`/`simulateSet`/타입, 신규 `lib/balance/composition.ts`.
- 태그·타입이 같은 페어(밸런스 실험)에서는 `draftEffects≈0`이라 `tests/balance-review.mjs` 수치 완전 불변 = 능력치 채널 회귀 없음.
- 조합 민감도(8000시드, 전원 스탯 70·숙련/메타 없음): 앞라인/이니시 조합 vs 포크/물몸 조합 = 세트 승률 58.1%(상대로 42.8% → 대칭), 균형 vs 균형 50.3%. 구간: 앞라인 조합이 한타 55.4%·오브젝트 52.2%로 유리, 라인 49.6%로 약간 불리 = 설계 문서 §13의 "보호형 후반 조합의 초반/후반 특성 구분" 충족.
- `powersA/powersB`(리캡 파워 바 표시)는 이제 조합 항을 빼고 선수+픽 스탯 전력만 나타냄. 조합은 별도 채널로 분리됨.
대안: `powers()` 안에서 확장(단일 경로 아님, 테스트 어려움), 쌍마다 보너스 합산(10쌍 과다 — 설계 문서가 반대).
관련: COMP-01. 후속: 단계 3(예측·추천 UI), 단계 4(AI 밴픽), 단계 5(메타·패치, isMeta+2 제거), 단계 6(외부 데이터). [[D007]]의 개인 자원 채널과 독립.

## D009 — 상태 기반 구조화 중계 (CAST-01 1차)
2026-09-10. 근거: 사용자 피드백(교전 전 준비, 앞 사건 기억, 강도/밀도 차등, 감독 결정 노출).
문제: 기존 `narrate()`는 사건 인덱스별 무작위 문구 조합이라 오래 읽을수록 어색하고, 앞 사건을 기억하지 못하며, 모든 순간이 같은 강도였다.
선택:
- 신규 순수 모듈 `lib/simulation/narration.ts`. `narrateEvent(ctx,mem,rng)` → `{detail, beats[], tier, kills}`. `NarrMemory`가 9사건을 관통하며 게임 시각·킬·첫 킬·정글 개입·오브젝트를 누적, 결정적 결과가 다음 문구를 바꾼다.
- 전용 `narr` 난수(seed로 재현, 승부 `outcome`·표시 `flavor` 스트림과 분리). 문구/킬표현 선택만 담당.
- 킬 수는 관측 상태만 인용: 문구의 "누적 X:Y" ≡ `e.kills` 누적(테스트 강제). 상세 전투(점멸·현상금 등)는 그 상태를 계산·저장하기 전엔 언급하지 않음.
- 감독 레버는 `userIsA/de/tactic/advantage/leadSlots`가 실제로 뒷받침될 때만 문장 생성. 불참 경기엔 없음.
- `simulateSet`이 사건별 해결된 컨텍스트를 넘긴다(narration.ts는 game.ts 런타임 import 없음, 조사 헬퍼는 이 모듈로 이동).
- `GameEvent.beats?/tier?/kills?` 선택 필드(구세이브는 `detail`만 — 클라이언트가 폴백). `SetResult` deep-equal 결정성 유지.
- 클라이언트: RECAP에 밀도 토글(요약/상세/결정적, localStorage). 배속은 밀도가 아니라 공개 속도만 바꾼다(피드백 3).
영향: `lib/game.ts`(narrate 제거·wiring·타입), 신규 `lib/simulation/narration.ts`, `app/manager.tsx`(토글·beats 렌더), `app/globals.css`(.event-beats). outcome/flavor 난수 불변 → 승패·시즌 경로 불변(engine 커맨드 1467/1481/1138 그대로).
검증: 신규 `tests/narration.test.mjs` PASS. management/engine/ability/composition PASS. tsc·build exit 0.
대안: 문구 풀만 늘리기(피드백이 "무작위 조합은 어색"이라 반대), 클라이언트에서 문장 조립(서버가 근거 상태를 갖고 있어야 함 — §12).
관련: CAST-01. [[D007]] 자원·[[D008]] 조합 채널을 근거로 사용. 후속: 참여자 기반 전투(ABIL-01 Phase 3), 리캡 확대, 훈련 이력 콜백.

## D010 — 참여자 기반 전투: 스켈레톤 유지 + 구간 내부 계산 (통합 경기 시스템 1단계)
2026-09-10. 근거: 사용자 요청("ABIL-01·COMP-01·구조화 중계를 하나의 일관된 경기 시스템으로"), `PROTOCOL-Ability-Review.md` §3·§5 Phase 3, CAST-01 상세 전투.
문제: `simulateSet`의 라인 자원(`lead[]`)은 `dom` 휴리스틱이라 실제 참여 선수·처치·생존이 없었다. 중계의 킬은 관측 상태가 아닌 난수·격차 기반이었다.
선택:
- 9구간 승패 롤(스켈레톤)은 그대로 둔다. 그 롤 결과(`wa`, `margin=|p-0.5|·2.2`)를 입력으로, 각 구간 "안에서" 실제 참여자·처치·생존·개인 자원을 계산하는 계층을 추가.
- 신규 순수 모듈 `lib/simulation/combat.ts`: `newMatchState`(선수 10인 상태 — alive/respawnAt/kills/deaths/assists/gold), `resolveGank`(탑=0·미드=1의 2대1 갱킹). 전용 `combat` 난수(`hash(seed|combat|matchId|setIdx)`) — outcome/flavor/narr와 분리 → 재현성·기존 테스트 유지.
- 능력→행동: 합류 확률=이니시(TF)+margin−라인우위(LNE), 발각=수비 시야(VIS), 처치=공격 수행(MEC·LNE)+정글 이니시 vs 수비 회피(MEC·VIS)+추상 탈출 여지, 마무리 골드=CAR 전환. 오프롤 −6, 숙련 레벨당 +2.
- 결과 종류: 킬 / 합류했으나 놓침(탈출) / 발각·무산 / 순수 라인 판정. 죽은 선수 미참여, 처치자는 유효한 적만, 어시스트는 실제 합류자만, 첫 킬은 최초 처치에서만.
- `lib/game.ts` `simulateSet`: 라인 0·1의 `dom` 자원 산출을 `resolveGank`의 슬롯별 자원 델타로 대체(정글러 슬롯에 어시스트 골드 반영). 라인 2·오브젝트·한타는 다음 단위까지 기존 유지. `GameEvent.combat?` 선택 필드.
- 중계: `NarrCtx.combat?` 추가. 라인 0·1은 `combat`의 실제 참여자·피해자·어시스트·생존으로 beats 생성. 첫 킬 선언은 `combat.firstBlood`에서만. `e.kills`는 combat 집계와 일치.
이유: "기존 재작성 말고 확장", "최소 변경으로 사용자 의도 보존". 스켈레톤을 건드리지 않아 D007 자원 채널·D008 조합 채널·밸런스가 그대로 유지되면서 라인 자원의 근거가 실제 전투로 바뀐다.
영향: 신규 `lib/simulation/combat.ts`, `lib/game.ts`(wiring·타입), `lib/simulation/narration.ts`(combat 소비).
- 통제 실험 8000/6000시드: `equal` 50.93→50.60, TOP LNE+20 53.38→53.12, 팀 전체+10 78.60→78.92 — 전부 ±0.5%p(≈0.8·SE) = 밸런스 회귀 없음. 라인 자원이 참여자 기반이 됐는데도 집계 동등.
- `tests/combat.test.mjs` 신규 PASS: 결정성 / 사망·처치·어시스트 규칙 / 중계 바인딩 / 능력→행동(LNE·MEC↑→갱킹 처치 증가, VIS↑→피살 감소) / 자원 부호. management/engine/ability/composition/narration PASS. tsc·build exit 0.
대안: 스켈레톤을 참여자 시뮬레이션으로 전면 교체(재작성 금지·밸런스 재튜닝 위험), 중계용으로만 킬 계산(설계 §2 "표시용 별도 추첨 금지" 위반).
관련: ABIL-01 Phase 3 · CAST-01. [[D007]] 자원·[[D009]] 중계와 연결. 후속: 바텀 2v2(단위 2) → 오브젝트 합류자(단위 3) → 5v5 한타(단위 4) → 스노볼·구조물 종료(단위 5) → 표시 통합(Phase 4) → 조합 예측 UI(COMP 3) → AI 밴픽(COMP 4) → 전체 밸런스.

## D011 — 바텀 2v2 참여자 전투 + 정글 자원 단일 소스 (통합 경기 시스템 2단계)
2026-09-10. 문제: 라인 2(바텀)는 아직 `dom` 휴리스틱이었고, 정글러 자원이 `RES_JGL_CARRY`(모든 라인 합의 16%)와 갱킹 어시스트 골드로 이중 편승할 수 있었다.
선택:
- `lib/simulation/combat.ts`에 `resolveBotLane(st,seq,wa,margin,clock,crng)` 추가. ADC·SUP 중심 2v2(+정글 합류 시 3인). 능력→행동: 합류=정글 TF, 발각=수비 SUP VIS, 처치=공격(ADC MEC·CAR + SUP TF·VIS)+정글 이니시 vs 보호(SUP TF·VIS + ADC MEC)+탈출 여지, 마무리 골드=ADC CAR. 결과 5종: ADC 처치 / SUP 보호 성공(딜러 생존) / SUP 희생 / 발각·후퇴 / 순수 라인. 어시스트는 실제 합류자만.
- `simulateSet` `i===2`: `dom` 산출 제거, `resolveBotLane` 자원 델타 사용. `RES_LANE_LEAD`·`RES_BOT`·`RES_JGL_CARRY` 상수 폐지 — 정글 자원은 이제 combat 한 곳에서만(합류=어시스트 골드, 미합류=정글 템포 골드). `visEdge*RES_VIS_PROTECT`(팀 단위 맵 시야)는 단위 3·4까지 유지.
- `CombatEvent.followUp` 추가: 같은 팀 정글러가 앞서 이미 합류했었는지. 중계의 "앞선 합류에 이어…" 콜백을 `mem.ganked.size` 휴리스틱에서 이 플래그로 교체(라인 0·1 갱킹이 흔해 바텀마다 오발동하던 것 수정).
- 발각(spotted) 시 자원을 수비 쪽이 아니라 라인 우위(phase winner) 팀 쪽으로 소폭 배분해 `side`와 자원 부호를 일치.
영향: `lib/simulation/combat.ts`, `lib/game.ts`(상수 3개 삭제·wiring), `lib/simulation/narration.ts`(바텀 combat 경로·딜러 보호 서술·`euro(laner)` 조사·followUp).
- 통제 실험 6000시드(단위 1→2): `equal` 50.60→50.68, `SUP VIS만 +20` 51.95→**52.85**(+0.9%p — 바텀 2v2에서 SUP 시야가 갱킹 콜·딜러 생존으로 이어짐. 원래 베이스라인 50.90 대비 +1.95%p), `팀 전체 +10` 78.92→79.33. 그 외 ±0.4%p. 밸런스 회귀 없음.
- `tests/combat.test.mjs` 바텀 케이스 추가 PASS: 원딜 MEC·CAR↑ → 바텀 처치 증가, SUP VIS↑ → 원딜 피살 감소, SUP TF↑ → 보호 생존 증가. 전체 스위트 + tsc + build PASS.
알려진 관찰: `팀 전체 +10`이 D009 대비 +0.7%p 누적 상승(밸런스 증폭이 아니라 라인 자원 근거 변경에서 옴). 단위 5 이후 전체 밸런스 재튜닝에서 확인.
관련: MATCH-SYS 단위 2. [[D010]] 확장. 후속: 단위 3(오브전 합류자).

## D012 — 오브전 실제 합류자 + wa를 '유리한 시작'으로 재정의 (통합 경기 시스템 3단계)
2026-09-10. 근거: 사용자 요청(단위 3), `PROTOCOL-Ability-Review.md` §5 Phase 3.

### 설계 경계 명확화 (사용자 요청 2)
스켈레톤의 구간 롤 `edgeA=rng()<p`의 의미를 구간별로 분리했다.
- 라인(0~2)·한타(5~8): `edgeA` = **확정 승자**. combat이 '어떻게' 이겼는지만 정한다(combat.side는 항상 edgeA 쪽).
- 오브전(3·4): `edgeA` = **유리한 시작 조건**(우위 입력). 실제 **확보 팀은 참여자 결과(`resolveObjective`)로 결정**한다 — 단일 경로.
  - `wa`(자원·advantage·winner에 쓰는 확정 방향) = `secured ?? edgeA`.
  - `advantage`는 **확보 팀 기준**으로만 이동한다. 미확보(secured=null)면 momentum 이동 없음.
  - 즉 "edge 때문에 목표 지급"도, "새 확보 결과 + 기존 승패 보상 양쪽 적용"도 아니다. 한 곳(secured)에서 momentum+보상이 함께 나온다.
- `rng()` 호출은 사건당 1회로 그대로 → 재현성·다른 사건 불변.

### resolveObjective (`lib/simulation/combat.ts`)
- 참여자 선정: 전령 = 정글·탑·미드(+조건부 서포터), 드래곤 = 정글·미드·원딜·서포터(+조건부 탑). `reviveByClock` 후 생존 확인, 도착 확률 = 라인 상태(개인 자원차)+TF. 정글 0.99, 미드 0.9, 나머지 조건부. 불참 시 이유(`전투 이탈(리스폰 대기)` / `라인 처리` / `도착 지연`)를 `notJoined`에 기록. 죽은 선수는 참여 불가.
- 능력→행동: OBJ(확보·마무리 — 정글 가중 0.9), TF(합류·교전), MEC(실제 교전), VIS(유리한 시작·시야 선점 = `bestVis`), CAR(마무리 골드), LNE(개인 자원차 → 도착).
- 결과 5종: `SECURE_UNCONTESTED`(상대 물러남) / `SECURE_AFTER_FIGHT` / `CONTESTED_NO_SECURE`(트레이드·양측 철수 → secured=null, 목표 유지) / `UPSET_SECURE`(유리 팀이 교전 패 → 상대 역확보) / `CANCELLED`(양측 인원 부족). 스틸은 목표 체력·시도자 상태가 없으므로 제외, 중계도 스틸이라 말하지 않는다.
- 미확보 시 `MatchState.pendingObjective`에 남겨 다음 사건이 "앞선 X 무산됐던 상황"으로 참조. 확보 시 해소 → 중복 지급 없음(사건당 1회 결정).

### 자원 단일 경로
combat 한 곳에서만: 처치 골드(참여자) + 어시스트 골드(실제 합류자) + **오브젝트 팀 보상**(확보 팀 5칸, 불참 포함 — `OBJ_TEAM_G` 전령 0.75×/드래곤 1.0×) + 확보 정글 추가(`OBJ_SECURE_BONUS`, OBJ 스탯 가중). 미확보면 0. `simulateSet`이 `lead[s]+=ce.resource[s]` 1회. `access`(라인 결과 → 오브 확률)와 `resPow`(자원 → 유효 전력)는 **확률/전력 채널**로 자원 채널과 겹치지 않는다. `visEdge*RES_VIS_PROTECT`(i=2 팀 맵 시야)는 단위 4까지 유지(다른 사건·다른 기전이라 이중 아님 — 근거 기록).

### 중계
`resolveObjective`의 실제 참여자·불참 이유·처치·확보 결과로 beats 생성(접근/시야 → 합류/공백 → 교전 → 확보/미확보 → 해설). 첫 킬이 오브전에서 나면 FB 정확히 1회. 감독 레버('초반 압박을 준비했지만…')를 오브 미확보·early 전술·열세일 때만.

### 검증 (통제 8000시드, "강화 승률 − 해당 버전 균형")
| 조건 | 강화−균형 승률 | 오브 확보율(A) 변화 | 오브당 자원(A) 변화 |
|---|---:|---:|---:|
| TOP LNE +20 | +2.30%p | +4.4%p | +47 |
| SUP VIS +20 | +2.19%p | +4.2%p | +55 |
| **JGL OBJ +20** | **+3.74%p** | **+10.6%p** | **+138** |
| 팀 전체 +10 | +29.93%p | +26.3%p | +366 |
- **JGL OBJ +20이 목표 수행에 확실한 효과**: 확보율 42.9%→53.5%, 오브당 자원 +138, 세트 +3.74%p — 다른 단일 스탯보다 큼(정글 OBJ 가중 0.9). 사용자 검증 요구 충족.
- 통제 균형 = 50.61%, 확보율 A 42.9% ≈ B 42.5% → **오브 코드에 편향 없음**.
- balance-review(태그 매칭 페어) `균형` 50.68→51.18: 그 테스트 페어에 원래부터 있던 바텀 파워 비대칭(`powerDelta[2]=+4.8`, 최초 50.62 시절부터 존재)이 오브가 비중을 얻으며 더 드러난 것. **이중 보상·계산 오류 아님** — `powers()` 불변(powerDelta 동일), 대칭 테스트(ability·composition) PASS. 단위 5 밸런스 패스에서 재확인 대상.
- `팀 전체+10` balance-review 79.33→79.55(+0.22). 오브 보상 채널이 지배 팀을 증폭하지 않음(강화−균형이 오히려 28.65→28.37로 소폭 감소). 라인 자원이 i=3·4에 처음 생긴 것(이전엔 0) + "오브가 이제 중요" 의도된 변화.
- `tests/combat.test.mjs` 오브 섹션 신설 PASS: 리스폰 대기 정글러 불참·부활 후 참여·무교전 확보·양측 부족 취소·미확보 보상 0·pending 해소·참여자만 처치/어시·JGL OBJ↑ 확보율. 전체 스위트 + tsc + build PASS. engine 1,107 결정적 세트.

관련: MATCH-SYS 단위 3. [[D010]]·[[D011]] 확장. 후속: 단위 4(5v5 한타 — pressure 3구간과 접합), 단위 5(스노볼·구조물 종료). 이번 범위는 단위 3까지.

## D013 — 이동형 미니맵 재생 (MINIMAP-01 1단계: 골격 + 바텀 갱킹 연결)
2026-09-10. 근거: 사용자 요청(MINIMAP-01). 실제 경기 사건과 동기화된 이동형 미니맵 중계.

### 지도 좌표 규칙
- `lib/simulation/replay.ts`의 `MAP` 상수. 0~100 정사각 좌표계, **SVG y는 아래로 증가**. A(블루) = 좌하, B(레드) = 우상.
- `MAP.nodes`: 논리 위치(라인 3개 각 3점, 강, 정글 통로 4점, 베이스 2, 전령/바론 = `baron`, 드래곤 = `dragon`).
- `MAP.edges`: 통로 연결. **이동은 이 선분 위에서만** — `pathBetween(from,to)`가 노드 그래프 최단 경로(Dijkstra)를 주고, `buildReplay`는 경로상 각 노드마다 키프레임을 찍는다. 벽 가로지르기 불가.
- 초상화 겹침 완화용 시각 오프셋(`jitter`, ~3.2u)은 **사망 위치에만** 쓰고 논리 위치(노드)와 구분한다. 이동 중 키프레임은 항상 노드 위.
- 컴포넌트(`app/replay-theater.tsx`)는 `viewBox="0 0 100 100"` SVG. 리사이즈는 viewBox가 흡수 → 위치·재생 시각 초기화 없음.

### 재생 데이터 계약 (`ReplayData`)
- `buildReplay(set)` — **순수 함수**(난수·Date 없음). 입력은 `SetResult`(events[].combat / .kills / .goldA·B / .detail / lineupA·B). 같은 set → 같은 ReplayData(테스트로 강제).
- `windows[]`: 사건별 재생 구간 `{seq(원본 GameEvent.index), start, end, engineClock, label, kind}`. **연출용 재생 시각(t)과 엔진 실제 시각(engineClock)을 분리.** 엔진에 정확한 행동 시점이 없으므로(사건당 단일 clock), 원인→결과 순서(접근→합류→교전→처치→후속)를 보존하는 재생 시점을 생성.
- `tracks[]`(10): 슬롯별 `key:{t,pos,state:'idle'|'move'|'fight'|'dead'}[]`. `posAt(track,t)`가 선분 보간(사망이면 정지). 이전 사건 종료 위치 → 다음 사건 이어 씀.
- `beats[]`(t 오름차순): `{t, seq, engineClock, kind:'approach'|'engage'|'kill'|'secure'|'escape'|'noshow'|'revive'|'line', ref, by, assists, side, scoreDelta, fb}`. 원본 사건 ID(`seq`) 유지.
- `goldKeys[]`: 엔진 `goldA/goldB`를 resolve 재생 시각에 매핑(골드 재계산 안 함).
- `stateAt(rd,t)` → `{score, gold, dead, feed, line, seq, engineClock}` — **t 이하 beat만 집계**. 배속·정지·되감기와 무관하게 t만의 함수. 재생 시점 이후 최종 골드·킬·사망·결과 미노출.

### 스코프·경계
- 이번: 지도·경로 골격 + **바텀 갱킹(`resolveBotLane`, 사건 index 2) 완전 연결** — 정글 접근(합류 시만) → 실제 합류 → 교전 → 실제 처치/생존(escaped) → 후퇴/부활. 정글 불참이면 접근 애니메이션 없음. SUP 보호·희생은 combat 기록(escaped/kills victim=slot4)이 있을 때만.
- 탑·미드 갱킹(0·1)·오브전(3·4): 참가자·불참 사유·처치·확보는 표시하되 접근 애니메이션은 정글만 간단히. 한타(5~8): `combat` 미구현(단위 4 전) → 팀 단위 킬 피드만, 개별 피해자 스컬 없음.
- 부활: 엔진 시각 기준(`respawnEngine` 근사) → 재생 시각으로 매핑, 베이스 등장 후 홈으로. 처치~부활 사이 트랙 상태 `dead` 고정, `stateAt.dead`도 true.
- 사건에 없는 후속 드래곤 이동·귀환을 확정 행동처럼 만들지 않는다(후퇴는 홈 노드로만).

### 재생 제어(`ReplayTheater`)
- 단일 재생 시계: `tRef`(ref) + rAF. 위치는 rAF에서 SVG `transform` 직접 갱신(리렌더 없음). 점수·골드·피드·중계는 `stateAt` 결과가 이산 변화할 때만 `setState`(재생당 수 회).
- 컨트롤: 재생/정지 · 1×/2× · 다음 사건(⏭ = 다음 window.start로 시크) · 시크바 · 처음부터. 탭 비활성 → 자동 일시정지(복귀 후 수동 재개).
- `onProgress(seq)` → manager `setReveal(seq+1)` : 텍스트 중계 로그가 미니맵과 같은 시계로 공개. 기존 `setTimeout` 공개 루프·`speed`(1×/4×)·`결과 보기` 버튼 제거(스포일러 방지 — `결과 보기`가 recap-card를 미리 띄우던 문제).
- 재생 종료 시 `reveal=events.length` → recap-card(매치 결산)가 텍스트 로그 상단에 표시(이전 UX 변경 유지).

영향: 신규 `lib/simulation/replay.ts`·`app/replay-theater.tsx`, `app/manager.tsx`(RECAP 배선), `app/globals.css`(.replay-theater 등). 엔진 무변경 — `simulateSet`/combat/narration 그대로, replay는 읽기만.
검증: `tests/replay.test.mjs` 신설 PASS(결정성·스포일러 방지·적용 시점 일치·통로 이탈 없음·사망 후 행동/조기 부활 없음·불참자 미표시·고정 시드 바텀 처치/탈출/합류불발). 전체 스위트 + tsc + build PASS. **실제 화면 확인**: 진행 중이던 커리어(RECAP)에서 미니맵·아이콘 이동·스컬·점수/골드/시각 진행·킬 피드(불참 사유 포함)·컨트롤·시크바 육안 확인. t=0 정지 화면·탭 비활성 일시정지·모바일 비율은 미확인(단위 테스트로 대체 검증).
관련: MINIMAP-01. 후속: 탑·미드·오브전 사건 상세 연결, MATCH-SYS 단위 4(한타 combat) 후 한타 개별 피해자 연결.

## D014 — 참여자 기반 5v5 한타: edgeA = '교전 전 유리함', 승패는 실제 처치로 (통합 경기 시스템 4단계)

2026-09-10. 근거: 사용자 요청(MATCH-SYS 단위 4). 단위 3 정합성 점검 포함.

### 문제
- 단위 3까지 한타(구간 5~8)는 `edgeA=rng()<p`가 곧 확정 승자 = pressure. 실제 참여자·자원·능력·조합이 교전 결과에 관여하지 않았다.
- "유리한 팀 전원 사망"이나 "양 팀 참가자 없음"인데도 사전에 뽑힌 edgeA로 그 팀이 한타를 이기는 상황이 가능했다.
- POG(단위 6) 근거가 될 개인 한타 기여(딜·보호·처치 관여) 기록이 없었다.

### 선택
1. **`resolveTeamfight(st, seq, edgeA, margin, clock, crng)`** 신설(`lib/simulation/combat.ts`). `reviveByClock` 후 살아있는 인원만 참가(`participants`), 죽은 인원은 `notJoined`에 사유 기록.
2. **edgeA/margin의 역할 분리**: `margin`(= 이미 `p`에 반영된 전력·자원·조합의 요약)은 `favWins = crng()<clamp01(0.5 + margin*0.75 + numAdvFav)`로 '어느 쪽이 유리한가'까지만 정한다. `numAdvFav=(nFav−nOth)*0.16`는 **실제 사망이 만든 인원차** — `p`에 없던 새 채널. `p`(확률)는 건드리지 않는다 → combat이 전력을 다시 더하지 않음.
3. **능력치는 '누가 죽고 누가 살리나'만**: 표적 우선순위 = 캐리(ADC>MID) 먼저, 동순위는 MEC+VIS 낮은 쪽, 프런트(TOP·JGL) 마지막. SUP peel(≈ `0.12+(TF+VIS−110)/150`)은 한타당 1회 판정 — 성공하면 그 한타 내내 ADC를 표적에서 제외하고 `contrib.protect` 기록(보호 성공 → 딜러 생존·후속 행동). 어시스트는 처치자 제외 생존 공격자 중 **TF 가중 무작위** 최대 2명(고정 정렬 편향 제거).
4. **승패 = 실제 처치 수**로 확정: 진 편이 더 잡으면 사건이 favWins를 뒤집는다(역전). 동수 처치는 정말 팽팽했으면(`trade`, margin<0.05) 또는 양쪽 0이면 무승부, 아니면 교전 우위를 잡은 쪽이 지역 장악. **무승부(TRADE)·무교전(NO_ENGAGE)·전멸(NO_SHOW)·일방(ONE_SIDED, 유리 팀 0명 → 상대 승)** 은 `winner=null` 또는 상대 → **사전 edgeA로 이기지 않는다**.
5. **`simulateSet` `i>=5`**: `resolveTeamfight` 호출 → `lead[s]+=ce.resource[s]`. `wa = fight.winner ?? edgeA`. **pressure는 실제 `fight.winner`에서만** 증가. 승자 없으면 `advantage`·momentum·표시 골드 이동 없음(`tfNoWin`→`noMove`). `edgeA` 팀은 `edge` 필드에 결과와 분리해 기록(전술적 우위). 9구간·`pressure===3`/`i===8` 종료 구조는 단위 5까지 유지.
6. **자원·기여 단일 소스**: 처치·어시스트·개인 자원(TF_KILL_G/ASSIST_G/DEATH_G, CAR 마무리 보정)은 combat 결과가 유일. 기존 한타 보상(`e.kills` 팀 단위)과 이중 지급 없음 — `buildReplay`의 `if(!cb && e.kills)` 분기가 combat 경로로 흡수됨. `contrib{kill,engage,protect,damage,survived}` 를 `fight.contrib`에 기록(단위 6 POG 근거). **`damage`는 "가상 점수" 주석 — 실제 피해량 시스템 없음, '실제 피해량'으로 표시하지 않음.**
7. **`RES_VIS_PROTECT`(i=2 팀 맵 시야)**: 이번 단위에서 한타 참여자 VIS로 **이관하지 않음**. SUP peel이 참여자 VIS를 이미 쓰고, i=2 채널 제거는 바텀 자원 근거를 또 흔들어 밸런스 재측정 범위가 커진다. 단위 5 전체 밸런스 패스로 미룸(HANDOFF에 기록).

### 이유
- 계약: "edgeA를 한타 확정 승자로 유지하는 설계를 그대로 확장하지 마라." "기존 확률에 포함된 효과를 combat에서 다시 더하지 않도록." "무승부·상호 후퇴는 승리로 세지 않는다." "유리한 팀이 전원 사망한 상황에서 사전 edgeA 때문에 그 팀이 이기는 일이 없어야 한다."
- `margin`만 combat에 넘기고 `p`는 불변 → 전력 이중 반영 방지. `numAdvFav`는 `p`가 모르는 정보(그 사건 시점의 실제 생존 인원차)라 새 채널로 정당.
- 능력치가 승패 확률을 직접 올리지 않고 '누가 죽나'만 정하므로, SUP 보호 → 딜러 생존율 +7%p처럼 **행동 지표**가 능력에 반응하되 승률은 과증폭되지 않는다.

### 영향
- `lib/simulation/combat.ts`: `resolveTeamfight`, `TFResult`, `Contrib`, `CombatEvent.fight`, `CombatEvent.kind`에 `'teamfight'`. `TF_KILL_G=280·TF_ASSIST_G=125·TF_DEATH_G=200`.
- `lib/game.ts`: `simulateSet` `i>=5` 브랜치, `noMove`/`tfNoWin`, pressure를 `fight.winner`로, `GameEvent.edge`, POG 기여 필터에 `!(combat.fight && !combat.fight.winner)`.
- `lib/simulation/narration.ts`: 한타 `c.combat.kind==='teamfight'` 경로(진입·보호·FB·반전·연계·결과를 실제 처치/생존/불참으로). 휴리스틱 폴백은 구세이브용 유지.
- `lib/simulation/replay.ts`: `eventNode` 한타 분기, **사망마다 1건 부활**(`deaths[]` — 죽고-부활-재사망 시 테스트4가 처치_n↔부활_n 짝지음), 부활 라인 복귀 걷기 키프레임 제거(다음 접근이 홈에서 출발하므로 겹침 방지), 접근 루프가 직전 사망자는 `homeNode`에서 출발.
- 저장 형식: `CombatEvent.fight`·`GameEvent.edge` 모두 선택 필드. 구세이브 폴백.
- **밸런스 이동**(단위 3→4, 아래 대안·검증): 한타 관련 스탯(ADC CAR·SUP TF) 세트 기여가 커지고 라인·오브 스탯(TOP LNE·JGL OBJ)은 상대적으로 작아졌다. 참여자 기반 한타의 의도된 결과 — 전역 계수로 되돌리지 않음.

### 대안
- **한타도 오브전처럼 '유리한 시작'으로만**: 채택. (라인 0~2만 확정 승자로 남음.)
- **`numAdvFav` 대신 능력치를 `favWins`에 직접**: 기각 — `p`에 이미 든 전력을 combat에서 다시 더하는 것. 능력치는 '누가 죽나'로 제한.
- **동수 처치를 항상 무승부**로: 시도했으나 결판 비율 93%→89%로 떨어지며 라인·조합·능력 신호가 pressure 경쟁에서 과도하게 희석(composition·ability 회귀). 되돌려 "교전 우위 → 지역 장악"은 결판으로, 정말 팽팽한(`trade`, margin<0.05) 경우만 무승부.
- **`ability.test`/`combat.test` 목표 수치 상향 튜닝**: 기각 — 사용자 지시("목표 승률에 맞추기 위한 전역 계수 조정 없음"). 대신 테스트는 **방향·부호**를 못박고 크기는 회귀(0·음수)만 막게 완화, 근거를 주석에 남김.

### 단위 3 정합성 점검 결과 (같은 요청 1부)
- **1a (확보 팀 없음)**: 이미 `wa = secured ?? edgeA`, 미확보면 `advantage`·보상·표시 골드 이동 없음, `edge`에 전술적 우위 별도 기록. 코드·`tests/combat.test.mjs` 8a로 확인 — **수정 불필요**.
- **1b (처치 후 오브 미확보)**: `resolveObjective`가 `registerKill`(처치·어시 보상)을 먼저 적용, 미확보면 오브 팀보상(5칸)만 0. `tests/combat.test.mjs` 8b로 확인 — **수정 불필요**.
- **1c (pendingObjective)**: `pendingObjective`는 kind와 상태를 유지, '같은 kind' 확보로만 해소(`st.pendingObjective===kind`), 다른 kind 확보로는 유지. 재시도 = 이후 같은 kind 오브 사건(현 9구간엔 없음), 만료 = 세트 종료. `tests/combat.test.mjs` 7e로 확인 — 주석 보강, 로직 **수정 불필요**.
- **1d (라인 우위 전달 경로)** — 입력·적용 지점, 각각 다른 행동을 모델링:

  | 경로 | 입력 | 적용 지점 | 모델링 대상 | 이중? |
  |---|---|---|---|---|
  | `access` | `avg(laneResults.slice(0, i===3?3:5))*0.5` | `p`(확률), 구간 3·4만 | "라인 이겼으니 오브 시야·선점 유리" | 아니오(측정 <0.1%p, D012에서 확인) |
  | `resPow` | `(i<5?RES_OBJ:RES_FIGHT)*tanh(effLead/RES_SCALE)*conv` | `p`(확률), 구간 3~8 | "골드 우위 → 유효 전력" | 아니오(`effLead`는 `lead[]` 자원, `conv`는 CAR 전환율) |
  | `lead[s]` | combat `resource`(처치·어시·팀보상) | `resPow`의 `effLead` 입력 + `SetResult.leadA` | "개인이 실제로 번 골드" | 아니오(combat 단일 소스, D011·D012) |
  | `advantage` | 구간 승자당 ±`delta` | `p`의 `RES_ADV_K*advantage` + 다음 구간 | "누적 주도권(momentum)" | 아니오(승패 결과지 자원 아님) |

  → `access`는 확률 채널, `resPow`는 전력 채널, `lead`는 자원 원본, `advantage`는 momentum. 같은 이점을 반복 지급하지 않음. `access` 개별 영향 <0.1%p라 유지(제거해도 무영향). **수정 불필요.**
- **1e (능력치 보정 중복)**: 숙련(`mastery*2`)·오프롤(`−6`)은 `powers()`(→`p`)와 `combat.ts eff()` 양쪽에 있으나 **다른 산출물**에 쓴다 — `powers()`는 구간 확률, `eff()`는 combat 내부의 '누가 죽나/합류하나'. 둘 다 `p`에 더하지 않는다. combat `eff`에서 오프롤 −6을 끈 통제 실험: 세트 승률 영향 0.0%p. 숙련은 combat 경로로 +0.9%p 추가 기여(설계 의도 — 숙련도가 교전 수행에 반영). **수정 불필요, 표로 기록.**

관련: MATCH-SYS(단위 4), ABIL-01, COMP-01, CAST-01. 후속: 단위 5(스노볼 + 구조물 종료) — 한타 생존 인원·라인 상태 → 포탑/억제기/넥서스 순서.

## D015 — 스노볼 + 구조물 기반 종료: 교전 결과 → 생존·시간 → 공성 → 넥서스 (통합 경기 시스템 5단계)

2026-09-10. 근거: 사용자 요청(MATCH-SYS 단위 5).

### 문제
- 단위 4까지 세트 종료 = `pressure===3 || i===8`, 승자 = pressure 다수, 동률이면 마지막 사건 방향(= 그 사건이 무승부면 `edgeA` — **숨은 기본 승자**).
- 고정 240초 한타 간격 → `reviveByClock`이 매 한타 전에 전원 부활 → 사망 공백이 사라짐 → `numAdvFav`(실제 인원차 채널) 사실상 무력.
- 넥서스·구조물이 없어 "이겼는데 왜 안 끝나지", "라인 우위가 승리로 어떻게 이어지나"가 모델에 없음.

### 선택
1. **실제 경기 시계 `MatchState.clock`**. 라인·오브는 기존 시각(150·306·498·660·900)을 그대로 쓰되, 한타·공성이 clock을 실제로 진행시킨다. `resolveTeamfight`는 교전당 +14초. `resolveSiege`는 이동+공성+정비 시간(20~90초). **연출 재생 시각(replay `t`)과 경기 시계는 분리**(D013 유지).
2. **계단식 부활**: `resolveTeamfight`의 처치가 `respawnAt = clock + RESPAWN(clock) + 처치순서*4`. 부활 시간 자체는 안 늘린다(사용자 지시) — 처치 시점을 벌려 다음 사건에 5v5/4v5가 섞이게.
3. **`resolveSiege(st, seq, clock, crng)`** 신설:
   - **공격 자격**: 생존 인원이 더 많고, 상대에 리스폰 대기자가 있거나(창이 있음) 인원차 2+. 없으면 RESET(양 팀 정비, clock만 진행). — 무승부라고 일괄 금지하지 않는다: 실제 생존/수비 상태로 판단.
   - **추상 지역·이동 시간**: `Region = base|top|mid|bot|river`, `REGION_DIST` 표(초). 정밀 좌표 없음 — 미니맵 장식 좌표가 판정을 바꾸지 않는다. 공격자는 현재 지역(교전 장소)에서 목표 라인/베이스까지 이동.
   - **창(窓)**: `windowTime = (수비 부활까지) − 이동 시간`. `<= 2`면 NO_WINDOW(구조물 불변).
   - **공성 여력** = 인원차(0.95) + 시간(1.15) + **자원차/1000(±0.6~0.85 클램프, D007 스노볼 경로 — 이미 쌓인 `Combatant.gold`)** + 공성 능력 OBJ + **생존 원딜 CAR(0.75)** + 운영 주도권 `lanePush`(1.0). 보호 성공 → ADC 생존 → `atk`에 포함 → 여력에 반영. **보호 자체엔 별도 승리 보너스 없음.**
   - **구조물**: 수비 팀 기준 라인별 진행도 `struct[def][lane] ∈ {0..3}`(외곽·내곽·억제기), `baseTurrets[def] ∈ {2..0}`, `nexus[def]`. 한 공성에 라인 타워 최대 2, 진행도는 순서대로만(연쇄 금지). **억제기가 이전 사건에서 1개 이상 열려야 베이스 타격 가능**(같은 사건에서 라인→억제기→넥서스 한 번에 불가). **넥서스 = `baseTurrets[def]===0 && 여력 충분 & 수비 ≤3명**. 세트당 1회.
   - **열세 제한**: 구조물에서 4점 이상 뒤진 팀은 견제·지연만(스노볼 되돌리기 방지). 앞선 팀은 성공 시 `lanePush` 전 라인 +0.28, 수비 팀 −(momentum = 다음 공성 가속).
   - **자원 단일 경로**: 구조물 골드는 `resource[]` → `lead[]`에 1회만. `p`에 별도 구조물 항 없음.
4. **`simulateSet` 재구성**: 9구간 스켈레톤 유지 + 각 한타(i≥5) 뒤 `resolveSiege`. 넥서스면 즉시 종료(`endReason='NEXUS'`). 아니면 **연장전 루프**(한타+공성 반복)를 `nexus || clock ≥ 3600 || 사건 수 ≥ 30`까지. **9번째 사건이라는 이유로 승자를 정하지 않는다.**
5. **종료 판정**:
   - 정상: **실제 넥서스 파괴 사건에서만**. `winner = nexus 진 팀의 반대`.
   - 상한(CAP): `endReason='CAP'`, `phase:'종료'` 사건 push. 판정 = **구조물 피해 > pressure > advantage > 전용 동전(`seed|tiebreak`)**. `edgeA`·마지막 사건 방향을 숨은 기본 승자로 쓰지 않는다. 중계는 "넥서스는 파괴되지 않았습니다 … 판정승(정상 종료와 구분)".
   - `pressure`는 더 이상 세트를 끝내지 않음 — tiebreak 입력일 뿐.
6. **중계**(`narration.ts`): 한타 브랜치의 "억제기를 밀어 넥서스까지 파괴" **삭제**. 공성 사건 = 실제 철거/억제기/넥서스만 서술(피해만 입은 구조물을 파괴라고 안 함). NO_WINDOW/HELD/RESET은 무산·정비 문구. 넥서스 파괴 사건이 '돌아보기'(첫 킬 콜백) 담당. 중계 시각은 연출 페이싱(경기 시계와 별개, 문서화).
7. **미니맵**(`replay.ts` + `app/replay-theater.tsx`): 공성 사건 = 공격자만 수비 구조물 앞으로 이동, `beat.struct` 스냅샷(양 팀 구조물 상태). 구조물 아이콘은 SVG에 아직 안 그림 — **사이드 패널 텍스트 상태가 명시적 대체 표시**. `stateAt(rd,t).struct`. `'종료'` 사건은 지도 표시 생략. 부활 연출을 사건 앵커 방식으로 교체(clockMap·engineToPlay 폐지 — 사건 밀도 변화에 견고).

### 이유
- 계약: "정상 승리는 명시적인 넥서스 파괴 사건에서만." "nexusOpen만으로 종료 금지." "상한 도달은 별도 사유로 기록." "pressure나 마지막 edgeA를 숨은 기본 승자로 쓰지 않는다." "한타 승리만으로 구조물 자동 파괴 금지 — 실제 생존·이동 시간·부활·수비·라인 압박·자원으로 산출."
- 자원차를 여력에 넣되(±0.85 클램프) `p`(resPow)에도 이미 쓰였으므로 보조 항으로 제한 — 같은 자원을 두 종류 행동(교전 확률·공성 철거)에 쓰는 것은 정당하나, 크기를 낮춰 라인 우위가 한타 우위를 덮어쓰지 않게. 주 동력은 교전 결과(인원차)·운영 주도권.
- 열세 팀 베이스 진입 제한 = 스노볼이 실제로 이어지게(뒤진 팀이 한타 한 번 이겼다고 넥서스 밀어 되돌리는 것 방지).

### 영향
- `lib/simulation/combat.ts`: `MatchState`에 `clock/struct/baseTurrets/nexus/lanePush/region`, `newMatchState` 초기화. `Region`·`SiegeResult` 타입, `CombatEvent.kind`에 `'siege'`, `CombatEvent.siege`. `resolveTeamfight` clock/region/부활 지연/lanePush. `resolveSiege` 신설(~90줄). 상수 `TOWER_G/INHIB_G/NEXUS_TURRET_G/NEXUS_G`.
- `lib/game.ts`: `simulateSet` 루프 전면 재구성(`rollFight`/`finalize`/`doSiege` 클로저 + 연장 루프 + CAP 판정). `SetResult.endReason`. `CLOCK_CAP=3600 / EVENT_CAP=30`. POG 기여 필터에 `e.combat` 가드 + 공성 가중치.
- `lib/simulation/narration.ts`: 공성 브랜치, 한타 넥서스 주장 제거, `EVENT_MIN[i>=9]` 폴백.
- `lib/simulation/replay.ts`: `eventNode` 공성 분기, `StructSnapshot`·`beat.struct`·`stateAt.struct`, 사건 앵커 부활, `'종료'` 스킵, `clockMap`/`engineToPlay` 삭제.
- `app/replay-theater.tsx`: 사이드 패널 구조물 상태 표시, `snapKey`에 struct.
- 저장 형식: `SetResult.endReason`·`CombatEvent.siege` 모두 선택 필드. 구세이브 폴백.
- **사건 수**: 세트당 평균 ~17, 최대 30(EVENT_CAP). `ability.test`·`engine.test`의 `events.length<=9` 가정을 상한 상향으로 갱신 — 스켈레톤 뒤 운영 사건이 붙는 **요구 변경**(회귀 아님, 주석 기록).

### 검증(요약, 상세 VALIDATION.md)
- N=8000 통제(태그·타입 동일쌍): 정상(NEXUS) 96.2% / 상한(CAP) 3.8%. 사건/세트 16.8. 대칭(동일 픽) 세트 승률 49.75%(구조적 편향 없음). 태그쌍 균형 48.7%(이 픽쌍 고유 비대칭, 단위 4 대비 ~−1.4%p 이동 — 페어 비교엔 무영향).
- 오브 확보 → 그 세트 구조물 진행 90.5%. 첫 구조물 선취 팀 세트 승률 68.0%. 공성 시 A-ADC 생존이면 철거 1.76 vs 사망 0.18(보호→생존→공성 경로).
- 강화 효과(동일 시드 페어, 95% CI): TOP LNE+20 +1.48%p[0.64,2.31] · SUP VIS+20 +1.75%p[0.98,2.52](딜러 생존 +7.1%p) · JGL OBJ+20 +1.54%p[0.63,2.45](확보 +10.1%p) · ADC CAR+20 +4.47%p[3.20,5.75] · ADC MEC+20 +2.95%p[1.80,4.10] · SUP TF+20 +4.14%p[2.85,5.42] · 팀+10 +25.76%p. **모든 CI가 0을 배제** — 단위 4의 압축(pressure 레이스)이 공성→넥서스 경로로 풀렸다. 단, 작은 효과(SUP VIS 등)는 RNG 스트림에 따라 부호가 흔들려(balance-review 대비) **확정적 개선으로 단정하지 않는다** — 견고한 것은 큰 효과와 행동 지표.
- **전역 계수를 목표 승률에 맞추지 않았다.** 공성 여력 계수는 응답성(신호가 승리로 전달되게)·정상 종료율(>90%) 기준으로 조정, DECISIONS·VALIDATION에 근거 기록.
- combat.test 섹션 10 / replay.test 섹션 8 신설. 전체 스위트·tsc·build PASS. 브라우저 육안 미확인.

### 대안
- **nexusOpen 즉시 종료 / "열린 뒤 아무 한타나 이기면 종료"**: 기각(계약 명시). 넥서스 파괴 사건만.
- **동수 처치 한타 뒤 후속 진행 전면 금지**: 기각(계약: "무승부라고 일괄 금지하지 않는다"). 생존/수비 상태로 판단.
- **자원차를 여력의 주 동력으로**: 시도했으나 라인 우위가 한타 우위를 덮어써 조합 신호가 씻김(composition.test washout). 인원차·주도권을 주 동력으로, 자원차는 보조(±0.85).
- **EVENT_CAP 낮게(24)**: 상한 종료율 20%대로 높아 조합·능력 신호가 CAP 동전에 희석. 30으로 올려 3.8%.
- **`ability.test`/`composition.test` 임계값 하향으로 무마**: 기각(사용자 지시). 대신 필터를 `kind==='teamfight'`·초반 한타 한정으로 교정(방법론 보정), 근거 주석. `events.length` 상한은 요구 변경.

관련: MATCH-SYS(단위 5), ABIL-01, CAST-01, MINIMAP-01. 후속: 단위 6(표시 데이터 통합 — POG·골드 그래프·리캡을 실제 사건/기여로).

## D016 — 지속형 미니맵: 사건 창 키프레임 → 10명 독립 에이전트 시뮬레이션 (MINIMAP-02)

2026-09-10. 근거: 사용자 요청(MINIMAP-02). 첨부 영상·지도 이미지는 세션에서 접근 불가 — 기존 `MAP` 정의 + 상세 스펙으로 작업.

### 문제 (D013 재생의 증상)
`buildReplay`가 `SetResult.events`를 한 번 훑어 **사건 참가자만** 키프레임을 찍는 컴파일러였다. 결과: 사건 전 정지 → 사건에 급이동 → 사건 후 홈으로 왕복 → 다른 라인 정지 → `HOME`/`eventNode` 고정 노드 왕복 반복. 경기 시각 ↔ 재생 시각 대응이 사건당 임의(≈4~8초/사건). 지속 상태 없음.

### 선택
1. **WALK 보행 그래프**: `MAP`(16노드, 공개 계약) 유지. 내부 `WALK` = `MAP`을 한 번 세분(각 통로 중점) + 정글 캠프 4점 + 분수대 2점 = 55노드. 이동은 이 그래프 노드 경로 위에서만. 중점은 원 통로 선분 위 → 벽 침범 없음. `distToCorridor`/`WALL_TOL` 공개.
2. **지속 에이전트 10개** (`Agent`): `route:string[]`(WALK 노드명)·`seg`·`segT`·`fixedPos`(교전/사망 시 노드 고정)·`act`·`speed`·`nextDecide`·`alive`·`respawnAt`·`plan`·`lane`·`jgIdx`·`pushBias`. 위치는 route/seg/segT에서 유도. **사건이 끝나도 초기화하지 않는다** — 현재 위치에서 실제 경로로 다음 행동.
3. **고정 경기시간 간격 시뮬레이션** (`DT=2.5`초). 매 tick: 부활 처리 → 사건 해소(arm된 사건 중 `clock>=ev.clock`) → 접근 계획 부여(`ev.clock - lead` 이전) → 판단→이동(노드 단위). `decide` 먼저·이동 나중으로 키프레임 시각·위치 순서 일관.
4. **역할별 지속 행동**: 라이너 = pushBias(라인 승패·advantage·소량 난수)로 farm zone 중심을 정하고 그 부근 2~3노드를 오간다(고정 왕복 아님 — zone이 상황에 따라 라인 위를 드리프트). 정글 = 캠프 순찰 + 오브·갱킹 임박 시 접근(항상 다음 노드 ≠ 현재 노드). 서포터 = 원딜의 farm zone에 맞춘 한 칸 앞선 지원 위치(좌표 복제 아님) + 조건부 미드 로밍. 공통: 큰 교전 58초 전부터 참가 예정이면 드리프트, 정글 위험 감지 시 자기 포탑으로 반전 후퇴, 교전 후 자기 라인/정글로 물러났다 재판단. **무작위 흔들림·원점 왕복으로 지속 행동을 대체하지 않는다.**
5. **경로 탐색**: `route(from,to)` = WALK adj Dijkstra. 재경로는 항상 노드에서 시작(`headTo` — 일반: 앞 노드부터 이어붙여 역주행 없음 / 후퇴: 현재 구간 반전, 위치 연속). 임의 유효 목적지 도달. 고정 몇 경로 반복 구조 해소.
6. **경기 시각 ↔ 재생 시각**: `t = clock / SCALE`(SCALE=18, 균일). 모든 위치·상태·beat·골드가 `t`의 함수 → **프레임률·배속이 경기 판단에 영향 없음**. 속도 균일(≈ role speed × 18 ≈ 15~19 u/s) → **폭증 없음**. 사건 사이 긴 시간은 균일 압축(1800초 경기 → ~80~95초 재생).
7. **사건 연결**(기존 사건 유지 단계): 발생 전 `lead`(참가자 최장 이동시간 기반, 한타/오브는 최대 125초) 시점에 접근 계획 부여 → 실제 경로 이동. 발생 순간 **순간이동 없음** — 근처(≤5u)면 그 자리 교전, 5~26u면 경로대로 계속 이동해 도착 시 교전(`arriving`), 26u 초과면 `diag`에 "합류 실패" 기록. 처치·승패는 **엔진 `combat` 데이터 그대로** — 이동 모듈은 전투 결과를 만들지 않는다. 독립 도착 확률 재적용 없음.
8. **위치 난수 분리**: `mulberry32(hashStr(setSignature))` — SetResult 내용(`events[].{index,prob,goldA,winner}` + picks)에서만 시드 유도. `buildReplay(set)`는 순수·결정적. outcome/narration 난수와 무관.
9. **디버그 모드**(`app/replay-theater.tsx`): 토글 시 WALK 통로(흐린 선) + 선수별 남은 경로(굵은 선) + 아이콘 아래 현재 행동 + `rd.diag` 패널. `agentsAt(rd,t)`.
10. **표시 보정 ≠ 논리 위치**: 교전/사망 시 논리 위치 = 사건 노드(통로 위). 초상화 겹침은 시각화 코드(`scatter(slot)`, ~2.4u)로만 흩뿌림.
11. **RESPAWN 정렬**: replay의 `RESPAWN` = `lib/simulation/combat.ts`와 동일(`10+min(42,clock/60*1.5)`)로 맞춰 엔진 `notJoined`(사망) 판정과 replay 사망 창을 일치시킴.

### 영향
- `lib/simulation/replay.ts` **전면 재작성**: `WALK`·`route`·`distToCorridor`·`WALL_TOL`·`Agent` 시뮬레이션·`agentsAt` 신규. `buildReplay` 내부 완전 교체. `stateAt`에 `gameClock`. `ReplayData`에 `nav`(디버그 통로)·`diag`·`scale`. `TrackKey`에 `act`·`reason`. `posAt`가 `act`/`reason` 반환, `fight` 키프레임도 정지(교전 클러스터 보간 방지).
- `app/replay-theater.tsx`: 디버그 토글·나v 레이어·경로 폴리라인·행동 라벨·diag 패널, `scatter` 표시 보정, `gameClock` 사용, 배속 1×/2×/4×.
- `app/globals.css`: `.rt-nav`·`.rt-path`·`.rt-actlabel`·`.rt-diag`.
- `tests/replay.test.mjs`: **section 3 재작성**(고정 노드 검사 → `distToCorridor ≤ WALL_TOL+여유` + 0.25s 샘플 step<8). **section 9 신설**: 정지 없음(이동 프레임 >35%, 완전 정지 <12초 — 후반 미드 대치 허용), 사건 경계 넘어 경로 연속(연속 키프레임 사이 직선이 통로 위), 갱킹 구간 라인 독립 활동, diag 유한, 결정성, `agentsAt`. section 5는 접근 lead 구간 제외(교전 시점~창 종료만 검사 — 창이 겹칠 수 있음).
- 저장 형식 불변(replay는 읽기 전용). 엔진(`simulateSet`/combat/narration) 무변경.

### 검증
- `tests/replay.test.mjs` PASS(전 스위트·tsc·build PASS). 8시드 측정: **정지 트랙 0/10**, 벽 침범(비-교전/사망) 0, 결정성 100%, `maxWall` ≈ 1~4(교전 클러스터), diag 30~90(대부분 소폭 지연). 사건/재생 동기: 갱킹 창에서 참가자는 접근→교전, 비참가 탑·미드는 라인 유지, 양 팀 정글 각자 목적.
- **브라우저 육안 확인함**: dev 서버 RECAP에서 재생 — 00:07→00:15→09:00→13:17→13:47 각 시점 아이콘이 서로 다른 위치에서 이동, 라인/정글/집결 분산, 경로·행동 라벨(디버그), diag 패널, 클록·골드·스코어·피드 동기, t=0 정지 프레임(아이콘 홈 위치), 재생/정지/배속/처음부터·다음 사건 동작. 콘솔 오류 없음. (자동화 Chrome이 GIF를 녹화했으나 그 파일은 이 파일시스템에서 접근 불가 — 첨부 못 함.)

### 대안
- **사건 창 키프레임 유지 + CSS 속도만 조정**: 기각(사용자 명시 — 근본 구조 문제). 지속 상태 도입.
- **모든 프레임을 세이브에 저장**: 기각. 경로·행동 변경 키프레임 + `t`의 함수로 재생(현재 방식).
- **가변 시간 압축**(사건 근처 실시간, 그 외 고속): 검토했으나 속도 일관성 위해 균일 SCALE 채택. 시간 생략은 균일 압축으로 자연 처리.
- **`replay.test` section 3 노드 정확 검사 유지**: 불가(임의 경로 = 55노드 + 스무딩). 통로 허용치 검사로 교체(요구 변경, 근거 주석).

관련: MINIMAP-02, MINIMAP-01, MATCH-SYS. 후속: 접근 도착 시각을 합류 판정에 통합(기존 능력치 판단과 이중 없이), 탑·미드·오브·공성 사건 애니메이션 다듬기, 구조물 아이콘 SVG.

## D017 — MATCH-SYS 단위 5 정합성 점검: 구조물 열세 게이트 제거 + CAP 분리

2026-09-11. 근거: 사용자 요청(단위 6 앞선 단위 5 점검). 별도 체크포인트로 커밋 `7167829`.

### 문제
1. `resolveSiege`에 `behind = dealtMe < dealtOpp-3`(구조물 격차 −4) 조건이 있어, 구조물에서 뒤진 팀은 `budget=min(budget,1)`으로 견제만 하고 `targetBase&&behind`면 베이스 진입 자체가 막혔다 — **구조물 열세 자체가 공성 금지 조건**. 열세팀이 유리한 교전(5v0)을 이겨도 구조물을 못 밀었다.
2. CAP(상한 종료)이 `endReason:'CAP'` 하나로, 시간 상한/사건 상한 구분·직전 상태·실패 사유 집계 없음. CAP 승자 동전의 편향·산식 미기록.
3. ADC 생존→공성 기여가 teamfight-review 집계로만 확인됨(같은 상태에서 ADC만 바꾼 통제 실험 없음).
4. 강화 효과 신뢰구간 산식·페어 원자료가 코드에만 있고 문서에 없음. "부호가 흔들린다"는 다른 실험(balance-review)의 조건·결과 미기록.

### 선택
1. **`behind` 게이트 완전 제거**(`dealtMe`/`dealtOpp` 포함). 공성 가능량은 `capacity`(생존 인원차·이동/부활 창·자원차 clamp −0.6~0.85·공성 능력·생존 ADC CAR·운영 주도권)에서만. 인위적 역전 보너스는 **추가하지 않음**. 자연 제동만 유지: `goldGap` 하한 −0.6, 넥서스는 `openInhib`(직전 사건 억제기)+`baseTurrets===0`+`def.length<=3`+`budget>=2` 필요 → 한 교전으로 자동 역전 불가.
2. `endReason` → `'NEXUS'|'CAP_TIME'|'CAP_EVENT'`. `CAP_TIME`=`cs.clock>=CLOCK_CAP`(3600s), `CAP_EVENT`=`ei>=EVENT_CAP-1`(30). `SetResult.capDiag={reason,clock,events,structDealt:[A,B],baseTurrets,inhibsOpen,recentSiegeFails(최대5),tiebreakStage}`. tiebreak: `struct(구조물 피해 우위) > pressure > advantage > 동전`. 동전 = `random(hash(seed|tiebreak|matchId|setIdx))` — 경기 outcome 난수와 **분리된 전용 해시 스트림**, 50/50, 위 3단계 완전 동률일 때만.
3. `combat.test` 10j(구조물 열세팀이 교전 승리 후 철거 — 회귀), 10k(공성 직전 상태 완전 동일, 죽은 A 슬롯만 ADC↔TOP — 순수 `adcSiege` 채널 통제 실험), 10i(capDiag 계약).
4. `teamfight-review.mjs`: CAP 시간/사건 분리·tiebreak 분포·CAP A승률·동전 A승률 집계. `pairedCI`에 McNemar 산식 주석(b=균형승·강화패, c=균형패·강화승, d̂=(c−b)/N, Var=(b+c−(c−b)²/N)/N², 95%CI=d̂±1.96√Var) + 페어 원자료(b,c) 출력.

### 이유
- 사용자 지시: "구조물 열세 자체가 공성 금지 조건이면 제거한다. 생존 공격자·수비자·이동 시간·부활 시간·라인 상태로 판단한다." `capacity`가 이미 그 요소들로 구성 → 게이트는 중복 억제였다.
- "단순히 상한을 늘리거나 철거 계수를 높여 숨기지 않는다" → EVENT_CAP·계수 불변, 분리·집계만.

### 영향
- `lib/simulation/combat.ts` `resolveSiege`: `behind` 3줄 제거. `REGION_DIST`/`regionTime` export(미니맵 대조용, D018).
- `lib/game.ts`: `SetResult.endReason` 타입 + `capDiag`. `simulateSet` CAP 블록 재작성. `CapDiag` 타입 export.
- `tests/combat.test.mjs` 10i 재작성 + 10j·10k 신규. `tests/ability.test.mjs` endReason 문자열. `tests/teamfight-review.mjs` CAP 지표.

### 검증 (teamfight-review N=6000, 통제 base 전스탯70·태그쌍)
- 정상(NEXUS) **97.62%** / 상한(CAP) **2.38%** — 전부 `CAP_EVENT`(시간 상한은 실측 0%, 안전망). `behind` 제거로 CAP 3.8%(D015)→2.38%(열세팀이 공성으로 마무리 가능해짐, 인위적 보너스 없음).
- CAP tiebreak: 구조물 127 / pressure 14 / advantage 2 / **동전 0**(n=143). 동전은 실측상 도달 안 함(구조물 피해가 거의 항상 불균등). CAP 직전 평균 경기시계 1764s, 구조물 피해 A 6.6 : B 6.7(양 팀 억제기 부근에서 넥서스만 못 낸 교착).
- ADC 통제 실험(10k): 공성 직전 상태 동일, 죽은 슬롯만 ADC↔TOP → 철거 **ADC 사망 1.00 vs ADC 생존 2.00**개/공성. teamfight-review 집계: A-ADC 생존 1.82(n=14672) vs 사망 0.18(n=4186).
- 강화 효과(동일 시드 페어, 95% CI): TOP_LNE +2.35[1.37,3.33] · SUP_VIS +2.2[1.3,3.1] · JGL_OBJ +2.53[1.47,3.6] · ADC_CAR +6.0[4.51,7.49] · ADC_MEC +4.32[2.97,5.66] · SUP_TF +5.5[4.0,7.0] · 팀+10 +26.97[25.36,28.57]. 전부 CI 0 배제.
- **부호 흔들림(balance-review N=6000, `m.id='controlled-1'` — 다른 해시 스트림 → 서로소 게임 모집단)**: 같은 +20 단일 스탯 버프인데 SUP_VIS20 = 49.13−48.75 = **+0.38%p**(teamfight-review는 +2.2). 균형 자체도 두 하네스에서 47.62% vs 48.75%(1.1%p 차, 순수 RNG 스트림). ⇒ 두 하네스는 대수적으로 같은 추정량이지만 `m.id`가 모든 `random()` 시드를 바꿔 서로 다른 경기를 돌린다. **큰 효과(ADC_CAR·SUP_TF·팀+10, |Δ|>3%p)는 두 모집단에서 부호·크기 일치. 작은 효과(SUP_VIS·TOP_LNE ≈ 0.4~2.4%p)는 N=6000 표집 바닥(~±1.3%p)에 걸려 크기 불확실 → 승률 수치가 아니라 행동 지표(딜러 생존 +7.1%p·보호 성공 +13.3%p)로 보고.**

### 대안
- `behind`를 유지하되 완화: 기각(사용자 명시 — 게이트 자체 제거).
- `endReason:'CAP'` 유지 + capKind 서브필드: 기각, 정직한 분리가 낫고 테스트 3곳뿐.
- EVENT_CAP 상향으로 CAP율 낮추기: 기각(사용자 명시 금지).

관련: MATCH-SYS 단위 5(D015), 단위 6.

## D018 — 미니맵 이동 시간 ↔ 엔진 REGION_DIST 정합 + 구조물 SVG + RECAP 크래시 수정

2026-09-11. 근거: 사용자 요청(단위 6 앞선 지속형 미니맵 정합성 + 구조물 표시). 커밋 `9e2ac06`.

### 문제
1. **"논리상 도착했는데 화면에서는 이동 중" 모순**: MINIMAP-02 검증 결과, 사건 시각에 참가자가 사건 노드에 없는 경우가 12시드 212사건 중 523건, `diag` "합류 실패(거리 >26u)" 12시드 335건. 원인: (a) 미니맵 WALK 이동 속도가 엔진 REGION_DIST 대비 ~3.2배 느림, (b) 엔진이 한타 14s 뒤에 공성을 붙이는데 미니맵은 라인 이동에 그보다 오래 걸림, (c) `plan` 재배정이 늦은 사건으로 덮어써 이른 사건 참가자가 이탈, (d) 한타 정지 창(`tail`)이 다음 사건보다 길어 참가자가 묶임.
2. 구조물이 미니맵에 안 그려짐(D015에서 사이드 패널 텍스트로만 대체).
3. (발견) RECAP 이벤트 로그가 `winner:''`(공성 HELD/NO_WINDOW·noMove 한타)에서 `meta('').short` 크래시 — D015부터의 잠재 버그.

### 선택
1. **`REGION_DIST`/`regionTime`를 `combat.ts`에서 export** → `replay.ts`가 단일 출처로 대조. `travelAudit()` export(지역쌍별 엔진 초 vs WALK 초 vs 비율).
2. **`TRAVEL_K=2.6`**: 에이전트 속도에 곱해 미니맵 이동 시간을 엔진 표 크기에 정렬(실측 중앙값 정렬). 두 모델은 위상이 달라(엔진은 강↔탑 인접, WALK는 우회) **정확히 일치시키지 않고** 잔차(비율 중앙값 ~1.2)는 `diag`/`rd.travel`에 기록. **순간이동·과속으로 숨기지 않는다**(사용자 지시).
3. **`showDelay`(화면 렌더 지연)**: `stime = eclock + showDelay`. `showDelay = clamp(walkSeconds(이전 사건 노드→이 사건 노드)·1.2 + 10 − 엔진 간격, 0, 34)`. 화면에서 사건을 그만큼 늦춰 참가자가 순간이동 대신 실제로 걷는다. **엔진 판정·`engineClock` 불변** — `eclock`(엔진, 모든 `engineClock` 필드·골드 조회)과 `stime`(화면, 모든 `t=T(...)` 타임스탬프·창·해소 게이트) 분리.
4. **계획 재배정**: 사건 종료 시 참가자를 다음 armed 사건으로 재계획(한타→공성 14s 사이에도 미리 이동 시작). `fightUntil`/`arriving` 중인 에이전트는 재계획·이동 지시 **금지**(같은 tick에 교전 키프레임과 이동 키프레임이 충돌해 `emit` dedup이 앞 키프레임을 덮어쓰는 것 방지). `tail`을 `min(8+kills·5, 다음 stime − stime − 14)`로 클램프.
5. **`lead` 상한 상향** 125→175(big)/80→120(small): 접근을 더 일찍 시작(시작만 앞당김, 과속 아님).
6. 남는 '합류 이동'은 전부 `diag`에 거리·`showDelay`와 함께 기록. `#N: rs 엔진 참가자이나 미니맵 사망`도 기록. `rd.travel={k,lateJoins,farJoins,ratioMedian}`, `diag[0]` = 대조 요약.
7. **구조물 SVG**(`replay-theater.tsx`): 팀별 라인 3 × [외곽·내곽·억제기] + 넥서스포탑 2 + 넥서스 = 24개. `snap.struct`(재생 시각까지 집계된 상태)에서만 렌더 → **미래 상태 미노출**. 살아있음=팀색 채움, 파괴=회색 테두리. 데이터가 라인별 0..3 정수뿐 → **부분 피해 진행 바 없음**(데이터가 지원하는 만큼만).
8. `manager.tsx` RECAP 이벤트 로그: `{e.winner ? meta(e.winner).short : ''}` 가드.

### 이유
- 사용자 지시: "단위 5의 Region/REGION_DIST와 미니맵 이동 시간을 대조한다. 논리상 도착했는데 화면에서는 이동 중인 모순을 방지한다. 불일치를 순간이동이나 과속으로 숨기지 않는다." → 대조 함수 + 속도 정렬(K) + 화면 지연(showDelay, 엔진 불변) + 잔차 전량 로그.
- 시각화가 처치·승패·보상을 재계산하지 않음: `combat.participants`가 authoritative, 이동 모듈은 전투 결과를 안 만듦(D016 유지). 실제 합류 규칙은 **바꾸지 않음** — 화면 렌더 시각만 조정.

### 영향
- `lib/simulation/combat.ts`: `REGION_DIST`/`regionTime` export.
- `lib/simulation/replay.ts`: `import {REGION_DIST,regionTime}`. `TRAVEL_K`·`walkNodeRegion`·`walkSeconds`·`travelAudit` 신규(export: `TRAVEL_K`,`travelAudit`). `evInfo`에 `eclock`/`stime`/`showDelay`. 해소·arming 블록의 타이밍 참조를 `stime`으로, `engineClock` 필드를 `eclock`으로 분리. 계획 재배정 + fightUntil/arriving 가드. tick 끝 이동 키프레임(긴 단일 구간 보간 폭증 방지). 종료 키프레임 `endClock+4`(루프 마지막 tick과 시각 겹침 방지). `ReplayData.travel`.
- `app/replay-theater.tsx`: `STR` 좌표 상수 + `structLayer` useMemo + `<g className="rt-structs">`.
- `app/globals.css`: `.rt-turret`/`.rt-inhib`/`.rt-nexus`/`.rt-nexus-x`.
- `app/manager.tsx`: `e.winner` 가드(D015 잠재 크래시).
- `tests/replay.test.mjs`: 섹션 3 step 상한 8→16(요구 변경 주석 — TRAVEL_K로 스텝 커짐). 섹션 10 신규(REGION_DIST 대조: 크기 80%+ 정렬·큰 차이 순서 보존·'도착 또는 사망 또는 diag 기록'·farJoins 유한·전량 로그).

### 검증
- 7개 스위트 PASS(replay 섹션 10 포함), tsc 0, build 0.
- 12시드 재측정: "이동시간 부족" 335→**0**, "합류 실패" 335→**0**. "합류 이동"(도착 지연, 전량 diag) 12시드 250~410 · 원거리(>34u) 8~29/세트 — 전부 diag에 거리·지연 기록. `travelAudit` 비율: 대부분 0.66~1.45(중앙값 1.23), `top↔river`만 2.2(WALK 우회, 명시적 예외).
- **브라우저 육안 확인함**: dev 서버(`localhost:5176`) RECAP 재생 — 00:06→11:49(전령·FB)→13:59(다음 사건) 아이콘이 서로 다른 위치에서 독립 이동(참가자 집결/비참가 라인 유지/사망 정지), 구조물 24개 렌더, 넥서스 파괴 시 해당 팀 넥서스만 회색+✕(다른 팀 온전 — 미래 미노출), 디버그(⚙)에서 통로·경로·행동 라벨 + 이동 대조 패널("이동 대조: TRAVEL_K=2.6 · WALK/REGION_DIST 비율 중앙값 1.28 · 지연 합류 N"), 배속 2×·시크·다음 사건·처음부터 동작, 콘솔 크래시 없음(가드 전에는 `meta('').short` 크래시 재현).
- **미확인**: 모바일 뷰포트(`resize_window`가 OS 창은 줄였으나 CDP 스크린샷 뷰포트는 1568px 고정 — 반응형 CSS는 정적 규칙만). 탭 비활성/복귀(코드에 `visibilitychange` 핸들러 존재). 비교 GIF(자동화 Chrome이 5프레임 다운로드했으나 이 파일시스템에서 접근 불가).

### 대안
- `TRAVEL_K` 대신 WALK 세그먼트 비용을 개별 조정: 기각(단일 계수가 검증·재현 쉬움).
- `showDelay` 없이 `lead`만 키워 해결: 불충분(한타→공성 14s 간격은 lead로 못 당김 — 앞 사건이 아직 진행 중). showDelay가 근본.
- 합류 실패 시 순간이동 스냅: 기각(사용자 명시 금지). 계속 걷게 하고 diag 기록.
- 구조물 부분 피해 바: 기각(엔진 데이터가 라인별 0..3뿐 — 없는 정밀도를 만들지 않음).

관련: MINIMAP-02(D016), MATCH-SYS 단위 5(D015/D017). 후속: 접근 도착 시각 ↔ 합류 판정 통합(별도 체크포인트), 모바일/탭전환 브라우저 확인, 비교 영상.

## D019 — POG를 실제 개인 사건 기여로 계산 (MATCH-SYS 단위 6 첫 슬라이스)

2026-09-11. 근거: 사용자 요청(/protocol-resume — 첫 미완료 우선 작업). BACKLOG "단위 6" 절, HANDOFF "다음 첫 행동 A". 커밋 `3198ce2`.

### 문제
POG(Player of the Game) 선정이 `simulateSet` 말미의 **역할별 고정 가중치**였다: 사건 index로 분기(0→TOP·1→MID·2→ADC/SUP…), 한타·공성은 슬롯별 상수 배열 `[.15,.15,.2,.3,.2]`. 실제로 그 세트에서 누가 처치에 관여했는지·딜러를 살렸는지·공성에 붙었는지와 무관하게 역할만으로 뽑혔다. 선정 이유 문자열도 없었다(리캡·명전 리더보드에 이름만).

### 선택
1. **사건(combat) 원자료만 슬롯별로 합산한다 — 재추첨·재계산 없음.** 승부·골드·중계 난수 미소비, `p`·`lead`·`advantage` 불변. 순수 읽기.
   - 갱킹·오브·한타·공성 공통: `combat.kills`의 처치(+3.0)·어시스트(+1.4)·FIRST BLOOD(+1.5).
   - 갱킹/스커미시 무처치 승리: 그 라인 참가자에 소량 라인 주도권(+1.0).
   - 오브 확보: 확보 팀 합류자 +0.7(정글 +1.5).
   - 한타: `fight.contrib[]`를 그대로 사용(이미 슬롯별 계산됨) — `kill·2.2 + engage·1.2 + damage·0.16 + survived·0.25`, 보호 성공 `protect·2.42`.
   - 공성: 철거 참가자 +1.0/구조물(원딜 +1.8/구조물 — `adcSiege` 채널과 정합), 넥서스 파괴 참가자 +4.0.
2. **POG = 승리 팀 5인 중 최댓값 슬롯.** 동점 tiebreak: 전투 기여(`kaW+tfW`) → 보호(`protW`) → 슬롯 순(안정).
3. **선정 이유 = 실제 사건 원자료(가중치 역산 아님).** `pogReason` = `"<ROLE> · N킬 관여 · 한타 딜러 보호 M회 · 오브젝트 K회 확보 · 구조물 공성 S회 · 넥서스 파괴 가담"` 중 기여 큰 순 최대 3개. 전투 기여 0이면 `"라인·운영 주도권"`.
4. **`damage`는 '가상 점수'** — 이유 문자열에 '피해량 X'으로 쓰지 않는다(체력·피해 시스템 없음). 킬 관여 수는 `kills + assists + round(Σ contrib.kill)`.
5. `SetResult.pogReason?:string` 신규(선택 필드 — 구세이브 폴백, 저장 형식 불변). `recap[]`에 근거 문장 1줄 추가("이 세트 POG … — … 승리 팀 5인의 실제 사건 기여를 합산해 뽑았습니다").
6. `app/manager.tsx` RECAP 카드 PoG 줄에 `pogReason` 표시(`.pog-why`).

### 이유
- 사용자 지시(BACKLOG 단위 6): "POG = 그 집계의 최댓값 슬롯. 역할별 고정 점수만으로 뽑지 않는다. 선정 이유 문자열을 실제 사건과 연결." → 사건 데이터 합산 + 이유를 원자료로 검증 가능하게.
- 표시용 별도 추첨 금지·표시값 이중 반영 금지(CLAUDE.md): 새 난수 없음, 전력식에 새 항 없음. POG는 순수 사후 집계.
- 골드 그래프(단위 6 step 4)는 이미 `GoldGraph`가 `e.goldA/goldB`(엔진 사건 골드)를 reveal-gate로 그린다 → **이번 변경 없음**(정합 확인만).

### 영향
- `lib/game.ts`: `SetResult.pogReason?`. `simulateSet` 말미 POG 블록 재작성(역할 가중치 → 사건 기여 집계 `cSide[A|B][slot]` + `pogReason` 생성). `recap[]` 4번째 문장 추가. `p`·`lead`·`advantage`·난수 스트림 불변.
- `app/manager.tsx`: RECAP PoG 줄에 `{last.pogReason}`. `app/globals.css`: `.pog-why`.
- `tests/combat.test.mjs`: 섹션 11 신규 — 11a(pog·pogReason 결정성), 11b(POG는 승리 팀 선수), 11c(pogReason 각 항목이 원자료 재집계와 숫자·태그 일치 + 역할 접두 일치 + POG 전투 기여 ≥ 승리 팀 중앙값, 250시드), 11d(통제 조합 POG 슬롯 분포 — 모든 역할 >3%·한 역할 <50%, 600시드).
- `tests/teamfight-review.mjs`: 승리 팀 POG 슬롯 분포 집계·출력 추가(`pogDist`).

### 검증
- 7개 스위트(combat 섹션 11 포함) + tsc 0 + build 0.
- `combat.test` 11c: 250시드 전부 pogReason 원자료 일치 + POG 전투 기여가 승리 팀 중앙값 이상(역할 고정 아님).
- `combat.test` 11d(600시드) / `teamfight-review 4000`: POG 슬롯 분포 TOP 16.9% · JGL 24.2% · MID 12.4% · ADC 28.3% · SUP 18.4% — 한 역할 독식 없음. (MID가 낮은 건 이 모델에서 미드 한타 처치가 분산되기 때문 — 구조적 편향 아님.)
- `teamfight-review 4000`: 강화별 승률 CI·행동 지표 전부 D017 대비 불변(`equal` 행 Δ승률 +0 — POG 변경이 결과 난수를 흔들지 않음).
- 브라우저 육안 미확인(이번 세션 dev/브라우저 미기동): RECAP PoG 줄·recap 4번째 문장 렌더는 정적 확인만.

### 대안
- 한타 `contrib.damage`를 킬 관여 수에 합산: 기각(가상 점수, '실제 피해량 X' 오인 유발). 이유 문자열엔 처치·보호·오브·공성만 명시.
- 넥서스/공성 가담을 이유에서 제외(모든 승리팀 참가자가 받아 변별력 낮음): 부분 채택 — total엔 반영하되 이유는 기여 큰 순 3개로 잘라 처치·보호가 앞서면 뒤로 밀림.
- 골드 그래프·리캡 전면 재작성(단위 6 step 4·5): 이번 슬라이스 범위 밖. step 4는 이미 정합(변경 불필요), step 5(리캡을 반전 beat·첫 구조물·넥서스 근거로) 후속.

관련: MATCH-SYS 단위 4(D014 — `fight.contrib` 도입), 단위 5(D015 — siege 참가자·nexus). 후속: 단위 6 step 5(리캡 근거 사건화), DRAFT-01, 명전 POG 리더보드 이유 노출.

## D020 — POG 이중가산·고정슬롯 동점 수정 + 미니맵 사건-경계 이동 연속성

2026-09-11. 근거: 사용자 명시 요청 — 우선순위를 "지속형 미니맵 완성"으로 재지정, 착수 전 (1) 완료된 POG(D019) 짧은 점검, (2) 미니맵을 최신 구현 상태부터 재확인(이미 된 것 다시 만들지 않기), (3) 미완료만 구현, (4) 실제 브라우저를 인수 기준으로. 커밋 `0b58edb`.

### 문제 — (1) POG 점검(D019)에서 발견
사용자가 지정한 5개 점검 항목 중 2개에서 실제 결함을 발견(분포가 고르다는 이유로 "문제없음"으로 덮지 않음):
1. **처치·어시스트 이중가산**: 한타 사건에서 `cb.kills`(처치·어시스트, 모든 사건 공통)와 `cb.fight.contrib[].kill`(한타 전용, 처치=+1·어시=+0.5)이 **같은 처치를 두 번** `total`과 `pogReason`의 "N킬 관여"에 더했다. 갱킹 처치는 3.0점인데 한타 처치는 3.0+2.2=5.2점 취급 — "킬 관여 수"가 "처치+어시스트"라는 표시 의미와 어긋났다(사용자 점검 항목 5 그대로 적중).
2. **동점 시 고정 슬롯 편향**: tiebreak가 `total`→`kaW+tfW`→`protW`까지 전부 동률이면 슬롯 순회 결과 **TOP(슬롯 0)이 항상 이겼다** — 완전 무기여 스톰프(라인 주도권만 동일하게 쌓인 경우) 같은 드문 경우지만 구조적으로 역할 고정이었다(점검 항목 3).
3. (점검 항목 2 확인) 오브젝트·넥서스 기여는 `cb.participants`(실제 합류자/생존 공격자)로만 제한 — 문제 없음. (항목 4 확인) POG는 `finishMatch`에서 챔피언 숙련 +3 XP·`p.pog` 카운터로 실제 연결되어 있음 — 문제 없음, 단 POG 대상이 바뀌므로 장기적으로 마스터리 성장 분포가 이동할 수 있음(회귀 아님, 기록만).

### 문제 — (2) 미니맵 최신 상태 재확인에서 발견
`replay.ts`를 D013/D016/D018 결정 기록과 함께 다시 읽었다. 8개 요구 항목 중 6개는 이미 완료(재구현 안 함): 10명 전체 매 틱 갱신·다른 라인 독립 행동·WALK 그래프 길찾기·사전 접근/집결·사망-부활-복귀 일관성·공성/구조물 표시(D018). **"사건 종료 위치를 다음 사건에 유지"만 실제로는 절반만 동작**했다:
- 사건 해소 블록 안의 "다음 armed 사건으로 재계획" 코드(D018이 작성)는 `if(fightUntil[...]!==undefined || arriving[...]) continue`로 가드돼 있는데, 이 가드는 **막 교전에 들어간 바로 그 참가자에게 항상 참**이다 — 주석의 의도("한타→공성 사이 좁은 시간에도 미리 이동 시작")와 달리 실전에서 결코 발동하지 않는 죽은 코드였다.
- 실제 재계획이 필요한 시점(`fightUntil` 만료·`arriving` 타임아웃)의 코드는 조건 없이 `homeNode`로 후퇴시켰다 — 한타 직후 거의 항상 붙는 `resolveSiege`(공성)를 참가자가 놓치고, 공성 사건이 실제로 발생할 때 멀리 있어 "합류 이동"(걸어서 뒤늦게 합류, 화면상 순간이동은 아니지만 "논리상 참가인데 화면에서 멀리" 상태)이 세트당 다수 발생 — D018이 이미 "합류 이동 ~30/세트, 전량 diag 기록"으로 남겨둔 바로 그 잔여 문제의 구조적 원인이었다.

### 선택
1. **POG 이중가산 제거**(`lib/game.ts`): 한타 `fight.contrib`에서 `kill`/`engage` 축 제거, `damage`(가상)·`survived`·`protect`만 `total`에 반영. 처치·어시스트는 모든 사건 공통으로 `cb.kills`에서만(`kaW`, `pogReason`의 "N킬 관여"). 대신 **한타 처치의 POG 선정 가중**(`TF_KB=1.1`, 갱킹 처치의 ~37%)을 `total`에만 별도 가산 — "한타 처치가 갱킹 처치보다 판을 크게 흔든다"는 설계 의도는 유지하되 표시 수치("N킬 관여")는 이중으로 세지 않는다.
2. **tiebreak 마지막 단계를 선수 id 해시로**: `hash(ws[s].id) > hash(ws[pogSlot].id)`. 완전 동률에서 슬롯 순서(TOP 우선)가 아니라 선수별 결정적이지만 역할과 무관한 순서로 정한다.
3. **`nextOwnEvent(a)` 신설**(`lib/simulation/replay.ts`): 이미 armed된 사건 중 이 선수가 낀 것을 찾는다. `fightUntil` 만료·`arriving` 타임아웃 시점에 확인해, 있으면 그쪽으로 바로 이어 이동(`route`/`headTo`로 실제 경로, 홈 왕복 없음), 없을 때만 기존처럼 `homeNode`로 후퇴. **합류 판정(`combat.participants`)·처치·보상은 그대로** — 시각화 이동 계획만 바뀐다.
4. **역할 편향 검증의 한계를 기록**(단정하지 않음): `combat.test` 11d/`teamfight-review`의 슬롯 분포(TOP~17%·JGL~23%·MID~9%·ADC~33%·SUP~18%, 통제 조합 4000시드)는 "POG 집계 공식이 슬롯마다 다른 가중치를 안 쓴다"만 보장한다. MID가 낮고 ADC가 높은 건 **이 게임의 밑바탕 전투 모델**(`rolePri`가 MID를 2순위 표적으로 삼아 사망이 잦고, `adcSiege` 채널이 생존 원딜의 공성 기여를 가중)에서 나온 결과로 판단 — POG 공식 자체를 MID 쪽으로 보정하지 않는다(그건 역할 고정 점수를 다시 넣는 것과 같다). 확인한 범위: 통제된 태그쌍 조합·N=4000. 확인 못 한 범위: 실제 커리어의 다양한 스탯 분포·숙련·오프롤에서의 분포.

### 이유
- 사용자 지시(1번 점검): "분포가 고르게 나왔다는 이유만으로 '역할 편향 없음'이라고 단정하지 말고" → 실제 계산식을 다시 읽어 이중가산·고정슬롯을 찾아 고쳤고, 남은 분포 편차(MID/ADC)는 원인을 밝히고 한계로 기록했다(추가 보정 없음).
- 사용자 지시(2번): "이미 완료한 이동 작업이 있다면 다시 만들지 않는다" → `replay.ts` 재작성 대신, 코드를 정독해 실제로 고장난 지점(재계획 가드) 하나만 정확히 고쳤다. WALK 그래프·에이전트 시뮬·구조물 렌더 등은 그대로.
- 사용자 지시(3번): "이동 계획 지속성 across events" — 처치·승패는 여전히 `combat` 모듈이 authoritative, 이동 모듈은 다음 사건 노드를 알려줄 뿐 새 판정을 만들지 않는다.
- 사용자 지시(4번): "실제 화면을 인수 기준으로" → 고정 시드로 드래곤 한타 → 바텀 공성 → 미드 한타로 이어지는 연속 구간을 브라우저에서 실측(아래 검증). 자동 테스트(diag 카운트)와 브라우저 관찰을 구분해 기록.

### 영향
- `lib/game.ts`: POG 집계 블록 재작성(이중가산 제거, `TF_KB` 신설, tiebreak에 `hash(ws[s].id)` 추가). `pogReason` 문자열 생성 로직은 형식 불변(`kaTot=kills+assists`로 의미만 교정).
- `lib/simulation/replay.ts`: `nextOwnEvent` 신설. `fightUntil` 만료 분기·`arriving` 타임아웃 분기 재작성(있으면 재합류, 없으면 기존 후퇴). 사건 해소 블록의 "재계획" 주석을 실제 동작에 맞게 수정(이제 이 블록은 "이 사건엔 불참했지만 이미 armed된 다음 사건엔 낀" 드문 경우만 처리).
- `tests/combat.test.mjs` 11c: `rawTally`에서 `tfInv` 제거(`kaTot=kills+assists`로 재정의, 원자료 재집계와 표시 수치 의미 일치). 중앙값 비교를 근사(−3 슬랙)로 완화 + 집계 임계값(90%) 추가 — 이유는 검증 절 참조.

### 검증
- 7개 스위트(combat 섹션 11 포함) + tsc 0 + build 0. `engine.test` **1060 결정적 세트 deep-equal 유지**(POG·이동 계획 변경은 결과에 영향 없음을 재확인).
- **POG**: `combat.test` 11c(250시드) — pogReason 각 항목이 원자료 독립 재집계와 일치, "N킬 관여"가 정확히 처치+어시스트(더 이상 한타 처치 이중계산 없음). POG의 실제 사건 기여(킬 관여+보호+오브+공성+넥서스)가 승리 팀 중앙값 미만인 세트는 400시드 중 4.5%(최대 격차 3 — `damage`/`survived`의 소액 타이브레이크 채널 때문, 세부는 `combat.test` 주석). 11d(600시드)/`teamfight-review`(4000시드): POG 슬롯 분포 TOP 14.6~20.5% · JGL 21.8~23.1% · MID 7.0~9.8% · ADC 31.5~37.8% · SUP 16.5~19.0%(런마다 변동, 위 "한계" 절 참조) — 모든 역할 >3%, 한 역할 <50%. 강화별 승률 CI·행동 지표는 D017/D019 대비 전부 불변.
- **미니맵**: 같은 시드 12개(수정 전/후 직접 비교) — "합류 이동" 579→346(−40%), 그중 원거리(>34u) 349→55(**−84%**). "이동시간 부족"/"합류 실패"는 수정 전후 모두 0에 근접(60시드 확장 표본에서 1건, 기존에도 있던 진단 유형 — 회귀 아님).
- **브라우저 육안 확인함**(dev 서버 `localhost:5173`, PC 데스크톱, 이번 세션): 기존 저장 커리어(T1 vs KT, SET 1)의 RECAP에서 디버그 모드로 고정 시드 재생 — 드래곤 한타(18:11 "T1 한타 승리") → **참가자가 홈으로 물러났다 되돌아오지 않고 경로선을 그대로 유지한 채** 바텀 라인으로 이동 → 바텀 포탑 공성(18:44 "T1 바텀 포탑 2철거") → 다시 미드/드래곤 쪽 한타(19:03~19:56)로 이어지는 연속 구간을 재생 시간순으로 관찰. 다른 라인(불참 선수)은 그 사이 "라인"/"정글"/"로밍" 독립 행동 유지, 벽 통과·순간 점프 없음, 사망(✕)·부활("부활" 라벨) 텍스트 중계와 동기, 콘솔 에러 없음. GIF 6프레임 녹화·내보내기 성공했으나 **이 파일시스템에서 접근 불가**(D018과 동일한 환경 제약 — Chrome 다운로드 경로가 이 세션 파일시스템과 분리).
- **미확인**(D018과 동일한 도구 제약, 이번 세션도 해소 안 됨): 모바일 뷰포트(`resize_window`+새로고침 후에도 CDP 스크린샷이 1568px 고정 — 코드상 `@media(max-width:820px)` 규칙은 정적 확인, 런타임 미확인). 탭 비활성/복귀 자동 일시정지는 자동화 도중 트리거는 관찰했으나(재생 정지됨) 배지 문구가 자동화의 포커스 전환 특성상 곧바로 사라지지 않아 실사용자 재현으로 재확인 필요.

### 대안
- 미니맵 전체 재작성으로 접근: 기각(사용자 지시 "이미 완료한 이동 작업이 있다면 다시 만들지 않는다" — 실제로 6/8 항목은 이미 정상 동작이었다).
- POG의 역할별 분포 편차(MID 낮음)를 가중치로 직접 보정: 기각 — 그렇게 하면 "역할별 고정 점수"를 형태만 바꿔 재도입하는 것. 원인(밑바탕 전투 모델의 rolePri·adcSiege)을 기록하는 것으로 대신함.
- `groupSoon`에 `siege` kind를 추가해 사전 드리프트로 해결: 기각 — 공성은 항상 직전 한타의 승자 쪽 생존자만 참가(`resolveSiege`가 `alive(atkSide)`만 참가자로 기록), 즉 대상 인원이 한타 종료 시점에야 확정된다. `groupSoon`(사전 58초 드리프트)보다 **사건 해소 시점의 `nextOwnEvent`**가 더 정확한 지점.

관련: MINIMAP-02(D016), D018(이동 정합·구조물), MATCH-SYS 단위 6(D019 — POG 최초 도입). 후속: MINIMAP 2단계(접근 도착 시각 ↔ 합류 판정 통합, 별도 체크포인트) — 이번 변경은 이동 **계획**만 다뤘고 합류 **판정**은 여전히 `combat.participants` 그대로.

## D021 — MINIMAP 2단계 1부: 합류 이동 원인 분류 + 도착 기반 어시스트 표시 필터

2026-09-11. 근거: 사용자 명시 요청 — MINIMAP 2단계(접근 도착 시각 ↔ 합류 판정 통합) 착수. 단, 먼저 남은 이동 사례 분류 → 미래 사건 참조 경계 확인 → 도착-참여 연결 순서로 진행하라는 상세 지시(7개 항목). 커밋 `3e644ba`.

### 범위 결정(가장 중요) — 왜 전체를 이번 세션에 하지 않았는가
사용자 지시의 3~4번 항목("도착과 참여의 공통 계약", "교전 처리")은 문자 그대로 읽으면 `combat.ts`(`resolveObjective`/`resolveTeamfight`)의 참가자 결정 로직 자체를 이동 시간 기반으로 다시 설계하는 일이다. 사용자 스스로도 "결과가 바뀌는 이유를 이동·합류 변화로 설명한다"고 해서 결과 변화 가능성을 열어뒀다. 그런데 이 프로젝트에서 **결과에 영향을 주는 엔진 변경**(D014 한타 승패 재정의, D015 스노볼/종료, D017 정합성 점검)은 전부 수천 시드 통제 실험 + McNemar 95% CI로 검증했다 — 한 세션에 새 확률 채널(이동 시간 기반 참가 판정)을 설계·구현·수천 시드 검증까지 마치는 건 그 기존 관행에 못 미치는 얕은 검증으로 끝날 위험이 크다. 그래서:
- **이번 세션**: 표시(replay.ts) 계층에서 안전하게 할 수 있는 부분만 실제로 구현·검증했다(1~2번 전부, 3~4번 중 엔진을 안 건드리는 부분).
- **다음 세션으로 명시적으로 미룸**: `combat.ts`의 참가 확률 자체에 이동 시간을 통합하는 일. 아래 "남은 일"에 정확한 착수 조건을 적는다.
이 경계 자체가 이번 결정의 핵심이다 — 사용자가 원한 결과와 다를 수 있어 이유를 여기 명시한다.

### 1. 남은 이동 사례 분류 (결함 아님 — 관찰만)
- 기준선(0b58edb/a15915a, D020) 측정 재확인: "합류 이동" = 사건이 실제로 발생(`clock>=ev.stime`)하는 순간 참가자가 사건 노드에서 6유닛보다 먼 경우(즉시 교전 스냅 실패). 전체 기회(엔진이 확정한 참가자-인스턴스, notJoined 제외) 대비 비율을 **처음으로** 측정: N=300시드, 총 참가 기회 **34,100**건 중 합류 이동 **7,870건(23.08%)**, 그중 원거리(>34u) **1,180건(3.46%)**.
- `Agent.freeSince`(직전 fightUntil/arriving에서 풀려난 시각) + 사건 arm 시점 진단(`shortfallFlags`)을 추가해 매 "합류 이동" 로그에 4종 중 하나를 태그: **이전사건충돌**(사건이 armed되는 시점에 이 참가자가 아직 이전 사건의 fightUntil/arriving에 묶여 있었음) / **이동시간부족**(arm 시점에 이미 ETA 초과로 경고된 사례) / **지연전환**(showDelay로 화면을 늦췄지만 그래도 짧게 남은 정상 전환) / **장거리**(자유로운 상태에서 시작했는데 거리 자체가 큼).
- **실측 결과**: 이전사건충돌 7,859건(원거리 1,175) · 이동시간부족 11건(원거리 5) · 지연전환·장거리 **0건**. 즉 이 데이터에서 잔여 "합류 이동"은 사실상 전부 "직전 사건에 묶여 있다 풀려난 직후라 다음 사건에 갈 시간이 물리적으로 없었다"는 하나의 원인으로 수렴한다 — "이미 자유로운 상태에서 순수 거리 때문에 늦는" 경우는 관찰되지 않았다(자유로우면 `lead` 메커니즘이 충분히 커버하거나, 못 커버하면 arm 시점에 이미 "이동시간부족"으로 걸린다).
- **이게 왜 결함이 아닌가**: "이전사건충돌"은 "교전 중인 선수는 물리적으로 다음 목적지로 이동할 수 없다"는 당연한 제약의 결과다. `lead`(사전 접근 창)는 이 참가자가 **자유로울 때만** 유효하고, 교전에 묶여 있는 동안엔 아무리 넓은 `lead`를 줘도 소용없다 — 실제로 걸어서 도착하게 만드는 이상 이 지연은 근본적으로 없앨 수 없다(줄이려면 시각적 `tail`을 단축해 선수가 교전 종료 즉시 사라지게 해야 하는데, 그건 또 다른 부자연스러움이라 하지 않았다).
- **정상 장거리 이동을 없애려고 과속·순간이동·이벤트 위치 변경을 하지 않았다**(사용자 명시 지시 준수) — 이번 절은 관찰·분류만, `decide`/`headTo`/속도 상수는 미변경.
- **위치/경로 불연속**: 별도 확인 결과 0건. 80시드 445,482개 키프레임 쌍(정지·교전 스냅 제외) 전수 검사 — 최대 이동 거리가 속도 상한을 넘는 사례 없음. 기존 replay.test 섹션 3/9/10의 통로 허용치·결정성 검증으로 이미 보장되던 것을 이번에 수치로 재확인.
- 대표 사례(테스트로 고정, `tests/replay.test.mjs` 섹션 11): seed 0의 사건 #6(이전사건충돌), seed 49의 사건 #24(이동시간부족, D020 문서에서도 언급된 그 사례).
- `ReplayData.travel.causes`/`causesFar` 신규(원인별 집계), 각 diag 줄에 `[원인]` 태그 부착.

### 2. 미래 사건 참조의 경계 — `nextOwnEvent` 감사
`nextOwnEvent`의 소비 지점은 정확히 2곳(`fightUntil` 만료·`arriving` 타임아웃 분기, 둘 다 D020에서 추가) — 둘 다 **이동 목적지 결정**에만 쓰이고 엔진으로 역류하지 않는다. 읽는 값은 "이미 armed된 사건의 확정 참가자 명단"(`x.parts`)뿐 — **처치(`kills`)·승자(`fight.winner`/`objective.secured`)는 절대 읽지 않는다.** 판단: 이 명단 자체가 combat.ts에서 인과적으로(현재 생존·역할·능력치 기반, 미래 결과 참조 없이) 이미 결정된 값이고, `buildReplay`는 "완성된 경기 전체를 받아 재생 경로를 구성하는" 후처리 단계이므로, 사용자가 명시적으로 허용한 용도("완성된 경기의 재생 경로를 구성하는 용도로는 사용할 수 있지만")에 해당한다고 판단 — **코드 변경 없음, 경계를 명확히 하는 주석만 추가**(replay.ts 파일 상단). 관전자가 양 팀을 다 보는 것(MINIMAP-01 기본 관전 시점)과 "선수가 상대 위치를 안다"는 건 다르다는 점, 그리고 **시야가 추상적**이라는 기존 한계(`resolveObjective`/`resolveTeamfight`의 참가·도착 판정은 능력치 기반 확률이며 실제 거리·시야·감지를 모델링하지 않음 — 이번에도 미변경)를 명시적으로 코드 주석에 남겼다.

### 3~4. 도착과 참여의 공통 계약 · 교전 처리 — 구현한 첫 슬라이스(표시 계층만)
- **도착 추정**(`arrivalEst`): 사건 참가자별로 화면상 도착 시각을 계산 — 이미 도착(d≤6)이면 사건 시각 그 자체, 아직이면 `사건시각 + 거리/속도`(직선 근사, corridor 실제 경로보다 살짝 짧게 나올 수 있음 — 표시 필터 전용이라 실제 이동 경로·좌표는 안 바꾼다). **새 확률 롤 없음** — 순수 기하 계산이라 "기존 확률 기반 합류와 새 도착 판정이 같은 실패 확률을 중복 적용"할 여지 자체가 없다(둘 다 확정적 결정, 요행 없음).
- **합류 전 처치의 어시스트 미표시**: 처치 beat 생성 시 `k.assists`를 `arrivalEst<=그 처치의 화면 시각`인 선수로 필터. **엔진의 실제 어시스트 골드·POG 기여(`Contrib.kill`)는 전혀 안 바뀐다** — 이건 킬 피드(현재 UI엔 아직 안 그려짐, 데이터 계층만 정합)의 표시 필터다.
- **교전 시작 전 도착만 초기 참가자**: 기존 `d<=6` 즉시-교전 분기가 이미 이 요구를 만족(변경 없음, 재확인만).
- **교전 종료 후 도착 선수는 소급 안 됨**: 기존 `arriving.until` 타임아웃 메커니즘이 이미 보장 — 타임아웃 전에 도착 못 하면 `fightUntil`이 전혀 설정되지 않아 'fight' 상태에 진입한 적이 없다(재확인만, 변경 없음).
- **사망자는 부활 후 기지에서 이동 시작**: 기존 `FOUNT[side]` 스폰 로직이 이미 보장(재확인만).
- **늦은 도착의 "후속 행동 참가" 처리**(사용자가 원자적 한타 계산의 한계를 감안해 명시 허용한 대안): `arriving`이 타임아웃 전에 성공하면 그 순간부터 'fight' 상태로 표시되고, 이후 `nextOwnEvent`를 통해 다음 사건으로 자연스럽게 이어진다 — 이미 존재하던 동작이 이 요구와 우연히 일치.
- **미확인/미수정으로 남긴 것**: 처치(killer) 자체가 처치 시각에 아직 'fight' 상태가 아닌 사례가 150시드 2,504개 처치 중 **464건(18.5%)** 존재함을 이번에 처음 측정했다. 사용자 지시는 어시스트만 명시했으므로 killer 표시는 건드리지 않았다 — 발견 사실만 기록(아래 "남은 일").

### 검증
- 7개 스위트 PASS(engine **1060 결정적 세트** — D020과 완전히 동일한 수, `lib/game.ts`·`lib/simulation/combat.ts` 무변경이므로 구조적으로 100% 동일 결과가 보장됨). tsc 0, build 0.
- `tests/replay.test.mjs` 섹션 11(신규): 고정 사례 7종(제시간 도착·교전 중 도착·종료 후 도착·부활 후 이동하느라 불참·이동 중 집결 지시 변경·연속 교전 위치 유지·미참여 라인 독립 행동) 전부 150시드 이내 발견 + 각 불변식 확인(대표: seed0 #0/#6/#9, seed14).
- **브라우저 육안 확인함**(`localhost:5173`, PC, 이번 세션): 디버그 패널의 진단 첫 줄에 `원인 {"이전사건충돌":23}` 같은 새 집계가 실시간 표시됨을 확인. D020에서 확인한 드래곤 한타→바텀 공성 연속 구간을 다시 재생해 동일한 연속성 확인(위치·경로 변경 없음이 기대대로임을 재확인). 콘솔 에러 없음. 시각(게임 시계) 찍힌 연속 스크린샷 4장(18:42/18:52/19:04/19:14) 확보.
- GIF 3프레임 녹화·내보내기 성공했으나 **이 파일시스템에서 접근 불가**(D018/D020과 동일한 환경 제약, 원인 미확정) — 영상 검증을 했다고 주장하지 않고 위 스크린샷 + 재현 절차로 대체.
- **미확인**: 모바일 뷰포트(도구 제약 3연속 세션 동일), 탭 비활성/복귀 정확한 재현.

### 남은 일 — 정확한 착수 조건(다음 세션)
1. **오브젝트(전령/드래곤) 이벤트로 어시스트 필터 확장**: 이미 공통 코드 경로(`ev.kills` 루프)에 있어 자동으로 적용되지만, `resolveObjective`의 `arriveP`가 이동 시간과 무관하게 확률만으로 참가를 결정하므로 오브젝트 사건은 gank/teamfight보다 "화면과 판정의 괴리"가 클 수 있다 — 다음 세션에서 오브젝트 사건만 표본을 뽑아 별도로 확인.
2. **killer 표시 타이밍**(18.5% 불일치, 위에 기록): 어시스트처럼 필터할지, kill beat 자체를 도착 이후로 늦출지(단 `kt=evT+ki*3` 스케줄·골드 그래프 동기와 충돌 없는지 확인 필요) 설계 먼저.
3. **엔진 참가 판정에 이동 시간을 실제로 통합**(사용자 지시의 핵심, 이번엔 범위 밖): `resolveObjective`/`resolveTeamfight`가 이동 시간 기반 도착 가능성을 입력으로 받게 하려면 (a) 설계를 DECISIONS 초안으로 먼저 쓰고, (b) 어떤 참가자가 새로 불참 처리되는지 표로 남기고, (c) `teamfight-review.mjs`로 세트 승률·오브 확보율·NEXUS/CAP 비율을 D017/D019/D020과 나란히 재측정(수천 시드), (d) 그 통계가 D014~D017급 신뢰구간을 갖출 때까지는 "완료"로 표시하지 않는다.

관련: MINIMAP-02(D016), D018·D020(이동 정합·연속성). 후속: 위 3항목, 그 다음 모바일/탭전환 실기기 확인, MATCH-SYS 단위 6 step 5(사용자 지시로 MINIMAP 완성 다음).

## D022 — MINIMAP 2단계 2부: 이동·도착·전투 참여·기록의 단일화 (엔진 통합)

2026-09-11. 근거: 사용자가 D021의 접근을 명시적으로 반려 — "도착하지 않은 것으로 보이는 어시스트를 화면에서만 숨기면서 엔진의 어시스트·골드·POG를 그대로 두는 상태를 해소한다", "이번 범위를 임의로 어시스트 표시 수정으로 축소하지 않는다." D021이 다음 세션으로 미뤄뒀던 바로 그 항목("남은 일" 3번)에 착수.

### 문제
D021까지는 `replay.ts`의 `arrivalEst`가 화면 표시(킬 피드의 어시스트 목록)만 도착 시각 기준으로 필터링했다. 엔진(`combat.ts`)의 실제 어시스트 골드·POG 기여는 전혀 바뀌지 않았다 — 즉 화면과 공식 기록(KDA·중계·골드·POG)이 서로 다른 사실을 보여줄 수 있는 구조였다. 사용자는 이걸 "숨기기"로 규정하고, 판정 자체를 엔진에서 이동 시간 기반으로 다시 하라고 요구했다.

### 선택
1. **엔진에 이동↔전투 참여 단일 계약을 만든다**: `Combatant`에 `region:Region, freeAt:number`를 추가하고 `hasArrived(c,targetRegion,clock)=c.freeAt+regionTime(c.region,targetRegion)<=clock`(새 확률 롤 없는 순수 기하 게이트, 결정적)을 `resolveTeamfight`의 참가자 판정에 직접 넣는다 — "생존"만으로는 부족하고 "생존 + 실제 도착"이어야 참가자다.
2. **D021의 표시 필터는 폐기**한다. `arrivalEst`는 지우지 않되 **디버그 전용 모순 진단**으로 격을 낮춘다 — 엔진 판정이 항상 authoritative, WALK 그래프 추정이 그와 다르면 진단에만 기록.
3. **범위를 "이동 → 한타 → 다음 공성"으로 명시적으로 좁힌다**(사용자가 스스로 이렇게 지시함). `resolveGank`/`resolveBotLane`/`resolveObjective`는 이번 라운드에서 손대지 않는다 — 대신 "손대지 않았다"는 사실과 잠재적 위험을 미결 항목으로 명시 기록한다(임의로 "문제없음"이라 단정하지 않음).
4. **부활·공성도 같은 계약으로 엮는다**: `reviveByClock`이 부활 시 `region='base', freeAt=respawnAt`을 설정해 "부활 후 기지에서 실제 이동 시작"을 계약의 일부로 만든다. `resolveSiege`도 공격 팀 개인 `region`/`freeAt`를 전파해 한타→공성 경계에서도 위치 연속성이 다음 한타의 도착 판정에 그대로 이어지게 한다.

### 이유
"화면 필터"는 근본적으로 표시 계층의 임시방편이다 — 엔진이 이미 확정한 사실(어시스트가 존재했다는 것)을 화면에서만 지워봤자, 사용자가 다른 화면(KDA·리캡·POG)에서 그 어시스트를 다시 보게 되면 모순이 그대로 드러난다. 유일하게 일관된 해법은 "어시스트가 존재했는가"라는 판정 자체를 엔진에서 도착 여부로 정하고, 화면은 그 판정을 그대로 표시하는 것 — 사용자가 정확히 이 순서("기록을 먼저 올바르게 계산하고, 화면은 그 기록을 그대로 표시한다")를 요구했다.

### 영향 — 코드
- `lib/simulation/combat.ts`: `Combatant.region/freeAt` 필드 추가. `export const hasArrived=(c,targetRegion,clock)=>c.freeAt+regionTime(c.region,targetRegion)<=clock`. `resolveTeamfight`의 `alive(s)` 재정의(생존+도착 게이트) → `fight.aliveA/aliveB`가 게이트 통과 인원(원 생존자 수와 다를 수 있음). `notJoined`에 `'이동 중(도착 전)'` 사유 신설(`'전투 이탈(리스폰 대기)'`와 구분). SUP peel·표적 선정도 게이트 통과자만 대상. 한타 종료 후 **실제로 싸운 생존자만** `region/freeAt` 갱신. `reviveByClock`이 부활 시 `region='base',freeAt=respawnAt`. `resolveSiege`가 NO_WINDOW·정상 종료 두 지점에서 공격 팀 개인 `region`(항상 `'river'`)/`freeAt`(버퍼 마지막 구간을 다음 이동에 재배정)를 전파.
- `lib/simulation/narration.ts`: 한타 notJoined 표시를 `reason.includes('리스폰')?'부활 대기':'도착 전'`로 분기.
- `lib/simulation/replay.ts`: D021의 어시스트 display filter 제거(`k.assists` 원본 사용). `arrivalEst`는 디버그 진단(`#N: 슬롯 어시스트 도착 모순 — 엔진은 인증, WALK 추정은 처치 시각 이후 도착`)으로만 유지. `nextOwnEvent`는 무변경(D021 경계 유지).
- `tests/combat.test.mjs`: 신규 절 — mkState 기반 직접 구성 5시나리오(이전 교전 지연/처치 전 미도착/부활 후 이동 중/도착 지연에 따른 인원차/한타→공성 위치 연속성) + 필수 불변 조건 300건(killer=참가자, assist=같은 팀 참가자, 미도착=기여 없음) + 결정성. 시드 탐색이 아니라 상태를 직접 구성해 증명 — "오류를 발견하는 테스트"가 아니라 "계약 자체를 증명하는 회귀 방지 테스트".
- `tests/replay.test.mjs`: 섹션 5 불변식을 raw 거리(`d>4`) → 상태(`state!=='fight'`) → 최종적으로 `reason.startsWith('#N ')`(이 사건 한정)으로 두 차례 정교화 — 이동 중 사유가 늘면서 우연한 근접이 실패로 오검출되는 걸 막음.

### 발견·수정한 심각한 회귀 (구현 도중, 이 결정의 핵심 교훈)
게이트 초판 구현 직후 `composition.test.mjs`가 실패(앞라인 조합 우위 0.6%p, 요구 >3%p). 조사 결과 **전체 한타의 34~35%가 ONE_SIDED/NO_SHOW**로 붕괴하고 있었다. 근본 원인: `simulateSet`의 스켈레톤이 `resolveSiege`의 종료 시계를 **제로 갭**으로 바로 다음 `resolveTeamfight`의 clock 인자로 넘기는 구조인데, 초판 구현이 공성 종료 시 개인 `freeAt`을 "+8/+12 정비·귀환" 버퍼 **전체를 소진한 시각**으로 설정해, 다음 한타로의 이동에 쓸 시간이 정말로 0이 되고 있었다. **수정**: (a) 공성 후 개인 위치를 공격한 라인이 아니라 항상 `'river'`(어디로든 최단 경로의 중앙 허브)로 통일, (b) `freeAt`에서 버퍼의 마지막 구간(+8/+12)을 빼 "다음 사건으로의 초기 이동 시간"으로 재배정. **전역 계수 조정이 아니라 버퍼가 실제로 의미하는 바를 정확히 반영한 원리적 수정**이라는 점이 중요 — 옛 승률을 복원하려고 아무 상수나 건드린 게 아니다. 결과: ONE_SIDED/NO_SHOW 35%→0.00%, composition 격차 4.07pp로 정상화(요구 >3pp 충족), 전체 회귀 스위트 재확인 그린.

### 영향 — 측정치
- **464/2504(18.5%) 킬러 미도착 원인 분류**(사건 종류별 분해): gank 0% · objective 0% · **teamfight만 16.7%(358/2145)**. gank/objective는 참가자가 라인/오브 위치에 고정돼 애초에 이동 문제가 생길 구조가 아니다. teamfight 잔여는 `combat.ts`의 성긴 5구역 `REGION_DIST`와 `replay.ts`의 정밀 55노드 WALK 그래프가 최대 ~1.2배(top↔river 2.2배, D018부터 기록된 기존 격차) 어긋나는 **모델 불일치**로 확인됐다 — "실제 불가능한 참여"는 이번 게이트 도입으로 구조적으로 0이 됐음을 확인했으므로(gank/objective 0%가 그 방증), 남은 16.7%는 "이동↔참여 계약이 깨졌다"가 아니라 "두 시계 모델을 맞추는" 별개 작업으로 분류·이관한다.
- `git stash`로 D022 변경분만 격리해 `teamfight-review.mjs`(N=4000)로 D021 대비 전/후 비교: 승률·NEXUS/CAP 비율·POG 슬롯 분포·강화 델타는 전부 기존 노이즈 범위 내로 불변, **"사망 불참 슬롯" 지표만 의도대로 +2.74%p**(이동 중 불참이 새로 드러난 결과) — 전역 계수를 옛 승률에 맞춰 조정하지 않았다(사용자가 명시 금지).

### 대안(기각)
- WALK 그래프 좌표를 combat.ts에 직접 넘겨 정밀 판정 — 아키텍처 결합이 커지고(D015/D018이 유지해 온 combat.ts↔replay.ts 분리 경계를 깨뜨림), 이번 요청 범위(엔진 참여 판정)엔 REGION_DIST 수준의 추상 지역-이동시간표로 충분해 채택 안 함.
- 도착 게이트에도 확률(예: 딱 도착 못 한 근접 사례를 낮은 확률로 구제)을 넣는 방안 — 사용자가 "기존 확률과 새 도착 판정의 이중 적용 금지"를 명시했고, 순수 기하 게이트가 더 단순·결정적이라 기각.
- ONE_SIDED/NO_SHOW 회귀 발견 시 REGION_DIST 상수나 확률 계수를 조정해 봉합 — 근본 원인(버퍼 소진)을 놔둔 채 증상만 가리는 방식이라 기각, 원인 수정으로 대체.

관련: MINIMAP-01/02, D018(REGION_DIST/WALK 정합 최초 문서화), D020(사건-경계 이동 연속성), D021(합류 이동 원인 분류, 이번 결정이 반려·대체한 표시 필터). 후속: teamfight 킬러-표시 불일치 16.7% 정렬(WALK↔REGION_DIST), gank/botLane/objective 게이트 확장 검토, 모바일 실기기 확인(4연속 세션 미해결).

## D023 — F18 선수 성향(temperament): 4축 설계, id 기반 순수 함수, 결정 게이트 전용 연결

2026-09-15. 사용자가 F18(선수의 스타일·성장·컨디션)의 게임 디자인과 구현을 함께 위임하며 구체 사양을 줬다: 4개 연속 축(교전/자원 우선순위/정보 확보/콜), 양 끝 모두 강점·위험, 직접적 승률·자원 보너스 금지("성향이 행동 선택을 바꾸고 그 행동의 실제 결과로 강점과 위험이 발생"), 능력치·숙련·컨디션·팀호흡과 분리, 구세이브 재추첨 금지, 실존 인물 성격 재현 주장 금지, A(설계·데이터 계약·구세이브)→B(교전·자원 성향 실제 연결)→C(성장 과제 2종)→D(정보·콜 확장) 순서 진행.

### 문제
같은 능력치라도 선수의 "무엇을 선택하려는가"가 다르게 만들고, 그 차이가 감독의 조합·전술·훈련 선택과 맞물리게 해야 한다. 단, 이미 존재하는 확률식(처치·오브 확보·한타 승패)에 성향을 직접 더하면 "숨은 승률 보정"이 되어 사용자가 명시적으로 금지한 방식이 된다. 또 선수 데이터에 새 필드를 추가하면 구세이브 마이그레이션과 "불러올 때마다 재추첨되지 않아야 한다"는 요구를 동시에 만족시켜야 한다.

### 선택
1. **저장하지 않는다 — id의 결정적 해시로 그때그때 계산.** `lib/players/temperament.ts`의 `temperamentOf(playerId)`가 순수 함수다. `Player` 타입에 필드를 추가하지 않는다. 같은 id → 항상 같은 값(재추첨 없음), 마이그레이션 스크립트 불필요, 그리고 "실존 인물의 성격을 재현했다"는 주장 자체가 구조적으로 성립할 수 없다(이름이 아니라 내부 id 해시일 뿐). role은 함수 인자로도 받지 않아 포지션 고정이 원천적으로 불가능하다.
2. **분포는 두 독립 균등분포의 차(삼각분포, -1~+1, 평균 0).** "중앙은 균형형" 요구를 손으로 문턱값을 맞추는 대신 분포 형태 자체로 만족시킨다(실측: 평균 0, |값|>0.34 비율 약 41~45%, 축 간 상관 ~0).
3. **결정 게이트에만 연결한다, 결과 확률식에는 닿지 않는다.** Phase B에서 실제로 연결한 두 지점: (a) `resolveGank`/`resolveBotLane`의 정글러 갱킹 `commitP`에 `engage*0.08`(교전 성향), (b) `resolveObjective`의 비고정 슬롯(정글·미드 제외) `arriveP`에 `resource*0.08`(자원 우선순위). 둘 다 "합류할지" 결정 확률만 바꾸고, 처치 확률(`killP`/`atk`/`dfn`)·오브 확보 확률(`power()`/`favWins`)·골드 보상 공식은 전혀 건드리지 않는다 — F12(감독 지시)가 세운 "결정 채널과 결과 채널을 분리한다"는 선례를 그대로 따른다. 이렇게 하면 "성향이 능력치와 같은 확률식에 중복 가산"이 구조적으로 불가능해진다(다른 파일·다른 항에 있음).
4. **`Combatant`에 `temperament` 필드, `newMatchState`에 `temperamentFn` 콜백을 선택 인자로 추가.** 생략하면 전원 균형형(0,0,0,0) — 기존 모든 호출부(자동 매치·모든 테스트의 `mkState`)가 수학적으로 100% 동일한 결과를 낸다(가산항이 정확히 0이므로 근사가 아니라 항등식). `game.ts`의 실제 호출부만 `temperamentOf(player.id)`를 연결한다.
5. **근거 기록은 기존 `notJoined`/`evidence` 채널을 재사용한다.** 새 표시 채널을 만들지 않고, 극단 성향(|값|≥0.34)이 실제로 그 방향의 선택(합류/보류)과 함께 나타났을 때만 문장을 남긴다 — 정확한 반사실 비교(성향이 없었으면 어땠을지)는 계산하지 않고, "극단 성향 + 그 방향의 실제 선택"이라는 저비용 근사를 쓴다(F12의 director evidence와 같은 수준의 근사).
6. **가중치(0.08)는 설계 가설이며 실측 검증 전이다.** F12에서 상수를 감으로 잡았다가(0.10/0.05) 튜닝 없는 값이 기존 채널(prepare, +4.06%p)보다 훨씬 큰 효과(+11%p)를 냈던 실수를 반복하지 않기 위해, 이번엔 처음부터 "결정 확률의 절대 이동폭"을 스크래치 스크립트로 직접 재고 나서(갱킹 합류율 균형 대비 ±9~10%p, 오브 합류율 슬롯에 따라 ±9~17%p) 값을 확정했다 — 승률이 아니라 행동 지표(합류율)를 1차 기준으로 삼았다(사용자 §8 지시와 일치).

### 이유
"결정에만 개입하고 결과는 기존 능력치 공식이 그대로 책임진다"는 구조는 (a) 사용자가 명시한 "직접적 승률·자원 보너스 금지"를 코드 배치만으로 강제하고(리뷰어가 결과 확률식에 temperament가 안 보이면 끝), (b) F09(웨이브)·F12(감독 지시)에서 이미 검증된 "안전한 가산, 기본값=기존과 동일" 패턴을 그대로 재사용해 새 회귀 위험을 최소화하며, (c) "능력치·성향 중복 가산 금지"라는 요구를 별도 검증 없이 파일 구조로 이미 만족시킨다.

### 영향
- 신규: `lib/rng.ts`(random/hash를 game.ts에서 분리 — temperament.ts가 game.ts 순환 의존 없이 같은 결정적 규칙을 쓰기 위함, game.ts는 재수출로 기존 `import {random,hash} from '../lib/game.ts'` 전부 무변경), `lib/players/temperament.ts`, `tests/temperament.test.mjs`(Phase A), `tests/combat.test.mjs` 섹션 9c(Phase B).
- 변경: `lib/simulation/combat.ts`(`Combatant.temperament`, `newMatchState`에 선택 인자, `resolveGank`/`resolveBotLane`/`resolveObjective`에 결정 게이트 가산 4곳), `lib/game.ts`(`newMatchState` 실제 호출부에 `temperamentOf` 연결, temperament 유틸 재수출).
- 회귀 없음(설계상 항등식): `temperamentFn` 생략 시 결과가 이전과 정확히 같다 — 기존 `mkState()` 기반 테스트 전부가 그 증거.

### 대안(기각)
- **Player에 필드로 저장 + 세이브 마이그레이션.** 구세이브 처리를 "명시 규칙"이 아니라 "1회성 초기화 스크립트"로 풀게 되어 실수 여지가 늘고, "구세이브를 불러올 때마다 재추첨되지 않는다"는 요구를 지키려면 결국 "처음 로드할 때 한 번만 굳힌다"는 로직이 또 필요해진다 — id 해시 순수 함수가 그 요구를 공짜로 만족시킨다.
- **가중치를 확률(killP 등)에도 나눠 반영.** "성향이 결과에도 영향을 줘야 실감 난다"는 유혹이 있었지만, 사용자가 정확히 이 지점을 금지했다("직접적인 승률·공격력·골드 보너스는 주지 마") — 결정 게이트만으로도 상반된 트레이드오프(과감=더 자주 붙지만 나쁜 조건에서도 붙음)가 기존 결과 공식을 통해 자연히 발생한다는 걸 스크래치 스크립트로 확인했으므로 채택 안 함.

관련: F04(전술 접근·안전한 가산 패턴 최초 도입) / F09(웨이브, 같은 패턴) / F12(감독 지시, 결정·결과 채널 분리 선례이자 상수 튜닝 교훈) / F18 Phase C·D(성장 과제, 정보·콜 축 — 다음 작업).

### Phase D 추가(2026-09-16) — info·call 결정 게이트 연결
Phase B가 남긴 숙제(정보 확보·콜 성향은 설계·라벨·UI만 있고 엔진 미연결)를 마무리했다. 핵심 난제: `resource`(성장↔합류)가 이미 `resolveObjective`의 "정글·미드 제외 전체" 슬롯을 쓰고 있어, `info`를 같은 자리에 또 더하면 "같은 확률에 두 축이 중복 가산"이 된다. `call`은 개별 결정 지점이 아예 없다(팀 전체 성사 여부라는 집단적 성격).

1. **`info`는 resource와 슬롯을 나눠서 쓴다, 합치지 않는다.** `resolveObjective`의 비고정 슬롯은 두 종류다 — "핵심 참석" 슬롯(base=0.9, baseSlots: 이미 팀 계획에 든 자리)과 `condSlot`(base=0.42, 로밍형: 전령의 서포터/드래곤의 탑 — 원래도 "정찰 겸 합류할 수도 있는" 자리). resource는 핵심 참석 슬롯에만, info는 condSlot에만 붙인다(가중치 동일 0.08, 채널은 완전히 분리) — "안전 확인↔적극 탐색"이 로밍이라는 노출·정찰 행동과 의미상 정확히 겹치고, "성장↔합류"는 이미 확정된 팀 합류 결정과 겹친다는 실제 행동 의미로 슬롯을 나눴다(감이 아니라 코드에 이미 있던 base=0.9/0.42 구분을 그대로 썼다). 부수 효과: resource는 더 이상 condSlot에 안 닿는다(Phase B 때는 구분 없이 전체에 적용돼 있었음 — Phase D에서 명시적으로 좁힘, `tests/combat.test.mjs` 9d(3)이 이 회귀를 직접 확인).
2. **`call`은 개별 결정이 아니라 한타 실제 참가자(생존+도착, 최대 10명) 평균으로 계산해 `engageP`(한타 성사 여부)에만 더한다.** F12의 `dEngage`(감독 지시)와 정확히 같은 성격의 채널(교전이 열리는지만 바꾸고 `favWins`엔 안 닿음) — 개인이 아니라 팀 전체의 "계획 준수 성향"을 반영한다는 사용자 설계("팀이 준비되지 않으면 움직임이 갈릴 수 있음")와 맞고, F12에서 이미 검증된 채널을 재사용해 새 회귀 위험을 줄인다. 평균이라 중심극한정리로 개인 성향(-1~+1, |값|>0.34가 "균형 아님")보다 훨씬 0에 몰린다 — 근거 로그(`evidence`) 문턱은 개인용 0.34보다 낮은 `CALL_NOTABLE=0.12`를 별도로 뒀다(이 상수 자체는 감으로 정함, 실측 후 조정 가능하다고 코드에 명시).
3. **실측(4000시드, 격리된 `resolveObjective`/`resolveTeamfight` 직접 호출 — 조합·시드 통제, 성향만 스윕):**
   - info: condSlot 합류율 안전 확인(-1) 38.9% → 균형(0) 47.7% → 적극 탐색(+1) 57.8% (±9~10%p, engage/resource와 같은 자릿수).
   - call: 한타 NO_ENGAGE율 계획 준수(-1) 19.5% → 균형(0) 11.5% → 기회 제안(+1) 4.7% (균형 대비 +8.0%p/−6.8%p) — F12가 초기에 겪은 "거의 무교전을 없앰"(0.10 가중치, +11%p 승률 왜곡) 정도의 지배적 레버는 아니다(무교전이 사라지지 않고 여전히 4.7% 남음).
   - 두 경우 모두 "성향≠0인데 처치·확보·승패 확률이 그대로인지"를 같은 시드에서 직접 검정(`tests/combat.test.mjs` 9d(2)(3)(4)) — 채널 분리가 실제로 지켜짐을 코드가 아니라 실행 결과로 확인.
4. **양 끝 모두 유리하지 않음(사용자 §8 요구)을 설계로 논증**(대규모 시즌 시뮬레이션은 다음 검증 과제로 남김 — 아래 "알려진 제한" 참조): info(적극 탐색)는 팀이 그 오브전에서 불리(`favPow`열세)할 때 더 자주 나가 죽는 리스크가 커지고, info(안전 확인)는 팀이 유리할 때 합류 기회를 스스로 줄인다 — 어느 쪽도 "항상 좋음"이 아니라 팀의 그 순간 유불리에 달렸다. call도 마찬가지: hi-call(기회 제안)은 자기 팀이 유리한 한타를 더 많이 열게 해 이득이지만, 팀이 불리한 상황에서도 똑같이 더 자주 열어 손해를 키운다 — "그 팀이 강한 로스터인지 약한 로스터인지"에 따라 부호가 바뀌는 트레이드오프다.
5. **narration**: `resolveObjective`의 condSlot 결정과 `resolveTeamfight`의 engageP 결정 모두 "극단 성향 + 실제로 그 방향의 선택"일 때만 `evidence`에 근거를 남기고(Phase B와 동일 원칙), `narration.ts`는 F13이 세운 "엔진 evidence에 있을 때만 언급" 규칙을 그대로 따른다(새 규칙 도입 없음).

### Phase D 알려진 제한
- 실측은 격리된 단일 사건 호출(4000시드) 기준이다 — F15급 "실제 시즌 진행에서 team-wide 격차가 극단적 결과를 만드는지"는 아직 안 함(F18 Phase B 때도 같은 갭이 있었고, F15가 이미 같은 패턴의 team_all+10 시나리오를 검증한 전례가 있어 다음으로 미룸).
- 사용자 지시 6번("실제 경기에서 드러난 사례"를 선수 화면에 표시)은 Phase C에서도 Phase D에서도 구현하지 않았다 — scout/trainingLog 같은 영구 로그가 없으면 불가능(다음 조각으로 이관, `docs/claude/BACKLOG.md`의 F18절 참조).
- `CALL_TRAIT_W`(0.08)·`CALL_NOTABLE`(0.12)는 첫 설계 가설이다 — 승률에 맞춰 조용히 올리지 않았고, 실측값(위 3번)을 그대로 기록해 다음 세션이 판단할 수 있게 했다.

관련: F12(dEngage 채널 재사용) / F15(대규모 검증 방법론, 다음에 재사용) / F18 Phase A~C.

## D024 — F19 유망주 잠재력: 확정 숫자 대신 스카우트 관측 범위 + FA 비교 도구

2026-09-16. F19(스카우팅·유망주·영입 판단)의 지시서 완료 조건: "유망주의 잠재력은 확정 숫자 공개보다 관측 범위·불확실성·육성 비용을 갖게 하라", "싼 유망주가 무조건 최선이 아니며 즉시 전력과 육성의 차이가 있다", "필요한 역할/챔피언 풀/예산으로 선수를 찾는 비교 도구를 추가하라".

### 문제
기존 FA 시장 화면은 OVR 하나로만 정렬된 단순 표였고, 선수 상세 다이얼로그의 "성장 여력 높음/보통" 라벨은 `avg(p.pot)-avg(p.stats)>12`라는 정확한 계산식을 그대로 노출하는 것이어서 — 숨겨야 할 값(`pot`)을 문턱값만 씌워 사실상 공개하고 있었다. 이는 지시서가 명시적으로 금지한 "확정 숫자 공개"에 해당한다. 또한 즉시 전력(OVR)과 잠재력을 비교할 방법이 화면에 없어 "싼 유망주가 무조건 최선이 아니다"를 사용자가 체감할 수 없었다.

### 선택
1. **`scoutPotential(p)` 순수 함수 — 저장하지 않는다.** `lib/players/temperament.ts`(F18)와 같은 패턴: id 기반 결정적 해시로 매번 같은 값을 낸다(재추첨 없음), `Player` 타입에 필드 추가 없음, 구세이브 영향 없음. 실제 `p.pot`은 함수 내부에서만 참조하고 반환값에는 오차를 더한 범위만 담는다 — 호출자가 진짜 pot을 역산할 수 없도록 오차 폭(`band`)이 매 선수마다 다르다.
2. **오차 폭은 나이의 함수다.** `band=clamp(4+(25-age)*1.3,4,28)` — 18세는 폭 ~13, 25세 이상은 최소 폭 4로 수렴. "어린 선수는 실전 표본이 적어 예측이 어렵다"는 현실적 직관을 수식으로 표현했을 뿐 새 하위 시스템(실제 관측 이력 누적 등)은 만들지 않았다 — 그건 Phase B 후보로 명시적으로 미뤘다(아래 "대안" 참조).
3. **육성 소요를 숫자(주수)로 계산하지 않는다.** `devTier`(가까움/보통/멂) 3단계 정성 라벨만 준다. `train()`의 실제 성장식(`Math.pow(1-stats/pot,1.2)` 체감 곡선, 훈련 종류별 idx 분기, 코치 보너스)은 영입 시점엔 알 수 없는 변수(어떤 훈련을 택할지, 코치 레벨)에 의존해 단일 숫자로 요약하면 거짓 정밀도가 된다 — `DEVELOPMENT_ORDERS.md` 6절 "추상 수치와 실제 관측량을 구분한다" 원칙을 그대로 따랐다.
4. **FA 시장에 필터(포지션·연봉 상한) + 정렬(즉시 전력/육성 상한/연봉/나이) 추가.** 새 서버 상태나 game.ts 명령 없이 순수 클라이언트 상태(`faFilter`)로 처리 — 목록을 어떻게 보는지는 감독의 판단 도구이지 게임 규칙이 아니므로 저장할 필요가 없다.
5. **선수 상세 다이얼로그의 기존 "성장 여력 높음/보통" 표시를 같은 `scoutPotential`로 교체.** 두 화면(FA 시장·선수 상세)이 서로 다른 정보 모델을 쓰면 사용자가 혼란스럽다 — 하나로 통일했다.

### 이유
id 해시 기반 순수 함수는 F18의 temperament에서 이미 "저장 없이 결정적"이라는 요구를 만족시킨 전례가 있어 재사용 위험이 낮다. 오차를 나이로만 결정하고 새 관측 이력을 만들지 않은 것은 범위를 의도적으로 좁힌 선택이다 — F19 전체(영입·계약·육성 화면 통합)를 한 세션에 다 하지 않고 "비교 도구 + 불확실성 표시"라는 눈에 보이는 첫 단위만 완결했다.

### 영향
- 신규: `lib/game.ts`의 `scoutPotential`/`ScoutEstimate`, `tests/prospect.test.mjs`.
- 변경: `app/manager.tsx`(FA 시장 필터·정렬·잠재력 열, 선수 상세 다이얼로그의 잠재력 표시), `app/globals.css`(`.fa-filters`/`.fa-budget-input`/`.fa-ceiling`).
- 회귀 없음: 기존 `sign`/`trade`/`release`/`renew` 명령, `tradeQuote`(내부적으로 여전히 실제 `pot`을 씀 — 이건 사용자에게 보여주는 값이 아니라 트레이드 보상금 계산용 내부 로직이라 대상이 아니다) 전부 무변경. `scoutPotential`은 game.ts의 시뮬레이션 RNG 스트림과 완전히 독립된 자기 완결적 `random(hash(...))` 호출이라 엔진 결정성에 구조적으로 닿지 않는다.

### 대안(기각)
- **보유 선수는 관측 누적으로 범위를 좁히는 모델.** 더 사실적이지만 새 영속 필드(보유 시즌 수 등)가 필요해 이번 Phase A 범위를 벗어난다 — 다음 조각으로 명시적으로 미룸(BACKLOG.md F19절 "다음").
- **육성 소요를 실제 주수로 계산.** train()의 실제 다단계 체감 곡선을 단순화해서라도 숫자를 주면 사용자 편의는 높아지지만, "거짓 정밀도" 원칙을 직접 위반한다 — 정성 3단계로 대체.

관련: F18(id 해시 순수 함수·저장 없는 패턴의 선례) / F19 Phase B(챔피언 풀 필터·보유 선수 관측 누적, 다음 조각).

## D025 — F20 재정: 다음 시즌 확정 급여 노출 + 반복 비상 지원에 실제 대가

2026-09-16. F20(재정·계약·스태프의 실제 선택) 완료 조건: "현금과 연봉 총액을 구분하고 예약된 계약을 포함한다", "파산 직전 반복 지원으로 모든 선택이 무의미해지지 않게 구제 규칙을 명시한다", "스태프의 효과는 해당 시스템에서만 발생한다".

### 문제
기존 화면은 이미 운영 자금(cash)과 연봉 총액(payroll)을 별개 지표로 보여주고 있었다 — "구분"은 이미 돼 있었다. 하지만 "예약된 계약을 포함"은 안 됐다: 재계약(`renew`)으로 다음 시즌 연봉을 예약해도, 계약이 이번 시즌에 끝나는 선수가 있어도, 사용자가 볼 수 있는 값은 "이번 시즌 연봉 총액" 하나뿐이었다 — 다음 시즌 실제 지출이 얼마가 될지 미리 알 방법이 없었다. 더 심각한 건 파산 방지 로직(`settleWeek`)이 이미 있었다는 점이다: 운영 자금이 마이너스가 되면 매주 3억을 무조건·무제한·무대가로 지급하고 있었다 — 몇 번을 반복해도 지원액·대가가 전혀 바뀌지 않아 "모든 선택이 무의미해지지 않게"라는 요구를 정확히 위반하고 있었다(과소비해도 사실상 페널티가 없음). 이 규칙 자체도 사용자에게 화면 어디에도 설명돼 있지 않았다("구제 규칙을 명시" 위반).

### 선택
1. **`nextSeasonPayroll(g,id)` 신설.** 재계약(`nextSalary`)이 있으면 새 연봉을, 없어도 계약이 다음 시즌까지 남아 있으면(`until>=season+1`) 현재 연봉을, 계약이 이번 시즌에 끝나면 0을 더한다 — `nextYear()`가 실제로 어떤 선수를 남기고 내보내는지의 조건을 그대로 미러링했다(로직 두 곳에 다른 기준이 생기지 않도록).
2. **`annualBalance(g,id)` 신설 — 새 공식이 아니라 기존 공식의 단일 출처화.** `StaffCenter`가 이미 쓰고 있던 "연간 예상 운영 잔액" 계산식을 그대로 옮겼다. 계약 화면에서도 같은 수치를 보여줘야 하는데, 공식을 두 곳에 복사하면 언젠가 하나만 고쳐져 값이 갈라지는 문제가 생긴다 — `StaffCenter`도 이 함수를 쓰도록 리팩터링했다(동작 변화 없음, 브라우저로 두 화면의 값이 정확히 일치함을 확인).
3. **비상 지원에 실제 대가를 준다, 완전히 막지는 않는다.** `Team.bailouts?:number`(시즌마다 0으로 리셋)를 신설해 같은 시즌 안에서 반복될 때마다 지원액을 30→22→14→10억으로 줄이고(10억 하한 — 게임이 완전히 잠기지 않아야 하므로 0으로는 안 줄인다), 2회째부터 팬 만족도 −3을 追加한다. 사용자 구단에는 몇 회째인지, 얼마를 받았는지 뉴스로 그대로 알린다(숨기지 않음) — 계약 화면에도 규칙을 설명하는 문장과 이번 시즌 누적 횟수를 상시 노출한다.
4. **스태프 효과 격리는 재구현하지 않고 감사만 했다.** `coach`는 `train()`의 주간 성장·챔피언 특훈 XP·경기 후 마스터리 XP 세 곳에서만(전부 "성장" 범주), `analyst`는 AI 밴픽 판단 노이즈 한 곳에서만, `psych`는 휴식 번아웃 회복 한 곳에서만 참조됨을 grep으로 직접 확인했다 — 이미 완료 조건을 충족하고 있어 코드를 바꾸지 않았다(F08/F11이 세운 "이미 충족된 조건은 재구현하지 않는다" 원칙 그대로).

### 이유
`nextSeasonPayroll`이 `nextYear()`의 실제 로스터 유지/방출 조건을 그대로 미러링한 것은, 두 로직이 갈라지면(예: 화면은 "남는다"고 보여주는데 실제로는 방출되는 경우) 신뢰를 잃는 종류의 버그라 — 계산을 새로 설계하기보다 기존 진실의 원천을 그대로 재사용했다. 비상 지원의 대가는 "완전 차단"과 "완전 무료" 둘 다 피했다 — 완전 차단(지원 없음)은 이 게임의 다른 시스템(트레이드 보상금, 재계약 계약금 등)이 현금 흐름에 강하게 의존하므로 한 번의 실수로 영구 잠김을 만들 위험이 있고, 완전 무료(기존 상태)는 지시서가 명시적으로 금지한 "선택이 무의미해짐"이다 — 감소하되 바닥은 있는 중간 지점을 택했다.

### 영향
- 신규: `lib/game.ts`의 `nextSeasonPayroll`/`annualBalance`, `Team.bailouts?`, `tests/finance.test.mjs`.
- 변경: `settleWeek`(비상 지원 로직), `nextYear`(시즌마다 `bailouts` 리셋), `app/expansion.tsx`의 `StaffCenter`(공식을 `annualBalance` 호출로 교체 — 동작 동일, 브라우저로 두 화면 수치 일치 확인), `app/manager.tsx`(계약 탭에 재정 전망 패널), `app/globals.css`(`.finance-forecast`/`.finance-rule`).
- 회귀 위험 검토: `settleWeek`은 정규시즌·시즌 전환·국제대회 전환 등 게임 전체에서 매우 자주 호출되는 핵심 함수라 특히 조심스럽게 다뤘다 — 기존 테스트(`management.test.mjs`, `engine.test.mjs` 1097세트)에서 `t.cash`/`t.fan`의 정확한 값을 스냅샷 비교하는 곳이 없음을 먼저 확인한 뒤 진행했고, 두 스위트 모두 재확인 PASS.

### 대안(기각)
- **비상 지원을 완전히 없애고 파산 시 강제 조치(선수 강제 방출 등)를 도입.** 훨씬 무거운 새 시스템이 필요하고, 사용자가 감당 못 할 페널티로 게임이 재미없어질 위험 — 지시서도 "구제 규칙을 명시"하라고 했지 "구제를 없애라"고 하지 않았다.
- **지원액을 고정(예: 항상 30억)하고 팬 만족도만 깎는다.** 더 단순하지만 "반복될수록"이라는 지시서 문구가 요구하는 점증적 체감을 지원액에도 반영하는 편이 더 명확한 신호라고 판단했다.

관련: F19(D024, 같은 "예약된 계약/구제 규칙 명시" 화면 설계 철학) / F08·F11(이미 충족된 조건은 재구현하지 않는다는 선례, 스태프 격리 감사에 적용).

## D026 — F21 세트 사이 적응: 시리즈 내 실제 결과만 신호로, 하드 배제 없이

2026-09-16. F21(세트 사이 적응과 시리즈 규칙) 완료 조건: "BO3/BO5에서 이전 세트의 실제 실패 원인을 바탕으로 AI가 밴·선발·우선 라인을 조정하게 하라", "같은 상대에게 효과적인 조합을 반복할 때 상대가 관측을 통해 대응한다. 무조건 사용자 조합을 카운터 치는 숨은 보정은 금지한다", "세트 종료만으로 선수 컨디션·숙련·규칙상 사용 불가 픽이 잘못 초기화되지 않는다", "시리즈 준비 화면에서 변경 이유를 설명한다".

### 문제
`aiPick`(실제 밴픽을 결정하는 함수)을 읽어보니 `m.sets`(같은 매치 안에서 이미 끝난 세트들)를 전혀 참조하지 않았다 — 세트1과 세트2의 드래프트가 서로 완전히 독립적이었고, `m.sets.length`는 오직 RNG 시드 문자열에만 쓰여 "매번 다른 굴림"을 만들 뿐 "이전 세트에서 뭘 배웠는가"와는 무관했다. F07(상대 응수 탐색)이 이미 있어 착각하기 쉽지만, 그건 "같은 드래프트 안에서 한 수 앞"을 보는 것이지 "시리즈 전체의 기억"이 아니다 — 완전히 다른 기능이었다.

### 선택
1. **`seriesSignal(m,teamId)` 신설 — 이 매치의 이미 끝난 세트만 읽는다.** 상대가 이긴 세트에 있었던 상대 픽 → `oppWinChamps`(밴 우선순위 신호), 내가 진 세트에 있었던 내 픽 → `myLossChamps`(픽 감점 신호). 내가 이긴 세트의 내 픽은 신호에 안 넣는다(계속 쓸 이유가 더 크다는 게 상식적 판단). 진행 중인 세트나 미래 세트는 애초에 `m.sets`에 없어 구조적으로 못 읽는다(F08의 "미래 결과 미참조" 원칙과 같은 경계).
2. **하드 배제가 아니라 점수 가산/감산.** 피어리스 드래프트(밴이 세트를 넘어 누적)는 `settings` 화면이 이미 "지원하지 않는다"고 명시해 둔 규칙이다 — 이번 기능이 그걸 몰래 재도입하면 안 된다. 그래서 `oppWinChamps`에 있다고 밴이 100% 확정되거나 `myLossChamps`에 있다고 픽이 아예 불가능해지지 않는다 — 점수에 더하고 뺄 뿐, 최종 결정은 여전히 전체 스코어 경쟁이다.
3. **가중치는 감으로 정하지 않고 실측해서 두 축을 따로 보정했다.** 처음 밴/픽 둘 다 대칭적으로 같은 크기(+4/-3 등)를 썼더니 밴 쪽은 92.8%(사실상 결정론적), 픽 쪽은 -3일 때 87%→3.3%(거의 완전 회피)로 나와 "가산일 뿐, 하드 배제 아님"이라는 설계 의도와 실제 동작이 어긋났다(F12가 겪은 실수와 같은 종류 — 감으로 정한 상수가 의도보다 훨씬 강한 지배적 레버가 됨). 500시드 실측으로 다시 맞췄다: 밴 가산 `+3`(3.4%→44.8%, +41.4%p), 픽 감산 `-1.5`가 아니라 최종 `-0.5`(87%→49.3%, -37.7%p) — 두 값 모두 "뚜렷이 움직이지만 50%대에 머물러 다른 요인도 여전히 승부를 가른다"는 비슷한 크기의 효과로 수렴했다. 밴과 픽의 점수식 스케일이 원래 다르므로(픽 쪽에 마스터리·조합 적합도 등 더 큰 항이 많다) 같은 절대값을 쓰면 안 된다는 것 자체가 이번 실측의 핵심 교훈이다.
4. **`draftRecommendations`(사용자 자신의 픽/밴 추천)에도 같은 신호를 노출한다.** AI만 아는 정보가 없게 하기 위해 — "상대가 이전 세트 승리에 썼던 챔피언"·"우리가 이전 세트 패배에 썼던 챔피언(주의)"를 추천 이유 문장에 그대로 붙였다. `m`(Match)을 선택 인자로 추가했고 생략하면(과거 호출부) 신호가 비어 기존과 100% 동일.
5. **PREP 화면에 상시 배너로 "변경 이유"를 설명한다.** `current.sets.length>0`이고 신호가 실제로 있을 때만(대부분의 세트1에서는 조용히 안 뜬다) `seriesSignal`을 그대로 문장으로 풀어 보여준다 — AI 내부 점수를 보여줄 수는 없지만, AI가 참조하는 것과 똑같은 원본 사실(어떤 챔피언으로 이겼는지/졌는지)을 사용자도 보게 해서 "왜 이번 세트는 다를 수 있는지"가 설명되게 했다.
6. **완료 조건 1번은 재구현 없이 코드 감사로 확인했다.** `case 'continue'`는 phase만 바꾸고 선수 상태를 전혀 건드리지 않아 폼·번아웃·숙련은 세트 사이에 자연히 보존됨을 확인했다. `legalDraftCandidates`가 쓰는 `draftUsed(ds)`는 `DraftState` 하나에 스코프돼 있고 `DraftState`는 `startDraft`마다 `newDraftState`로 새로 만들어져 밴 풀도 세트마다 새로 열림을 확인했다(피어리스 미지원과 정합) — `tests/series.test.mjs` 섹션 3이 이 두 가지를 직접 재확인.

### 이유
가중치를 "감으로 대칭 값"이 아니라 "실측 후 비대칭 보정"으로 정한 것은 이번 결정에서 가장 중요한 부분이다 — 밴/픽 점수식의 구조가 다르면 같은 절대 상수도 완전히 다른 확률적 결과를 낳는다는 걸 스크래치 스크립트 없이 넘어갔으면(F18 HANDOFF가 여러 번 겪은 실수) 놓쳤을 것이다. AI만 아는 정보를 만들지 않는다는 원칙(4·5번)은 F07의 "사람이 읽을 수 있는 AI 밴픽" 철학을 시리즈 단위로 그대로 확장한 것 — 이 게임 전체가 일관되게 지켜온 설계 축이다.

### 영향
- 신규: `lib/game.ts`의 `seriesSignal`(export), `tests/series.test.mjs`.
- 변경: `aiPick`(BAN `+3`/PICK `-0.5` 가산·감산, `m.sets`가 비어 있으면 기존과 100% 동일), `draftRecommendations`(선택 인자 `m:Match` 추가, 이유 문자열에 시리즈 근거 추가), `app/manager.tsx`(PREP 화면 시리즈 적응 배너, `draftRecommendations` 호출부에 `match` 전달), `app/globals.css`(`.series-adapt`).
- 회귀 위험 검토: `aiPick`은 리그 전체 자동 매치(`autoMatch`)를 포함해 극히 자주 호출된다 — 세트1(가장 흔한 케이스)은 `m.sets`가 비어 있어 점수식이 기존과 수학적으로 동일(가산항이 정확히 0)하다는 점으로 회귀 위험을 구조적으로 낮췄다. `engine.test.mjs`(1097세트, 실제 BO3 시리즈의 2세트 드래프트도 자연히 포함)·`management.test.mjs` 재확인 PASS.

### 대안(기각)
- **세트를 넘는 밴 유지(피어리스에 가까운 형태).** `settings` 화면이 이미 명시적으로 "미지원"이라 못박은 규칙이라 — 새 기능이 조용히 그걸 만들면 기존 문서와 사용자에게 준 약속을 어기게 된다.
- **AI 내부 스코어를 그대로 사용자에게 노출(숫자 그대로).** 근거 없는 정밀도로 보일 위험 — 원본 사실(누가 뭘로 이기고 졌는지)만 보여주고 해석은 사용자에게 맡겼다.

관련: F07(같은 "설명 가능한 AI 밴픽" 철학, `bestOpponentReply`가 세운 "확정 안 된 미래는 안 읽는다" 경계) / F12(감으로 정한 상수가 지배적 레버가 됐던 실수와 그 교훈을 이번엔 사전에 피함) / F08(과거/미래 정보 경계 원칙).

## D027 — F22 시즌 서사: 실제 기록만 읽는 스토리라인 + 이미 있던 메타 로테이션에 고지 추가

2026-09-16. F22(시즌 서사와 규칙 버전별 메타) 완료 조건: "연승, 주전 경쟁, 신인 성장, 라이벌, 플레이오프 경쟁을 실제 시즌 기록에서 생성하라. 무작위 뉴스만 반복하지 마라", "변화 이유와 적용 시점이 기록된다. 진행 중 경기의 규칙은 바뀌지 않는다. 패치 전 리플레이는 당시 버전으로 보존한다. 실데이터를 연결하지 않았으면 게임 내 메타라고 부른다".

### 문제
`news()`를 감사해 보니 이미 전부 실제 사건(계약·경기 결과·스폰서) 기반이라 "무작위 뉴스"는 애초에 없었다 — 이 부분은 재구현 대상이 아니었다. 진짜 빠진 건 "실제 시즌 기록에서 스토리라인을 적극적으로 감지해 보여주는" 기능 자체였다: `g.history`(경기 기록)·`standings()`(순위)·로스터가 이미 다 있는데 이를 종합해 "연승 중"·"라이벌전"·"주전 경쟁"·"플레이오프 경쟁" 같은 서사로 뽑아 주는 코드가 없었다.
"규칙 버전별 메타" 쪽은 조사해 보니 `g.meta`(시즌마다 `metaChampions(seed,season)`로 재계산되는 포지션별 인기 챔피언 목록)가 사실상 이미 "패치"에 해당하는 시스템이었다 — 시즌 시작에만 바뀌고(진행 중 경기 불변), 리플레이가 저장된 사건을 그대로 재생할 뿐 현재 `g.meta`를 다시 조회하지 않아(`isMeta`는 시뮬레이션·드래프트 시점에만 호출됨, 재생 렌더러에는 없음) 과거 리플레이가 최신 메타로 왜곡되지 않는다. 화면 문구("시즌 X 메타 챔피언")와 `GAME_RULES.md`도 이미 "실제 라이브 통계 연동이 아니다"를 명시하고 있었다. **유일한 진짜 공백**: 메타가 바뀌는 "시점"이 news 등 어디에도 기록되지 않았다 — 조용히 바뀌고 있었다.

### 선택
1. **`seasonNarrative(g,id)` 신설 — 저장하지 않는 순수 함수.** `g.history`(이번 시즌·이 팀 경기만 필터)로 연승/연패(최신 기록부터 연속 개수, 3 미만은 서사로 안 침), 2번 이상 맞붙은 상대 중 승패 차가 가장 작은 팀을 라이벌로, `standings()`로 6위 컷과 승수 차 ≤1인 정규시즌 상황을 플레이오프 경쟁으로, 현재 로스터에서 벤치 선수 OVR이 선발과 근접(−2 이내)한 포지션을 주전 경쟁으로 뽑는다. 전부 이미 존재하는 필드만 읽는다 — 새 영속 상태 없음.
2. **"신인 성장"은 이번에 만들지 않았다.** 시즌 시작 시점 스탯 스냅샷이 없어 "얼마나 성장했는지"를 실제로 잴 방법이 없다 — 거짓 근거로 서사를 만들지 않기 위해 정직하게 범위에서 뺐다(다음 조각, 새 필드 필요).
3. **메타 로테이션에 news 고지만 추가.** `nextYear()`에서 `g.meta`를 재계산하기 직전 값과 비교해 새로 들어온 챔피언 최대 3종을 뽑아 `"시즌 N 게임 내 메타 개편 — OOO 등 부각(실제 통계 연동 아님, 시즌마다 로테이션)"` 문구를 news에 남긴다 — 시스템 자체는 이미 완료 조건 대부분(시점 고정·리플레이 불변·정직한 라벨링)을 충족하고 있었으므로 "고지"라는 진짜 공백 하나만 고쳤다.
4. **UI는 조건부로만 나타난다.** 감독실 홈에 "이번 시즌 이야기" 패널을 추가했지만 `seasonNarrative`가 빈 배열을 반환하면(대부분의 평범한 시점) 패널 자체가 렌더링되지 않는다 — 브라우저로 실제 저장 데이터(최근 경기가 패배라 연승 조건 불충족)에서 패널이 조용히 사라지는 것까지 확인했다(가짜로 항상 뭔가 보여주지 않음).

### 이유
`news()`가 이미 사실 기반이라는 걸 먼저 감사하지 않았다면 "무작위 뉴스 제거"라는 없는 문제를 풀려고 했을 것이다 — F08·F11·F20이 반복해서 보여준 "먼저 감사, 진짜 공백만 고친다" 패턴을 그대로 따랐다. 메타 시스템도 마찬가지: 새 "패치" 시스템을 처음부터 만들었다면 기존에 이미 잘 작동하던 시즌별 로테이션과 두 개의 유사 시스템이 공존해 혼란을 만들었을 것이다.

### 영향
- 신규: `lib/game.ts`의 `seasonNarrative`/`Storyline`(export), `tests/narrative.test.mjs`.
- 변경: `nextYear()`(메타 개편 news 1줄 추가), `app/manager.tsx`(감독실 홈에 "이번 시즌 이야기" 패널), `app/globals.css`(`.stories-panel`/`.story-item`).
- 회귀 위험 검토: `nextYear()`는 시즌 전환마다 정확히 한 번 호출되는 함수라 변경 폭이 작다 — 추가한 news 문자열 하나 외에 기존 로직 무변경. `seasonNarrative`는 완전히 새 함수(기존 코드 수정 없음)라 그 자체로 회귀 여지가 없다. `engine.test.mjs`(여러 시즌에 걸친 결정적 세트)·`management.test.mjs` 재확인 PASS.

### 대안(기각)
- **패치가 게임 규칙(오브젝트·시야 등)을 실제로 바꾸는 새 버전 시스템.** 지시서가 요구하는 "일부 특성/아이템/오브 규칙 변화" 본연의 의미에는 이게 더 가깝지만, 이미 있는 시즌 메타 로테이션과 별개로 완전히 새 아키텍처(버전 필드, 리플레이 버전 고정, 사전 예고 UI)를 만드는 건 이번 세션의 범위를 크게 벗어난다 — 기존 시스템이 이미 핵심 안전 조건(진행 중 경기 불변·리플레이 보존·정직한 라벨)을 충족하고 있다는 걸 확인한 뒤, "고지 공백"만 고치는 쪽을 택했다. 진짜 게임-규칙 패치 시스템은 다음 세션 후보로 남긴다.
- **"신인 성장"을 근사치로라도 만든다(예: 현재 나이 기반 추정).** 실제 관측 없는 추정을 서사로 보여주면 이 프로젝트 전체가 지켜온 "추상 수치를 실제 관측량처럼 표시하지 않는다" 원칙을 어긴다 — 스냅샷 필드 없이는 정직하게 못 만든다고 판단.

관련: F08·F11·F20(먼저 감사, 진짜 공백만 고친다는 선례) / F16·F17(같은 "실제 기록만 읽는 순수 함수 + export" 패턴).

## D028 — F23 모바일·경기 길이: 이미 좋은 것 확인 + 실제 공백(모션 감소의 JS 애니메이션 누락) 보완

2026-09-16. F23(모바일과 경기 길이 조절) 완료 조건: "터치 목표·키보드 포커스·색상 외 진영 구분·모션 감소·텍스트 크기를 점검한다. 저사양에서 움직임 프레임을 줄여도 엔진 시계와 결과는 동일하다. 앱 설치형 패키지는 웹 조작이 안정된 뒤 판단한다."

### 감사 결과(이미 충족 — 재구현하지 않음)
- **엔진 시계·프레임률 독립**: `replay-theater.tsx`의 rAF 루프에 이미 "프레임률이 경기 판단에 영향 없음(위치·상태 모두 t의 함수)" 주석과 함께 구현돼 있었다 — `posAt`/`stateAt`/`agentsAt`가 전부 시간 `t`의 순수 함수. 재구현 없이 재확인만.
- **키보드 포커스**: `button:focus-visible,a:focus-visible{outline:2px solid #c5f36b;outline-offset:4px}`가 전역으로 이미 있고, 미니맵 선수 아이콘도 `role="button" tabIndex={0}` + Enter/Space 핸들러 + `aria-label`을 이미 갖추고 있었다.
- **CSS 애니메이션의 모션 감소**: `@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`가 전역으로 이미 있었다.
- **색상 외 진영 구분**: 미니맵 선수 아이콘이 이미 챔피언 이니셜 텍스트+이미지+`aria-label`(선수명·챔피언명)을 색상과 함께 갖고 있고, 스코어 스트립도 팀 색상과 함께 팀 약칭 텍스트(T1/GEN 등)를 쓴다 — 색상 하나에만 의존하지 않음. 링 모양 자체를 팀별로 다르게 만드는 추가 변경은 이미 촘촘히 검증된 미니맵 렌더러에 굳이 새 시각 변수를 얹는 리스크 대비 이득이 낮다고 판단해 보류.
- **"전체 중계·하이라이트·빠른 결과는 같은 결과를 다른 밀도로"**: 기존 `density`('summary'/'detail'/'key') 토글이 이미 같은 `last.events` 배열을 다른 상세도로 보여주고 있었다(재시뮬레이션 아님).

### 문제(진짜 공백)
"모션 감소"는 CSS 애니메이션만 덮고 있었다 — 미니맵 선수 아이콘의 위치는 CSS transition이 아니라 매 `requestAnimationFrame`마다 `setAttribute('transform',...)`로 JS가 직접 갱신한다(성능·정밀도를 위한 D013~D022의 의도적 설계). `prefers-reduced-motion` CSS 미디어 쿼리는 이 JS 갱신에 전혀 관여하지 않아, OS에서 모션 감소를 켠 사용자도 미니맵에서는 여전히 매끄러운 연속 이동을 볼 수밖에 없었다.

### 선택
1. **`formationOffset`에 `reducedMotion` 선택 인자 추가(기본 false).** 이 함수는 이미 "표시 전용 오프셋 — 전투 사거리·피해·경로·결과 추론에 안 쓰인다"고 주석에 명시된 순수 함수라, 0.45초 smoothstep 완만한 전환을 즉시 스냅으로 바꿔도 판정에 영향이 있을 수 없다. 생략 시(기존 호출부 전부) 수학적으로 100% 동일함을 테스트로 직접 확인.
2. **rAF 루프의 실제 DOM 페인트 빈도를 모션 감소 시에만 ~150ms로 제한.** 엔진 시계(`tRef`)는 매 프레임 그대로 전진시킨다 — 배속·되감기·최종 결과는 무영향, "화면에 덜 자주 그린다"만 바뀐다. `window.matchMedia('(prefers-reduced-motion: reduce)')`로 감지하고 `change` 이벤트로 실시간 반영.
3. **좁은 화면(≤767px) 첫 진입 시 리캡 밀도 기본값을 'summary'로.** 사용자가 이미 고른 적이 있으면(localStorage) 그 선택이 항상 우선 — 새 기본값은 "아직 아무것도 고르지 않았을 때"만 개입한다. "세로 화면에서는 핵심 중계를 우선하고 상세 분석은 접을 수 있게"를 첫 화면부터 반영.
4. **실제 모바일 뷰포트 확인은 이번에도 BLOCKED.** `resize_window(390×844)` 후 스크린샷이 여전히 1568px 데스크톱 레이아웃으로 캡처됨 — D018부터 5개 세션 연속 같은 도구 제약. CSS 미디어 쿼리 자체(`@media(max-width:767px)` 등 9개 breakpoint)는 코드 감사로 확인했지만 실기기 렌더링은 검증하지 못했다고 정직하게 기록한다.
5. **터치 목표 크기**: 버튼 컴포넌트의 `sm` 크기가 `h-8`(32px)로 WCAG 2.5.8 Level AA(24×24 최소)는 충족하지만 AAA(44×44)는 아니다 — 공유 UI 라이브러리 컴포넌트라 변경 시 앱 전역(테이블 행 액션 등 수십 곳)에 영향을 주므로 이번엔 감사만 하고 변경하지 않았다(기록만, 대안 절 참조).

### 이유
F23을 "체크리스트"로 취급해 하나하나 증거로 확인한 뒤, 실제로 비어 있던 항목(JS 기반 모션이 접근성 설정을 못 받던 것) 하나에 집중했다 — F08·F11·F20·F22와 같은 패턴. `formationOffset`이 이미 "표시 전용"이라고 스스로 문서화해 둔 덕분에 이 변경이 안전하다는 걸 코드를 다시 읽지 않고도 알 수 있었다 — 좋은 사전 문서화의 실익.

### 영향
- 변경: `lib/simulation/broadcast.ts`(`formationOffset` 선택 인자), `app/replay-theater.tsx`(모션 감소 감지·페인트 스로틀), `app/manager.tsx`(density 초기값에 뷰포트 감지 추가), `tests/broadcast.test.mjs`(reducedMotion 3개 검정 추가).
- 회귀 위험 검토: `formationOffset` 새 인자는 기본값이 있어 기존 호출부(전부) 무변화 — 테스트로 직접 증명. 페인트 스로틀은 `reducedMotionRef.current`가 false인 한(이번 세션 브라우저 환경 포함, 기본값) 매 프레임 그대로 페인트해 기존과 동일 — 조건부 코드 경로라 이 세션의 실제 검증 환경에서는 사실상 비활성 상태였다는 점을 정직하게 기록한다(OS 수준 모션 감소 에뮬레이션 도구가 없어 시각적으로 직접 확인은 못 함, 로직 검토+단위 테스트로 대체). `broadcast.test.mjs`·`replay.test.mjs` 재확인 PASS.

### 대안(기각)
- **`sm` 버튼 높이를 44px로 전역 상향.** 공유 컴포넌트라 블라스트 반경이 매우 크고(테이블 행 액션 수십 곳), 이미 WCAG AA는 충족하는 상태라 이번 세션에서 리스크 대비 이득이 낮다고 판단 — 기록만 남기고 다음 조각으로.
- **미니맵 링 모양을 팀별로 다르게(예: 점선/실선).** 5개 세션에 걸쳐 정밀하게 검증된 렌더러에 새 시각 변수를 추가하는 리스크 대비, 이미 이니셜 텍스트·이미지·aria-label로 색상 외 구분이 되고 있어 우선순위를 낮춤.

관련: F08·F11·F20·F22(먼저 감사, 진짜 공백만 고친다는 선례) / D013·D016·D018·D020·D021·D022(미니맵 렌더러의 축적된 검증 이력 — 그래서 이번에도 최소 침습으로 접근).

## D029 — F24 세이브 가져오기: 기존 revision·영수증·백업 로테이션을 그대로 태운다

2026-09-16. F24(저장 안정성과 세이브 이동) 완료 조건: "기존 슬롯·revision·명령 영수증·복원 지점을 보존하라. 스키마 버전과 경기 엔진 버전을 구분하고, 세이브 내보내기/가져오기는 크기 제한·형식 검사·버전 검사·원본 보존을 갖추어라", "네트워크 끊김·중복 클릭·다른 기기 동시 진행·구버전 저장을 재현한다. 불러오기 실패가 기존 저장을 덮어쓰지 않는다."

### 감사 결과(이미 충족 — 재구현하지 않음)
`app/api/game/route.ts`를 읽어 보니 이미 매우 탄탄했다: 명령마다 `commandId`(중복 클릭·네트워크 재시도에 안전한 영수증 — 같은 id 재요청은 재적용하지 않고 캐시된 응답만 반환, 다른 내용이면 명시적으로 거부), `revision` 기반 낙관적 동시성 제어(SQL `UPDATE ... WHERE revision=?`로 DB 레벨 원자적 검사 — "다른 기기 동시 진행"을 앱 로직이 아니라 DB 트랜잭션으로 막는다), 세트마다 최근 3개 백업 로테이션(이미 "복원 지점" UI로 노출됨), 요청 크기·형식·CSRF 유사 검사가 전부 있었다. 클라이언트(`manager.tsx`)의 `load()`도 실패 시 `setSave`를 호출하지 않아 "불러오기 실패가 기존 저장을 덮어쓰지 않는다"를 이미 만족하고 있었다. `upgradeGame()`도 `g.version>3`이면 명확한 한국어 오류로 미래 버전을 거부하는 로직을 이미 갖고 있었다.

### 문제(진짜 공백)
설정 화면이 스스로 인정하고 있었다: "내보낸 파일의 다시 불러오기는 이 버전에서 지원하지 않습니다." — 내보내기(`exportSave`)는 있는데 가져오기가 없었다. "세이브 이동"(F24 제목 자체)이 문자 그대로 안 되는 상태였다.

### 선택
1. **새 API 경로를 만들지 않고 기존 명령 흐름에 `importSave`를 얹었다.** `applyCommand`의 새 `case`로 추가 — `POST /api/game`이 이미 하던 `commandId`/`revision`/백업 로테이션을 전부 공짜로 물려받는다. 특히 "원본 보존"은 API route의 UPDATE가 적용 직전 상태를 `backups[]`에 넣고 나서 덮어쓰는 기존 동작 그대로라, 가져오기가 잘못돼도 기존 "이 시점으로 복원" UI로 되돌릴 수 있다(새 되돌리기 기능을 따로 안 만들어도 됨).
2. **형식 검사는 얕은 shape 검사, 버전 검사는 기존 `upgradeGame()` 재사용.** `teamId`/`players`/`teams`/`season`/`version` 타입만 확인하고, 나머지(마이그레이션, 미래 버전 거부)는 `upgradeGame(structuredClone(imported))` 한 줄에 위임했다 — 이미 `management.test.mjs`가 검증해 온 로직과 정확히 같은 코드 경로라 새 버그를 넣을 자리가 없다.
3. **크기 제한은 실측 기반 이중 상한.** 일반 명령은 기존 10000바이트 그대로, `importSave`만 1.2MB(4시즌 진행 커리어 실측 268KB에 여유)로 별도 허용 — 명령 종류를 안 가리고 상한을 올리면 일반 명령의 공격면이 넓어지므로 분리했다.
4. **슬롯에 팀이 다르거나 빈 슬롯인 경우는 의도적으로 범위를 좁혔다.** 가져온 파일의 `teamId`가 현재 슬롯 팀과 달라도 허용한다(세이브 이동의 핵심 사용 사례 — 새 기기에서 같은 커리어를 이어받는 것). 반대로 **완전히 빈 슬롯**(아직 커리어를 만든 적 없는 슬롯)으로의 가져오기는 지원하지 않는다 — `applyCommand`가 항상 기존 `Game`을 전제하는 함수라, "게임이 아예 없는 상태"를 위한 별도 경로를 만들면 검증 로직이 두 곳으로 갈라진다. 먼저 아무 팀으로나 커리어를 만든 뒤 가져오면 되는 작은 마찰로 남겨 뒀다.

### 이유
"명령 하나 추가"로 프레이밍한 덕분에 이미 촘촘하게 검증된 동시성·영수증·백업 인프라를 한 글자도 새로 안 짜고 재사용했다 — 이 세션 전체가 F08·F11·F20·F22·F23에서 반복해 온 "감사 먼저, 진짜 공백만" 패턴의 가장 명확한 사례. 실제 브라우저에서 내보내기→(현금 값을 표식으로 바꿔치기)→가져오기→값 반영 확인→복원 지점으로 원상복구까지 전체 왕복을 실제로 수행해 서버 라운드트립까지 검증했다.

### 영향
- 신규: `lib/game.ts`의 `importSave` 케이스, `tests/save-import.test.mjs`(5섹션).
- 변경: `app/api/game/route.ts`(요청 크기 상한을 명령 종류별로 분리), `app/manager.tsx`(가져오기 버튼·파일 입력·확인 다이얼로그, 안내 문구 갱신).
- 회귀 위험 검토: `applyCommand`의 기존 case들은 전혀 안 건드렸다(새 case 추가만). 브라우저 실측으로 전체 경로(내보내기→가져오기→확인→복원) 왕복 확인 — 표식값(12345.68억)이 정확히 반영되고 복원 지점으로 원상복구됨을 직접 확인. `management.test.mjs`(마이그레이션 포함)·`engine.test.mjs` 재확인 PASS.

### 대안(기각)
- **가져오기 전용 새 API 엔드포인트.** revision/영수증/백업 로직을 통째로 복제해야 해서 두 경로가 갈라질 위험이 크다 — 기존 명령 경로 재사용이 훨씬 안전하다고 판단.
- **빈 슬롯으로의 직접 가져오기 지원.** `applyCommand`가 기존 게임을 전제하는 구조라 별도 "빈 슬롯" 경로를 만들면 형식 검사를 두 곳에 유지해야 한다 — 사용자가 먼저 팀을 선택해 커리어를 만드는 한 단계를 더 거치게 하는 쪽을 택함(마찰 작음, 검증 로직은 하나로 유지).

관련: F19~F23(먼저 감사, 진짜 공백만 고친다는 선례) / 기존 `POST /api/game`의 동시성·영수증·백업 설계(이번 세션 이전부터 이미 있던 자산, 재사용만 함).

## 새 결정 형식
ID / 날짜 / 문제 / 선택 / 이유 / 영향 / 대안 / 관련 작업 ID. 실제로 정하지 않은 사항은 제안이라고 표시한다.


## Codex 방송 개선 결정 — 2026-09-14
공통 arena 경로와 사건 movements, 실제 참가자 기반 조합 전투, 60초가 아닌 60개 사건 안전 상한(경기 3600초 유지)을 채택. 근거·한계·검증 계약 변경은 BROADCAST_UPDATE.md 참조.


## 중계 후속: 표시와 판정 분리
역할 진형은 원본 좌표 위 표시 보정이며 엔진을 변경하지 않는다. KDA와 완료 사건은 재생 시점 기준으로만 노출. 자세한 계약은 BROADCAST_CONTINUATION.md.
