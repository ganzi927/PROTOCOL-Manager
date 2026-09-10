// MINIMAP-02 — 경기 시간 내내 10명이 독립적으로 움직이는 지속형 미니맵 재생 데이터.
//
// 설계 원칙:
//  - 경기 엔진의 사건 데이터(SetResult.events[].combat / .kills / .goldA·B / .detail / .endReason)가 유일한 사실 근거.
//  - 중계 문장을 파싱하지 않는다. 승패·합류·처치·보상을 다시 계산하지 않는다(이동 모듈은 별도 전투 결과를 만들지 않는다).
//  - 실제 참가자(combat.participants)가 아닌 선수를 교전에 넣지 않는다. 불참자는 자기 행동을 계속한다.
//  - 체력·스킬·와드·회복·보상 등 미구현 상태를 시각화 코드에서 만들어내지 않는다.
//  - 위치/판단 난수(replay 전용)는 outcome/narration 난수와 분리. 같은 SetResult → 같은 ReplayData(순수).
//
// 구조:
//  - WALK 그래프(보행 가능 영역) 위에서만 이동. 임의 유효 목적지까지 경로 탐색(고정 왕복 아님).
//  - 고정 경기시간 간격(DT)으로 10명의 논리 상태를 갱신 → 행동/경로 변경마다 키프레임 기록.
//  - 화면 재생 시각 t = 경기 시계 / SCALE (균일 압축 — 프레임률·배속이 결과에 영향 없음, 속도 폭증 없음).
//  - 사건은 발생 전에 접근 계획을 만들어 실제 경로로 이동해 합류. 발생 순간 순간이동 없음.
//    이동 가능 시간과 사건 일정이 충돌하면 diag에 기록.

export type Side='A'|'B';
export type Vec=[number,number];
export type Slot=0|1|2|3|4;
export type Ref={side:Side,slot:number};

// ── 지도(공개 계약): 0~100 좌표계. SVG y는 아래로 증가. A(블루)=좌하, B(레드)=우상. ─────
export const MAP:{size:number,nodes:Record<string,Vec>,edges:[string,string][]}={
 size:100,
 nodes:{
  A_base:[12,88], B_base:[88,12],
  A_top:[12,54], top_mid:[24,18], B_top:[52,11],
  A_mid:[32,66], mid:[50,50], B_mid:[68,34],
  A_bot:[46,89], bot_mid:[82,78], B_bot:[89,46],
  baron:[37,37], dragon:[63,63],
  A_jg_t:[26,42], A_jg_b:[44,68], B_jg_t:[56,32], B_jg_b:[74,58],
 },
 edges:[
  ['A_base','A_top'],['A_top','top_mid'],['top_mid','B_top'],['B_top','B_base'],
  ['A_base','A_mid'],['A_mid','mid'],['mid','B_mid'],['B_mid','B_base'],
  ['A_base','A_bot'],['A_bot','bot_mid'],['bot_mid','B_bot'],['B_bot','B_base'],
  ['A_base','A_jg_t'],['A_jg_t','A_top'],['A_jg_t','mid'],['A_jg_t','baron'],
  ['A_base','A_jg_b'],['A_jg_b','A_bot'],['A_jg_b','mid'],['A_jg_b','dragon'],
  ['B_base','B_jg_t'],['B_jg_t','B_top'],['B_jg_t','mid'],['B_jg_t','baron'],
  ['B_base','B_jg_b'],['B_jg_b','B_bot'],['B_jg_b','mid'],['B_jg_b','dragon'],
  ['mid','baron'],['mid','dragon'],['A_jg_b','B_jg_b'],['A_jg_t','B_jg_t'],
 ],
};

const dist=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

function dijkstra(adj:Record<string,string[]>,nodes:Record<string,Vec>,from:string,to:string):string[]{
 if(from===to)return [from];
 const prev:Record<string,string|null>={[from]:null};
 const best:Record<string,number>={[from]:0};
 const pq:[number,string][]=[[0,from]];const done=new Set<string>();
 while(pq.length){
  pq.sort((a,b)=>a[0]-b[0]);const [d,u]=pq.shift()!;
  if(done.has(u))continue;done.add(u);
  if(u===to)break;
  for(const v of adj[u]??[]){
   const nd=d+dist(nodes[u],nodes[v]);
   if(best[v]===undefined||nd<best[v]){best[v]=nd;prev[v]=u;pq.push([nd,v]);}
  }
 }
 if(prev[to]===undefined)return [from,to];
 const out:string[]=[];for(let c:string|null=to;c;c=prev[c])out.unshift(c);
 return out;
}

// 통로 그래프 최단 경로(노드 이름 배열, 공개). 벽 가로지르기 방지의 근거.
export function pathBetween(from:string,to:string):string[]{
 const adj:Record<string,string[]>={};
 for(const [x,y] of MAP.edges){(adj[x]??=[]).push(y);(adj[y]??=[]).push(x);}
 return dijkstra(adj,MAP.nodes,from,to);
}

