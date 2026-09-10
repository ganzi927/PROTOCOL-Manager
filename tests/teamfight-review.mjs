// 단위 4 검증: 참여자 기반 한타의 행동 지표 + 강화 조건별 세트 승률.
// 통제: 전원 스탯70·폼50·번아웃0·호흡50·균형 전술·미드 우선·메타 없음. balance-review.mjs와 동일 조합.
// 보고 규칙(사용자 지시):
//  - 강화 효과 = (강화 조건 승률 − 같은 버전 균형 승률) %p.
//  - 시드 수·원자료 집계 수 보존. 작은 차이를 확정적 개선으로 단정하지 않는다.
//  - 목표 승률에 맞춘 전역 계수 조정 없음.
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {writeFileSync} from 'node:fs';

const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'tf-1',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'CONTROL',draft:{picksA:a,picksB:b,bans:[],actions:[]}};

// 스탯 인덱스: 0=LNE 1=TF 2=OBJ 3=VIS 4=MEC 5=CAR. 슬롯: 0 TOP 1 JGL 2 MID 3 ADC 4 SUP.
const S={LNE:0,TF:1,OBJ:2,VIS:3,MEC:4,CAR:5};
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

function run(change){
 const g=structuredClone(base); change(g);
 let wins=0, secureA=0, objEvents=0;
 // 한타 행동 집계 (A팀 관점)
 let tfN=0;                       // 총 한타 사건 수
 let partSum=0;                   // Σ (A 참가 인원 / 5)
 let decisive=0, aWinDecisive=0;  // 결판난 한타 / A 승
 let noResult=0;                  // TRADE·NO_ENGAGE·NO_SHOW (승패 없음)
 let dealerPart=0, dealerSurv=0;  // A ADC 참가 한타 / 그 중 생존
 let protAtt=0, protOk=0;         // A가 지는 편이고 ADC·SUP 생존 → 보호 시도 / 성공
 const resSlot=[0,0,0,0,0];       // Σ combat.resource[slot]  (A 관점 골드 delta)
 let killInvolveADC=0;            // A ADC가 kill/assist 관여한 한타 수

 for(let seed=0;seed<N;seed++){
  g.seed=seed;
  const s=simulateSet(g,m);
  wins+=s.winner===m.a;
  for(const e of s.events){
   const cb=e.combat; if(!cb)continue;
   if(cb.kind==='objective'){ objEvents++; if(cb.objective.secured==='A')secureA++; continue; }
   if(cb.kind!=='teamfight')continue;
   const f=cb.fight; tfN++;
   const aParts=cb.participants.filter(p=>p.side==='A');
   partSum+=aParts.length/5;
   for(let sl=0;sl<5;sl++)resSlot[sl]+=cb.resource[sl];
   if(f.winner){ decisive++; if(f.winner==='A')aWinDecisive++; }
   else noResult++;
   const adcIn=aParts.some(p=>p.slot===3);
   if(adcIn){
    dealerPart++;
    const c=f.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===3);
    if(c&&c.survived)dealerSurv++;
    if(c&&c.kill>0)killInvolveADC++;
    // 보호 시도 조건: A가 결판 패배 측이고 ADC·SUP 모두 참가
    const supIn=aParts.some(p=>p.slot===4);
    if(supIn && f.winner==='B'){
     protAtt++;
     const sc=f.contrib.find(c=>c.ref.side==='A'&&c.ref.slot===4);
     if(sc&&sc.protect>0)protOk++;
    }
   }
  }
 }
 return {
  n:N, setWinPct:wins/N*100,
  objN:objEvents, secureApct:objEvents?secureA/objEvents*100:0,
  tfN, partPct:tfN?partSum/tfN*100:0,
  decisive, noResult, decisivePct:tfN?decisive/tfN*100:0,
  fightWinPct_decisive:decisive?aWinDecisive/decisive*100:0,
  fightWinPct_all:tfN?aWinDecisive/tfN*100:0,
  dealerPart, dealerSurvPct:dealerPart?dealerSurv/dealerPart*100:0,
  dealerKillInvolvePct:dealerPart?killInvolveADC/dealerPart*100:0,
  protAtt, protOkPct:protAtt?protOk/protAtt*100:0,
  resSlot:resSlot.map(x=>x/tfN),
 };
}

const rows=specs.map(([name,ch])=>({name,...run(ch)}));
const eq=rows[0];
const f2=x=>Math.round(x*100)/100;
console.log(`\n=== 단위 4 참여자 기반 한타 — 통제 실험 (N=${N} 페어 시드) ===`);
console.log(`균형(equal) 세트 승률 ${f2(eq.setWinPct)}%  |  한타/세트 평균 ${f2(eq.tfN/N)}개  |  결판 비율 ${f2(eq.decisivePct)}%  |  무승부·무교전 ${eq.noResult}건`);
console.log(`균형 A 한타 참가율 ${f2(eq.partPct)}%  딜러 생존율 ${f2(eq.dealerSurvPct)}%  보호 성공률 ${f2(eq.protOkPct)}% (시도 ${eq.protAtt})  한타 승률(결판) ${f2(eq.fightWinPct_decisive)}%  오브 확보 A ${f2(eq.secureApct)}%`);
console.log(`\n조건별 (강화 − 균형) %p 및 행동 지표:`);
for(const r of rows){
 const d=x=>{const v=x(r)-x(eq);return (v>=0?'+':'')+f2(v);};
 console.log(
  `${r.name.padEnd(12)}  승률 ${f2(r.setWinPct).toString().padStart(6)}%  Δ${d(x=>x.setWinPct).padStart(7)}p`+
  `  | 참가율Δ${d(x=>x.partPct).padStart(6)}  딜러생존Δ${d(x=>x.dealerSurvPct).padStart(6)}  보호성공Δ${d(x=>x.protOkPct).padStart(6)}`+
  `  한타승(결판)Δ${d(x=>x.fightWinPct_decisive).padStart(6)}  딜러킬관여Δ${d(x=>x.dealerKillInvolvePct).padStart(6)}`+
  `  오브확보Δ${d(x=>x.secureApct).padStart(6)}`);
}
console.log(`\n개인 자원(한타당 평균 combat.resource[slot], A 관점 골드):`);
for(const r of rows){
 console.log(`${r.name.padEnd(12)} [${r.resSlot.map(x=>f2(x).toString().padStart(8)).join(' ')}]  (TOP JGL MID ADC SUP)`);
}
console.log(`\n원자료 집계 수(균형): 한타 ${eq.tfN}  결판 ${eq.decisive}  무승부·무교전 ${eq.noResult}  딜러참가 ${eq.dealerPart}  보호시도 ${eq.protAtt}  오브사건 ${eq.objN}`);
writeFileSync('teamfight-results.json',JSON.stringify({method:`${N} paired seeds, controlled base (all stats 70), same comps by tags/type`,rows},null,2));
