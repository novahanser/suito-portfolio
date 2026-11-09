import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

async function walk(folder){
  const result=[];
  for(const entry of await fs.readdir(folder,{withFileTypes:true})){
    const p=path.join(folder,entry.name);
    if(entry.isSymbolicLink())throw new Error('Symlinks are not part of this static site');
    if(entry.isDirectory())result.push(...await walk(p));else result.push(p);
  }
  return result;
}
export async function validate(folder){
  const root=path.resolve(folder),files=await walk(root);
  let bytes=0,links=0;
  for(const file of files){
    const stat=await fs.stat(file);bytes+=stat.size;
    if(stat.size>=100*1024*1024)throw new Error('File exceeds the repository size limit: '+path.relative(root,file));
    if(!/\.(html|css|mjs|js|json|txt|svg|xml)$/.test(file))continue;
    const text=await fs.readFile(file,'utf8');
    if(/(?:[A-Z]:[\\/](?:Users|download)|file:\/\/|127\.0\.0\.1|localhost:)/.test(text))throw new Error('Local-only path in public file: '+path.relative(root,file));
    let refs=[];
    if(file.endsWith('.html')){
      refs.push(...[...text.matchAll(/\b(?:src|href|poster|data-preview-src)=["']([^"']+)["']/g)].map(m=>m[1]));
      for(const match of text.matchAll(/\bsrcset=["']([^"']+)["']/g))refs.push(...match[1].split(',').map(s=>s.trim().split(/\s+/)[0]));
      const ids=[...text.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
      if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML ID: '+file);
      for(const match of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(match[2].trim()&&!match[1].includes('module'))new vm.Script(match[2]);
      for(const href of refs.filter(r=>r.startsWith('#')&&r.length>1))if(!ids.includes(href.slice(1)))throw new Error('Missing anchor: '+href);
    }
    if(file.endsWith('.css'))refs.push(...[...text.matchAll(/url\(\s*["']?([^"'\s)]+)/g)].map(m=>m[1]));
    if(/\.(mjs|js)$/.test(file))refs.push(...[...text.replace(/^\s*\/\/.*$/gm,'').matchAll(/["']((?:\.\/|\.\.\/)[^"']+\.(?:mjs|js|svg|webp|png|jpg|woff2))["']/g)].map(m=>m[1]));
    for(const ref of refs){
      if(/^(?:#|https?:|data:|mailto:)/.test(ref))continue;
      const resolved=path.resolve(path.dirname(file),decodeURIComponent(ref.split(/[?#]/)[0]));
      if(!resolved.startsWith(root+path.sep)&&resolved!==root)throw new Error('Reference escapes site: '+ref);
      await fs.access(resolved).catch(()=>{throw new Error(path.relative(root,file)+' references missing '+ref);});links++;
    }
  }
  const index=await fs.readFile(path.join(root,'index.html'),'utf8');
  if(/Design directions|Compare directions|href="\.\.\/index\.html"/.test(index))throw new Error('Prototype navigation is not part of the published homepage');
  for(const expected of ['og:image','og:url','canonical','twitter:card'])if(!index.includes(expected))throw new Error('Missing share metadata: '+expected);
  if(!/property="og:image" content="https:\/\//.test(index))throw new Error('Share image must use the public HTTPS URL');
  console.log(JSON.stringify({status:'pass',files:files.length,localReferences:links,bytes}));
  return {files:files.length,links,bytes};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await validate(process.argv[2]||'site');