// ── WALK: 이동용 보행 그래프. MAP을 한 번 세분(각 통로에 중점) + 정글 캠프·분수대 ─────────
// 중점은 원 통로 선분 위에 있으므로 벽을 넘지 않는다. 임의 목적지는 이 그래프 위 최근접점으로 스냅.
export const WALK=(()=>{
 const nodes:Record<string,Vec>={...MAP.nodes};
 const edges:[string,string][]=[];
 MAP.edges.forEach(([a,b],i)=>{
  const mn='w'+i;
  nodes[mn]=[(MAP.nodes[a][0]+MAP.nodes[b][0])/2,(MAP.nodes[a][1]+MAP.nodes[b][1])/2];
  edges.push([a,mn],[mn,b]);
 });
 // 정글 캠프(순찰 2점) — 각 정글 노드에서 자기 진영 쪽으로 소량 offset. 캠프 전투 없음(이동 표현만).
 const camps:[string,number,number][]=[['A_jg_t',-5,7],['A_jg_b',-6,8],['B_jg_t',5,-7],['B_jg_b',6,-8]];
 for(const [base,dx,dy] of camps){ nodes[base+'C']=[MAP.nodes[base][0]+dx,MAP.nodes[base][1]+dy]; edges.push([base,base+'C']); }
 // 분수대(부활 지점) — 베이스 안쪽
 nodes.A_ft=[MAP.nodes.A_base[0]+3,MAP.nodes.A_base[1]-3];
 nodes.B_ft=[MAP.nodes.B_base[0]-3,MAP.nodes.B_base[1]+3];
 edges.push(['A_base','A_ft'],['B_base','B_ft']);
 const adj:Record<string,string[]>={};
 for(const [x,y] of edges){(adj[x]??=[]).push(y);(adj[y]??=[]).push(x);}
 return {nodes,edges,adj};
})();
const WN=WALK.nodes;

// 통로 선분 목록(벽 침범 검사·최근접 투영용)
const WALK_SEGS:[Vec,Vec][]=WALK.edges.map(([a,b])=>[WN[a],WN[b]]);
function projToSeg(p:Vec,a:Vec,b:Vec):{q:Vec,d:number,t:number}{
 const abx=b[0]-a[0],aby=b[1]-a[1],L2=abx*abx+aby*aby||1;
 let t=((p[0]-a[0])*abx+(p[1]-a[1])*aby)/L2; t=Math.max(0,Math.min(1,t));
 const q:Vec=[a[0]+abx*t,a[1]+aby*t];
 return {q,d:dist(p,q),t};
}
// 점이 어느 통로에도 이 거리 안에 있으면 '통로 위'로 본다(스무딩·표시 보정 허용치)
export const WALL_TOL=1.6;
export function distToCorridor(p:Vec):number{
 let m=Infinity; for(const [a,b] of WALK_SEGS){const {d}=projToSeg(p,a,b); if(d<m)m=d;} return m;
}
function nearestWalkNode(p:Vec):string{
 let bn='mid',bd=Infinity;
 for(const [name,pos] of Object.entries(WN)){const d=dist(p,pos);if(d<bd){bd=d;bn=name;}}
 return bn;
}
function pathLen(p:Vec[]):number{let s=0;for(let i=1;i<p.length;i++)s+=dist(p[i-1],p[i]);return s;}

