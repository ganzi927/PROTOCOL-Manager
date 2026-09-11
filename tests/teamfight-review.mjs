// 단위 4·5 검증 하네스: 참여자 기반 한타 + 스노볼·구조물·종료의 행동 지표와 강화 효과.
// 통제: 전원 스탯70·폼50·번아웃0·호흡50·균형 전술·미드 우선·메타 없음. balance-review.mjs와 동일 조합.
// 보고 규칙(사용자 지시):
//  - 강화 효과 = (강화 조건 − 같은 버전 균형)을 동일 시드로 짝지어 계산하고 95% 신뢰구간을 함께 보고.
//  - 작은 양수만으로 개선을 확정하지 않는다. 시드 수·원자료 집계 수를 보존한다.
//  - 목표 승률에 맞춘 전역 계수 조정은 하지 않는다.
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {writeFileSync} from 'node:fs';

const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'tf-1',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'CONTROL',draft:{picksA:a,picksB:b,bans:[],actions:[]}};

const S={LNE:0,TF:1,OBJ:2,VIS:3,MEC:4,CAR:5}; // 슬롯: 0 TOP 1 JGL 2 MID 3 ADC 4 SUP
const specs=[
 ['equal',()=>{}],
 ['TOP_LNE+20', g=>starters(g)[0].stats[S.LNE]=90],
 ['SUP_VIS+20', g=>starters(g)[4].stats[S.VIS]=90],
 ['JGL_OBJ+20', g=>starters(g)[1].stats[S.OBJ]=90],
 ['ADC_CAR+20', g=>starters(g)[3].stats[S.CAR]=90],
 ['ADC_MEC+20', g=>starters(g)[3].stats[S.MEC]=90],
 ['SUP_TF+20',  g=>starters(g)[4].stats[S.TF]=90],
 ['team_all+10',g=>starters(g).forEach(p=>p.stats.fill(80))],
];
const N=Number(process.argv[2]||8000);

// 세트 하나에서 A 관점 지표 추출.
function setMetrics(r){
 const mtr={
  win:r.winner==='nva'?1:0, nexus:r.endReason==='NEXUS'?1:0,
  cap:r.endReason!=='NEXUS'?1:0, capTime:r.endReason==='CAP_TIME'?1:0, capEvent:r.endReason==='CAP_EVENT'?1:0,
  capTbStruct:r.capDiag?.tiebreakStage==='struct'?1:0, capTbPress:r.capDiag?.tiebreakStage==='pressure'?1:0,
  capTbAdv:r.capDiag?.tiebreakStage==='advantage'?1:0, capTbCoin:r.capDiag?.tiebreakStage==='coin'?1:0,
  capCoinAwin:r.capDiag?.tiebreakStage==='coin'?(r.winner==='nva'?1:0):0,
  capAwin:r.endReason!=='NEXUS'?(r.winner==='nva'?1:0):0,
  capClock:r.capDiag?r.capDiag.clock:0, capStructA:r.capDiag?r.capDiag.structDealt[0]:0, capStructB:r.capDiag?r.capDiag.structDealt[1]:0,
  events:r.events.length, clockEnd:0,
  tfN:0, tfPart:0, tfWinDec:0, tfDec:0, tfNoRes:0,
  dealerPart:0, dealerSurv:0, dealerKill:0,
  protAtt:0, protOk:0,
  siegeN:0, siegeDownA:0, siegeDownB:0, siegeADCaliveDown:0, siegeADCaliveN:0, siegeADCdeadDown:0, siegeADCdeadN:0,
  noJoinTF:0, tfSlots:0,                 // 사망으로 한타 불참한 슬롯 / 전체 한타×10슬롯
  firstStruct:'', objSecuredA:0, objN:0, structAfterObj:0,
  resSlot:[0,0,0,0,0],
 };
 let secedByA=false;
 for(const e of r.events){
  const cb=e.combat; if(!cb)continue;
  if(cb.kind==='objective'){ mtr.objN++; if(cb.objective.secured==='A'){mtr.objSecuredA++;secedByA=true;} continue; }
  if(cb.kind==='teamfight'){
   const f=cb.fight; mtr.tfN++;
   mtr.tfSlots+=10; mtr.noJoinTF+=(cb.notJoined||[]).length;
   const aParts=cb.participants.filter(p=>p.side==='A');
   mtr.tfPart+=aParts.length/5;
   for(let s=0;s<5;s++)mtr.resSlot[s]+=cb.resource[s];
   if(f.winner){ mtr.tfDec++; if(f.winner==='A')mtr.tfWinDec++; } else mtr.tfNoRes++;
   const adcIn=aParts.some(p=>p.slot===3), supIn=aParts.some(p=>p.slot===4);
   if(adcIn){
    mtr.dealerPart++;
    const c=f.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===3);
    if(c&&c.survived)mtr.dealerSurv++;
    if(c&&c.kill>0)mtr.dealerKill++;
    if(supIn&&f.winner==='B'){ mtr.protAtt++; const sc=f.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===4); if(sc&&sc.protect>0)mtr.protOk++; }
   }
   continue;
  }
  if(cb.kind==='siege'){
   const sg=cb.siege; mtr.siegeN++;
   if(sg.side==='A')mtr.siegeDownA+=sg.structuresDown; else mtr.siegeDownB+=sg.structuresDown;
   if(sg.side==='A'){
    // 이 공성 시점 A-ADC 생존 여부: 참가자에 slot3 있으면 생존
    const adcAlive=cb.participants.some(p=>p.side==='A'&&p.slot===3);
    if(adcAlive){mtr.siegeADCaliveDown+=sg.structuresDown;mtr.siegeADCaliveN++;}
    else{mtr.siegeADCdeadDown+=sg.structuresDown;mtr.siegeADCdeadN++;}
   }
   if(!mtr.firstStruct&&sg.structuresDown>0)mtr.firstStruct=sg.side;
   if(secedByA&&sg.side==='A'&&sg.structuresDown>0)mtr.structAfterObj=1;
  }
 }
 return mtr;
}

