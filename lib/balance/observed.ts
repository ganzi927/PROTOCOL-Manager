// F27: 실제 조합 통계 — 다른 서비스의 화면 숫자를 흉내 내지 않는다. 이 리그 자체의 진짜 관측치만 쓴다.
//
// 데이터 출처: g.scout(F16)가 이미 매 경기(사용자·AI 자동 진행 경기 전부) 양 팀 관점으로 픽·승패를
// 저장하고 있다(팀당 최근 SCOUT_CAP세트, finishMatch에서 적립). 이 모듈은 새 저장소를 만들지 않고
// 그 안의 이미 완료된 세트만 읽어 챔피언·역할별 관측 승률을 집계한다 — composition.ts의 CompProfile
// (챔피언 태그 기반 설계값, 실측 아님)과는 출처가 다른 별도 계층이며 절대 섞지 않는다(완료 조건:
// "관측 승률/모델 조합 전망/우리 팀 전망이 분리된다"). 순수 읽기 전용 — g.scout/g.replays를 쓰지 않는다.
//
// 표본 임계값(MIN_SAMPLE=6)은 감으로 정하지 않았다 — 3시즌 실측(scratch 스크립트, 739커맨드)에서
// 관측된 챔피언-역할 조합 121개 중 97개(80%)가 6표본 이상을 확보했다. 5인 완전 조합 단위 관측은
// 이 표본 규모로는 사실상 항상 0~1건이라(경우의 수가 압도적으로 많음) 의도적으로 만들지 않는다 —
// "희소한 5인 조합은 샘플 부족으로 표시"를 코드 경로 자체로 지킨다(폴백 조건문이 아니라 애초에
// 그 집계 함수 자체가 없음).
//
// 이 모듈은 개별 챔피언·역할 성능만 집계한다. 2인 시너지·상대 조합 대응·선수 개인 실력은 이 표본
// 규모로 신뢰성 있게 분리할 수 없어 v1에서 만들지 않는다("무리하게 같은 원인으로 합치지 않는다").
//
// "패치" 분리: 이 게임엔 실행 중 값이 바뀌는 실시간 밸런스 패치가 없다(CompProfile은 상수). 대신
// g.season/RULE_VERSION(F26)을 관측 시점 표기로 남겨, 나중에 실제로 패치 시스템이 생기면 이 스탬프로
// "이전 규칙 버전의 관측치"를 구분할 수 있게 해둔다 — 없는 걸 있는 척 새 개념을 지어내진 않는다.

import type {Game, Role} from '../game.ts';
import {RULE_VERSION} from '../game.ts';

export const MIN_SAMPLE = 6;
const ROLE_LIST:Role[] = ['TOP','JGL','MID','ADC','SUP'];

export type ObservedChampStat = {
 champId:string; role:Role; sampleSize:number; wins:number;
 winRate:number|null; // MIN_SAMPLE 미만이면 null(표본 부족 — 숫자를 지어내지 않는다)
 seasonRange:[number,number]|null;
 source:'league-observed';
 ruleVersion:string; observedAt:{season:number,split:'SPRING'|'SUMMER'};
};

// 챔피언 하나·역할 하나의 관측 승률. g.scout 전체(모든 팀, 사용자+AI)를 읽어 집계한다.
export function observedChampStat(g:Game, champId:string, role:Role):ObservedChampStat{
 const ri = ROLE_LIST.indexOf(role);
 let wins=0, total=0, minS=Infinity, maxS=-Infinity;
 for(const samples of Object.values(g.scout??{})){
  for(const s of samples){
   if(s.picks[ri]!==champId)continue;
   total++; if(s.won)wins++;
   if(s.season<minS)minS=s.season; if(s.season>maxS)maxS=s.season;
  }
 }
 return {
  champId, role, sampleSize:total, wins,
  winRate: total>=MIN_SAMPLE ? wins/total : null,
  seasonRange: total>0 ? [minS,maxS] : null,
  source:'league-observed',
  ruleVersion:RULE_VERSION,
  observedAt:{season:g.season, split:g.split},
 };
}

// 이미 확정된 픽 목록(팀 하나) 전체의 관측 통계를 한 번에 계산 — CompositionPanel이 쓰는 편의 함수.
export function observedTeamStats(g:Game, picks:string[]):ObservedChampStat[]{
 return picks.map((champId,i)=>observedChampStat(g,champId,ROLE_LIST[i]));
}
