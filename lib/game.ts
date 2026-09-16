import {random,hash} from './rng.ts';
import {travelSeconds} from './simulation/arena.ts';
import {temperamentOf, labelOf as temperamentLabelOf, shortLabelOf as temperamentShortLabelOf, TEMPERAMENT_LABEL, TEMPERAMENT_BALANCED_BAND, type Temperament, type TemperamentAxis} from './players/temperament.ts';
export {temperamentOf, temperamentLabelOf, temperamentShortLabelOf, TEMPERAMENT_LABEL, TEMPERAMENT_BALANCED_BAND, type Temperament, type TemperamentAxis};
import {CHALLENGES, startChallenge, recordObservation, successRate as challengeSuccessRate, type ChallengeId, type ChallengeProgress} from './players/challenges.ts';
export {CHALLENGES, startChallenge, recordObservation, challengeSuccessRate, type ChallengeId, type ChallengeProgress};
import {CHAMPIONS, TAG_LABEL, champImageUrl, type Champion, type ChampTag, type ChampType} from './champions.ts';
import {TEAM_META, FOREIGN_META, TEAM_LOGO, LCK_ROSTER, INTL_ROSTER} from './rosters.ts';
import {draftEffects,compositionPlan,draftFitScore} from './balance/composition.ts';
import {narrateEvent, newNarrMemory, type Beat, type Tier} from './simulation/narration.ts';
import {newMatchState, resolveGank, resolveBotLane, resolveObjective, resolveTeamfight, resolveSiege, type CombatEvent, type Side, type DirectorBonus} from './simulation/combat.ts';
export {CHAMPIONS, TAG_LABEL, champImageUrl, TEAM_META, FOREIGN_META, TEAM_LOGO};
export type {Champion, ChampTag, ChampType};
export const ROLES = ['TOP','JGL','MID','ADC','SUP'] as const;
export type Role = typeof ROLES[number];
export const STAT_KEYS = ['LNE','TF','OBJ','VIS','MEC','CAR'] as const;
export const STAT_NAMES = ['라인전','한타','오브젝트','시야','메커닉','캐리'];
export const TACTICS = [
 {id:'balanced',name:'균형 운영',desc:'모든 구간에 고르게 힘을 배분합니다.',bonus:[0,0,0]},
 {id:'early',name:'초반 압박',desc:'라인 +3 · 오브젝트 +1 · 한타 −3',bonus:[3,1,-3]},
 {id:'objective',name:'오브젝트 운영',desc:'라인 −1 · 오브젝트 +3 · 한타 −1',bonus:[-1,3,-1]},
 {id:'late',name:'후반 집중',desc:'라인 −3 · 오브젝트 −1 · 한타 +3',bonus:[-3,-1,3]},
];
export const TRAININGS = [
 {id:'practice',name:'개인 연습',desc:'라인전·메커닉 성장',burn:5},
 {id:'scrim',name:'팀 스크림',desc:'한타·운영 성장, 호흡 +4',burn:4},
 {id:'analysis',name:'전략 분석',desc:'다음 매치 밴픽 판단 개선',burn:2},
 {id:'champ',name:'챔피언 특훈',desc:'지정 챔피언 숙련 경험치 상승',burn:4},
 {id:'rest',name:'휴식',desc:'번아웃 −16 · 폼 +3',burn:-16},
];
export const STAFF = [{id:'coach',name:'육성 코치',description:'선수 성장량 +10% / +20% / +30%'},{id:'analyst',name:'전력 분석가',description:'자동 밴픽 판단 오차 50% / 75% / 87.5% 감소'},{id:'psych',name:'심리 코치',description:'휴식 번아웃 회복 +3 / +6 / +9'}];
export const STAFF_COST=[0,15000,30000,50000];
export const domestic=(t:{id:string})=>TEAM_META.some(m=>m.id===t.id);
export type International={kind:'MIDSEASON'|'WORLD',stage:'SWISS'|'BRACKET'|'DONE',round:number,participants:string[],table:{id:string,wins:number,losses:number,opponents:string[]}[],queue:Match[],matches:Match[],bracket:string[],champion?:string};
export type Mastery={champ:string,level:number,xp:number};
export const MASTERY_CAP=4,MASTERY_XP=100,MASTERY_POOL=8;
export type Player={id:string,name:string,realName:string,role:Role,teamId:string|null,age:number,stats:number[],pot:number[],form:number,burn:number,salary:number,until:number,training:string,trainChamp?:string,mastery:Mastery[],pog:number,growth:number,nextSalary?:number,nextUntil?:number,releasedSeason?:number,kills?:number,deaths?:number,assists?:number,challenge?:ChallengeProgress};
export type Team={id:string,lineup:Record<Role,string>,familiarity:Record<string,number>,cash:number,fan:number,expected:number,tactic:string,focus:string,wins:number,losses:number,sw:number,sl:number,points:number,staff?:Record<string,number>,bailouts?:number};
export type Draft={picksA:string[],picksB:string[],bans:string[],actions:{team:string,kind:string,champ:string}[]};
export type DraftPick={champ:string,role:Role};
export type DraftState={blue:string,red:string,step:number,bans:{side:'B'|'R',champ:string}[],picksBlue:DraftPick[],picksRed:DraftPick[],actions:{team:string,kind:string,champ:string}[],complete:boolean};
export type GameEvent={index:number,phase:string,title:string,winner:string,edge?:string,prob:number,advantage:number,powerA:number,powerB:number,goldA:number,goldB:number,detail:string,leadA?:number,resPowA?:number,compA?:number,beats?:Beat[],tier?:Tier,kills?:{a:number,b:number},combat?:CombatEvent};
export type CapDiag={reason:'TIME'|'EVENT',clock:number,events:number,structDealt:[number,number],baseTurrets:[number,number],inhibsOpen:[number,number],recentSiegeFails:string[],tiebreakStage:'struct'|'pressure'|'advantage'|'coin'};
export type SetResult={winner:string,endReason?:'NEXUS'|'CAP_TIME'|'CAP_EVENT',capDiag?:CapDiag,events:GameEvent[],draft:Draft,recap:string[],pog:string,pogReason?:string,powersA:number[],powersB:number[],lineupA:string[],lineupB:string[],leadA?:number[],draftFx?:{lane:number,obj:number,fight:number},firstStructTeam?:string};
export type TacticalChoice='prepare'|'trade'|'regroup'|'protect'|'allin';
export type TacticalState={previewEvents:GameEvent[]};
export type Match={id:string,a:string,b:string,bestOf:number,scoreA:number,scoreB:number,sets:SetResult[],winner?:string,draft?:Draft,draftState?:DraftState,tacticalState?:TacticalState,label:string};
export type RecordMatch={id:string,a:string,b:string,sa:number,sb:number,winner:string,label:string,season:number};
// F16: 스카우팅 표본. 세트 하나당 한 팀 관점으로 하나 — 원본 사건(events/recap) 전체가 아니라
// "다음 상대 준비"에 실제 쓰이는 요약값만 남긴다(저장 용량 무한 증가 방지, 팀당 최근 SCOUT_CAP개만 보존).
export type SetScout={season:number,picks:string[],oppPicks:string[],won:boolean,endReason?:'NEXUS'|'CAP_TIME'|'CAP_EVENT',tookFirstStruct:boolean,objSecured:number,objTotal:number,leadSlots:number[],pogRole?:string};
export const SCOUT_CAP=15;
// F17: 훈련 이력. 선수/조합(특훈이면 챔피언)/날짜(시즌·라운드)/강도(훈련 종류)/효과(실제 적용된 수치)를 남긴다
// — 사용자 팀만 기록한다(planNotice와 같은 범위). 팀당 최근 TRAINING_LOG_CAP개만 보존.
export type TrainingLogEntry={season:number,round:number,playerId:string,training:string,champ?:string,effect:string};
export const TRAINING_LOG_CAP=60;
export type Game={version:number,seed:number,season:number,split:'SPRING'|'SUMMER',round:number,stage:'REGULAR'|'PLAYOFF'|'INTERNATIONAL',phase:'PLAN'|'PREP'|'DRAFT'|'TACTICAL'|'RECAP'|'MATCH_END'|'SPLIT_END'|'OFFSEASON'|'WORLD_END',teamId:string,players:Player[],teams:Team[],fixtures:string[][][],match:Match|null,history:RecordMatch[],scout?:Record<string,SetScout[]>,trainingLog?:TrainingLogEntry[],news:string[],hall:{season:number,split:string,champion:string,rank:number}[],po:Match[],poSeeds:string[],champion:string|null,trained:boolean,offWeek:number,ledger:{label:string,amount:number}[],planNotice:string[],meta:string[],international?:International,settledWeeks?:number,sandbox?:boolean};
export type Command={type:string,payload?:Record<string,unknown>};
export const clamp=(v:number,a=0,b=100)=>Math.min(b,Math.max(a,v));
export const avg=(ns:number[])=>ns.reduce((a,b)=>a+b,0)/(ns.length||1);
export const ovr=(p:Player)=>Math.round(avg(p.stats));
export const kda=(p:Player)=>{const k=p.kills??0,d=p.deaths??0,a=p.assists??0;return d===0?k+a:(k+a)/d;};
export const money=(v:number)=>(v/10000).toFixed(2)+'억';
export const meta=(id:string)=>[...TEAM_META,...FOREIGN_META].find(t=>t.id===id)!;
export {random,hash};
const FALLBACK_CHAMP:Champion={id:'?',name:'미상',role:'MID',type:'혼합',tags:[],flex:[]};
export const champById=(id:string):Champion=>CHAMPIONS.find(c=>c.id===id)??{...FALLBACK_CHAMP,id,name:id};
export const champName=(id:string):string=>champById(id).name;
export const masteryLevel=(p:Player,champId:string):number=>p.mastery?.find(m=>m.champ===champId)?.level??0;
// F19: 유망주 잠재력을 확정 숫자로 공개하지 않는다 — 스카우트 관측 범위(오차 포함)와 체감 육성 거리만
// 보여준다. 실제 성장 상한(p.pot, train()이 그대로 쓰는 숨은 값)은 이 함수가 노출하지 않는다. 화면에
// 보이는 범위 중심은 id 기반 결정적 오차를 더한 "추정치"일 뿐이라 진짜 pot과 다를 수 있다 — 재계산해도
// 항상 같은 값(구세이브를 불러올 때마다 다시 추첨되지 않음, temperament.ts와 같은 순수 함수 패턴).
// 나이가 어릴수록 오차 폭이 커진다(실전 표본이 적어 예측이 어렵다는 뜻) — "싼 유망주가 무조건 최선이
// 아니다"를 뒷받침하려고 devTier(육성 거리)를 함께 준다. 정확한 훈련 소요 주수는 계산하지 않는다 —
// train()의 실제 성장식은 스탯별 체감·훈련 종류·코치 보너스가 얽혀 있어 단일 숫자로 요약하면 거짓
// 정밀도가 된다(project-wide 원칙: 추상 수치를 실제 관측량처럼 표시하지 않는다).
export type ScoutEstimate={lo:number,hi:number,devTier:'가까움'|'보통'|'멂'};
export function scoutPotential(p:Player):ScoutEstimate{
 const err=random(hash(`${p.id}|scout|pot`))()*2-1; // -1~1, id 기반 결정적(재추첨 없음)
 const band=clamp(4+(25-p.age)*1.3,4,28); // 나이가 어릴수록 오차 폭 확대, 25세 근방부터 좁아짐
 const center=clamp(avg(p.pot)+err*band*0.6,avg(p.stats),99);
 const lo=Math.round(clamp(center-band*0.5,avg(p.stats),99));
 const hi=Math.round(clamp(center+band*0.5,avg(p.stats),99));
 const gap=hi-ovr(p);
 const devTier:ScoutEstimate['devTier']=gap<=6?'가까움':gap<=16?'보통':'멂';
 return {lo,hi,devTier};
}
// 한국어 조사 헬퍼는 중계로 이동했다 → lib/simulation/narration.ts
export const isMeta=(g:Game,champId:string):boolean=>!!g.meta?.includes(champId);
export function metaChampions(seed:number,season:number):string[]{
 const rng=random(hash(`${seed}|meta|${season}`));
 return ROLES.flatMap(role=>{
  const pool=CHAMPIONS.filter(c=>c.role===role).map(c=>({id:c.id,v:rng()})).sort((a,b)=>a.v-b.v);
  return pool.slice(0,2+(rng()<.5?1:0)).map(x=>x.id);
 });
}
// Starting tiers scale with player skill; nobody starts at MASTERY_CAP — Lv4 is earned
// only through match play and 챔피언 특훈 training.
function makeMastery(role:Role,seedId:string,base=64):Mastery[]{
 const rng=random(hash(seedId+'|mastery'));
 const pool=CHAMPIONS.filter(c=>c.role===role).map(c=>({id:c.id,v:rng()})).sort((a,b)=>a.v-b.v);
 const tier=base>=80?[3,3,2,2,1]:base>=70?[3,2,2,1,1]:base>=60?[2,2,1,1,1]:[2,1,1,1];
 return tier.map((level,i)=>({champ:pool[i%pool.length].id,level,xp:0}));
}
export function gainMastery(p:Player,champId:string,amount:number){
 if(!champId||amount<=0||!Array.isArray(p.mastery))return;
 let m=p.mastery.find(x=>x.champ===champId);
 if(!m){if(p.mastery.length>=MASTERY_POOL)return;m={champ:champId,level:0,xp:0};p.mastery.push(m);}
 if(m.level>=MASTERY_CAP){m.xp=0;return;}
 m.xp+=amount;
 while(m.xp>=MASTERY_XP&&m.level<MASTERY_CAP){m.xp-=MASTERY_XP;m.level++;}
 if(m.level>=MASTERY_CAP)m.xp=0;
}
const handles=['Orbit','Kite','Lucid','Aero','Mellow','Rook','Cloud','Zenith','Karma','Prism','Vega','Hush','Nero','Flux','Arden','Rift','Sable','Comet','Lyra','Vale','Frost','Dusk','Raven','Muse','Ash','Pulse','Rune','Atlas','Solar','Echo','Wave','Fable','Crest','Sonic','Bloom','Rain','Void','Iris','Blitz','Halo','Glide','Quill','Ember','Crux','Dawn','Myth','Scope','Tide','Nova','Wisp','Slate','Bolt','Arc','Onyx','Fawn','Cyan','Wolf','Peak','Lyric','Fate','Dune','Cove','Fern','Wren','Spark','Rex','Lynx','Nox','Zeal','Vow'];
function makePlayer(n:number,role:Role,teamId:string|null,base:number,season:number,rng:()=>number):Player{
 const r=ROLES.indexOf(role);const shapes=[[10,-4,0,-4,2,-4],[0,-2,10,-4,4,-8],[8,-4,-2,-4,4,-2],[-4,12,0,-6,4,-6],[-4,4,4,10,-6,-8]];
 const stats=shapes[r].map(d=>Math.round(clamp(base+d+(rng()-.5)*6,15,96)*100)/100);
 const id=`p${season}-${n}`;
 return {id,name:handles[n%handles.length]+(n>=70?String(season)+String(n-69):''),realName:['김','이','박','정','장'][n%5]+['도윤','시우','지호','민준','현우','서준','우진'][n%7],role,teamId,age:18+Math.floor(rng()*10),stats,pot:stats.map(s=>clamp(s+8+rng()*12,1,99)),form:50,burn:0,salary:Math.round(20000*(avg(stats)/50)**2),until:season+1,training:'scrim',mastery:makeMastery(role,id,base),pog:0,growth:0,kills:0,deaths:0,assists:0};
}
export function schedule(ids:string[]){const order=[...ids],a:string[][][]=[];for(let r=0;r<9;r++){a.push(Array.from({length:5},(_,i)=>r%2?[order[9-i],order[i]]:[order[i],order[9-i]]));order.splice(1,0,order.pop()!);}return [...a,...a.map(row=>row.map(([x,y])=>[y,x]))];}
export const team=(g:Game,id=g.teamId)=>g.teams.find(t=>t.id===id)!;
export const roster=(g:Game,id=g.teamId)=>g.players.filter(p=>p.teamId===id&&!p.id.startsWith('emergency'));
export const starters=(g:Game,id=g.teamId)=>ROLES.map(r=>g.players.find(p=>p.id===team(g,id).lineup[r]&&p.teamId===id)!).filter(Boolean);
const key=(t:Team)=>ROLES.map(r=>t.lineup[r]).join('|');
export const synergy=(g:Game,id=g.teamId)=>team(g,id).familiarity[key(team(g,id))]??20;
export const payroll=(g:Game,id=g.teamId)=>roster(g,id).reduce((a,p)=>a+p.salary,0);
// F20: "현금과 연봉 총액을 구분하고 예약된 계약을 포함한다" — payroll()은 이번 시즌 확정액만 본다.
// nextSeasonPayroll()은 재계약으로 예약된 다음 시즌 연봉(nextSalary)과, 예약이 없어도 계약이 남아
// 다음 시즌까지 유지되는 선수의 연봉을 더한다(계약이 이번 시즌에 끝나 FA로 풀리는 선수는 0으로 뺀다).
export const nextSeasonPayroll=(g:Game,id=g.teamId)=>roster(g,id).reduce((a,p)=>a+(p.nextSalary!==undefined?p.nextSalary:p.until>=g.season+1?p.salary:0),0);
// StaffCenter가 이미 쓰던 "연간 예상 운영 잔액" 공식(320000 기준값을 정산 주기 33회로 나눈 값이 매주
// 순수익)을 단일 함수로 옮겼다 — 계약 화면에서도 같은 수치를 보여주기 위함이지 새 공식을 만든 게 아니다.
export const annualBalance=(g:Game,id=g.teamId)=>{const t=team(g,id);return Math.round(320000+30000*t.fan/100-50000-payroll(g,id)-staffCost(t));};
export function standings(g:Game){return [...g.teams].filter(domestic).sort((a,b)=>b.wins-a.wins||(b.sw-b.sl)-(a.sw-a.sl)||head(a.id,b.id)||hash(g.seed+a.id)-hash(g.seed+b.id));function head(a:string,b:string){return g.history.filter(m=>m.season===g.season&&m.label.startsWith(g.split+' R')&&((m.a===a&&m.b===b)||(m.a===b&&m.b===a))).reduce((v,m)=>v+(m.winner===a?-1:1),0);}}
// F22: 시즌 서사 — g.history/standings/로스터의 실제 기록만 읽는다. 무작위 뉴스 문구를 새로 만들지
// 않고, 감지된 사실을 근거와 함께 그대로 문장으로 만든다("연승" 같은 표현도 실제 g.history 연속
// 승패에서만 나온다). "신인 성장"은 시즌 시작 시점 스탯 스냅샷이 없어 이번엔 만들지 않았다(다음 조각).
export type Storyline={kind:'streak'|'competition'|'rivalry'|'race',headline:string,detail:string};
export function seasonNarrative(g:Game,id=g.teamId):Storyline[]{
 const out:Storyline[]=[];
 const mine=g.history.filter(m=>m.season===g.season&&(m.a===id||m.b===id)); // unshift로 쌓여 인덱스0이 최신
 // 연승/연패: 최신 경기부터 같은 결과가 몇 번 이어지는지 센다.
 if(mine.length){
  const first=mine[0].winner===id;
  let n=0;for(const m of mine){if((m.winner===id)===first)n++;else break;}
  if(n>=3)out.push({kind:'streak',
   headline:first?`${n}연승 중`:`${n}연패 중`,
   detail:`최근 ${n}경기 ${first?'전승':'전패'} · 이번 시즌 전적 ${mine.filter(x=>x.winner===id).length}승 ${mine.filter(x=>x.winner!==id).length}패`});
 }
 // 라이벌전: 이번 시즌 2번 이상 맞붙은 상대 중 승패 차가 가장 작은(팽팽한) 상대.
 const oppTally=new Map<string,{w:number,l:number}>();
 for(const m of mine){const opp=m.a===id?m.b:m.a;const t=oppTally.get(opp)??{w:0,l:0};if(m.winner===id)t.w++;else t.l++;oppTally.set(opp,t);}
 let rival:string|null=null,rivalGap=Infinity,rivalTotal=0;
 for(const [opp,t] of oppTally){const total=t.w+t.l;if(total>=2){const gap=Math.abs(t.w-t.l);if(gap<rivalGap||(gap===rivalGap&&total>rivalTotal)){rival=opp;rivalGap=gap;rivalTotal=total;}}}
 if(rival){const t=oppTally.get(rival)!;out.push({kind:'rivalry',headline:`${meta(rival).short}와 라이벌전`,detail:`이번 시즌 ${t.w}승 ${t.l}패로 맞붙는 중`});}
 // 주전 경쟁: 같은 포지션 벤치 선수의 OVR이 현재 선발과 근접하거나 더 높다.
 const line=starters(g,id);
 for(const r of ROLES){
  const cur=line.find(p=>p.role===r);if(!cur)continue;
  const bench=roster(g,id).filter(p=>p.role===r&&p.id!==cur.id).sort((a,b)=>ovr(b)-ovr(a))[0];
  if(bench&&ovr(bench)>=ovr(cur)-2)out.push({kind:'competition',headline:`${r} 주전 경쟁`,detail:`선발 ${cur.name}(OVR ${ovr(cur)}) · ${bench.name}(OVR ${ovr(bench)})이 근접`});
 }
 // 플레이오프 경쟁: 정규시즌 중, 6위 컷과 승수 차가 1 이하.
 if(g.stage==='REGULAR'){
  const table=standings(g),cutIdx=5,myIdx=table.findIndex(t=>t.id===id);
  if(myIdx>=0&&table.length>cutIdx){
   const cutWins=table[cutIdx].wins,gap=table[myIdx].wins-cutWins;
   if(Math.abs(gap)<=1)out.push({kind:'race',
    headline:myIdx<=cutIdx?'플레이오프 진출권 경쟁':'플레이오프 탈락 위기',
    detail:`현재 ${myIdx+1}위(${table[myIdx].wins}승 ${table[myIdx].losses}패) · 6위 컷과 격차 ${Math.abs(gap)}승`});
  }
 }
 return out;
}
export function newGame(teamId:string,seed:number):Game{
 if(!TEAM_META.some(t=>t.id===teamId))throw Error('팀을 선택해 주세요.');
 const rng=random(seed),players:Player[]=[],teams:Team[]=[];
 TEAM_META.forEach((m,i)=>{const lineup={} as Record<Role,string>;for(let j=0;j<7;j++){const p=makePlayer(i*7+j,ROLES[j%5],m.id,m.base-(j>=5?17:0),1,rng);const rl=j<5?LCK_ROSTER[m.id]?.[j]:undefined;if(rl){p.name=rl[0];p.realName=rl[1];}players.push(p);if(j<5)lineup[p.role]=p.id;}const total=players.filter(p=>p.teamId===m.id).reduce((s,p)=>s+p.salary,0);if(total>240000)players.filter(p=>p.teamId===m.id).forEach(p=>p.salary=Math.floor(p.salary*240000/total));const t:Team={id:m.id,lineup,familiarity:{},cash:100000,fan:50,expected:1,tactic:i%3===0?'early':i%3===1?'late':'objective',focus:'MID',wins:0,losses:0,sw:0,sl:0,points:0};t.familiarity[key(t)]=40;teams.push(t);});
 const ranked=[...TEAM_META].sort((a,b)=>b.base-a.base);teams.forEach(t=>t.expected=ranked.findIndex(m=>m.id===t.id)+1);
 for(let i=0;i<15;i++)players.push(makePlayer(70+i,ROLES[i%5],null,48+rng()*18,1,rng));
 return {version:1,seed,season:1,split:'SPRING',round:0,stage:'REGULAR',phase:'PLAN',teamId,players,teams,fixtures:schedule(teams.filter(domestic).map(t=>t.id)),match:null,history:[],news:['감독으로 부임했습니다. 이번 시즌의 첫 주간 훈련을 선택하세요.','Classic 리그: 정규시즌 18경기 · Bo3 · 상위 6팀 플레이오프'],hall:[],po:[],poSeeds:[],champion:null,trained:false,offWeek:0,ledger:[],planNotice:[],meta:metaChampions(seed,1)};
}
function news(g:Game,s:string){g.news.unshift(s);g.news=g.news.slice(0,30);}
function pay(g:Game,t:Team,v:number,label:string){t.cash+=v;if(t.id===g.teamId){g.ledger.unshift({label,amount:v});g.ledger=g.ledger.slice(0,30);}}
function ensureLineup(g:Game,id:string){const t=team(g,id);for(const r of ROLES){const current=g.players.find(p=>p.id===t.lineup[r]&&p.teamId===id);if(!current||current.burn>=90){const options=roster(g,id).filter(p=>p.role===r&&p.burn<90).sort((a,b)=>ovr(b)-ovr(a));if(options.length)t.lineup[r]=options[0].id;else{let p=g.players.find(p=>p.id===`emergency-${id}-${r}`);if(!p){p=makePlayer(99,r,id,35,g.season,random(hash(id+r)));p.id=`emergency-${id}-${r}`;p.name='긴급 '+r;p.salary=0;g.players.push(p);}p.burn=0;t.lineup[r]=p.id;pay(g,t,-200,'긴급 선수 수당');if(id===g.teamId)news(g,`${r} 출전 선수가 없어 긴급 선수를 호출했습니다. (0.02억)`);}}}}
function train(g:Game){g.planNotice=[];for(const t of g.teams){for(const p of roster(g,t.id)){if(p.id.startsWith('emergency'))continue;if(t.id!==g.teamId)p.training=p.burn>45?'rest':synergy(g,t.id)<70?'scrim':'practice';const tr=TRAININGS.find(x=>x.id===p.training)!;p.burn=clamp(p.burn+tr.burn-(tr.id==='rest'?(t.staff?.psych??0)*3:0));p.form=clamp(50+.85*(p.form-50)+(tr.id==='rest'?3:0));p.growth=0;const idx=tr.id==='practice'?[0,4]:tr.id==='scrim'?[1,2,3]:[];for(const s of idx){const d=Math.max(0,Math.min(p.pot[s]-p.stats[s],1.5*(1+(t.staff?.coach??0)*.1)/idx.length*Math.pow(Math.max(0,1-p.stats[s]/p.pot[s]),1.2)));p.stats[s]=Math.round((p.stats[s]+d)*100)/100;p.growth+=d;}
 // F17: 훈련 이력 — 사용자 팀만(planNotice와 같은 범위), 실제 적용된 효과 문구를 그대로 구조화해 영구 보존.
 const logT=(effect:string,champ?:string)=>{if(t.id!==g.teamId)return;if(!g.trainingLog)g.trainingLog=[];g.trainingLog.unshift({season:g.season,round:g.round,playerId:p.id,training:tr.id,champ,effect});g.trainingLog=g.trainingLog.slice(0,TRAINING_LOG_CAP);};
 if(tr.id==='champ'){
  // 사용자가 고른 목표를 그대로 훈련한다. 미등록 챔피언은 풀에 자리가 있으면 새로 등록하고,
  // 풀(8칸)이 가득 차면 다른 챔피언으로 조용히 대체하지 않고 보류를 알린다.
  const wanted=p.trainChamp&&CHAMPIONS.some(c=>c.id===p.trainChamp)?p.trainChamp:undefined;
  if(wanted&&!p.mastery.some(m=>m.champ===wanted)&&p.mastery.length>=MASTERY_POOL){
   if(t.id===g.teamId){g.planNotice.push(`${p.name} · 챔피언 특훈 보류 · 숙련 챔피언 ${MASTERY_POOL}칸이 가득 차 ${champName(wanted)}을(를) 등록하지 못했습니다 · 번아웃 ${Math.round(p.burn)}`);logT(`보류 · 숙련 ${MASTERY_POOL}칸 가득 참`,wanted);}
  }else{
   const target=wanted??[...p.mastery].sort((a,b)=>(a.level-b.level)||(a.xp-b.xp))[0]?.champ;
   if(target){const gain=Math.round(28*(1+(t.staff?.coach??0)*.1));gainMastery(p,target,gain);if(t.id===g.teamId){g.planNotice.push(`${p.name} · 챔피언 특훈 · ${champName(target)} 숙련 +${gain} · 번아웃 ${Math.round(p.burn)}`);logT(`숙련 +${gain}`,target);}}
  }
 }
 else if(t.id===g.teamId){const eff=idx.length?'성장 +'+p.growth.toFixed(2):'폼 '+Math.round(p.form);g.planNotice.push(`${p.name} · ${tr.name} · ${eff} · 번아웃 ${Math.round(p.burn)}`);logT(eff);}}
 const k=key(t);for(const x in t.familiarity)t.familiarity[x]=clamp(t.familiarity[x]-1,20,100);t.familiarity[k]=clamp((t.familiarity[k]??20)+(starters(g,t.id).filter(p=>p.training==='scrim').length>=3?4:0),20,100);ensureLineup(g,t.id);}
 g.trained=true;g.phase='PREP';loadMatch(g);news(g,`${g.split==='SPRING'?'스프링':'서머'} ${Math.floor(g.round/2)+1}주차 훈련 완료`);}
