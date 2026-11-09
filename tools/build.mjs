import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate} from './validate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'site'), output=path.join(root,'dist');
await validate(source);
// This is always the generated sibling of site, never a caller-supplied directory.
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw new Error('Invalid output directory');
await fs.rm(output,{recursive:true,force:true});
await fs.cp(source,output,{recursive:true});
console.log('Static website ready in dist/.');
