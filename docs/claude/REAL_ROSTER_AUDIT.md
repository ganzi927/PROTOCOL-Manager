# 실제 로스터 감사 (REAL_ROSTER_AUDIT)

작업 시작일(데이터 기준일): **2026-09-16**. 이 문서는 이 날짜를 기준으로 확인된 것과 확인되지 않은 것을 구분해 기록한다. "확인됨"은 출처를 실제로 열어 내용을 읽었다는 뜻이며, 검색 요약만 본 항목은 절대 "확인됨"으로 표시하지 않는다.

## 0. 이 세션에서 발견한 환경 제약 (중요, 먼저 읽을 것)

이 작업 환경의 `WebFetch` 도구가 liquipedia.net, lol.fandom.com, sheepesports.com, esportsinsider.com 등 주요 1차/준1차 출처에 접근할 때마다 403/429/402 오류로 차단되었다(리서치 서브에이전트가 12회 시도, 전부 실패). `WebSearch`(검색 엔진 요약 + 인용 링크)는 동작했지만, 이건 "AI가 요약한 2차 정보"이지 "출처 원문을 실제로 열어 읽은 것"이 아니다.

**결론: 이 세션에서는 사용자가 요구한 수준("① 대회·리그 공식 등록 자료를 실제로 열어 확인")의 1차 출처 검증을 수행할 수 없었다.** 아래 모든 항목은 "검색 요약 기반 단서"이며 `상태: 미검증(검색 요약만)`으로 명시한다. 이 상태를 임의로 "확인됨"으로 격상시키지 않았다.

## 1. 기존 코드(`lib/rosters.ts`)의 현재 스냅샷 — 변경 전 원본

이 감사 시점까지 `lib/rosters.ts`는 다음과 같이 기록돼 있었다(주석: "best-effort approximation as of early 2026", 출처·확인일 필드 없음):

| 팀 내부 ID | 표시명(코드) | 로스터(코드, TOP/JGL/MID/ADC/SUP) |
|---|---|---|
| nva | T1 | Doran/Oner/Faker/Gumayusi/Keria |
| crn | Gen.G | Kiin/Canyon/Chovy/Ruler/Duro |
| blz | Hanwha Life Esports | Zeus/Peanut/Zeka/Viper/Delight |
| pnt | Dplus KIA | Siwoo/Lucid/ShowMaker/Aiming/BeryL |
| vtx | KT Rolster | PerfecT/Cuzz/Bdd/deokdam/Way |
| orl | DRX | Rich/Juhan/SeTab/Teddy/Andil |
| flx | Nongshim RedForce | DnDn/Sylvie/Fisher/Jiwoo/Peter |
| wlv | Kwangdong Freecs | DuDu/Pyosik/BuLLDoG/Envyy/Kellin |
| ark | BNK FearX | Clear/Raptor/VicLa/Diable/Kael |
| rse | OKSavingsBank BRION | Morgan/Gideon/Karis/Hena/Effort |

이 표는 아직 코드에서 수정하지 않았다(아래 "미해결 충돌"이 있는 채로 덮어쓰면 확인된 적 없는 정보를 확정처럼 저장하게 되어, 사용자의 명시적 지시 위반이다).

## 2. 검색 요약 기반 단서 — 전부 `미검증(검색 요약만)`

