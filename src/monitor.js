import {hex,disassemble} from './isa.js';
import {parseTrainerInstruction,formatTrainerInstruction} from './trainer-syntax.js';
export {trainerInstruction} from './trainer-syntax.js';
const fitted=s=>String(s).slice(0,20).padEnd(20,' ');
export class TrainerMonitor {
  constructor(lab){this.lab=lab;this.history=[];this.historySerial=0;this.entries=new Map();this.running=false;this.power=false;this.reset(false);}
  record(input,output,address=null){this.history.push({index:++this.historySerial,input,output,address,time:this.lab.time});this.history=this.history.slice(-2000);}
  reset(record=true){this.running=false;this.state='welcome';this.buffer='';this.error='';this.syntaxRejected=false;this.address=0x2000;this.startAddress=0x2000;this.endAddress=0xFFFF;this.register='A';this.lab.cpu.fault=null;if(record)this.record('RESET','8085 LCD TRAINER / M85-0X');}
  get lines(){if(!this.lab.powered)return ['                    ','                    '];if(this.syntaxRejected)return [fitted(hex(this.address,4)+' '+this.buffer),fitted('SYNTAX ERR  RESET')];if(this.error)return [fitted(this.error),fitted(this.prompt())];const cpu=this.lab.cpu;
    if(this.state==='welcome')return [fitted('8085 LCD TRAINER'),fitted('M85-0X   '+this.buffer)];
    if(this.state==='asmMenu')return [fitted('A=ASSEMBLE MODE'),fitted('C=DISASSEMBLE MODE')];
    if(this.state==='asmAddress')return [fitted('RAM ADR: '+this.buffer+'_'),fitted('')];
    if(this.state==='assemble')return [fitted(hex(this.address,4)+' '+this.buffer+'_'),fitted('')];
    if(this.state==='disStart')return [fitted('START ADR: '+this.buffer+'_'),fitted('')];
    if(this.state==='disEnd')return [fitted('END ADR: '+this.buffer+'_'),fitted('START '+hex(this.startAddress,4))];
    if(this.state==='disassemble'){const d=disassemble(a=>this.lab.peek(a),this.address);return [fitted(hex(this.address,4)+' '+formatTrainerInstruction(d)),fitted('ENTER NEXT  . EXIT')];}
    if(this.state==='memAddress')return [fitted('MEMORY ADR: '+this.buffer+'_'),fitted('')];
    if(this.state==='memory')return [fitted(hex(this.address,4)+' '+hex(this.lab.peek(this.address))+' : '+this.buffer+'_'),fitted('ENTER NEXT  . EXIT')];
    if(this.state==='goAddress')return [fitted('GO ADR: '+this.buffer+'_'),fitted('PRESS . TO EXECUTE')];
    if(this.state==='running')return [fitted('EXECUTING '+hex(this.startAddress,4)),fitted('RESET TO MONITOR')];
    if(this.state==='ended')return [fitted(this.endReason||'PROGRAM ENDED'),fitted('PC='+hex(cpu.pc,4)+' R=REGS .MENU')];
    if(this.state==='regName')return [fitted('REGISTER ? '+this.buffer+'_'),fitted('A B C D E H L F SP')];
    if(this.state==='register')return [fitted(this.register+'='+hex(this.regValue(),this.register.length>1?4:2)+' '+this.buffer+'_'),fitted('ENTER SET  . EXIT')];
    if(this.state==='stepAddress')return [fitted('STEP ADR: '+this.buffer+'_'),fitted('')];
    if(this.state==='step'){const d=disassemble(a=>this.lab.peek(a),cpu.pc);return [fitted(hex(cpu.pc,4)+' '+formatTrainerInstruction(d)),fitted('ENTER STEP  . EXIT')];}
    if(this.state==='inPort'||this.state==='outPort')return [fitted((this.state==='inPort'?'IN PORT: ':'OUT PORT DATA: ')+this.buffer+'_'),fitted('HEX  ENTER TO APPLY')];
    if(this.state==='fill'||this.state==='block')return [fitted(this.state==='fill'?'FILL START END BYTE':'MOVE START END DEST'),fitted(this.buffer+'_')];
    return [fitted('CMD: '+this.buffer+'_'),fitted('1 ASM M MEM G GO R')];
  }
  prompt(){return this.state==='assemble'?hex(this.address,4)+' '+this.buffer+'_':this.buffer+'_';}
  regValue(){const cpu=this.lab.cpu,r=this.register;return r==='F'?cpu.flags:r==='PSW'?cpu.r.A<<8|cpu.flags:r==='SP'?cpu.sp:r==='PC'?cpu.pc:r==='BC'?cpu.pair(0):r==='DE'?cpu.pair(1):r==='HL'?cpu.pair(2):cpu.r[r];}
  setReg(v){const cpu=this.lab.cpu,r=this.register;if(r==='F')cpu.flags=v;else if(r==='PSW'){cpu.r.A=v>>8&255;cpu.flags=v;}else if(r==='PC')cpu.pc=v;else if(r==='SP')cpu.sp=v;else if(r==='BC')cpu.setPair(0,v);else if(r==='DE')cpu.setPair(1,v);else if(r==='HL')cpu.setPair(2,v);else cpu.r[r]=v&255;}
  addr(s,min=0,max=65535){if(!/^[\dA-F]{1,4}$/.test(s))throw new Error('ADDRESS ERROR');const v=parseInt(s,16);if(v<min||v>max)throw new Error(min===0x2000?'ROM PROTECTED':'ADDRESS ERROR');return v;}
  menu(key){this.buffer='';if(key==='1')this.state='asmMenu';else if(key==='A')this.state='asmAddress';else if(key==='C')this.state='disStart';else if(key==='M'||key==='D')this.state='memAddress';else if(key==='G')this.state='goAddress';else if(key==='R')this.state='regName';else if(key==='T'||key==='S')this.state='stepAddress';else if(key==='I')this.state='inPort';else if(key==='O')this.state='outPort';else if(key==='F')this.state='fill';else if(key==='B')this.state='block';else if(key==='?'||key==='H'){this.record('?','1 ASSEMBLER, M MEMORY, G GO, R REGISTERS, T STEP, I/ O PORTS, F FILL, B MOVE');}else if(key!=='.'&&key!=='Escape')throw new Error('COMMAND ERROR');this.record(key,this.lines.map(s=>s.trimEnd()).join(' / '));}
  key(key){if(!this.lab.powered)throw new Error('Switch the trainer power ON');if(!this.lab.keyboardConnected)throw new Error('Connect the PS/2 keyboard cable to CN7');if(key==='Escape'){this.reset();return;}if(key==='Backspace'||key==='Delete'||this.syntaxRejected)return;
    if(this.state==='running'){if(key==='.')this.stop('PROGRAM STOPPED');return;}
    if(this.error){this.error='';if(key==='Enter')return;}
    try{if(['welcome','command','ended'].includes(this.state)){if(key==='.'||key==='Enter'){this.state='command';this.buffer='';return;}if(key.length===1)this.menu(key.toUpperCase());return;}
      if(this.state==='asmMenu'){if(key.toUpperCase()==='A'||key.toUpperCase()==='C')this.menu(key.toUpperCase());else if(key==='.')this.state='command';return;}
      if(key==='.'&&this.state!=='goAddress'&&this.state!=='assemble'){this.record('.', 'MAIN MENU');this.state='command';this.buffer='';return;}
      if(this.state==='register'&&!this.buffer&&({B:'C',D:'E',H:'L'})[this.register]===key.toUpperCase()){this.register+=key.toUpperCase();return;}
      if(key==='Enter'||key==='.'&&this.state==='goAddress'){this.enter();return;}
      if(key==='ArrowUp'||key==='ArrowLeft'){if(this.state==='disassemble'){this.address=Math.max(0,this.address-1);this.buffer='';}return;}
      if(key==='ArrowDown'||key==='ArrowRight'){if(this.state==='disassemble')this.nextDisassembly();else if(this.state==='memory'){this.address=this.address+1&65535;this.buffer='';}return;}
      if(this.state==='assemble'&&(key==='Tab'||key.length===1&&!/^[\x20-\x7E]$/.test(key))){if(this.buffer.length>=70)throw new Error('LINE TOO LONG');this.buffer+=key==='Tab'?'\t':key;return;}
      if(key.length===1&&/^[\x20-\x7E]$/.test(key)){if(this.buffer.length>=70)throw new Error('LINE TOO LONG');this.buffer+=key.toUpperCase();if(this.state==='regName'&&this.buffer.length===1&&/^[ABCDEHLF]$/.test(this.buffer)){this.register=this.buffer;this.buffer='';this.state='register';}}
    }catch(error){this.error=error.message.toUpperCase();if(this.state==='assemble')this.syntaxRejected=true;this.record(this.buffer,'ERROR: '+this.error,this.address);}}
  enter(){const input=this.buffer;switch(this.state){
    case 'asmAddress':this.address=this.addr(input,0x2000);this.state='assemble';this.record(input,'ASSEMBLE '+hex(this.address,4));break;
    case 'assemble':{if(!input)break;const row=parseTrainerInstruction(input);if(this.address+row.bytes.length>65536)throw new Error('MEMORY LIMIT');for(let i=0;i<row.bytes.length;i++){this.lab.memory[this.address+i]=row.bytes[i];this.lab.written[this.address+i]=1;}this.entries.set(this.address,{text:row.text,bytes:[...row.bytes]});this.record(input,row.bytes.map(v=>hex(v)).join(' '),this.address);const next=this.address+row.bytes.length;if(next>65535){this.state='command';this.address=65535;}else this.address=next;break;}
    case 'disStart':this.startAddress=this.addr(input);this.state='disEnd';break;
    case 'disEnd':this.endAddress=input?this.addr(input):0xFFFF;if(this.endAddress<this.startAddress)throw new Error('RANGE ERROR');this.address=this.startAddress;this.state='disassemble';this.record(input,this.lines[0].trimEnd(),this.address);break;
    case 'disassemble':this.nextDisassembly();break;
    case 'memAddress':this.address=this.addr(input);this.state='memory';this.record(input,hex(this.lab.peek(this.address)),this.address);break;
    case 'memory':if(input){if(this.address<0x2000)throw new Error('ROM PROTECTED');const v=this.addr(input,0,255);this.lab.write(this.address,v);this.lab.written[this.address]=1;this.record(input,hex(v),this.address);}this.address=this.address+1&65535;break;
    case 'goAddress':this.startAddress=this.addr(input,0x2000);this.lab.cpu.pc=this.startAddress;this.lab.cpu.halted=false;this.lab.cpu.fault=null;this.state='running';this.running=true;this.record('G '+input+'.','EXECUTING',this.startAddress);break;
    case 'regName':if(!['A','B','C','D','E','H','L','F','SP','PC','BC','DE','HL','PSW'].includes(input))throw new Error('REGISTER ERROR');this.register=input;this.state='register';break;
    case 'register':if(input)this.setReg(this.addr(input,0,this.register.length>1?65535:255));this.record(this.register,hex(this.regValue(),this.register.length>1?4:2));break;
    case 'stepAddress':this.lab.cpu.pc=this.addr(input,0x2000);this.lab.cpu.halted=false;this.lab.cpu.fault=null;this.state='step';break;
    case 'step':{const pc=this.lab.cpu.pc,d=disassemble(a=>this.lab.peek(a),pc),r=this.lab.oneInstruction();this.record('STEP '+hex(pc,4),formatTrainerInstruction(d),pc);if(r.monitorReturn||this.lab.cpu.halted)this.stop('PROGRAM ENDED');break;}
    case 'inPort':{const port=this.addr(input,0,255),v=this.lab.input(port);this.record('IN '+input,hex(v));this.error='IN '+hex(port)+' = '+hex(v);break;}
    case 'outPort':{const parts=input.split(' ');if(parts.length!==2)throw new Error('PORT DATA REQUIRED');const port=this.addr(parts[0],0,255),v=this.addr(parts[1],0,255);this.lab.output(port,v);this.record('OUT '+input,'OK');break;}
    case 'fill':case 'block':{const parts=input.split(' ');if(parts.length!==3)throw new Error('THREE VALUES NEEDED');const start=this.addr(parts[0],0x2000),end=this.addr(parts[1],start),last=this.addr(parts[2],this.state==='fill'?0:0x2000,this.state==='fill'?255:65535);if(this.state==='fill'){this.lab.memory.fill(last,start,end+1);this.lab.written.fill(1,start,end+1);}else{if(last+end-start>65535)throw new Error('RANGE ERROR');this.lab.memory.copyWithin(last,start,end+1);this.lab.written.fill(1,last,last+end-start+1);}this.record(input,'DONE');this.state='command';break;}
  }this.buffer='';}
  nextDisassembly(){const d=disassemble(a=>this.lab.peek(a),this.address);this.address+=d.size;if(this.address>this.endAddress||this.address>65535){this.state='command';this.address&=65535;}else this.record('NEXT',this.lines[0].trimEnd(),this.address);}
  stop(reason){this.running=false;this.state='ended';this.endReason=reason;this.buffer='';this.record('EXECUTION',reason+' PC='+hex(this.lab.cpu.pc,4));}
  hardwareStep(){if(!this.lab.studyBusConnected||!this.lab.modulePower.led)throw new Error('Connect and power the SC-01 CPU bus');if(!this.lab.studySingleStep)throw new Error('Switch SC-01 single-step ON');if(!this.running)throw new Error('Start the program with G and its address first');try{const result=this.lab.oneInstruction();if(result.monitorReturn||this.lab.cpu.halted)this.stop(result.monitorReturn?'RETURN TO MONITOR':'PROGRAM HALTED');else if(this.lab.breakpoints.has(this.lab.cpu.pc))this.stop('BREAKPOINT '+hex(this.lab.cpu.pc,4));return result;}catch(e){this.stop('CPU ERROR');this.error=e.message;throw e;}}
  runSlice(limit=15000,ms=7,untilTime=Infinity){if(!this.running||!this.lab.powered||this.lab.studyBusConnected&&this.lab.studySingleStep)return;const start=performance.now();try{for(let i=0;i<limit&&performance.now()-start<ms&&this.lab.time<untilTime;i++){const result=this.lab.oneInstruction();if(result.monitorReturn||this.lab.cpu.halted){this.stop(result.monitorReturn?'RETURN TO MONITOR':'PROGRAM HALTED');break;}if(this.lab.breakpoints.has(this.lab.cpu.pc)){this.stop('BREAKPOINT '+hex(this.lab.cpu.pc,4));break;}}}catch(e){this.stop('CPU ERROR');this.error=e.message;}}
  snapshot(){return {state:this.state,buffer:this.buffer,address:this.address,startAddress:this.startAddress,endAddress:this.endAddress,register:this.register,error:this.error,syntaxRejected:this.syntaxRejected,endReason:this.endReason,history:this.history,historySerial:this.historySerial,entries:[...this.entries]};}
  restore(s){if(!s||!Array.isArray(s.history)||!Array.isArray(s.entries))throw new Error('Invalid monitor state');Object.assign(this,s);this.historySerial=Math.max(Number.isSafeInteger(s.historySerial)?s.historySerial:0,...s.history.map(r=>Number.isSafeInteger(r.index)?r.index:0));this.entries=new Map(s.entries);this.running=false;if(this.state==='running')this.state='ended';}
}
