// Real-world identities for the Classic league, mapped onto the existing team ids so
// saved careers stay compatible. Player handles/names are used for flavour only; this is
// not licensed content. In-engine stat deltas derived from real match performance now
// exist for LCK (see lib/players/lck-2026-ratings.ts, lib/players/rating-model.ts).
//
// Data baseline: 2026-09-17 (session start). Two earlier passes fed into this file:
// (1) 2026-09-16 audit found every primary source (Liquipedia, lck.gg, fandom wikis)
// blocked (403/429/402) and fell back to Oracle's Elixir's full-2026-season CSV, which
// resolved most rename/transfer conflicts but — as this pass found — got a few
// player-team assignments wrong (its "most recent row per handle" heuristic picked up
// stale mid-season rows for some players).
// (2) 2026-09-17: browser-verified against OP.GG Esports' own LCK player-stats table
// (esports.op.gg/leagues/LCK/2026, "선수 통계" tab, filtered per-role), which reflects
// the 2026 Cup Group Stage (41 games, 2026-08-29~2026-09-14 — the most recent completed
// LCK competition as of this baseline, 3 days out). This directly caught and corrected
// real errors from pass (1): KT Rolster's actual SUP is "Ghost", not "Effort" (Effort
// does not appear in any team's current starter/bench rows this stage — status unknown,
// left out rather than guessed); KT's actual ADC is Aiming, not Jiwoo; Jiwoo is on
// Kiwoom DRX; Taeyoon is on Nongshim RedForce, not BNK FearX (reversing pass (1)'s
// resolution — this data is simply more recent); BNK FearX's Raptor/VicLa and
// Nongshim's Diable had real names that don't match this table at all (surname
// mismatches — the old values were wrong, not just unconfirmed).
//
// Real-name handling: OP.GG's table gives *romanized* names only (no Hangul column).
// Korean surnames romanize near-1:1 (Lee/Kim/Park/Choi/Jeong/Shin/... — low ambiguity),
// but given names have many valid Hangul spellings per romanization — guessing one would
// be exactly the fabrication this project avoids. So: where OP.GG's romanization matches
// an existing Hangul name (romanizing it back gives the same string), that Hangul is kept
// and now counted as OP.GG-confirmed. Where it doesn't match (new transfer, or a name this
// pass corrected), `realName` holds the OP.GG romanized string as-is (e.g. "Shin Min-jae")
// rather than an invented Hangul spelling — still a real, sourced, displayable name, just
// not converted. `docs/claude/REAL_ROSTER_AUDIT.md` §9 has the full per-player diff against
// pass (1), including players this pass could NOT find in any current LCK team's rows
// (Frog, Minous, Sharvel — removed rather than left as unconfirmed starters; see §9 for
// what to check next). `docs/claude/DATA_UPDATE_GUIDE.md` explains how to refresh this
// again next split.

export type Role = 'TOP'|'JGL'|'MID'|'ADC'|'SUP';
// 'starter' = confirmed (or, right now, assumed-from-prior-data) starting five.
// 'bench'/'academy' = registered but not the primary lineup. 'inactive' = registered,
// not currently playing (injury, military service, etc.). This is deliberately NOT the
// same thing as "appears in this file" — see REAL_ROSTER_AUDIT.md §0 for why none of the
// entries below have graduated past 'starter'-as-inherited-guess yet.
export type RosterStatus = 'starter'|'bench'|'academy'|'inactive';

export type RosterPlayer = {
 handle:string; realName?:string; role:Role; status:RosterStatus;
 photo?:string; // direct hotlink URL only (e.g. a Liquipedia file URL) — never rehosted, never stored in Game/Player state.
 note?:string;  // free-text caveat, e.g. a name-spelling conflict found during audit.
};

export type TeamRosterEntry = {
 players:RosterPlayer[];
 sourceUrl?:string;   // team-level source page, only set once someone has actually opened and read it.
 confirmedAt?:string; // ISO date that source was actually read. undefined = unverified.
 note?:string;
};

export type TeamMeta = {id:string;name:string;short:string;color:string;base:number;desc:string;city:string;difficulty:string;logo?:string};

