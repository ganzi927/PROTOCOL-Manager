import type {Track} from './replay.ts';
import type {CompStyle} from '../balance/composition.ts';

// Presentation offsets only: no combat range, damage, route or outcome is inferred here.
// Team A faces northeast; B faces southwest. Frontline, carry and support are readable.
export function formationOffset(track:Track,t:number,style:CompStyle):[number,number]{
 const depth=style==='engage'?[1,1.3,3.2,4.4,2.4]:style==='protect'?[1.4,2,3.8,4.3,4]:[1.4,2.2,4.2,4.6,3.2];
 const lateral=[-3.5,3.5,-2,1.8,style==='protect'?3.8:0];
 const sign=track.side==='A'?-1:1,d=depth[track.slot],l=lateral[track.slot];
 const offset:[number,number]=[(sign*d+l)*Math.SQRT1_2,(-sign*d+l)*Math.SQRT1_2];
 const active=(state:Track['key'][number]['state'])=>state==='fight'||state==='dead';
 let i=0;while(i+1<track.key.length&&track.key[i+1].t<=t)i++;
 const on=active(track.key[i].state);let start=i;
 while(start>0&&active(track.key[start-1].state)===on)start--;
 const prior=start>0&&active(track.key[start-1].state);
 const u=Math.max(0,Math.min(1,(t-track.key[start].t)/0.45)),smooth=u*u*(3-2*u);
 const weight=(prior?1:0)+((on?1:0)-(prior?1:0))*smooth;
 return weight===0?[0,0]:[offset[0]*weight,offset[1]*weight];
}

export function playbackDestination(time:number,duration:number,wasEnded=false){
 const at=Math.max(0,Math.min(duration,Number.isFinite(time)?time:0));
 const ended=at>=duration;
 return {time:at,ended,notifyEnd:ended&&!wasEnded};
}