function run(change){
 const g=structuredClone(base); change(g);
 const acc={};
 const winBySeed=new Uint8Array(N);
 for(let seed=0;seed<N;seed++){
  g.seed=seed;
  const r=simulateSet(g,m);
  winBySeed[seed]=r.winner==='nva'?1:0;
  const mt=setMetrics(r);
  { const wl=r.winner==='nva'?r.lineupA:r.lineupB; const ps=wl.indexOf(r.pog); if(ps>=0)acc['pog'+ps]=(acc['pog'+ps]||0)+1; } // 단위 6: 승리 팀 POG 슬롯 분포
  for(const k in mt){ if(typeof mt[k]==='number'){ acc[k]=(acc[k]||0)+mt[k]; }
   else if(k==='firstStruct'){ acc.fsA=(acc.fsA||0)+(mt[k]==='A'?1:0); acc.fsB=(acc.fsB||0)+(mt[k]==='B'?1:0); } }
  if(mt.firstStruct==='A')acc.fsAwin=(acc.fsAwin||0)+mt.win;
  if(mt.firstStruct==='B')acc.fsBwin=(acc.fsBwin||0)+mt.win;
  acc._structAfterObjBase=(acc._structAfterObjBase||0)+(mt.objSecuredA>0?1:0);
 }
 const res=[0,1,2,3,4].map(s=>acc.resSlot? 0:0);
 return {
  n:N, winBySeed,
  setWinPct:acc.win/N*100,
  nexusPct:acc.nexus/N*100, capPct:acc.cap/N*100,
  capTimePct:acc.capTime/N*100, capEventPct:acc.capEvent/N*100,
  capTb:{struct:acc.capTbStruct||0,pressure:acc.capTbPress||0,advantage:acc.capTbAdv||0,coin:acc.capTbCoin||0},
  capCoinAwinPct:acc.capTbCoin?(acc.capCoinAwin/acc.capTbCoin*100):0,
  capAwinPct:acc.cap?(acc.capAwin/acc.cap*100):0,
  capClockAvg:acc.cap?acc.capClock/acc.cap:0,
  capStructMeanA:acc.cap?acc.capStructA/acc.cap:0, capStructMeanB:acc.cap?acc.capStructB/acc.cap:0,
  eventsAvg:acc.events/N,
  tfN:acc.tfN, partPct:acc.tfN?acc.tfPart/acc.tfN*100:0,
  decPct:acc.tfN?acc.tfDec/acc.tfN*100:0,
  fightWinDecPct:acc.tfDec?acc.tfWinDec/acc.tfDec*100:0,
  dealerSurvPct:acc.dealerPart?acc.dealerSurv/acc.dealerPart*100:0,
  dealerKillPct:acc.dealerPart?acc.dealerKill/acc.dealerPart*100:0,
  protOkPct:acc.protAtt?acc.protOk/acc.protAtt*100:0, protAtt:acc.protAtt,
  noJoinTFpct:acc.tfSlots?acc.noJoinTF/acc.tfSlots*100:0,        // 사망으로 한타 불참한 슬롯 비율
  siegeN:acc.siegeN,
  siegeDownA_perSet:acc.siegeDownA/N, siegeDownB_perSet:acc.siegeDownB/N,
  siegeADCaliveDown:acc.siegeADCaliveN?acc.siegeADCaliveDown/acc.siegeADCaliveN:0,
  siegeADCdeadDown:acc.siegeADCdeadN?acc.siegeADCdeadDown/acc.siegeADCdeadN:0,
  siegeADCaliveN:acc.siegeADCaliveN, siegeADCdeadN:acc.siegeADCdeadN,
  firstStructAwinPct:acc.fsA?acc.fsAwin/acc.fsA*100:0, firstStructA:acc.fsA,
  objSecuredApct:acc.objN?acc.objSecuredA/acc.objN*100:0,
  pogDist:[0,1,2,3,4].map(s=>(acc['pog'+s]||0)/N*100),   // 단위 6: 승리 팀 POG 슬롯 분포 %

  structAfterObjPct:acc._structAfterObjBase?acc.structAfterObj/acc._structAfterObjBase*100:0,
  resSlot:[0,1,2,3,4].map(s=>acc.resSlot?undefined:undefined),  // (자원 슬롯은 아래에서 별도 집계)
  _raw:acc,
 };
}

