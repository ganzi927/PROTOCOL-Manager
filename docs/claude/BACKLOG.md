# 다음 개발 작업

상태: TODO / IN_PROGRESS / DONE / BLOCKED. 요청이 들어오면 해당 항목을 우선한다. 한 번에 의미 있는 한 항목을 완료하고 기록한다.

| ID | 우선순위 | 상태 | 작업 |
|---|---|---|---|
| SETUP-01 | P0 | DONE | Claude 지침·디자인/개발 가이드·체크포인트·실행 안내 |
| TRAIN-01 | P1 | DONE | 미등록 챔피언 특훈의 목표 불일치 수정 (2026-09-10, D006) |
| ABIL-01 | P1 | IN_PROGRESS | 선수 능력치의 경기 영향 개선. 1단계(라인·시야→개인 자원→후속 전투 전력) 완료 (2026-09-10, D007). 다음: Phase 3~5 |
| COMP-01 | P1 | IN_PROGRESS | 조합 승률·메타·AI 밴픽 확장(PROTOCOL-Composition-Meta-Design.md). 단계 2 첫 슬라이스(조합 프로필→구간 효과, 단일 경로) 완료 (2026-09-10, D008). 다음: 단계 3~6 |
| CAST-01 | P1 | IN_PROGRESS | 구조화된 중계. 1차(사건 기억·준비 beats·강도 tier·감독 레버·밀도 토글) 완료 (2026-09-10, D009). 다음: 참여자 상세·다중 조합 콜백·리캡 확대 |
| MINIMAP-01/02 | P1 | IN_PROGRESS | 이동형 미니맵. 1단계(D013)·지속형 에이전트 재작성(MINIMAP-02, D016) 완료. 다음: 접근 도착↔합류 판정 통합, 탑·미드·오브·공성 애니 다듬기. 아래 "MINIMAP-01" 절 참조 |
| MATCH-SYS | P1 | IN_PROGRESS | ABIL-01·COMP-01·CAST-01을 하나의 경기 시스템으로 통합. 단위 1(D010)·2(D011)·3(오브전+wa, D012)·4(참여자 한타, D014)·5(스노볼+구조물 종료, D015) 완료. 다음: 단위 6(표시 데이터 통합 — POG·골드 그래프·리캡). 아래 "MATCH-SYS" 절 참조 |
| SAVE-01 | P1 | TODO | v1/v2와 서로 다른 v3 형태의 마이그레이션 검증 |
| DRAFT-01 | P2 | TODO | 선택/스왑 후 선수별 정확한 보정 표시 |
| DOC-01 | P2 | TODO | 기존 GDD·README를 현행140종/Lv4/스왑 기준으로 통합 |
| UI-01 | P2 | TODO | 모바일 밴픽 가독성과 작은 텍스트 개선 |
| DATA-01 | P3 | TODO | 실존 로스터·챔피언 표기·외부 그림 데이터 검증 |

## TRAIN-01 — 완료 (2026-09-10)
관련: lib/game.ts의 training/train/gainMastery, app/manager.tsx의 champTrainOptions.
원래 증상: mastery에 없는 목표를 고르면 train()이 최저 숙련 챔피언으로 조용히 대체 → 사용자 선택과 XP·뉴스 불일치.
처리:
- 풀8칸 미만 + 실존 챔피언: gainMastery가 새 목표를 등록하고 그 챔피언에 +XP. (완료 조건 1 ✔)
- 풀8칸: training 명령에서 명시적 오류로 거부, 조용한 대체 없음. train()에도 방어 로직(보류 공지·XP 미지급). (완료 조건 2 ✔)
- training 명령이 CHAMPIONS에 없는 ID를 거부. (완료 조건 3 ✔)
- planNotice·XP가 사용자 선택 목표와 일치. 특훈 피로(+4) 유지. engine 테스트 커맨드 수 baseline 동일 = 회귀 없음. (완료 조건 4 ✔)
- 상수 MASTERY_POOL=8 신설(게임·UI 공유). champTrainOptions는 풀이 가득 차면 미등록 챔피언을 숨김.
검증: tests/management.test.mjs(케이스 4종 추가) PASS, tests/engine.test.mjs PASS. tsc/build는 node_modules 미설치로 미실행.
후속(선택): 풀이 가득 찰 때 자동 교체 확인 다이얼로그 UI — 별도 UI 작업으로 미룸.

