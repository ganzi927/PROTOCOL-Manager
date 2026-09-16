// Real-world identities for the Classic league, mapped onto the existing team ids so
// saved careers stay compatible. Player handles/names are used for flavour only; this is
// not licensed content, and no in-engine stat is derived from real match performance yet
// (see docs/claude/PLAYER_RATING_MODEL.md).
//
// Data baseline: 2026-09-16. See docs/claude/REAL_ROSTER_AUDIT.md for the full audit —
// in this environment, direct access to primary sources (Liquipedia, the LCK official
// site, team fandom wikis) was blocked (WebFetch returned 403/429/402 on every attempt).
// Only indirect search-engine summaries were reachable, several of which directly
// contradict each other (KT Rolster's ADC/SUP, "Taeyoon" appearing on two different
// teams). Rather than bake in unverified — and in places self-contradictory — leads as
// if they were confirmed, every roster entry below keeps the ORIGINAL pre-audit data and
// is explicitly tagged `confirmedAt: undefined` (= not verified against a primary source
// this session). `docs/claude/REAL_ROSTER_AUDIT.md` §6 lists what a human needs to
// resolve by opening a primary source directly; `docs/claude/DATA_UPDATE_GUIDE.md`
// explains how to fold a confirmed correction back into this file.

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

export const TEAM_META: TeamMeta[] = [
 {id:'nva',name:'T1',short:'T1',color:'#e4022e',base:82,desc:'월즈 3연패의 왕조, 페이커의 팀',city:'SEOUL',difficulty:'쉬움'},
 {id:'crn',name:'Gen.G',short:'GEN',color:'#d6a94a',base:83,desc:'정규시즌을 지배하는 우승 후보',city:'SEOUL',difficulty:'쉬움'},
 {id:'blz',name:'Hanwha Life Esports',short:'HLE',color:'#ff7a00',base:78,desc:'제우스·바이퍼를 앞세운 슈퍼팀',city:'SEOUL',difficulty:'보통'},
 {id:'pnt',name:'Dplus KIA',short:'DK',color:'#0a5cae',base:74,desc:'쇼메이커와 베릴의 노련한 운영',city:'SEOUL',difficulty:'보통'},
 {id:'vtx',name:'KT Rolster',short:'KT',color:'#d21f3c',base:72,desc:'비디디 중심의 단단한 미드-정글',city:'SEOUL',difficulty:'보통'},
 {id:'orl',name:'DRX',short:'DRX',color:'#3d7bff',base:64,desc:'플레이오프를 노리는 리빌딩',city:'BUSAN',difficulty:'어려움'},
 {id:'flx',name:'Nongshim RedForce',short:'NS',color:'#e11f2b',base:62,desc:'젊은 라인업의 폭발력',city:'SEOUL',difficulty:'어려움'},
 {id:'wlv',name:'Kwangdong Freecs',short:'KDF',color:'#1f9ad6',base:60,desc:'켈린이 이끄는 한타 팀',city:'SEOUL',difficulty:'어려움'},
 {id:'ark',name:'BNK FearX',short:'FOX',color:'#5a4bd6',base:57,desc:'비클라 중심의 변수 창출',city:'BUSAN',difficulty:'도전'},
 {id:'rse',name:'OKSavingsBank BRION',short:'BRO',color:'#f0b429',base:54,desc:'최하위에서 올라서는 가장 긴 여정',city:'SEOUL',difficulty:'도전'},
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

const starter=(handle:string,realName:string,role:Role,note?:string):RosterPlayer=>({handle,realName,role,status:'starter',note});

// LCK. Every team here is `confirmedAt: undefined` — see file header. REAL_ROSTER_AUDIT.md
// §2 has search-summary leads (transfers, possible team renames) for several of these
// teams that are NOT reflected here yet because they could not be verified against a
// primary source this session; folding a lead in without verification would mean storing
// an unconfirmed claim as if it were fact, which the roster audit explicitly avoids.
export const LCK_ROSTER: Record<string, TeamRosterEntry> = {
 nva:{players:[starter('Doran','최현준','TOP'),starter('Oner','문현준','JGL'),starter('Faker','이상혁','MID'),starter('Gumayusi','이민형','ADC'),starter('Keria','류민석','SUP')]},
 crn:{players:[starter('Kiin','김기인','TOP'),starter('Canyon','김건부','JGL'),starter('Chovy','정지훈','MID'),starter('Ruler','박재혁','ADC'),starter('Duro','주민규','SUP','감사 중 검색 요약은 실명을 "김민규"로 표기 — 코드값 "주민규"와 충돌, 미해결(REAL_ROSTER_AUDIT.md §6)')]},
 blz:{players:[starter('Zeus','최우제','TOP'),starter('Peanut','한왕호','JGL'),starter('Zeka','김건우','MID'),starter('Viper','박도현','ADC'),starter('Delight','유환중','SUP')]},
 pnt:{players:[starter('Siwoo','송시우','TOP'),starter('Lucid','최용혁','JGL'),starter('ShowMaker','허수','MID'),starter('Aiming','김하람','ADC'),starter('BeryL','조건희','SUP')]},
 vtx:{players:[starter('PerfecT','이승민','TOP'),starter('Cuzz','문우찬','JGL'),starter('Bdd','곽보성','MID'),starter('deokdam','서대길','ADC'),starter('Way','조용인','SUP')]},
 orl:{players:[starter('Rich','이재원','TOP'),starter('Juhan','이주한','JGL'),starter('SeTab','박세훈','MID'),starter('Teddy','박진성','ADC'),starter('Andil','문관빈','SUP')]},
 flx:{players:[starter('DnDn','박근우','TOP'),starter('Sylvie','이승복','JGL'),starter('Fisher','김정후','MID'),starter('Jiwoo','한지원','ADC'),starter('Peter','정윤수','SUP')]},
 wlv:{players:[starter('DuDu','이동주','TOP'),starter('Pyosik','홍창현','JGL'),starter('BuLLDoG','이태영','MID'),starter('Envyy','이명준','ADC'),starter('Kellin','김형규','SUP')]},
 ark:{players:[starter('Clear','송현민','TOP'),starter('Raptor','권지훈','JGL'),starter('VicLa','가을','MID'),starter('Diable','이창주','ADC'),starter('Kael','김진홍','SUP')]},
 rse:{players:[starter('Morgan','박기태','TOP'),starter('Gideon','강영준','JGL'),starter('Karis','김홍조','MID'),starter('Hena','박증환','ADC'),starter('Effort','이상호','SUP')]},
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
