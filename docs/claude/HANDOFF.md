# 다음 세션 인수인계

갱신: 2026-09-10 / **MATCH-SYS 단위 4 완료** (참여자 기반 5v5 한타, D014) · MINIMAP-01 1단계 완료 · 다음 = MATCH-SYS 단위 5(스노볼 + 구조물 종료)

## 현재 목표
ABIL-01·COMP-01·CAST-01을 **하나의 경기 시스템**으로 완성한다. 중심 원칙: 엔진이 사건을 계산하고 중계·골드 그래프·POG·리캡·조합 예측이 그 결과만 사용한다. 표시용 별도 추첨 금지, 표시값 전력 이중 반영 금지.
진행 방식: 스켈레톤(`simulateSet` 9구간 승패 롤)은 보존하고 구간 "안"을 참여자 기반으로 채운다. `docs/claude/BACKLOG.md`의 **"MATCH-SYS" 절**에 단위 1~6 순서와 완료 조건이 있다.

## 진행 상태
**MATCH-SYS**(참여자 기반 경기 엔진)
- ✅ 단위 1: 전투 골격 + 탑/미드 2대1 갱킹 (D010)
- ✅ 단위 2: 바텀 2v2(+정글) 교전 (D011)
- ✅ 단위 3: 오브전 실제 합류자 + wa 재정의 (D012)
- ✅ 단위 4: 참여자 기반 5v5 한타 (D014) — `resolveTeamfight`, edgeA=교전 전 유리함, 승패=실제 처치, pressure=`fight.winner`
- ⬜ 단위 5: 스노볼 + 구조물 기반 종료 ← **다음** · 단위 6: 표시 데이터 통합(POG·골드 그래프·리캡)

**MINIMAP-01**(이동형 미니맵 중계)
- ✅ 1단계: 지도·경로 골격 + 바텀 갱킹 연결 (D013) — `lib/simulation/replay.ts` + `app/replay-theater.tsx`. 단위 4로 한타 개별 처치 beat가 combat 경로로 자동 표시.
- ⬜ 2단계: 탑·미드 갱킹(0·1) + 오브전(3·4) + 한타 접근/보호 애니메이션 타이밍 다듬기, `notJoined` 연출

**기타**: COMP-01 단계 3(조합 예측 UI)/4(AI 밴픽), 전체 밸런스 민감도 검사

## 기준 파일 / 보존
사용자 작업본. 140챔피언, mastery 배열(Lv0~4), DraftState, startDraft/draftPick/draftSwap, flex·스왑, 장기 커리어·저장 유지. 이번 변경들로 저장 형식 불변(새 필드 전부 선택, 구세이브는 폴백).

## 게임 실행 상태
`npm ci` 완료, 로컬 D1 마이그레이션 적용, `npm run dev` → **http://localhost:5176/** (백그라운드 실행, HMR 반영). Node v22.12.0.

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