// Optional per-team logo URL (any reachable image). Liquipedia (the original intended
// source, matching the T1 entry below) returned HTTP 429 on every attempt this session —
// see REAL_ROSTER_AUDIT.md §7. The other four entries came from Wikimedia Commons via
// Wikipedia's pageimages API instead (explicit machine-readable license tags, arguably
// safer than Liquipedia's fair-use editorial images) — confirmed working URLs only, none
// guessed. Left empty for the remaining teams; the emblem falls back to the brand-coloured
// short code (Emblem component in app/manager.tsx) rather than a broken image.
export const TEAM_LOGO: Record<string,string> = {
 nva: 'https://liquipedia.net/leagueoflegends/Special:FilePath/T1logo_std.png', // untested this session (Liquipedia blocked) — spot-check before relying on it.
 crn: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Gen.G_Logo.svg/330px-Gen.G_Logo.svg.png',
 blz: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Hanwha_Life_Esports_logo.svg/330px-Hanwha_Life_Esports_logo.svg.png',
 pnt: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/DPlus_KIA_Logo.svg/330px-DPlus_KIA_Logo.svg.png',
 orl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/DRX_logo_2023.png/330px-DRX_logo_2023.png', // filename says "2023" — may be a stale mark, not confirmed current.
};

// Optional per-player photo URL (same non-rehosting policy as TEAM_LOGO/champImageUrl).
// Resolved by handle at render time — never stored on a Player, so filling this in later
// never touches existing saves. Only 10 of the 50 LCK starters have an individual
// Wikipedia article with a page image (checked via the pageimages API, not guessed) —
// see REAL_ROSTER_AUDIT.md §7 for the full coverage list. Everyone else falls back to the
// existing initial-monogram avatar (app/manager.tsx's .player-monogram), which is the
// intended default, not a degraded edge case.
export const PLAYER_PHOTO: Record<string,string> = {
 Faker: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Faker_2020_interview.jpg/330px-Faker_2020_interview.jpg',
 Gumayusi: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Gumayusi_at_2023_LCK_Awards.jpg',
 Chovy: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Chovy_MSI_2025.jpg/330px-Chovy_MSI_2025.jpg',
 Doran: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Doran_2025.jpg/330px-Doran_2025.jpg',
 Keria: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Keria%2C_2023_worlds_winning_team_interview.jpg/330px-Keria%2C_2023_worlds_winning_team_interview.jpg',
 Oner: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Oner_at_Worlds_2025.jpg/330px-Oner_at_Worlds_2025.jpg',
 Peanut: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Peanut_2025.jpg/330px-Peanut_2025.jpg',
 Ruler: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Ruler_interview_2022.jpg/330px-Ruler_interview_2022.jpg',
 Zeus: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Zeus_2024_post-match_interview.jpg/330px-Zeus_2024_post-match_interview.jpg',
 Bdd: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/BDD_interview_2021.jpg/330px-BDD_interview_2021.jpg',
};
export const playerPhotoUrl = (handle:string):string|undefined => PLAYER_PHOTO[handle];

// name/short below reflect each org's current branding as of 2026-09-17, confirmed via
// OP.GG Esports' own team-logo alt text and standings tricodes on the LCK 2026 Cup pages
// (browser-verified this session — see LCK_ROSTER header). Three orgs renamed since this
// file's original "early 2026" snapshot: DRX→Kiwoom DRX, Kwangdong Freecs→DN SOOPers,
// OKSavingsBank BRION→HANJIN BRION. Unlike the 2026-09-16 pass, `short` tricodes ARE now
// independently confirmed (OP.GG shows the tricode directly, unlike the OE CSV which had
// no tricode column) — corrected: orl DRX→KRX, wlv KDF→DNS, ark FOX→BFX. `id` (internal,
// save-compatibility key) is unchanged for all ten teams regardless of branding/tricode.
export const TEAM_META: TeamMeta[] = [
 {id:'nva',name:'T1',short:'T1',color:'#e4022e',base:82,desc:'월즈 3연패의 왕조, 페이커의 팀',city:'SEOUL',difficulty:'쉬움'},
 {id:'crn',name:'Gen.G',short:'GEN',color:'#d6a94a',base:83,desc:'정규시즌을 지배하는 우승 후보',city:'SEOUL',difficulty:'쉬움'},
 {id:'blz',name:'Hanwha Life Esports',short:'HLE',color:'#ff7a00',base:78,desc:'제우스·카나비의 새 라인업',city:'SEOUL',difficulty:'보통'},
 {id:'pnt',name:'Dplus KIA',short:'DK',color:'#0a5cae',base:74,desc:'쇼메이커 중심의 노련한 운영',city:'SEOUL',difficulty:'보통'},
 {id:'vtx',name:'KT Rolster',short:'KT',color:'#d21f3c',base:72,desc:'비디디 중심의 단단한 미드-정글',city:'SEOUL',difficulty:'보통'},
 {id:'orl',name:'Kiwoom DRX',short:'KRX',color:'#3d7bff',base:64,desc:'전면 리빌딩으로 새 시즌을 준비',city:'BUSAN',difficulty:'어려움'},
 {id:'flx',name:'Nongshim RedForce',short:'NS',color:'#e11f2b',base:62,desc:'스카우트 영입 이후 상승세',city:'SEOUL',difficulty:'어려움'},
 {id:'wlv',name:'DN SOOPers',short:'DNS',color:'#1f9ad6',base:60,desc:'SOOP 리브랜딩 이후 재정비',city:'SEOUL',difficulty:'어려움'},
 {id:'ark',name:'BNK FearX',short:'BFX',color:'#5a4bd6',base:57,desc:'비클라 중심의 변수 창출',city:'BUSAN',difficulty:'도전'},
 {id:'rse',name:'HANJIN BRION',short:'BRO',color:'#f0b429',base:54,desc:'신규 스폰서·테디 영입',city:'SEOUL',difficulty:'도전'},
];