const rows=specs.map(([name,ch])=>({name,...run(ch)}));
const eq=rows[0];
const f2=x=>Math.round(x*100)/100;

// 강화 효과 = (강화 조건 − 같은 버전 균형)을 동일 시드로 짝지어 계산한 세트 승률 차 + 95% 신뢰구간.
// ── 페어 원자료 집계 ──────────────────────────────────────────────────────────────────
//  같은 seed i에서 균형 결과 bwin[i]∈{0,1}, 강화 결과 ewin[i]∈{0,1}. 일치쌍(둘 다 승/둘 다 패)은 차이에
//  정보를 주지 않는다. 불일치쌍만 센다:
//    b = #{ bwin=1, ewin=0 }  (균형은 이겼는데 강화가 짐)
//    c = #{ bwin=0, ewin=1 }  (균형은 졌는데 강화가 이김)
//  d̂ = (c − b) / N            (승률 차 추정, 강화−균형)
//  Var(d̂) = ( (b+c) − (c−b)²/N ) / N²      (McNemar 불일치쌍 분산; 일치쌍은 분산에 기여 안 함)
//  95% CI = d̂ ± 1.96·√Var(d̂)
//  * 세트 단위 0/1 이항, 같은 seed 짝이므로 공통 분산이 상쇄돼 순수 강화 효과만 남는다.
//  * 불일치쌍 수(b+c)가 작으면 CI가 넓다 — 작은 양수만으로 개선을 확정하지 않는 근거.
function pairedCI(bwin,ewin){
 let b=0,c=0;
 for(let i=0;i<N;i++){ if(bwin[i]===0&&ewin[i]===1)c++; else if(bwin[i]===1&&ewin[i]===0)b++; }
 const d=(c-b)/N;
 const varD=(b+c - (c-b)*(c-b)/N)/(N*N);
 const se=Math.sqrt(Math.max(varD,0));
 return {d:d*100, lo:(d-1.96*se)*100, hi:(d+1.96*se)*100, disc:b+c, b, c};
}