## ABIL-01 — 선수 능력치의 경기 영향 개선
근거: `docs/claude/PROTOCOL-Ability-Review.md` (5단계 계획). 재현 스크립트 `tests/balance-review.mjs`, 회귀 `tests/ability.test.mjs`.

### 완료 (2026-09-10, D007) — Phase 1: 초반 연결
- `simulateSet`에 결정적 개인 자원 모델 추가: 라인 이벤트 격차 → 슬롯별 `lead[]`, 시야 우위 → 자원 보호, 자원 → CAR 전환계수·포화곡선 → 오브젝트/한타 유효 전력 `resPow`. 누적 우위 계수 0.35→0.32.
- 승부 난수 스트림 호출 순서·횟수 불변. `SetResult.leadA`, `GameEvent.leadA/resPowA` 선택 필드.
- 통제 실험(6000시드, 전=베이스라인 재현 / 후): TOP LNE+20 51.12→53.38, SUP VIS+20 50.90→51.88, 균형 50.62→50.93, 팀 전체+10 74.55→78.60.
- 검증: management/engine/ability 테스트 PASS.

### 남은 작업
- Phase 3 — 전투·승리 조건: 중간 이벤트 스노볼로 자원 지속 성장, 실제 참여자(2대1 갱·바텀 교전·5대5) 중심 판정, 처치/생존·이미 죽은 대상 재처치 금지, 구조물·공격 기회로 종료(마지막 동전던지기 대신 최대 시간 결전 + 누적 상태 반영). 시야의 한타 기여 보강.
- Phase 4 — 표시: 같은 구조화 이벤트로 중계·골드 그래프·POG·리캡 생성(현재 골드는 여전히 flavor 표시용). `leadA`/`resPowA`를 리캡의 선수별 자원차로 노출. CAST-01·DRAFT-01과 조율.
- Phase 5 — 밸런스: 팀 전체+10이 74.55→78.60로 상승한 부분 재튜닝. 각 역할·주요 스탯 +20, 숙련/메타, 휴식/피로, 역전 상황 분리 재측정. `RES_*` 상수(`lib/game.ts` `simulateSet` 위) 조정.
- 회귀 조건: 같은 시드/상태 동일 결과, 입력 세이브 불변, 중복 명령 이중 보상 없음, 실제 출전 픽만 중계, 첫 킬·POG·종료 일치, 모든 경기 유한 종료, 국내/국제대회·다음 시즌 보존, 골드 부족을 이유로 좋은 선수 스탯 영구 하향 금지.

## MATCH-SYS — 통합 경기 시스템 (ABIL-01 + COMP-01 + CAST-01)
중심 원칙: 경기 엔진이 사건을 계산하고, 중계·골드 그래프·POG·리캡·조합 예측이 그 결과를 사용한다.
표시용으로 킬·골드·활약을 별도 추첨하지 않는다. 표시용 계산값을 다시 전력에 이중 반영하지 않는다.
현재 스켈레톤(`simulateSet`의 9구간 승패 롤)은 보존하고, 구간 "안에서" 참여자 기반 계산을 채운다.

### 단위 1 — 참여자 기반 전투 골격 + 탑/미드 2대1 갱킹 · 완료 (2026-09-10, D010)
- `lib/simulation/combat.ts`: `newMatchState`(10인 상태), `resolveGank`(탑=0·미드=1). 전용 `combat` 난수.
- 능력→행동(TF 합류·VIS 발각·MEC/LNE 처치·CAR 마무리 골드), 결과 4종(킬/탈출/무산/라인), 사망·처치·어시스트·첫 킬 규칙.
- `simulateSet`이 라인 0·1의 `dom` 자원 산출을 `resolveGank` 자원 델타로 대체. `GameEvent.combat?`. 중계가 실제 참여자·피해자로 서술.
- 검증: `tests/combat.test.mjs` PASS. 통제 실험 밸런스 ±0.5%p 이내(회귀 없음). tsc·build exit 0.

