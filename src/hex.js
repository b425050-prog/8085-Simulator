import { hex } from './isa.js';
function record(address,type,data){const bytes=[data.length,address>>8,address&255,type,...data];bytes.push(-bytes.reduce((a,b)=>a+b,0)&255);return ':'+bytes.map(v=>hex(v)).join('');}
export function exportHex(memory,written=null,start=0x2000,end=0xFFFF){const lines=[];for(let a=start;a<=end;){if(written&&!written[a]){a++;continue;}const base=a,data=[];while(a<=end&&data.length<16&&(!written||written[a]))data.push(memory[a++]);lines.push(record(base,0,data));}lines.push(record(0,1,[]));return lines.join('\r\n')+'\r\n';}
export function importHex(text,{protectROM=true}={}){const memory=new Uint8Array(65536),written=new Uint8Array(65536);let upper=0,eof=false,entry=null;const lines=text.trim().split(/\r?\n/);
  for(let i=0;i<lines.length;i++){const line=lines[i].trim();if(!line)continue;const fail=m=>{throw new Error(`HEX line ${i+1}: ${m}`);};if(eof)fail('data after EOF');if(!/^:(?:[0-9A-Fa-f]{2})+$/.test(line))fail('invalid record');const b=line.slice(1).match(/../g).map(v=>parseInt(v,16));if(b.length!==b[0]+5)fail('wrong length');if((b.reduce((a,v)=>a+v,0)&255)!==0)fail('checksum mismatch');const n=b[0],a=(b[1]<<8|b[2]),type=b[3],data=b.slice(4,-1);
    if(type===0){for(let j=0;j<n;j++){const address=upper+a+j;if(address>65535)fail('address outside 64 KB');if(protectROM&&address<0x2000)fail('address in monitor ROM');if(written[address])fail('overlapping data');memory[address]=data[j];written[address]=1;if(entry===null)entry=address;}}
    else if(type===1){if(n!==0||a!==0)fail('malformed EOF');eof=true;}
    else if(type===2||type===4){if(n!==2||a!==0)fail('malformed address record');upper=(data[0]<<8|data[1])*(type===2?16:65536);}
    else if(type===3||type===5){if(n!==4||a!==0)fail('malformed start record');const start=type===3?(data[0]<<8|data[1])*16+(data[2]<<8|data[3]):data.reduce((v,x)=>v*256+x,0);if(start>65535)fail('entry outside 64 KB');entry=start;}
    else fail('unsupported record type '+type);
  }if(!eof)throw new Error('HEX: missing EOF');return {memory,written,entry:entry??0x2000};
}
