// F18 Phase C — 성장 과제. 선수당 활성 과제 1개. Phase B에서 실제로 엔진에 연결한 행동(정글 합류
// 판단의 발각 여부 / 오브젝트 합류 여부)만 관측한다 — 아직 엔진에 연결 안 된 행동은 과제로 만들지 않는다.
//
// 설계 원칙(사용자 지시):
//  - 관련 상황이 없으면 실패가 아니라 "평가 보류"(관측 미달, active 상태 그대로 유지).
//  - 같은 경기 재조회·배속·되감기로 중복 지급되지 않는다 — 관측은 game.ts의 finishMatch()에서
//    "완료된 세트(m.sets)"를 1회만 순회해 기록한다(리플레이 재생은 클라이언트 애니메이션일 뿐 이
//    함수를 다시 호출하지 않는다 — POG/스카우팅/훈련이력과 같은 안전 패턴).
//  - 완료 효과는 능력(수행 정확도) 쪽에만 작게, 1회 상한으로 준다. 성향(temperament) 자체는 안 바꾼다
//    ("성향 변화와 능력치 상승을 한꺼번에 넣지 마").

export type ChallengeId = 'safe_commit' | 'obj_priority';

export type ChallengeDef = {
 id: ChallengeId;
 name: string;
 summary: string;
 opportunity: string;   // 수행 기회가 되는 상황
 observe: string;       // 관측할 행동과 성공·실패 기준
 minObservations: number;
 evalWindowSeasons: number; // 참고용 표시(강제 실패 기한 아님 — 못 채우면 계속 "평가 보류")
 cost: string;          // 훈련 비용 또는 포기하는 훈련
 effect: string;        // 완료 효과와 적용 상한
 successThreshold: number; // 관측된 것 중 성공 비율이 이 값 이상이면 완료
};

export const CHALLENGES: Record<ChallengeId, ChallengeDef> = {
 safe_commit: {
  id: 'safe_commit',
  name: '무리한 합류 줄이기',
  summary: '정글 합류 자체를 줄이는 과제가 아니라, 발각당하는 무리한 합류를 줄이는 과제다.',
  opportunity: '이 선수가 정글(JGL)로 출전해 갱킹·바텀 합류를 실제로 시도했을 때(합류함, committed).',
  observe: '그 합류가 수비 시야에 발각되지 않고 성사됐는가. 발각 안 된 비율이 임계값 이상이면 성공 관측.',
  minObservations: 8,
  evalWindowSeasons: 1,
  cost: '이 과제가 활성인 동안 이 선수에게 다른 성장 과제를 새로 지정할 수 없다(활성 과제 1개 제한).',
  effect: '완료 시 이 선수의 합류 발각 확률에 −3%p를 1회 적용한다(상한 1회 — 재완료로 누적되지 않음). 합류 여부 자체나 성향(engage)은 바뀌지 않는다.',
  successThreshold: 0.6,
 },
 obj_priority: {
  id: 'obj_priority',
  name: '오브젝트 합류 늘리기',
  summary: '라인 파밍에 치우쳐 팀 오브젝트 합류를 자주 놓치는 경향을 줄이는 과제다.',
  opportunity: '이 선수가 전령·드래곤 교전에 실제로 이동해 도착할 수 있었던 상황(도착 자체가 불가능했던 경우는 기회에서 제외).',
  observe: '도착 가능했던 상황에서 실제로 합류했는가. 합류 비율이 임계값 이상이면 성공 관측.',
  minObservations: 8,
  evalWindowSeasons: 1,
  cost: '이 과제가 활성인 동안 이 선수에게 다른 성장 과제를 새로 지정할 수 없다(활성 과제 1개 제한).',
  effect: '완료 시 이 선수의 오브젝트 합류 판단에 +3%p를 1회 적용한다(상한 1회). 합류 여부 판단 성향(resource)은 바뀌지 않는다.',
  successThreshold: 0.6,
 },
};

export type ChallengeStatus = 'active' | 'completed' | 'failed';
export type ChallengeProgress = {
 id: ChallengeId;
 startedSeason: number;
 observations: boolean[]; // append-only, 순서대로. true=성공 관측.
 status: ChallengeStatus;
};

export function startChallenge(id: ChallengeId, season: number): ChallengeProgress {
 return { id, startedSeason: season, observations: [], status: 'active' };
}

// 관측 1건 추가 + 최소 관측 수 도달 시 즉시 평가(완료/실패 확정, 이후 관측 중단).
// status가 이미 active가 아니면(완료·실패 확정됨) 아무 것도 하지 않는다 — 완료 후 재관측으로 효과가
// 다시 쌓이는 것을 구조적으로 막는다(적용 상한 1회의 근거).
export function recordObservation(progress: ChallengeProgress, success: boolean): ChallengeProgress {
 if (progress.status !== 'active') return progress;
 const observations = [...progress.observations, success];
 const def = CHALLENGES[progress.id];
 if (observations.length >= def.minObservations) {
  const rate = observations.filter(Boolean).length / observations.length;
  return { ...progress, observations, status: rate >= def.successThreshold ? 'completed' : 'failed' };
 }
 return { ...progress, observations };
}

export function successRate(progress: ChallengeProgress): number | null {
 if (!progress.observations.length) return null;
 return progress.observations.filter(Boolean).length / progress.observations.length;
}
