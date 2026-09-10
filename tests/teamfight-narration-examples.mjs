import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
const base=upgradeGame(newGame('nva',1));
for(const p of base.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
base.meta=[];
for(const t of base.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
const a=[],b=[];
for(const role of ROLES){const pool=CHAMPIONS.filter(c=>c.role===role);let pair;for(const c of pool){const o=pool.find(d=>d.id!==c.id&&d.type===c.type&&JSON.stringify(d.tags)===JSON.stringify(c.tags));if(o){pair=[c,o];break;}}if(!pair)throw Error(role);a.push(pair[0].id);b.push(pair[1].id);}
const m={id:'nx',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'CONTROL',draft:{picksA:a,picksB:b,bans:[],actions:[]}};
const SL=['TOP','JGL','MID','ADC','SUP'];
const rf=r=>`${r.side}-${SL[r.slot]}`;

function findAndPrint(label, pred, want=1){
 let found=0;
 for(let seed=0;seed<4000 && found<want;seed++){
  const g=structuredClone(base); g.seed=seed;
  const s=simulateSet(g,m);
  for(const e of s.events){
   const f=e.combat&&e.combat.fight; if(!f)continue;
   if(!pred(e,f,s))continue;
   found++;
   console.log(`\n════════ ${label} — seed ${seed}, 사건 #${e.index} (${e.phase}) ════════`);
   console.log(`[엔진 사실] edgeA=${e.edge==='nva'?'A':'B'}  fight.result=${f.result}  winner=${f.winner??'없음(무승부/무교전)'}  aliveA=${f.aliveA} aliveB=${f.aliveB}`);
   console.log(`[처치] ${e.combat.kills.map(k=>`${rf(k.killer)}→${rf(k.victim)}${k.assists.length?` (A:${k.assists.map(rf).join(',')})`:''}`).join('  ')||'없음'}`);
   const prot=f.contrib.filter(c=>c.protect>0).map(c=>rf(c.ref));
   console.log(`[보호 성공] ${prot.join(', ')||'없음'}   [FIRST BLOOD] ${e.combat.firstBlood?'예':'아니오'}`);
   console.log(`[생존/후속행동] ${f.contrib.filter(c=>c.survived).map(c=>rf(c.ref)).join(' ')}`);
   console.log(`[불참(리스폰)] ${(e.combat.notJoined||[]).map(n=>rf(n.ref)).join(' ')||'없음'}`);
   console.log(`[개인 기여] ${f.contrib.map(c=>`${rf(c.ref)} k${c.kill} e${c.engage} p${c.protect}`).join('  ')}`);
   console.log(`[자원 delta A관점, 골드] ${e.combat.resource.map((x,i)=>SL[i]+':'+x).join(' ')}`);
   console.log(`\n[중계 detail]\n${e.detail}`);
   console.log(`\n[중계 beats]`);
   for(const bt of (e.beats||[])) console.log(`  ${bt.clock??''} <${bt.kind||bt.t||''}> ${bt.text||bt.line||JSON.stringify(bt)}`);
   console.log(`\n[재현] seed=${seed}, 통제 base(전스탯70), picksA/B = 태그·타입 동일쌍, 사건 index ${e.index}`);
  }
 }
 if(!found)console.log(`(${label}: 4000시드 내 해당 사례 없음)`);
}

findAndPrint('5v5 결판 한타 + 보호 성공', (e,f)=> f.result==='DECISIVE' && f.aliveA===5 && f.aliveB===5 && f.contrib.some(c=>c.protect>0));
findAndPrint('인원 열세 한타 (3~4인 vs 5인)', (e,f)=> f.result==='DECISIVE' && Math.abs(f.aliveA-f.aliveB)>=1 && Math.min(f.aliveA,f.aliveB)<=4 && (e.combat.notJoined||[]).length>0);
findAndPrint('킬 교환 후 상호 후퇴 (무승부)', (e,f)=> f.result==='TRADE');
findAndPrint('한타 중 FIRST BLOOD', (e,f)=> e.combat.firstBlood && f.result==='DECISIVE');
