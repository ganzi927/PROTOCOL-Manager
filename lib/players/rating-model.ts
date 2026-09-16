// F-REAL-01: 실제 경기 기록과 게임용 능력치의 분리 계층.
//
// 이 파일은 "실제 관측 원자료 → 전처리 지표 → 게임용 능력치"를 구조적으로 분리하기 위한 타입과
// 순수 함수만 제공한다. 지금은 어느 실제 선수에 대해서도 검증된 실제 경기 원자료를 갖고 있지
// 않다(docs/claude/REAL_ROSTER_AUDIT.md §0 — 이 환경에서 1차 출처 접근이 막혀 있었다) — 그래서
// 이 파일은 "실제 데이터를 넣으면 이렇게 처리하겠다"는 파이프라인만 정의하고, 실제 값은 아직
// 하나도 채우지 않았다. `makePlayer()`(lib/game.ts)가 만드는 지금의 6축 스탯은 전부
// `confidence:'design-default'`로 취급한다 — 팀 base 전력값에서 유도된 게임 설계값이지 실제
// 경기력을 반영한 값이 아니다.
//
// 엔진 계약: lib/game.ts의 6축 STAT_KEYS(LNE/TF/OBJ/VIS/MEC/CAR) 이름·순서·의미를 그대로 쓴다.
// 이 파일은 새 축을 만들거나 순서를 바꾸지 않는다 — 사용자 지시("기존 능력치 체계를 임의로
// 교체하거나 순서를 바꾸지 마")를 그대로 따른다. "팀플레이"(합류·보호·판단) 같은 기획 문서의
// 후보 축은 이 6축 어디에도 직접 대응하지 않는다 — 대리 지표로 욱여넣지 않고, 그 한계를
// buildGameRating()의 confidence/notes에 명시하는 쪽을 택했다.

import type {Role} from '../game.ts';

export const RATING_MODEL_VERSION = 'v0-unverified';

// 신뢰도. 'design-default' = 실제 관측 없음(현재 makePlayer()의 모든 선수가 여기 해당).
// 'low'/'medium'/'high'는 실제 표본이 있을 때만 쓴다 — 표본이 적으면 자동으로 낮아져야 한다
// (§7 "표본 부족과 추정 처리" 요구사항). 이 파일은 그 등급 부여 로직만 제공하고, 실제로 어떤
// 등급을 줄지는 표본 수가 들어와야 계산된다.
export type RatingConfidence = 'design-default'|'low'|'medium'|'high';

// 1) 원자료 — 실제 경기에서 그대로 관측된 값(가공 없음). 필드가 없으면 그 지표를 관측하지
// 못했다는 뜻이지 0이라는 뜻이 아니다 — 그래서 전부 선택 필드다.
export type RawMatchObservation = {
 matchId:string; date:string; role:Role; minutes:number;
 kills?:number; deaths?:number; assists?:number;
 csAt10?:number; goldAt10?:number; xpAt10?:number; // 초반 라인전 지표(§6 예시)
 damageShare?:number;  // 팀 총 딜량 대비 비중 — 포지션별 기대치가 달라 그대로 비교 금지(§6 "원딜 기준 금지")
 visionScore?:number; wardsPlaced?:number; wardsCleared?:number;
 killParticipation?:number; // 팀 킬 관여율 — "전투 관여"의 대리 지표
 objectiveParticipation?:number; // 오브젝트 주변 참여 — "오브젝트"의 대리 지표
 goldShare?:number; damageAtGoldRatio?: number; // 받은 자원 대비 기여 — "캐리"의 대리 지표
 win:boolean;
 sourceUrl:string; // 이 한 경기 기록을 실제로 열어 읽은 출처. 없으면 이 관측 자체를 만들지 않는다.
};

