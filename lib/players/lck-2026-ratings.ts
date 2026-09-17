// F-REAL-02: 실제 2026 LCK 경기 기록 기반 능력치 보정치 — lib/players/rating-model.ts의
// 파이프라인을 실제 데이터로 처음 채운 결과물.
//
// 출처: Oracle's Elixir 2026 시즌 경기별 CSV(프로 LoL 경기 통계의 표준 공개 출처, 실제 게임
// 클라이언트 기록에서 나온 원자료). `curl`로 직접 다운로드해 검증(2026-09-16, 70,374,309
// bytes, 105,133행, league="LCK" 필터 시 역할당 약 1,004개 표본). 계산 스크립트와 산출 과정은
// docs/claude/PLAYER_RATING_MODEL.md §8 참조 — 이 파일은 그 계산 결과만 담는다(원자료
// 70MB CSV는 저장소에 커밋하지 않음, 재현 절차는 DATA_UPDATE_GUIDE.md에 기록).
//
// 2026-09-17 재계산: lib/rosters.ts를 OP.GG 데이터로 다시 검증하면서 팀·포지션 배정 오류
// 6건이 드러나 계산 스크립트(scratch-compute-ratings.mjs)의 대상 핸들 목록을 갱신하고
// 재실행했다 — 원자료(CSV, 역할별 기준선)는 그대로이므로 대부분의 값은 2026-09-16과 동일하고,
// 잘못 배정됐던 6명(Rich·Andil·Ghost·Pyosik과 신규 추가된 벤치 Pollu·Life)만 새로 계산됐다.
// 자세한 배정 정정 내역은 lib/rosters.ts 헤더와 REAL_ROSTER_AUDIT.md §9 참조.
//
// 이 파일이 담는 건 "보정치"(delta)이지 완성된 능력치가 아니다 — lib/game.ts의 makePlayer()가
// 만드는 기존 팀 전력 기반 합성 스탯 위에 이 델타를 더한다(대체가 아니라 가산). 이렇게 한 이유:
// 1) 팀 간 기존 전력 격차(TEAM_META.base)를 실제 데이터가 지워버리지 않게 하기 위해 — 실제
//    데이터로 "선수 개인 차이"만 반영하고, "어느 팀이 강한가"는 기존 설계(현실 순위 참고)를 그대로 둔다.
// 2) 표본이 아예 없는 벤치·2군·국제팀 선수는 100% 기존 합성 스탯으로 자연스럽게 폴백된다
//    (이 파일에 없는 handle은 그냥 델타가 0인 것과 같다 — 조건문이 아니라 조회 실패로 처리).
//
// 축 매핑과 그 이유(PLAYER_RATING_MODEL.md §3 그대로): LNE(라인전)=골드차@10분, TF(한타 관여)=
// 킬 관여율(팀 킬 대비 (킬+어시스트)), VIS(시야)=분당 시야점수, CAR(캐리)=팀 대비 딜 비중.
// 전부 "같은 포지션 내에서만" 비교했다(§6 "정글·서포터 딜량을 원딜 기준으로 평가하지 마") — 포지션별
// 평균·표준편차를 따로 구해 그 포지션 안에서의 z-score만 썼다. OBJ(오브젝트)·MEC(메커닉)는 이
// CSV에 대응하는 개인 단위 지표가 없어(팀 단위 드래곤/바론 수만 있고 "누가 그 오브젝트 싸움에
// 참여했는가"는 없음) 의도적으로 안 건드렸다 — 대리 지표로 채우지 않는다는 원칙(§6) 그대로.
//
// 표본 수축(shrinkage): z-score에 min(1, games/40)을 곱해 표본이 적을수록 0에 가깝게 당긴다
// (§7 "소수 경기의 좋은 성적만으로 최고 능력치를 받지 않게"). 대부분 60~120경기라 거의 shrink=1
// (신뢰도 'high')이지만, 이번 시즌 갓 데뷔/이적한 선수(Frog 19경기, Sharvel 21경기, Minous
// 1경기)는 'medium'/'low'로 자동으로 낮아진다 — 감으로 등급을 매기지 않았다.
//
// 델타 범위: z-score를 ±2.5로 clamp한 뒤 4를 곱해 최대 ±10점, 실제 관측된 최대값은 ±3.2점
// (Chovy VIS +3.2, Jiwoo VIS -2.5) — 기존 엔진의 역할별 편향(shapes[r], 최대 폭 약 -8~+12)이나
// 노이즈(±3)와 같은 자릿수라 "지배적 레버"가 되지 않는다(F12/F18/F21과 같은 원칙, 실측 후
// tests/lck-2026-ratings.test.mjs로 실제 게임 결과에서 재확인).

