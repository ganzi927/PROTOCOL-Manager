import assert from 'node:assert/strict';
import {newGame,upgradeGame,applyCommand,roster,team,tradeQuote,releaseCost,gainMastery,masteryLevel,CHAMPIONS,MASTERY_CAP,MASTERY_XP,MASTERY_POOL} from '../lib/game.ts';
const mxp=(p,champ)=>{const m=p.mastery.find(x=>x.champ===champ);return m?m.level*100+m.xp:0;};
const old=newGame('orl',88);const g=upgradeGame(structuredClone(old));assert.equal(g.version,3);assert.equal(g.teams.length,23);const upgraded=upgradeGame(structuredClone(g));assert.equal(upgraded.players.length,g.players.length);assert.equal(new Set(g.players.map(p=>p.id)).size,g.players.length);assert.equal(old.teams.length,10);
assert.ok(roster(g).every(p=>Array.isArray(p.mastery)&&p.mastery.length>=4&&p.mastery.length<=8&&p.mastery.every(x=>x.champ&&x.level>=1&&x.level<MASTERY_CAP&&x.xp===0)));assert.ok(g.meta.length>=10);
// mastery growth: xp accrues and rolls into levels, capped
const gp=roster(g)[0],mc=gp.mastery[3].champ,lv0=gp.mastery[3].level;gainMastery(gp,mc,MASTERY_XP*2+10);assert.equal(masteryLevel(gp,mc),Math.min(MASTERY_CAP,lv0+2));const gp2=roster(g)[1];gainMastery(gp2,'M_ryze_notinpool',9999);assert.equal(masteryLevel(gp2,'M_ryze_notinpool'),MASTERY_CAP);
const legacy=structuredClone(old);legacy.version=2;for(const p of legacy.players){delete p.mastery;p.signature=['c0-1','c0-2'];}const migrated=upgradeGame(legacy);assert.ok(migrated.players.every(p=>!('signature'in p)&&p.mastery.length>=4&&p.mastery.every(m=>m.xp===0)));
const p=roster(g)[0], salary=p.salary;const renewed=applyCommand(g,{type:'renew',payload:{id:p.id}});assert.equal(roster(renewed)[0].salary,salary);assert.ok(roster(renewed)[0].nextSalary);assert.throws(()=>applyCommand(renewed,{type:'renew',payload:{id:p.id}}));assert.ok(releaseCost(renewed,roster(renewed)[0])>=salary);
const coach=applyCommand(g,{type:'hireStaff',payload:{id:'coach',level:2}});assert.equal(team(coach).cash,team(g).cash-3000);assert.equal(team(coach).staff.coach,2);const base=applyCommand(g,{type:'train'}),trained=applyCommand(coach,{type:'train'});assert.ok(roster(trained)[0].growth>=roster(base)[0].growth);
const rested=structuredClone(g);roster(rested).forEach(p=>{p.burn=50;p.training='rest'});const psych=applyCommand(rested,{type:'hireStaff',payload:{id:'psych',level:1}});assert.equal(roster(applyCommand(psych,{type:'train'}))[0].burn,31);
const offseason=structuredClone(g);offseason.phase='OFFSEASON';let pair;for(const a of roster(offseason)){for(const b of offseason.players.filter(p=>p.teamId&&p.teamId!==g.teamId&&p.role===a.role)){const q=tradeQuote(offseason,a,b);if(!q.reason){pair=[a,b,q];break;}}if(pair)break;}
assert.ok(pair);const [a,b,q]=pair;const other=b.teamId;const before=team(offseason).cash+team(offseason,other).cash;const exchanged=applyCommand(offseason,{type:'trade',payload:{offer:a.id,target:b.id}});assert.equal(exchanged.players.find(p=>p.id===a.id).teamId,other);assert.equal(exchanged.players.find(p=>p.id===b.id).teamId,g.teamId);assert.equal(team(exchanged).cash+team(exchanged,other).cash,before);assert.equal(team(offseason).cash,100000);
assert.throws(()=>applyCommand(g,{type:'trade',payload:{offer:a.id,target:b.id}}));assert.throws(()=>applyCommand(g,{type:'hireStaff',payload:{id:'coach',level:4}}));
// TRAIN-01: 챔피언 특훈은 사용자가 고른 목표를 그대로 훈련한다.
{
 // (1) 풀에 자리가 있으면 미등록 목표를 새로 등록하고 그 챔피언에게만 XP를 준다.
 const tp=roster(g).find(x=>x.mastery.length<MASTERY_POOL);assert.ok(tp);
 const fresh=CHAMPIONS.find(c=>c.role===tp.role&&!tp.mastery.some(m=>m.champ===c.id));assert.ok(fresh);
 const beforeLen=tp.mastery.length,beforeBurn=tp.burn;
 const beforeOthers=tp.mastery.map(m=>[m.champ,m.level*100+m.xp]);
 let g1=applyCommand(g,{type:'training',payload:{id:tp.id,training:'champ',champ:fresh.id}});
 assert.equal(roster(g1).find(p=>p.id===tp.id).trainChamp,fresh.id);
 g1=applyCommand(g1,{type:'train'});
 const tp1=roster(g1).find(p=>p.id===tp.id);
 assert.equal(mxp(tp1,fresh.id),28,'선택한 신규 챔피언이 정확히 XP를 받는다');
 assert.equal(tp1.mastery.length,beforeLen+1,'풀에 새 목표가 등록된다');
 for(const [champ,v] of beforeOthers)assert.equal(mxp(tp1,champ),v,'기존 숙련 챔피언은 조용히 대체/변경되지 않는다');
 assert.equal(Math.round(tp1.burn),Math.round(beforeBurn)+4,'특훈 피로(+4)는 그대로 적용된다');
 assert.ok(g1.planNotice.some(s=>s.includes(fresh.name)&&s.includes('숙련 +28')),'공지 문구와 결과가 일치한다');
}
{
 // (2) 풀 8칸이 가득 차면 조용히 대체하지 않고 명시적으로 거부한다.
 const fullG=structuredClone(g);const fp=roster(fullG)[0];
 const pool=CHAMPIONS.filter(c=>c.role===fp.role);
 while(fp.mastery.length<MASTERY_POOL){const c=pool.find(pc=>!fp.mastery.some(m=>m.champ===pc.id));fp.mastery.push({champ:c.id,level:1,xp:0});}
 const outsider=CHAMPIONS.find(c=>!fp.mastery.some(m=>m.champ===c.id));
 assert.throws(()=>applyCommand(fullG,{type:'training',payload:{id:fp.id,training:'champ',champ:outsider.id}}),/가득/);
 const keep=fp.mastery[0].champ;
 assert.equal(roster(applyCommand(fullG,{type:'training',payload:{id:fp.id,training:'champ',champ:keep}})).find(p=>p.id===fp.id).trainChamp,keep,'가득 차도 기존 숙련 챔피언은 목표로 지정된다');
 // 방어: 검증을 우회한 잘못된 상태에서도 train은 다른 챔피언을 훈련하지 않는다.
 const sneaky=structuredClone(fullG);roster(sneaky).find(p=>p.id===fp.id).trainChamp=outsider.id;roster(sneaky).find(p=>p.id===fp.id).training='champ';
 const snap=roster(sneaky).find(p=>p.id===fp.id).mastery.map(m=>[m.champ,m.level*100+m.xp]);
 const after=applyCommand(sneaky,{type:'train'});const ap=roster(after).find(p=>p.id===fp.id);
 assert.equal(ap.mastery.length,MASTERY_POOL,'풀이 늘어나지 않는다');
 for(const [champ,v] of snap)assert.equal(mxp(ap,champ),v,'어떤 챔피언도 XP를 받지 않는다');
 assert.ok(after.planNotice.some(s=>s.includes('보류')),'보류 공지를 남긴다');
}
{
 // (3) 존재하지 않는 챔피언 ID는 서버에서 거부한다.
 assert.throws(()=>applyCommand(g,{type:'training',payload:{id:roster(g)[0].id,training:'champ',champ:'not_a_real_champion'}}),/챔피언/);
}
{
 // (4) 회귀: 등록된 챔피언 특훈과 목표 미지정(최저 숙련 폴백)은 그대로 동작한다.
 const rp=roster(g)[1];const owned=[...rp.mastery].sort((a,b)=>(a.level-b.level)||(a.xp-b.xp))[0].champ;
 let g4=applyCommand(applyCommand(g,{type:'training',payload:{id:rp.id,training:'champ',champ:owned}}),{type:'train'});
 assert.equal(mxp(roster(g4).find(p=>p.id===rp.id),owned),mxp(rp,owned)+28);
 const dp=roster(g)[2];const low=[...dp.mastery].sort((a,b)=>(a.level-b.level)||(a.xp-b.xp))[0].champ;
 let gd=applyCommand(g,{type:'training',payload:{id:dp.id,training:'champ'}});
 assert.equal(roster(gd).find(p=>p.id===dp.id).trainChamp,undefined);
 gd=applyCommand(gd,{type:'train'});
 assert.equal(mxp(roster(gd).find(p=>p.id===dp.id),low),mxp(dp,low)+28);
}
console.log('PASS migration idempotence, deferred renewal, coaching growth, psychology recovery, trade atomicity, champ-training target integrity and phase guards');