export function upcoming(g:Game){return g.match??(g.stage==='REGULAR'&&g.fixtures[g.round]?(()=>{const [a,b]=g.fixtures[g.round].find(p=>p.includes(g.teamId))!;return {id:`${g.season}-${g.split}-${g.round}-${a}`,a,b,bestOf:3,scoreA:0,scoreB:0,sets:[],label:`${g.split} R${g.round+1}`} as Match;})():null);}
function loadMatch(g:Game){const m=upcoming(g);if(m){g.match=m;ensureLineup(g,m.a);ensureLineup(g,m.b);g.phase='PREP';}}
// Standard competitive tournament draft: ban×6 / pick×6 / ban×4 / pick×4 (each side 5 bans, 5 picks).
export const DRAFT_ORDER:['B'|'R','BAN'|'PICK'][]=[['B','BAN'],['R','BAN'],['B','BAN'],['R','BAN'],['B','BAN'],['R','BAN'],['B','PICK'],['R','PICK'],['R','PICK'],['B','PICK'],['B','PICK'],['R','PICK'],['R','BAN'],['B','BAN'],['R','BAN'],['B','BAN'],['R','PICK'],['B','PICK'],['B','PICK'],['R','PICK']];
const draftSideTeam=(ds:DraftState,step:number)=>DRAFT_ORDER[step][0]==='B'?ds.blue:ds.red;
const draftUsed=(ds:DraftState)=>new Set<string>([...ds.bans.map(b=>b.champ),...ds.picksBlue.map(p=>p.champ),...ds.picksRed.map(p=>p.champ)]);
const draftPicksOf=(ds:DraftState,teamId:string)=>teamId===ds.blue?ds.picksBlue:ds.picksRed;
export const draftTurnTeam=(ds:DraftState)=>ds.step<DRAFT_ORDER.length?draftSideTeam(ds,ds.step):'';
export function newDraftState(g:Game,m:Match):DraftState{
 const first=m.sets.length?m.sets[m.sets.length-1].winner!==m.a:true;
 return {blue:first?m.a:m.b,red:first?m.b:m.a,step:0,bans:[],picksBlue:[],picksRed:[],actions:[],complete:false};
}
// A champion may be picked into any lane. Its natural line = 'primary', a listed
// secondary line = 'flex' (no penalty), anything else = 'off' (stat penalty).
export const roleFit=(champId:string,role:Role):'primary'|'flex'|'off'=>{const c=champById(champId);return c.role===role?'primary':c.flex.includes(role)?'flex':'off';};
const OFFROLE_PEN=6;
const assignCost=(champId:string,role:Role)=>{const f=roleFit(champId,role);return f==='primary'?0:f==='flex'?1:5;};
const ROLE_PERMS:Role[][]=(()=>{const out:Role[][]=[];const rec=(rem:Role[],acc:Role[])=>{if(!rem.length){out.push(acc);return;}for(let i=0;i<rem.length;i++)rec([...rem.slice(0,i),...rem.slice(i+1)],[...acc,rem[i]]);};rec([...ROLES],[]);return out;})();
// Best-fit assignment of 5 picked champions to the 5 lane slots (minimises off-role cost).
function autoAssign(picks:DraftPick[]){
 if(picks.length!==5)return;
 let best=ROLE_PERMS[0],bestC=Infinity;
 for(const perm of ROLE_PERMS){let c=0;for(let i=0;i<5;i++)c+=assignCost(picks[i].champ,perm[i]);if(c<bestC){bestC=c;best=perm;}}
 picks.forEach((p,i)=>p.role=best[i]);
}
export function legalDraftCandidates(g:Game,ds:DraftState):Champion[]{
 if(ds.step>=DRAFT_ORDER.length)return [];
 const [,kind]=DRAFT_ORDER[ds.step];const used=draftUsed(ds);
 const cands=CHAMPIONS.filter(c=>!used.has(c.id));
 if(kind==='PICK')return cands; // any champion, any order — off-role is allowed with a penalty
 const remain:Record<string,number>={};for(const c of cands)remain[c.role]=(remain[c.role]??0)+1;
 return cands.filter(c=>remain[c.role]>2); // don't ban a lane out of viable champions
}
// F07(2026-09-15): 다음 한 수(상대 차례 1단계)까지 내다본다 — 재귀 없음, 상위 5후보만(시간 예산).
// legalDraftCandidates를 그대로 쓴다(추천·자동 픽과 같은 합법성 검사 — 완료 조건). 확정 안 된 상대의
// "진짜" 다음 선택을 미리 읽지 않는다: 이 함수는 "만약 내가 c를 골랐다면"이라는 가상 상태만 만들고,
// 그 가상 상태에서 상대가 둘 수 있는 합법 수 중 상대에게 가장 좋은 값만 본다(이미 확정된 픽·밴만 사용,
// rng 미소비 — draftFitScore는 순수 함수라 draft rng 스트림 호출 횟수에 영향 없음).
function bestOpponentReply(g:Game,ds:DraftState):number{
 if(ds.step>=DRAFT_ORDER.length||ds.complete)return 0;
 const [side2,kind2]=DRAFT_ORDER[ds.step];const replier=side2==='B'?ds.blue:ds.red,replierOpp=replier===ds.blue?ds.red:ds.blue;
 const cands2=legalDraftCandidates(g,ds);
 if(!cands2.length)return 0;
 const ownPicks=draftPicksOf(ds,replier).map(p=>p.champ),oppPicks=draftPicksOf(ds,replierOpp).map(p=>p.champ);
 const baseline=draftFitScore(ownPicks,oppPicks);
 let best=-Infinity;
 for(const c2 of cands2){
  const v=kind2==='BAN'
   ?draftFitScore(ownPicks,[...oppPicks,c2.id])-baseline // 밴 = 상대(밴하는 쪽 기준 적) 조합을 깎는 값
   :draftFitScore([...ownPicks,c2.id],oppPicks)-baseline; // 픽 = 자기 조합을 올리는 값
  if(v>best)best=v;
 }
 return best;
}
// F21: 세트 사이 적응 — 이 "시리즈"(m.sets, 같은 매치 안에서 이미 끝난 세트만) 안에서 실제로 관측된
// 결과만 신호로 쓴다. 피어리스 드래프트(밴 자체가 세트를 넘어 누적)는 이 게임이 지원하지 않는다고
// 이미 명시돼 있다 — 그래서 이건 "다시 못 고른다"는 규칙이 아니라 AI의 우선순위를 조금 미는 것뿐이다
// (감점/가점, 하드 배제 없음). draftRecommendations도 같은 신호를 써서 사용자에게 그대로 보여준다 —
// AI만 몰래 아는 정보가 없게 한다(F07의 "사람이 읽을 수 있는 AI 밴픽" 원칙 연장).
export function seriesSignal(m:Match,teamId:string):{oppWinChamps:Set<string>,myLossChamps:Set<string>}{
 const oppId=teamId===m.a?m.b:m.a;
 const oppWinChamps=new Set<string>(),myLossChamps=new Set<string>();
 for(const s of m.sets){
  const myPicks=teamId===m.a?s.draft.picksA:s.draft.picksB;
  const oppPicks=oppId===m.a?s.draft.picksA:s.draft.picksB;
  if(s.winner===oppId)for(const c of oppPicks)oppWinChamps.add(c);
  if(s.winner===teamId)continue; // 내가 이긴 세트의 내 픽은 오히려 계속 쓸 이유가 된다 — 신호 없음
  if(s.winner===oppId)for(const c of myPicks)myLossChamps.add(c);
 }
 return {oppWinChamps,myLossChamps};
}
function aiPick(g:Game,m:Match,ds:DraftState):string{
 const [side,kind]=DRAFT_ORDER[ds.step];const teamId=side==='B'?ds.blue:ds.red,oppId=teamId===ds.blue?ds.red:ds.blue;
 const cands=legalDraftCandidates(g,ds);
 if(!cands.length)throw Error('드래프트 후보가 부족합니다.');
 const rng=random(hash(`${g.seed}|draft|${m.id}|${m.sets.length}|${ds.step}`));
 const t=team(g,teamId),mine=starters(g,teamId),opp=starters(g,oppId);
 const metaSet=new Set(g.meta),analyst=t.staff?.analyst??0,noise=(mine.some(p=>p.training==='analysis')?.5:1)*(.5**analyst);
 const rate=(ps:Player[],champ:string)=>{let m=0;for(const p of ps)m=Math.max(m,masteryLevel(p,champ));return m;};
 const cov:Record<string,number>={};for(const p of draftPicksOf(ds,teamId))cov[champById(p.champ).role]=(cov[champById(p.champ).role]??0)+1;
 const open=ROLES.filter(r=>!cov[r]);
 // F21: 세트 사이 적응 — m.sets가 비어 있으면(1세트) 신호도 비어 있어 기존과 100% 동일.
 const {oppWinChamps,myLossChamps}=seriesSignal(m,teamId);
 const scored:{id:string,s:number}[]=[];
 for(const c of cands){
  const meta=metaSet.has(c.id)?3:0;let s:number;
  if(kind==='BAN'){
   const enemy=draftPicksOf(ds,oppId).map(p=>p.champ), own=draftPicksOf(ds,teamId).map(p=>p.champ);
   s=rate(opp,c.id)*2+meta+draftFitScore([...enemy,c.id],own)*1.5+(oppWinChamps.has(c.id)?3:0);
  }
  else{
   const fitRole=open.includes(c.role)?c.role:c.flex.find(f=>open.includes(f))??open[0]??c.role;
   const fit=!open.length?0:open.includes(c.role)?4:c.flex.some(f=>open.includes(f))?1.5:-5;
   const player=mine[ROLES.indexOf(fitRole)];
   s=draftFitScore([...draftPicksOf(ds,teamId).map(p=>p.champ),c.id],draftPicksOf(ds,oppId).map(p=>p.champ))*1.5+fit+(player?masteryLevel(player,c.id)*2:0)+(t.tactic==='early'&&c.tags.includes('engage')?2:t.tactic==='late'&&c.tags.includes('scale')?2:0)+meta-(myLossChamps.has(c.id)?0.5:0);
  }
  s+=rng()*noise;
  scored.push({id:c.id,s});
 }
 scored.sort((a,b)=>b.s-a.s);
 // 상대 응수 탐색은 사용자가 직접 겪는 매치(AI가 사용자의 상대·응수로 뛸 때)에서만 돈다 — 리그 전체
 // 자동 진행(autoMatch, 사용자가 보지 않는 다른 팀 경기)까지 비싸게 만들 이유가 없다(F07 목적은
 // "사람이 읽을 수 있는 AI 밴픽", 배경 시즌 시뮬레이션 품질이 아니다). 성능 회귀 없이 시간 예산을 지킨다.
 if(m.a!==g.teamId&&m.b!==g.teamId)return scored[0].id;
 const TOPN=Math.min(5,scored.length);
 let best=scored[0].id,bestAdj=-Infinity;
 for(let i=0;i<TOPN;i++){
  const ds2=structuredClone(ds);applyDraftStep(ds2,scored[i].id);
  const adj=scored[i].s-0.4*bestOpponentReply(g,ds2); // 상대 응수가 클수록(내가 좋은 자리를 남겨줄수록) 감점
  if(adj>bestAdj){bestAdj=adj;best=scored[i].id;}
 }
 return best;
}
function applyDraftStep(ds:DraftState,champId:string){
 const [side,kind]=DRAFT_ORDER[ds.step];const teamId=side==='B'?ds.blue:ds.red;
 if(kind==='BAN')ds.bans.push({side,champ:champId});
 else draftPicksOf(ds,teamId).push({champ:champId,role:champById(champId).role});
 ds.actions.push({team:teamId,kind,champ:champId});ds.step++;
}
function draftToResult(m:Match,ds:DraftState):Draft{
 const picksFor=(teamId:string)=>{const ps=teamId===ds.blue?ds.picksBlue:ds.picksRed;return ROLES.map(r=>(ps.find(p=>p.role===r)??ps[0]).champ);};
 return {picksA:picksFor(m.a),picksB:picksFor(m.b),bans:ds.bans.map(b=>b.champ),actions:ds.actions};
}
function finalizeDraft(m:Match,ds:DraftState){autoAssign(ds.picksBlue);autoAssign(ds.picksRed);m.draft=draftToResult(m,ds);ds.complete=true;}
function advanceDraft(g:Game,m:Match,ds:DraftState){
 while(ds.step<DRAFT_ORDER.length&&draftSideTeam(ds,ds.step)!==g.teamId)applyDraftStep(ds,aiPick(g,m,ds));
 if(ds.step>=DRAFT_ORDER.length)finalizeDraft(m,ds);
}
function pickDraft(g:Game,m:Match):Draft{
 const ds=newDraftState(g,m);
 while(ds.step<DRAFT_ORDER.length)applyDraftStep(ds,aiPick(g,m,ds));
 autoAssign(ds.picksBlue);autoAssign(ds.picksRed);
 return draftToResult(m,ds); // does NOT set m.draft — each auto-match set re-drafts
}
function powers(g:Game,id:string,picks:string[],rng:()=>number){const ps=starters(g,id);const values=ps.map((p,i)=>{const targets=[[0,4],[2,3],[0,5],[1,4],[1,3]][i],condition=Math.floor(rng()*7)-3;const pickBonus=masteryLevel(p,picks[i])*2+(isMeta(g,picks[i])?2:0);const offRole=roleFit(picks[i],ROLES[i])==='off'?OFFROLE_PEN:0;return p.stats.map((s,k)=>clamp(s+condition-offRole+(targets.includes(k)?pickBonus:0),1,105));});
 const q=values.map(s=>.5*s[0]+.3*s[4]+.2*s[5]),j=.6*values[1][2]+.4*values[1][4];const lanes=[q[0],q[2],.65*q[3]+.35*q[4]].map((v,i)=>.9*v+.1*j+(['TOP','MID','BOT'][i]===team(g,id).focus?2:-1));
 const obj=values.reduce((v,s,i)=>v+(.45*s[2]+.3*s[3]+.25*s[4])*[.1,.35,.2,.1,.25][i],0);
 const fight=.8*values.reduce((v,s,i)=>v+(.5*s[1]+.3125*s[5]+.1875*s[4])*[.15,.15,.2,.3,.2][i],0)+.2*synergy(g,id);
 // 조합 효과는 powers()에서 분리했다 — simulateSet이 draftEffects()로 라인/오브젝트/한타에 1회만 반영(단일 경로, 이중 보정 방지).
 const bonus=TACTICS.find(t=>t.id===team(g,id).tactic)!.bonus,form=1+(avg(ps.map(p=>p.form))-50)/500;
 return [...lanes.map(x=>x*form+bonus[0]),obj*form+bonus[1],fight*form-avg(ps.map(p=>p.burn))/10+bonus[2]];}
