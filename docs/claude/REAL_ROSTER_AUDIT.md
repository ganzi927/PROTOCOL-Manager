# 실제 로스터 감사 (REAL_ROSTER_AUDIT)

작업 시작일(데이터 기준일): **2026-09-16**. 이 문서는 이 날짜를 기준으로 확인된 것과 확인되지 않은 것을 구분해 기록한다. "확인됨"은 출처를 실제로 열어 내용을 읽었다는 뜻이며, 검색 요약만 본 항목은 절대 "확인됨"으로 표시하지 않는다.

## 0. 이 세션에서 발견한 환경 제약 (중요, 먼저 읽을 것)

이 작업 환경의 `WebFetch` 도구가 liquipedia.net, lol.fandom.com, sheepesports.com, esportsinsider.com 등 주요 1차/준1차 출처에 접근할 때마다 403/429/402 오류로 차단되었다(리서치 서브에이전트가 12회 시도, 전부 실패). `WebSearch`(검색 엔진 요약 + 인용 링크)는 동작했지만, 이건 "AI가 요약한 2차 정보"이지 "출처 원문을 실제로 열어 읽은 것"이 아니다.

**결론(최초 감사 시점): 이 세션에서는 사용자가 요구한 수준("① 대회·리그 공식 등록 자료를 실제로 열어 확인")의 1차 출처 검증을 수행할 수 없었다.** 아래 §1~§7은 그 시점의 기록이며, 당시 "미검증 검색 요약"이었던 항목은 그대로 남겨둔다(역사적 기록).

**후속 업데이트(같은 날, 이후): §8을 먼저 읽을 것.** 1차 출처(Liquipedia 등)는 여전히 막혀 있었지만, 사용자 요청으로 "실제 경기 기록 기반 능력치"용 데이터 출처를 다시 조사하는 과정에서 **Oracle's Elixir의 2026 시즌 실제 경기별 CSV**(`curl`로 직접 다운로드 성공, WebFetch는 파일 크기 제한으로 실패했을 뿐 접근 자체는 가능했음을 확인)를 찾았다. 이 CSV는 실제 게임 클라이언트 기록에서 나온 데이터라 "검색 요약"이 아니라 진짜 1차 데이터에 준한다 — 아래 §2·§6의 미해결 충돌을 전부 이 데이터로 해결했다. §8 참조.

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

## 8. 후속 업데이트 — Oracle's Elixir 실제 경기 데이터로 §2·§6 전부 해결

같은 날 이후, 사용자가 "실제 경기 기록 기반 능력치를 구현할 방법이 있는지 확인해봐"라고 요청해 데이터 출처를 다시 조사했다. Liquipedia API는 여전히 429였지만, **Oracle's Elixir**(프로 LoL 경기별 통계의 표준 공개 출처)의 실제 데이터는 구글 드라이브 파일로 공개돼 있고, GitHub의 한 공개 레포(`SahilAshar/lol-meta-tracker`)가 연도별 파일 ID를 하드코딩해 둔 걸 찾았다. WebFetch로는 10MB 응답 제한에 걸려 실패했지만, **`curl`로는 실제로 받아졌다**:

```
curl -L "https://drive.usercontent.google.com/download?id=1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm&export=download&confirm=t"
→ HTTP 200, 70,374,309 bytes, 105,133행
```

컬럼은 `gameid,league,year,split,date,patch,playername,teamname,position,champion,kills,deaths,assists,csat10,goldat10,xpat10,golddiffat15,visionscore,...` 등 165개 — 이 게임의 `RawMatchObservation` 설계(`lib/players/rating-model.ts`)와 거의 그대로 대응하는 실제 경기별 원자료다. `date` 컬럼이 2026-09-12/13까지 있어 이 문서의 기준일(2026-09-16)과 며칠 차이만 난다 — 이번 시즌 로스터 최신 상태를 그대로 반영한다.