| 팀 | 코드 데이터와의 차이(단서) | 근거(검색 요약, 실제 열어 읽지 않음) | 상태 |
|---|---|---|---|
| T1 (nva) | ADC: Gumayusi → **Peyz**로 교체(설)됨. Doran/Oner/Faker/Keria는 유지된다는 단서. | sheepesports.com "T1 completed 2026 LCK roster" | 미검증 |
| Gen.G (crn) | 로스터 유지(설) — 2026 서머 우승(HLE 3-1)이라는 단서. Duro 실명이 검색에서는 "김민규"로 나오는데 코드엔 "주민규" — **직접 충돌**, 미해결. | Wikipedia "Ruler (gamer)", sheepesports.com 우승 기사 | 미검증 + 실명 충돌 |
| Hanwha Life Esports (blz) | JGL: Peanut → 군 입대로 이탈 → **Kanavi**(JDG 복귀) 합류설. ADC: Viper → LPL Bilibili Gaming 이적설, **Gumayusi** 합류설(T1에서). Zeus/Zeka/Delight는 유지 단서. | e4equip.com "HLE 2026 roster Gumayusi Kanavi" | 미검증 |
| Dplus KIA (pnt) | ADC: Aiming → KT Rolster 복귀설. SUP: BeryL → 무소속설. 신규 **Smash**(ADC), **Career**(SUP, 루키) 합류설. Siwoo/Lucid/ShowMaker는 유지 단서. | sheepesports.com "DK completed 2026 LCK roster" | 미검증 |
| KT Rolster (vtx) | **직접 충돌**: 한 출처는 ADC "FenRir"+SUP Effort, 다른 출처는 Aiming이 ADC로 복귀하고 Ghost/Pollu 듀얼 서포터 체제, "7월 30일 Aiming↔Jiwoo 트레이드"라는 별도 단서까지 — 세 갈래로 갈린다. | 검색 요약 간 상호 모순 | 미검증 + 직접 충돌 |
| DRX (orl) | **팀명 자체가 바뀌었다는 단서**: "Kiwoom DRX"로 개명, 약칭 DRX→KRX. ADC Teddy → BRION 이적설. 코치·감독진 교체설. Andil/Rich는 유지된다는 단서가 있으나 포지션별 매핑이 명단 형태(역할 미표기)라 신뢰 낮음. | esportsinsider.com "DRX 2026 roster moves Jiwoo" | 미검증 |
| Nongshim RedForce (flx) | MID **Scout**(JDG 복귀), **Taeyoon**(Jiwoo 대체 합류설), JGL **Sponge**(DRX 트레이드) 합류설. "Kingen"·"Lehends"가 "작년에서 유지"라는 단서가 있으나 **이 둘은 현재 코드 어디에도 없음** — 검색 결과가 다른 팀·다른 시즌과 혼동됐을 가능성. | 검색 요약(출처 불명확) | 미검증, 신뢰도 낮음 |
| Kwangdong Freecs (wlv) | **팀명이 두 번 바뀌었다는 단서**: "Kwangdong Freecs" → "DN Freecs" → "DN SOOPers"(2025-12-22, 아프리카TV의 SOOP 리브랜딩에 따라). 로스터 자체는 미확인. | 검색 요약 | 미검증, 팀명 변경만 단서 있음 |
| BNK FearX (ark) | Clear/Raptor/VicLa/Kellin 유지 + **Taeyoon** 합류설 — **NS 항목과 직접 충돌**(Taeyoon이 두 팀에 동시 배정된 것처럼 나옴, 둘 중 하나는 틀림). | 검색 요약 | 미검증 + 직접 충돌 |
| OKSavingsBank BRION (rse) | **팀명이 두 번 바뀌었다는 단서**: "OKSavingsBank BRION" → "BRION"(스폰서 종료) → "HANJIN BRION"(신규 스폰서, 1월 1일). ADC Teddy(前 DRX) 영입 확정 단서. | 검색 요약 | 미검증, 팀명 변경 단서만 상대적으로 신뢰도 높음(복수 언급) |

## 3. 국제대회(LPL/LEC/LCS/PCS) 팀

사용자 지시대로 "LCK 적용·검증 후 확대"라 이번 라운드에서 조사하지 않았다. `lib/rosters.ts`의 `FOREIGN_META`/`INTL_ROSTER`는 그대로 두었다 — 공통 데이터 구조(출처·확인일·상태 필드)만 LCK와 같은 스키마로 준비해 두고, 실제 내용 검증은 다음 단계.

## 4. 이번 세션에서 실제로 반영한 것 / 반영하지 않은 것

- **반영 안 함**: `lib/rosters.ts`의 실명·소속 데이터 자체는 이 문서 작성 시점까지 변경하지 않았다. 위 표의 "미검증"·"직접 충돌" 항목을 그대로 코드에 넣으면 확인되지 않은 정보를 확정 정보처럼 저장하는 것이라 사용자의 2번 지시("실제로 열어 확인하지 않은 출처를 검증 완료로 표시하지 마")를 정면으로 어긴다.
- **반영함**: `lib/rosters.ts`에 출처(`sourceUrl`)·확인일(`confirmedAt`)·등록 상태(`status`) 필드를 갖춘 새 데이터 구조를 준비했다(아래 §5) — 지금은 기존 값을 그대로 담되 `confirmedAt`이 없는 상태(`unverified`)로 표시해, 다음 단계에서 실제 확인된 값으로 하나씩 교체할 수 있게 했다.

## 5. 데이터 구조 변경

`lib/rosters.ts`에 다음 타입을 추가했다(자세한 내용은 코드 참조):
- `RosterStatus`: `'starter'|'bench'|'academy'|'inactive'` — "등록됐다"와 "실제 선발 출전"을 구분하기 위한 필드. 지금은 코드에 남아 있던 5인 전부 `'starter'`로 표시돼 있으나, §2의 충돌이 해결되기 전까지는 **이 status도 실제 선발 확정을 의미하지 않는다** — 기존 데이터를 그대로 옮긴 것뿐이다.
- `sourceUrl`/`confirmedAt`: 팀 단위로 출처와 확인일을 기록하는 필드. 지금은 전부 비어 있다(`confirmedAt: undefined` = 미확인).

