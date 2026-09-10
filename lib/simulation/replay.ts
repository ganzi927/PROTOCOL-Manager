// MINIMAP-01 — 실제 경기 사건과 동기화된 이동형 미니맵 재생 데이터.
//
// 설계 원칙:
//  - 경기 엔진의 사건 데이터(SetResult.events[].combat / .kills / .goldA·B / .detail)가 유일한 사실 근거.
//  - 중계 문장을 파싱하지 않는다. 승패·합류·처치·보상을 다시 계산하지 않는다.
//  - 실제 참가자(combat.participants)가 아닌 선수를 교전에 넣지 않는다.
//  - 체력·스킬·와드 등 미구현 상태를 만들어내지 않는다.
//  - 연출용 재생 시각(t)과 엔진의 실제 시각(engineClock)을 구분한다.
//
// 이 모듈은 순수하다(난수·Date 없음). 같은 SetResult → 같은 ReplayData.
// 갱킹(0~2)·오브전(3·4): 위치·처치·합류/불참. 한타(5~8 + 연장): 개별 참가자·피해자·부활(단위 4).
// 공성(단위 5): 공격자만 수비 팀 구조물 앞으로 이동, 실제 철거/억제기/넥서스만 beat로 — 피해만 입은
//   구조물을 파괴로 표시하지 않는다. `beat.struct`가 그 시점 양 팀 구조물 상태(미니맵·중계 일치 검증).
//   구조물 아이콘은 아직 SVG에 그리지 않는다 — 사이드 패널의 명시적 텍스트 상태가 대체 표시.
// '종료'(시간 제한 판정) 사건은 지도에 표시할 이동이 없어 건너뛴다.

export type Side='A'|'B';
export type Vec=[number,number];
export type Slot=0|1|2|3|4;
export type Ref={side:Side,slot:number};

// ── 지도: 0~100 좌표계. SVG y는 아래로 증가. A(블루)=좌하, B(레드)=우상. ─────────────
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

const N=MAP.nodes;
const dist=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// 통로 그래프 최단 경로(노드 이름 배열). 벽 가로지르기 방지의 근거.
export function pathBetween(from:string,to:string):string[]{
 if(from===to)return [from];
 const adj:Record<string,string[]>={};
 for(const [x,y] of MAP.edges){(adj[x]??=[]).push(y);(adj[y]??=[]).push(x);}
 const prev:Record<string,string|null>={[from]:null};
 const pq:[number,string][]=[[0,from]];const done=new Set<string>();
 const best:Record<string,number>={[from]:0};
 while(pq.length){
  pq.sort((a,b)=>a[0]-b[0]);const [d,u]=pq.shift()!;
  if(done.has(u))continue;done.add(u);
  if(u===to)break;
  for(const v of adj[u]??[]){
   const nd=d+dist(N[u],N[v]);
   if(best[v]===undefined||nd<best[v]){best[v]=nd;prev[v]=u;pq.push([nd,v]);}
  }
 }
 if(prev[to]===undefined)return [from,to]; // 연결 안 됨(설계상 없음) — 직선 폴백
 const out:string[]=[];for(let c:string|null=to;c;c=prev[c])out.unshift(c);
 return out;
}

// ── 홈 위치 / 사건 위치 ────────────────────────────────────────────────────────
const HOME:Record<Slot,[string,string]>={ // [A 노드, B 노드]
 0:['A_top','B_top'], 1:['A_jg_b','B_jg_t'], 2:['A_mid','B_mid'], 3:['A_bot','B_bot'], 4:['A_bot','B_bot'],
};
const homeNode=(r:Ref)=>HOME[r.slot as Slot][r.side==='A'?0:1];

