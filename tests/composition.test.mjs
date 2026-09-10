import assert from 'node:assert/strict';
import {newGame,upgradeGame,starters,ROLES,CHAMPIONS,simulateSet} from '../lib/game.ts';
import {champProfile,draftEffects} from '../lib/balance/composition.ts';

// --- 1. champProfile: 태그 → 파생 특성이 설계 의도대로 나온다 ---
{
 const engage=CHAMPIONS.find(c=>c.tags.includes('engage')&&['TOP','JGL'].includes(c.role));
 const poke=CHAMPIONS.find(c=>c.tags.includes('poke')&&['MID','ADC'].includes(c.role));
 const scale=CHAMPIONS.find(c=>c.tags.includes('scale'));
 const pe=champProfile(engage.id),pp=champProfile(poke.id),ps=champProfile(scale.id);
 assert.ok(pe.engage>0,'이니시 태그 → engage+');
 assert.ok(pp.poke>0&&pp.range>0,'포크 태그 → poke+ 사거리+');
 assert.ok(pp.range>pe.range,'포크 챔피언이 이니시 챔피언보다 사거리 김');
 assert.ok(pe.frontline>pp.frontline,'이니시 챔피언이 포크 챔피언보다 앞라인 강함');
 assert.ok(ps.late>0&&ps.early<0,'스케일: 후반+ 초반-');
 assert.deepEqual(champProfile('___nonexistent___'),champProfile('___other___'),'미상 챔피언은 중립 프로필');
}

// --- 2. draftEffects: 순수·완전 대칭·유계·동일 픽이면 0 ---
{
 const a=['Tgaren','Jleesin','Mahri','Ajinx','Sthresh'].map(x=>CHAMPIONS.find(c=>c.id===x)?.id).filter(Boolean);
 assert.equal(a.length,5,'테스트 픽 id 확인');
 const b=ROLES.map(r=>CHAMPIONS.find(c=>c.role===r&&!a.includes(c.id)).id);
 const ab=draftEffects(a,b),ba=draftEffects(b,a);
 for(const k of ['lane','obj','fight']){
  assert.ok(Math.abs(ab[k]+ba[k])<1e-9,`${k}: draftEffects(a,b) === -draftEffects(b,a)`);
  assert.ok(ab[k]>=-3&&ab[k]<=3,`${k}: ±3 상한`);
 }
 const zero=draftEffects(a,a);
 assert.deepEqual(zero,{lane:0,obj:0,fight:0},'같은 조합이면 효과 0');
}

// --- 3. 방향성: 앞라인/다이브 조합 vs 포크/물몸 조합 ---
function pickBy(score){return ROLES.map(r=>{
 const pool=CHAMPIONS.filter(c=>c.role===r);
 return pool.map(c=>({id:c.id,s:score(champProfile(c.id))})).sort((x,y)=>y.s-x.s)[0].id;
});}
const frontComp=pickBy(p=>p.frontline+p.engage+p.peel);      // 앞라인·이니시·보호
const pokeComp =pickBy(p=>p.poke+p.range-p.frontline);        // 포크·물몸
{
 const de=draftEffects(frontComp,pokeComp);
 assert.ok(de.fight>0.5,`앞라인/다이브 조합이 한타 우위: ${de.fight}`);
 assert.ok(de.lane<0,`포크 상대로 라인 단계는 불리: ${de.lane}`);
}

// --- 4. 엔진 반영: 조합만 바꾸면 해당 구간 확률이 바뀐다(선수 조건 동일) ---
function controlledBase(){
 const g=upgradeGame(newGame('nva',1));
 for(const p of g.players){p.stats=Array(6).fill(70);p.form=50;p.burn=0;p.mastery=[];}
 g.meta=[];
 for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
 return g;
}
const M=(pa,pb)=>({id:'c-1',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'T',draft:{picksA:pa,picksB:pb,bans:[],actions:[]}});
{
 const g=controlledBase();const N=6000;
 const run=(pa,pb)=>{let win=0,fightWin=0,fightN=0,laneWin=0,laneN=0;
  const m=M(pa,pb);
  for(let s=0;s<N;s++){g.seed=s;const r=simulateSet(g,m);
   win+=r.winner===m.a;
   for(const e of r.events){if(e.index<3){laneN++;laneWin+=e.winner===m.a;}else if(e.index>=5){fightN++;fightWin+=e.winner===m.a;}}
  }
  return {set:win/N,fight:fightWin/fightN,lane:laneWin/laneN};
 };
 const front=run(frontComp,pokeComp);
 const swap =run(pokeComp,frontComp);
 // 조합이 결과를 바꾼다(50%에서 뚜렷이 이탈), 그리고 앞뒤로 대칭.
 assert.ok(Math.abs(front.set-0.5)>0.03,`조합 차이가 세트 승률을 바꾼다: ${(front.set*100).toFixed(2)}%`);
 assert.ok((front.set-0.5)*(swap.set-0.5)<0,`A/B를 바꾸면 부호가 뒤집힌다: ${front.set.toFixed(3)} vs ${swap.set.toFixed(3)}`);
 // 구간 방향: 앞라인 조합은 한타에서 유리, 라인 단계에서는 그만큼 유리하지 않다.
 assert.ok(front.fight>front.lane+0.03,`앞라인 조합은 한타(${(front.fight*100).toFixed(1)}%)가 라인(${(front.lane*100).toFixed(1)}%)보다 유리`);
}

// --- 5. 단일 경로·결정성·유계 ---
{
 const g=controlledBase();const m=M(frontComp,pokeComp);g.seed=4242;
 assert.equal(JSON.stringify(simulateSet(g,m)),JSON.stringify(simulateSet(g,m)),'같은 시드 → 동일 결과');
 const r=simulateSet(g,m);
 assert.ok(r.draftFx&&['lane','obj','fight'].every(k=>Math.abs(r.draftFx[k])<=3),'draftFx ±3');
 for(const e of r.events){
  const expect=e.index<3?r.draftFx.lane:e.index<5?r.draftFx.obj:r.draftFx.fight;
  assert.ok(Math.abs(e.compA-expect)<1e-9,`compA는 draftFx 한 곳에서만 온다 (idx ${e.index})`);
 }
}

console.log('PASS composition: profile derivation, pure antisymmetry, matchup direction, engine segment sensitivity, single-path determinism');
