'use client';
import {useRef,useEffect,useState,useMemo,useCallback} from 'react';
import {champImageUrl,champName,meta} from '@/lib/game';
import {buildReplay,stateAt,posAt,agentsAt,MAP,type ReplayData} from '@/lib/simulation/replay';
import {compositionPlan} from '@/lib/balance/composition';
import {formationOffset,playbackDestination} from '@/lib/simulation/broadcast';
import {RiftTerrain} from './rift-map';
import {Play,Pause,SkipForward,RotateCcw,Bug} from 'lucide-react';

type SetLike={endReason?:string;events:any[],lineupA:string[],lineupB:string[],draft:{picksA:string[],picksB:string[]}};

const ACT_KO:Record<string,string>={lane:'라인',jungle:'정글',roam:'로밍',group:'집결',fight:'교전',retreat:'후퇴',recall:'귀환',base:'부활',dead:'사망'};

// ── 구조물 위치(SVG 좌표). 데이터가 지원하는 만큼만 — struct[lane]∈0..3(외곽/내곽/억제기), base 2→0, nexus bool. ──
const N=MAP.nodes, lerp=(a:number[],b:number[],t:number):[number,number]=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
// 팀별·라인별 [외곽, 내곽, 억제기] 좌표(자기 베이스 쪽에서 바깥으로). 통로 위.
const STR={
 A:{ turret:[
   [lerp(N.A_top,N.top_mid,0.16), N.A_top, lerp(N.A_base,N.A_top,0.58)],
   [lerp(N.A_mid,N.mid,0.34), N.A_mid, lerp(N.A_base,N.A_mid,0.52)],
   [lerp(N.A_bot,N.bot_mid,0.16), N.A_bot, lerp(N.A_base,N.A_bot,0.55)],
  ] as [number,number][][],
  nexT:[[N.A_base[0]-3.4,N.A_base[1]-1.2],[N.A_base[0]+1.2,N.A_base[1]+3.4]] as [number,number][],
  nex:[N.A_base[0]+0.5,N.A_base[1]+0.5] as [number,number] },
 B:{ turret:[
   [lerp(N.B_top,N.top_mid,0.16), N.B_top, lerp(N.B_base,N.B_top,0.58)],
   [lerp(N.B_mid,N.mid,0.34), N.B_mid, lerp(N.B_base,N.B_mid,0.52)],
   [lerp(N.B_bot,N.bot_mid,0.16), N.B_bot, lerp(N.B_base,N.B_bot,0.55)],
  ] as [number,number][][],
  nexT:[[N.B_base[0]+3.4,N.B_base[1]+1.2],[N.B_base[0]-1.2,N.B_base[1]-3.4]] as [number,number][],
  nex:[N.B_base[0]-0.5,N.B_base[1]-0.5] as [number,number] },
};