// 중계는 lib/simulation/narration.ts의 narrateEvent가 담당한다. simulateSet이 사건별로 해결된
// 컨텍스트(해결된 이름·자원·조합·전술)를 넘기고, 전용 narr 난수(승부/골드 난수와 분리)로 텍스트만 만든다.

// 개인 자원 모델: 라인·시야 우위를 선수별 자원 우위(A 관점 골드 단위)로 남기고, 그 자원을
// 이후 오브젝트/한타의 유효 전력에 반영한다. 승부 난수(outcome) 스트림 호출 순서·횟수는 바꾸지 않는다.
const RES_ADV_K=0.32;         // 누적 우위 계수(기존 0.35에서 축소 — 자원 보정과 이중 보상 방지)
// 라인 자원은 lib/simulation/combat.ts가 참여자 기반으로 산출한다(RES_LANE_LEAD·RES_BOT·RES_JGL_CARRY 폐지).
const RES_VIS_W=[1,1.35,1,1,1.5];       // 시야 가중(정글·서포터 우대)
const RES_VIS_PROTECT=2.6;    // 가중 시야 우위 1점당 슬롯별 자원 보호치(피습·불리한 진입 감소)
const RES_CAR_W=[0.12,0.1,0.32,0.36,0.1]; // 자원→피해 전환 주체(미드·원딜 중심)
const RES_DEAD=42,RES_CAP=165,RES_SCALE=150,RES_OBJ=3.0,RES_FIGHT=4.6; // 자원→유효 전력 포화 곡선(데드존·총량 상한·스케일·오브젝트/한타 상한)
export function simulateSet(g:Game,m:Match,directive?:TacticalChoice):SetResult{
 const draft=m.draft??pickDraft(g,m),rng=random(hash(`${g.seed}|outcome|${m.id}|${m.sets.length}`));
 const de=draftEffects(draft.picksA,draft.picksB); // 조합 효과(A 관점, 결정적). 라인/오브젝트/한타에 각각 1회 가산.
 // flavor: 표시용 팀 골드 곡선 전용 난수(F03 감사, 2026-09-15). GoldGraph의 e.goldA/goldB는 이 스트림으로
 // 그려진다 — combat.ts Combatant.gold(개인 자원, 처치·어시·구조물로만 증가, 파밍 없음)의 팀 합과 다르다.
 // gA/gB의 "누가 더 버는가"는 항상 그 사건의 실제 승자(waIn)를 따른다(가짜 승자 없음) — flavor는 폭만 흔든다.
 // 완전한 "개인 골드 합=팀 골드" 단일화는 F09(라인 웨이브·파밍 경제)가 있어야 자연스럽다: 지금 combat.ts의
 // gold는 파밍 수입이 없어 실제 LoL보다 훨씬 작고 들쭉날쭉하다 — 지금 그대로 합산해 표시로 바꾸면 "미확보
 // 오브젝트 표시 골드 균등"(tests/combat.test.mjs 8a) 안전장치가 깨지고 그래프가 더 뒤죽박죽으로 보인다.
 const flavor=random(hash(`${g.seed}|flavor|${m.id}|${m.sets.length}`));let gA=2500,gB=2500;
 const narr=random(hash(`${g.seed}|narr|${m.id}|${m.sets.length}`)),mem=newNarrMemory(); // 중계 전용 난수(승부/골드와 분리)
 const pa=powers(g,m.a,draft.picksA,random(hash(`${g.seed}|conditionA|${m.id}|${m.sets.length}`))),pb=powers(g,m.b,draft.picksB,random(hash(`${g.seed}|conditionB|${m.id}|${m.sets.length}`)));
 const sa=starters(g,m.a),sb=starters(g,m.b);
 const nAChamp=draft.picksA.map(champName),nBChamp=draft.picksB.map(champName);
 const nAPlayer=sa.map(p=>p.name),nBPlayer=sb.map(p=>p.name);
 const nUserIsA=m.a===g.teamId?true:m.b===g.teamId?false:null;
 const nUserTactic=nUserIsA===null?null:team(g).tactic,nUserFocus=nUserIsA===null?null:team(g).focus;
 const crng=random(hash(`${g.seed}|combat|${m.id}|${m.sets.length}`)); // 전투 전용 난수(승부/골드/중계와 분리)
 const cs=newMatchState(
  sa.map(p=>({stats:p.stats,name:p.name,role:p.role})),sb.map(p=>({stats:p.stats,name:p.name,role:p.role})),
  draft.picksA,draft.picksB,
  (side,slot)=>masteryLevel(side==='A'?sa[slot]:sb[slot],(side==='A'?draft.picksA:draft.picksB)[slot]),
  (side,slot)=>roleFit((side==='A'?draft.picksA:draft.picksB)[slot],ROLES[slot])==='off',
  (side,slot)=>temperamentOf((side==='A'?sa:sb)[slot].id),
  (side,slot)=>{
   const pl=(side==='A'?sa:sb)[slot], ch=pl.challenge;
   if(!ch||ch.status!=='completed')return {spotReduction:0,objJoinBonus:0};
   return {spotReduction:ch.id==='safe_commit'?0.03:0,objJoinBonus:ch.id==='obj_priority'?0.03:0};
  },
 );
 // A node is carried across events; it is never reset to the river after a siege.
 for(const side of ['A','B'] as Side[])for(const c of cs[side])c.navNode=side+'_base';
 const withMovement=(resolve:()=>CombatEvent,node?:string)=>{
  const before=new Map([...cs.A,...cs.B].map(c=>[c.side+c.slot,{node:c.alive?c.navNode!:c.side+'_base',free:c.alive?c.freeAt:Math.max(c.freeAt,c.respawnAt)}]));
  const cb=resolve();
  const sg=cb.siege,def=cb.side==='A'?'B':'A';
  const target=node??(sg?.targetBase||sg?.nexus?def+'_base':sg&&sg.lane>=0?[def+'_top','mid',def+'_bot'][sg.lane]:'mid');
  cb.location=target;
  cb.movements=cb.participants.map(ref=>{
   const source=before.get(ref.side+ref.slot)!,c=cs[ref.side][ref.slot];
   const from=c.navNode===ref.side+'_base'&&source.node!==c.navNode?c.navNode:source.node;
   const travel=travelSeconds(from,target,ref.slot),depart=Math.max(source.free,cb.clock-travel);
   c.navNode=target;
   if(c.alive)c.freeAt=Math.max(cb.clock+14,cs.clock-(sg?12:0));
   return {ref,from,to:target,depart,arrive:depart+travel};
  });
  return cb;
 };
 const battlefield=(seq:number)=>{
  if(seq===5)return 'dragon';if(seq===6)return 'baron';
  const damageA=cs.struct.B.reduce((a,b)=>a+b,0),damageB=cs.struct.A.reduce((a,b)=>a+b,0);
  // An opened inhibitor moves the front toward the exposed base, shortening a real siege route.
  if(cs.struct.B.some(v=>v>=3)&&damageA>damageB)return 'B_mid';
  if(cs.struct.A.some(v=>v>=3)&&damageB>damageA)return 'A_mid';
  return 'mid';
 };
 const wVis=(ps:Player[])=>ps.reduce((v,p,k)=>v+p.stats[3]*RES_VIS_W[k],0)/RES_VIS_W.reduce((x,y)=>x+y,0);
 const wCar=(ps:Player[])=>ps.reduce((v,p,k)=>v+p.stats[5]*RES_CAR_W[k],0);
 const convA=1+clamp((wCar(sa)-50)/130,-0.3,0.5),convB=1+clamp((wCar(sb)-50)/130,-0.3,0.5);
 const visEdge=wVis(sa)-wVis(sb);
 const lead=[0,0,0,0,0]; // 슬롯별 자원(+ = A 우세)
 let advantage=0,pressureA=0,pressureB=0,winner='',laneResults:number[]=[];const events:GameEvent[]=[];
 const labels=['탑 라인전','미드 라인전','바텀 라인전','전령 교전','드래곤 교전','중반 교전','후반 교전','마지막 진격','기지 결전'];
 // F04(2026-09-15): 오브젝트 준비 구간 감독 지시. 조합 효과(±3, composition.ts)보다 작게 잡아
 // 지배적 레버가 되지 않도록 한다. '정비'(directive 없음/'regroup')는 완전 중립 — 기존 simulateSet(g,m)
 // 호출(autoMatch·회귀 테스트 전부)과 동일 결과를 보장해야 한다. 사용자 팀 관점으로만 부호를 맞춘다.
 const TACTICAL_BONUS=1.2;
 const tacticalAccess=(phase:number)=>{
  if(!directive||directive==='regroup'||nUserIsA===null)return 0;
  const forThisPhase=(directive==='prepare'&&phase===4)||(directive==='trade'&&phase===3);
  if(!forThisPhase)return 0;
  return nUserIsA?TACTICAL_BONUS:-TACTICAL_BONUS;
 };
 // F12: 딜러 보호/위험 감수 진입은 한타 내부(resolveTeamfight)의 protect/engage/favor에만 반영되고
 // tacticalAccess(위 phase별 확률)는 건드리지 않는다 — prepare/trade가 주는 일반 확률 우위를 이 둘은 받지 못한다(그게 대가).
 // 상수는 통제 실험(controlled base, 1500시드)으로 눈으로 보정했다: allin(engage+favor)의 세트 승률 효과가
 // 기존 prepare(TACTICAL_BONUS=1.2, phase===4 전체에 적용)와 비슷한 크기(+3.9pp vs +4.1pp)가 되도록 낮췄다
 // — 처음 잡은 값(0.10/0.05)은 무교전 비율을 9%→0.2%로 거의 없애고 승률을 +11pp 흔들어 "지배적 레버가
 // 되지 않게 한다"는 F04 원칙을 어겼다. protect는 승률이 아니라 딜러 생존률(+6.9pp, 승률은 거의 불변)에만
 // 영향을 줘 다른 축이라 같은 잣대로 비교하지 않는다.
 const DIRECTOR_PROTECT=0.08, DIRECTOR_ENGAGE=0.02, DIRECTOR_FAVOR=0.02;
 const directorBonus=():DirectorBonus|undefined=>{
  if(!directive||nUserIsA===null)return undefined;
  if(directive==='protect')return {protect:nUserIsA?DIRECTOR_PROTECT:-DIRECTOR_PROTECT,favor:0,engage:0};
  if(directive==='allin')return {protect:0,favor:nUserIsA?DIRECTOR_FAVOR:-DIRECTOR_FAVOR,engage:DIRECTOR_ENGAGE};
  return undefined;
 };
 const CLOCK_CAP=3600, EVENT_CAP=60;      // 무한 실행 방지 상한(경기 시계 초 / 사건 수). 도달은 정상 넥서스 승리와 구분해 기록.
 let ei=0;                               // GameEvent.index (스켈레톤 0..8, 이후 공성·연장 사건이 이어 붙는다)
 let endReason:'NEXUS'|'CAP_TIME'|'CAP_EVENT'='CAP_EVENT';
 let capDiag:CapDiag|undefined;
 let firstStructSide:Side|null=null;     // 첫 구조물 선취 팀(검증 지표)

 // 구간 확률 롤. phase 0~2 라인 / 3 오브 / 4 한타. resPow(자원→전력)·comp(조합)는 확률 채널 — 구조물 진행은 여기 더하지 않는다(D007 단일 경로).
 const rollFight=(phase:number,access:number)=>{
  const teamLead=lead[0]+lead[1]+lead[2]+lead[3]+lead[4];
  const effLead=clamp(Math.sign(teamLead)*Math.max(0,Math.abs(teamLead)-RES_DEAD),-RES_CAP,RES_CAP);
  const resPow=(phase<3?0:phase<4?RES_OBJ:RES_FIGHT)*Math.tanh(effLead/RES_SCALE)*(teamLead>=0?convA:convB);
  const comp=phase<3?de.lane:phase<4?de.obj:0;
  const p=clamp(1/(1+10**(-(pa[phase]-pb[phase]+RES_ADV_K*advantage+access+resPow+comp)/30)),.05,.95);
  return {p,resPow,comp,phase,edgeA:rng()<p,margin:clamp(Math.abs(p-0.5)*2.2,0,1)};
 };
 // 한타·라인·오브 사건 공통 마무리(momentum·pressure·표시 골드·중계·기록).
 const finalize=(idx:number,i:number,cb:CombatEvent,r:ReturnType<typeof rollFight>,waIn:boolean)=>{
  const delta=i<3?1:i<6?2:3;
  const noMove=(cb.kind==='objective'&&!cb.objective!.secured)||(cb.kind==='teamfight'&&!cb.fight!.winner);
  const w=waIn?m.a:m.b, edgeTeam=r.edgeA?m.a:m.b;
  if(!noMove)advantage=clamp(advantage+(waIn?delta:-delta),-12,12);
  if(i<3)laneResults.push(r.edgeA?1:-1);
  if(cb.kind==='teamfight'){const fw=cb.fight!.winner;if(fw==='A')pressureA++;else if(fw==='B')pressureB++;} // 실제 교전 승자만 — pressure는 이제 종료 판정의 tiebreak 입력일 뿐
  const gain=i<3?340+flavor()*260:i<5?880+flavor()*520:1600+flavor()*1500;const passive=540+flavor()*140;
  gA+=passive+(noMove?gain*0.5:(waIn?gain:gain*.34));gB+=passive+(noMove?gain*0.5:(waIn?gain*.34:gain));
  const nr=narrateEvent({i,wa:waIn,last:false,aShort:meta(m.a).short,bShort:meta(m.b).short,p:r.p,advantage,advSwing:delta,leadSlots:lead.slice(),de,aChamp:nAChamp,bChamp:nBChamp,aPlayer:nAPlayer,bPlayer:nBPlayer,userIsA:nUserIsA,userTactic:nUserTactic,userFocus:nUserFocus,combat:cb},mem,narr);
  events.push({index:idx,phase:i<3?'라인전':i<5?'오브젝트':'한타',title:labels[i]??'연장 교전',winner:w,edge:edgeTeam,prob:Math.round(r.p*1000)/10,advantage,powerA:Math.round(pa[r.phase]*10)/10,powerB:Math.round(pb[r.phase]*10)/10,goldA:Math.round(gA/10)*10,goldB:Math.round(gB/10)*10,detail:nr.detail,beats:nr.beats,tier:nr.tier,kills:nr.kills,combat:cb,leadA:Math.round(lead.reduce((a,b)=>a+b,0)),resPowA:Math.round(r.resPow*100)/100,compA:Math.round(r.comp*100)/100});
 };
 // 한타 후속 공성. 구조물 골드는 resource로 lead에 1회만 반영(단일 경로). 넥서스 파괴면 true.
 const doSiege=(idx:number)=>{
  const se=withMovement(()=>resolveSiege(cs,idx,cs.clock,crng)), sg=se.siege!;
  for(let s=0;s<5;s++)lead[s]+=se.resource[s];
  if(sg.structuresDown>0&&!firstStructSide)firstStructSide=sg.side;
  const atkA=sg.side==='A';
  const g2=1100+flavor()*380;const pass=540+flavor()*140;
  gA+=pass+(sg.structuresDown>0?(atkA?g2:g2*0.3):g2*0.5);gB+=pass+(sg.structuresDown>0?(atkA?g2*0.3:g2):g2*0.5);
  const nr=narrateEvent({i:9,wa:atkA,last:false,aShort:meta(m.a).short,bShort:meta(m.b).short,p:.5,advantage,advSwing:0,leadSlots:lead.slice(),de,aChamp:nAChamp,bChamp:nBChamp,aPlayer:nAPlayer,bPlayer:nBPlayer,userIsA:nUserIsA,userTactic:nUserTactic,userFocus:nUserFocus,combat:se},mem,narr);
  events.push({index:idx,phase:'공성',title:sg.result==='NEXUS'?'넥서스 파괴':sg.result==='INHIB'?'억제기':sg.result==='NO_WINDOW'?'공성 중단':sg.result==='RESET'?'정비':'공성',winner:sg.structuresDown>0?(atkA?m.a:m.b):'',edge:atkA?m.a:m.b,prob:50,advantage,powerA:0,powerB:0,goldA:Math.round(gA/10)*10,goldB:Math.round(gB/10)*10,detail:nr.detail,beats:nr.beats,tier:nr.tier,kills:nr.kills,combat:se,leadA:Math.round(lead.reduce((a,b)=>a+b,0)),resPowA:0,compA:0});
  return sg.nexus;
 };

 let nexusDown=false;
 for(let i=0;i<9&&!nexusDown;i++){
  const phase=i<3?i:i<5?3:4;
  const access=(i===3?avg(laneResults.slice(0,2))*.5:i===4?avg(laneResults.slice(1))*.5:0)+tacticalAccess(phase);
  const r=rollFight(phase,access);
  let cb:CombatEvent, waIn=r.edgeA;
  if(i<3){
   cb=withMovement(()=>i<2?resolveGank(cs,i,i as 0|1,r.edgeA,r.margin,[150,306][i],crng):resolveBotLane(cs,i,r.edgeA,r.margin,498,crng),['top_mid','mid','bot_mid'][i]);
   cs.clock=[150,306,498][i];
   for(let s=0;s<5;s++)lead[s]+=cb.resource[s];
   if(i===2)for(let s=0;s<5;s++)lead[s]+=visEdge*RES_VIS_PROTECT;
  }else if(i<5){
   cb=withMovement(()=>resolveObjective(cs,i,i===3?'herald':'dragon',r.edgeA,r.margin,i===3?660:900,crng),i===3?'baron':'dragon');
   cs.clock=i===3?660:900;
   for(let s=0;s<5;s++)lead[s]+=cb.resource[s];
   const sec=cb.objective!.secured;
   waIn=sec==='A'?true:sec==='B'?false:r.edgeA;
   if(sec){const L=i===3?0:2;cs.lanePush[sec][L]=Math.min(1.4,cs.lanePush[sec][L]+0.5);} // 오브 확보 → 그 라인 압박(전령=탑, 드래곤=바텀). 미니언 아님.
  }else{
   if(i===5)cs.clock=1080;
   cs.clock+=28; // decision and regrouping window, in actual game seconds
   const node=battlefield(i);cb=withMovement(()=>resolveTeamfight(cs,i,r.edgeA,r.margin,cs.clock,crng,node,directorBonus()),node);
   for(let s=0;s<5;s++)lead[s]+=cb.resource[s];
   const fw=cb.fight!.winner;
   waIn=fw==='A'?true:fw==='B'?false:r.edgeA;
  }
  finalize(ei++,i,cb,r,waIn);
  if(i>=5&&doSiege(ei++)){nexusDown=true;endReason='NEXUS';}
 }
 // 연장전: 9번째 사건이라는 이유로 승자를 정하지 않는다. 넥서스가 아직이면 운영·교전·공성을 이어간다.
 while(!nexusDown&&cs.clock<CLOCK_CAP&&ei<EVENT_CAP-1){
  const r=rollFight(4,tacticalAccess(4));
  cs.clock+=28;
  const node=battlefield(9),cb=withMovement(()=>resolveTeamfight(cs,9,r.edgeA,r.margin,cs.clock,crng,node,directorBonus()),node);
  for(let s=0;s<5;s++)lead[s]+=cb.resource[s];
  const fw=cb.fight!.winner;
  finalize(ei++,9,cb,r,fw==='A'?true:fw==='B'?false:r.edgeA);
  if(ei>=EVENT_CAP-1)break;
  if(doSiege(ei++)){nexusDown=true;endReason='NEXUS';}
 }
 if(nexusDown){
  winner=cs.nexus.B?m.a:m.b; // B 넥서스 파괴 → A 승
 }else{
  // 상한 종료: 넥서스 미파괴. 시간 상한(CLOCK_CAP)과 사건 상한(EVENT_CAP)을 구분해 기록한다.
  // 판정 — 구조물 우위 > pressure > advantage > 전용 동전(seed 고정 해시, 경기 outcome 난수와 분리).
  // edgeA·마지막 사건 방향을 숨은 기본 승자로 쓰지 않는다. 동전은 위 3단계가 모두 완전 동률일 때만.
  const capReason:'TIME'|'EVENT'=cs.clock>=CLOCK_CAP?'TIME':'EVENT';
  endReason=capReason==='TIME'?'CAP_TIME':'CAP_EVENT';
  const dealt=(atk:Side,def:Side)=>cs.struct[def].reduce((a,b)=>a+b,0)+(2-cs.baseTurrets[def])*2+(cs.nexus[def]?6:0);
  const sA=dealt('A','B'), sB=dealt('B','A');
  let tiebreakStage:CapDiag['tiebreakStage'];
  if(sA!==sB){ winner=sA>sB?m.a:m.b; tiebreakStage='struct'; }
  else if(pressureA!==pressureB){ winner=pressureA>pressureB?m.a:m.b; tiebreakStage='pressure'; }
  else if(advantage!==0){ winner=advantage>0?m.a:m.b; tiebreakStage='advantage'; }
  else { winner=random(hash(`${g.seed}|tiebreak|${m.id}|${m.sets.length}`))()<0.5?m.a:m.b; tiebreakStage='coin'; }
  // CAP 직전 상태 집계(원인 분석용 — 숨기지 않는다). 최근 공성 실패 사유 최대 5건.
  const siegeFails=events.filter(e=>e.phase==='공성'&&e.combat?.kind==='siege'
    &&['NO_WINDOW','HELD','RESET'].includes(e.combat.siege!.result))
   .slice(-5).map(e=>{const s=e.combat!.siege!;return `#${e.index} ${s.side} ${s.result}(부활 ${s.reinforceIn}s·여력 ${s.capacity})`;});
  capDiag={reason:capReason,clock:Math.round(cs.clock),events:ei,structDealt:[sA,sB],
   baseTurrets:[cs.baseTurrets.A,cs.baseTurrets.B],
   inhibsOpen:[cs.struct.B.filter(v=>v>=3).length,cs.struct.A.filter(v=>v>=3).length],
   recentSiegeFails:siegeFails,tiebreakStage};
  const wsS=meta(winner).short;
  events.push({index:ei++,phase:'종료',title:capReason==='TIME'?'시간 상한':'사건 상한',winner,edge:winner,prob:50,advantage,powerA:0,powerB:0,goldA:Math.round(gA/10)*10,goldB:Math.round(gB/10)*10,
   detail:`${capReason==='TIME'?'시간 상한(3600초)':'사건 상한(60개)'} 도달 — 넥서스 미파괴. 구조물 피해 ${sA}:${sB} · pressure ${pressureA}:${pressureB} · ${tiebreakStage==='coin'?'동전':tiebreakStage} 기준 ${wsS} 판정승(정상 종료와 구분).`,
   beats:[],tier:'close',kills:{a:0,b:0},leadA:Math.round(lead.reduce((a,b)=>a+b,0)),resPowA:0,compA:0});
 }
 const own=m.a===g.teamId?pa:pb,other=m.a===g.teamId?pb:pa;const diffs=[avg(own.slice(0,3))-avg(other.slice(0,3)),own[3]-other[3],own[4]-other[4]];const weak=diffs.indexOf(Math.min(...diffs));
 const ws=starters(g,winner);
 // ── POG: 실제 개인 기여 집계(단위 6) ──────────────────────────────────────────────
 // 사건 데이터(combat)에 이미 있는 처치·어시스트·한타 기여·보호·공성 참여·오브 확보만 슬롯별로 합산한다.
 // 재추첨·재계산 없음(승부·골드·중계 난수 미소비, p·lead·advantage 불변). POG = 승리 팀 최댓값 슬롯.
 // 처치·어시스트(kaW)는 '모든 사건 공통'으로 cb.kills에서 한 번만 센다. 한타 fight.contrib의
 // kill/engage는 같은 처치를 다시 세므로 POG total·'킬 관여'에 넣지 않는다(D019 이중가산 수정).
 // 한타 contrib에서 쓰는 건 비-처치 축뿐: damage(지속 압박, 가상 점수)·survived·protect(딜러 보호).
 type SC={total:number,kaW:number,tfW:number,protW:number,kills:number,assists:number,protects:number,objSec:number,siegeS:number,nexus:boolean,laneW:number};
 const mkC=():SC=>({total:0,kaW:0,tfW:0,protW:0,kills:0,assists:0,protects:0,objSec:0,siegeS:0,nexus:false,laneW:0});
 const cSide:Record<Side,SC[]>={A:[0,1,2,3,4].map(mkC),B:[0,1,2,3,4].map(mkC)};
 const gc=(side:Side,slot:number)=>slot>=0&&slot<5?cSide[side][slot]:null;
 // TF_KB = 한타 처치 선정 가중치(갱킹 처치보다 판을 크게 흔든다). POG total에만 소액 가산 —
 //         이유 문자열의 '킬 관여' 수(=처치+어시스트)에는 넣지 않는다(이중가산 아님).
 const CB={KILL:3.0,ASSIST:1.4,FB:1.5,LANE:1.0,OBJ:0.7,OBJ_JGL:1.5,TF_KB:1.1,TF_DMG:0.16,TF_SURV:0.25,TF_PROT:2.4,SIEGE:1.0,SIEGE_ADC:1.8,NEXUS:4.0};
 for(const e of events){
  const cb=e.combat;if(!cb)continue;
  for(const k of cb.kills){                       // 처치·어시스트 — 모든 사건 공통(한타·갱킹·오브 동일 가중)
   const kc=gc(k.killer.side,k.killer.slot);if(kc){kc.total+=CB.KILL;kc.kaW+=CB.KILL;kc.kills++;}
   for(const as of k.assists){const ac=gc(as.side,as.slot);if(ac){ac.total+=CB.ASSIST;ac.kaW+=CB.ASSIST;ac.assists++;}}
  }
  if(cb.firstBlood&&cb.kills[0]){const fc=gc(cb.kills[0].killer.side,cb.kills[0].killer.slot);if(fc){fc.total+=CB.FB;fc.kaW+=CB.FB;}}
  if((cb.kind==='gank'||cb.kind==='skirmish')&&cb.noKill){
   for(const pt of cb.participants)if(pt.side===cb.side){const c=gc(pt.side,pt.slot);if(c){c.total+=CB.LANE;c.laneW+=CB.LANE;}} // 처치 없이 라인 주도권
  }else if(cb.kind==='objective'&&cb.objective!.secured){
   const sec=cb.objective!.secured;
   for(const pt of cb.participants)if(pt.side===sec){const c=gc(pt.side,pt.slot);if(c){c.total+=pt.slot===1?CB.OBJ_JGL:CB.OBJ;c.objSec++;}}
  }else if(cb.kind==='teamfight'){
   for(const cc of cb.fight!.contrib){             // 처치·어시 수는 위 cb.kills에서 셌다. 여기선 한타 처치 선정 가중(TF_KB) + 비-처치 축.
    const c=gc(cc.ref.side,cc.ref.slot);if(!c)continue;
    const kb=cc.kill*CB.TF_KB;                      // cc.kill: 처치=+1·어시=+0.5 → 한타 처치·어시에 소액 선정 가중만
    const nk=cc.damage*CB.TF_DMG+(cc.survived?CB.TF_SURV:0);
    c.total+=kb+nk;c.tfW+=kb+nk;
    if(cc.protect>0){c.total+=cc.protect*CB.TF_PROT;c.protW+=cc.protect*CB.TF_PROT;c.protects+=cc.protect;} // 딜러 보호 성공
   }
  }else if(cb.kind==='siege'){
   const sg=cb.siege!;
   if(sg.structuresDown>0)for(const pt of cb.participants)if(pt.side===sg.side){const c=gc(pt.side,pt.slot);if(c){c.total+=(pt.slot===3?CB.SIEGE_ADC:CB.SIEGE)*sg.structuresDown;c.siegeS+=sg.structuresDown;}}
   if(sg.nexus)for(const pt of cb.participants)if(pt.side===sg.side){const c=gc(pt.side,pt.slot);if(c){c.total+=CB.NEXUS;c.nexus=true;}}
  }
 }
 const wSC=cSide[winner===m.a?'A':'B'];
 // tiebreak: total → 전투 기여(kaW+tfW) → 보호(protW) → 선수 id 해시(역할·슬롯 무상관·결정적).
 // 완전 동률에서 슬롯 순서(TOP 우선)로 정하지 않는다(고정 슬롯 편향 방지).
 let pogSlot=0;
 for(let s=1;s<5;s++){
  const a=wSC[s],b=wSC[pogSlot];
  if(a.total>b.total+1e-9){pogSlot=s;continue;}
  if(a.total<b.total-1e-9)continue;
  const ak=a.kaW+a.tfW,bk=b.kaW+b.tfW;
  if(ak>bk+1e-9){pogSlot=s;continue;}
  if(ak<bk-1e-9)continue;
  if(a.protW>b.protW+1e-9){pogSlot=s;continue;}
  if(a.protW<b.protW-1e-9)continue;
  if(hash(ws[s].id)>hash(ws[pogSlot].id))pogSlot=s;
 }
 const pog=ws[pogSlot].id;
 // 선정 이유 = 실제 사건 원자료(가중치 역산 아님). '킬 관여' = 처치 + 어시스트(모든 사건 동일 의미).
 // '피해량'은 가상 점수라 언급하지 않는다(체력·피해 시스템 없음).
 const pc=wSC[pogSlot],whyPog:string[]=[];
 const kaTot=pc.kills+pc.assists;
 if(kaTot>0)whyPog.push(`${kaTot}킬 관여`);
 if(pc.protects>0)whyPog.push(`한타 딜러 보호 ${Math.round(pc.protects)}회`);
 if(pc.objSec>0)whyPog.push(`오브젝트 ${pc.objSec}회 확보`);
 if(pc.siegeS>0)whyPog.push(`구조물 공성 ${pc.siegeS}회`);
 if(pc.nexus)whyPog.push('넥서스 파괴 가담');
 if(!whyPog.length)whyPog.push('라인·운영 주도권');
 const pogReason=`${ROLES[pogSlot]} · ${whyPog.slice(0,3).join(' · ')}`; // 기여가 큰 순서(처치>보호>오브>공성>넥서스)로 최대 3개
 // F14: 리캡을 "경기 전 승리 계획 → 중요 분기점(최대 3) → 핵심 기여 → 잃은 자원 → 다음 세트 제안"으로
 // 구성한다. 각 카드는 실제 사건(evidence)에 묶고, 없는 걸 지어내지 않는다(분기점은 실제 있었던 만큼만).
 const loserId=winner===m.a?m.b:m.a, loserSide:Side=winner===m.a?'B':'A';
 const structLost=events.filter(e=>e.combat?.kind==='siege'&&e.combat.siege!.side===(winner===m.a?'A':'B')).reduce((n,e)=>n+(e.combat!.siege!.structuresDown??0),0);
 const baseTurretsLost=2-cs.baseTurrets[loserSide];
 const objTotal=events.filter(e=>e.combat?.kind==='objective').length;
 const objSecuredByLoser=events.filter(e=>e.combat?.kind==='objective'&&e.combat!.objective!.secured===loserSide).length;
 const objSecuredByWinner=events.filter(e=>e.combat?.kind==='objective'&&e.combat!.objective!.secured===(winner===m.a?'A':'B')).length;

 // 분기점: 퍼스트블러드(실제로 있었다면) → 첫 구조물(실제로 있었다면) → 세트 종료 사건. 중복 사건은 한 번만.
 // 사건 하나가 여러 의미를 가질 수 있다(예: 오브젝트 교전에서 첫 킬이 나온 경우) — 왜 골랐는지 이유를 라벨로 명시한다
 // (e.detail만으론 "왜 이게 분기점인가"가 안 드러난다).
 const fbEvent=events.find(e=>(e.beats||[]).some(b=>b.label==='FIRST BLOOD'));
 const structEvent=events.find(e=>e.combat?.kind==='siege'&&(e.combat.siege!.structuresDown??0)>0);
 const endEvent=events.at(-1);
 const tpDefs:[typeof fbEvent,string][]=[[fbEvent,'첫 킬'],[structEvent,'첫 구조물'],[endEvent,'세트 종료']];
 const tpSeen=new Set<number>();
 const turningPoints:string[]=[];
 for(const [e,label] of tpDefs){
  if(!e||tpSeen.has(e.index))continue;
  tpSeen.add(e.index);
  turningPoints.push(`분기점(${label}) · 사건 #${e.index+1}(${e.phase}) — ${e.detail}`);
 }

 const planLine=nUserIsA!==null
  ?`출전 전 계획: ${TACTICS.find(t=>t.id===nUserTactic)?.name??''} 전술 · 우선 라인 ${nUserFocus}. 조합은 ${compositionPlan(winner===m.a?draft.picksA:draft.picksB).label}.`
  :`조합은 ${compositionPlan(winner===m.a?draft.picksA:draft.picksB).label}.`;
 const pogLine=`핵심 기여 · POG ${ws[pogSlot].name}(${ROLES[pogSlot]}) — ${whyPog.join(', ')}. 승리 팀 5인의 실제 사건 기여를 합산해 뽑았습니다.`;
 const lostLine=`잃은 자원 · ${meta(loserId).short}가 내준 것: 구조물 ${structLost}개${baseTurretsLost>0?` · 넥서스 포탑 ${baseTurretsLost}기`:''}${cs.nexus[loserSide]?' · 넥서스':''}. 오브젝트 ${objSecuredByLoser}/${objTotal}회 확보(상대 ${objSecuredByWinner}회).`;
 const nextLine=`다음 세트 제안 · ${['라인전','오브젝트','한타'][weak]}에서 ${Math.abs(diffs[weak]).toFixed(1)}의 전력 ${diffs[weak]<0?'열세':'우위'}. ${weak===2?'피로와 조합, 팀 호흡을 함께 확인하세요.':weak===1?'정글·서포터 훈련과 운영 전술을 검토하세요.':'라인 주도권과 우선 라인을 조정해 보세요.'}`;

 return {winner,endReason,capDiag,events,draft,pog,pogReason,powersA:pa,powersB:pb,leadA:lead.map(x=>Math.round(x)),draftFx:{lane:Math.round(de.lane*100)/100,obj:Math.round(de.obj*100)/100,fight:Math.round(de.fight*100)/100},lineupA:starters(g,m.a).map(p=>p.id),lineupB:starters(g,m.b).map(p=>p.id),firstStructTeam:firstStructSide?(firstStructSide==='A'?m.a:m.b):undefined,recap:[planLine,...turningPoints,pogLine,lostLine,nextLine]};
}
function finishMatch(g:Game,m:Match){m.winner=m.scoreA>m.scoreB?m.a:m.b;const a=team(g,m.a),b=team(g,m.b);if(g.stage==='REGULAR'){a.sw+=m.scoreA;a.sl+=m.scoreB;b.sw+=m.scoreB;b.sl+=m.scoreA;(m.winner===m.a?a:b).wins++;(m.winner===m.a?b:a).losses++;}for(const t of [a,b]){for(const p of g.players.filter(p=>new Set(m.sets.flatMap(s=>t.id===m.a?s.lineupA:s.lineupB)).has(p.id))){p.burn=clamp(p.burn+4);p.form=clamp(p.form+(t.id===m.winner?2:-2));}t.familiarity[key(t)]=clamp((t.familiarity[key(t)]??20)+1,20,100);}
 for(const set of m.sets){const p=g.players.find(p=>p.id===set.pog);if(p)p.pog++;
  for(const e of set.events){const cb=e.combat;if(!cb)continue;for(const k of cb.kills){
   const kp=g.players.find(x=>x.id===(k.killer.side==='A'?set.lineupA:set.lineupB)[k.killer.slot]);if(kp)kp.kills=(kp.kills??0)+1;
   const vp=g.players.find(x=>x.id===(k.victim.side==='A'?set.lineupA:set.lineupB)[k.victim.slot]);if(vp)vp.deaths=(vp.deaths??0)+1;
   for(const as of k.assists){const ap=g.players.find(x=>x.id===(as.side==='A'?set.lineupA:set.lineupB)[as.slot]);if(ap)ap.assists=(ap.assists??0)+1;}
  }}
 }
 for(const s of m.sets)for(const A of [true,false]){const tid=A?m.a:m.b,picks=A?s.draft.picksA:s.draft.picksB,lineup=A?s.lineupA:s.lineupB,won=m.winner===tid,coach=team(g,tid).staff?.coach??0;for(let i=0;i<5;i++){const pl=g.players.find(x=>x.id===lineup[i]);if(!pl||pl.id.startsWith('emergency')||!picks[i])continue;gainMastery(pl,picks[i],Math.round((4+(won?2:0)+(s.pog===pl.id?3:0))*(1+coach*.1)));}}
 g.history.unshift({id:m.id,a:m.a,b:m.b,sa:m.scoreA,sb:m.scoreB,winner:m.winner,label:m.label,season:g.season});g.history=g.history.slice(0,400);
 // F16: 세트마다 양 팀 관점으로 스카우팅 표본을 하나씩 남긴다(원본 사건 전체가 아니라 요약값만 — 저장 용량 제한).
 if(!g.scout)g.scout={};
 for(const [tid,side] of [[m.a,'A'],[m.b,'B']] as [string,Side][]){
  const samples:SetScout[]=(g.scout[tid]??[]).slice();
  for(const s of m.sets){
   const mine=side==='A';
   const objEvents=s.events.filter(e=>e.combat?.kind==='objective');
   const winnerLineup=s.winner===m.a?s.lineupA:s.lineupB;
   const pogSlot=winnerLineup.indexOf(s.pog);
   samples.unshift({
    season:g.season,
    picks:mine?s.draft.picksA:s.draft.picksB, oppPicks:mine?s.draft.picksB:s.draft.picksA,
    won:s.winner===tid, endReason:s.endReason,
    tookFirstStruct:s.firstStructTeam===tid,
    objSecured:objEvents.filter(e=>e.combat!.objective!.secured===side).length, objTotal:objEvents.length,
    leadSlots:(s.leadA??[0,0,0,0,0]).map(v=>mine?v:-v),
    pogRole:s.winner===tid&&pogSlot>=0?ROLES[pogSlot]:undefined,
   });
  }
  g.scout[tid]=samples.slice(0,SCOUT_CAP);
 }
 // F18 Phase C: 성장 과제 관측. 완료된 세트(m.sets)를 이 함수에서 1회만 순회한다 — 리플레이 재생·배속·
 // 되감기는 클라이언트 애니메이션일 뿐 finishMatch를 다시 부르지 않으므로 중복 관측되지 않는다.
 for(const pl of roster(g)){
  if(!pl.challenge||pl.challenge.status!=='active')continue;
  outer: for(const s of m.sets){
   if(pl.challenge.id==='safe_commit'){
    const side=s.lineupA[1]===pl.id?'A':s.lineupB[1]===pl.id?'B':null;
    if(!side)continue; // 이 세트에 정글로 출전하지 않았으면 관측 기회가 없다(평가 보류로 남는다)
    for(const e of s.events){
     const cb=e.combat; if(!cb||cb.kind!=='gank'||cb.side!==side)continue;
     pl.challenge=recordObservation(pl.challenge,!cb.spotted);
     if(pl.challenge.status!=='active')break outer;
    }
   }else if(pl.challenge.id==='obj_priority'){
    let mySide:Side|null=null,mySlot=-1;
    for(let sl=0;sl<5;sl++){ if(s.lineupA[sl]===pl.id){mySide='A';mySlot=sl;break;} if(s.lineupB[sl]===pl.id){mySide='B';mySlot=sl;break;} }
    if(!mySide)continue;
    for(const e of s.events){
     const cb=e.combat; if(!cb||cb.kind!=='objective')continue;
     const joined=cb.participants.some(r=>r.side===mySide&&r.slot===mySlot);
     const nj=(cb.notJoined||[]).find(n=>n.ref.side===mySide&&n.ref.slot===mySlot);
     if(!joined&&nj&&(nj.reason==='이동 중(도착 전)'||nj.reason==='전투 이탈(리스폰 대기)'))continue; // 실제 선택 기회가 아니었음
     if(!joined&&!nj)continue;
     pl.challenge=recordObservation(pl.challenge,joined);
     if(pl.challenge.status!=='active')break outer;
    }
   }
  }
 }}