// 사건이 벌어지는 노드. 라인 갱킹은 지는 쪽 라인, 오브는 해당 둥지, 공성은 수비 팀 구조물.
function eventNode(seq:number,combat:any):string{
 if(combat&&combat.kind==='siege'){
  const def:Side=combat.side==='A'?'B':'A';                 // 공격자 side → 수비 팀 구조물
  const L=combat.siege?.lane;
  if(L===undefined||L<0) return def==='A'?'A_base':'B_base';
  return (def==='A'?['A_top','mid','A_bot']:['B_top','mid','B_bot'])[L];
 }
 if(!combat||combat.kind==='teamfight'){ return seq===5?'dragon':seq===6?'baron':seq===7?'mid':seq===8?'mid':'dragon'; } // 한타(연장 포함)
 if(combat.kind==='objective') return combat.objective.kind==='herald'?'baron':'dragon';
 const loseSide:Side=combat.side==='A'?'B':'A';
 return combat.lane===0?(loseSide==='A'?'A_top':'B_top')
      : combat.lane===1?'mid'
      : (loseSide==='A'?'A_bot':'B_bot');
}

// ── 재생 데이터 타입 ─────────────────────────────────────────────────────────
export type BeatKind='approach'|'engage'|'kill'|'secure'|'escape'|'noshow'|'revive'|'line'|'siege'|'nexus';
export type StructSnapshot={A:number[], B:number[], baseA:number, baseB:number, nexusA:boolean, nexusB:boolean};
export type ReplayBeat={
 t:number, seq:number, engineClock:number, kind:BeatKind,
 text?:string, ref?:Ref, by?:Ref, assists?:Ref[], side?:Side, scoreDelta?:[number,number], fb?:boolean,
 struct?:StructSnapshot,   // 공성 beat에만 — 이 시점 양 팀 구조물 상태(미니맵·중계 일치 검증용)
};
export type TrackKey={t:number,pos:Vec,state:'idle'|'move'|'fight'|'dead'};
export type Track={side:Side,slot:Slot,key:TrackKey[]};
export type ReplayWindow={seq:number,start:number,end:number,engineClock:number,label:string,kind:string};
export type ReplayData={
 duration:number,
 windows:ReplayWindow[],
 tracks:Track[],
 beats:ReplayBeat[],
 goldKeys:{t:number,a:number,b:number}[],
 finalScore:[number,number],
};

const APPROACH=2.4, CONVERGE=1.3, RESOLVE=0.7, AFTER=1.9, PER_KILL=0.8;

// 경로 노드 → 시간 분배 키프레임(선분 위 보간 → 통로 이탈 없음)
function walkKeys(from:string,to:string,t0:number,t1:number,endState:TrackKey['state']):TrackKey[]{
 const nodes=pathBetween(from,to);
 if(nodes.length===1)return [{t:t0,pos:N[nodes[0]].slice() as Vec,state:endState}];
 const segLen=nodes.slice(1).map((n,i)=>dist(N[nodes[i]],N[n]));
 const total=segLen.reduce((a,b)=>a+b,0)||1;
 let acc=0;const keys:TrackKey[]=[];
 keys.push({t:t0,pos:N[nodes[0]].slice() as Vec,state:'move'});
 for(let i=1;i<nodes.length;i++){
  acc+=segLen[i-1];
  const tt=t0+(t1-t0)*(acc/total);
  keys.push({t:tt,pos:N[nodes[i]].slice() as Vec,state:i===nodes.length-1?endState:'move'});
 }
 return keys;
}

