import {compositionPlan} from '@/lib/balance/composition';
import {observedTeamStats} from '@/lib/balance/observed';
import {champName} from '@/lib/game';
import type {Game} from '@/lib/game';
export function CompositionPanel({mine,enemy,label='우리 팀',g}:{mine:string[],enemy:string[],label?:string,g?:Game}){
 const p=compositionPlan(mine),q=compositionPlan(enemy);
 const observed=g?observedTeamStats(g,mine):[];
 return <section className="composition-panel" aria-label="조합 분석">
  <div><small>{label} · {mine.length}/5 픽</small><h3>{mine.length?p.label:'승리 계획을 만들어 보세요'}</h3><p>{p.goal}</p></div>
  <p className="comp-risk">주의 · {p.risk}</p>
  {enemy.length>0&&<p>상대 {q.label} · {q.goal}</p>}
  <div className="comp-traits">{Object.entries(p.scores).map(([k,v])=><span key={k}>{({poke:'견제',engage:'진입',protect:'보호',scale:'성장',pick:'픽'} as Record<string,string>)[k]} <b>{v.toFixed(1)}</b></span>)}</div>
  <small>{p.complete?'조합 확정':'픽 진행 중 · 남은 선택에 따라 계획이 달라집니다'} · 모델 조합 전망(게임 설계 지표, 실측 승률 아님)</small>
  {observed.length>0&&<div className="comp-observed"><small>관측 승률(이 리그 실제 경기 기록)</small><div className="comp-traits">{observed.map(o=><span key={o.role}>{champName(o.champId)} {o.winRate!==null?<b>{Math.round(o.winRate*100)}%</b>:<em>표본 부족</em>}<i> ({o.sampleSize}전)</i></span>)}</div></div>}
 </section>;
}
