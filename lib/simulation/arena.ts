// Shared map coordinates and path lengths for simulation and replay.
export type Side='A'|'B';
export type Vec=[number,number];
export type Slot=0|1|2|3|4;
export type Ref={side:Side,slot:number};
export type EngRegion='base'|'top'|'mid'|'bot'|'river';

// ── 지도(공개 계약): 0~100 좌표계. SVG y는 아래로 증가. A(블루)=좌하, B(레드)=우상. ─────
export const MAP:{size:number,nodes:Record<string,Vec>,edges:[string,string][]}={
 size:100,
 nodes:{
  A_base:[12,88], B_base:[88,12],
  A_top:[12,54], top_mid:[13,13], B_top:[52,11],
  A_mid:[32,66], mid:[50,50], B_mid:[68,34],
  A_bot:[46,89], bot_mid:[87,87], B_bot:[89,46],
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

export const dist=(a:Vec,b:Vec)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

export function dijkstra(adj:Record<string,string[]>,nodes:Record<string,Vec>,from:string,to:string):string[]{
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

export const walkingSpeed=(slot:number)=>[.84,1.06,.88,.82,.92][slot]*2.6;
const travelLengths=new Map<string,number>(); // Immutable WALK: cache geometry only, never match state.
export function travelSeconds(from:string,to:string,slot:number){
 const key=from+'|'+to,known=travelLengths.get(key);if(known!==undefined)return known/walkingSpeed(slot);
 const path=dijkstra(WALK.adj,WALK.nodes,from,to);
 let length=0;for(let i=1;i<path.length;i++)length+=dist(WALK.nodes[path[i-1]],WALK.nodes[path[i]]);
 travelLengths.set(key,length);return length/walkingSpeed(slot);
}
