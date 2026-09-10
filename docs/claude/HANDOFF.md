# 다음 세션 인수인계

갱신: 2026-09-10 / **MINIMAP-02 완료** (지속형 에이전트 미니맵, D016) · MATCH-SYS 단위 1~5 완료 · 다음 = MATCH-SYS 단위 6(표시 데이터 통합) 또는 MINIMAP 접근↔합류 통합
Git: `9a15df3`(단위4 체크포인트) → `19e4421`(단위5) → `d7a1473`(scratch 제외) → `595b3ea`(단위5 문서) → MINIMAP-02는 아직 미커밋(이 세션에서 커밋 예정). tag `minimap-pre-persistent` = MINIMAP-02 이전 상태. 배포 없음.

## 현재 목표
ABIL-01·COMP-01·CAST-01을 **하나의 경기 시스템**으로 완성한다. 중심 원칙: 엔진이 사건을 계산하고 중계·골드 그래프·POG·리캡·조합 예측이 그 결과만 사용한다. 표시용 별도 추첨 금지, 표시값 전력 이중 반영 금지.
진행 방식: 스켈레톤(`simulateSet` 9구간 승패 롤)은 보존하고 구간 "안"을 참여자 기반으로 채운다. `docs/claude/BACKLOG.md`의 **"MATCH-SYS" 절**에 단위 1~6 순서와 완료 조건이 있다.

## 진행 상태
**MATCH-SYS**(참여자 기반 경기 엔진)
- ✅ 단위 1: 전투 골격 + 탑/미드 2대1 갱킹 (D010)
- ✅ 단위 2: 바텀 2v2(+정글) 교전 (D011)
- ✅ 단위 3: 오브전 실제 합류자 + wa 재정의 (D012)
- ✅ 단위 4: 참여자 기반 5v5 한타 (D014) — `resolveTeamfight`, edgeA=교전 전 유리함, 승패=실제 처치, pressure=`fight.winner`
- ✅ 단위 5: 스노볼 + 구조물 기반 종료 (D015) — 실제 경기 시계, `resolveSiege`, 넥서스 파괴로만 정상 종료, 상한(CAP) 별도 사유, pressure는 tiebreak
- ⬜ 단위 6: 표시 데이터 통합 ← **다음** — POG를 실제 개인 기여로, 골드 그래프, 리캡을 근거 사건으로

**MINIMAP**(이동형 미니맵 중계)
- ✅ 1단계 (D013): 지도·경로 골격 + 바텀 갱킹.
- ✅ **MINIMAP-02 (D016): 지속형 에이전트 재작성** — `WALK` 55노드 보행 그래프, 10명 독립 시뮬(고정 DT 간격, 노드 경로, 행동 변경마다 키프레임), `t=clock/SCALE` 균일, 위치 난수 분리. 사건 전 접근 계획→실제 경로 이동(순간이동 없음). 디버그 모드(통로·경로·행동·diag). **정지 없음·벽 침범 없음·결정성·라인 독립 활동** — replay.test PASS + 브라우저 육안 확인함.
- ⬜ 2단계: 탑·미드 갱킹(0·1) + 오브전(3·4) + 한타 접근/보호 타이밍 다듬기, `notJoined` 연출, 구조물 아이콘 SVG 렌더

**기타**: COMP-01 단계 3(조합 예측 UI)/4(AI 밴픽), 전체 밸런스 민감도 검사

## 기준 파일 / 보존
사용자 작업본. 140챔피언, mastery 배열(Lv0~4), DraftState, startDraft/draftPick/draftSwap, flex·스왑, 장기 커리어·저장 유지. 이번 변경들로 저장 형식 불변(새 필드 전부 선택, 구세이브는 폴백).