// 2) 전처리·보정 지표 — 원자료를 팀 전력·상대·경기 시간으로 정규화한 뒤 값. 원자료 1건이 아니라
// 표본 전체를 모아서 계산한다.
export type ProcessedMetric = {
 role:Role; sampleGames:number; periodStart:string; periodEnd:string;
 laneShare:number|null;      // 라인전(§6): csAt10/goldAt10/xpAt10을 역할군 기준선 대비 정규화
 fightShare:number|null;     // 전투 수행: killParticipation·survival을 정규화
 objectiveShare:number|null; // 오브젝트: objectiveParticipation을 역할·경기시간으로 정규화
 visionShare:number|null;    // 시야: visionScore를 역할·경기시간(분당)으로 정규화
 mechanicsShare:number|null; // 메커닉: 이 축에 직접 대응하는 흔한 공개 지표가 없다 — 대리 지표 없이
                              // null로 남기는 쪽을 택함(§6 "대리 지표를 쓰면 그 한계를 기록해").
 carryShare:number|null;     // 캐리: damageShare를 받은 자원(goldShare) 대비로 나눠 "받은 만큼 했는가"로 봄
 confidence:RatingConfidence;
 notes:string[]; // 대리 지표 사용, 표본 부족 등 한계를 사람이 읽을 문장으로 남긴다.
};

// 3) 게임용 능력치 — 최종적으로 lib/game.ts의 STAT_KEYS 순서(LNE,TF,OBJ,VIS,MEC,CAR)에 꽂히는 값.
// "공식 능력치"라고 부르지 않는다(§5) — UI 라벨은 항상 "게임 내 평가"로 노출한다(app/manager.tsx).
export type GameRating = {
 modelVersion:string; confidence:RatingConfidence;
 stats:[number,number,number,number,number,number]; // STAT_KEYS 순서 고정
 baseline:number; // 이 값을 만들 때 기준으로 삼은 역할군 기준선(보수적 보정의 중심값)
 source:'design-default'|'observed';
};

const BASELINE_BY_ROLE:Record<Role,number> = {TOP:65,JGL:65,MID:65,ADC:65,SUP:65};

// 표본이 적을수록 역할 기준선(BASELINE_BY_ROLE) 쪽으로 강하게 당긴다("소수 경기의 좋은 성적만으로
// 최고 능력치를 받지 않게" — §7). games=0이면 전부 기준선, games>=THRESH_FULL이면 관측치를 거의
// 그대로 신뢰한다. 이 임계값은 아직 실제 표본으로 보정한 적이 없다 — 실제 데이터가 들어오면
// docs/claude/PLAYER_RATING_MODEL.md의 절차대로 다시 측정해서 바꿔야 한다(감으로 정하지 말 것,
// 이 세션의 다른 임계값들 — F27 MIN_SAMPLE=6, F21 밴/픽 가중치 — 과 같은 원칙).
const THRESH_FULL_SAMPLE = 40;
export function shrinkTowardBaseline(observed:number, role:Role, sampleGames:number):number{
 const w = Math.min(1, sampleGames/THRESH_FULL_SAMPLE);
 return BASELINE_BY_ROLE[role]*(1-w) + observed*w;
}

export function confidenceForSample(sampleGames:number):RatingConfidence{
 if(sampleGames<=0)return 'design-default';
 if(sampleGames<10)return 'low';
 if(sampleGames<THRESH_FULL_SAMPLE)return 'medium';
 return 'high';
}

// 지금 makePlayer()가 만드는 스탯을 이 계층의 언어로 표현만 한 것 — 실제 계산은 안 바꾼다.
// UI가 "이 선수의 평가 신뢰도"를 일관되게 보여줄 수 있게 항상 이 함수를 거치게 하기 위한 어댑터.
export function designDefaultRating(stats:number[]):GameRating{
 return {modelVersion:RATING_MODEL_VERSION, confidence:'design-default',
  stats:[stats[0]??0,stats[1]??0,stats[2]??0,stats[3]??0,stats[4]??0,stats[5]??0],
  baseline:0, source:'design-default'};
}
