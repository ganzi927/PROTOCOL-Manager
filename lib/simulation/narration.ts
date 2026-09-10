// 구조화 중계 — PROTOCOL 경기 해설 고도화(CAST-01 + 능력/조합/자원 연결).
//
// 설계 원칙(사용자 피드백):
//  1. 교전 전의 준비·긴장을 beats로 차례로 보여준다(웨이브 → 합류 → 시야 → 교전 → 결과).
//  2. 앞선 사건을 기억한다: 재갱킹, 성장한 캐리, 우위를 되돌려주는 장면.
//  3. 모든 순간을 같은 강도로 쓰지 않는다: quiet / build / clash / decisive / close.
//  4. 감독의 선택(전술·조합 효과·집중 라인)은 실제 상태로 확인될 때만 언급한다.
//
// 이 모듈은 순수하다. simulateSet이 사건별로 해결된 컨텍스트를 넘기고, 여기서 텍스트만 만든다.
// 넘겨받은 rng는 승부/골드 난수와 분리된 전용 스트림(narr)이다. 관측되지 않은 킬 수를 지어내지
// 않고, 넘겨받거나 여기서 집계한 kills/lead 상태만 인용한다.

import type {CombatEvent} from './combat.ts'; // 타입 전용 — 참여자 기반 전투 사건