export const FOREIGN_META: TeamMeta[] = [
 {id:'drg',name:'Bilibili Gaming',short:'BLG',color:'#ff5b7f',base:83,city:'SHANGHAI',desc:'LPL 최강 전력',difficulty:'국제'},
 {id:'jdx',name:'JD Gaming',short:'JDG',color:'#c0122a',base:79,city:'BEIJING',desc:'카나비·페이즈의 슈퍼팀',difficulty:'국제'},
 {id:'lnx',name:'Top Esports',short:'TES',color:'#e21c25',base:78,city:'SHANGHAI',desc:'재키러브·메이코의 바텀',difficulty:'국제'},
 {id:'vxg',name:'Weibo Gaming',short:'WBG',color:'#c81e2d',base:74,city:'BEIJING',desc:'더 샤이·샤오후의 라인전',difficulty:'국제'},
 {id:'kng',name:"Anyone's Legend",short:'AL',color:'#111827',base:76,city:'BEIJING',desc:'타잔이 이끄는 다크호스',difficulty:'국제'},
 {id:'par',name:'Invictus Gaming',short:'IG',color:'#123a8f',base:68,city:'BEIJING',desc:'전통의 명가, 재도약',difficulty:'국제'},
 {id:'ldn',name:'G2 Esports',short:'G2',color:'#ee3a3a',base:77,city:'BERLIN',desc:'LEC의 절대 강자',difficulty:'국제'},
 {id:'nyc',name:'Fnatic',short:'FNC',color:'#ff5f18',base:71,city:'LONDON',desc:'업셋·미키엑스의 노장 저력',difficulty:'국제'},
 {id:'lax',name:'Movistar KOI',short:'KOI',color:'#7a3cff',base:69,city:'MADRID',desc:'엘요야 중심의 유럽 강호',difficulty:'국제'},
 {id:'tpe',name:'Karmine Corp',short:'KC',color:'#3fc1c9',base:67,city:'PARIS',desc:'칸나·야이크의 상체',difficulty:'국제'},
 {id:'tko',name:'Team Liquid',short:'TL',color:'#1f3a93',base:70,city:'LOS ANGELES',desc:'코어장전이 이끄는 북미 1황',difficulty:'국제'},
 {id:'hcm',name:'FlyQuest',short:'FLY',color:'#1eae53',base:66,city:'SEATTLE',desc:'인스파이어드·브위포의 운영',difficulty:'국제'},
 {id:'sao',name:'PSG Talon',short:'PSG',color:'#c99a3a',base:65,city:'TAIPEI',desc:'메이플·베티의 태평양 대표',difficulty:'국제'},
];