// 위치는 rAF에서 DOM 직접 갱신. 이산 상태(점수·골드·피드·중계·구조물)만 저압축 리렌더.
export function ReplayTheater({set,teamA,teamB,mineIsA,names,onSelectPlayer,onEnd,onProgress}:{
 set:SetLike, teamA:string, teamB:string, mineIsA:boolean,
 names:{a:string[],b:string[]}, onSelectPlayer:(id:string)=>void, onEnd?:()=>void, onProgress?:(seq:number)=>void,
}){
 const rd=useMemo<ReplayData>(()=>buildReplay(set),[set]);
 const styles=useMemo(()=>({A:compositionPlan(set.draft.picksA).style,B:compositionPlan(set.draft.picksB).style}),[set.draft]);
 const endedRef=useRef(false);
 const colA=meta(teamA).color||'#5b9bd5', colB=meta(teamB).color||'#e06666';
 const champ=(side:'A'|'B',slot:number)=>(side==='A'?set.draft.picksA:set.draft.picksB)[slot];
 const pid=(side:'A'|'B',slot:number)=>(side==='A'?set.lineupA:set.lineupB)[slot];
 const pname=(side:'A'|'B',slot:number)=>(side==='A'?names.a:names.b)[slot]||'?';

 const tRef=useRef(0), playingRef=useRef(true), speedRef=useRef(1), lastRef=useRef(0), rafRef=useRef(0);
 // F23: OS "모션 감소" 설정을 읽는다. 엔진 시계(tRef)·판정은 그대로 두고(프레임률 무관 원칙 유지),
 // 화면에 실제로 그리는 빈도와 진형 전환의 완만한 보간만 줄인다 — formationOffset은 "표시 전용"이라
 // (broadcast.ts 주석) 어느 쪽이든 결과에 영향 없다.
 const reducedMotionRef=useRef(false), lastPaintWallRef=useRef(0);
 useEffect(()=>{
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotionRef.current=mq.matches;
  const onChange=()=>{reducedMotionRef.current=mq.matches;};
  mq.addEventListener('change',onChange);
  return ()=>mq.removeEventListener('change',onChange);
 },[]);
 const iconRefs=useRef<Record<string,SVGGElement|null>>({});
 const pathRefs=useRef<Record<string,SVGPolylineElement|null>>({});
 const actRefs=useRef<Record<string,SVGTextElement|null>>({});
 const [snap,setSnap]=useState(()=>stateAt(rd,0));
 const [playing,setPlaying]=useState(true);
 const [speed,setSpeed]=useState(1);
 const [hidden,setHidden]=useState(false);
 const [debug,setDebug]=useState(false);
 const [tDisplay,setTDisplay]=useState(0);
 const debugRef=useRef(false); debugRef.current=debug;
 const lastSnapKey=useRef(''), lastTDisp=useRef(0), lastSeq=useRef(-1);

 const snapKey=useCallback((s:ReturnType<typeof stateAt>)=>
  `${s.completed}|${s.seq}|${s.score[0]}:${s.score[1]}|${Math.round(s.gold[0]/50)}:${Math.round(s.gold[1]/50)}|${s.feed.length}|${s.line}|${s.struct.A}${s.struct.B}${s.struct.baseA}${s.struct.baseB}${s.struct.nexusA}${s.struct.nexusB}`,[]);

 // Role formation is a smoothly blended display offset, not a change to simulation positions.
 const paint=useCallback((t:number)=>{
  const ags=debugRef.current?agentsAt(rd,t):null;
  for(const tr of rd.tracks){
   const key=tr.side+tr.slot;
   const g=iconRefs.current[key];
   if(g){ const {pos,state}=posAt(tr,t);
    const off=formationOffset(tr,t,styles[tr.side],reducedMotionRef.current);
    g.setAttribute('transform',`translate(${pos[0]+off[0]} ${pos[1]+off[1]})`); g.setAttribute('data-state',state); }
   if(ags){
    const a=ags.find(x=>x.side===tr.side&&x.slot===tr.slot)!;
    const pl=pathRefs.current[key]; if(pl) pl.setAttribute('points',a.path.map(p=>`${p[0]},${p[1]}`).join(' '));
    const at=actRefs.current[key]; if(at){ at.setAttribute('transform',`translate(${a.pos[0]} ${a.pos[1]})`); at.textContent=(ACT_KO[a.act||'']||''); }
   }
  }
  const s=stateAt(rd,t), key=snapKey(s);
  if(key!==lastSnapKey.current){lastSnapKey.current=key;setSnap(s);}
  if(s.completed!==lastSeq.current){lastSeq.current=s.completed;if(!endedRef.current)onProgress?.(s.completed);}
  if(Math.abs(t-lastTDisp.current)>=0.25){lastTDisp.current=t;setTDisplay(t);}
 },[rd,snapKey,onProgress,styles]);

 useEffect(()=>{ // rAF 재생 루프 — 프레임률이 경기 판단에 영향 없음(위치·상태 모두 t의 함수)
  lastRef.current=performance.now();
  const loop=(now:number)=>{
   const dt=Math.min(0.1,(now-lastRef.current)/1000); lastRef.current=now;
   if(playingRef.current){
    tRef.current+=dt*speedRef.current;
    if(tRef.current>=rd.duration){tRef.current=rd.duration;lastTDisp.current=rd.duration;setTDisplay(rd.duration);playingRef.current=false;setPlaying(false);if(!endedRef.current){endedRef.current=true;onEnd?.();}}
   }
   // 모션 감소 시 실제 DOM 페인트만 ~150ms 간격으로 줄인다(엔진 시계 tRef는 매 프레임 그대로 전진 —
   // 배속·되감기·결과는 무영향, "덜 매끄럽게 보이지만 똑같이 진행"이 목표).
   if(!reducedMotionRef.current||now-lastPaintWallRef.current>=150){lastPaintWallRef.current=now;paint(tRef.current);}
   rafRef.current=requestAnimationFrame(loop);
  };
  rafRef.current=requestAnimationFrame(loop);
  return ()=>cancelAnimationFrame(rafRef.current);
 },[rd,paint,onEnd]);

 useEffect(()=>{ paint(tRef.current); },[debug,paint]); // 디버그 토글 즉시 반영

 useEffect(()=>{
  const onVis=()=>{ const h=document.hidden; setHidden(h); if(h){playingRef.current=false;setPlaying(false);} };
  document.addEventListener('visibilitychange',onVis);
  return ()=>document.removeEventListener('visibilitychange',onVis);
 },[]);

 const toggle=()=>{if(tRef.current>=rd.duration){restart();return;}const n=!playingRef.current;playingRef.current=n;setPlaying(n);lastRef.current=performance.now();};
 const setSpd=(v:number)=>{speedRef.current=v;setSpeed(v);};
 const seek=(t:number)=>{
  const dst=playbackDestination(t,rd.duration,endedRef.current);
  // Rewind clears terminal state before paint so completed-count changes reach the parent.
  endedRef.current=dst.ended;tRef.current=dst.time;lastTDisp.current=dst.time;setTDisplay(dst.time);
  lastSnapKey.current='';lastSeq.current=-1;paint(dst.time);
  if(dst.ended){playingRef.current=false;setPlaying(false);if(dst.notifyEnd)onEnd?.();}
 };
 const nextEvent=()=>{const w=rd.windows.find(w=>w.start>tRef.current+0.05);seek(w?w.start:rd.duration);};
 const restart=()=>{endedRef.current=false;lastTDisp.current=0;setTDisplay(0);tRef.current=0;playingRef.current=true;setPlaying(true);lastRef.current=performance.now();lastSnapKey.current='';paint(0);};

 // 통로(WALK) — 디버그에서 보행 가능 영역
 const navLines=useMemo(()=>rd.nav.segs.map((s,i)=><line key={i} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} className="rt-nav"/>),[rd]);
 const edgeLines=MAP.edges.map(([x,y],i)=>{const a=MAP.nodes[x],b=MAP.nodes[y];return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="rt-corridor"/>;});
 // 구조물 레이어: snap.struct(현재 재생 시각까지 집계된 상태)에서만 그린다 → 미래 사건 상태 미노출.
 const structLayer=useMemo(()=>{
  const st=snap.struct;
  const out:any[]=[];
  for(const S of ['A','B'] as const){
   const col=S==='A'?colA:colB, prog=st[S], baseN=S==='A'?st.baseA:st.baseB, nex=S==='A'?st.nexusA:st.nexusB;
   for(let L=0;L<3;L++) for(let j=0;j<3;j++){
    const [x,yy]=STR[S].turret[L][j], down=prog[L]>j, inhib=j===2;
    out.push(inhib
     ? <rect key={`${S}${L}${j}`} x={x-1.5} y={yy-1.5} width={3} height={3} transform={`rotate(45 ${x} ${yy})`}
         className={`rt-inhib${down?' down':''}`} style={down?undefined:{fill:col}}/>
     : <circle key={`${S}${L}${j}`} cx={x} cy={yy} r={down?1:1.5} className={`rt-turret${down?' down':''}`} style={down?undefined:{fill:col}}/>);
   }
   STR[S].nexT.forEach(([x,yy],k)=>{
    const down=(2-baseN)>k;
    out.push(<circle key={`${S}nt${k}`} cx={x} cy={yy} r={down?0.9:1.4} className={`rt-turret nexT${down?' down':''}`} style={down?undefined:{fill:col}}/>);
   });
   out.push(<circle key={`${S}nx`} cx={STR[S].nex[0]} cy={STR[S].nex[1]} r={2.6} className={`rt-nexus${nex?' down':''}`} style={nex?undefined:{fill:col}}/>);
   if(nex) out.push(<text key={`${S}nxx`} x={STR[S].nex[0]} y={STR[S].nex[1]+1.3} className="rt-nexus-x" textAnchor="middle">✕</text>);
  }
  return out;
 },[snap.struct,colA,colB]);
 const dead=snap.dead;
 const mm=(sec:number)=>`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;

 const icon=(side:'A'|'B',slot:number)=>{
  const cid=champ(side,slot), key=side+slot, isDead=!!dead[side+' '+slot];
  const abbr=(champName(cid)||'').slice(0,2);
  return <g key={key} ref={el=>{iconRefs.current[key]=el;}} className={`rt-icon rt-${side}${isDead?' rt-dead':''}`}
    onClick={()=>onSelectPlayer(pid(side,slot))} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelectPlayer(pid(side,slot));}}} role="button" tabIndex={0}
    aria-label={`${pname(side,slot)} · ${champName(cid)}`}>
   <circle r={3.4} className="rt-ring" style={{stroke:side==='A'?colA:colB}}/>
   <text className="rt-abbr" textAnchor="middle" dy="1.05">{abbr}</text>
   <image href={champImageUrl(cid)} x={-3} y={-3} width={6} height={6} preserveAspectRatio="xMidYMid slice"
     clipPath="url(#rtclip)" onError={e=>{(e.currentTarget as SVGImageElement).style.display='none';}}/>
   {isDead&&<text className="rt-skull" textAnchor="middle" dy="1.1">✕</text>}
  </g>;
 };

 return <div className="replay-theater">
  <div className="rt-strip">
   <span className="rt-team" style={{color:colA}}>{meta(teamA).short}<b>{snap.score[0]}</b></span>
   <span className="rt-clock">{mm(snap.gameClock)}<small> IN-GAME</small></span>
   <span className="rt-team right"><b>{snap.score[1]}</b>{meta(teamB).short}</span>
   <span className="rt-gold">골드 {(snap.gold[mineIsA?0:1]/1000).toFixed(1)}k <em>vs</em> {(snap.gold[mineIsA?1:0]/1000).toFixed(1)}k</span>
  </div>
  <div className="rt-plans"><span>{meta(teamA).short} · {compositionPlan(set.draft.picksA).label}</span><span>{meta(teamB).short} · {compositionPlan(set.draft.picksB).label}</span></div><div className="rt-stage">
   <svg viewBox="0 0 100 100" className={`rt-map${debug?' rt-debug':''}`} preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id="rtclip"><circle cx="0" cy="0" r="3"/></clipPath></defs>
    <RiftTerrain/>
    {debug&&<g className="rt-navlayer">{navLines}</g>}
    <circle cx={MAP.nodes.baron[0]} cy={MAP.nodes.baron[1]} r="3.4" className="rt-obj"/><text x={MAP.nodes.baron[0]} y={MAP.nodes.baron[1]-4.5} className="rt-objlabel" textAnchor="middle">전령/바론</text>
    <circle cx={MAP.nodes.dragon[0]} cy={MAP.nodes.dragon[1]} r="3.4" className="rt-obj"/><text x={MAP.nodes.dragon[0]} y={MAP.nodes.dragon[1]+6.5} className="rt-objlabel" textAnchor="middle">드래곤</text>
    <g className="rt-structs">{structLayer}</g>
    {debug&&(['A','B'] as const).flatMap(s=>[0,1,2,3,4].map(sl=>
     <polyline key={'p'+s+sl} ref={el=>{pathRefs.current[s+sl]=el;}} className={`rt-path rt-path-${s}`} points=""/>))}
    {(['A','B'] as const).flatMap(s=>[0,1,2,3,4].map(sl=>icon(s,sl)))}
    {debug&&(['A','B'] as const).flatMap(s=>[0,1,2,3,4].map(sl=>
     <text key={'a'+s+sl} ref={el=>{actRefs.current[s+sl]=el;}} className="rt-actlabel" textAnchor="middle" dy="6.4"/>))}
   </svg>
   <div className="rt-side">
    {(() => {
     const st=snap.struct, dmgA=st.B.reduce((x,y)=>x+y,0)+(2-st.baseB)*2, dmgB=st.A.reduce((x,y)=>x+y,0)+(2-st.baseA)*2;
     const lbl=(arr:number[],base:number,nex:boolean)=>nex?'넥서스 파괴':`${arr.filter(v=>v>=3).length}억제 · 포탑 ${6-arr.reduce((x,y)=>x+Math.min(2,y),0)}/6${base<2?` · 넥서스포탑 ${base}/2`:''}`;
     if(dmgA===0&&dmgB===0)return null;
     return <div className="rt-struct">
      <span style={{color:colA}}>{meta(teamA).short}</span> {lbl(st.A,st.baseA,st.nexusA)}
      <span className="rt-struct-sep">/</span>
      <span style={{color:colB}}>{meta(teamB).short}</span> {lbl(st.B,st.baseB,st.nexusB)}
     </div>;
    })()}
    <div className="rt-view-label">관전자 시점 · 경기 사건 재생</div><div className="rt-nowline">{tDisplay>=rd.duration&&set.endReason?.startsWith('CAP_')?'제한 시간 또는 사건 수 도달 · 넥서스 미파괴, 경기 결과에서 판정 근거를 확인하세요.':snap.line||'경기 시작'}</div>
    <div className="rt-lineups" aria-label="현재 선수 기록">
     {(['A','B'] as const).map(side=><div key={side}><b style={{color:side==='A'?colA:colB}}>{meta(side==='A'?teamA:teamB).short}</b>
      {[0,1,2,3,4].map(slot=>{const kd=snap.kda[side+slot],tr=rd.tracks.find(x=>x.side===side&&x.slot===slot)!;const state=posAt(tr,tDisplay);return <button key={slot} onClick={()=>onSelectPlayer(pid(side,slot))} className={state.state==='dead'?'fallen':''}>
       <span>{['TOP','JGL','MID','ADC','SUP'][slot]}</span><strong>{champName(champ(side,slot))}<small>{pname(side,slot)}</small></strong><span>{kd.kills}/{kd.deaths}/{kd.assists}<small>{ACT_KO[state.act??'lane']}</small></span>
      </button>;})}</div>)}
    </div>
    <ul className="rt-feed">{snap.feed.slice().reverse().map((f,i)=><li key={i} className={`rt-fd${f.text==='FIRST BLOOD'?' fb':''}`}>
     <span className="rt-fd-t">{f.by||f.ref?`${f.by?`${pn(f.by,names)}(${champName(champ(f.by.side,f.by.slot))})`:''}${f.by&&f.ref?' → ':''}${f.ref?`${pn(f.ref,names)}(${champName(champ(f.ref.side,f.ref.slot))})`:''}`:''}</span>
     <span>{f.text}</span>
    </li>)}</ul>
    {debug&&<div className="rt-diag">
     <b>디버그 · 진단 {rd.diag.length}건</b>
     <ul>{rd.diag.slice(0,12).map((d,i)=><li key={i}>{d}</li>)}</ul>
     <small>흐린 선 = 보행 가능 영역 · 굵은 선 = 선수별 남은 경로 · 아이콘 아래 = 현재 행동</small>
    </div>}
   </div>
  </div>
  <div className="rt-history" aria-label="완료된 경기 사건">{rd.windows.filter(w=>w.end<=tDisplay).map(w=><button key={w.seq} onClick={()=>seek(w.start)}>{mm(w.engineClock)} · {w.label}</button>)}</div>
  <div className="rt-controls">
   <button onClick={toggle} aria-label={playing?'일시정지':'재생'}>{playing?<Pause size={15}/>:<Play size={15}/>}</button>
   <button onClick={()=>setSpd(speed===1?2:speed===2?4:1)} className={speed>1?'on':''}>{speed}×</button>
   <button onClick={nextEvent} aria-label="다음 사건"><SkipForward size={15}/></button>
   <input type="range" min={0} max={rd.duration} step={0.1} value={Math.min(tDisplay,rd.duration)}
     onChange={e=>seek(Number(e.target.value))} aria-label="재생 위치"/>
   <span className="rt-time">{mm(snap.gameClock)} <small>게임 · {speed}×</small></span>
   <button onClick={restart} aria-label="처음부터"><RotateCcw size={14}/></button>
   <button onClick={()=>setDebug(d=>!d)} className={debug?'on':''} aria-label="디버그"><Bug size={14}/></button>
   {hidden&&<span className="rt-paused">탭 비활성 — 일시정지됨</span>}
  </div>
 </div>;
}
function pn(r:{side:'A'|'B',slot:number},names:{a:string[],b:string[]}){return (r.side==='A'?names.a:names.b)[r.slot]||'?';}