### 단위 2 — 바텀 2v2(+정글) 교전 · 완료 (2026-09-10, D011)
- `resolveBotLane` 신설. ADC·SUP 중심, 정글 합류 시 3인. 결과 5종(ADC 처치 / SUP 보호 성공 / SUP 희생 / 발각·후퇴 / 순수 라인).
- `simulateSet` `i===2`가 `dom` 대신 `resolveBotLane` 자원 사용. `RES_LANE_LEAD`·`RES_BOT`·`RES_JGL_CARRY` 폐지 — 정글 자원 단일 소스(combat).
- `CombatEvent.followUp`로 "앞선 합류에 이어" 콜백 정밀화. spotted 자원 부호를 phase winner와 일치.
- 검증: SUP VIS만 +20 = 51.95→52.85(원래 50.90 대비 +1.95%p). balance ±0.4%p, `팀 전체+10` 79.33(누적 +0.7%p 관찰). combat 바텀 케이스·전체 스위트·tsc·build PASS.

### 단위 3 — 오브전 실제 합류자 · 완료 (2026-09-10, D012)
- `resolveObjective`(전령·드래곤). 참여자 = 생존 + 도착 확률(라인 상태·TF), 불참 이유 기록. 결과 5종(무교전 확보/교전 후 확보/미확보-철수/역확보/취소). 미확보는 `pendingObjective`로 남겨 다음 사건이 참조, 중복 지급 없음.
- **wa 재정의**: 라인·한타는 확정 승자, 오브전은 '유리한 시작'. 확보 팀은 참여자 결과로 결정하고 momentum·보상은 확보 팀 한 곳에서만. 미확보면 momentum 이동 없음.
- 자원 단일 경로: 처치+어시스트+오브 팀보상(확보 팀 5칸)+확보 정글 보너스. `access`·`resPow`는 확률/전력 채널로 분리.
- 검증: JGL OBJ +20 → 확보율 +10.6%p·오브당 자원 +138·세트 +3.74%p(다른 단일 스탯보다 큼). 통제 균형 50.61%·확보율 A≈B(편향 없음). balance-review 균형 51.18(테스트 페어 고유 비대칭이 드러난 것, powers() 불변). combat 오브 섹션·전체 스위트·tsc·build PASS.

### 단위 4 — 참여자 기반 5v5 한타 · 완료 (2026-09-10, D014)
- `resolveTeamfight(st, seq, edgeA, margin, clock, crng)`: `reviveByClock` 후 생존자만 참가, 죽은 인원 `notJoined`. **edgeA/margin = '교전 전 유리함'**, `favWins=clamp01(0.5+margin*0.75+numAdvFav)` — `numAdvFav`는 실제 생존 인원차(p에 없던 새 채널). 능력치는 '누가 죽고 누가 살리나'만: 캐리 우선 표적, SUP peel(한타당 1회, TF+VIS) → `contrib.protect`, 어시스트 TF 가중 무작위. **승패 = 실제 처치 수**(역전 가능), TRADE/NO_ENGAGE/NO_SHOW/ONE_SIDED는 `winner=null`/상대 → 사전 edgeA로 이기지 않음.
- `simulateSet` `i>=5`: `resolveTeamfight` 호출, `lead[s]+=ce.resource[s]`, **pressure는 `fight.winner`에서만**. 승자 없으면 `advantage`·momentum·표시 골드 이동 없음. `edge`(전술적 우위)는 결과와 분리 기록. 9구간·`pressure===3`/`i===8` 종료는 단위 5까지 유지. `p`(확률) 불변.
- 자원·기여 단일 소스(combat). `fight.contrib{kill,engage,protect,damage,survived}` = 단위 6 POG 근거. `damage`는 "가상 점수" 주석(실제 피해량 시스템 없음).
- 중계: `c.combat.kind==='teamfight'` 경로 — 진입·보호·FB·반전·연계·결과를 실제 처치/생존/불참으로. 밀도·문구는 결과 난수 불변.
- 검증: `tests/combat.test.mjs` 섹션 9(구성 상태 고정 — NO_SHOW/ONE_SIDED/3v5 열세/보호→생존/FB 1회/결정성). `tests/teamfight-review.mjs`(신규, 8000시드): SUP VIS↑ 딜러 생존 +7%p·보호 성공 +13%p, ADC CAR↑ 한타 승 +2%p, JGL OBJ↑ 확보 +10%p. 균형 50.06%(편향 없음). 전체 스위트·tsc·build PASS.
- **`RES_VIS_PROTECT`(i=2 팀 맵 시야) 이관 안 함** — 단위 5 전체 밸런스 패스로 미룸(HANDOFF 참조).