이 데이터로 리그 코드 "LCK"의 각 팀·포지션별 **가장 최근 실제 출전 기록**을 뽑아 §2·§6의 모든 항목을 해결했다:

| 팀(내부 id) | 새 확정 로스터(TOP/JGL/MID/ADC/SUP) | §2·§6에서 해결된 것 |
|---|---|---|
| T1(nva) | Doran/Oner/Faker/**Peyz**/Keria | Gumayusi→HLE 이적 단서 확인. Peyz는 INTL_ROSTER의 JDG 소속 선수와 동일인(실명 김수환 재사용, 새 선수로 안 만듦) |
| Gen.G(crn) | Kiin/Canyon/Chovy/Ruler/Duro | 로스터 유지 확인. **Duro 실명 충돌은 여전히 미해결**(CSV엔 실명 컬럼 없음) |
| Hanwha Life Esports(blz) | Zeus/**Kanavi**/Zeka/**Gumayusi**/Delight | Peanut→이탈, Viper→이탈 단서 확인. Kanavi는 JDG 출신 동일인, Gumayusi는 T1에서 이적(둘 다 새 선수로 안 만듦) |
| Dplus KIA(pnt) | Siwoo/Lucid/ShowMaker/**Smash**/**Career** | Aiming·BeryL 이탈 확인. Smash/Career는 실명 미확인 신규 |
| KT Rolster(vtx) | PerfecT/Cuzz/Bdd/**Jiwoo**/**Effort** | **직접 충돌 해결**: ADC는 Jiwoo(Nongshim에서 이적)가 맞음, FenRir/Aiming 관련 상충 검색 결과는 오정보였음. SUP Effort는 舊 BRION에서 이적 |
| Kiwoom DRX(orl, 개명) | Frog/Willer/Ucal/**Aiming**/Minous | **DRX 개명 확인**(팀명 변경 단서가 사실이었음). 로스터 전원 교체, Aiming만 舊 Dplus KIA에서 이적(동일인) |
| Nongshim RedForce(flx) | **Kingen**/**Sponge**/**Scout**/**Diable**/**Lehends** | Kingen·Lehends가 "다른 팀과 혼동"이 아니라 실제로 Nongshim 소속임을 확인. Diable은 舊 BNK FearX에서 이적(동일인) |
| DN SOOPers(wlv, 개명) | DuDu/**Sharvel**/**Clozer**/**deokdam**/**Peter** | **Kwangdong Freecs 개명 확인**. deokdam은 舊 KT, Peter는 舊 Nongshim에서 이적(둘 다 동일인) |
| BNK FearX(ark) | Clear/Raptor/VicLa/**Taeyoon**/**Kellin** | **"Taeyoon 두 팀 동시 등장" 충돌 해결**: 실제 출전 기록상 BNK FearX가 맞음(Nongshim 쪽 검색 결과가 오정보). Kellin은 舊 Kwangdong Freecs에서 이적(동일인) |
| HANJIN BRION(rse, 개명) | **Casting**/**GIDEON**/**Roamer**/**Teddy**/**Namgung** | **OKSavingsBank BRION 개명 확인**. Teddy는 舊 DRX에서 이적(동일인). GIDEON은 舊 파일의 "Gideon"(강영준)과 표기만 비슷할 뿐 동일인 여부는 여전히 미확인(대소문자만으로 단정하지 않음) |