// F16: 다음 상대를 준비하는 분석실. 저장된 스카우팅 표본(g.scout, 팀당 최근 SCOUT_CAP세트)만 읽는다 —
// 진행 중인/다음 경기의 확정 픽·난수·실제 명령은 절대 참조하지 않는다(완료된 과거 세트만).
export type ScoutReport={teamId:string,sampleSize:number,seasonRange:[number,number]|null,winRate:number,
 pickFreq:Record<Role,{champ:string,count:number}[]>,firstStructRate:number,objRate:number,
 avgLead:number[],strongRole:Role|null,weakRole:Role|null,
 pogRoleFreq:{role:Role,count:number}[],endReasonFreq:{reason:string,count:number}[]};
export function scoutReport(g:Game,teamId:string,limit=SCOUT_CAP):ScoutReport{
 const samples=(g.scout?.[teamId]??[]).slice(0,limit);
 const sampleSize=samples.length;
 if(!sampleSize)return {teamId,sampleSize:0,seasonRange:null,winRate:0,
  pickFreq:Object.fromEntries(ROLES.map(r=>[r,[] as {champ:string,count:number}[]])) as Record<Role,{champ:string,count:number}[]>,
  firstStructRate:0,objRate:0,avgLead:[0,0,0,0,0],strongRole:null,weakRole:null,pogRoleFreq:[],endReasonFreq:[]};
 const seasons=samples.map(s=>s.season);
 const seasonRange:[number,number]=[Math.min(...seasons),Math.max(...seasons)];
 const winRate=samples.filter(s=>s.won).length/sampleSize;
 const pickFreq=Object.fromEntries(ROLES.map((r,ri)=>{
  const counts=new Map<string,number>();
  for(const s of samples){const c=s.picks[ri];if(c)counts.set(c,(counts.get(c)??0)+1);}
  return [r,[...counts.entries()].map(([champ,count])=>({champ,count})).sort((a,b)=>b.count-a.count).slice(0,3)];
 })) as Record<Role,{champ:string,count:number}[]>;
 const firstStructRate=samples.filter(s=>s.tookFirstStruct).length/sampleSize;
 const objSecuredSum=samples.reduce((n,s)=>n+s.objSecured,0), objTotalSum=samples.reduce((n,s)=>n+s.objTotal,0);
 const objRate=objTotalSum?objSecuredSum/objTotalSum:0;
 const avgLead=[0,1,2,3,4].map(i=>avg(samples.map(s=>s.leadSlots[i]??0)));
 const bestIdx=avgLead.indexOf(Math.max(...avgLead)), worstIdx=avgLead.indexOf(Math.min(...avgLead));
 const strongRole=avgLead[bestIdx]>150?ROLES[bestIdx]:null;
 const weakRole=avgLead[worstIdx]<-150&&worstIdx!==bestIdx?ROLES[worstIdx]:null;
 const pogCounts=new Map<Role,number>();
 for(const s of samples)if(s.pogRole)pogCounts.set(s.pogRole as Role,(pogCounts.get(s.pogRole as Role)??0)+1);
 const pogRoleFreq=[...pogCounts.entries()].map(([role,count])=>({role,count})).sort((a,b)=>b.count-a.count);
 const reasonCounts=new Map<string,number>();
 for(const s of samples)if(s.endReason)reasonCounts.set(s.endReason,(reasonCounts.get(s.endReason)??0)+1);
 const endReasonFreq=[...reasonCounts.entries()].map(([reason,count])=>({reason,count}));
 return {teamId,sampleSize,seasonRange,winRate,pickFreq,firstStructRate,objRate,avgLead,strongRole,weakRole,pogRoleFreq,endReasonFreq};
}
function autoMatch(g:Game,m:Match){ensureLineup(g,m.a);ensureLineup(g,m.b);while(Math.max(m.scoreA,m.scoreB)<Math.floor(m.bestOf/2)+1){const s=simulateSet(g,m);m.sets.push(s);s.winner===m.a?m.scoreA++:m.scoreB++;}finishMatch(g,m);m.sets=[];}
// F20: 파산 방지 구제(비상 지원)는 있었지만 반복돼도 지원액·대가가 전혀 바뀌지 않아 "모든 선택이
// 무의미해지지 않게"라는 완료 조건을 어기고 있었다 — 매 시즌 리셋되는 카운터(t.bailouts)로 반복될수록
// 지원액이 줄고(30억→22→14→10억 하한) 2회째부터 팬 만족도가 깎이게 했다. 완전히 막지는 않는다(그러면
// 게임이 잠길 수 있어 10억 하한은 유지) — 사용자 구단에는 그 규칙을 뉴스로 그대로 설명한다(숨기지 않음).
function settleWeek(g:Game){g.settledWeeks=(g.settledWeeks??0)+1;for(const t of g.teams){const net=Math.round((320000+30000*t.fan/100-50000-payroll(g,t.id)-staffCost(t))/33);pay(g,t,net,'주간 운영 정산');if(t.cash<0){t.bailouts=(t.bailouts??0)+1;const amt=Math.max(10000,30000-(t.bailouts-1)*8000);pay(g,t,amt,`구단 비상 지원(이번 시즌 ${t.bailouts}회째)`);if(t.bailouts>=2)t.fan=clamp(t.fan-3);if(t.id===g.teamId)news(g,t.bailouts===1?`구단이 긴급 지원 ${money(amt)}을 받았습니다. 반복되면 지원액이 줄고 팬 만족도가 떨어집니다.`:`구단 비상 지원 ${t.bailouts}회째 — 지원액이 ${money(amt)}로 줄고 팬 만족도가 하락했습니다.`);}}const rng=random(hash(`${g.seed}-${g.season}-${g.split}-${g.round}-${g.settledWeeks}-news`));if(rng()<.15){const t=team(g);if(rng()<.5){t.fan=clamp(t.fan+2);news(g,'지역 팬들의 응원 인터뷰가 공개되었습니다. 팬 만족도 +2');}else{pay(g,t,2000,'스폰서 특별 후원');news(g,'스폰서 특별 후원 0.2억이 입금되었습니다.');}}}
function poPair(g:Game,n:number):[string,string]{const s=g.poSeeds,w=(i:number)=>g.po[i].winner!,l=(i:number)=>g.po[i].a===w(i)?g.po[i].b:g.po[i].a;if(n===0)return[s[2],s[5]];if(n===1)return[s[3],s[4]];if(n===2||n===3){const wins=[w(0),w(1)].sort((a,b)=>s.indexOf(b)-s.indexOf(a));return[n===2?s[0]:s[1],wins[n===2?0:1]];}if(n===4)return[w(2),w(3)];if(n===5)return[l(2),l(3)];if(n===6)return[l(4),w(5)];return[w(4),w(6)];}
function nextPO(g:Game){while(g.po.length<8){const n=g.po.length,[a,b]=poPair(g,n);const m:Match={id:`${g.season}-${g.split}-po-${n}`,a,b,bestOf:5,scoreA:0,scoreB:0,sets:[],label:`${g.split} PO ${['6강 A','6강 B','승자조 A','승자조 B','승자조 결승','패자조 1R','패자조 결승','결승'][n]}`};if([a,b].includes(g.teamId)){g.match=m;g.phase='PREP';ensureLineup(g,a);ensureLineup(g,b);return;}autoMatch(g,m);g.po.push(m);}g.champion=g.po[7].winner!;endSplit(g);}
function endSplit(g:Game){for(let week=0;week<3;week++)settleWeek(g);const rank=(id:string)=>{if(id===g.champion)return 1;const loser=(m:Match)=>m.a===m.winner?m.b:m.a;if(id===loser(g.po[7]))return 2;if(id===loser(g.po[6]))return 3;if(id===loser(g.po[5]))return 4;return g.poSeeds.includes(id)?(g.poSeeds.indexOf(id)<4?5:6):standings(g).findIndex(t=>t.id===id)+1;};for(const t of g.teams.filter(domestic)){const r=rank(t.id);t.fan=clamp(t.fan+(t.expected-r)*3);t.points+=11-(standings(g).findIndex(x=>x.id===t.id)+1)+([15,10,6,6,3,3][r-1]??0);pay(g,t,r===1?20000:r===2?10000:r<=4?5000:2000,'스플릿 상금');}g.hall.unshift({season:g.season,split:g.split,champion:g.champion!,rank:rank(g.teamId)});g.hall=g.hall.slice(0,100);g.phase='SPLIT_END';g.match=null;news(g,`${meta(g.champion!).name}, ${g.split==='SPRING'?'스프링':'서머'} 우승!`);}
function regularNext(g:Game){const m=g.match!;for(const [a,b]of g.fixtures[g.round])if(![a,b].includes(g.teamId))autoMatch(g,{id:`${g.season}-${g.split}-${g.round}-${a}`,a,b,bestOf:3,scoreA:0,scoreB:0,sets:[],label:`${g.split} R${g.round+1}`});g.match=null;if(g.round%2===1)settleWeek(g);g.round++;if(g.round===18){g.stage='PLAYOFF';g.poSeeds=standings(g).slice(0,6).map(t=>t.id);g.po=[];news(g,'정규시즌이 종료되었습니다. 플레이오프 대진이 확정되었습니다.');nextPO(g);}else{g.phase=g.round%2===0?'PLAN':'PREP';if(g.phase==='PREP')loadMatch(g);}}
function startSplit(g:Game){g.round=0;g.stage='REGULAR';g.phase='PLAN';g.match=null;g.po=[];g.champion=null;for(const t of g.teams){t.wins=0;t.losses=0;t.sw=0;t.sl=0;}for(const p of g.players){p.burn=clamp(p.burn-20);p.form=50;}g.fixtures=schedule(g.teams.filter(domestic).map(t=>t.id));}
function nextYear(g:Game){g.season++;g.offWeek=0;g.phase='OFFSEASON';g.match=null;
 // F22: "게임 내 메타" 변경 시점·이유를 news에 남긴다 — 지금까지는 g.meta가 시즌마다 조용히
 // 바뀌었을 뿐 어디에도 기록되지 않았다. 실데이터가 아니라 seed/season 기반 로테이션이라는 점은
 // 화면 문구("시즌 X 메타 챔피언")와 GAME_RULES.md에 이미 명시돼 있다 — 여기선 "언제 바뀌었는지"만 더한다.
 const oldMeta=new Set(g.meta);
 g.meta=metaChampions(g.seed,g.season);
 const newlyHot=g.meta.filter(id=>!oldMeta.has(id)).slice(0,3).map(champName).join(', ');
 news(g,`시즌 ${g.season} 게임 내 메타 개편${newlyHot?` — ${newlyHot} 등 부각`:''}(실제 통계 연동 아님, 시즌마다 로테이션)`);
 for(const t of g.teams)t.bailouts=0;const rng=random(hash(`${g.seed}-${g.season}-newyear`));for(const p of g.players){p.age++;const d=p.age>=32?1.5:p.age>=29?1:p.age>=26?.5:0;p.stats=p.stats.map((s,k)=>clamp(s-([0,4].includes(k)?d:p.age>=29?.3:0),1,99));p.pot=p.pot.map((s,k)=>clamp(s-([0,4].includes(k)?d:p.age>=29?.3:0),1,99));p.burn=0;p.form=50;if(p.nextSalary!==undefined){p.salary=p.nextSalary;p.until=p.nextUntil!;delete p.nextSalary;delete p.nextUntil;}if(p.until<g.season){if(p.teamId&&p.teamId!==g.teamId&&ROLES.some(r=>team(g,p.teamId!).lineup[r]===p.id)){p.until=g.season+1;}else p.teamId=null;}}
 g.players=g.players.filter(p=>!p.id.startsWith('emergency')&&!(p.teamId===null&&(p.age>=40||(p.age>=30&&rng()<.1))));
 for(let i=0;i<10;i++)g.players.push(makePlayer(100+g.season*10+i,ROLES[i%5],null,42+rng()*18,g.season,rng));for(const t of g.teams){t.points=0;if(t.id!==g.teamId){for(const r of ROLES){let options=roster(g,t.id).filter(p=>p.role===r);if(!options.length){let fa=g.players.filter(p=>!p.teamId&&p.role===r).sort((a,b)=>ovr(b)-ovr(a)).find(p=>payroll(g,t.id)+p.salary<=250000);if(!fa){fa=makePlayer(1000+g.season*100+g.teams.indexOf(t)*5+ROLES.indexOf(r),r,null,38,g.season,rng);g.players.push(fa);}fa.teamId=t.id;fa.until=g.season;options=[fa];}t.lineup[r]=options.sort((a,b)=>ovr(b)-ovr(a))[0].id;}}}
 const sorted=g.teams.filter(domestic).map(t=>({id:t.id,value:avg(roster(g,t.id).map(ovr))})).sort((a,b)=>b.value-a.value);g.teams.filter(domestic).forEach(t=>t.expected=sorted.findIndex(x=>x.id===t.id)+1);news(g,`시즌 ${g.season} 스토브리그 개막. 만료 계약과 포지션 공석을 확인하세요.`);}
