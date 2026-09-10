// Read-only setup check. Does not install, migrate, modify or deploy anything.
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
let failed=false;
function check(label,ok,info=''){console.log(`${ok?'OK':'CHECK'} ${label}${info?' — '+info:''}`);if(!ok)failed=true;}
const [major,minor]=process.versions.node.split('.').map(Number);
check('Node.js 22.13+',major>22||(major===22&&minor>=13),process.versions.node);
for(const f of ['CLAUDE.md','docs/claude/HANDOFF.md','docs/claude/DESIGN_GUIDE.md','docs/claude/DEVELOPMENT_GUIDE.md','.claude/commands/protocol-resume.md','lib/champions.ts','lib/rosters.ts','wrangler.local.jsonc'])check(f,existsSync(path.join(root,f)));
for(const name of ['dev','build'])check(`npm run ${name}`,!!pkg.scripts[name]);
console.log(existsSync(path.join(root,'node_modules/typescript/bin/tsc'))?'INFO dependencies present; run relevant validation':'INFO dependencies absent; install with npm ci before UI/build work');
console.log('INFO Claude install/login, browser play and local database state are not checked by this script.');
process.exitCode=failed?1:0;
