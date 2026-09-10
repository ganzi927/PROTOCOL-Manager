// 조합 효과 계층 — PROTOCOL-Composition-Meta-Design.md 단계 2의 첫 슬라이스.
//
// 목적: "같은 선수 조건에서 조합만 바꾸면 해당 구간(라인/오브젝트/한타)에서 변화가 나되,
// 이미 반영된 효과를 두 번 더하지 않는다." (설계 문서 §4, §6)
//
// 데이터 계약: 검증된 외부 랭크/대회 데이터는 확보하지 않았다. 챔피언당 원천 정보는
// 태그 2개(engage/peel/poke/scale) + 타입(AD/AP/혼합) + 역할뿐이므로, 아래 프로필과
// 가중치는 전부 "명시적 게임 설계값"이며 실제 승률의 복제물이 아니다. 반복 시뮬레이션으로
// 범위를 조정한다. 구간 효과는 보수적으로 ±3 파워로 상한한다.
//
// 엔진 연결: 이 모듈은 순수 함수만 제공한다. simulateSet이 draftEffects()를 1회 호출해
// 라인/오브젝트/한타 사건 확률식에 각각 lane/obj/fight 항을 더한다. 승부 난수는 쓰지 않는다.
// isMeta(+2)는 이 계층에서 참조하지 않는다(설계 문서 §6: 메타 배지로 중복 증폭 금지).

import {CHAMPIONS,type Champion} from '../champions.ts';
import type {Role} from '../game.ts'; // 타입 전용 — 런타임 순환 없음

const FALLBACK_PROFILE_CHAMP={id:'?',name:'미상',role:'MID',type:'혼합',tags:[],flex:[]} as unknown as Champion;
const champById=(id:string):Champion=>CHAMPIONS.find(c=>c.id===id)??FALLBACK_PROFILE_CHAMP;

export type CompProfile={
 engage:number;   // 이니시·강제 진입
 peel:number;     // 아군 보호·역이니시
 poke:number;     // 원거리 견제·시야 압박·공성
 scale:number;    // 후반 성장 의존도
 frontline:number;// 앞라인·내구
 range:number;    // 평균 교전 사거리(피격 회피)
 early:number;    // 초반 주도권(−면 취약)
 late:number;     // 후반 캐리력
};

// 태그가 특성에 기여하는 양(설계값). 챔피언마다 태그 2개.
const TRAIT:Record<string,Partial<CompProfile>>={
 engage:{engage:1,frontline:.55,range:-.3,early:.2},
 peel:{peel:1,frontline:.3,late:.15},
 poke:{poke:1,range:.8,frontline:-.4,early:.35,late:-.1},
 scale:{scale:1,late:.7,early:-.5},
};
// 역할 기본선(설계값).
const ROLE_BASE:Record<Role,Partial<CompProfile>>={
 TOP:{frontline:.5,early:.1},
 JGL:{engage:.2,early:.15},
 MID:{poke:.15,late:.2},
 ADC:{late:.6,range:.3,frontline:-.3},
 SUP:{peel:.4,poke:.1,late:-.2},
};

const ZERO=():CompProfile=>({engage:0,peel:0,poke:0,scale:0,frontline:0,range:0,early:0,late:0});
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const sum=(ns:number[])=>ns.reduce((x,y)=>x+y,0);

export function champProfile(champId:string):CompProfile{
 const c=champById(champId),p=ZERO();
 const add=(src?:Partial<CompProfile>)=>{if(src)for(const k of Object.keys(src) as (keyof CompProfile)[])p[k]+=src[k]!;};
 add(ROLE_BASE[c.role]);
 for(const t of c.tags)add(TRAIT[t]);
 return p;
}

export type DraftEffects={lane:number,obj:number,fight:number};

// 픽 5개 배열 → 팀 합산 지표(설계값 기반).
function aggregate(picks:string[]){
 const T=picks.map(champProfile);
 return {
  frontline:sum(T.map(p=>Math.max(0,p.frontline))),
  peel:sum(T.map(p=>Math.max(0,p.peel))),
  engage:sum(T.map(p=>Math.max(0,p.engage))),
  poke:sum(T.map(p=>Math.max(0,p.poke))),
  range:sum(T.map(p=>p.range))/5,
  early:sum(T.map(p=>p.early))/5,
  late:sum(T.map(p=>p.late))/5,
  // 피해 유형 다양성: AD·AP 위협이 각각 2개 이상이면 대응 난도가 올라간다(혼합은 양쪽에 계수).
  dmgMix:(()=>{const t=picks.map(id=>champById(id).type);
   return t.filter(x=>x!=='AP').length>=2&&t.filter(x=>x!=='AD').length>=2?1:0;})(),
 };
}

// A 관점 차이값(양수 = A 팀 유리). 픽 id만의 결정적 순수 함수.
// draftEffects(a,b) === draftEffects(b,a)를 부호 반전한 값이다(완전 대칭). 같은 픽이면 0.
export function draftEffects(picksA:string[],picksB:string[]):DraftEffects{
 const a=aggregate(picksA),b=aggregate(picksB);

 // §4.4 완성도: 앞라인·보호·피해유형 다양성. 쌍마다 더하지 않고 팀 총량 차이로(체감 감소 tanh).
 const completion=
   0.9*Math.tanh((a.frontline-b.frontline)/1.8)
  +0.5*Math.tanh((a.peel-b.peel)/1.6)
  +0.3*(a.dmgMix-b.dmgMix);

 // §4.2 아군 궁합(팀 내부, 상한): 이니시×보호 동반, 포크 다수 시너지.
 const syn=(x:ReturnType<typeof aggregate>)=>clamp(Math.min(x.engage,1.5)*Math.min(x.peel,1.5),0,1.6)+0.3*Math.min(x.poke,2);
 const synergy=clamp(syn(a)-syn(b),-1.8,1.8);

 // §4.3 상대 매치업: 포크는 상대 진입이 약할 때만, 다이브는 상대 보호가 약할 때만 유효.
 const pokeEdge=a.poke*(1-Math.min(1,b.engage/2.5))-b.poke*(1-Math.min(1,a.engage/2.5));
 const diveEdge=a.engage*(1-Math.min(1,b.peel/2.5))-b.engage*(1-Math.min(1,a.peel/2.5));

 // 스케일 스택은 프로필의 early(−)/late(+)로 자연히 라인 취약·후반 강함이 된다.
 const lane =clamp(0.55*pokeEdge+0.70*(a.range-b.range)+1.10*(a.early-b.early),-3,3);
 const obj  =clamp(0.70*completion+0.35*pokeEdge+0.40*synergy,-3,3);
 const fight =clamp(1.00*completion+0.85*synergy+0.50*diveEdge+1.30*(a.late-b.late),-3,3);
 return {lane,obj,fight};
}