**실제로 코드에 반영한 것**: `lib/rosters.ts`의 `LCK_ROSTER` 전체를 위 표로 교체, `confirmedAt:'2026-09-16'`·`sourceUrl`(Oracle's Elixir CSV) 부여. `TEAM_META`의 세 팀 표시명을 실제 개명대로 갱신(Kiwoom DRX / DN SOOPers / HANJIN BRION) — `id`(내부 저장 키)는 전혀 안 바꿔 기존 커리어 호환성 유지. 실명이 확인 안 된 신규 이적생(Smash/Career/Frog/Willer/Ucal/Minous/Kingen/Sponge/Scout/Lehends/Sharvel/Clozer/Casting/Roamer/Namgung, GIDEON)은 `realName:undefined`로 두고 UI엔 "실명 미확인"으로 표시(지어내지 않음) — **이 과정에서 `lib/game.ts`의 실명 오버레이 로직이 `rl.realName??p.realName`으로 짜여 있어, 실명 미확인 선수에게 무작위 생성된 가짜 한국 이름을 그대로 씌우는 버그를 발견해 함께 고쳤다**(`tests/real-roster.test.mjs`가 이 버그를 실제로 잡아냈다 — 합성 이름 패턴과 일치하면 실패하는 검정 추가).

**여전히 미해결로 남은 것**: Gen.G Duro의 실명 표기 충돌(주민규 vs 검색 결과 김민규 — CSV엔 실명이 없어 이걸로는 못 품), GIDEON이 舊 Gideon과 동일인인지, 팀 tricode(약칭) 변경 여부(예: DRX가 실제로 "KRX"로 바뀌었는지는 CSV에 tricode 컬럼이 없어 확인 못함, `short` 필드는 안 건드림), 아카데미(2군)·벤치 로스터(CSV는 1군 정규 리그 경기만 포함).

관련: `docs/claude/PLAYER_RATING_MODEL.md`(같은 CSV를 실제 능력치 원자료로 쓰는 다음 단계), `docs/claude/DATA_UPDATE_GUIDE.md`.

## 9. 후속 업데이트 (2026-09-17) — OP.GG로 재검증, §8의 팀 배정 오류 6건 발견·정정

같은 작업을 이어서, 사용자가 "op.gg나 비슷한 사이트에서 선수정보를 가지고 수치화해달라"고 요청해 브라우저로 **esports.op.gg**(오피지지 e스포츠)를 직접 열어 확인했다. WebFetch는 이 사이트가 SPA라 빈 콘텐츠만 돌려줘서(HTML은 받아지지만 JS 렌더 전) 실패했고, Claude-in-Chrome 브라우저 자동화로 실제 렌더링된 페이지를 읽었다 — `esports.op.gg/leagues/LCK/2026`의 "선수 통계" 탭이 **2026 Cup Group Stage(41경기, 2026-08-29~2026-09-14 — 이 기준일로부터 3일 전, 가장 최근에 끝난 LCK 공식 대회)**의 팀·포지션·로마자 실명·상세 스탯(KDA/DPM/DTPM/GPM/CSPM/첫킬%/첫타워%/시야)을 10개 팀 전원에 대해 보여줬다. 포지션별 필터(탑/정글/미드/원딜/서포터)를 하나씩 눌러 역할-핸들 매핑을 직접 확인했다(role 필터 없이는 포지션이 SVG 아이콘이라 텍스트로 안 잡힘).

이 데이터를 §8의 Oracle's Elixir 기반 로스터와 대조한 결과, **6개 자리가 잘못 배정돼 있었다** — CSV 자체가 틀린 게 아니라, §8 패스가 "핸들별 가장 최근 행"을 뽑을 때 시즌 중 팀을 옮긴 선수 몇 명에서 실제로는 더 이전 시점의 팀을 골랐던 것으로 보인다(원인을 완전히 재현하지는 못함 — 다음에 같은 방식으로 재계산할 때 이 실수를 되풀이하지 않도록 `DATA_UPDATE_GUIDE.md`에 "핸들→팀 매핑을 OP.GG로 교차 검증" 단계를 추가했다):

| 자리 | §8(2026-09-16, 오류) | §9(2026-09-17, 정정) | 근거 |
|---|---|---|---|
| KT Rolster(vtx) ADC | Jiwoo | **Aiming** | OP.GG 선수 통계 "원딜" 필터에서 KT 행은 Aiming(Ha-ram Kim=김하람, 기존 실명과 일치) |
| KT Rolster(vtx) SUP | Effort | **Ghost**(Jang Yong-jun) | Effort는 이번 스테이지 어느 팀의 선발/벤치 명단에도 없음 — 상태 불명으로 남기고 로스터에서 제외 |
| Kiwoom DRX(orl) TOP | Frog | **Rich**(Jae-won Lee=이재원, 기존 실명과 일치) | "탑" 필터에서 KRX 행이 Rich — Frog는 이번 스테이지 어느 팀에도 없음 |
| Kiwoom DRX(orl) ADC | Aiming | **Jiwoo**(Jung Ji-woo) | "원딜" 필터에서 KRX 행이 Jiwoo — Aiming은 실제로는 KT 소속(위 항목) |
| Kiwoom DRX(orl) SUP | Minous | **Andil**(Moon Gwan-bin=문관빈, 기존 파일 원본과도 일치) | "서포터" 필터에서 KRX 행이 Andil |
| Nongshim RedForce(flx) ADC | Diable | **Taeyoon**(Kim Tae-yoon) | "원딜" 필터에서 NS 행이 Taeyoon — Diable은 실제로는 BNK FearX 소속(아래 항목) |
| BNK FearX(ark) ADC | Taeyoon | **Diable**(Nam Dae-geun) | "원딜" 필터에서 BFX 행이 Diable — 실명도 기존 코드값 "이창주"와 불일치해 함께 정정 |
| BNK FearX(ark) JGL | Raptor(권지훈) | Raptor 유지, **실명만 정정**(Jeon Eo-jin) | 기존 "권지훈"은 성(권)부터 OP.GG 로마자(Jeon/전)와 불일치 — 오류로 판단해 정정 |
| BNK FearX(ark) MID | VicLa(가을) | VicLa 유지, **실명만 정정**(Lee Dae-gwang) | 기존 "가을"은 실명이 아닌 것으로 보임(오류) |
| Dplus KIA(pnt) TOP | Siwoo(송시우) | Siwoo 유지, **실명만 정정**(성 Jeon/전) | 기존 "송시우"의 성(송)이 OP.GG 로마자(Jeon)와 불일치 |
| DN SOOPers(wlv) JGL | Sharvel | **Pyosik**(홍창현, 기존 파일 원본과도 일치) | "정글" 필터에서 DNS 행이 Pyosik — Sharvel은 이번 스테이지 어느 팀에도 없음 |
| Gen.G(crn) SUP 실명 | 주민규(미해결, 김민규와 충돌) | **주민규로 확정**(Min-kyu Joo와 정확히 일치) | 기존 충돌의 "김민규" 쪽이 오정보였음이 확인됨 |
| HANJIN BRION(rse) JGL "GIDEON" | 舊 Gideon(강영준)과 동일인 여부 미확인 | **별개 인물로 결론**(Kim Min-seong=김민성, 성부터 강과 불일치) | |

팀 트라이코드도 이번에 직접 확인해 정정했다: `orl` DRX→**KRX**, `wlv` KDF→**DNS**, `ark` FOX→**BFX**(OP.GG는 팀 로고 alt 텍스트와 순위표에 트라이코드를 그대로 노출한다 — CSV에는 이 컬럼이 없어 §8에서는 확인 못 했던 부분).

**벤치(로테이션) 2건 새로 발견**: KT(vtx) SUP은 Ghost(9경기)·Pollu(6경기)가, DNS(wlv) SUP은 Peter(8경기)·Life(7경기)가 이번 스테이지에 비슷한 비중으로 출전했다 — 어느 한쪽을 확정 주전이라 단정하지 않고 게임 수가 더 많은 쪽을 `starter`, 나머지를 `bench`로 기록했다(`RosterStatus`에 이미 있던 구분을 실제로 처음 사용).

**실명 로마자 표기만 확인된 신규 인원**(한글 표기는 추정하지 않음 — 파일 헤더의 ROMAN_ONLY 원칙): Casting(Shin Min-jae), GIDEON(Kim Min-seong), Roamer(Cho Woo-jin), Willer(Kim Jeong-hyeon), Ucal(Son Woo-hyeon), Jiwoo(Jung Ji-woo — 舊 한지원 표기와 성이 달라 동일인 여부 열린 채로 둠), Kingen(Hwang Seong-hoon), Sponge(Bae Young-jun), Scout(Lee Ye-chan), Lehends(Son Si-woo), Clozer(Lee Ju-hyeon), Smash(Shin Geum-jae), Career(Oh Hyeong-seok), Namgung(Namgung Seong-hoon), Ghost(Jang Yong-jun), Pollu(Oh Dong-gyu), Life(Kim Jeong-min).

**이번에도 확인 못 하고 코드에서 뺀 것**: Frog·Minous·Sharvel — §8 패스가 반영했지만 이번 스테이지 어느 팀의 선발·벤치 명단에도 없다. 은퇴·2군 강등·부상 등 여러 가능성이 있지만 확인할 자료가 없어 추정하지 않고 로스터에서 제외했다(§0 "확인되지 않은 선발을 확정 주전이라고 표시하지 마"와 동일 원칙 — 이번엔 반대 방향, "더 이상 확인 안 되는 선발을 계속 주전으로 남겨두지 마"). 다음 세션에서 OP.GG나 팀 공식 발표로 이 세 선수의 현재 상태(은퇴/이적/2군)를 확인하면 `lib/rosters.ts`에 `status:'inactive'` 등으로 명시할 것.

**실제 능력치 델타도 재계산**: 위 6개 자리 정정에 따라 `lib/players/lck-2026-ratings.ts`도 다시 계산했다(원자료는 §8과 같은 CSV, 대상 핸들 목록만 갱신) — 계산 절차는 `DATA_UPDATE_GUIDE.md`, 능력치 계층 설계와의 관계는 `PLAYER_RATING_MODEL.md` §8 참조.

관련: `lib/rosters.ts` 파일 헤더(같은 diff를 코드 주석으로도 남김), `docs/claude/PLAYER_RATING_MODEL.md` §8, `docs/claude/DATA_UPDATE_GUIDE.md`.

## 다음 단계 제안

§8이 남겼던 항목 중 Duro 실명 충돌과 tricode 변경은 §9에서 OP.GG로 해결됐다. §9 기준으로 아직 열려 있는 것:

- **Frog·Minous·Sharvel의 현재 상태**(은퇴/이적/2군 등) — 확인되는 대로 `lib/rosters.ts`에 반영하거나 `status:'inactive'`로 명시.
- **Kiwoom DRX(orl) Jiwoo가 舊 Nongshim 시절 "한지원" Jiwoo와 동일인인지** — 성(姓) 로마자가 불일치해 미확인으로 열어 둠.
- **GIDEON이 舊 파일의 "Gideon"(강영준)과 별개 인물이라는 결론**은 로마자 성 불일치 하나에 근거한다 — 팀 공식 발표로 재확인되면 좋음.
- **해외팀(`INTL_ROSTER`) 확대** — LCK와 같은 OP.GG 기반 절차를 아직 적용하지 않음(`DATA_UPDATE_GUIDE.md` "국제대회 팀 확대" 참조).
- **사진**: 이번 OP.GG 조사에서 선수 사진 CDN URL(`s-qwer.op.gg/.../players/*.png`)을 확인했지만, 재배포 조건이 불명확해 핫링크하지 않기로 했다(§7의 Wikimedia 방식과 달리 명시적 라이선스 태그가 없음) — 사용 조건이 확인되면 `PLAYER_PHOTO`에 추가할 수 있다.

확인되는 대로 이 문서와 `lib/rosters.ts`를 갱신하는 절차는 `DATA_UPDATE_GUIDE.md`에 정리했다.
