// 단위 4·5 중계 예시: 실제 사건 데이터에서 뽑은 한타·공성·종료 서술과 재현 시드.
// 통제 base(전스탯70), picksA/B = 태그·타입 동일쌍. structuredClone 후 g.seed=<seed> → simulateSet.
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'nx',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'C',draft:{picksA:a,picksB:b,bans:[],actions:[]}};
const SL=['TOP','JGL','MID','ADC','SUP'];
const rf=r=>`${r.side}-${SL[r.slot]}`;

function show(label,seed,pred){
 for(let s=seed;s<seed+400;s++){
  const g=structuredClone(base); g.seed=s;
  const r=simulateSet(g,m);
  const idx=r.events.findIndex(pred);
  if(idx<0)continue;
  const e=r.events[idx];
  console.log(`\n════════ ${label} — seed ${s}, 사건 #${e.index} (${e.phase}), endReason=${r.endReason} ════════`);
  if(e.combat?.kind==='teamfight'){
   const f=e.combat.fight;
   console.log(`[엔진] edgeA=${e.edge==='nva'?'A':'B'} result=${f.result} winner=${f.winner??'없음'} aliveA=${f.aliveA} aliveB=${f.aliveB}`);
   console.log(`[처치] ${e.combat.kills.map(k=>`${rf(k.killer)}→${rf(k.victim)}`).join('  ')||'없음'}`);
   console.log(`[보호] ${f.contrib.filter(c=>c.protect>0).map(c=>rf(c.ref)).join(', ')||'없음'}  [불참] ${(e.combat.notJoined||[]).map(n=>rf(n.ref)).join(' ')||'없음'}`);
  }else if(e.combat?.kind==='siege'){
   const sg=e.combat.siege;
   console.log(`[엔진] result=${sg.result} 공격=${sg.side} lane=${sg.lane} 철거=${sg.structuresDown} 부활까지=${sg.reinforceIn}s 여력=${sg.capacity} 구조물(수비)=[${sg.structAfter}] 넥서스포탑=${sg.baseTurretsAfter} nexus=${sg.nexus}`);
   console.log(`[참가(이동)] ${e.combat.participants.map(rf).join(' ')}`);
   console.log(`[근거] ${e.combat.evidence.join(' / ')}`);
  }
  console.log(`[중계 detail] ${e.detail}`);
  console.log(`[중계 beats]`);
  for(const bt of (e.beats||[]))console.log(`  <${bt.label||''}> ${bt.text||''}`);
  console.log(`[재현] seed=${s}, 통제 base, 사건 index ${e.index}`);
  return;
 }
 console.log(`(${label}: 사례 없음)`);
}

// 1. 교전 승리했지만 공성 불가(HELD/NO_WINDOW)
show('한타 승리했지만 공성 불가', 0, e=>e.combat?.kind==='siege'&&(e.combat.siege.result==='HELD'||e.combat.siege.result==='NO_WINDOW'));
// 2. 억제기 파괴 공성
show('억제기 파괴', 0, e=>e.combat?.kind==='siege'&&e.combat.siege.result==='INHIB');
// 3. 실제 넥서스 파괴로 정상 종료
show('넥서스 파괴 · 정상 종료', 0, e=>e.combat?.kind==='siege'&&e.combat.siege.nexus);
// 4. 시간 제한(CAP) 종료 — 넥서스 미파괴
show('시간 제한 판정 종료', 0, e=>e.phase==='종료');
// 5. 무승부 한타 뒤에도 생존/수비 상태로 공성 가능 여부 판단
show('무승부 한타 → 후속 공성 판단', 0, e=>e.combat?.kind==='teamfight'&&e.combat.fight.result==='TRADE');
