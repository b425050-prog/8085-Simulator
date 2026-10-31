import { ISA, REG, hex } from './isa.js';
const evenParity = Array.from({length:256}, (_,v) => (v.toString(2).replaceAll('0','').length & 1) === 0 ? 1 : 0);
export class CPU8085 {
  constructor(bus) { this.bus = bus; this.reset(); }
  reset(pc = 0) {
    this.r = { A:0,B:0,C:0,D:0,E:0,H:0,L:0 };
    this.f = { S:0,Z:0,AC:0,P:0,CY:0 };
    this.pc = pc & 65535; this.sp = 0xFFFF; this.cycles = 0; this.instructions = 0;
    this.halted = false; this.inte = false; this.eiDelay = 0; this.masks = 7;
    this.lines = { TRAP:0, RST75:0, RST65:0, RST55:0, INTR:0 };
    this.trapPending = false; this.rst75Pending = false; this.sid = 0; this.sod = 0;
    this.intrOpcode = 0xFF; this.intrAddress=0x2000;this.trapIE=null;this.hold = false; this.waitStates = 0; this.last = null; this.fault = null;
  }
  get flags() { return this.f.S << 7 | this.f.Z << 6 | this.f.AC << 4 | this.f.P << 2 | 2 | this.f.CY; }
  set flags(v) { this.f = { S:v>>7&1, Z:v>>6&1, AC:v>>4&1, P:v>>2&1, CY:v&1 }; }
  pair(n) { return n === 3 ? this.sp : this.r[['B','D','H'][n]] << 8 | this.r[['C','E','L'][n]]; }
  setPair(n,v) { v &= 65535; if(n===3) this.sp=v; else {this.r[['B','D','H'][n]]=v>>8; this.r[['C','E','L'][n]]=v&255;} }
  read(a,kind='read') { return this.bus.read(a & 65535,kind) & 255; }
  write(a,v) { this.bus.write(a&65535,v&255); }
  fetch() { const v=this.read(this.pc,'operand'); this.pc=this.pc+1&65535; return v; }
  word() { const lo=this.fetch(); return lo|this.fetch()<<8; }
  getReg(n) { return n===6?this.read(this.pair(2)):this.r[REG[n]]; }
  setReg(n,v) { if(n===6)this.write(this.pair(2),v);else this.r[REG[n]]=v&255; }
  push(v) { this.sp=this.sp-1&65535;this.write(this.sp,v>>8);this.sp=this.sp-1&65535;this.write(this.sp,v); }
  pop() {const lo=this.read(this.sp);this.sp=this.sp+1&65535;const hi=this.read(this.sp);this.sp=this.sp+1&65535;return lo|hi<<8;}
  szp(v) {v&=255;this.f.S=v>>7;this.f.Z=+(v===0);this.f.P=evenParity[v];return v;}
  condition(n) { return [!this.f.Z,this.f.Z,!this.f.CY,this.f.CY,!this.f.P,this.f.P,!this.f.S,this.f.S][n]; }
  alu(n,b) {
    const a=this.r.A,c=(n===1||n===3)?this.f.CY:0;
    if(n<2) {const x=a+b+c;this.f.AC=+((a&15)+(b&15)+c>15);this.f.CY=+(x>255);this.r.A=this.szp(x);}
    else if(n===2||n===3||n===7) {const x=a-b-c;this.f.AC=+((a&15)>=(b&15)+c);this.f.CY=+(x<0);const v=this.szp(x);if(n!==7)this.r.A=v;}
    else {this.f.CY=0;this.f.AC=+(n===4);this.r.A=this.szp(n===4?a&b:n===5?a^b:a|b);}
  }
  setLine(name, level) {
    if (!(name in this.lines)) throw new Error('Unknown interrupt ' + name);
    level=+!!level;
    if(level&&!this.lines[name]) {if(name==='TRAP')this.trapPending=true;if(name==='RST75')this.rst75Pending=true;}
    this.lines[name]=level;
    if(name==='TRAP'&&!level)this.trapPending=false;
  }
  interrupt() {
    let vector=null,source=null;
    if(this.trapPending&&this.lines.TRAP) {source='TRAP';vector=0x24;this.trapPending=false;this.trapIE=+this.inte;}
    else if(this.inte&&this.eiDelay===0) {
      if(this.rst75Pending&&!(this.masks&4)){source='RST7.5';vector=0x3C;this.rst75Pending=false;}
      else if(this.lines.RST65&&!(this.masks&2)){source='RST6.5';vector=0x34;}
      else if(this.lines.RST55&&!(this.masks&1)){source='RST5.5';vector=0x2C;}
      else if(this.lines.INTR){source='INTR';if(this.intrOpcode===0xCD)vector=this.intrAddress;else if((this.intrOpcode&0xC7)===0xC7)vector=this.intrOpcode&0x38;else throw new Error('INTR acknowledge supports RST 0–7 or CALL');}
    }
    if(vector===null)return null;
    const pc=this.pc,t=(source==='INTR'?(this.intrOpcode===0xCD?18:12):11)+(this.halted?1:0);this.push(pc);this.pc=vector;this.inte=false;this.eiDelay=0;this.halted=false;
    this.advance(t);this.last={pc,opcode:null,text:source+' → '+hex(vector,4)+'H',cycles:t,interrupt:true};return this.last;
  }
  advance(t) {this.cycles+=t;this.bus.tick?.(t,this);}
  step() {
    if(this.fault)throw new Error(this.fault);
    if(this.hold){this.advance(1);return {hold:true,cycles:1};}
    const irq=this.interrupt();if(irq)return irq;
    if(this.halted){this.advance(4);return {halted:true,cycles:4};}
    const pc=this.pc,op=this.read(this.pc,'fetch'),entry=ISA[op];
    if(!entry){this.fault=`Undocumented opcode ${hex(op)}H at ${hex(pc,4)}H`;throw new Error(this.fault);}
    this.pc=this.pc+1&65535;let t=entry.cycles[0],taken=false;
    const dst=op>>3&7,src=op&7,p=op>>4&3;
    if(op>=0x40&&op<=0x7F){if(op===0x76)this.halted=true;else this.setReg(dst,this.getReg(src));}
    else if(op>=0x80&&op<=0xBF)this.alu(dst,this.getReg(src));
    else if((op&0xC7)===0x06)this.setReg(dst,this.fetch());
    else if((op&0xCF)===0x01)this.setPair(p,this.word());
    else if((op&0xCF)===0x03)this.setPair(p,this.pair(p)+1);
    else if((op&0xCF)===0x0B)this.setPair(p,this.pair(p)-1);
    else if((op&0xCF)===0x09){const x=this.pair(2)+this.pair(p);this.f.CY=+(x>65535);this.setPair(2,x);}
    else if((op&0xC7)===0x04){const v=this.getReg(dst);this.f.AC=+((v&15)===15);this.setReg(dst,this.szp(v+1));}
    else if((op&0xC7)===0x05){const v=this.getReg(dst);this.f.AC=+((v&15)!==0);this.setReg(dst,this.szp(v-1));}
    else if((op&0xCF)===0xC1){const v=this.pop();if(p===3){this.r.A=v>>8;this.flags=v&255;}else this.setPair(p,v);}
    else if((op&0xCF)===0xC5)this.push(p===3?this.r.A<<8|this.flags:this.pair(p));
    else if((op&0xC7)===0xC6)this.alu(dst,this.fetch());
    else if((op&0xC7)===0xC0){taken=!!this.condition(dst);if(taken)this.pc=this.pop();}
    else if((op&0xC7)===0xC2){const lo=this.fetch();taken=!!this.condition(dst);if(taken)this.pc=lo|this.fetch()<<8;else this.pc=this.pc+1&65535;}
    else if((op&0xC7)===0xC4){const lo=this.fetch();taken=!!this.condition(dst);if(taken){const a=lo|this.fetch()<<8;this.push(this.pc);this.pc=a;}else this.pc=this.pc+1&65535;}
    else if((op&0xC7)===0xC7){this.push(this.pc);this.pc=op&0x38;}
    else switch(op) {
      case 0x00:break;
      case 0x02:case 0x12:this.write(this.pair(p),this.r.A);break;
      case 0x0A:case 0x1A:this.r.A=this.read(this.pair(p));break;
      case 0x07:this.f.CY=this.r.A>>7;this.r.A=(this.r.A<<1|this.f.CY)&255;break;
      case 0x0F:this.f.CY=this.r.A&1;this.r.A=this.r.A>>1|this.f.CY<<7;break;
      case 0x17:{const c=this.f.CY;this.f.CY=this.r.A>>7;this.r.A=(this.r.A<<1|c)&255;break;}
      case 0x1F:{const c=this.f.CY;this.f.CY=this.r.A&1;this.r.A=this.r.A>>1|c<<7;break;}
      case 0x20:this.r.A=this.sid<<7|+this.rst75Pending<<6|this.lines.RST65<<5|this.lines.RST55<<4|(this.trapIE??+this.inte)<<3|this.masks;this.trapIE=null;break;
      case 0x22:{const a=this.word();this.write(a,this.r.L);this.write(a+1,this.r.H);break;}
      case 0x2A:{const a=this.word();this.r.L=this.read(a);this.r.H=this.read(a+1);break;}
      case 0x27:{const a=this.r.A;let correction=0;const c=this.f.CY||a>0x99;if((a&15)>9||this.f.AC)correction|=6;if(c)correction|=0x60;this.f.AC=+((a&15)+(correction&15)>15);this.r.A=this.szp(a+correction);this.f.CY=+c;break;}
      case 0x2F:this.r.A^=255;break;
      case 0x30:{const a=this.r.A;if(a&8)this.masks=a&7;if(a&16)this.rst75Pending=false;if(a&64)this.sod=a>>7;break;}
      case 0x32:this.write(this.word(),this.r.A);break;
      case 0x3A:this.r.A=this.read(this.word());break;
      case 0x37:this.f.CY=1;break;
      case 0x3F:this.f.CY^=1;break;
      case 0xC3:this.pc=this.word();break;
      case 0xC9:this.pc=this.pop();break;
      case 0xCD:{const a=this.word();this.push(this.pc);this.pc=a;break;}
      case 0xD3:{const port=this.fetch();this.bus.output(port,this.r.A);break;}
      case 0xDB:{const port=this.fetch();this.r.A=this.bus.input(port)&255;break;}
      case 0xE3:{const lo=this.read(this.sp),hi=this.read(this.sp+1);this.write(this.sp,this.r.L);this.write(this.sp+1,this.r.H);this.r.L=lo;this.r.H=hi;break;}
      case 0xE9:this.pc=this.pair(2);break;
      case 0xEB:{const d=this.pair(1);this.setPair(1,this.pair(2));this.setPair(2,d);break;}
      case 0xF3:this.inte=false;this.eiDelay=0;break;
      case 0xF9:this.sp=this.pair(2);break;
      case 0xFB:this.eiDelay=2;break;
      default:throw new Error('Unimplemented opcode '+hex(op));
    }
    if(taken)t=entry.cycles[1];t+=this.waitStates;
    if(this.eiDelay>0&&--this.eiDelay===0)this.inte=true;
    this.instructions++;this.advance(t);this.last={pc,opcode:op,cycles:t,taken,entry};return this.last;
  }
  snapshot(){return {r:{...this.r},f:{...this.f},pc:this.pc,sp:this.sp,cycles:this.cycles,instructions:this.instructions,halted:this.halted,inte:this.inte,eiDelay:this.eiDelay,masks:this.masks,lines:{...this.lines},trapPending:this.trapPending,rst75Pending:this.rst75Pending,sid:this.sid,sod:this.sod,intrOpcode:this.intrOpcode,intrAddress:this.intrAddress,trapIE:this.trapIE,hold:this.hold,waitStates:this.waitStates,fault:this.fault};}
  restore(s){Object.assign(this,s,{r:{...s.r},f:{...s.f},lines:{...s.lines}});}
}
