'use client';
import {useRef,useEffect,useState,useMemo,useCallback} from 'react';
import {champImageUrl,champName,meta} from '@/lib/game';
import {buildReplay,stateAt,posAt,MAP,type ReplayData} from '@/lib/simulation/replay';
import {Play,Pause,SkipForward,RotateCcw} from 'lucide-react';

type SetLike={events:any[],lineupA:string[],lineupB:string[],draft:{picksA:string[],picksB:string[]}};

// 재생 시각 t에서의 상태를 저압축으로만 리렌더(점수·골드·피드·중계). 위치는 rAF에서 DOM 직접 갱신.
export function ReplayTheater({set,teamA,teamB,mineIsA,names,onSelectPlayer,onEnd,onProgress}:{
 set:SetLike, teamA:string, teamB:string, mineIsA:boolean,
 names:{a:string[],b:string[]}, onSelectPlayer:(id:string)=>void, onEnd?:()=>void, onProgress?:(seq:number)=>void,
}){
 const rd=useMemo<ReplayData>(()=>buildReplay(set),[set]);
 const colA=meta(teamA).color||'#5b9bd5', colB=meta(teamB).color||'#e06666';
 const champ=(side:'A'|'B',slot:number)=>(side==='A'?set.draft.picksA:set.draft.picksB)[slot];
 const pid=(side:'A'|'B',slot:number)=>(side==='A'?set.lineupA:set.lineupB)[slot];
 const pname=(side:'A'|'B',slot:number)=>(side==='A'?names.a:names.b)[slot]||'?';

 const tRef=useRef(0), playingRef=useRef(true), speedRef=useRef(1), lastRef=useRef(0), rafRef=useRef(0);
 const iconRefs=useRef<Record<string,SVGGElement|null>>({});
 const [snap,setSnap]=useState(()=>stateAt(rd,0));
 const [playing,setPlaying]=useState(true);
 const [speed,setSpeed]=useState(1);
 const [hidden,setHidden]=useState(false);
 const [tDisplay,setTDisplay]=useState(0);   // 초 단위, 0.25s마다만 갱신(시크바)
 const lastSnapKey=useRef(''), lastTDisp=useRef(0), lastSeq=useRef(-1);

 const snapKey=useCallback((s:ReturnType<typeof stateAt>)=>
  `${s.seq}|${s.score[0]}:${s.score[1]}|${Math.round(s.gold[0]/50)}:${Math.round(s.gold[1]/50)}|${s.feed.length}|${s.line}`,[]);
 const paint=useCallback((t:number)=>{
  for(const tr of rd.tracks){
   const g=iconRefs.current[tr.side+tr.slot]; if(!g)continue;
   const {pos,state}=posAt(tr,t);
   g.setAttribute('transform',`translate(${pos[0]} ${pos[1]})`);
   g.setAttribute('data-state',state);
  }
  const s=stateAt(rd,t), key=snapKey(s);
  if(key!==lastSnapKey.current){lastSnapKey.current=key;setSnap(s);}
  if(s.seq!==lastSeq.current){lastSeq.current=s.seq;onProgress?.(s.seq);}
  if(Math.abs(t-lastTDisp.current)>=0.25){lastTDisp.current=t;setTDisplay(t);}
 },[rd,snapKey,onProgress]);

 useEffect(()=>{ // rAF 재생 루프
  lastRef.current=performance.now();
  const loop=(now:number)=>{
   const dt=Math.min(0.1,(now-lastRef.current)/1000); lastRef.current=now;
   if(playingRef.current){
    tRef.current+=dt*speedRef.current;
    if(tRef.current>=rd.duration){tRef.current=rd.duration;playingRef.current=false;setPlaying(false);onEnd?.();}
   }
   paint(tRef.current);
   rafRef.current=requestAnimationFrame(loop);
  };
  rafRef.current=requestAnimationFrame(loop);
  return ()=>cancelAnimationFrame(rafRef.current);
 },[rd,paint,onEnd]);

 useEffect(()=>{ // 탭 비활성 시 자동 일시정지(복귀 후 수동 재개)
  const onVis=()=>{ const h=document.hidden; setHidden(h); if(h){playingRef.current=false;setPlaying(false);} };
  document.addEventListener('visibilitychange',onVis);
  return ()=>document.removeEventListener('visibilitychange',onVis);
 },[]);

 const toggle=()=>{const n=!playingRef.current;playingRef.current=n;setPlaying(n);lastRef.current=performance.now();};
 const setSpd=(v:number)=>{speedRef.current=v;setSpeed(v);};
 const seek=(t:number)=>{tRef.current=Math.max(0,Math.min(rd.duration,t));lastSnapKey.current='';paint(tRef.current);};
 const nextEvent=()=>{const w=rd.windows.find(w=>w.start>tRef.current+0.05);seek(w?w.start:rd.duration);};
 const restart=()=>{tRef.current=0;playingRef.current=true;setPlaying(true);lastRef.current=performance.now();lastSnapKey.current='';paint(0);};

 // 지도 경로(통로) — 배경과 이동이 같은 좌표계
 const edgeLines=MAP.edges.map(([x,y],i)=>{const a=MAP.nodes[x],b=MAP.nodes[y];return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="rt-corridor"/>;});
 const dead=snap.dead;
 const mm=(sec:number)=>`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;

 const icon=(side:'A'|'B',slot:number)=>{
  const cid=champ(side,slot), key=side+slot, isDead=!!dead[side+' '+slot];
  const abbr=(champName(cid)||'').slice(0,2);
  return <g key={key} ref={el=>{iconRefs.current[key]=el;}} className={`rt-icon rt-${side}${isDead?' rt-dead':''}`}
    onClick={()=>onSelectPlayer(pid(side,slot))} role="button" tabIndex={0}
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
   <span className="rt-clock">{mm(snap.engineClock)}<small> IN-GAME</small></span>
   <span className="rt-team right"><b>{snap.score[1]}</b>{meta(teamB).short}</span>
   <span className="rt-gold">골드 {(snap.gold[mineIsA?0:1]/1000).toFixed(1)}k <em>vs</em> {(snap.gold[mineIsA?1:0]/1000).toFixed(1)}k</span>
  </div>
  <div className="rt-stage">
   <svg viewBox="0 0 100 100" className="rt-map" preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id="rtclip"><circle cx="0" cy="0" r="3"/></clipPath></defs>
    <rect x="0" y="0" width="100" height="100" className="rt-bg"/>
    <polygon points="0,100 100,100 100,0" className="rt-halfB"/>
    <line x1="0" y1="100" x2="100" y2="0" className="rt-river"/>
    <g className="rt-corridors">{edgeLines}</g>
    <rect x={MAP.nodes.A_base[0]-6} y={MAP.nodes.A_base[1]-6} width="12" height="12" className="rt-base" style={{fill:colA}}/>
    <rect x={MAP.nodes.B_base[0]-6} y={MAP.nodes.B_base[1]-6} width="12" height="12" className="rt-base" style={{fill:colB}}/>
    <circle cx={MAP.nodes.baron[0]} cy={MAP.nodes.baron[1]} r="3.4" className="rt-obj"/><text x={MAP.nodes.baron[0]} y={MAP.nodes.baron[1]-4.5} className="rt-objlabel" textAnchor="middle">전령/바론</text>
    <circle cx={MAP.nodes.dragon[0]} cy={MAP.nodes.dragon[1]} r="3.4" className="rt-obj"/><text x={MAP.nodes.dragon[0]} y={MAP.nodes.dragon[1]+6.5} className="rt-objlabel" textAnchor="middle">드래곤</text>
    {(['A','B'] as const).flatMap(s=>[0,1,2,3,4].map(sl=>icon(s,sl)))}
   </svg>
   <div className="rt-side">
    <div className="rt-nowline">{snap.line||'경기 시작'}</div>
    <ul className="rt-feed">{snap.feed.slice().reverse().map((f,i)=><li key={i} className={`rt-fd${f.text==='FIRST BLOOD'?' fb':''}`}>
     <span className="rt-fd-t">{f.by||f.ref?`${f.by?pn(f.by,names):''}${f.by&&f.ref?' → ':''}${f.ref?pn(f.ref,names):''}`:''}</span>
     <span>{f.text}</span>
    </li>)}</ul>
   </div>
  </div>
  <div className="rt-controls">
   <button onClick={toggle} aria-label={playing?'일시정지':'재생'}>{playing?<Pause size={15}/>:<Play size={15}/>}</button>
   <button onClick={()=>setSpd(speed===1?2:1)} className={speed===2?'on':''}>{speed}×</button>
   <button onClick={nextEvent} aria-label="다음 사건"><SkipForward size={15}/></button>
   <input type="range" min={0} max={rd.duration} step={0.1} value={Math.min(tDisplay,rd.duration)}
     onChange={e=>seek(Number(e.target.value))} aria-label="재생 위치"/>
   <span className="rt-time">{mm(tDisplay)} <small>/ {mm(rd.duration)}</small></span>
   <button onClick={restart} aria-label="처음부터"><RotateCcw size={14}/></button>
   {hidden&&<span className="rt-paused">탭 비활성 — 일시정지됨</span>}
  </div>
 </div>;
}
function pn(r:{side:'A'|'B',slot:number},names:{a:string[],b:string[]}){return (r.side==='A'?names.a:names.b)[r.slot]||'?';}
