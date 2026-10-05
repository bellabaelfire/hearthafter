import {spawnSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import path from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const cli=path.join(root,"node_modules/@opennextjs/cloudflare/dist/cli/index.js");
const helper=pathToFileURL(path.join(root,"scripts/windows-build-junctions.mjs")).href;
const result=spawnSync(process.execPath,["--import",helper,cli,"build",...process.argv.slice(2)],{cwd:root,env:process.env,stdio:"inherit"});
if(result.error)throw result.error;
process.exit(result.status??1);
