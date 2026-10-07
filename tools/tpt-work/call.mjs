// 兼容历史任务；新任务用 tools/ui-operations/call.mjs。
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {main} from '../ui-operations/call.mjs';export * from '../ui-operations/call.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(JSON.stringify({error:{type:e.name,message:e.message}}));process.exitCode=1;});
