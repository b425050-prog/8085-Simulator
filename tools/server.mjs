import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.ico':'image/x-icon','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.asm':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
export function createStaticServer(root=ROOT){return http.createServer(async(req,res)=>{try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.includes('\0'))throw new Error('Invalid URL');
  let target=path.resolve(root,'.'+pathname),relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end('Forbidden');return;}
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  const actual=await realpath(target);relative=path.relative(root,actual);if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end('Forbidden');return;}
  const data=await readFile(actual),headers={'Content-Type':MIME[path.extname(actual).toLowerCase()]||'application/octet-stream','Content-Length':data.length,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"};
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start,end;if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,data.length-Number(match[2]));end=match[1]&&match[2]?Math.min(data.length-1,Number(match[2])):data.length-1;}if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return;}headers['Content-Range']=`bytes ${start}-${end}/${data.length}`;headers['Content-Length']=end-start+1;res.writeHead(206,headers);res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));}else{res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:data);}
  }catch(error){res.writeHead(error.code==='ENOENT'||error.code==='ENOTDIR'?404:400,{'Content-Type':'text/plain'});res.end(error.code==='ENOENT'?'File not found':'Unable to serve that request');}
});}
async function main(){let port=Number(process.env.PORT||8085);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1–65535');const server=createStaticServer();for(let n=0;n<20;n++){try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});break;}catch(e){if(e.code!=='EADDRINUSE'||n===19)throw e;port++;}}
  const url=`http://127.0.0.1:${port}`;process.stdout.write(`\n8085 Bench — local microprocessor laboratory\n\n  Local: ${url}\n  Files: ${ROOT}\n\nKeep this window open. Press Ctrl+C to stop the server.\n`);
  if(process.argv.includes('--open')){const command=process.platform==='win32'?['cmd.exe',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];spawn(command[0],command[1],{stdio:'ignore',detached:true,windowsHide:true}).on('error',()=>{}).unref();}
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
