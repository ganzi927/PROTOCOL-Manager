import type {Role} from './game.ts';

// Fictional Classic league roster rendered with real champion names for flavour.
// Not licensed content. `type`: AD / AP / 혼합. `tags` drive tactic/composition logic
// in the engine: engage(이니시) · peel(보호) · poke(포킹) · scale(성장형).
export type ChampType = 'AD' | 'AP' | '혼합';
export type ChampTag = 'engage' | 'peel' | 'poke' | 'scale';
export type Champion = {id: string; name: string; role: Role; type: ChampType; tags: ChampTag[]; flex: Role[]};

// Secondary lines a champion is played in without an off-role penalty (id = prefix + slug).
const FLEX: Record<string, Role[]> = {
 Tgwen: ['MID'], Tkennen: ['MID'], Tpantheon: ['SUP', 'MID'], Tsett: ['SUP'], Tkayle: ['MID'],
 Tcamille: ['JGL'], Tvolibear: ['JGL'], Ttrundle: ['JGL'], Tksante: [], Tjax: ['JGL'],
 Jleesin: ['TOP'], Jgraves: ['TOP', 'ADC'], Jkindred: ['ADC'], Jnidalee: ['TOP', 'MID'], Jwarwick: ['TOP'],
 Jpoppy: ['TOP', 'SUP'], Jzac: ['TOP', 'SUP'], Jamumu: ['SUP'], Jivern: ['SUP'], Jgragas: ['SUP', 'TOP', 'MID'],
 Jmaokai: ['SUP', 'TOP'], Jsejuani: ['TOP'], Jshaco: ['SUP'],
 Makali: ['TOP'], Msylas: ['TOP', 'JGL'], Myasuo: ['TOP', 'ADC'], Myone: ['TOP'], Mgalio: ['SUP'],
 Mswain: ['SUP', 'ADC'], Mlux: ['SUP'], Mvelkoz: ['SUP'], Mxerath: ['SUP'], Mtwistedfate: ['ADC'],
 Mcorki: ['ADC'], Mneeko: ['SUP'], Mvex: ['SUP'], Mryze: ['TOP'], Mdiana: ['JGL'], Mahri: ['SUP'],
 Aquinn: ['TOP'], Asenna: ['SUP'], Aezreal: ['MID'], Aashe: ['SUP'], Akalista: ['SUP'],
 Amissfortune: ['SUP'], Aakshan: ['MID', 'TOP'],
 Sseraphine: ['MID', 'ADC'], Skarma: ['MID'], Smorgana: ['MID'], Sannie: ['MID'], Szilean: ['MID'],
 Staric: ['TOP'], Spyke: ['MID'], Sgragas: ['JGL', 'TOP', 'MID'], Smaokai: ['TOP', 'JGL'], Szyra: ['MID'],
 Sbraum: [], Sswain: ['MID'],
};

const mk = (list: [string, string, ChampType, ChampTag, ChampTag][], role: Role, prefix: string): Champion[] =>
 list.map(([id, name, type, t1, t2]) => ({id: prefix + id, name, role, type, tags: [t1, t2], flex: FLEX[prefix + id] ?? []}));

const TOP = mk([
 ['garen', '가렌', 'AD', 'engage', 'scale'],
 ['darius', '다리우스', 'AD', 'engage', 'scale'],
 ['nasus', '나서스', 'AD', 'scale', 'peel'],
 ['ornn', '오른', '혼합', 'engage', 'peel'],
 ['malphite', '말파이트', 'AP', 'engage', 'peel'],
 ['shen', '쉔', 'AD', 'engage', 'peel'],
 ['sion', '사이온', 'AD', 'engage', 'scale'],
 ['renekton', '레넥톤', 'AD', 'engage', 'scale'],
 ['jax', '잭스', '혼합', 'scale', 'engage'],
 ['fiora', '피오라', 'AD', 'scale', 'poke'],
 ['camille', '카밀', 'AD', 'engage', 'scale'],
 ['aatrox', '아트록스', 'AD', 'engage', 'scale'],
 ['sett', '세트', 'AD', 'engage', 'peel'],
 ['urgot', '우르곳', 'AD', 'scale', 'peel'],
 ['kennen', '켄넨', 'AP', 'engage', 'poke'],
 ['teemo', '티모', 'AP', 'poke', 'scale'],
 ['gwen', '그웬', 'AP', 'scale', 'peel'],
 ['kayle', '케일', '혼합', 'scale', 'poke'],
 ['yorick', '요릭', 'AD', 'scale', 'peel'],
 ['trundle', '트런들', 'AD', 'engage', 'scale'],
 ['volibear', '볼리베어', '혼합', 'engage', 'scale'],
 ['chogath', '초가스', 'AP', 'scale', 'peel'],
 ['mundo', '문도 박사', 'AD', 'scale', 'peel'],
 ['gangplank', '갱플랭크', 'AD', 'poke', 'scale'],
 ['ksante', '크산테', '혼합', 'engage', 'peel'],
 ['pantheon', '판테온', 'AD', 'engage', 'poke'],
 ['riven', '리븐', 'AD', 'engage', 'scale'],
 ['kled', '클레드', 'AD', 'engage', 'scale'],
 ['olaf', '올라프', 'AD', 'engage', 'scale'],
 ['tryndamere', '트린다미어', 'AD', 'scale', 'engage'],
], 'TOP', 'T');