function requirePhase(g:Game,phases:string[]){if(!phases.includes(g.phase))throw Error('현재 단계에서는 할 수 없는 작업입니다.');}
export function applyCommand(source:Game,cmd:Command):Game{const g=upgradeGame(structuredClone(source)),p=cmd.payload??{};switch(cmd.type){
 case 'assignChallenge':{requirePhase(g,['PLAN']);const x=roster(g).find(x=>x.id===p.id);if(!x)throw Error('선수를 확인해 주세요.');const cid=String(p.challenge);if(!CHALLENGES[cid as ChallengeId])throw Error('성장 과제를 확인해 주세요.');if(x.challenge&&x.challenge.status==='active')throw Error('이미 진행 중인 성장 과제가 있습니다. 완료되거나 종료된 뒤 새로 지정할 수 있습니다.');x.challenge=startChallenge(cid as ChallengeId,g.season);break;}
 case 'training':{requirePhase(g,['PLAN']);const ps=p.id==='all'?roster(g):roster(g).filter(x=>x.id===p.id);if(!TRAININGS.some(t=>t.id===p.training)||!ps.length)throw Error('훈련을 확인해 주세요.');const champ=p.champ!==undefined?String(p.champ):undefined;if(champ){if(!CHAMPIONS.some(c=>c.id===champ))throw Error('특훈할 챔피언을 확인해 주세요.');const full=ps.find(x=>!x.mastery.some(m=>m.champ===champ)&&x.mastery.length>=MASTERY_POOL);if(full)throw Error(`${full.name}의 숙련 챔피언이 ${MASTERY_POOL}칸으로 가득 찼습니다. 기존 숙련 챔피언 중에서 골라 주세요.`);}ps.forEach(x=>{x.training=String(p.training);if(p.champ!==undefined)x.trainChamp=champ||undefined;});break;}
 case 'train':requirePhase(g,['PLAN']);train(g);break;
 case 'strategy':requirePhase(g,['PLAN','PREP']);if(!TACTICS.some(t=>t.id===p.tactic)||!['TOP','MID','BOT'].includes(String(p.focus)))throw Error('전술을 확인해 주세요.');team(g).tactic=String(p.tactic);team(g).focus=String(p.focus);break;
 case 'lineup':{requirePhase(g,['PLAN','PREP','OFFSEASON']);const x=roster(g).find(x=>x.id===p.id);if(!x||x.burn>=90)throw Error('출전할 수 없는 선수입니다.');team(g).lineup[x.role]=x.id;break;}
 case 'startDraft':{requirePhase(g,['PREP']);if(!g.match)loadMatch(g);const m=g.match!;m.draft=undefined;m.draftState=newDraftState(g,m);advanceDraft(g,m,m.draftState);g.phase='DRAFT';break;}
 case 'draftPick':{requirePhase(g,['DRAFT']);const m=g.match!,ds=m.draftState;if(!ds||ds.complete)throw Error('밴픽이 이미 끝났습니다.');if(draftTurnTeam(ds)!==g.teamId)throw Error('지금은 상대 팀 차례입니다.');const champ=String(p.champ);if(!legalDraftCandidates(g,ds).some(c=>c.id===champ))throw Error('지금 선택할 수 없는 챔피언입니다.');applyDraftStep(ds,champ);advanceDraft(g,m,ds);break;}
 case 'draftReset':{requirePhase(g,['DRAFT']);const m=g.match!;m.draft=undefined;m.draftState=newDraftState(g,m);advanceDraft(g,m,m.draftState);break;}
 case 'draftSwap':{requirePhase(g,['DRAFT']);const m=g.match!,ds=m.draftState;if(!ds?.complete)throw Error('밴픽을 먼저 완료해 주세요.');const from=Number(p.from),to=Number(p.to);if(![from,to].every(n=>Number.isInteger(n)&&n>=0&&n<5)||from===to)throw Error('스왑 위치를 확인해 주세요.');const picks=draftPicksOf(ds,g.teamId),rf=ROLES[from],rt=ROLES[to],pf=picks.find(x=>x.role===rf),pt=picks.find(x=>x.role===rt);if(!pf||!pt)throw Error('스왑할 픽을 찾지 못했습니다.');pf.role=rt;pt.role=rf;m.draft=draftToResult(m,ds);break;}
 // F04: 'play'는 이제 즉시 세트를 끝내지 않는다 — 라인전 3사건(중립 directive로 미리보기 계산, 이후 실제
 // 계산과 반드시 동일해야 하므로 'tacticalChoice'에서 앞 3사건을 검증한다)까지 보여주고 오브젝트 준비 구간
 // 감독 지시를 기다린다. 기존 일괄 계산(simulateSet(g,m))은 directive 생략 시 완전히 동일하게 동작한다
 // (autoMatch·회귀 테스트는 이 경로를 그대로 쓴다 — 호환 경로 보존).
 case 'play':{requirePhase(g,['DRAFT']);const m=g.match!;if(!m.draftState?.complete&&!m.draft)throw Error('밴픽을 먼저 완료해 주세요.');const preview=simulateSet(g,m);m.tacticalState={previewEvents:preview.events.slice(0,3)};g.phase='TACTICAL';break;}
 case 'tacticalChoice':{requirePhase(g,['TACTICAL']);const m=g.match!;const ts=m.tacticalState;if(!ts)throw Error('작전 지시를 진행할 세트가 없습니다.');const choice=String(p.choice);if(!['prepare','trade','regroup','protect','allin'].includes(choice))throw Error('작전 지시를 확인해 주세요.');
  const r=simulateSet(g,m,choice as TacticalChoice);
  if(JSON.stringify(r.events.slice(0,3))!==JSON.stringify(ts.previewEvents))throw Error('라인전 결과가 미리보기와 달라 진행할 수 없습니다. 다시 시도해 주세요.'); // 결정성 안전장치 — 정상 동작에서는 항상 통과한다
  m.sets.push(r);r.winner===m.a?m.scoreA++:m.scoreB++;m.draft=undefined;m.draftState=undefined;m.tacticalState=undefined;g.phase='RECAP';break;}
 case 'continue':{requirePhase(g,['RECAP']);const m=g.match!;if(Math.max(m.scoreA,m.scoreB)>=Math.floor(m.bestOf/2)+1){finishMatch(g,m);g.phase='MATCH_END';news(g,`${meta(m.a).short} ${m.scoreA}:${m.scoreB} ${meta(m.b).short} · ${m.winner===g.teamId?'승리':'패배'}`);}else g.phase='PREP';break;}
 case 'advance':requirePhase(g,['MATCH_END']);if(g.stage==='REGULAR')regularNext(g);else if(g.stage==='INTERNATIONAL'){recordInternational(g,g.match!);g.match=null;nextInternational(g);}else{g.po.push(g.match!);g.match=null;nextPO(g);}break;
 case 'nextSplit':requirePhase(g,['SPLIT_END']);startInternational(g,g.split==='SPRING'?'MIDSEASON':'WORLD');break;
 case 'nextCompetition':requirePhase(g,['WORLD_END']);if(g.international?.kind==='MIDSEASON'){for(let week=0;week<2;week++)settleWeek(g);g.split='SUMMER';startSplit(g);}else {for(let week=0;week<3;week++)settleWeek(g);nextYear(g);}break;
 case 'offWeek':requirePhase(g,['OFFSEASON']);g.offWeek=Math.min(4,g.offWeek+1);news(g,`스토브리그 ${g.offWeek}주차. FA 시장이 열려 있습니다.`);break;
 case 'newSeason':requirePhase(g,['OFFSEASON']);for(const r of ROLES){const x=roster(g).find(p=>p.id===team(g).lineup[r]&&p.role===r);if(!x)throw Error(`${r} 선발 선수를 등록해 주세요.`);}if(payroll(g)>250000)throw Error('연봉 총액을 25억 이하로 맞춰 주세요.');for(let week=0;week<4;week++)settleWeek(g);g.split='SPRING';startSplit(g);break;
 case 'sign':{requirePhase(g,['OFFSEASON']);const x=g.players.find(x=>x.id===p.id&&!x.teamId);if(!x)throw Error('이미 계약한 선수입니다.');if(x.releasedSeason===g.season)throw Error('이번 스토브리그에 방출한 선수는 즉시 재영입할 수 없습니다.');if(roster(g).length>=7)throw Error('로스터는 최대 7명입니다.');if(payroll(g)+x.salary>250000)throw Error('샐러리캡 25억을 초과합니다.');const fee=Math.round(x.salary*.1);if(team(g).cash<fee)throw Error('계약금이 부족합니다.');x.teamId=g.teamId;x.until=g.season+(Number(p.years)===2?1:0);pay(g,team(g),-fee,'FA 계약금 · '+x.name);if(!roster(g).some(q=>q.id===team(g).lineup[x.role]))team(g).lineup[x.role]=x.id;news(g,`${x.name} 영입 완료. 연봉 ${money(x.salary)}`);break;}
 case 'renew':{requirePhase(g,['PLAN','PREP','OFFSEASON','SPLIT_END']);const x=roster(g).find(x=>x.id===p.id);if(!x)throw Error('선수를 찾지 못했습니다.');const salary=Math.round(20000*(avg(x.stats)/50)**2);if(x.nextSalary!==undefined)throw Error('이미 다음 시즌 계약을 체결했습니다.');if(roster(g).filter(q=>q.id!==x.id&&(q.until>=g.season+1||q.nextUntil)).reduce((v,q)=>v+(q.nextSalary??q.salary),0)+salary>250000)throw Error('재계약 후 캡을 초과합니다.');const fee=Math.round(salary*.05);if(team(g).cash<fee)throw Error('계약금이 부족합니다.');x.nextSalary=salary;x.nextUntil=g.season+1;pay(g,team(g),-fee,'재계약 · '+x.name);news(g,`${x.name}, 다음 시즌 연봉 ${money(salary)}에 재계약`);break;}
 case 'release':{requirePhase(g,['OFFSEASON']);const x=roster(g).find(x=>x.id===p.id);if(!x)throw Error('선수를 찾지 못했습니다.');const cost=releaseCost(g,x);if(team(g).cash<cost)throw Error(`보장 연봉 ${money(cost)}이 부족합니다.`);pay(g,team(g),-cost,'방출 정산 · '+x.name);x.teamId=null;x.releasedSeason=g.season;delete x.nextSalary;delete x.nextUntil;news(g,`${x.name} 방출. 보장급여 정산 완료.`);break;}
 case 'hireStaff':{requirePhase(g,['PLAN','PREP','OFFSEASON','SPLIT_END','WORLD_END']);const id=String(p.id),level=Number(p.level);if(!STAFF.some(x=>x.id===id)||!Number.isInteger(level)||level<0||level>3)throw Error('스태프 등급을 확인해 주세요.');const t=team(g);t.staff??={coach:0,analyst:0,psych:0};const current=t.staff[id]??0;if(current===level)throw Error('이미 고용한 등급입니다.');const fee=Math.max(0,Math.round((STAFF_COST[level]-STAFF_COST[current])*.1));if(t.cash<fee)throw Error('고용 계약금이 부족합니다.');pay(g,t,-fee,'스태프 계약금');t.staff[id]=level;news(g,`${STAFF.find(x=>x.id===id)!.name} ${level?level+'등급 고용':'계약 종료'}`);break;}
 case 'trade':{requirePhase(g,['OFFSEASON']);const a=roster(g).find(x=>x.id===p.offer),b=g.players.find(x=>x.id===p.target&&x.teamId&&x.teamId!==g.teamId);if(!a||!b||a.role!==b.role)throw Error('같은 포지션의 선수 교환만 가능합니다.');const other=team(g,b.teamId!);const quote=tradeQuote(g,a,b);if(quote.reason)throw Error(quote.reason);pay(g,team(g),-quote.cash,'트레이드 보상금 · '+b.name);pay(g,other,quote.cash,'트레이드 보상금');const old=other.id;a.teamId=old;b.teamId=g.teamId;if(team(g).lineup[a.role]===a.id)team(g).lineup[a.role]=b.id;if(other.lineup[b.role]===b.id)other.lineup[b.role]=a.id;news(g,`${a.name} ↔ ${b.name} 트레이드 성사`);break;}
 // F24: 세이브 가져오기 — 기존 슬롯의 revision·명령 영수증·백업 로테이션을 그대로 타는 일반 명령으로
 // 구현했다(별도 API 경로를 새로 만들지 않음). 그래서 "원본 보존"이 공짜로 따라온다 — API route의
 // UPDATE가 이 명령 적용 직전 상태를 backups[]에 넣고 나서 덮어쓰므로, 가져오기가 잘못돼도 기존
 // "이 시점으로 복원" UI로 그대로 되돌릴 수 있다. 빈 슬롯(아직 커리어가 없는 슬롯)으로의 가져오기는
 // 이번엔 지원하지 않는다 — 먼저 아무 팀으로 커리어를 만든 뒤 가져오면 된다(범위를 의도적으로 좁힘).
 case 'importSave':{
  const imported=p.game as Game;
  if(!imported||typeof imported!=='object'||typeof imported.teamId!=='string'||!Array.isArray(imported.players)||!Array.isArray(imported.teams)||typeof imported.season!=='number'||typeof imported.version!=='number')throw Error('가져올 파일의 형식을 확인해 주세요.');
  return upgradeGame(structuredClone(imported)); // 구버전은 여기서 마이그레이션, 미래 버전은 여기서 명시적으로 거부됨(기존 upgradeGame 규칙 재사용)
 }
 default:throw Error('알 수 없는 작업입니다.');}
 return g;}