### 단위 5 — 스노볼 + 구조물 기반 종료 · 완료 (2026-09-10, D015)
- **실제 경기 시계 `MatchState.clock`**. `resolveTeamfight` 교전당 +14초 + 계단식 부활(처치 순서로 respawnAt 지연). 연출 재생 시각과 분리.
- **`resolveSiege(st, seq, clock, crng)`**: 공격 자격(생존 인원차 + 부활 창) → 추상 지역 이동 시간(`Region` + `REGION_DIST`) → 여력(인원차·시간·자원차 D007 ±0.85·OBJ·생존 원딜 CAR·운영 주도권 `lanePush`) → 구조물 진행(라인별 0~3, 억제기 1개 열려야 베이스, 넥서스 = 넥서스포탑 0 + 여력 + 수비 ≤3). 창 없으면 NO_WINDOW, 여력 0 HELD, 구조물 열세면 견제만. 구조물 골드는 resource로 1회.
- **`simulateSet`**: 9구간 유지 + 한타 뒤 `resolveSiege`. 넥서스면 `endReason='NEXUS'` 즉시 종료. 아니면 연장 루프(한타+공성)를 `nexus || clock≥3600 || 사건≥30`까지. **9번째 사건이라는 이유로 승자 안 정함.** 상한 = `endReason='CAP'`, `phase:'종료'` 사건 + 명시 판정(구조물 피해 > pressure > advantage > 전용 동전, edgeA·마지막 방향 안 씀). `pressure`는 tiebreak 입력일 뿐.
- 중계: 공성 = 실제 철거만(피해만 입은 구조물을 파괴라고 안 함). 한타 넥서스 주장 삭제. CAP는 "판정승(정상 종료와 구분)". 미니맵: 공성 사건 이동 + `beat.struct` + 사이드 패널 텍스트 상태(구조물 아이콘 미구현의 명시적 대체).
- 검증: N=8000 통제 — 정상(NEXUS) 96.2% / 상한(CAP) 3.8%, 사건/세트 16.8. 오브 확보→구조물 진행 90.5%. 첫 구조물 선취 팀 승률 68%. 공성 시 ADC 생존이면 철거 1.76 vs 사망 0.18. 강화 효과(페어 95% CI) 전부 0 배제 — 단위 4의 압축이 풀림. `combat.test` 섹션 10 / `replay.test` 섹션 8. 전체 스위트·tsc·build PASS. **전역 계수를 목표 승률에 맞추지 않음.** 브라우저 육안 미확인.