const JGL = mk([
 ['leesin', '리 신', 'AD', 'engage', 'poke'],
 ['jarvan', '자르반 4세', 'AD', 'engage', 'peel'],
 ['sejuani', '세주아니', '혼합', 'engage', 'peel'],
 ['zac', '자크', 'AP', 'engage', 'peel'],
 ['amumu', '아무무', 'AP', 'engage', 'peel'],
 ['vi', '바이', 'AD', 'engage', 'scale'],
 ['khazix', '카직스', 'AD', 'poke', 'scale'],
 ['rengar', '렝가', 'AD', 'engage', 'scale'],
 ['nidalee', '니달리', '혼합', 'poke', 'scale'],
 ['graves', '그레이브즈', 'AD', 'poke', 'scale'],
 ['kindred', '킨드레드', 'AD', 'poke', 'scale'],
 ['elise', '엘리스', 'AP', 'engage', 'poke'],
 ['karthus', '카서스', 'AP', 'poke', 'scale'],
 ['masteryi', '마스터 이', 'AD', 'scale', 'engage'],
 ['warwick', '워윅', '혼합', 'engage', 'scale'],
 ['nocturne', '녹턴', 'AD', 'engage', 'scale'],
 ['hecarim', '헤카림', 'AD', 'engage', 'scale'],
 ['xinzhao', '신 짜오', 'AD', 'engage', 'peel'],
 ['reksai', '렉사이', 'AD', 'engage', 'scale'],
 ['udyr', '우디르', '혼합', 'scale', 'engage'],
 ['evelynn', '이블린', 'AP', 'engage', 'scale'],
 ['shaco', '샤코', '혼합', 'engage', 'poke'],
 ['lillia', '릴리아', 'AP', 'engage', 'poke'],
 ['viego', '비에고', 'AD', 'engage', 'scale'],
 ['belveth', '벨베스', 'AD', 'scale', 'engage'],
 ['briar', '브라이어', 'AD', 'engage', 'scale'],
 ['poppy', '뽀삐', 'AD', 'engage', 'peel'],
 ['ivern', '아이번', 'AP', 'peel', 'scale'],
 ['skarner', '스카너', 'AD', 'engage', 'peel'],
], 'JGL', 'J');

const MID = mk([
 ['ahri', '아리', 'AP', 'poke', 'engage'],
 ['zed', '제드', 'AD', 'engage', 'scale'],
 ['yasuo', '야스오', 'AD', 'engage', 'scale'],
 ['yone', '요네', '혼합', 'engage', 'scale'],
 ['syndra', '신드라', 'AP', 'poke', 'scale'],
 ['orianna', '오리아나', 'AP', 'poke', 'peel'],
 ['azir', '아지르', 'AP', 'poke', 'scale'],
 ['leblanc', '르블랑', 'AP', 'engage', 'poke'],
 ['talon', '탈론', 'AD', 'engage', 'poke'],
 ['katarina', '카타리나', 'AP', 'engage', 'scale'],
 ['akali', '아칼리', '혼합', 'engage', 'scale'],
 ['galio', '갈리오', 'AP', 'engage', 'peel'],
 ['viktor', '빅토르', 'AP', 'poke', 'scale'],
 ['velkoz', '벨코즈', 'AP', 'poke', 'scale'],
 ['lux', '럭스', 'AP', 'poke', 'peel'],
 ['xerath', '제라스', 'AP', 'poke', 'scale'],
 ['twistedfate', '트위스티드 페이트', 'AP', 'poke', 'engage'],
 ['corki', '코르키', '혼합', 'poke', 'scale'],
 ['cassiopeia', '카시오페아', 'AP', 'poke', 'scale'],
 ['swain', '스웨인', 'AP', 'engage', 'scale'],
 ['malzahar', '말자하', 'AP', 'scale', 'peel'],
 ['anivia', '아니비아', 'AP', 'poke', 'scale'],
 ['zoe', '조이', 'AP', 'poke', 'scale'],
 ['sylas', '사일러스', 'AP', 'engage', 'scale'],
 ['vex', '벡스', 'AP', 'engage', 'poke'],
 ['neeko', '니코', 'AP', 'engage', 'poke'],
 ['aurelionsol', '아우렐리온 솔', 'AP', 'poke', 'scale'],
 ['ryze', '라이즈', 'AP', 'scale', 'poke'],
 ['kassadin', '카사딘', 'AP', 'scale', 'engage'],
 ['diana', '다이애나', 'AP', 'engage', 'scale'],
], 'MID', 'M');

