// Real-world identities for the Classic league, mapped onto the existing team ids so
// saved careers stay compatible. LCK 2026 + international rosters are a best-effort
// approximation as of early 2026 — bench and lower-table lineups are easy to correct here.
// Player handles/names are used for flavour only; this is not licensed content.

export type TeamMeta = {id:string;name:string;short:string;color:string;base:number;desc:string;city:string;difficulty:string;logo?:string};

// Optional per-team logo URL (any reachable image). Left mostly empty — reliable free
// hosting for all 23 org logos isn't available; drop a URL here and the emblem uses it,
// otherwise it falls back to the brand-coloured short code.
export const TEAM_LOGO: Record<string,string> = {
 nva: 'https://liquipedia.net/leagueoflegends/Special:FilePath/T1logo_std.png',
};

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

// [handle, 실명] in ROLES order: TOP, JGL, MID, ADC, SUP
type Line = [string,string];
export const LCK_ROSTER: Record<string,Line[]> = {
 nva:[['Doran','최현준'],['Oner','문현준'],['Faker','이상혁'],['Gumayusi','이민형'],['Keria','류민석']],
 crn:[['Kiin','김기인'],['Canyon','김건부'],['Chovy','정지훈'],['Ruler','박재혁'],['Duro','주민규']],
 blz:[['Zeus','최우제'],['Peanut','한왕호'],['Zeka','김건우'],['Viper','박도현'],['Delight','유환중']],
 pnt:[['Siwoo','송시우'],['Lucid','최용혁'],['ShowMaker','허수'],['Aiming','김하람'],['BeryL','조건희']],
 vtx:[['PerfecT','이승민'],['Cuzz','문우찬'],['Bdd','곽보성'],['deokdam','서대길'],['Way','조용인']],
 orl:[['Rich','이재원'],['Juhan','이주한'],['SeTab','박세훈'],['Teddy','박진성'],['Andil','문관빈']],
 flx:[['DnDn','박근우'],['Sylvie','이승복'],['Fisher','김정후'],['Jiwoo','한지원'],['Peter','정윤수']],
 wlv:[['DuDu','이동주'],['Pyosik','홍창현'],['BuLLDoG','이태영'],['Envyy','이명준'],['Kellin','김형규']],
 ark:[['Clear','송현민'],['Raptor','권지훈'],['VicLa','가을'],['Diable','이창주'],['Kael','김진홍']],
 rse:[['Morgan','박기태'],['Gideon','강영준'],['Karis','김홍조'],['Hena','박증환'],['Effort','이상호']],
};

export const INTL_ROSTER: Record<string,Line[]> = {
 drg:[['Bin','陈泽彬'],['Xun','彭立勋'],['Knight','卓定'],['Elk','赵嘉豪'],['ON','罗文君']],
 jdx:[['369','白家浩'],['Kanavi','서진혁'],['Yagao','曾奇'],['Peyz','김수환'],['Missing','楼益豪']],
 lnx:[['Wayward','郑周军'],['Tian','高天亮'],['Rookie','宋义进'],['JackeyLove','喻文波'],['Meiko','田野']],
 vxg:[['TheShy','강승록'],['Karsa','洪浩轩'],['Xiaohu','李元浩'],['Light','王光宇'],['Crisp','刘青松']],
 kng:[['Flandre','李玄君'],['Tarzan','이승용'],['Shanks','王思佳'],['Hope','王杰'],['Ycx','응차오']],
 par:[['Zika','陈梓宾'],['Jiejie','赵立杰'],['Cryin','王皓'],['GALA','陈炜'],['Wink','黄天旭']],
 ldn:[['BrokenBlade','Sergen Çelik'],['SkewMond','Isaac Portmann'],['Caps','Rasmus Winther'],['Hans Sama','Steven Liv'],['Labrov','Labros Papoutsakis']],
 nyc:[['Oscarinin','Óscar Muñoz'],['Razork','Iván Martín'],['Humanoid','Marek Brázda'],['Upset','Elias Lipp'],['Mikyx','Mihael Mehle']],
 lax:[['Myrwn','Alejandro Villar'],['Elyoya','Javier Prades'],['Jojopyun','Joseph Pyun'],['Carzzy','Matyáš Orság'],['Alvaro','Álvaro Fernández']],
 tpe:[['Canna','김창동'],['Yike','Mathias Ochoa'],['Saken','Lucas Fensterseifer'],['Caliste','Sebastian Kabza'],['Targamas','Jérôme Stiévenart']],
 tko:[['Impact','정언영'],['UmTi','엄성현'],['APA','Eain Stearns'],['Yeon','Sean Sung'],['CoreJJ','조용인']],
 hcm:[['Bwipo','Gabriël Rau'],['Inspired','Kacper Słoma'],['Quad','송수형'],['Massu','Fahad Abdulmalek'],['Busio','Alan Cwalina']],
 sao:[['Azhi','沈廷宇'],['JunJia','蔡厉纮'],['Maple','黄义闵'],['Betty','陆彦伟'],['Woody','邱柏翔']],
};