const starter=(handle:string,realName:string|undefined,role:Role,note?:string):RosterPlayer=>({handle,realName,role,status:'starter',note});
const bench=(handle:string,realName:string|undefined,role:Role,note?:string):RosterPlayer=>({handle,realName,role,status:'bench',note});
const OPGG_2026CUP='OP.GG Esports LCK 2026 Cup player stats (esports.op.gg/leagues/LCK/2026, "선수 통계" tab, per-role filter, browser-verified 2026-09-17; covers 41 Group Stage games, 2026-08-29~2026-09-14)';
const ROMAN_ONLY='실명은 OP.GG 로마자 표기만 확인(한글 표기 컬럼 없음). 성(姓)은 로마자화가 사실상 1:1이라 신뢰도가 높지만, 이름은 여러 한글 표기가 가능해 추정하지 않고 로마자 그대로 저장함(REAL_ROSTER_AUDIT.md §9).';

// LCK. Every team below is `confirmedAt:'2026-09-17'`, sourced from OP.GG's own LCK 2026
// Cup Group Stage player-stats table (see OPGG_2026CUP above) — each player's actual start
// in the most recent completed LCK competition, not a roster-page claim. This pass replaces
// the 2026-09-16 Oracle's-Elixir-derived version wholesale rather than patching it, because
// several of that version's team assignments turned out to be wrong (see file header) —
// patching field-by-field risked leaving stale cross-references. Where a handle's real name
// here matches what the pre-existing file already had (independently corroborated, not just
// carried over), the Hangul is kept; otherwise `realName` is the OP.GG romanized string
// (ROMAN_ONLY note). Two players are genuinely contested this stage — Ghost/Pollu at KT and
// Peter/Life at DNS both have real, similar-sized game counts at SUP — kept as starter+bench.
export const LCK_ROSTER: Record<string, TeamRosterEntry> = {
 nva:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Doran','최현준','TOP'),starter('Oner','문현준','JGL'),starter('Faker','이상혁','MID'),starter('Peyz','김수환','ADC','2026 스프링까지 JDG(LPL) 소속이던 선수 — INTL_ROSTER의 jdx 항목과 동일 인물, 새로 만들지 않고 실명을 그대로 가져옴'),starter('Keria','류민석','SUP')]},
 crn:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Kiin','김기인','TOP'),starter('Canyon','김건부','JGL'),starter('Chovy','정지훈','MID'),starter('Ruler','박재혁','ADC'),starter('Duro','주민규','SUP','OP.GG 로마자 표기 "Min-kyu Joo"가 기존 코드값 "주민규"와 정확히 일치 — 이전 감사에서 검색 요약이 보고했던 "김민규"는 오정보였음이 이번에 확인됨(REAL_ROSTER_AUDIT.md §9)')]},
 blz:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Zeus','최우제','TOP'),starter('Kanavi','서진혁','JGL','2026 스프링까지 JDG(LPL) 소속 — INTL_ROSTER의 jdx 항목과 동일 인물, 실명을 그대로 가져옴. Peanut은 병역 등으로 이탈(검색 단서, 미검증)'),starter('Zeka','김건우','MID'),starter('Gumayusi','이민형','ADC','T1에서 이적 — 같은 사람, 새로 만들지 않음'),starter('Delight','유환중','SUP')]},
 pnt:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Siwoo','Jeon Si-woo','TOP','정정: 기존 코드값 "송시우"(Song)는 오류 — OP.GG는 성을 "Jeon"(전)으로 확인. '+ROMAN_ONLY),starter('Lucid','최용혁','JGL'),starter('ShowMaker','허수','MID'),starter('Smash','Shin Geum-jae','ADC',ROMAN_ONLY),starter('Career','Oh Hyeong-seok','SUP',ROMAN_ONLY)]},
 vtx:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,note:'2026-09-16 패스는 ADC를 Jiwoo, SUP을 Effort로 잘못 기록했음 — 이번 패스에서 정정(§9)',players:[starter('PerfecT','이승민','TOP'),starter('Cuzz','문우찬','JGL'),starter('Bdd','곽보성','MID'),starter('Aiming','김하람','ADC','이전 Dplus KIA 소속 — 같은 사람, 새로 만들지 않음. 2026-09-16 패스는 이 자리를 Jiwoo로 잘못 기록 — Jiwoo는 실제로는 Kiwoom DRX 소속(orl 참조)'),starter('Ghost','Jang Yong-jun','SUP',ROMAN_ONLY+' 2026-09-16 패스는 이 자리를 舊 BRION 소속 Effort로 잘못 기록 — Effort는 이번 스테이지 어느 팀의 선발/벤치 명단에도 없어 현재 상태 불명(§9), 추정으로 채우지 않고 제외'),bench('Pollu','Oh Dong-gyu','SUP','Ghost(9경기)와 게임 수가 비슷한(6경기) 로테이션 — 확정 주전이라 단정하지 않고 벤치로 표시. '+ROMAN_ONLY)]},
 orl:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,note:'DRX에서 Kiwoom DRX로 개명, 트라이코드도 DRX→KRX로 확인(TEAM_META 참조)',players:[starter('Rich','이재원','TOP','기존 코드값과 일치 — 2026-09-16 패스가 이 자리를 신규 이적생 "Frog"로 잘못 기록했음(§9)'),starter('Willer','Kim Jeong-hyeon','JGL',ROMAN_ONLY),starter('Ucal','Son Woo-hyeon','MID',ROMAN_ONLY),starter('Jiwoo','Jung Ji-woo','ADC','성이 "Jung"(정)으로 확인돼, 2026-09-16 패스가 이어받았던 "한지원"(Han) 표기와 불일치 — 舊 Nongshim 시절 Jiwoo와 동일인인지 미확인, 열린 항목으로 남김(§9). '+ROMAN_ONLY),starter('Andil','문관빈','SUP','기존 코드값과 일치(원본 파일에서부터 동일) — 이중 확인됨')]},
 flx:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Kingen','Hwang Seong-hoon','TOP',ROMAN_ONLY),starter('Sponge','Bae Young-jun','JGL',ROMAN_ONLY),starter('Scout','Lee Ye-chan','MID',ROMAN_ONLY),starter('Taeyoon','Kim Tae-yoon','ADC','2026-09-16 패스는 이 자리를 BNK FearX 소속으로 확정했었으나, 이번 더 최근 데이터는 Nongshim RedForce를 보여줌 — 날짜가 더 최신이라 이쪽을 채택(§9). '+ROMAN_ONLY),starter('Lehends','Son Si-woo','SUP',ROMAN_ONLY)]},
 wlv:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,note:'Kwangdong Freecs에서 DN SOOPers로 개명, 트라이코드도 KDF→DNS로 확인(TEAM_META 참조)',players:[starter('DuDu','이동주','TOP'),starter('Pyosik','홍창현','JGL','기존 코드값과 일치 — 원본 파일과 OP.GG 양쪽에서 확인된 이중 소스'),starter('Clozer','Lee Ju-hyeon','MID',ROMAN_ONLY),starter('deokdam','서대길','ADC','이전 KT Rolster 소속 — 같은 사람'),starter('Peter','정윤수','SUP','이전 Nongshim RedForce 소속 — 같은 사람'),bench('Life','Kim Jeong-min','SUP','Peter(8경기)와 게임 수가 비슷한(7경기) 로테이션 — 확정 주전이라 단정하지 않고 벤치로 표시. '+ROMAN_ONLY)]},
 ark:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,players:[starter('Clear','송현민','TOP'),starter('Raptor','Jeon Eo-jin','JGL','정정: 기존 코드값 "권지훈"(Kwon)은 오류 — OP.GG는 성을 "Jeon"(전)으로 확인. '+ROMAN_ONLY),starter('VicLa','Lee Dae-gwang','MID','정정: 기존 코드값 "가을"은 실명이 아닌 것으로 보임(오류) — OP.GG로 정정. '+ROMAN_ONLY),starter('Diable','Nam Dae-geun','ADC','정정: 2026-09-16 패스는 이 선수를 舊 BNK FearX 출신 "이창주"로 Nongshim 소속에 기록했으나, 이번 데이터는 실명·소속 모두 불일치 — BFX 소속에 새 실명으로 정정(§9). '+ROMAN_ONLY),starter('Kellin','김형규','SUP','이전 Kwangdong Freecs(현 DN SOOPers) 소속 — 같은 사람')]},
 rse:{confirmedAt:'2026-09-17',sourceUrl:OPGG_2026CUP,note:'OKSavingsBank BRION에서 HANJIN BRION으로 개명(TEAM_META 참조)',players:[starter('Casting','Shin Min-jae','TOP',ROMAN_ONLY),starter('GIDEON','Kim Min-seong','JGL','기존 파일의 "Gideon"(강영준)과 동일인 여부가 미확인이었으나, 이번에 성이 "Kim"(김)으로 확인돼 "강영준"(Kang)과 불일치 — 별개 인물로 결론(§9). '+ROMAN_ONLY),starter('Roamer','Cho Woo-jin','MID',ROMAN_ONLY),starter('Teddy','박진성','ADC','이전 DRX(현 Kiwoom DRX) 소속 — 같은 사람'),starter('Namgung','Namgung Seong-hoon','SUP',ROMAN_ONLY)]},
};