export function buildReplay(set:{events:any[],lineupA:string[],lineupB:string[]}):ReplayData{
 const tracks:Track[]=[];
 for(const side of ['A','B'] as Side[]) for(let s=0;s<5;s++)
  tracks.push({side,slot:s as Slot,key:[{t:0,pos:N[homeNode({side,slot:s as Slot})].slice() as Vec,state:'idle'}]});
 const trk=(r:Ref)=>tracks.find(x=>x.side===r.side&&x.slot===r.slot)!;
 const push=(r:Ref,k:TrackKey)=>{trk(r).key.push(k);}; // 순서 무관 삽입 — 마지막에 트랙별 정렬

 const beats:ReplayBeat[]=[];
 const windows:ReplayWindow[]=[];
 const goldKeys:{t:number,a:number,b:number}[]=[{t:0,a:2500,b:2500}];
 let cursor=0;
 let scoreA=0,scoreB=0;
 let lastClock=0; // 마지막으로 아는 엔진 시각(combat 없는 한타 사건 보간용)
 const deadUntil:Record<string,number>={}; // "side slot" → 현재 부활 엔진시각(상태 판정용)
 // 사망 후 아직 부활 연출을 안 낸 선수. 다음 사건에서 실제 참가자(=엔진상 생존)로 나타나면 그 사건 창에서 부활 처리.
 const pendingRevive:Record<string,{deathT:number}>={};
 const structState:StructSnapshot={A:[0,0,0],B:[0,0,0],baseA:2,baseB:2,nexusA:false,nexusB:false}; // 공성 누적(미니맵 구조물 상태)

 const events=set.events;
 for(let ei=0;ei<events.length;ei++){
  const e=events[ei], cb=e.combat;
  if(e.phase==='종료')continue;                 // 시간 제한 판정 사건은 지도에 표시할 이동이 없다
  const engineClock=cb?cb.clock:lastClock+180;
  lastClock=engineClock;
  const node=eventNode(e.index,cb);
  const at=N[node];
  const committed=!!cb?.committed;
  const kills:any[]=cb?cb.kills:[];
  const winStart=cursor+0.4;
  const approachDur=(committed||cb?.kind==='objective')?APPROACH:APPROACH*0.35;
  const engageT=winStart+approachDur;
  const resolveT=engageT+CONVERGE+RESOLVE;
  const afterT=resolveT+kills.length*PER_KILL;
  const winEnd=afterT+AFTER;

  const label=e.title, kindTag=cb?cb.kind:(e.index<5?'objective':'teamfight');
  windows.push({seq:e.index,start:winStart,end:winEnd,engineClock,label,kind:kindTag});

  // 참가자: combat이 있으면 그 목록만. 없으면(한타) 살아있는 전원.
  let parts:Ref[];
  if(cb){ parts=cb.participants.map((p:any)=>({side:p.side,slot:p.slot as Slot})); }
  else { parts=[]; for(const side of ['A','B'] as Side[]) for(let s=0;s<5;s++){
   const key=side+' '+s; if(!(deadUntil[key]>engineClock)) parts.push({side,slot:s as Slot}); } }
  const partKey=new Set(parts.map(p=>p.side+p.slot));

  // 부활: 죽었던 선수가 이 사건의 실제 참가자로 돌아오면(엔진상 생존) 이 창 시작에서 부활 처리.
  // 사망마다 정확히 1건 — 처치 beat와 부활 beat가 1:1로 짝지어진다.
  for(const p of parts){
   const key=p.side+' '+p.slot;                 // deadUntil/pendingRevive 키와 동일 형식(공백 포함)
   if(!pendingRevive[key])continue;
   const rt=Math.max(pendingRevive[key].deathT+0.6, winStart-0.2);
   beats.push({t:rt,seq:e.index,engineClock,kind:'revive',ref:{side:p.side,slot:p.slot},text:'부활'});
   push(p,{t:rt,pos:N[p.side==='A'?'A_base':'B_base'].slice() as Vec,state:'dead'}); // 분수대 복귀(회색), 접근 루프가 홈에서 이동 시작
   delete pendingRevive[key]; delete deadUntil[key];
  }

  // 접근/합류
  for(const p of parts){
   const lastK=trk(p).key[trk(p).key.length-1];
   // 직전 사건에서 죽었던 참가자는 이번 사건 시점엔 부활해 홈에서 출발한다(부활 키프레임이 위에서 베이스로 찍혔으니 홈 노드에서 접근).
   const fromNode=lastK.state==='dead'?homeNode(p):nearestNode(lastK.pos);
   const isJgl=p.slot===1;
   const t0=isJgl&&committed?winStart:engageT-0.4;
   for(const k of walkKeys(fromNode,node,t0,engageT,'fight')) push(p,k);
  }
  if(committed){
   const jr=cb.participants.find((p:any)=>p.slot===1);
   if(jr) beats.push({t:winStart+0.1,seq:e.index,engineClock,kind:'approach',side:cb.side,
    ref:{side:jr.side,slot:1},text:`정글 합류 (${cb.lane===0?'탑':cb.lane===1?'미드':'바텀'})`});
  }
  // 불참 사유
  for(const nj of (cb?.notJoined??[])){
   beats.push({t:winStart+0.2,seq:e.index,engineClock,kind:'noshow',ref:{side:nj.ref.side,slot:nj.ref.slot},text:`불참 · ${nj.reason}`});
  }

  beats.push({t:engageT,seq:e.index,engineClock,kind:'engage',side:cb?cb.side:e.winner===set.lineupA[0]?'A':'B',
   text:`${label} — 교전`});

  // 처치(실제 combat.kills만 개별 표시)
  let ki=0;
  for(const k of kills){
   const kt=resolveT+ki*PER_KILL;
   scoreA+=k.killer.side==='A'?1:0; scoreB+=k.killer.side==='B'?1:0;
   beats.push({t:kt,seq:e.index,engineClock,kind:'kill',
    ref:{side:k.victim.side,slot:k.victim.slot},by:{side:k.killer.side,slot:k.killer.slot},
    assists:(k.assists??[]).map((a:any)=>({side:a.side,slot:a.slot})),
    side:k.killer.side,scoreDelta:[k.killer.side==='A'?1:0,k.killer.side==='B'?1:0],
    fb:!!cb.firstBlood&&ki===0, text:cb.firstBlood&&ki===0?'FIRST BLOOD':'처치'});
   // 피해자: 사건 위치에서 사망 상태 고정. 부활 연출은 다음에 실제 참가자로 복귀할 때(위 블록).
   const dPos=jitter(at,k.victim.slot);
   push({side:k.victim.side,slot:k.victim.slot},{t:kt,pos:dPos,state:'dead'});
   const rid=k.victim.side+' '+k.victim.slot;
   deadUntil[rid]=respawnEngine(engineClock);
   pendingRevive[rid]={deathT:kt};
   ki++;
  }
  // 한타 팀 킬(개별 피해자 없음 — combat 미구현): 스코어·피드만
  if(!cb && e.kills){
   if(e.kills.a){scoreA+=e.kills.a;beats.push({t:resolveT,seq:e.index,engineClock,kind:'kill',side:'A',scoreDelta:[e.kills.a,0],text:`교전 ${e.kills.a}킬`});}
   if(e.kills.b){scoreB+=e.kills.b;beats.push({t:resolveT+0.3,seq:e.index,engineClock,kind:'kill',side:'B',scoreDelta:[0,e.kills.b],text:`교전 ${e.kills.b}킬`});}
  }
  // 탈출 / 보호 성공(실제 기록된 경우만)
  for(const es of (cb?.escaped??[])){
   beats.push({t:resolveT,seq:e.index,engineClock,kind:'escape',ref:{side:es.side,slot:es.slot},text:'생존·이탈'});
  }
  // 오브 확보
  if(cb?.kind==='objective'&&cb.objective.secured){
   beats.push({t:afterT-0.2,seq:e.index,engineClock,kind:'secure',side:cb.objective.secured,
    text:`${cb.objective.kind==='herald'?'전령':'드래곤'} 확보`});
  }
  // 공성: 실제로 철거된 구조물만. 피해만 입은 구조물을 파괴로 표시하지 않는다.
  if(cb?.kind==='siege'&&cb.siege){
   const sg=cb.siege, laneKor=['탑','미드','바텀'][sg.lane]??'베이스';
   const defS:Side=sg.side==='A'?'B':'A';
   structState[defS]=[...sg.structAfter];
   if(defS==='A')structState.baseA=sg.baseTurretsAfter;else structState.baseB=sg.baseTurretsAfter;
   if(sg.nexus){ if(defS==='A')structState.nexusA=true;else structState.nexusB=true; }
   const snap:StructSnapshot={A:[...structState.A],B:[...structState.B],baseA:structState.baseA,baseB:structState.baseB,nexusA:structState.nexusA,nexusB:structState.nexusB};
   if(sg.structuresDown>0){
    beats.push({t:afterT-0.2,seq:e.index,engineClock,kind:sg.nexus?'nexus':'siege',side:sg.side,struct:snap,
     text:sg.nexus?`${sg.side} 넥서스 파괴`:`${sg.side} ${laneKor} ${sg.result==='INHIB'?'억제기 파괴':`포탑 ${sg.structuresDown} 철거`}`});
   }else{
    beats.push({t:afterT-0.2,seq:e.index,engineClock,kind:'siege',side:sg.side,struct:snap,
     text:sg.result==='NO_WINDOW'?`${sg.side} 공성 중단 (부활 복귀)`:sg.result==='RESET'?'양 팀 정비':`${sg.side} 공성 무산`});
   }
  }
  // 중계 한 줄(엔진 detail 그대로)
  beats.push({t:engageT+0.1,seq:e.index,engineClock,kind:'line',text:e.detail,side:cb?cb.side:undefined});

  // 골드 키(엔진 goldA/goldB를 resolve 시각에)
  goldKeys.push({t:resolveT,a:e.goldA??goldKeys[goldKeys.length-1].a,b:e.goldB??goldKeys[goldKeys.length-1].b});

  // 후퇴: 생존 참가자는 홈으로 드리프트
  for(const p of parts){
   if(deadUntil[p.side+' '+p.slot]>engineClock)continue;
   for(const k of walkKeys(node,homeNode(p),afterT,winEnd,'idle')) push(p,k);
  }
  cursor=winEnd;
 }
 const duration=cursor+0.6;
 // 부활 연출은 위 사건 루프에서 사건 창에 맞춰 이미 냈다(사망마다 1건, 처치 beat와 1:1).
 // 세트 종료 시점까지 못 살아난 선수는 부활 beat 없음(테스트가 그렇게 기대).

 beats.sort((x,y)=>x.t-y.t);
 for(const tr of tracks) tr.key.sort((a,b)=>a.t-b.t);
 return {duration,windows,tracks,beats,goldKeys,finalScore:[scoreA,scoreB]};
}

