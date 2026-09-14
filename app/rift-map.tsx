import {MAP,WALK} from '@/lib/simulation/replay';

// The visible terrain and traversable corridors share coordinates. No decorative walls
// are placed over a path that the replay can actually use.
export function RiftTerrain(){
 const lanes=MAP.edges.slice(0,12), jungle=MAP.edges.slice(12);
 const lines=(edges:[string,string][],width:number,color:string)=>edges.map(([a,b],i)=><path key={i} d={`M${MAP.nodes[a].join(' ')} L${MAP.nodes[b].join(' ')}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round"/>);
 return <g aria-label="협곡 지형">
  <defs>
   <linearGradient id="rift-earth" x2="1" y2="1"><stop stopColor="#253b2c"/><stop offset="1" stopColor="#101f20"/></linearGradient>
   <radialGradient id="rift-water"><stop stopColor="#23898b"/><stop offset="1" stopColor="#174a57"/></radialGradient>
   <pattern id="rift-forest" width="7" height="8" patternUnits="userSpaceOnUse"><rect width="7" height="8" fill="#172e25"/><path d="M1 6L3 1L5 6Z" fill="#244533"/><path d="M4 8L6 4L7 8Z" fill="#10271f"/></pattern>
  </defs>
  <rect x="1" y="1" width="98" height="98" rx="9" fill="url(#rift-earth)" stroke="#6d7862" strokeWidth=".8"/>
  <rect x="5" y="5" width="90" height="90" rx="13" fill="url(#rift-forest)"/>
  <path d="M9 30 Q26 29 37 37 T50 50 T63 63 Q71 77 91 73" fill="none" stroke="#41675e" strokeWidth="13"/>
  <path d="M9 30 Q26 29 37 37 T50 50 T63 63 Q71 77 91 73" fill="none" stroke="url(#rift-water)" strokeWidth="9"/>
  {lines(jungle,3.2,'#394d37')}{lines(jungle,1.9,'#738360')}
  {lines(lanes,8,'#465543')}{lines(lanes,5.6,'#a1a17a')}
  {WALK.edges.filter(([a,b])=>a.endsWith('C')||b.endsWith('C')).map(([a,b],i)=><path key={`camp${i}`} d={`M${WALK.nodes[a].join(' ')}L${WALK.nodes[b].join(' ')}`} stroke="#7f8860" strokeWidth="2.2"/>)}
  {(['A','B'] as const).map((s)=><g key={s}>
   <circle cx={MAP.nodes[s+'_base'][0]} cy={MAP.nodes[s+'_base'][1]} r="9" fill={s==='A'?'#315c69':'#644b54'} stroke="#8b9580" strokeWidth="1"/>
   <circle cx={MAP.nodes[s+'_base'][0]} cy={MAP.nodes[s+'_base'][1]} r="6.3" fill="none" stroke="#a9bab0" strokeOpacity=".35"/>
  </g>)}
  {['baron','dragon'].map(n=><circle key={n} cx={MAP.nodes[n][0]} cy={MAP.nodes[n][1]} r="4.5" fill="#112d32" stroke="#738573" strokeWidth="1.2"/>)}
  <text x="8" y="44" fill="#d7d9b5" fontSize="2.3" transform="rotate(-90 8 44)">TOP</text>
  <text x="53" y="94" fill="#d7d9b5" fontSize="2.3">BOTTOM</text>
 </g>;
}