export const staffCost=(t:Team)=>Object.values(t.staff??{}).reduce((v,n)=>v+(STAFF_COST[n]??0),0);
export function releaseCost(g:Game,p:Player){return p.nextSalary!==undefined?p.salary+p.nextSalary*Math.max(0,(p.nextUntil??g.season)-g.season):p.salary*Math.max(0,p.until-g.season+1);}
export function tradeQuote(g:Game,a:Player,b:Player):{cash:number,reason?:string}{
 const cash=Math.max(0,Math.round((ovr(b)-ovr(a))*3000+(avg(b.pot)-avg(a.pot))*500));
 if(!a.teamId||!b.teamId||a.teamId===b.teamId||a.role!==b.role)return{cash,reason:'동일 포지션의 타 구단 선수만 교환할 수 있습니다.'};
 if(a.nextSalary!==undefined||b.nextSalary!==undefined)return{cash,reason:'다음 시즌 재계약이 예약된 선수는 교환할 수 없습니다.'};
 if(payroll(g,a.teamId)-a.salary+b.salary>250000||payroll(g,b.teamId)-b.salary+a.salary>250000)return{cash,reason:'거래 후 한 구단의 샐러리캡이 초과됩니다.'};
 if(team(g,a.teamId).cash<cash)return{cash,reason:'트레이드 보상금이 부족합니다.'};
 if(ovr(b)-ovr(a)>12)return{cash,reason:'상대 구단이 핵심 선수의 과도한 전력 하락을 이유로 거절합니다.'};
 return{cash};
}
export function upgradeGame(g:Game):Game{
 if(g.version>3)throw Error('더 새로운 버전의 커리어입니다. 게임을 새로고침해 주세요.');
 for(const t of g.teams)t.staff??={coach:0,analyst:0,psych:0};
 for(const pl of g.players){if(!Array.isArray(pl.mastery)||!pl.mastery.length)pl.mastery=makeMastery(pl.role,pl.id,avg(pl.stats));else for(const m of pl.mastery)m.xp??=0;delete (pl as {signature?:unknown}).signature;}
 g.meta??=metaChampions(g.seed,g.season);
 for(const [i,m] of FOREIGN_META.entries())if(!g.teams.some(t=>t.id===m.id)){
  const rng=random(hash(`${g.seed}-foreign-${m.id}`)),lineup={} as Record<Role,string>;
  for(let r=0;r<5;r++){const p=makePlayer(10000+i*5+r,ROLES[r],m.id,m.base,g.season,rng);const rl=INTL_ROSTER[m.id]?.[r];p.name=rl?rl[0]:handles[(i*5+r+7)%handles.length]+'.'+m.short;p.realName=rl?rl[1]:m.city+' · '+ROLES[r];g.players.push(p);lineup[p.role]=p.id;}
  const ps=g.players.filter(p=>p.teamId===m.id),total=ps.reduce((a,p)=>a+p.salary,0);if(total>240000)ps.forEach(p=>p.salary=Math.floor(p.salary*240000/total));
  const t:Team={id:m.id,lineup,familiarity:{},cash:150000,fan:50,expected:5,tactic:['balanced','early','late','objective'][i%4],focus:['TOP','MID','BOT'][i%3],wins:0,losses:0,sw:0,sl:0,points:0,staff:{coach:0,analyst:0,psych:0}};t.familiarity[key(t)]=50;g.teams.push(t);
 }
 // Earlier releases did not store participation IDs; preserve resolved results.
 if(g.match)for(const s of g.match.sets){s.lineupA??=ROLES.map(r=>team(g,g.match!.a).lineup[r]);s.lineupB??=ROLES.map(r=>team(g,g.match!.b).lineup[r]);}
 // Pre-v3 saves had a fully-auto draft with no interactive state; treat it as a finished draft.
 if(g.match?.draft&&!g.match.draftState&&g.phase==='DRAFT'){const m=g.match,d=m.draft!;m.draftState={blue:m.a,red:m.b,step:DRAFT_ORDER.length,bans:d.bans.map(champ=>({side:'B' as const,champ})),picksBlue:d.picksA.map((champ,i)=>({champ,role:ROLES[i]})),picksRed:d.picksB.map((champ,i)=>({champ,role:ROLES[i]})),actions:d.actions,complete:true};}
 g.version=3;return g;
}
function tournamentMatch(g:Game,a:string,b:string,label:string,bestOf:number):Match{return{id:`${g.season}-${label}-${a}-${b}`,a,b,label,bestOf,scoreA:0,scoreB:0,sets:[]};}
function restTravel(g:Game,ids:string[],amount:number){for(const p of g.players)if(p.teamId&&ids.includes(p.teamId))p.burn=clamp(p.burn-amount);}
function startInternational(g:Game,kind:International['kind']){
 const domesticSeeds=g.teams.filter(domestic).sort((a,b)=>b.points-a.points||g.poSeeds.indexOf(a.id)-g.poSeeds.indexOf(b.id)).map(t=>t.id);
 const foreign=FOREIGN_META.map(t=>t.id).sort((a,b)=>avg(starters(g,b).map(ovr))-avg(starters(g,a).map(ovr)));
 const ids=kind==='MIDSEASON'?[g.champion!,...foreign.slice(0,7)]:[...domesticSeeds.slice(0,3),...foreign];
 if(ids.length!==(kind==='MIDSEASON'?8:16)||new Set(ids).size!==ids.length)throw Error('국제대회 참가 명단을 확인할 수 없습니다.');
 const bracket=[...ids].sort((a,b)=>avg(starters(g,b).map(ovr))-avg(starters(g,a).map(ovr)));
 g.international={kind,stage:kind==='WORLD'?'SWISS':'BRACKET',round:0,participants:ids,table:ids.map(id=>({id,wins:0,losses:0,opponents:[]})),queue:[],matches:[],bracket};
 g.stage='INTERNATIONAL';g.match=null;g.champion=null;restTravel(g,ids,24);
 news(g,`${kind==='WORLD'?'월드 챔피언십':'미드시즌 인비테이셔널'} 개막 · ${ids.includes(g.teamId)?'우리 팀이 진출했습니다!':'우리 팀은 불참합니다. 대회 결과를 확인합니다.'}`);
 if(ids.includes(g.teamId))team(g).fan=clamp(team(g).fan+5);
 nextInternational(g);
}
function swissPairs(rows:{id:string,wins:number,losses:number,opponents:string[]}[],seed:number):[string,string][]{
 const pairs:[string,string][]=[];const rng=random(seed);
 for(const wins of [2,1,0]){
  const group=rows.filter(r=>r.wins===wins&&r.wins<3&&r.losses<3).map(r=>({r,v:rng()})).sort((a,b)=>a.v-b.v).map(x=>x.r);
  function solve(rest:typeof group):[string,string][]|null{if(!rest.length)return[];const a=rest[0];for(let i=1;i<rest.length;i++){if(a.opponents.includes(rest[i].id))continue;const tail=solve(rest.slice(1,i).concat(rest.slice(i+1)));if(tail)return[[a.id,rest[i].id],...tail];}return null;}
  const solution=solve(group);if(solution)pairs.push(...solution);else for(let i=0;i<group.length;i+=2){if(!group[i+1])throw Error('스위스 대진 인원이 맞지 않습니다.');pairs.push([group[i].id,group[i+1].id]);}
 }
 return pairs;
}
function prepareInternationalRound(g:Game){const i=g.international!;
 if(i.stage==='SWISS'){
  const active=i.table.filter(r=>r.wins<3&&r.losses<3);
  if(!active.length){i.stage='BRACKET';i.round=0;i.bracket=i.table.filter(r=>r.wins===3).sort((a,b)=>a.losses-b.losses||i.participants.indexOf(a.id)-i.participants.indexOf(b.id)).map(r=>r.id);if(i.bracket.length!==8)throw Error('스위스 8강 명단 오류');prepareInternationalRound(g);return;}
  i.round++;if(i.round>5)throw Error('스위스 라운드 제한을 초과했습니다.');
  i.queue=swissPairs(active,hash(`${g.seed}-${g.season}-swiss-${i.round}`)).map(([a,b])=>{const ra=i.table.find(r=>r.id===a)!;return tournamentMatch(g,a,b,`${i.kind} SWISS ${i.round}`,ra.wins===2||ra.losses===2?3:1);});
 }else{
  if(i.bracket.length===1){finishInternational(g);return;}
  i.round++;i.queue=[];for(let k=0;k<i.bracket.length/2;k++)i.queue.push(tournamentMatch(g,i.bracket[k],i.bracket[i.bracket.length-1-k],`${i.kind} ${i.bracket.length===2?'FINAL':i.bracket.length===4?'SEMIFINAL':'QUARTERFINAL'}`,5));
  i.bracket=[];
 }
 restTravel(g,i.participants,4);
}
function recordInternational(g:Game,m:Match){const i=g.international!;if(!m.winner)throw Error('국제 경기 결과가 없습니다.');
 if(i.stage==='SWISS'){const a=i.table.find(r=>r.id===m.a)!,b=i.table.find(r=>r.id===m.b)!;(m.winner===m.a?a:b).wins++;(m.winner===m.a?b:a).losses++;a.opponents.push(b.id);b.opponents.push(a.id);}else i.bracket.push(m.winner);
 i.matches.push({...m,sets:[]});
}
function nextInternational(g:Game){const i=g.international!;for(let guard=0;guard<100;guard++){
 if(!i.queue.length){prepareInternationalRound(g);if(g.phase==='WORLD_END')return;}
 const m=i.queue.shift();if(!m)throw Error('다음 국제 경기가 없습니다.');
 if([m.a,m.b].includes(g.teamId)){g.match=m;g.phase='PREP';ensureLineup(g,m.a);ensureLineup(g,m.b);return;}
 autoMatch(g,m);recordInternational(g,m);
 }throw Error('국제대회 진행 한도를 초과했습니다.');}