## 게임 실행 상태
`npm ci` 완료, 로컬 D1 마이그레이션 적용, `npm run dev` → **http://localhost:5176/** (백그라운드 실행, HMR 반영). Node v22.12.0.

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
- **브라우저 육안 확인 안 함**: 공성 사건 미니맵(공격자 이동·사이드 패널 구조물 텍스트), 한타 개별 스컬, t=0 정지, 탭 비활성 일시정지, 모바일 지도 비율, 아이콘 클릭. `replay.test`(통로·사망·결정성·스포일러·구조물 스냅샷) + `tests/teamfight-narration-examples.mjs`로 데이터 정합만.
- **구조물 아이콘 SVG 미구현**: 포탑/억제기/넥서스가 지도에 안 그려짐. 사이드 패널 텍스트가 명시적 대체 표시. MINIMAP-01 2단계.
- **스노볼 = 개인 성장(레벨/골드 곡선) 없음**: 자원은 `Combatant.gold`로 누적돼 공성 여력·`resPow`에 반영되지만, "성장한 캐리가 끊겨 역전" 같은 명시적 성장 곡선은 없다. `numAdvFav`(실제 인원차)는 계단식 부활 + 좁은 창으로 이제 **가끔** 활성(사망 불참 슬롯 1.3%). 단위 6/후속에서 개인 레벨 근사 검토.
- **`RES_VIS_PROTECT`(i=2 팀 맵 시야) 여전히 미이관**: 단위 5에서 손대지 않음(D014 결정 유지). 후속 전체 밸런스 패스 대상.
- **태그쌍 균형 48.7%** (a-vs-b 픽쌍, 단위 4 대비 ~−1.4%p 이동): 이 픽쌍 고유의 `powerDelta` 비대칭이 공성 경로로 다르게 가중된 것. **동일 픽 대칭 = 49.75%(편향 없음)**. 강화 비교는 같은 픽쌍 페어라 무영향. 후속 밸런스 패스에서 `powers()` 픽쌍 비대칭 자체를 별도 검토.
- **CAP 판정 동전의 편향**: 동일 픽 CAP 게임에서 A승 ~40%(n≈250). CAP가 "A가 못 끝낸" 게임이라 A가 약간 뒤진 상태로 선택되는 순환. CAP는 3~4%뿐이라 전체 승률 영향 <0.3%p. 후속에서 tiebreak 재검토 가능.
- **작은 강화 효과는 확정 아님**: SUP VIS+20 등은 teamfight-review CI가 0을 배제해도 balance-review(다른 RNG 스트림)에선 부호가 흔들린다. 견고: 큰 효과(ADC CAR·SUP TF·팀+10)와 행동 지표(딜러 생존·보호 성공·오브 확보·첫 구조물).
- `powersA/powersB`는 D008에서 조합 항 제외.
- **MINIMAP-02**: 접근 도착 시각은 아직 합류 판정에 반영 안 됨(`combat.participants`가 authoritative). far-lane 정글 갱킹·후반 한타에서 `diag` "합류 이동/지연" 30~90건(대부분 소폭). 구조물 아이콘 SVG 미구현. 모바일 비율·아이콘 클릭 육안 미확인. 자동화 Chrome이 녹화한 GIF는 이 파일시스템에서 접근 불가.

## 다음 첫 행동 — MATCH-SYS 단위 6 (표시 데이터 통합) 또는 MINIMAP 접근↔합류 통합
### A. MATCH-SYS 단위 6 (BACKLOG "단위 6" 절)
BACKLOG "단위 6" 절에 6단계 상세. 요지: **POG를 실제 개인 기여로 계산**한다.
1. `SetResult`에 슬롯별 세트 기여 집계 추가 = Σ(`combat.fight.contrib`) + 공성 참여(`combat.siege.participants`) + 오브 참여 + 갱킹 킬/어시. **재추첨·재계산 없이 합**(사건 데이터에 이미 있음).
2. POG = 승리 팀 최댓값 슬롯. 동점은 kill 관여 → protect 성공 → 생존. 역할 고정 점수만으로 뽑지 않음. 이유 문자열을 실제 사건과 연결.
3. `contrib.damage`는 "가상 점수" — POG 설명에 '실제 피해량'으로 안 씀(체력 시스템 없음).
4. 골드 그래프: `SetResult.leadA` + `e.goldA/goldB`(저장됨). 중계와 다른 골드 별도 생성 금지.
5. 리캡: 근거 사건(반전 beat·첫 구조물·넥서스)으로. 미계산 % 설명 금지.
6. 검증: 결정성, POG 이유 = 실제 사건, 역할 편향 없음(통제 실험 슬롯별 POG 분포), 골드 그래프 = 중계 골드.

### B. MINIMAP: 접근 도착 ↔ 합류 판정 통합
`lib/simulation/replay.ts`는 이미 사건별 참가자 이동 도착 시각(`eta`)을 계산해 `diag`에 남긴다. 다음 단계는 이 도착 시각을 **합류 판정에 연결**하되, 엔진 능력치 기반 판단(`resolveObjective`의 `arriveP`, `resolveTeamfight`의 `numAdvFav`)과 **독립 확률을 두 번 적용하지 않게** 한다. 결과가 바뀌는 부분(어느 사건이 어느 참가자를 잃는가)을 명시 기록하고 combat.test/teamfight-review로 재측정. 처치·승패 계산은 combat 모듈 유지 — 이동 모듈이 별도 전투 결과를 만들지 않는다.

## 재현 시드/경로
- combat 샘플: `newGame('nva',7)` → `upgradeGame` → `g.seed=<n>` → `simulateSet(g,{a:'nva',b:'crn',...})`. `r.endReason`('NEXUS'|'CAP'), `r.events[i].combat`.
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
