import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 8858);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.mp4':'video/mp4'};

const server = http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const urlPath = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const requested = path.resolve(root, '.' + urlPath.replaceAll('/', path.sep));
    if (requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403);res.end('Forbidden');return; }
    const info = await fs.stat(requested);
    const file = info.isDirectory() ? path.join(requested,'index.html') : requested;
    const {size} = info.isDirectory() ? await fs.stat(file) : info;
    let start = 0, end = size - 1, status = 200;
    const headers = {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    // Stream byte ranges so native video can seek without buffering the whole file.
    if (req.headers.range && req.method === 'GET') {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0,size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]),size - 1) : size - 1;
      } else start = size;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
        res.writeHead(416, {...headers,'Content-Range':`bytes */${size}`}); res.end(); return;
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = size ? end - start + 1 : 0;
    res.writeHead(status,headers);
    if (req.method === 'HEAD' || !size) {res.end();return;}
    const stream = createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 400;
    res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});
    res.end(status === 404 ? 'Not found' : 'Invalid request');
  }
});
server.listen(port,'127.0.0.1',() => console.log(`Suito release preview: http://127.0.0.1:${port}/`));