const hasBat=(w:string)=>{const c=w.charCodeAt(w.length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0;};
const eul=(w:string)=>w+(hasBat(w)?'을':'를');
const iga=(w:string)=>w+(hasBat(w)?'이':'가');
const eun=(w:string)=>w+(hasBat(w)?'은':'는');
const gwa=(w:string)=>w+(hasBat(w)?'과':'와');
const euro=(w:string)=>{const c=w.charCodeAt(w.length-1),b=c>=0xAC00&&c<=0xD7A3?(c-0xAC00)%28:0;return w+(b&&b!==8?'으로':'로');}; // ㄹ 받침·무받침 → 로

export type Beat={t:string,label:string,text:string};
export type Tier='quiet'|'build'|'clash'|'decisive'|'close';
export type NarrateResult={detail:string,beats:Beat[],tier:Tier,kills:{a:number,b:number}};

export type NarrMemory={
 sec:number,                         // 경과 시간(초), 단조 증가
 laneKills:[number,number][],        // [A,B] · top/mid/bot
 teamKills:{a:number,b:number},
 fb:{lane:number,byA:boolean,clock:string}|null,
 ganked:Set<number>,                 // 정글 개입이 있었던 라인
 obj:{a:number,b:number},
};
export const newNarrMemory=():NarrMemory=>({sec:0,laneKills:[[0,0],[0,0],[0,0]],teamKills:{a:0,b:0},fb:null,ganked:new Set(),obj:{a:0,b:0}});

export type NarrCtx={
 i:number, wa:boolean, last:boolean,
 aShort:string, bShort:string,
 p:number, advantage:number, advSwing:number,
 leadSlots:number[],                 // A 관점 자원, 슬롯 [TOP,JGL,MID,ADC,SUP]
 de:{lane:number,obj:number,fight:number},
 aChamp:string[], bChamp:string[],   // 챔피언 이름, 역할 순
 aPlayer:string[], bPlayer:string[], // 선수 이름, 역할 순
 userIsA:boolean|null,               // 사용자 팀이 이 경기의 A인가(불참이면 null)
 userTactic:string|null, userFocus:string|null,
 combat?:CombatEvent,                // 참여자 기반 전투 결과(라인 0·1). 있으면 실제 상태로 서술
};

const LANE=['탑','미드','바텀'];
const LANE_SLOT=[0,2,3];             // 라인 → 라이너 슬롯(TOP/MID/ADC)
const DRAG=['바다','화염','바람','대지','마법공학','지옥'];
const FIGHT_PLACE=['미드 지역','바론 둥지','드래곤 협곡','상대 정글'];
const GOLD_FLAVOR=3.4;               // 추상 자원 → 표시용 골드 체감 배수(flavor only)
const kStr=(v:number)=>(Math.abs(v)*GOLD_FLAVOR/1000).toFixed(1)+'k';
const fmt=(sec:number)=>{const s=Math.max(0,Math.round(sec));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
const pick=<T,>(rng:()=>number,arr:T[]):T=>arr[Math.floor(rng()*arr.length)];
const EVENT_MIN=[2.4,5,7.4,11,15,20.5,26.5,32.5,38];

export function narrateEvent(c:NarrCtx,mem:NarrMemory,rng:()=>number):NarrateResult{
 const {i,wa}=c;
 // 이 사건의 절정 시각(초). 단조 증가.
 const climax=Math.max(mem.sec+35,Math.round((EVENT_MIN[i]+rng()*1.6)*60));
 mem.sec=climax;
 const wShort=wa?c.aShort:c.bShort, lShort=wa?c.bShort:c.aShort;
 const wCh=wa?c.aChamp:c.bChamp, lCh=wa?c.bChamp:c.aChamp;
 const wPl=wa?c.aPlayer:c.bPlayer;
 const dom=Math.abs(c.p-0.5);
 const beats:Beat[]=[];
 const at=(back:number,label:string,text:string)=>beats.push({t:fmt(climax-back),label,text});
 let kills={a:0,b:0};

 const done=(detail:string,tier:Tier,note?:string):NarrateResult=>{
  if(note)beats.push({t:fmt(climax+4),label:'해설',text:note});
  return {detail,beats,tier,kills};
 };

 // ================= 라인 단계 (0~2) =================
 if(i<3){
  const li=i, slot=LANE_SLOT[i], laner=LANE[li];
  const wc=wCh[slot], lc=lCh[slot], wp=wPl[slot], wj=wCh[1];

  // 참여자 기반 전투가 있으면(라인 0·1) 실제 상태로 서술한다. 킬·어시스트·생존은 combat에서만 온다.
  if(c.combat){
   const cb=c.combat;
   const nameOf=(r:{side:'A'|'B',slot:number})=>(r.side==='A'?c.aChamp:c.bChamp)[r.slot];
   const ka=cb.kills.filter(k=>k.killer.side==='A').length, kb=cb.kills.filter(k=>k.killer.side==='B').length;
   mem.laneKills[li][0]+=ka; mem.laneKills[li][1]+=kb; mem.teamKills.a+=ka; mem.teamKills.b+=kb;
   kills={a:ka,b:kb};
   if(cb.committed)mem.ganked.add(li);
   at(45,laner, pick(rng,[
    `${iga(wc)} 큰 미니언 웨이브를 상대 포탑으로 밀어 넣습니다. ${eun(lc)} 쉽게 자리를 비울 수 없습니다.`,
    `${iga(wc)} 라인을 당겨 받으며 정글 동선을 살핍니다.`,
   ]));
   if(cb.committed)at(26,'정글 합류', cb.followUp
    ? `앞선 합류에 이어 ${iga(wj)} 이번엔 ${euro(laner)} 방향을 잡습니다. 갱킹을 계속 이어갑니다.`
    : `${iga(wj)} 강가를 돌아 ${laner} 뒤로 접근합니다. 상대가 이 움직임을 봤을까요?`);
   if(cb.kills.length){
    const kr=cb.kills[0], vc=nameOf(kr.victim), asst=kr.assists.map(nameOf).filter(Boolean);
    at(10,'교전', cb.committed
     ? `${iga(wj)} 뒤를 끊고 ${wc}(${wp})${hasBat(wc)?'이':'가'} 마무리합니다.`
     : `${wc}(${wp})${hasBat(wc)?'이':'가'} 정면 교환에서 앞섭니다.`);
    if(cb.firstBlood){
     if(!mem.fb)mem.fb={lane:li,byA:cb.side==='A',clock:fmt(climax)};
     at(0,'FIRST BLOOD', `${iga(vc)} 쓰러집니다! ${wc}${hasBat(wc)?'이':'가'} 이 경기 첫 킬을 가져갑니다.${asst.length?` (${asst.join(', ')} 어시스트)`:''}`);
     return done(`${laner} 첫 킬 · ${wShort} 선취`, 'decisive',
      `킬도 크지만 ${eul(vc)} 포탑 아래 미니언까지 놓치는 게 아픕니다. ${laner} 성장 격차가 ${kStr(c.leadSlots[slot])}까지 벌어지겠습니다.`);
    }
    at(0,'처치', `${eul(vc)} 잡아냅니다.${cb.kills.length>1?' 연속 처치! 바텀이 무너집니다.':''}${asst.length?` ${asst.join(', ')} 어시스트.`:''}`);
    return done(`${laner} ${wShort} 킬 확보`, (dom>0.16||cb.kills.length>1)?'clash':'build');
   }
   if(cb.spotted){
    at(0,'회피', li===2
     ? `${iga((cb.side==='A'?c.bChamp:c.aChamp)[4])} 정글 동선을 콜, 바텀이 안전하게 빠집니다. ${wShort}의 갱킹이 무산됩니다.`
     : `${iga(lc)} 정글 동선을 미리 읽고 빠집니다. ${wShort}의 갱킹이 무산됩니다.`);
    return done(`${laner} 갱킹 무산 · 긴장만 오갑니다`, 'build');
   }
   if(cb.escaped.length){
    if(li===2){
     const lSup=(cb.side==='A'?c.bChamp:c.aChamp)[4], lAdc=(cb.side==='A'?c.bChamp:c.aChamp)[3];
     const supDown=cb.kills.some(k=>k.victim.slot===4);
     at(0,'보호', `${iga(lSup)} ${eul(lAdc)} 지켜냅니다.${supDown?` 대신 ${eul(lSup)} 내주지만`:''} ${lAdc} 생존, ${wShort}는 라인·포탑 이득.`);
     return done(`바텀 ${wShort} 압박 · ${lSup} 보호`, supDown?'clash':'build');
    }
    at(0,'탈출', `${lc}, 탈출기를 쓰며 살아나갑니다. 아슬아슬했지만 ${wShort}가 라인 압박을 가져갑니다.`);
    return done(`${laner} ${wShort} 압박 · ${lc} 탈출`, 'build');
   }
   at(0,'라인', pick(rng,[
    `${iga(wc)} ${eul(lc)} 압박하며 CS와 주도권을 가져갑니다.`,
    `${iga(wc)} 라인을 밀어넣고 정글 시야까지 지웁니다. ${eun(lc)} 성장이 늦어집니다.`,
   ]));
   return done(`${laner}에서 ${wShort}가 주도권을 잡습니다.`, 'quiet');
  }

  const heavy=dom>0.16||c.advSwing>=3;
  const jungle=rng()<(heavy?0.7:0.32);
  const landed=heavy||rng()<0.22;
  const k=landed?((dom>0.3&&rng()<0.4)?2:1):0;
  if(landed){ if(wa)mem.laneKills[li][0]+=k; else mem.laneKills[li][1]+=k; mem.teamKills[wa?'a':'b']+=k; kills=wa?{a:k,b:0}:{a:0,b:k}; }
  const firstKill=landed&&!mem.fb;
  if(firstKill)mem.fb={lane:li,byA:wa,clock:fmt(climax)};
  const reGank=jungle&&mem.ganked.size>=1;   // 정글러가 앞선 갱킹에 이어 다음 라인으로
  if(jungle)mem.ganked.add(li);
  const chase=!firstKill&&landed&&mem.fb!=null&&mem.fb.lane===li&&mem.fb.byA===wa;
  const botNet=mem.laneKills[2][0]-mem.laneKills[2][1];
  const grownBot=i===2&&Math.abs(botNet)>=2&&(botNet>0)===wa&&!landed;

  // 조용한 라인 정리
  if(!jungle&&!landed){
   at(0,'라인', pick(rng,[
    `${iga(wc)} ${eul(lc)} 압박하며 CS와 주도권을 가져갑니다.`,
    `${iga(wc)} 라인을 밀어넣고 정글 시야까지 지웁니다. ${eun(lc)} 성장이 늦어집니다.`,
    `짧은 견제가 오가지만 ${laner}은 큰 사건 없이 정리됩니다.`,
   ]));
   return done(pick(rng,[`${laner} 라인전은 ${wShort}의 판정승.`,`${laner}에서 ${wShort}가 주도권을 잡습니다.`]),'quiet');
  }

  at(45,laner, pick(rng,[
   `${iga(wc)} 큰 미니언 웨이브를 상대 포탑으로 밀어 넣습니다. ${eun(lc)} 쉽게 자리를 비울 수 없습니다.`,
   `${iga(wc)} 라인을 당겨 받으며 정글 동선을 살핍니다.`,
   `${iga(wc)} 부시 시야를 잡고 갱킹 각을 만듭니다.`,
  ]));
  if(jungle)at(26,'정글 합류', reGank
    ? `앞선 갱킹에 이어 ${iga(wj)} 이번엔 ${laner}로 방향을 잡습니다. 갱킹을 계속 이어갑니다.`
    : `${iga(wj)} 강가를 돌아 ${laner} 뒤쪽으로 접근합니다. 상대가 이 움직임을 봤을까요?`);
  if(chase)at(20,'집중 견제', `${euro('앞선 교전')} 점멸이 빠진 ${eul(lc)} ${wShort}가 다시 노립니다.`);
  if(grownBot)at(20,'성장차', `초반 ${Math.abs(botNet)}번의 바텀 공략으로 성장한 ${wc}입니다. 상대는 접근하지 못하면 교전을 이기기 어렵습니다.`);

  if(landed){
   at(8,'교전', jungle
     ? `${iga(wj)} 뒤를 끊고 ${wc}(${wp})${hasBat(wc)?'이':'가'} 딜을 몰아넣습니다.`
     : `${wc}(${wp})${hasBat(wc)?'이':'가'} 스킬 교환에서 앞서며 각을 봅니다.`);
   if(firstKill){
    at(0,'FIRST BLOOD', `${iga(lc)} 쓰러집니다! ${wc}${hasBat(wc)?'이':'가'} 이 경기 첫 킬을 가져갑니다.`);
    return done(`${laner} 첫 킬 · ${wShort} 선취`, 'decisive',
     `킬도 크지만 ${eul(lc)} 포탑 아래 미니언까지 놓치는 게 아픕니다. ${laner} 성장 격차가 ${kStr(c.leadSlots[slot])}까지 벌어지겠습니다.`);
   }
   const net=wa?mem.laneKills[li][0]:mem.laneKills[li][1];
   at(0,'처치', `${eul(lc)} 잡아냅니다. ${wc} ${net}킬${k>1?' — 더블 킬!':''}.`);
   return done(`${laner} ${wShort} 킬 확보`, heavy?'clash':'build');
  }
  // 갱킹 실패 — 킬 없이 긴장만
  at(0,'회피', pick(rng,[
   `${iga(lc)} 시야로 미리 확인하고 빠집니다. ${wShort}의 갱킹이 무위로 돌아갑니다.`,
   `${lc}, 점멸로 벽을 넘어 살아나갑니다. 아슬아슬했습니다.`,
  ]));
  return done(`${laner} 갱킹 무산 · 긴장만 오갑니다`, 'build');
 }

 // ================= 오브젝트 (3~4) =================
 if(i<5&&c.combat&&c.combat.kind==='objective'){
  const cb=c.combat, ob=cb.objective!;
  const objName=ob.kind==='herald'?'전령':`${pick(rng,DRAG)} 드래곤`;
  const nameOf=(r:{side:'A'|'B',slot:number})=>(r.side==='A'?c.aChamp:c.bChamp)[r.slot];
  const ka=cb.kills.filter(k=>k.killer.side==='A').length, kb=cb.kills.filter(k=>k.killer.side==='B').length;
  mem.teamKills.a+=ka; mem.teamKills.b+=kb; kills={a:ka,b:kb};
  if(ob.secured==='A')mem.obj.a++; else if(ob.secured==='B')mem.obj.b++;
  const secShort=ob.secured?wShort:null; // c.wa = 확보 팀(미확보면 edge)

  at(42,`${objName} 대치`, (cb.evidence.some(e=>e.includes('무산됐던'))?'앞선 교전이 무산된 뒤, ':'')
   +`${gwa(c.aShort)} ${iga(c.bShort)} ${objName} 앞에서 시야를 다툽니다. 먼저 도착한 쪽이 주도권을 잡습니다.`);
  const late=(cb.notJoined||[]).filter(n=>n.reason!=='전투 이탈(리스폰 대기)');
  const dead=(cb.notJoined||[]).filter(n=>n.reason==='전투 이탈(리스폰 대기)');
  if(dead.length)at(24,'공백', `${dead.map(n=>nameOf(n.ref)).join(', ')}${dead.length>1?' 등이':'이'} 아직 부활 대기 — 인원이 빕니다.`);
  else if(late.length)at(24,'합류', `${late.slice(0,2).map(n=>`${nameOf(n.ref)}(${n.reason})`).join(', ')} — 제때 합류하지 못합니다.`);
  const objLever=managerLever(c,wa,'obj'); // 감독 결정 — 상태로 확인될 때만
  if(objLever)at(14,'벤치',objLever);

  if(cb.kills.length){
   const kr=cb.kills[0], vc=nameOf(kr.victim), kc=nameOf(kr.killer), asst=kr.assists.map(nameOf).filter(Boolean);
   if(cb.firstBlood){
    if(!mem.fb)mem.fb={lane:ob.kind==='herald'?1:2, byA:kr.killer.side==='A', clock:fmt(climax)};
    at(0,'FIRST BLOOD', `${objName} 앞 난전에서 ${iga(vc)} 먼저 쓰러집니다! ${kc}${hasBat(kc)?'이':'가'} 이 경기 첫 킬.${asst.length?` (${asst.join(', ')} 어시스트)`:''}`);
   }else{
    at(8,'교전', `${objName} 앞 난전 — ${iga(vc)} 끊깁니다.${asst.length?` ${asst.join(', ')} 어시스트.`:''}`);
   }
  }
  if(ob.secured){
   at(0,'확보', ob.outcome==='UPSET_SECURE'
    ? `${secShort}가 교전을 뒤집고 ${eul(objName)} 역확보합니다! 흐름이 넘어갑니다.`
    : ob.outcome==='SECURE_UNCONTESTED'
     ? `상대가 물러난 사이 ${secShort}가 ${eul(objName)} 무혈 확보. 오브젝트 ${mem.obj[ob.secured==='A'?'a':'b']}개째.`
     : `${secShort}가 교전을 이기고 ${eul(objName)} 확보합니다. 오브젝트 ${mem.obj[ob.secured==='A'?'a':'b']}개째.`);
   const gi=biggestGap(c.leadSlots);
   return done(`${secShort} ${objName} 확보`,
    ob.outcome==='UPSET_SECURE'?'decisive':cb.kills.length?'clash':'build',
    gi>=0?`${LANE[[0,0,1,2,2][gi]]} 쪽 성장 격차가 ${kStr(c.leadSlots[gi])}까지 벌어집니다.`:undefined);
  }
  at(0, ob.outcome==='CANCELLED'?'취소':'철수', ob.outcome==='CANCELLED'
   ? `양 팀 모두 인원이 모이지 않아 ${objName} 시도가 무산됩니다. ${eun(objName)} 그대로 남습니다.`
   : `${objName} 앞에서 한 차례 부딪히고 양 팀이 물러납니다. 목표는 아직 살아 있습니다.`);
  return done(`${objName} 미확보 · 양 팀 대치`, cb.kills.length?'clash':'build');
 }
 if(i<5){
  const obj=i===3?'전령':`${pick(rng,DRAG)} 드래곤`;
  if(wa)mem.obj.a++; else mem.obj.b++;
  const pickOff=rng()<0.4;
  const victim=lCh[Math.floor(rng()*5)];
  if(pickOff){mem.teamKills[wa?'a':'b']+=1;kills=wa?{a:1,b:0}:{a:0,b:1};}
  at(40,`${obj} 대치`, `${gwa(c.aShort)} ${iga(c.bShort)} ${obj} 앞에서 시야 싸움을 벌입니다. 한 타이밍이 승부를 가릅니다.`);
  at(12,'교전', pick(rng,[
   `${wCh[Math.floor(rng()*5)]}의 스킬이 적중하며 ${wShort}가 스택을 앞섭니다.`,
   `${wShort}가 진형을 먼저 갖추고 들어갑니다.`,
   `${wShort}가 상대 시야를 지우고 안전하게 진입합니다.`,
  ])+(pickOff?` ${eul(victim)} 끊어내기까지 곁들입니다.`:''));
  const lever=managerLever(c,wa,'obj');
  if(lever)at(6,'벤치', lever);
  at(0,'확보', `${wShort} ${obj} 확보. 오브젝트 ${mem.obj[wa?'a':'b']}개째.`);
  const gi=biggestGap(c.leadSlots);
  const note=gi>=0?`${LANE[[0,0,1,2,2][gi]]} 쪽 성장 격차가 ${kStr(c.leadSlots[gi])}까지 벌어집니다.`:undefined;
  return done(`${wShort} ${obj} 확보`, pickOff?'clash':'build', note);
 }

 // ================= 한타 / 마지막 진격 / 기지 결전 =================
 // 참여자 기반 한타(c.combat.kind==='teamfight')가 있으면 실제 상태로 서술.
 if(c.combat&&c.combat.kind==='teamfight'){
  const cb=c.combat, fr=cb.fight!;
  const nm=(r:{side:'A'|'B',slot:number})=>(r.side==='A'?c.aChamp:c.bChamp)[r.slot];
  const pl=(r:{side:'A'|'B',slot:number})=>(r.side==='A'?c.aPlayer:c.bPlayer)[r.slot];
  const ka=cb.kills.filter(k=>k.killer.side==='A').length, kb=cb.kills.filter(k=>k.killer.side==='B').length;
  mem.teamKills.a+=ka; mem.teamKills.b+=kb; kills={a:ka,b:kb};
  const nA=fr.aliveA, nB=fr.aliveB, even=nA===5&&nB===5;
  const initiator=[...fr.contrib].sort((x,y)=>y.engage-x.engage)[0];
  const protector=fr.contrib.find(x=>x.protect>0);

  // 왜 / 인원
  at(30,'한타', even
   ? pick(rng,[`${pick(rng,FIGHT_PLACE)} 앞에서 양 팀 5인이 진형을 잡습니다.`,`${wShort}가 오브젝트를 압박하며 상대를 끌어냅니다.`])
   : `${pick(rng,FIGHT_PLACE)} 앞 교전 — ${c.aShort} ${nA}인, ${c.bShort} ${nB}인. 인원이 맞지 않습니다.`);
  const late=(cb.notJoined||[]).slice(0,2);
  if(late.length)at(20,'공백', `${late.map(n=>`${nm(n.ref)}(부활 대기)`).join(', ')} — 이번 한타에 빠집니다.`);

  // 진입 / 보호
  if(fr.result!=='NO_ENGAGE'&&fr.result!=='NO_SHOW'&&initiator&&initiator.engage>0)
   at(14,'진입', `${nm(initiator.ref)}(${pl(initiator.ref)})${hasBat(nm(initiator.ref))?'이':'가'} 먼저 들어갑니다.`);
  if(protector)at(11,'보호', `${nm(protector.ref)}의 커버로 ${nm({side:protector.ref.side,slot:3})} 살아남아 딜을 이어갑니다.`);

  // 반전(가장 잘 큰 캐리가 실제로 끊긴 경우)
  const fedS=biggestGap(c.leadSlots);
  const fedRef=fedS>=0?{side:(c.leadSlots[fedS]>0?'A':'B') as 'A'|'B',slot:fedS}:null;
  const fedDied=fedRef&&cb.kills.some(k=>k.victim.side===fedRef.side&&k.victim.slot===fedRef.slot);

  // 처치
  if(cb.kills.length){
   const k0=cb.kills[0], vc=nm(k0.victim), kc=nm(k0.killer), asst=k0.assists.map(nm).filter(Boolean);
   if(cb.firstBlood){
    if(!mem.fb)mem.fb={lane:2,byA:k0.killer.side==='A',clock:fmt(climax-6)};
    at(6,'FIRST BLOOD', `${iga(vc)} 먼저 쓰러집니다! ${kc} 이 경기 첫 킬.${asst.length?` (${asst.join(', ')})`:''}`);
   }
   if(fedDied)at(4,'반전', `가장 잘 큰 ${iga(nm(fedRef!))} 끊깁니다 — 쌓아 온 우위가 흔들립니다.`);
   const rest=cb.kills.slice(cb.firstBlood?1:0);
   if(rest.length)at(2,'연계', `${rest.map(k=>nm(k.victim)).join(', ')}까지 정리됩니다.`);
  }
  const lever=managerLever(c,wa,'fight');
  if(lever)at(3,'벤치', lever);

  // 결과 + 다음 영향
  if(c.last||i===8){
   at(0,'결과', fr.winner
    ? `${wShort}가 ${ka}:${kb} 교전을 잡고 억제기를 밀어 넥서스까지 파괴합니다.`
    : `${ka}:${kb}로 갈린 마지막 대치 끝에 ${wShort}가 기지를 넘습니다.`);
   const key=mem.fb?`${mem.fb.clock} 첫 킬이 흐름을 갈랐습니다.`:'중반 교전 격차가 승부를 갈랐습니다.';
   at(0,'돌아보기', `${key} 최종 킬 스코어 ${mem.teamKills.a} : ${mem.teamKills.b}.`);
   return done(`${wShort} 세트 종료 (${mem.teamKills.a}:${mem.teamKills.b})`, 'close');
  }
  if(fr.result==='NO_ENGAGE'){
   at(0,'해산', `양 팀 대치만 하다 물러납니다. 승패 없이 자원만 흐릅니다.`);
   return done(`${c.aShort}·${c.bShort} 무교전 대치`, 'build');
  }
  if(fr.result==='TRADE'||!fr.winner){
   at(0,'교환', `${ka}:${kb} 킬 교환 뒤 양 팀이 물러납니다. 승패는 없습니다.`);
   return done(`한타 킬 교환 (${ka}:${kb}) · 승패 없음`, 'clash');
  }
  at(0,'결과', `${wShort} ${ka}:${kb} 교전 승리. ${fr.result==='ONE_SIDED'?'무혈로 다음 목표까지 확보합니다.':`살아남은 ${wShort} 인원이 오브젝트·구조물로 이어갑니다.`}`);
  const decisive=fr.result==='DECISIVE'&&(ka-kb>=2||fedDied);
  return done(`${wShort} 한타 승리 (${ka}:${kb})`, decisive?'decisive':'clash',
   fedDied?`${euro(lShort)} 흐름이 넘어갑니다.`:decisive?`${wShort}가 이 교전으로 승기를 잡습니다.`:undefined);
 }

 const wk=2+(dom>0.2?1:0)+(rng()<0.4?1:0);
 const lk=rng()<0.5?1:0;
 kills=wa?{a:wk,b:lk}:{a:lk,b:wk};
 mem.teamKills.a+=kills.a; mem.teamKills.b+=kills.b;

 if(c.last||i===8){
  at(20,'마지막 진격', `${wShort}가 마지막 대치에서 승리하며 억제기를 밀고 넥서스까지 파괴합니다.`);
  const key=mem.fb?`${mem.fb.clock} ${LANE[mem.fb.lane]} 첫 킬이 흐름을 갈랐습니다.`:'중반 오브젝트 싸움이 격차를 만들었습니다.';
  at(0,'돌아보기', `${key} 최종 킬 스코어 ${mem.teamKills.a} : ${mem.teamKills.b}.`);
  return done(`${wShort} 넥서스 파괴 · 세트 종료`, 'close');
 }

 const place=pick(rng,FIGHT_PLACE);
 const engager=wCh[[0,1,4][Math.floor(rng()*3)]];
 const fedSlot=biggestGap(c.leadSlots);
 const fedIsA=fedSlot>=0&&c.leadSlots[fedSlot]>0;
 const fedCaught=fedSlot>=0&&(fedIsA!==wa)&&Math.abs(c.leadSlots[fedSlot])>330;
 const big=c.advSwing>=5||dom>0.24;
 let tier:Tier=big?'decisive':'clash';

 at(30,'한타', pick(rng,[
  `${place} 앞에서 양 팀이 진형을 잡습니다. 서로 먼저 들어가길 꺼립니다.`,
  `${wShort}가 바론 냄새를 풍기며 상대를 끌어냅니다.`,
  `${place}에서 시야 다툼 끝에 교전이 시작됩니다.`,
 ]));
 if(fedCaught){
  const fc=(fedIsA?c.aChamp:c.bChamp)[fedSlot];
  at(14,'반전', `가장 잘 큰 ${iga(fc)} 먼저 끊깁니다! 지금까지 쌓아 온 우위를 크게 돌려주는 장면입니다.`);
  tier='decisive';
 }else{
  at(14,'교전', pick(rng,[
   `${iga(engager)} 이니시를 성공시키고 ${wShort}가 스킬 교환에서 앞섭니다.`,
   `${wShort}가 측면을 열고 후방을 덮칩니다.`,
   `${engager}, 상대 핵심을 물고 늘어집니다.`,
  ]));
 }
 const botLead=(c.leadSlots[3]>0)===wa&&Math.abs(c.leadSlots[3])>180&&(wa?c.de.fight:-c.de.fight)>0.25;
 if(botLead&&!fedCaught)at(8,'보호', `${iga(wCh[4])} ${eul(wCh[3])} 지켜내고, 살아남은 원딜이 계속 딜을 넣습니다.`);
 const lever=managerLever(c,wa,'fight');
 if(lever)at(6,'벤치', lever);
 at(0,'결과', `${wShort} ${wk} : ${lk} 교전 승리! 세트 누적 ${mem.teamKills.a} : ${mem.teamKills.b}.`);
 const note=fedCaught?`${euro(lShort)} 흐름이 넘어갑니다. 한 번의 교전이 우위를 지웁니다.`
   :big?`${wShort}가 이 교전으로 승기를 확실히 잡습니다.`:undefined;
 return done(`${wShort} 한타 승리 (${wk}:${lk})`, tier, note);
}

// 가장 자원 격차가 큰 라이너 슬롯을 반환(임계 미만이면 -1).
function biggestGap(lead:number[]):number{
 let bi=-1,bv=210;
 for(const s of [0,2,3]){if(Math.abs(lead[s])>bv){bv=Math.abs(lead[s]);bi=s;}}
 return bi;
}

// 감독의 선택이 실제 상태로 확인될 때만 문장을 만든다. 좋았다는 이유만으로 칭찬하지 않는다.
function managerLever(c:NarrCtx,wa:boolean,seg:'obj'|'fight'):string|null{
 if(c.userIsA===null)return null;
 const userWon=(c.userIsA===wa);
 const uAdv=c.userIsA?c.advantage:-c.advantage;
 const uDeFight=c.userIsA?c.de.fight:-c.de.fight;
 const botMine=(c.leadSlots[3]>0)===c.userIsA&&Math.abs(c.leadSlots[3])>180;
 if(seg==='fight'&&userWon&&uDeFight>0.7&&botMine)
  return '이번 주 준비한 보호형 조합이 효과를 냅니다. 원딜이 공격할 시간을 충분히 확보하고 있어요.';
 if(seg==='obj'&&!userWon&&c.userTactic==='early'&&uAdv<0)
  return '초반 압박을 준비했지만 여기까지 주도권을 얻지 못했습니다. 시간이 흐를수록 상대 성장형 조합이 편해집니다.';
 if(seg==='fight'&&userWon&&c.userTactic==='late'&&uAdv>=0&&uDeFight>0.25)
  return '후반을 보고 준비한 팀입니다. 시간이 우리 편으로 흐르고 있어요.';
 return null;
}
