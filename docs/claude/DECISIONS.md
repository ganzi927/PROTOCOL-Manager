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

## 새 결정 형식
ID / 날짜 / 문제 / 선택 / 이유 / 영향 / 대안 / 관련 작업 ID. 실제로 정하지 않은 사항은 제안이라고 표시한다.