console.log(`\n=== 단위 5 통제 실험 (N=${N} 페어 시드) ===`);
console.log(`균형: 세트 A승 ${f2(eq.setWinPct)}%  | 정상(NEXUS) ${f2(eq.nexusPct)}%  상한(CAP) ${f2(eq.capPct)}% [시간 ${f2(eq.capTimePct)}% / 사건 ${f2(eq.capEventPct)}%]  | 사건/세트 ${f2(eq.eventsAvg)}`);
console.log(`균형: CAP tiebreak 단계 — 구조물 ${eq.capTb.struct} · pressure ${eq.capTb.pressure} · advantage ${eq.capTb.advantage} · 동전 ${eq.capTb.coin}  | CAP 전체 A승률 ${f2(eq.capAwinPct)}%  동전 A승률 ${f2(eq.capCoinAwinPct)}% (n=${eq.capTb.coin})`);
console.log(`균형: CAP 직전 — 평균 경기시계 ${f2(eq.capClockAvg)}s · 구조물 피해 평균 A ${f2(eq.capStructMeanA)} : B ${f2(eq.capStructMeanB)} (>=6 = 넥서스 앞에서 막힘 신호)`);
console.log(`균형: 한타/세트 ${f2(eq.tfN/N)}  참가율 ${f2(eq.partPct)}%  결판 ${f2(eq.decPct)}%  한타승(결판) ${f2(eq.fightWinDecPct)}%  사망 불참 슬롯 ${f2(eq.noJoinTFpct)}%`);
console.log(`균형: 딜러 생존 ${f2(eq.dealerSurvPct)}%  보호 성공 ${f2(eq.protOkPct)}%(시도 ${eq.protAtt})  오브 A확보 ${f2(eq.objSecuredApct)}%  오브 확보→구조물 진행 ${f2(eq.structAfterObjPct)}%`);
console.log(`균형: 공성/세트 ${f2(eq.siegeN/N)}  A철거/세트 ${f2(eq.siegeDownA_perSet)}  B철거/세트 ${f2(eq.siegeDownB_perSet)}  | 첫 구조물 A선취 시 A승률 ${f2(eq.firstStructAwinPct)}% (n=${eq.firstStructA})`);
console.log(`균형: 공성 시 A-ADC 생존이면 철거 ${f2(eq.siegeADCaliveDown)}(n=${eq.siegeADCaliveN}) vs 사망이면 ${f2(eq.siegeADCdeadDown)}(n=${eq.siegeADCdeadN})`);
console.log(`균형: 승리 팀 POG 슬롯 분포(TOP JGL MID ADC SUP) — ${eq.pogDist.map(x=>f2(x)+'%').join(' ')} (역할 고정 가중치 아님, 실제 사건 기여 집계)`);

console.log(`\n조건별 세트 승률 (강화−균형) %p [95% CI], 페어 원자료(b=균형승·강화패 / c=균형패·강화승), 행동 지표 Δ:`);
for(const r of rows){
 const ci=pairedCI(eq.winBySeed,r.winBySeed);
 const d=x=>{const v=x(r)-x(eq);return (v>=0?'+':'')+f2(v);};
 console.log(
  `${r.name.padEnd(12)}  Δ승률 ${ci.d>=0?'+':''}${f2(ci.d)}p  [${f2(ci.lo)}, ${f2(ci.hi)}]  b=${ci.b} c=${ci.c} (불일치 ${ci.disc}/${N})`+
  `  | 딜러생존Δ${d(x=>x.dealerSurvPct).padStart(6)}  보호성공Δ${d(x=>x.protOkPct).padStart(6)}  한타승(결판)Δ${d(x=>x.fightWinDecPct).padStart(6)}`+
  `  A철거/세트Δ${d(x=>x.siegeDownA_perSet).padStart(6)}  정상종료Δ${d(x=>x.nexusPct).padStart(6)}p  오브A확보Δ${d(x=>x.objSecuredApct).padStart(6)}`);
}
console.log(`\n원자료 집계(균형): 한타 ${eq.tfN} · 결판 ${eq._raw.tfDec} · 무승부/무교전 ${eq._raw.tfNoRes} · 딜러참가 ${eq._raw.dealerPart} · 보호시도 ${eq.protAtt} · 오브사건 ${eq._raw.objN} · 공성사건 ${eq.siegeN}`);
console.log(`사건 수 분포(균형): avg ${f2(eq.eventsAvg)} — 개별 세트 min/max는 smoke 참조. 상한 도달률(CAP) ${f2(eq.capPct)}%.`);
writeFileSync('teamfight-results.json',JSON.stringify({method:`${N} paired seeds, controlled base(all stats 70), same comps by tags/type`,rows:rows.map(({winBySeed,_raw,...r})=>r)},null,2));