### 단위 6 — 표시 데이터 통합 (ABIL-01 Phase 4 + 중계 후속) ← 다음
**정확한 첫 작업**: POG를 실제 개인 기여로 계산한다(현재는 `simulateSet` 말미의 역할별 고정 가중치 `contrib[]` 근사).
1. `SetResult`에 세트 전체 개인 기여 집계를 추가: 각 사건의 `combat.fight.contrib`(kill/engage/protect/damage/survived) + `combat.siege`의 공성 참여 + 오브 확보 참여 + 갱킹 킬/어시를 슬롯별로 합산. 이미 사건 데이터에 다 있으므로 **재추첨·재계산 없이 합**.
2. POG = 그 집계의 최댓값 슬롯(승리 팀). 동점은 kill 관여 → protect 성공 → 생존/후속 행동 순. 역할별 고정 점수만으로 뽑지 않는다. 선정 이유 문자열을 실제 사건(예: "3번 한타 보호 2회 + 넥서스 공성 참여")과 연결.
3. `damage`는 "가상 점수" — POG 설명에 '실제 피해량 X'으로 쓰지 않는다(체력·피해 시스템 없음, 단위 6 범위 밖으로 명시).
4. 골드 그래프: `SetResult.leadA` + 사건별 `e.goldA/goldB`(이미 저장) 사용. 중계와 다른 골드 별도 생성 금지. 재생 스포일러 방지 유지(replay `stateAt` 이미 처리).
5. 리캡: `recap[]`를 실제 기여 선수·근거 사건·흐름 바꾼 장면(반전 beat·첫 구조물·넥서스)으로. "이 선수 덕분에 +8%" 같은 미계산 설명 금지.
6. 검증: 같은 사건 → 같은 POG(결정성), POG 이유가 실제 사건과 일치, 역할 편향 없음(통제 실험에서 슬롯별 POG 분포), 골드 그래프가 중계 골드와 동일.

### 단위 6 참고 — 원래 목록 (ABIL-01 Phase 4 + 중계 후속)
- 골드 그래프: 저장된 개인 자원 변화/스냅샷 사용. 중계와 다른 골드 별도 생성 금지. 미공개 미래 사건 노출 금지.
- POG: 실제 피해·보호·시야·목표·결정적 사건 기여로 계산. 역할별 고정 점수만으로 선정하지 않음. 선정 이유를 실제 사건과 연결.
- 리캡: 준비한 계획 / 수행·실패 / 기여 선수·근거 사건 / 흐름 바꾼 장면 / 다음 세트 제안. "이 선수 덕분에 +8%" 같은 미계산 설명 금지.
- 훈련 이력 콜백: 실제 훈련 대상·시점·성과 기록이 있을 때만, 관련 행동이 나왔을 때, 반복 방지 조건.
- 여섯 흐름(갱킹/재갱킹/오브 대치/끊어먹기/딜러 보호/기지 공략) 준비·성공·실패·해설 문구, 상황 차이로 선택.

### 완료 조건(공통)
동일 시드·상태 동일 결과 / 중계 밀도·배속·문구가 승패 불변 / 처치·골드·POG·리캡이 같은 사건과 일치 / 사망·부활 모순 없음 / 모든 경기 유한 종료 / 커리어·국내·국제·다음 시즌 유지 / 저장 재개·중복 요청 이중 보상 없음 / 과거 완료 경기 재계산 안 함 / 미실행 테스트를 통과로 기록 안 함.

### 밸런스 검증(의미 있는 엔진 변경마다 좁게, 마지막에 전체)
같은 시드·통제 조건 비교: 양 팀 동일 / 역할별 1인 전체 +20 / LNE·MEC·VIS·OBJ·TF·CAR 개별 +20 / 숙련 차 / 조합 차·역할 스왑 / 피로·호흡·전술 차.
승률뿐 아니라 중간 결과(개인 자원차·피습/탈출/생존·교전 기여·목표 확보·구조물 공략)도 비교. 목표값은 초기 가설과 검증 결과를 구분해 기록.

## MINIMAP-01 — 이동형 미니맵 중계
원칙: 엔진 사건 데이터가 유일한 사실 근거. 중계 문장 파싱 금지. 승패·합류·처치·보상 재계산 금지. 실제 참가자만 표시. 미구현 상태(체력·스킬·와드) 생성 금지. 기본 관전자(양 팀) 시점.

