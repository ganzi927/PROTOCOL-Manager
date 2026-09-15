// F18 Phase A — 선수 성향(temperament): 4개의 연속 축. "무엇을 선택하려는가"만 다룬다.
// 능력치·숙련도(얼마나 잘 수행하는가)·컨디션(현재 수행의 안정성)·팀 호흡(여러 선수가 얼마나 잘
// 맞추는가)과는 분리된 별도 축이다 — 같은 확률식에 중복 가산하지 않는다(엔진 쪽 확인 사항).
//
// 데이터 계약: 저장하지 않는다. 선수 ID의 결정적 해시로 그때그때 계산하는 순수 함수다
// ("명시적인 게임 설정 또는 안정적인 ID 기반 규칙" — 사용자 지시). 이래야:
//  - 구세이브를 불러올 때마다 성향이 다시 추첨되지 않는다(같은 id → 항상 같은 값).
//  - 새 필드·마이그레이션이 전혀 필요 없다(Player 타입 불변).
//  - 실존 선수의 실제 성격을 "재현했다"고 주장할 수 없다 — 애초에 이름이 아니라 내부 id 해시일 뿐,
//    게임 내부 설정이라는 점이 구조적으로 드러난다.
//
// 포지션에 따라 성향을 강제로 고정하지 않는다: id 해시만 쓰고 role은 입력으로도 안 받는다.
import {random, hash} from '../rng.ts';

export type TemperamentAxis = 'engage' | 'resource' | 'info' | 'call';
export type Temperament = Record<TemperamentAxis, number>; // 각 -1~+1. 0에 가까울수록 균형형.

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// 두 개의 독립 균등분포 차 = 삼각분포(-1~+1, 평균 0) — 극단값(±1에 가까운 값)은 자연히 드물고
// 대부분 균형형(0 근처) 쪽에 몰린다. 축마다 다른 해시 네임스페이스를 써서 서로 독립적이게 한다.
const axisValue = (id: string, axis: TemperamentAxis): number => {
 const a = random(hash(`${id}|temperament|${axis}|a`))();
 const b = random(hash(`${id}|temperament|${axis}|b`))();
 return clampN(Math.round((a - b) * 100) / 100, -1, 1);
};

export function temperamentOf(playerId: string): Temperament {
 return {
  engage: axisValue(playerId, 'engage'),
  resource: axisValue(playerId, 'resource'),
  info: axisValue(playerId, 'info'),
  call: axisValue(playerId, 'call'),
 };
}

// 균형 판정 문턱값. 이 안쪽은 "균형형" — 양 끝 라벨을 붙이지 않는다(사용자 지시: 중앙은 균형형).
export const TEMPERAMENT_BALANCED_BAND = 0.34;

export const TEMPERAMENT_LABEL: Record<TemperamentAxis, { lo: string; hi: string; mid: string; loShort: string; hiShort: string }> = {
 engage: { lo: '신중', hi: '과감', mid: '균형', loShort: '신중형', hiShort: '과감형' },
 resource: { lo: '성장', hi: '합류', mid: '균형', loShort: '성장형', hiShort: '합류형' },
 info: { lo: '안전 확인', hi: '적극 탐색', mid: '균형', loShort: '안전 확인형', hiShort: '적극 탐색형' },
 call: { lo: '계획 준수', hi: '기회 제안', mid: '균형', loShort: '계획 준수형', hiShort: '기회 제안형' },
};

export function labelOf(axis: TemperamentAxis, value: number): string {
 const L = TEMPERAMENT_LABEL[axis];
 if (value <= -TEMPERAMENT_BALANCED_BAND) return L.lo;
 if (value >= TEMPERAMENT_BALANCED_BAND) return L.hi;
 return L.mid;
}
export function shortLabelOf(axis: TemperamentAxis, value: number): string {
 const L = TEMPERAMENT_LABEL[axis];
 if (value <= -TEMPERAMENT_BALANCED_BAND) return L.loShort;
 if (value >= TEMPERAMENT_BALANCED_BAND) return L.hiShort;
 return L.mid + '형';
}