## 검증 명령과 결과 (단위 4 시점)
- `node --experimental-strip-types tests/combat.test.mjs` → PASS: 기존(결정성·재처치 금지·중계 바인딩·갱킹·오브전) + **섹션 9(resolveTeamfight 구성 상태 고정)**: 5v5 결과 계약 / 유리 팀 전멸→ONE_SIDED 상대 승 / 양 팀 없음→NO_SHOW / **3v5 열세→한타 승률 <50%** / 핵심 딜러 부재→미참여·재처치 금지 / SUP VIS·TF↑→보호 성공률·딜러 생존율↑ / FB 1회 / 결정성 / TRADE·NO_ENGAGE winner=null.
- `node --experimental-strip-types tests/teamfight-review.mjs [N]` (신규, 기본 8000 페어 시드): 통제 한타 실험. 균형 50.06%(편향 없음), 결판 93.4%, 딜러 생존 65.2%, 보호 성공 32.1%. 강화별(강화−균형): **SUP VIS +20 딜러 생존 +6.96%p·보호 성공 +13.13%p**, SUP TF +20 세트 +3.2%p·딜러 생존 +6.76%p, ADC CAR +20 세트 +3.2%p·한타 승 +1.99%p, JGL OBJ +20 확보 +10.07%p, TOP LNE +20 세트 +0.46%p. 원자료: 한타 30,189·결판 28,209·무승부 1,980·보호 시도 14,055.
- **단위 3 vs 단위 4**(같은 스펙, 단위 3은 VALIDATION 기록값): TOP LNE +2.30→+0.46%p, SUP VIS +2.19→+0.10%p(대신 딜러 생존율로 발현), JGL OBJ +3.74→+0.98%p(확보율 +10.6→+10.1%p 유지), 팀+10 +29.93→+20.80%p. 참여자 기반 한타의 의도된 압축·재분배 — **전역 계수 조정 없음**.
- `tests/ability.test.mjs`·`tests/combat.test.mjs` 일부 크기 임계값 완화(방향·부호 유지, 회귀 0·음수만 차단). 근거는 각 테스트 주석·D014 대안 절.
- `tests/management.test.mjs`·`tests/engine.test.mjs`(1,134 세트)·`tests/ability.test.mjs`·`tests/composition.test.mjs`·`tests/narration.test.mjs`·`tests/replay.test.mjs` → PASS.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` → exit 0. `npm run build` → exit 0.
- 전체 표·중계 예시는 `docs/claude/VALIDATION.md`(2026-09-10 단위 4 절).

## edgeA / margin ↔ 결과의 관계 (단위 3~4)
- **라인(0~2)**: `edgeA=rng()<p` = 확정 승자. combat은 '어떻게'만.
- **오브전(3·4)**: `edgeA` = 유리한 시작. `resolveObjective`가 실제 확보 팀(`secured: 'A'|'B'|null`) 결정. `wa = secured ?? edgeA`. `advantage`는 `secured` 기준(미확보면 이동 없음). `UPSET_SECURE` = 실제 사건 역전.
- **한타(5~8)** (D014): `edgeA`/`margin` = **교전 전 유리함**. `resolveTeamfight`가 `favWins=clamp01(0.5+margin*0.75+numAdvFav)`로 유리 방향을 정하고, **실제 처치 수로 승패 확정**(역전 가능). `wa = fight.winner ?? edgeA`. **pressure는 `fight.winner`에서만**. TRADE/NO_ENGAGE/NO_SHOW/ONE_SIDED는 winner=null 또는 상대 → 사전 edgeA로 안 이김. `edge` 필드에 전술적 우위 분리 기록. `p`(확률) 불변 = 전력 이중 반영 없음. `numAdvFav`(실제 생존 인원차)는 p에 없던 새 채널.

## 아직 실패하거나 미검증인 것
- **구조물·넥서스 종료 없음** — 종료는 여전히 `pressure===3`/`i===8` 마지막 사건 승자. 단위 5.
- **브라우저 육안 확인 안 함**: 한타 미니맵(개별 스컬·처치 피드·`notJoined` 연출), t=0 정지, 탭 비활성 일시정지, 모바일 지도 비율, 아이콘 클릭→선수 상세. `replay.test`(통로·사망 상태·결정성·스포일러) + `tests/teamfight-narration-examples.mjs`로 데이터 정합만 확인.
- **`numAdvFav`는 9구간 스켈레톤에선 거의 항상 0**: `reviveByClock`이 한타 간격(240s) 안에서 전원 부활 → simulateSet 경로에선 3v5 등이 안 나옴. 구성 상태 고정 테스트(combat 9b·9d)에서만 활성. 단위 5의 스노볼·리스폰 지연에서 실전 활용.
- **`RES_VIS_PROTECT`(i=2 팀 맵 시야) 미이관**: 단위 5 전체 밸런스 패스에서 한타 참여자 VIS 이관 검토(이관 시 balance 재측정·DECISIONS).
- **밸런스 재분배**: 한타 스탯(ADC CAR·SUP TF ~+3.2%p)이 라인·오브 스탯(TOP LNE +0.46·JGL OBJ +0.98)보다 커짐. 의도된 결과, 단위 5 전체 밸런스 패스에서 `RES_*`/`OBJ_*`/`TF_*` 검토. **목표 수치 맞춤 전역 조정 안 함.**
- `팀 전체+10` 통제 8000시드 +20.8%p. 단위 5 밸런스 패스 대상.
- `powersA/powersB`는 D008에서 조합 항 제외.

## 다음 첫 행동 — MATCH-SYS 단위 5 (스노볼 + 구조물 기반 종료)
`resolveTeamfight` 결과를 구조물 진행으로 잇는다. BACKLOG "단위 5" 절에 6단계 상세.
1. `MatchState`에 구조물 상태(`towers`/`inhibs`/`nexusOpen` per side), `newMatchState`에서 초기화.
2. 한타 `DECISIVE`/`ONE_SIDED` 직후 승자 생존 인원 ≥ N & 상대 리스폰 대기 → 그 방향 구조물 파괴(`resolveTeamfight` 반환에 `siege` 또는 별도 `resolveSiege`). 무승부·무교전은 진행 없음.
3. **종료 조건 교체**: `pressure===3`/`i===8` → `nexusOpen && 다음 한타 승리` 또는 누적 구조물. 안 끝나면 명시적 강제 종료(구조물 > pressure > 마지막 사건 방향). 무한 경기 방지 테스트.
4. 스노볼: 결과 → 개인 성장(`Combatant` 누적) → 다음 `resolveTeamfight` `eff()`/`numAdvFav`에 소량. **D007 `resPow`와 이중 보상 재점검**(성장이 `p`와 combat 양쪽 안 올리게).
5. `narration.ts`(억제기→넥서스 흐름) + `replay.ts`(구조물 파괴 beat·포탑 아이콘).
6. 검증: 유한 종료 스위트, 역전이 성장 선수 사망·목표 교환에서 나오는지, balance-review + 통제 조건 재측정. HANDOFF/BACKLOG/DECISIONS/SESSION_LOG/VALIDATION 갱신.

## 재현 시드/경로
- combat 샘플: `newGame('nva',7)` → `upgradeGame` → `g.seed=<n>` → `simulateSet(g,{a:'nva',b:'crn',...})`. `r.events[i].combat`. 오브: seed 17 = 전령 CONTESTED→드래곤 pending 참조, seed 88 = 드래곤 UPSET_SECURE+FB, seed 3 = 전령 A확보·드래곤 B확보.
- **한타(단위 4)**: 통제 base(전스탯70) + `structuredClone` + `g.seed=<seed>`. seed 0 #7 = 보호 성공(A-SUP)→A-ADC 생존, seed 6 #5 = edgeA=A인데 winner=B(사전 픽으로 안 이김) + 한타 FB, seed 50 #8 = TRADE winner=null. `resolveTeamfight` 직접 호출: `mkState`(combat.test) + `kill(st,side,slots)` 로 구성 상태(3v5·딜러 부재·전멸).
- 실험 하네스: `node --experimental-strip-types tests/teamfight-review.mjs 8000`. 예시 스크립트: `tests/teamfight-narration-examples.mjs`.
- 결정성: 같은 seed 2회 `JSON.stringify(simulateSet)` 동일.
- 미니맵 재생: `buildReplay(simulateSet(g,m))` → `rd`. `stateAt(rd,t)`·`posAt(rd.tracks[k],t)`. seed 88 = 바텀 처치+한타 다수.

## 작업 경계
라이브 배포 없음. Claude 연결 계정 없음. 세이브 삭제/마이그레이션 수정 없음. package.json/lockfile 변경 없음(`npm ci`만). 과거 완료 경기를 새 엔진으로 재계산하지 않음.

## 다음 갱신 양식
- 현재 목표 / 완료한 행동·파일 / 검증 명령·결과 / 미완·미검증 / 결정·이유 / 다음 첫 행동 / 재현 시드·경로
