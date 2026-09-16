import {getStore} from '@/db/store';
import {applyCommand,newGame,upgradeGame,type Game,type Command} from '@/lib/game';
export const dynamic='force-dynamic';
type Row={owner:string,slot:number,revision:number,state:string,receipts:string,updated_at:string,backups:string};
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const owner=(r:Request)=>r.headers.get('oai-authenticated-user-id');
const validSlot=(n:number)=>Number.isInteger(n)&&n>=1&&n<=3;
type Backup={revision:number,state:string,updatedAt:string};
const points=(list:Backup[])=>list.map(x=>({revision:x.revision,updatedAt:x.updatedAt}));
const present=(row:Row)=>({game:upgradeGame(JSON.parse(row.state)),revision:row.revision,updatedAt:row.updated_at,restorePoints:points(JSON.parse(row.backups??'[]'))});
export async function GET(request:Request){const id=owner(request);if(!id)return response({error:'같은 ChatGPT 계정으로 로그인하면 저장된 커리어를 불러올 수 있습니다.',auth:true},401);try{const slot=Number(new URL(request.url).searchParams.get('slot')??1);if(!validSlot(slot))return response({error:'저장 슬롯을 확인해 주세요.'},400);const db=getStore();const row=await db.prepare('SELECT * FROM careers WHERE owner=? AND slot=?').bind(id,slot).first<Row>();return response(row?present(row):{game:null,revision:0});}catch{console.error('career_load_failed');return response({error:'저장 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}}
export async function POST(request:Request){const id=owner(request);if(!id)return response({error:'로그인이 필요합니다.',auth:true},401);if(request.headers.get('sec-fetch-site')==='cross-site'||!request.headers.get('content-type')?.includes('application/json'))return response({error:'올바르지 않은 요청입니다.'},403);
 // F24: 일반 명령은 10000바이트로 충분하지만 세이브 가져오기(importSave)는 전체 커리어 JSON을
 // 싣는다 — 실측(4시즌 진행 커리어) 약 268KB, 여유를 두고 1.2MB로 상한을 둔다(무제한이 아님, 인증된
 // 사용자만 도달 가능한 엔드포인트라 DoS 위험은 낮게 판단).
 try{const raw=await request.text();if(raw.length>1200000)return response({error:'요청이 너무 큽니다.'},413);let body;try{body=JSON.parse(raw);}catch{return response({error:'요청 형식을 확인해 주세요.'},400);}const {slot=1,revision,commandId,command}=body as {slot:number,revision:number,commandId:string,command:Command};if(!validSlot(slot)||typeof commandId!=='string'||commandId.length>80||!commandId||!command||typeof command.type!=='string')return response({error:'요청을 확인해 주세요.'},400);
 if(command.type!=='importSave'&&raw.length>10000)return response({error:'요청이 너무 큽니다.'},413);
 const db=getStore(),row=await db.prepare('SELECT * FROM careers WHERE owner=? AND slot=?').bind(id,slot).first<Row>();const fingerprint=JSON.stringify(command);const now=new Date().toISOString();if(!row){if(command.type!=='create')return response({error:'먼저 새 커리어를 시작해 주세요.'},404);let game;try{game=upgradeGame(newGame(String(command.payload?.teamId),crypto.getRandomValues(new Uint32Array(1))[0]));}catch(e){return response({error:(e as Error).message},422);}const r=await db.prepare('INSERT OR IGNORE INTO careers (owner,slot,revision,state,receipts,updated_at) VALUES (?,?,1,?,?,?)').bind(id,slot,JSON.stringify(game),JSON.stringify([{id:commandId,fingerprint}]),now).run();if(!r.meta.changes)return response({error:'다른 기기에서 커리어를 만들었습니다. 새로 불러와 주세요.',conflict:true},409);return response({game,revision:1,updatedAt:now});}
 const receipts:{id:string,fingerprint:string}[]=JSON.parse(row.receipts);const old=receipts.find(x=>x.id===commandId);if(old){if(old.fingerprint!==fingerprint)return response({error:'중복 요청 내용이 다릅니다.'},409);return response(present(row));}
 if(row.revision!==revision)return response({error:'다른 기기에서 진행한 기록이 있습니다. 최신 기록을 불러왔습니다.',conflict:true,...present(row)},409);
 let game:Game;try{if(command.type==='restoreBackup'){const backup=(JSON.parse(row.backups??'[]') as Backup[]).find(x=>x.revision===command.payload?.revision);if(!backup)throw Error('복원 지점이 만료되었습니다. 최신 기록을 불러와 주세요.');game=upgradeGame(JSON.parse(backup.state));}else game=applyCommand(JSON.parse(row.state),command);}catch(e){return response({error:(e as Error).message},422);}
 const next=[{id:commandId,fingerprint},...receipts].slice(0,40);const backups:Backup[]=[{revision:row.revision,state:row.state,updatedAt:row.updated_at},...JSON.parse(row.backups??'[]')].slice(0,3);const result=await db.prepare('UPDATE careers SET state=?,revision=revision+1,receipts=?,updated_at=?,backups=? WHERE owner=? AND slot=? AND revision=?').bind(JSON.stringify(game),JSON.stringify(next),now,JSON.stringify(backups),id,slot,revision).run();if(!result.meta.changes)return response({error:'진행 기록이 변경되었습니다. 다시 불러와 주세요.',conflict:true},409);return response({game,revision:revision+1,updatedAt:now,restorePoints:points(backups)});
 }catch{console.error('career_save_failed');return response({error:'진행 기록을 저장하지 못했습니다. 같은 작업을 다시 시도해 주세요.'},503);}}
// 슬롯 초기화: 현재 슬롯의 커리어·복원 지점을 완전히 삭제한다(되돌릴 수 없음, 내보내기와 다름).
// 되돌릴 여지가 있는 다른 변경(가져오기 등)은 기존 POST 명령·revision 경로를 그대로 쓰지만, 이건
// 그 행 자체를 지우는 것이라 revision 개념이 없다 — 별도 DELETE 메서드로 분리해 실수로 일반 명령
// 재시도(commandId 영수증) 경로를 타지 않게 한다.
export async function DELETE(request:Request){const id=owner(request);if(!id)return response({error:'로그인이 필요합니다.',auth:true},401);
 try{const slot=Number(new URL(request.url).searchParams.get('slot')??1);if(!validSlot(slot))return response({error:'저장 슬롯을 확인해 주세요.'},400);
 const db=getStore();await db.prepare('DELETE FROM careers WHERE owner=? AND slot=?').bind(id,slot).run();
 return response({ok:true});
 }catch{console.error('career_delete_failed');return response({error:'커리어를 초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}}