function finishInternational(g:Game){const i=g.international!;i.champion=i.bracket[0];i.stage='DONE';g.champion=i.champion;g.phase='WORLD_END';g.match=null;
 let rank=0;if(i.participants.includes(g.teamId)){const loss=i.matches.filter(m=>[m.a,m.b].includes(g.teamId)&&m.winner!==g.teamId).at(-1);rank=i.champion===g.teamId?1:loss?.label.includes('FINAL')&&!loss?.label.includes('SEMIFINAL')&&!loss?.label.includes('QUARTERFINAL')?2:loss?.label.includes('SEMIFINAL')?3:loss?.label.includes('QUARTERFINAL')?5:9;}
 g.hall.unshift({season:g.season,split:i.kind,champion:i.champion!,rank});g.hall=g.hall.slice(0,100);for(const id of i.participants)pay(g,team(g,id),id===i.champion?(i.kind==='WORLD'?100000:50000):5000,'국제대회 상금');if(i.champion===g.teamId)team(g).fan=clamp(team(g).fan+10);
 news(g,`${meta(i.champion!).name}, ${i.kind==='WORLD'?'월드 챔피언십':'미드시즌 인비테이셔널'} 우승!`);
}

// Draft recommendations share the same composition evaluator as AI; no future match seed.
// F21: m(현재 매치)을 선택 인자로 받아 aiPick과 같은 seriesSignal을 노출한다 — AI만 아는 정보가
// 없도록, 사용자가 직접 픽/밴할 때도 "상대가 세트1에서 이긴 챔피언"·"우리가 세트1에서 진 픽"을
// 똑같이 볼 수 있게 한다. m을 생략하면(과거 호출부·테스트) 신호가 비어 있어 기존과 100% 동일.
export function draftRecommendations(g:Game,ds:DraftState,teamId:string,kind:'BAN'|'PICK',m?:Match){
 const other=teamId===ds.blue?ds.red:ds.blue;
 const own=draftPicksOf(ds,teamId).map(p=>p.champ),enemy=draftPicksOf(ds,other).map(p=>p.champ);
 const ids=kind==='PICK'?own:enemy,players=starters(g,kind==='PICK'?teamId:other);
 const opposition=kind==='PICK'?enemy:own;
 const base=draftFitScore(ids,opposition);
 const {oppWinChamps,myLossChamps}=m?seriesSignal(m,teamId):{oppWinChamps:new Set<string>(),myLossChamps:new Set<string>()};
 return legalDraftCandidates(g,ds).map(c=>{
  const picks=[...ids,c.id];let best=-Infinity,role:Role=c.role,mastery=0;
  for(const perm of ROLE_PERMS){
   let score=0;
   for(let i=0;i<picks.length;i++)score+=masteryLevel(players[ROLES.indexOf(perm[i])],picks[i])*2-assignCost(picks[i],perm[i])*3;
   if(score>best){best=score;role=perm[picks.length-1];mastery=masteryLevel(players[ROLES.indexOf(role)],c.id);}
  }
  const fit=draftFitScore(picks,opposition)-base;
  const seriesNote=kind==='BAN'&&oppWinChamps.has(c.id)?' · 상대가 이전 세트 승리에 썼던 챔피언':kind==='PICK'&&myLossChamps.has(c.id)?' · 우리가 이전 세트 패배에 썼던 챔피언(주의)':'';
  const score=best+fit*1.5+(isMeta(g,c.id)?3:0)+(kind==='BAN'&&oppWinChamps.has(c.id)?4:0)-(kind==='PICK'&&myLossChamps.has(c.id)?3:0);
  return {champ:c.id,score,role,reason:`${kind==='BAN'?'상대':'배정'} ${role} · 숙련 Lv${mastery} · ${compositionPlan(picks).label}${roleFit(c.id,role)==='off'?' · 오프롤 주의':''}${seriesNote}`};
 }).sort((a,b)=>b.score-a.score||a.champ.localeCompare(b.champ)).slice(0,3);
}