// International teams — same TeamRosterEntry shape as LCK_ROSTER so the two can share
// consuming code, per the instruction to build a common structure and expand into this
// after LCK is applied/verified. Contents are unchanged from before this audit and are
// equally unverified this session (out of scope this round — LCK first).
export const INTL_ROSTER: Record<string, TeamRosterEntry> = {
 drg:{players:[starter('Bin','陈泽彬','TOP'),starter('Xun','彭立勋','JGL'),starter('Knight','卓定','MID'),starter('Elk','赵嘉豪','ADC'),starter('ON','罗文君','SUP')]},
 jdx:{players:[starter('369','白家浩','TOP'),starter('Kanavi','서진혁','JGL'),starter('Yagao','曾奇','MID'),starter('Peyz','김수환','ADC'),starter('Missing','楼益豪','SUP')]},
 lnx:{players:[starter('Wayward','郑周军','TOP'),starter('Tian','高天亮','JGL'),starter('Rookie','宋义进','MID'),starter('JackeyLove','喻文波','ADC'),starter('Meiko','田野','SUP')]},
 vxg:{players:[starter('TheShy','강승록','TOP'),starter('Karsa','洪浩轩','JGL'),starter('Xiaohu','李元浩','MID'),starter('Light','王光宇','ADC'),starter('Crisp','刘青松','SUP')]},
 kng:{players:[starter('Flandre','李玄君','TOP'),starter('Tarzan','이승용','JGL'),starter('Shanks','王思佳','MID'),starter('Hope','王杰','ADC'),starter('Ycx','응차오','SUP')]},
 par:{players:[starter('Zika','陈梓宾','TOP'),starter('Jiejie','赵立杰','JGL'),starter('Cryin','王皓','MID'),starter('GALA','陈炜','ADC'),starter('Wink','黄天旭','SUP')]},
 ldn:{players:[starter('BrokenBlade','Sergen Çelik','TOP'),starter('SkewMond','Isaac Portmann','JGL'),starter('Caps','Rasmus Winther','MID'),starter('Hans Sama','Steven Liv','ADC'),starter('Labrov','Labros Papoutsakis','SUP')]},
 nyc:{players:[starter('Oscarinin','Óscar Muñoz','TOP'),starter('Razork','Iván Martín','JGL'),starter('Humanoid','Marek Brázda','MID'),starter('Upset','Elias Lipp','ADC'),starter('Mikyx','Mihael Mehle','SUP')]},
 lax:{players:[starter('Myrwn','Alejandro Villar','TOP'),starter('Elyoya','Javier Prades','JGL'),starter('Jojopyun','Joseph Pyun','MID'),starter('Carzzy','Matyáš Orság','ADC'),starter('Alvaro','Álvaro Fernández','SUP')]},
 tpe:{players:[starter('Canna','김창동','TOP'),starter('Yike','Mathias Ochoa','JGL'),starter('Saken','Lucas Fensterseifer','MID'),starter('Caliste','Sebastian Kabza','ADC'),starter('Targamas','Jérôme Stiévenart','SUP')]},
 tko:{players:[starter('Impact','정언영','TOP'),starter('UmTi','엄성현','JGL'),starter('APA','Eain Stearns','MID'),starter('Yeon','Sean Sung','ADC'),starter('CoreJJ','조용인','SUP')]},
 hcm:{players:[starter('Bwipo','Gabriël Rau','TOP'),starter('Inspired','Kacper Słoma','JGL'),starter('Quad','송수형','MID'),starter('Massu','Fahad Abdulmalek','ADC'),starter('Busio','Alan Cwalina','SUP')]},
 sao:{players:[starter('Azhi','沈廷宇','TOP'),starter('JunJia','蔡厉纮','JGL'),starter('Maple','黄义闵','MID'),starter('Betty','陆彦伟','ADC'),starter('Woody','邱柏翔','SUP')]},
};
