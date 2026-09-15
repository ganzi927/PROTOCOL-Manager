import {compositionPlan} from '@/lib/balance/composition';
export function CompositionPanel({mine,enemy,label='우리 팀'}:{mine:string[],enemy:string[],label?:string}){
 const p=compositionPlan(mine),q=compositionPlan(enemy);
 return <section className="composition-panel" aria-label="조합 분석">
  <div><small>{label} · {mine.length}/5 픽</small><h3>{mine.length?p.label:'승리 계획을 만들어 보세요'}</h3><p>{p.goal}</p></div>
  <p className="comp-risk">주의 · {p.risk}</p>
  {enemy.length>0&&<p>상대 {q.label} · {q.goal}</p>}
  <div className="comp-traits">{Object.entries(p.scores).map(([k,v])=><span key={k}>{({poke:'견제',engage:'진입',protect:'보호',scale:'성장',pick:'픽'} as Record<string,string>)[k]} <b>{v.toFixed(1)}</b></span>)}</div>
  <small>{p.complete?'조합 확정':'픽 진행 중 · 남은 선택에 따라 계획이 달라집니다'} · 게임 설계 지표, 실측 승률 아님</small>
 </section>;
}