// ── 결정적 난수(replay 전용) — SetResult 내용에서만 시드 유도 ────────────────────────────
function hashStr(s:string):number{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function mulberry32(seed:number){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// ── 재생 데이터 타입 ──────────────────────────────────────────────────────────────────
export type BeatKind='approach'|'engage'|'kill'|'secure'|'escape'|'noshow'|'revive'|'line'|'siege'|'nexus';
export type StructSnapshot={A:number[], B:number[], baseA:number, baseB:number, nexusA:boolean, nexusB:boolean};
export type ReplayBeat={
 t:number, seq:number, engineClock:number, kind:BeatKind,
 text?:string, ref?:Ref, by?:Ref, assists?:Ref[], side?:Side, scoreDelta?:[number,number], fb?:boolean,
 struct?:StructSnapshot,
};
export type Act='lane'|'jungle'|'roam'|'group'|'fight'|'retreat'|'recall'|'base'|'dead';
export type TrackKey={t:number, pos:Vec, state:'idle'|'move'|'fight'|'dead', act?:Act, reason?:string};
export type Track={side:Side, slot:Slot, key:TrackKey[]};
export type ReplayWindow={seq:number, start:number, end:number, engineClock:number, label:string, kind:string};
export type ReplayData={
 duration:number,
 windows:ReplayWindow[],
 tracks:Track[],
 beats:ReplayBeat[],
 goldKeys:{t:number,a:number,b:number}[],
 finalScore:[number,number],
 nav:{segs:[Vec,Vec][]},          // 디버그: 보행 가능 영역(통로 선분)
 diag:string[],                   // 이동 시간 ↔ 사건 일정 충돌 등 진단
 scale:number,                    // 경기 시계 → 재생 시각 나눗수
};

// ── 사건이 벌어지는 WALK 노드명(엔진 데이터 기반). 모두 도달 가능한 통로 노드. ──────────
function eventNodeName(e:any):string{
 const cb=e.combat;
 if(cb?.kind==='siege'){
  const def:Side=cb.side==='A'?'B':'A';
  const L=cb.siege?.lane;
  if(L===undefined||L<0) return def==='A'?'A_base':'B_base';
  return (def==='A'?['A_top','mid','A_bot']:['B_top','mid','B_bot'])[L];
 }
 if(cb?.kind==='objective') return cb.objective.kind==='herald'?'baron':'dragon';
 if(cb?.kind==='teamfight'){ const s=e.index; return s===5||s===6?(s===5?'dragon':'baron'):'mid'; }
 // 갱킹(라인 0·1·2) — 라인 대치 지점(양쪽이 실제로 도달 가능). 지는 쪽으로 살짝 치우침.
 const lose:Side=cb?.side==='A'?'B':'A';
 const lane=(cb?.lane ?? 1) as 0|1|2;
 return laneRefs(lane,lose).contest;
}

// ── 라인 기준점 / 정글 순찰 / 홈 ───────────────────────────────────────────────────────
// 라인별 5점(자기 포탑 쪽 → 상대 포탑 쪽). WALK 세분 노드(w{edgeIdx})를 써서 4구간.
const segIdx=(a:string,b:string)=>{const i=MAP.edges.findIndex(([x,y])=>(x===a&&y===b)||(x===b&&y===a));return 'w'+i;};
function laneRefs(lane:0|1|2,side:Side):{own:string,safe:string,contest:string,push:string,deep:string}{
 const chain=lane===0?['A_top','top_mid','B_top']:lane===1?['A_mid','mid','B_mid']:['A_bot','bot_mid','B_bot'];
 const line=[chain[0],segIdx(chain[0],chain[1]),chain[1],segIdx(chain[1],chain[2]),chain[2]];
 const ordered=side==='A'?line:[...line].reverse();
 return {own:ordered[0],safe:ordered[1],contest:ordered[2],push:ordered[3],deep:ordered[4]};
}
const JG_PATROL:Record<Side,string[][]>={
 A:[['A_jg_t','A_jg_tC','baron'],['A_jg_b','A_jg_bC','dragon']],
 B:[['B_jg_t','B_jg_tC','baron'],['B_jg_b','B_jg_bC','dragon']],
};
function homeNode(side:Side,slot:Slot):string{
 if(slot===0)return laneRefs(0,side).own;
 if(slot===1)return side==='A'?'A_jg_b':'B_jg_t';
 if(slot===2)return laneRefs(1,side).own;
 return laneRefs(2,side).own; // ADC·SUP
}
const FOUNT:Record<Side,string>={A:'A_ft',B:'B_ft'};
const RESPAWN=(clock:number)=>10+Math.min(42,clock/60*1.5); // lib/simulation/combat.ts의 RESPAWN과 동일(부활 창 일치)

// ── 에이전트 시뮬레이션 (WALK 노드 그래프 위에서만 이동) ─────────────────────────────────
type Agent={
 side:Side, slot:Slot,
 route:string[], seg:number, segT:number,       // route[seg]→route[seg+1] 구간, segT∈[0,1]
 fixedPos:Vec|null,                             // fight/dead: 위치 고정(노드 이탈, 소량 jitter 허용)
 act:Act, speed:number, nextDecide:number,
 alive:boolean, respawnAt:number,
 plan:{ev:number, node:string}|null,
 pendingDest:string|null,
 lane:0|1|2, jgIdx:number, pushBias:number,
};
const SPEED:Record<Slot,number>={0:0.84,1:1.06,2:0.88,3:0.82,4:0.92}; // map-unit / engine-second
const WADJ=WALK.adj;
function route(from:string,to:string):string[]{ return dijkstra(WADJ,WN,from,to); }

export function buildReplay(set:{events:any[],lineupA:string[],lineupB:string[],draft?:{picksA:string[],picksB:string[]},endReason?:string}):ReplayData{
 const SCALE=18;
 const rawEvents=(set.events||[]);
 const events=rawEvents.filter(e=>e.phase!=='종료');
 const sig=rawEvents.map(e=>`${e.index}:${e.prob}:${e.goldA}:${e.winner}`).join('|')+'|'+(set.draft?.picksA?.join(',')??'');
 const rng=mulberry32(hashStr(sig));
 const jit=(a:number)=>a*(rng()*2-1);

 const beats:ReplayBeat[]=[];
 const windows:ReplayWindow[]=[];
 const goldKeys:{t:number,a:number,b:number}[]=[{t:0,a:2500,b:2500}];
 const diag:string[]=[];
 let scoreA=0,scoreB=0;
 const structState:StructSnapshot={A:[0,0,0],B:[0,0,0],baseA:2,baseB:2,nexusA:false,nexusB:false};

 const evInfo=events.map((e,i)=>{
  const cb=e.combat;
  const prevClk=i>0?(events[i-1].combat?.clock??0):0;
  const clock:number=cb?cb.clock:(i>0?prevClk+180:180);
  const node=eventNodeName(e);
  const parts:Ref[]=cb?cb.participants.map((p:any)=>({side:p.side,slot:p.slot as Slot})):
   ([0,1,2,3,4].flatMap(s=>[{side:'A' as Side,slot:s as Slot},{side:'B' as Side,slot:s as Slot}]));
  return {e,cb,clock,node,parts,kills:(cb?cb.kills:[]) as any[],
   notJoined:((cb?.notJoined??[]) as any[]).map(n=>n.ref as Ref),idx:e.index as number,
   armed:false,done:false,lead:0,tail:0};
 });
 evInfo.sort((a,b)=>a.clock-b.clock);
 const endClock=(evInfo.at(-1)?.clock??600)+70;
 const T=(clock:number)=>clock/SCALE;

 const agents:Agent[]=[];
 for(const side of ['A','B'] as Side[]) for(let s=0;s<5;s++){
  const sl=s as Slot;
  agents.push({side,slot:sl,route:[homeNode(side,sl)],seg:0,segT:0,fixedPos:null,
   act:'lane',speed:SPEED[sl],nextDecide:0,alive:true,respawnAt:0,plan:null,pendingDest:null,
   lane:(sl===0?0:sl<=2?1:2) as 0|1|2, jgIdx:sl===1?(side==='A'?1:0):0, pushBias:0});
 }
 const ag=(r:Ref)=>agents.find(a=>a.side===r.side&&a.slot===r.slot)!;
 const posOf=(a:Agent):Vec=>{
  if(a.fixedPos) return a.fixedPos.slice() as Vec;
  const A=WN[a.route[Math.min(a.seg,a.route.length-1)]], B=WN[a.route[Math.min(a.seg+1,a.route.length-1)]]||A;
  return [A[0]+(B[0]-A[0])*a.segT, A[1]+(B[1]-A[1])*a.segT];
 };
 const curNode=(a:Agent)=>a.segT<0.5?a.route[a.seg]:a.route[Math.min(a.seg+1,a.route.length-1)];

 const tracks:Track[]=agents.map(a=>({side:a.side,slot:a.slot,
  key:[{t:0,pos:posOf(a),state:'idle' as const,act:'lane' as Act,reason:'경기 시작'}]}));
 const trk=(a:Agent)=>tracks[agents.indexOf(a)];
 const emit=(a:Agent,clock:number,state:TrackKey['state'],reason:string)=>{
  let p=posOf(a);
  // 이동·대기 키프레임은 반드시 통로 위. fight/dead의 jitter 위치가 'move'로 새는 것을 막는다.
  if(a.fixedPos && state!=='fight' && state!=='dead') p=WN[nearestWalkNode(p)].slice() as Vec;
  const k=trk(a).key, t=T(clock), last=k[k.length-1];
  if(last && Math.abs(last.t-t)<1e-4){ last.pos=p; last.state=state; last.act=a.act; last.reason=reason; return; }
  if(last && dist(last.pos,p)<0.04 && last.state===state && last.act===a.act) return;
  k.push({t,pos:p,state,act:a.act,reason});
 };

 const dedupe=(r:string[])=>r.filter((n,i)=>i===0||n!==r[i-1]);
 const headTo=(a:Agent,dest:string,turn=false)=>{
  a.seg=Math.max(0,Math.min(a.seg,a.route.length-1));
  if(a.seg>=a.route.length-1){ a.route=dedupe(route(a.route[a.seg],dest)); a.seg=0; a.segT=0; return; }
  if(dest===a.route[a.route.length-1]) return;                 // 이미 그 목적지로 가는 중
  const behind=a.route[a.seg], ahead=a.route[a.seg+1];
  if(turn){                                                    // 후퇴: 현재 구간을 되짚어 반전(위치 연속)
   a.route=dedupe([ahead,behind,...route(behind,dest).slice(1)]);
   a.seg=0; a.segT=1-a.segT;
  }else{                                                       // 재경로: 현재 구간 마저 이동 후 새 경로
   a.route=dedupe([behind,ahead,...route(ahead,dest).slice(1)]);
   a.seg=0;                                                    // 새 경로의 0번 구간 = 현재 구간
  }
 };

 const laneWinner=(lane:0|1|2):Side|null=>{
  const le=evInfo.find(x=>x.idx===lane);
  return le?.e.edge==='nva'?'A':le?.e.edge==='crn'?'B':null;
 };
 const lateAdv=()=> (evInfo.find(x=>x.idx>=5)?.e.advantage ?? 0);
 // 다가오는 큰 교전(오브·한타): 참가 예정이면 미리 그쪽으로 드리프트(정식 계획 이전).
 const groupSoon=(a:Agent,clock:number)=>evInfo.find(x=>!x.done
  && (x.cb?.kind==='teamfight'||x.cb?.kind==='objective')
  && x.clock>clock && x.clock-clock<58
  && x.parts.some(p=>p.side===a.side&&p.slot===a.slot)
  && !x.notJoined.some(n=>n.side===a.side&&n.slot===a.slot));

 const decide=(a:Agent,clock:number)=>{
  if(!a.alive) return;
  if(a.plan){ headTo(a,a.plan.node); a.act='group'; a.nextDecide=clock+4; emit(a,clock,'move',`#${a.plan.ev} 집결`); return; }
  const gs=groupSoon(a,clock);
  if(gs && a.slot!==1){ headTo(a,gs.node); a.act='group'; a.nextDecide=clock+7+jit(2); emit(a,clock,'move',`${gs.cb?.kind==='objective'?'오브':'한타'} 집결`); return; }
  const here=curNode(a);
  // 목적지는 항상 지금 노드와 달라야 한다(같으면 정지). 후보에서 현재 노드 제외.
  const pickDiff=(cands:string[],fallback:string)=>{ const c=cands.filter(n=>n&&n!==here); return c.length?c[Math.floor(rng()*c.length)]:fallback; };

  if(a.slot===1){ // 정글: 캠프 순찰(항상 이동) / 오브·갱킹 접근
   const objSoon=evInfo.find(x=>!x.done&&x.cb?.kind==='objective'&&x.clock>clock&&x.clock-clock<52);
   const gankSoon=evInfo.find(x=>!x.done&&x.cb&&x.cb.lane!=null&&x.clock>clock&&x.clock-clock<42&&x.parts.some(p=>p.side===a.side&&p.slot===1));
   let dest:string, why:string, act:Act;
   if(objSoon){ dest=objSoon.node; why='오브 준비'; act='roam'; }
   else if(gankSoon){ dest=laneRefs(gankSoon.cb.lane as 0|1|2,a.side).contest; why='갱킹 접근'; act='roam'; }
   else{
    if(rng()<0.35) a.jgIdx++;                                   // 가끔 반대 정글로
    const patrol=JG_PATROL[a.side][a.jgIdx%2];
    dest=pickDiff(patrol,patrol[0]); why='정글 이동'; act='jungle';
   }
   headTo(a,dest); a.act=act; a.nextDecide=clock+7+jit(2.5); emit(a,clock,'move',why); return;
  }

  if(a.slot===4){ // 서포터: 원딜의 farm zone에 맞춰 왕복(좌표 복제 아님) / 조건부 로밍
   const adc=ag({side:a.side,slot:3});
   const L=laneRefs(2,a.side), chain=[L.own,L.safe,L.contest,L.push,L.deep];
   let dest:string, why:string, act:Act;
   if(!adc.alive){ dest=pickDiff([L.own,L.safe],L.safe); why='바텀 정비'; act='lane'; }
   else if(rng()<0.13){ dest=laneRefs(1,a.side).contest; why='미드 로밍'; act='roam'; }
   else{
    let idx=chain.indexOf(curNode(adc)); if(idx<0)idx=2;
    const front=chain[Math.min(4,idx+1)], back=chain[Math.max(0,idx)];
    dest=pickDiff([front,back],front); why='원딜 지원'; act='lane';
   }
   headTo(a,dest); a.act=act; a.nextDecide=clock+6+jit(2); emit(a,clock,'move',why); return;
  }

  // 라이너(TOP·MID·ADC): pushBias로 farm zone(라인 1구간) 선택 → 그 구간을 왕복(끊임없는 소폭 이동).
  const lane=a.lane, w=laneWinner(lane);
  const bBias= w===a.side?0.32 : w?-0.36 : -0.04;
  const adv=lateAdv()*(a.side==='A'?1:-1)/28;
  a.pushBias=Math.max(-1,Math.min(1, bBias + adv + jit(0.10) ));
  const L=laneRefs(lane,a.side), chain=[L.own,L.safe,L.contest,L.push,L.deep];
  const threat=evInfo.find(x=>!x.done&&x.cb?.lane===lane&&x.clock>clock&&x.clock-clock<22&&x.parts.some(p=>p.side!==a.side&&p.slot===1));
  if(threat){ headTo(a,L.own,true); a.act='retreat'; a.nextDecide=clock+9+jit(3); emit(a,clock,'move','정글 위험 감지'); return; }
  // farm zone: pushBias(라인 승패·advantage·소량 난수)로 중심을 정하고 그 부근 2~3 노드를 오간다.
  // 고정 왕복이 아니라, zone 중심이 경기 상황에 따라 라인 위를 드리프트한다.
  const cz=Math.max(0,Math.min(4, 2 + a.pushBias*2.1 + jit(0.5)));
  const lo=Math.max(0,Math.floor(cz-1)), hi=Math.min(4,Math.ceil(cz+1));
  const zone=chain.slice(lo,hi+1);
  const dest=pickDiff(zone, chain[Math.round(cz)]);
  a.act='lane';
  headTo(a,dest);
  a.nextDecide=clock+7+jit(3);
  emit(a,clock,'move', a.pushBias>0.15?'라인 압박':a.pushBias<-0.15?'라인 수비':'라인 유지');
 };

 for(const a of agents) decide(a,0);

 const DT=2.5;
 let ei=0;
 const fightUntil:Record<string,number>={};
 const arriving:Record<string,{node:string,until:number,seq:number}>={}; // 교전 노드로 이동 중인 참가자(도착 시 fight)

 for(let clock=0; clock<=endClock+1; clock+=DT){
  for(const a of agents) if(!a.alive && clock>=a.respawnAt){
   a.alive=true; a.fixedPos=null; a.route=[FOUNT[a.side]]; a.seg=0; a.segT=0; a.act='base'; a.plan=null; a.pendingDest=null;
   delete fightUntil[a.side+a.slot]; delete arriving[a.side+a.slot];
   emit(a,clock,'idle','부활');
   beats.push({t:T(clock),seq:-1,engineClock:clock,kind:'revive',ref:{side:a.side,slot:a.slot},text:'부활'});
   a.nextDecide=clock+3;                 // 분수대에서 잠깐 → 이후 movement 루프의 decide가 라인/정글로 내보냄
  }
  for(const ev of evInfo){
   if(!ev.armed || ev.done || clock<ev.clock) continue;
   ev.done=true;
   const cb=ev.cb, evPos=WN[ev.node];
   const evT=Math.max(ev.clock,clock);   // 재생 시각: 사건 발생 시각과 현재 tick 중 늦은 쪽(같은 tick 내 사망이 먼저 찍히는 것 방지)
   for(const r of ev.parts){
    const a=ag(r); if(!a.alive || ev.notJoined.some(n=>n.side===r.side&&n.slot===r.slot)) continue;
    const d=dist(posOf(a),evPos);
    if(d<=5){                                   // 이미 도착 — 그 자리에서 교전(순간이동 없음)
     a.fixedPos=evPos.slice() as Vec; a.act='fight'; a.plan=null;
     fightUntil[r.side+r.slot]=ev.clock+ev.tail;
     emit(a,evT,'fight',`#${ev.idx} 교전`);
    }else if(d<=26){                            // 근처 — 현재 위치에서 실제 경로로 계속 이동해 합류(도착 시 fight)
     headTo(a,ev.node); a.act='group'; a.plan=null;   // headTo가 현재 구간 보존(역주행·순간이동 없음)
     arriving[r.side+r.slot]={node:ev.node,until:ev.clock+ev.tail,seq:ev.idx};
     emit(a,evT,'move',`#${ev.idx} 합류 중`);
     diag.push(`#${ev.idx}: ${r.side}${r.slot} 합류 이동(거리 ${d.toFixed(0)})`);
    }else{
     diag.push(`#${ev.idx}: ${r.side}${r.slot} 합류 실패(거리 ${d.toFixed(0)})`);
    }
   }
   beats.push({t:T(evT),seq:ev.idx,engineClock:ev.clock,kind:'engage',side:cb?cb.side:'A',text:`${ev.e.title} — 교전`});
   beats.push({t:T(evT)+0.05,seq:ev.idx,engineClock:ev.clock,kind:'line',text:ev.e.detail,side:cb?cb.side:undefined});
   if(cb?.committed){ const jr=cb.participants.find((p:any)=>p.slot===1);
    if(jr) beats.push({t:T(evT)-0.1,seq:ev.idx,engineClock:ev.clock,kind:'approach',side:cb.side,
     ref:{side:jr.side,slot:1},text:`정글 합류 (${cb.lane===0?'탑':cb.lane===1?'미드':'바텀'})`}); }
   for(const nj of (cb?.notJoined??[])) beats.push({t:T(evT)-0.05,seq:ev.idx,engineClock:ev.clock,kind:'noshow',
    ref:{side:nj.ref.side,slot:nj.ref.slot},text:`불참 · ${nj.reason}`});
   (ev.kills as any[]).forEach((k,ki)=>{
    const kt=evT+ki*3;
    scoreA+=k.killer.side==='A'?1:0; scoreB+=k.killer.side==='B'?1:0;
    beats.push({t:T(kt),seq:ev.idx,engineClock:ev.clock,kind:'kill',
     ref:{side:k.victim.side,slot:k.victim.slot},by:{side:k.killer.side,slot:k.killer.slot},
     assists:(k.assists??[]).map((x:any)=>({side:x.side,slot:x.slot})),
     side:k.killer.side,scoreDelta:[k.killer.side==='A'?1:0,k.killer.side==='B'?1:0],
     fb:!!cb.firstBlood&&ki===0,text:cb.firstBlood&&ki===0?'FIRST BLOOD':'처치'});
    const v=ag({side:k.victim.side,slot:k.victim.slot});
    v.alive=false; v.respawnAt=ev.clock+RESPAWN(ev.clock)+ki*4; v.plan=null; v.pendingDest=null;
    delete fightUntil[v.side+v.slot]; delete arriving[v.side+v.slot];
    v.fixedPos=evPos.slice() as Vec; v.act='dead';
    emit(v,kt,'dead','처치됨');
   });
   if(!cb && ev.e.kills){
    if(ev.e.kills.a){scoreA+=ev.e.kills.a;beats.push({t:T(evT),seq:ev.idx,engineClock:ev.clock,kind:'kill',side:'A',scoreDelta:[ev.e.kills.a,0],text:`교전 ${ev.e.kills.a}킬`});}
    if(ev.e.kills.b){scoreB+=ev.e.kills.b;beats.push({t:T(evT)+0.1,seq:ev.idx,engineClock:ev.clock,kind:'kill',side:'B',scoreDelta:[0,ev.e.kills.b],text:`교전 ${ev.e.kills.b}킬`});}
   }
   for(const es of (cb?.escaped??[])) beats.push({t:T(evT),seq:ev.idx,engineClock:ev.clock,kind:'escape',ref:{side:es.side,slot:es.slot},text:'생존·이탈'});
   if(cb?.kind==='objective'&&cb.objective.secured)
    beats.push({t:T(evT)+0.15,seq:ev.idx,engineClock:ev.clock,kind:'secure',side:cb.objective.secured,
     text:`${cb.objective.kind==='herald'?'전령':'드래곤'} 확보`});
   if(cb?.kind==='siege'&&cb.siege){
    const sg=cb.siege, laneKor=['탑','미드','바텀'][sg.lane]??'베이스';
    const defS:Side=sg.side==='A'?'B':'A';
    structState[defS]=[...sg.structAfter];
    if(defS==='A')structState.baseA=sg.baseTurretsAfter; else structState.baseB=sg.baseTurretsAfter;
    if(sg.nexus){ if(defS==='A')structState.nexusA=true; else structState.nexusB=true; }
    const snap:StructSnapshot={A:[...structState.A],B:[...structState.B],baseA:structState.baseA,baseB:structState.baseB,nexusA:structState.nexusA,nexusB:structState.nexusB};
    beats.push({t:T(evT)+0.2,seq:ev.idx,engineClock:ev.clock,kind:sg.nexus?'nexus':'siege',side:sg.side,struct:snap,
     text: sg.structuresDown>0
      ? (sg.nexus?`${sg.side} 넥서스 파괴`:`${sg.side} ${laneKor} ${sg.result==='INHIB'?'억제기 파괴':`포탑 ${sg.structuresDown} 철거`}`)
      : (sg.result==='NO_WINDOW'?`${sg.side} 공성 중단 (부활 복귀)`:sg.result==='RESET'?'양 팀 정비':`${sg.side} 공성 무산`)});
   }
   goldKeys.push({t:T(evT)+0.1,a:ev.e.goldA??goldKeys[goldKeys.length-1].a,b:ev.e.goldB??goldKeys[goldKeys.length-1].b});
   for(const r of ev.parts){ const a=ag(r); if(a.alive) a.plan=null; }
  }

  while(ei<evInfo.length){
   const ev=evInfo[ei];
   const pa=ev.parts.map(ag).filter(a=>a.alive && !ev.notJoined.some(n=>n.side===a.side&&n.slot===a.slot));
   const maxTravel=Math.max(0,...pa.map(a=>pathLen(route(curNode(a),ev.node).map(n=>WN[n]))/a.speed));
   const big=ev.cb?.kind==='teamfight'||ev.cb?.kind==='objective';
   const lead=Math.max(14,Math.min(big?125:80, maxTravel*(big?1.5:1.3)+(big?18:10)));
   if(clock < ev.clock-lead) break;
   for(const a of pa){
    a.plan={ev:ev.idx,node:ev.node};
    decide(a,clock);
    const eta=clock+pathLen(a.route.slice(a.seg).map(n=>WN[n]))/a.speed;
    if(eta>ev.clock+4) diag.push(`#${ev.idx} @${Math.round(ev.clock)}s: ${a.side}${a.slot} 이동시간 부족(도착 ~${Math.round(eta)}s, lead ${Math.round(lead)})`);
   }
   ev.tail=8+ev.kills.length*5; ev.lead=lead; ev.armed=true;
   windows.push({seq:ev.idx,start:T(ev.clock-lead),end:T(ev.clock+ev.tail),engineClock:ev.clock,
    label:ev.e.title,kind:ev.cb?ev.cb.kind:'teamfight'});
   ei++;
  }
  for(const a of agents){
   if(!a.alive) continue;
   const kk=a.side+a.slot;
   const fu=fightUntil[kk];
   if(fu!==undefined){
    if(clock<fu){ a.act='fight'; continue; }
    delete fightUntil[kk];
    const p=posOf(a); a.fixedPos=null;
    const hn=nearestWalkNode(p);
    // 교전 뒤엔 자기 라인/정글 쪽으로 물러난다(즉시 제자리 재집결 방지 — 연속 한타여도 소폭 이동).
    a.route=dedupe([hn,...route(hn,homeNode(a.side,a.slot)).slice(1)]); a.seg=0; a.segT=0;
    a.act='retreat'; a.nextDecide=clock+5;
    emit(a,clock,'move','교전 종료 — 복귀'); continue;
   }
   const arr=arriving[kk];
   if(arr){
    // 합류 이동 중 — 경로 그대로 진행하다 도착(≤4u)하거나 창이 닫히면 처리.
    if(clock>=arr.until){ delete arriving[kk]; a.act='retreat'; emit(a,clock,'move','합류 무산 — 복귀'); decide(a,clock+0.01); }
    else if(dist(posOf(a),WN[arr.node])<=4){
     delete arriving[kk]; a.fixedPos=WN[arr.node].slice() as Vec; a.act='fight';
     fightUntil[kk]=arr.until; emit(a,clock,'fight',`#${arr.seq} 합류·교전`); continue;
    }
    // else: 아래 이동 루프로 계속 전진
   }
   // 판단 먼저(현재 위치 기준) → 그 다음 이동. 키프레임 시각·위치 순서 일관.
   if(!arriving[kk] && clock>=a.nextDecide){
    const nearNode=a.segT<0.12||a.segT>0.88||a.seg>=a.route.length-1;
    if(nearNode) decide(a,clock);
    else a.nextDecide=clock+2;
   }
   const budget0=a.speed*DT; let budget=budget0;
   while(budget>1e-6 && a.seg<a.route.length-1){
    const A=WN[a.route[a.seg]], B=WN[a.route[a.seg+1]];
    const segLen=dist(A,B)||0.001;
    const remain=segLen*(1-a.segT);
    if(remain<=budget){ a.seg++; a.segT=0; budget-=remain;
     if(a.seg<a.route.length-1){
      // 한 tick에 여러 노드를 지날 때, 경유 키프레임 시각을 이동 거리에 비례해 분산(속도 폭증 방지).
      const frac=Math.min(0.999,(budget0-budget)/budget0);
      emit(a,clock+DT*frac,a.act==='fight'?'fight':'move','경유');
     }
    } else { a.segT+=budget/segLen; budget=0; }
   }
   if(a.seg>=a.route.length-1) a.segT=1;
  }
 }
 for(const a of agents) emit(a,endClock,a.alive?'idle':'dead','경기 종료');

 const duration=T(endClock)+0.6;
 beats.sort((x,y)=>x.t-y.t);
 for(const tr of tracks) tr.key.sort((a,b)=>a.t-b.t);
 windows.sort((a,b)=>a.start-b.start);
 return {duration,windows,tracks,beats,goldKeys,finalScore:[scoreA,scoreB],
  nav:{segs:WALK_SEGS.map(([a,b])=>[a.slice() as Vec,b.slice() as Vec])},diag,scale:SCALE};
}

// ── 재생 시각 t에서의 이산 상태(탐색·되감기·스포일러 방지) ──────────────────────────────
export function stateAt(rd:ReplayData,t:number){
 let a=0,b=0;const feed:{t:number,text:string,side?:Side,ref?:Ref,by?:Ref}[]=[];
 const deadNow:Record<string,boolean>={};
 let line='';let seq=0;
 let struct:StructSnapshot={A:[0,0,0],B:[0,0,0],baseA:2,baseB:2,nexusA:false,nexusB:false};
 for(const bt of rd.beats){
  if(bt.t>t)break;
  if(bt.scoreDelta){a+=bt.scoreDelta[0];b+=bt.scoreDelta[1];}
  if(bt.kind==='kill'&&bt.ref) deadNow[bt.ref.side+' '+bt.ref.slot]=true;
  if(bt.kind==='revive'&&bt.ref) deadNow[bt.ref.side+' '+bt.ref.slot]=false;
  if(bt.kind==='line'&&bt.text) line=bt.text;
  if(bt.struct) struct=bt.struct;
  if(bt.seq>=0) seq=bt.seq;
  if(['kill','secure','revive','noshow','escape','siege','nexus'].includes(bt.kind)) feed.push({t:bt.t,text:bt.text??bt.kind,side:bt.side,ref:bt.ref,by:bt.by});
 }
 let ga=2500,gb=2500;
 for(let i=1;i<rd.goldKeys.length;i++){
  const k0=rd.goldKeys[i-1],k1=rd.goldKeys[i];
  if(t<=k1.t){const r=(t-k0.t)/((k1.t-k0.t)||1);ga=k0.a+(k1.a-k0.a)*Math.max(0,Math.min(1,r));gb=k0.b+(k1.b-k0.b)*Math.max(0,Math.min(1,r));break;}
  ga=k1.a;gb=k1.b;
 }
 const win=rd.windows.find(w=>t>=w.start&&t<w.end)??rd.windows.filter(w=>w.start<=t).pop()??rd.windows[0];
 return {score:[a,b] as [number,number], gold:[Math.round(ga),Math.round(gb)] as [number,number],
  dead:deadNow, feed:feed.slice(-5), line, seq, engineClock:win?win.engineClock:0,
  gameClock:Math.round(t*rd.scale), window:win, struct};
}

// 트랙 t에서의 위치(키프레임 선분 보간). 사망 구간은 정지.
export function posAt(track:Track,t:number):{pos:Vec,state:TrackKey['state'],act?:Act,reason?:string}{
 const k=track.key;
 if(t<=k[0].t)return {pos:k[0].pos,state:k[0].state,act:k[0].act,reason:k[0].reason};
 for(let i=1;i<k.length;i++){
  if(t<=k[i].t){
   const r=(t-k[i-1].t)/((k[i].t-k[i-1].t)||1);
   // 사망·교전 키프레임은 정지(다음 키프레임까지 그 자리). 교전 클러스터가 통로 밖으로 보간되는 것 방지.
   if(k[i-1].state==='dead'||k[i-1].state==='fight')return {pos:k[i-1].pos,state:k[i-1].state,act:k[i-1].act,reason:k[i-1].reason};
   return {pos:[k[i-1].pos[0]+(k[i].pos[0]-k[i-1].pos[0])*r, k[i-1].pos[1]+(k[i].pos[1]-k[i-1].pos[1])*r],
    state:k[i].state,act:k[i].act,reason:k[i].reason};
  }
 }
 const last=k[k.length-1];
 return {pos:last.pos,state:last.state,act:last.act,reason:last.reason};
}

// 디버그: t에서 전 선수의 위치·행동·남은 경로
export function agentsAt(rd:ReplayData,t:number){
 return rd.tracks.map(tr=>{
  const {pos,state,act,reason}=posAt(tr,t);
  // 남은 경로 = t 이후 키프레임들의 pos
  const rest=tr.key.filter(k=>k.t>t-1e-6).map(k=>k.pos);
  return {side:tr.side,slot:tr.slot,pos,state,act,reason,path:[pos,...rest].slice(0,8)};
 });
}