export type StatDelta = {LNE?:number; TF?:number; VIS?:number; CAR?:number};
export type LckRatingEntry = {delta:StatDelta; games:number; confidence:'low'|'medium'|'high'; team:string; role:string};

export const LCK_2026_SOURCE = "Oracle's Elixir 2026 season CSV, curl-fetched 2026-09-16 (105,133 rows, league=LCK subset ~1,004 player-games/role); team/role assignments re-verified 2026-09-17 against OP.GG Esports' LCK 2026 Cup player-stats table (see lib/rosters.ts)";

export const LCK_2026_RATINGS: Record<string, LckRatingEntry> = {
 Doran:{team:'nva',role:'TOP',games:109,confidence:'high',delta:{LNE:-0.9,TF:0.1,VIS:-1.2,CAR:-0.3}},
 Oner:{team:'nva',role:'JGL',games:106,confidence:'high',delta:{LNE:-0.9,TF:-0.7,VIS:-0.1,CAR:0.3}},
 Faker:{team:'nva',role:'MID',games:109,confidence:'high',delta:{LNE:-1.1,TF:-1.5,VIS:1,CAR:-1.1}},
 Peyz:{team:'nva',role:'ADC',games:109,confidence:'high',delta:{LNE:1.4,TF:0.2,VIS:-0.5,CAR:0.8}},
 Keria:{team:'nva',role:'SUP',games:109,confidence:'high',delta:{LNE:0.5,VIS:0.4,CAR:0.6}},
 Kiin:{team:'crn',role:'TOP',games:100,confidence:'high',delta:{LNE:1.1,TF:1.8,VIS:0.5,CAR:-0.1}},
 Canyon:{team:'crn',role:'JGL',games:100,confidence:'high',delta:{LNE:0.1,TF:-0.1,VIS:0.7,CAR:-0.3}},
 Chovy:{team:'crn',role:'MID',games:100,confidence:'high',delta:{LNE:1.2,TF:0.1,VIS:3.2,CAR:1}},
 Ruler:{team:'crn',role:'ADC',games:100,confidence:'high',delta:{LNE:0.5,TF:0.1,VIS:1.8,CAR:-0.2}},
 Duro:{team:'crn',role:'SUP',games:100,confidence:'high',delta:{LNE:0.5,TF:0.7,VIS:1.3,CAR:-0.6}},
 Zeus:{team:'blz',role:'TOP',games:99,confidence:'high',delta:{LNE:1,TF:1,VIS:-1.4}},
 Kanavi:{team:'blz',role:'JGL',games:99,confidence:'high',delta:{LNE:0.9,VIS:0.3,CAR:1.2}},
 Zeka:{team:'blz',role:'MID',games:99,confidence:'high',delta:{LNE:0.8,TF:0.9,VIS:0.4,CAR:0.1}},
 Gumayusi:{team:'blz',role:'ADC',games:99,confidence:'high',delta:{LNE:0.2,TF:0.1,VIS:1.7,CAR:-0.3}},
 Delight:{team:'blz',role:'SUP',games:93,confidence:'high',delta:{LNE:0.9,TF:0.2,VIS:1.3,CAR:-1.6}},
 Siwoo:{team:'pnt',role:'TOP',games:120,confidence:'high',delta:{TF:-1.6,VIS:0.3,CAR:-0.1}},
 Lucid:{team:'pnt',role:'JGL',games:117,confidence:'high',delta:{LNE:0.4,TF:-0.2,VIS:0.5,CAR:0.4}},
 ShowMaker:{team:'pnt',role:'MID',games:120,confidence:'high',delta:{LNE:0.6,TF:-0.5,VIS:0.3}},
 Smash:{team:'pnt',role:'ADC',games:120,confidence:'high',delta:{LNE:0.2,TF:0.1,VIS:0.1,CAR:-0.2}},
 Career:{team:'pnt',role:'SUP',games:120,confidence:'high',delta:{LNE:0.1,TF:0.3,VIS:-0.1,CAR:0.1}},
 PerfecT:{team:'vtx',role:'TOP',games:102,confidence:'high',delta:{LNE:0.6,TF:-0.3,VIS:-0.7,CAR:-0.5}},
 Cuzz:{team:'vtx',role:'JGL',games:102,confidence:'high',delta:{LNE:0.3,VIS:1.2}},
 Bdd:{team:'vtx',role:'MID',games:102,confidence:'high',delta:{LNE:0.4,TF:1.1,VIS:-0.4,CAR:0.4}},
 Aiming:{team:'vtx',role:'ADC',games:80,confidence:'high',delta:{LNE:-0.4,TF:1,VIS:-0.1,CAR:0.5}},
 Ghost:{team:'vtx',role:'SUP',games:11,confidence:'medium',delta:{LNE:-0.6,TF:0.2,VIS:-0.8,CAR:-0.3}},
 Pollu:{team:'vtx',role:'SUP',games:6,confidence:'low',delta:{LNE:-0.8,TF:-0.4,VIS:-0.1,CAR:-0.2}},
 Rich:{team:'orl',role:'TOP',games:77,confidence:'high',delta:{LNE:-1,VIS:2.7,CAR:0.8}},
 Willer:{team:'orl',role:'JGL',games:96,confidence:'high',delta:{LNE:-0.1,TF:-0.2,VIS:0.1,CAR:-0.8}},
 Ucal:{team:'orl',role:'MID',games:96,confidence:'high',delta:{LNE:-0.4,TF:0.3,VIS:-0.7,CAR:-0.1}},
 Jiwoo:{team:'orl',role:'ADC',games:64,confidence:'high',delta:{LNE:-0.4,TF:0.6,VIS:-2.5,CAR:0.8}},
 Andil:{team:'orl',role:'SUP',games:95,confidence:'high',delta:{LNE:-0.9,TF:-0.3,VIS:-2.3,CAR:-0.1}},
 Kingen:{team:'flx',role:'TOP',games:86,confidence:'high',delta:{LNE:-1.5,TF:-0.3,VIS:-1.1,CAR:0.4}},
 Sponge:{team:'flx',role:'JGL',games:86,confidence:'high',delta:{LNE:-0.9,TF:0.1,VIS:-1.4,CAR:-0.3}},
 Scout:{team:'flx',role:'MID',games:86,confidence:'high',delta:{LNE:0.3,TF:0.5,VIS:-1.1,CAR:0.5}},
 Taeyoon:{team:'flx',role:'ADC',games:100,confidence:'high',delta:{LNE:0.7,VIS:3.1,CAR:-0.3}},
 Lehends:{team:'flx',role:'SUP',games:79,confidence:'high',delta:{LNE:0.5,TF:-0.8,VIS:-0.9}},
 DuDu:{team:'wlv',role:'TOP',games:88,confidence:'high',delta:{LNE:0.7,TF:-0.6,VIS:0.2,CAR:1.4}},
 Pyosik:{team:'wlv',role:'JGL',games:68,confidence:'high',delta:{LNE:-0.5,TF:0.2,VIS:0.8,CAR:-1.2}},
 Clozer:{team:'wlv',role:'MID',games:88,confidence:'high',delta:{LNE:-0.5,TF:-0.3,VIS:-2.1,CAR:-0.2}},
 deokdam:{team:'wlv',role:'ADC',games:84,confidence:'high',delta:{LNE:-2.2,TF:-0.3,VIS:-1.4,CAR:-1.1}},
 Peter:{team:'wlv',role:'SUP',games:62,confidence:'high',delta:{LNE:-0.4,TF:1.1,VIS:0.4,CAR:-0.2}},
 Life:{team:'wlv',role:'SUP',games:18,confidence:'medium',delta:{LNE:-0.8,TF:-0.9,VIS:-1.5,CAR:1.2}},
 Clear:{team:'ark',role:'TOP',games:111,confidence:'high',delta:{LNE:-0.5,TF:-0.5,VIS:-0.6,CAR:-0.9}},
 Raptor:{team:'ark',role:'JGL',games:111,confidence:'high',delta:{LNE:0.3,TF:0.8,VIS:-0.7,CAR:0.9}},
 VicLa:{team:'ark',role:'MID',games:101,confidence:'high',delta:{LNE:0.1,TF:-0.3,VIS:-1.4,CAR:0.4}},
 Diable:{team:'ark',role:'ADC',games:95,confidence:'high',delta:{LNE:0.2,TF:-0.4,VIS:-0.1,CAR:-0.4}},
 Kellin:{team:'ark',role:'SUP',games:111,confidence:'high',delta:{LNE:0.2,TF:0.5,VIS:-1,CAR:-0.1}},
 Casting:{team:'rse',role:'TOP',games:93,confidence:'high',delta:{LNE:0.3,TF:0.6,VIS:1.7,CAR:-0.1}},
 GIDEON:{team:'rse',role:'JGL',games:93,confidence:'high',delta:{LNE:0.3,TF:0.2,VIS:-1,CAR:-1.2}},
 Roamer:{team:'rse',role:'MID',games:76,confidence:'high',delta:{LNE:-0.9,TF:0.1,VIS:0.5,CAR:-0.6}},
 Teddy:{team:'rse',role:'ADC',games:93,confidence:'high',delta:{LNE:0.1,TF:-0.5,VIS:-2,CAR:0.7}},
 Namgung:{team:'rse',role:'SUP',games:93,confidence:'high',delta:{LNE:-0.4,TF:-1.7,VIS:0.6,CAR:1.9}},
};

export const lckStatDelta = (handle:string):StatDelta|undefined => LCK_2026_RATINGS[handle]?.delta;