function nearestNode(p:Vec):string{
 let bn='mid',bd=Infinity;
 for(const [name,pos] of Object.entries(N)){const d=dist(p,pos);if(d<bd){bd=d;bn=name;}}
 return bn;
}
function jitter(p:Vec,slot:number):Vec{ // 초상화 겹침 완화용 시각 오프셋(논리 위치와 구분되는 소량)
 const ang=slot*1.3; return [p[0]+Math.cos(ang)*3.2, p[1]+Math.sin(ang)*3.2];
}
function respawnEngine(clock:number){ return clock + 10 + Math.min(52, clock/60*3.2); } // combat.RESPAWN 근사(부활 시점만)

// ── 재생 시각 t에서의 상태 재구성(탐색·되감기·스포일러 방지) ────────────────────
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
 // 골드 보간
 let ga=2500,gb=2500;
 for(let i=1;i<rd.goldKeys.length;i++){
  const k0=rd.goldKeys[i-1],k1=rd.goldKeys[i];
  if(t<=k1.t){const r=(t-k0.t)/((k1.t-k0.t)||1);ga=k0.a+(k1.a-k0.a)*Math.max(0,Math.min(1,r));gb=k0.b+(k1.b-k0.b)*Math.max(0,Math.min(1,r));break;}
  ga=k1.a;gb=k1.b;
 }
 const win=rd.windows.find(w=>t>=w.start&&t<w.end)??rd.windows.filter(w=>w.start<=t).pop()??rd.windows[0];
 return {score:[a,b] as [number,number], gold:[Math.round(ga),Math.round(gb)] as [number,number],
  dead:deadNow, feed:feed.slice(-5), line, seq, engineClock:win?win.engineClock:0, window:win, struct};
}

// 트랙 t에서의 위치(키프레임 선분 보간 → 통로 위)
export function posAt(track:Track,t:number):{pos:Vec,state:TrackKey['state']}{
 const k=track.key;
 if(t<=k[0].t)return {pos:k[0].pos,state:k[0].state};
 for(let i=1;i<k.length;i++){
  if(t<=k[i].t){
   const r=(t-k[i-1].t)/((k[i].t-k[i-1].t)||1);
   if(k[i-1].state==='dead')return {pos:k[i-1].pos,state:'dead'}; // 사망 상태면 고정
   return {pos:[k[i-1].pos[0]+(k[i].pos[0]-k[i-1].pos[0])*r, k[i-1].pos[1]+(k[i].pos[1]-k[i-1].pos[1])*r],state:k[i].state};
  }
 }
 return {pos:k[k.length-1].pos,state:k[k.length-1].state};
}
