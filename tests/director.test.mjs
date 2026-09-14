import assert from 'node:assert/strict';
import {compositionPlan,battlePlan,champProfile} from '../lib/balance/composition.ts';
import {newGame,upgradeGame,simulateSet,ROLES,CHAMPIONS,starters} from '../lib/game.ts';
const pick=(tag,exclude=[])=>ROLES.map(role=>CHAMPIONS.filter(c=>c.role===role&&!exclude.includes(c.id)).sort((a,b)=>(champProfile(b.id)[tag]-champProfile(a.id)[tag])||a.id.localeCompare(b.id))[0].id);
const poke=pick('poke'),engage=pick('engage',poke),scale=pick('scale',poke),protect=pick('peel',engage);
for(const [ids,style] of [[poke,'poke'],[engage,'engage'],[scale,'scale'],[protect,'protect']]) assert.equal(compositionPlan(ids).style,style);
const p=battlePlan(poke,protect,1500),q=battlePlan(protect,poke,1500);
for(const k of ['preparation','entry','growth'])assert.ok(Math.abs(p[k]+q[k])<1e-9,'side symmetry '+k);
assert.ok(p.preparation>0,'poke creates preparation pressure');
assert.ok(battlePlan(engage,protect,1500).entry<battlePlan(engage,poke,1500).entry,'protection reduces entry advantage');
assert.ok(battlePlan(scale,engage,2100).growth>battlePlan(scale,engage,600).growth,'scaling matures over game time');
const g=upgradeGame(newGame('nva',1));
for(const p of g.players){p.stats.fill(70);p.form=50;p.burn=0;p.mastery=[];}
g.meta=[];for(const t of g.teams){t.tactic='balanced';t.focus='MID';t.familiarity[ROLES.map(r=>t.lineup[r]).join('|')]=50;}
for(const p of starters(g))p.stats.fill(65);
const run=(ids)=>{let win=0,cap=0;for(let seed=0;seed<1000;seed++){
 g.seed=seed;const r=simulateSet(g,{id:'director',a:'nva',b:'crn',bestOf:3,scoreA:0,scoreB:0,sets:[],label:'control',draft:{picksA:ids,picksB:poke,bans:[],actions:[]}});
 win+=r.winner==='nva';cap+=r.endReason!=='NEXUS';
 for(const e of r.events)if(e.combat?.kind==='teamfight'){assert.equal(e.compA,0,'no duplicate fight probability buff');assert.ok(e.combat.strategy,'strategy retained in event');}
}return {win:win/10,cap:cap/10};};
const late=run(scale),counter=run(engage);
console.log(JSON.stringify({N:1000,weakTeamStats:65,strongTeamStats:70,opponent:poke,late:{picks:scale,...late},engage:{picks:engage,...counter}},null,2));
assert.ok(counter.win>late.win,'same weak team can improve by changing draft against fixed enemy');
console.log('PASS director: archetypes, conditional counters, growth timing, single fight channel, underdog draft leverage');
