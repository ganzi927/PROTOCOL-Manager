// 결정적 시드 PRNG + 문자열 해시. game.ts가 소유해 왔지만(random(hash(seed|stream|...)) 아키텍처),
// game.ts를 거치지 않고도 같은 결정적 규칙을 쓰고 싶은 하위 모듈(예: lib/players/temperament.ts)이
// 늘어 별도 파일로 뺐다 — game.ts 순환 의존을 피한다(D021 기술 계약). game.ts는 그대로 재수출해
// 기존 `import {random,hash} from './game.ts'`(테스트 다수 포함)를 깨지 않는다.
export function random(seed:number){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