### 1단계 — 지도·경로 골격 + 바텀 갱킹 연결 · 완료 (2026-09-10, D013)
- `lib/simulation/replay.ts`(순수): `MAP`(0~100 좌표, y↓, A 좌하/B 우상, 노드+통로 edges), `pathBetween`(Dijkstra), `buildReplay(set)→ReplayData`(windows/tracks/beats/goldKeys), `stateAt`, `posAt`.
- `app/replay-theater.tsx`: SVG 미니맵 + 단일 재생 시계(ref+rAF, 위치는 DOM 직접 갱신) + 컨트롤(재생/정지·1×2×·다음사건·시크·처음부터) + 탭 비활성 자동 일시정지 + 점수/골드/시각/중계 한 줄/킬 피드(불참 사유 포함).
- `app/manager.tsx` RECAP 배선: `onProgress`로 텍스트 로그 공개를 미니맵 시계와 동기화. 기존 `setTimeout` 공개·`speed`·`결과 보기` 제거(스포일러 방지).
- 검증: `tests/replay.test.mjs` PASS. 실제 RECAP 화면 육안 확인(이동·스컬·점수/골드 진행·피드·컨트롤).

### MINIMAP-02 — 지속형 에이전트 재작성 · 완료 (2026-09-10, D016)
- `lib/simulation/replay.ts` 내부 완전 교체: `WALK` 보행 그래프(55노드) + `route`(Dijkstra) + `distToCorridor`. 10명 지속 에이전트 시뮬(고정 `DT=2.5`초 간격, 노드 경로 이동, 행동/경로 변경마다 키프레임). 재생 시각 `t = clock/SCALE`(균일 18배) — 프레임률·배속이 판단에 영향 없음, 속도 폭증 없음.
- 역할별 지속 행동: 라이너 farm zone 드리프트·왕복, 정글 캠프 순찰+오브/갱킹 접근, 서포터 원딜 zone 추종(좌표 복제 아님)+로밍, 큰 교전 전 드리프트, 정글 위험 시 반전 후퇴. 사건 발생 전 접근 계획→실제 경로 이동, **순간이동 없음**(근처면 그 자리, 조금 멀면 계속 이동해 도착 시 교전, 많이 멀면 diag). 처치·승패는 엔진 데이터 그대로.
- 위치 난수 = `mulberry32(hashStr(setSignature))` (SetResult 내용에서만), outcome/narration과 분리. `buildReplay` 순수·결정적.
- `app/replay-theater.tsx`: 디버그 토글(통로·경로·행동 라벨·diag), `scatter` 표시 보정, `gameClock`, 1×/2×/4×. `ReplayData`에 `nav`·`diag`·`scale`, `TrackKey.act/reason`, `stateAt.gameClock`, `agentsAt`.
- 검증: `replay.test` section 3 재작성·section 9 신설. 8시드: 정지 트랙 0/10, 벽 침범 0, 결정성 100%. **브라우저 육안 확인함**(RECAP 재생, 시점별 아이콘 분산·이동·경로·행동 라벨·동기·t=0 정지·컨트롤, 콘솔 오류 없음).

### 남은 작업
- **접근 도착 시각 ↔ 합류 판정 통합**: 현재는 엔진 `combat.participants`가 authoritative(결과 불변). 실제 이동 도착 시각을 합류 판정에 연결하는 단계 — 기존 능력치 기반 판단과 독립 확률 이중 적용 없이. 결과가 바뀌는 부분을 명시 기록.
- 한타/오브/공성 사건의 진입·보호·후퇴·철수 애니메이션 타이밍을 갱킹 수준으로 다듬기, `notJoined`(리스폰 대기) 별도 연출.
- 구조물 아이콘 SVG 렌더(현재 사이드 패널 텍스트만).
- diag의 "합류 이동"/"이동시간 부족" 항목 줄이기(초반 far-lane 정글 갱킹, 후반 한타 lead 튜닝).
- 모바일 지도 비율·아이콘 클릭→선수 상세 육안 확인.

## COMP-01 — 조합 승률·메타·AI 밴픽 확장
근거: `docs/claude/PROTOCOL-Composition-Meta-Design.md`(6단계). `PROTOCOL-Ability-Review.md`(ABIL-01)와 함께 진행. 회귀: `tests/composition.test.mjs`, 민감도는 `tests/balance-review.mjs`(조합 무관 = 불변이어야) + 임시 comp 측정 스크립트.