const ADC = mk([
 ['caitlyn', '케이틀린', 'AD', 'poke', 'scale'],
 ['ezreal', '이즈리얼', '혼합', 'poke', 'scale'],
 ['jhin', '진', 'AD', 'poke', 'scale'],
 ['ashe', '애쉬', 'AD', 'poke', 'engage'],
 ['varus', '바루스', '혼합', 'poke', 'scale'],
 ['kaisa', '카이사', '혼합', 'scale', 'poke'],
 ['jinx', '징크스', 'AD', 'scale', 'poke'],
 ['missfortune', '미스 포츈', 'AD', 'poke', 'scale'],
 ['tristana', '트리스타나', 'AD', 'scale', 'poke'],
 ['vayne', '베인', 'AD', 'scale', 'peel'],
 ['kogmaw', '코그모', '혼합', 'scale', 'poke'],
 ['twitch', '트위치', 'AD', 'scale', 'poke'],
 ['sivir', '시비르', 'AD', 'poke', 'scale'],
 ['lucian', '루시안', 'AD', 'poke', 'scale'],
 ['samira', '사미라', 'AD', 'engage', 'scale'],
 ['aphelios', '아펠리오스', 'AD', 'poke', 'scale'],
 ['xayah', '자야', 'AD', 'scale', 'peel'],
 ['draven', '드레이븐', 'AD', 'scale', 'poke'],
 ['kalista', '칼리스타', 'AD', 'poke', 'engage'],
 ['zeri', '제리', 'AD', 'scale', 'poke'],
 ['smolder', '스몰더', 'AD', 'scale', 'poke'],
 ['senna', '세나', 'AD', 'poke', 'scale'],
 ['quinn', '퀸', 'AD', 'poke', 'scale'],
 ['akshan', '아크샨', 'AD', 'poke', 'scale'],
 ['nilah', '닐라', 'AD', 'engage', 'scale'],
], 'ADC', 'A');

const SUP = mk([
 ['thresh', '쓰레쉬', '혼합', 'engage', 'peel'],
 ['leona', '레오나', '혼합', 'engage', 'peel'],
 ['nautilus', '노틸러스', 'AP', 'engage', 'peel'],
 ['blitzcrank', '블리츠크랭크', 'AP', 'engage', 'peel'],
 ['pyke', '파이크', 'AD', 'engage', 'poke'],
 ['lulu', '룰루', 'AP', 'peel', 'scale'],
 ['janna', '자나', 'AP', 'peel', 'scale'],
 ['soraka', '소라카', 'AP', 'peel', 'scale'],
 ['yuumi', '유미', 'AP', 'peel', 'scale'],
 ['nami', '나미', 'AP', 'peel', 'poke'],
 ['karma', '카르마', 'AP', 'poke', 'peel'],
 ['morgana', '모르가나', 'AP', 'engage', 'peel'],
 ['braum', '브라움', '혼합', 'engage', 'peel'],
 ['alistar', '알리스타', '혼합', 'engage', 'peel'],
 ['taric', '타릭', '혼합', 'engage', 'peel'],
 ['rakan', '라칸', 'AP', 'engage', 'peel'],
 ['milio', '밀리오', 'AP', 'peel', 'scale'],
 ['rell', '렐', 'AP', 'engage', 'peel'],
 ['sona', '소나', 'AP', 'peel', 'poke'],
 ['bard', '바드', 'AP', 'poke', 'peel'],
 ['zyra', '자이라', 'AP', 'poke', 'engage'],
 ['annie', '애니', 'AP', 'engage', 'poke'],
 ['maokai', '마오카이', 'AP', 'engage', 'peel'],
 ['seraphine', '세라핀', 'AP', 'poke', 'peel'],
 ['zilean', '질리언', 'AP', 'peel', 'poke'],
 ['gragas', '그라가스', 'AP', 'engage', 'peel'],
], 'SUP', 'S');

export const CHAMPIONS: Champion[] = [...TOP, ...JGL, ...MID, ...ADC, ...SUP];

export const TAG_LABEL: Record<ChampTag, string> = {
 engage: '이니시', peel: '보호', poke: '포킹', scale: '성장형',
};

// Champion square portrait from Community Dragon's `latest` alias (never version-stale).
// Slug is the champion id minus its role-prefix letter; a few need the canonical alias.
const CD_ALIAS: Record<string, string> = {mundo: 'drmundo', jarvan: 'jarvaniv'};
export const champImageUrl = (id: string): string => {
 const slug = id.replace(/^[TJMAS]/, '').toLowerCase();
 return `https://cdn.communitydragon.org/latest/champion/${CD_ALIAS[slug] ?? slug}/square`;
};