## 6. 검토 목록 (사람이 직접 확인해야 함)

1. **KT Rolster ADC/SUP** — 두 출처가 정면으로 다른 이야기를 함. LCK 공식 사이트(lck.gg)나 Liquipedia 원문을 직접 열어야 해결됨.
2. **Taeyoon 소속** — Nongshim RedForce와 BNK FearX 양쪽에 동시에 나타남. 하나는 오정보.
3. **Nongshim RedForce "Kingen"/"Lehends"** — 현재 코드베이스 어디에도 없는 이름. 다른 팀/시즌과 혼동됐을 가능성 높음, 그대로 신뢰하지 말 것.
4. **Gen.G Duro 실명** — 코드 "주민규" vs 검색 "김민규".
5. **DRX/KDF/BRION 팀명·약칭 변경 여부** — 실제 대회 등록 명칭이 무엇인지(구단명 변경이 실제 리그 등록에도 반영됐는지) 확인 필요.
6. **모든 팀의 벤치·아카데미(2군) 선수** — 이번 검색으로는 전혀 확인되지 않았다.
7. **신규 이적 선수들의 실명** — Peyz/Kanavi/Smash/Career/Scout/Sponge 등 대부분 실명 미확인.

## 7. 사진·로고 소스 확인 결과

원래 계획은 팀 로고 9개(T1은 이미 있음)·선수 사진 50명을 Liquipedia의 pageimages API로 확인하는 것이었다. **Liquipedia API는 이 환경에서 모든 요청이 HTTP 429(Too Many Requests)로 차단됐다** — 등록된 User-Agent가 필요한 정책으로 추정되며, 이 환경의 fetch 도구는 커스텀 헤더를 지정할 수 없다. 기존 코드에 있던 `TEAM_LOGO.nva`(T1)의 Liquipedia URL도 이번 세션엔 테스트하지 못했다 — 실제 브라우저에서는 동작할 수도, 똑같이 차단될 수도 있다.

**대체 출처로 Wikipedia/Wikimedia Commons의 pageimages API를 썼다** — 정상 동작했고, Commons 이미지는 명시적인 기계 판독 가능 라이선스 태그를 갖고 있어 오히려 Liquipedia의 "공정 이용" 편집 사진보다 사용 조건이 명확하다는 장점이 있다. 단점은 개인 영문 위키백과 문서가 있는 유명 선수만 커버된다는 것.

**확인된 팀 로고(4/9)**: Gen.G, Hanwha Life Esports, Dplus KIA, DRX(파일명에 "2023"이 붙어 있어 최신 로고인지 불확실 — 별도 확인 필요). 나머지 5개 팀(KT Rolster, Nongshim RedForce, Kwangdong Freecs, BNK FearX, OKSavingsBank BRION)은 위키백과에 팀 전용 문서가 없거나(KDF는 LCK 일반 문서로 리다이렉트) 문서는 있어도 대표 이미지가 설정돼 있지 않아 **찾지 못함** — 지어내지 않고 비워뒀다(엠블럼은 팀 컬러 배지로 폴백).

**확인된 선수 사진(10/50)**: Faker, Gumayusi, Chovy, Doran, Keria, Oner, Peanut, Ruler, Zeus, Bdd. 나머지 39명은 개인 위키백과 문서가 없어 **찾지 못함**(흔한 단어와 겹치는 닉네임 — Chovy→Anchovy, Canyon→지질학 문서, Viper→뱀 문서 등 — 는 시도했지만 다른 주제로 연결돼 있어 사용하지 않았다). **이 39명은 이니셜 모노그램 아바타가 기본 표시로 남는다 — 이건 예외 상황이 아니라 이 데이터 소스 환경에서의 정상 동작이다.**

부수 발견: OKSavingsBank BRION의 팀명 변경 단서("HANJIN BRION", 2026-01-02 스폰서십 발표)가 사진 조사 경로에서도 독립적으로 나왔다 — §2의 팀명 변경 단서와 서로 다른 경로에서 수렴했다는 점에서 완전히 무관한 오정보는 아닐 가능성이 있지만, 여전히 검색 요약 기반이라 §6 검토 목록에서 상태를 바꾸지 않았다.

## 다음 단계 제안

이 환경에서 Liquipedia/Fandom 등 1차 출처에 직접 접근하지 못하는 한, 위 6개 검토 목록은 사용자가 직접 확인해 알려주거나, 다른 접근 경로(로그인된 브라우저 세션, 다른 네트워크)에서 재시도해야 한다. 확인되는 대로 이 문서와 `lib/rosters.ts`를 갱신하는 절차는 `DATA_UPDATE_GUIDE.md`에 정리했다.