### 완료 (2026-09-10, D008) — 단계 2 첫 슬라이스: 조합 프로필 → 구간 효과
- 신규 순수 모듈 `lib/balance/composition.ts`: `champProfile`(태그+타입+역할 → 8특성 설계값), `draftEffects`(완성도·아군 궁합·상대 매치업 → `{lane,obj,fight}` A 관점 차이, ±3, 완전 대칭).
- `powers()`의 즉석 `composition` 배열 제거. `simulateSet`이 세트당 1회 `draftEffects` 호출해 라인/오브젝트/한타 확률식에 각 1회 가산 = 단일 경로. 승부 난수 미소비.
- `isMeta(+2)`는 이 계층에서 미참조(중복 증폭 없음). isMeta+2 자체 제거는 단계 5.
- `SetResult.draftFx`, `GameEvent.compA` 선택 필드.
- 검증: 태그 매칭 페어는 `draftEffects≈0` → balance-review 수치 완전 불변(능력치 채널 회귀 없음). 조합 민감도 8000시드: 앞라인/이니시 vs 포크/물몸 = 58.1%(반대 42.8%), 균형 vs 균형 50.3%, 앞라인 조합은 한타 55.4%/라인 49.6%. management/engine/ability/composition 테스트 PASS.

### 남은 작업
- 단계 3 — 예상·추천 UI: 같은 평가로 "관측 승률 / 조합 기준 예상 / 우리 팀 예상" 3분리. 미완성 드래프트·표본 부족 표현. 밴픽 카드에 다중 추천(우리 선수 편한 픽 / 조합 완성 픽 / 상대 저격 픽), 조합 분석 패널. `draftFx`/`compA`를 근거로 노출. DRAFT-01과 조율.
- 단계 4 — AI 밴픽: `aiPick`을 공통 평가(조합+선수)로. 밴은 "상대 선택지를 얼마나 줄이는지"(다음 대안까지). flex/스왑 고려. 후보 축소 후 상위만 얕은 비교·캐시. 예측 시드와 실제 결과 시드 분리, 미래 사용자 픽 미열람.
- 단계 5 — 메타·패치: 주간 흐름(패치→탐색→결과 축적→대응→숙련 투자→새 해법). `patchId`는 게임 날짜로 고정, 세트 중 불변. 스냅샷+엔진 버전 보관. **isMeta(+2) 제거**(측정+버전 게이트). 통계 화면에 주류/밴 우선/숨은 선택지/표본 부족.
- 단계 6 — 외부 데이터 보정: 합법 확보 스냅샷(`source/patchId/queue/region/rankBand/role/sampleSize/wins/collectedAt`), 완화 승률 `(wins+k·기준)/(n+k)`, 페어/매치업은 잔차로 분리, 미래 패치 홀드아웃 검증. 외부 연동 없으면 게임 내 시뮬레이션으로 표시하고 실제 랭크 데이터라 하지 않음.
- 권장 신규 모듈: `lib/balance/types.ts`, `lib/balance/predict.ts`, `lib/balance/ai.ts`, `lib/simulation/events.ts`, `data/balance/<patchId>.json`.
- 회귀 조건: 팀 A/B 교환 시 예상 확률 대칭, 동등 조건 장기 평균 중립, 메타 배지 on/off가 경기 계산 불변(→ isMeta+2 제거 후 성립), 표본0/새챔피언/희소페어에서 예측 폭주 없음, 패치 전후 저장 재개·과거 결과 유지, AI·사용자 동일 합법성/평가, 예측 보정도 검사(단일 경기 오적중은 오류 아님), 게임 통계를 다음 버프 직접 입력으로 쓰지 않음.

## CAST-01 — 사용자가 요청했던 경기 해설 고도화
사용자 피드백 4항목: (1) 교전 전 준비·긴장을 차례로 보여주기, (2) 앞 사건을 기억, (3) 순간마다 다른 강도·읽기 밀도, (4) 감독 결정이 확인될 때만 드러내기. 근거 사건은 실제 게임 상태와 연결.

### 완료 (2026-09-10, D009) — 1차: 상태 기반 구조화 중계
- 신규 순수 모듈 `lib/simulation/narration.ts`: `narrateEvent(ctx, mem, rng)` — 사건별 컨텍스트(해결된 이름·자원·조합·전술) + 전용 `narr` 난수(승부/골드와 분리)로 `{detail, beats[], tier, kills}` 생성.
- `NarrMemory`가 9사건 루프를 관통: 게임 시각(초, 단조), 라인별/팀 킬, 첫 킬(시각·라인), 정글 개입 라인, 오브젝트 수. 결정적 결과가 다음 문구를 바꾼다.
- beats: 준비 → 합류 → (시야) → 교전 → 결과 → (해설). tier: quiet/build/clash/decisive/close로 강도 차등(조용한 라인=1줄, 첫 킬·반전=확대+해설).
- 콜백: 재갱킹("앞선 갱킹에 이어…"), 성장한 바텀 캐리, 가장 잘 큰 캐리가 끊기는 반전, 마무리 "돌아보기"가 실제 첫 킬 시각 인용.
- 감독 레버(`managerLever`): 사용자 팀이 이 경기에 있고 `de.fight`·전술·advantage가 상태로 확인될 때만. 불참 경기엔 미출력.
- 킬 수는 지어내지 않음: 문구의 "누적 X:Y"가 `e.kills` 누적과 정확히 일치(테스트로 강제).
- `lib/game.ts`: 기존 `narrate()` 제거, `simulateSet`이 `narrateEvent` 호출. outcome/flavor 난수 스트림 불변(deep-equal 유지). 조사 헬퍼는 narration.ts로 이동. `GameEvent.beats?/tier?/kills?` 선택 필드.
- `app/manager.tsx`: RECAP 이벤트 로그에 밀도 토글(요약/상세/결정적, localStorage 저장). 상세=beats 표시, 결정적=decisive/close만 확대. 배속(1×/4×)·결과 보기 유지. `app/globals.css`에 `.event-beats`/`.beat` 규칙.
- 검증: 신규 `tests/narration.test.mjs` PASS(결정성·필드·단조 시각·기억 콜백·킬 정합·강도 다양성·근거 있는 레버). management/engine/ability/composition PASS. tsc·build exit 0.

### 남은 작업
- 참여자 기반 상세 전투(ABIL-01 Phase 3와 공유): 2대1 갱·바텀 교전·5대5의 실제 합류자·처치/생존, 점멸·현상금 상태(도입 시 계산·저장). 이미 죽은 대상 재처치 금지.
- 조합 콜백 확장: "이번 주 연습한 보호 조합", 특훈 목표 이행 여부 등 훈련 이력 연결(현재는 `de`/전술만).
- 리캡 카드: 승리 계획 이행 여부, 어떤 선수의 성장/시야/보호가 그것을 가능케 했는지, 다음 세트 밴/전술/선수 조정 제안(DRAFT-01·COMP-01 단계 3과 조율).
- 여섯 흐름(갱킹/재갱킹/오브젝트 대치/끊어먹기/딜러 보호/기지 공략) 문구 다양성 확대.

## SAVE-01
현재 사용자 v3의 mastery 배열을 보존한다. 구버전 champion 참조/완료 경기/미완료 밴픽·슬롯 백업을 재현해 변환 전후 불변 조건을 검사한다. 버전3이라는 이유로 다른 데이터 형식을 신뢰하지 않는다. 새 스키마 도입 시 명시적 버전과 변환 경로를 정의한다. DB 삭제를 해결책으로 삼지 않는다.

## DRAFT-01
현재 카드의 팀 최대 숙련 표기는 유지하더라도 ‘예상’임을 알리고, 최종 배정 선수 기준 숙련×2/메타2/오프롤−6/최종 주요 능력을 보여준다. 스왑 후 즉시 계산하고 서버 경기 결과와 같은 함수로 검증한다. 밴 화면은 상대 숙련 관점이 유용하다.

## DOC-01 / UI-01 / DATA-01
기존 기획서에 구현된 사항과 미래 목표를 구분한다. 모바일390px에서 검색/확정/스왑/중계를 직접 확인한다. 현실 선수 데이터는 공식 근거·기준 날짜를 확보한 뒤 변경하고 게임 평가값과 현실 통계를 구분한다. 최신이라는 단어를 출처 없이 붙이지 않는다.
