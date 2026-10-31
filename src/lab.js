import {CPU8085} from './cpu.js';
import {PPI8255,ADC080x,DAC0800,SignalGenerator,CaptureBuffer,clamp} from './peripherals.js';
import {hex} from './isa.js';

export const RAM_START=0x2000;
export const VECTOR_ADDRESSES=[8,16,24,32,36,40,44,48,52,56,60];
function validateSnapshot(s){
  const fail=()=>{throw new Error('Invalid bench project: incomplete or out-of-range machine state');};
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max,number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  const array=(a,n,min=0,max=255)=>Array.isArray(a)&&a.length===n&&a.every(v=>integer(v,min,max));
  if(s?.version!==1||!array(s.memory,65536)||!array(s.written,65536,0,1)||!array(s.externalPorts,256)||!s.cpu||!Array.isArray(s.ppis)||s.ppis.length!==2)fail();
  const c=s.cpu;if(!['A','B','C','D','E','H','L'].every(k=>integer(c.r?.[k],0,255))||!['S','Z','AC','P','CY'].every(k=>integer(c.f?.[k],0,1))||!['TRAP','RST75','RST65','RST55','INTR'].every(k=>integer(c.lines?.[k],0,1)))fail();
  if(!integer(c.pc,0,65535)||!integer(c.sp,0,65535)||!integer(c.cycles,0,Number.MAX_SAFE_INTEGER)||!integer(c.instructions,0,Number.MAX_SAFE_INTEGER)||!integer(c.masks,0,7)||!integer(c.eiDelay,0,2)||!integer(c.sid,0,1)||!integer(c.sod,0,1)||!integer(c.waitStates,0,1000)||!integer(c.intrAddress,0,65535)||!(c.intrOpcode===0xCD||integer(c.intrOpcode,0,255)&&(c.intrOpcode&0xC7)===0xC7))fail();
  if(![c.halted,c.inte,c.hold,c.trapPending,c.rst75Pending].every(v=>typeof v==='boolean')||!(c.trapIE===null||integer(c.trapIE,0,1))||!(c.fault===null||typeof c.fault==='string'))fail();
  for(const p of s.ppis){if(!integer(p.control,128,255)||!array(p.latch,3)||!array(p.external,3)||!array(p.inputLatch,2)||!['ibf','obf','inteIn','inteOut','intr'].every(k=>array(p[k],2,0,1)))fail();}
  if(!Array.isArray(s.mapping)||s.mapping.length!==2)fail();for(const m of s.mapping)if(!['io','memory'].includes(m.space)||!integer(m.base,m.space==='io'?0:RAM_START,m.space==='io'?252:65532)||m.space==='io'&&m.base<=0xE1&&m.base+3>=0xE0)fail();
  const [a,b]=s.mapping;if(a.space===b.space&&a.base<=b.base+3&&a.base+3>=b.base)fail();
  if(!s.wiring||!['A','B'].includes(s.wiring.dac)||!['A','B'].includes(s.wiring.adc)||s.wiring.adc===s.wiring.dac||s.wiring.control!=='C'||typeof s.wiring.analogEnabled!=='boolean'||!['none','RST55','RST65','RST75','INTR'].includes(s.wiring.irq))fail();
  const adc=s.adc,dac=s.dac,g=s.generator;
  if(!adc||!['0808','0804'].includes(adc.profile)||!number(adc.vref,.1,20)||!number(adc.clock,10000,1280000)||!integer(adc.channel,0,7)||!integer(adc.code,0,255)||!integer(adc.eoc,0,1)||!integer(adc.intr,0,1)||!number(adc.deadline,0,1e12)||!number(adc.sampledVoltage,-1e6,1e6)||!integer(adc.conversions,0,Number.MAX_SAFE_INTEGER)||!Array.isArray(adc.dc)||adc.dc.length!==8||!adc.dc.every(v=>number(v,-20,20))||!Array.isArray(adc.sources)||adc.sources.length!==8||!adc.sources.every(v=>['dc','generator','dac'].includes(v)))fail();
  if(!['busy','startHigh','oe','ale'].every(k=>typeof adc[k]==='boolean'))fail();
  if(!dac||!['0800','0808'].includes(dac.profile)||!number(dac.reference,.1,20)||!number(dac.rref,100,100000)||!number(dac.rload,100,100000)||!integer(dac.code,0,255)||typeof dac.bipolar!=='boolean')fail();
  if(!g||!['sine','square','triangle','saw','dc','noise'].includes(g.type)||!number(g.frequency,.01,100000)||!number(g.amplitude,0,20)||!number(g.offset,-20,20)||!number(g.duty,1,99)||!number(g.phase,-36000,36000)||!number(g.dc,-20,20))fail();
  if(!number(s.clock,1,1e8)||!number(s.time,0,1e12)||!number(s.nextSample,0,1e12)||!number(s.scopeRate,1,1e7)||!/^\d{6}$/.test(s.id)||typeof s.idActiveLow!=='boolean'||typeof s.romProtected!=='boolean'||typeof s.consoleOut!=='string'||s.consoleOut.length>8192||!array(s.consoleIn,s.consoleIn?.length))fail();
  if(!Array.isArray(s.breakpoints)||!s.breakpoints.every(v=>integer(v,0,65535))||!Array.isArray(s.watchpoints)||!s.watchpoints.every(v=>Array.isArray(v)&&v.length===2&&integer(v[0],0,65535)&&['r','w','rw'].includes(v[1])))fail();
}
export class Lab {
  constructor(){this.memory=new Uint8Array(65536);this.written=new Uint8Array(65536);this.ppis=[new PPI8255('Analog interface'),new PPI8255('ID / LEDs')];this.adc=new ADC080x();this.dac=new DAC0800();this.generator=new SignalGenerator();
    this.mapping=[{space:'io',base:0x80},{space:'io',base:0x90}];this.wiring={dac:'A',adc:'B',control:'C',analogEnabled:true,irq:'none'};this.clock=3000000;this.time=0;this.id='000000';this.idActiveLow=false;this.traceEnabled=true;this.trace=new CaptureBuffer(2048);this.scope=new CaptureBuffer();this.scopeRate=100000;this.nextSample=0;this.externalPorts=new Uint8Array(256).fill(255);this.romProtected=true;this.consoleOut='';this.consoleIn=[];this.watchHit=null;this.watchpoints=new Map();this.breakpoints=new Set();this.changed=new Set();this.cpu=new CPU8085(this);this.installROM();this.sync();}
  installROM(){this.memory.fill(0,0,RAM_START);this.memory.set([0xC3,0x00,0x20],0);for(const a of VECTOR_ADDRESSES)this.memory[a]=0xC9;
    this.setVector(8,0x0100);this.memory.set([0xD3,0xE0,0xC9],0x100);
    this.setVector(16,0x0110);this.memory.set([0xDB,0xE0,0xC9],0x110);
    this.setVector(24,0x0120);this.memory.set([0x7E,0xB7,0xC8,0xD3,0xE0,0x23,0xC3,0x20,0x01],0x120);
    this.memory.set(new TextEncoder().encode('8085 BENCH MONITOR 1.0 | USER RAM 2000H-FFFFH\0'),0x180);
  }
  setVector(address,target){if(!VECTOR_ADDRESSES.includes(address))throw new Error('Invalid vector');if(target===null){this.memory.fill(0,address,address+3);this.memory[address]=0xC9;}else this.memory.set([0xC3,target&255,target>>8&255],address);}
  configureMapping(index,space,base){const limit=space==='io'?255:65535;if(!Number.isInteger(base)||base<0||base+3>limit)throw new Error('Four consecutive addresses are required');if(space==='memory'&&base<RAM_START)throw new Error('Memory-mapped peripherals must be in user address space');const other=this.mapping[1-index];if(space===other.space&&base<=other.base+3&&base+3>=other.base)throw new Error('8255 address ranges overlap');if(space==='io'&&base<=0xE1&&base+3>=0xE0)throw new Error('E0H/E1H are monitor console ports');this.mapping[index]={space,base};}
  findDevice(space,a){for(let i=0;i<2;i++){const m=this.mapping[i];if(m.space===space&&a>=m.base&&a<=m.base+3)return {ppi:this.ppis[i],port:a-m.base,index:i};}return null;}
  event(type,address,value,device='RAM'){if(!this.traceEnabled)return;this.trace.push({t:this.time,cycles:this.cpu.cycles,type,address,value,device});}
  watch(address,type){const mode=this.watchpoints.get(address);if(mode&&(mode==='rw'||mode===type))this.watchHit={address,type};}
  read(a,kind='read'){a&=65535;const d=this.findDevice('memory',a);let v;if(d){this.sync();v=d.ppi.read(d.port);this.sync();}else v=this.memory[a];if(kind==='read')this.watch(a,'r');this.event(kind,a,v,d?'8255 #'+(d.index+1):a<RAM_START?'ROM':'RAM');return v;}
  peek(a){const d=this.findDevice('memory',a&65535);return d?d.ppi.peek(d.port):this.memory[a&65535];}
  write(a,v){a&=65535;v&=255;const d=this.findDevice('memory',a);if(d){d.ppi.write(d.port,v);this.sync();}else if(a>=RAM_START||!this.romProtected){this.memory[a]=v;this.changed.add(a);}this.watch(a,'w');this.event('write',a,v,d?'8255 #'+(d.index+1):a<RAM_START?'ROM (blocked)':'RAM');}
  input(p){this.sync();let v;const d=this.findDevice('io',p);if(d)v=d.ppi.read(d.port);else if(p===0xE0)v=this.consoleIn.length?this.consoleIn.shift():0;else if(p===0xE1)v=this.consoleIn.length?1:0;else v=this.externalPorts[p];this.sync();this.event('IN',p,v,d?'8255 #'+(d.index+1):p===0xE0||p===0xE1?'Console':'Generic I/O');return v;}
  output(p,v){const d=this.findDevice('io',p);if(d){d.ppi.write(d.port,v);this.sync();}else if(p===0xE0){this.consoleOut=(this.consoleOut+String.fromCharCode(v)).slice(-8192);}else this.externalPorts[p]=v;this.event('OUT',p,v,d?'8255 #'+(d.index+1):p===0xE0?'Console':'Generic I/O');}
  analogVoltage(channel,t=this.time){const source=this.adc.sources[channel];return source==='generator'?this.generator.value(t):source==='dac'?this.dac.voltage:this.adc.dc[channel];}
  sync(){if(this.wiring.analogEnabled){const p=this.ppis[0],idx={A:0,B:1,C:2},dac=idx[this.wiring.dac],adc=idx[this.wiring.adc],control=idx[this.wiring.control];
      const mask=p.outputMask(dac);this.dac.code=p.pins(dac)&mask;
      const c=p.pins(control)&p.outputMask(control);this.adc.pins(c,this.time,ch=>this.analogVoltage(ch));
      const val=this.adc.read();if(p.external[adc]!==val)p.setInput(adc,val);
      const eoc=this.adc.profile==='0804'?this.adc.intr:this.adc.eoc;const external=(p.external[control]&0x7F)|(eoc?128:0);if(p.external[control]!==external)p.setInput(control,external);
    }
    const irq=this.wiring.irq;if(irq!=='none'){const high=!!(this.ppis[0].intr[0]||this.ppis[0].intr[1]);this.cpu.setLine(irq,high);}
  }
  tick(t){const end=this.time+t/this.clock;this.adc.tick(end);this.sync();
    // Capture zero-order-held digital/DAC outputs at instruction boundaries and
    // uniformly sample the independent input source. Bound work per instruction.
    const period=1/this.scopeRate;let count=0;while(this.nextSample<=end&&count++<4096){this.sample(this.nextSample);this.nextSample+=period;}if(count>=4096)this.nextSample=end+period;
    this.time=end;
  }
  sample(t){this.scope.push({t,input:this.analogVoltage(this.adc.channel,t),dac:this.dac.voltage,adc:this.adc.code*this.adc.vref/256,a:this.ppis[0].pins(0),b:this.ppis[0].pins(1),c:this.ppis[0].pins(2),ledA:this.ppis[1].pins(0),ledB:this.ppis[1].pins(1),ledC:this.ppis[1].pins(2),sid:this.cpu.sid,sod:this.cpu.sod,eoc:this.adc.eoc});}
  idle(seconds){const t=Math.max(1,Math.round(seconds*this.clock));this.cpu.advance(t);}
  reset({clearRAM=false,entry=RAM_START}={}){if(clearRAM){this.memory.fill(0,RAM_START);this.written.fill(0);}this.installROM();this.cpu.reset(entry);this.ppis.forEach(p=>p.reset());this.adc.reset();this.dac.code=0;this.time=0;this.nextSample=0;this.scope.clear();this.trace.clear();this.consoleOut='';this.watchHit=null;this.changed.clear();this.sync();this.sample(0);}
  load(result){if(!result.ok)throw new Error('Assembly has errors');this.reset({clearRAM:true,entry:result.entry});for(let a=RAM_START;a<65536;a++)if(result.written[a]){this.memory[a]=result.memory[a];this.written[a]=1;}for(const v of result.vectors||[])this.setVector(v.address,v.target);}
  displayID(id=this.id){if(!/^\d{6}$/.test(id))throw new Error('Enter exactly six decimal digits');this.id=id;const p=this.ppis[1];p.write(3,0x80);for(let n=0;n<3;n++){const v=Number(id[n*2])*16+Number(id[n*2+1]);p.write(n,this.idActiveLow?v^255:v);}this.event('ID',this.mapping[1].base,0,'Six-digit BCD');}
  snapshot(){return {version:1,memory:Array.from(this.memory),written:Array.from(this.written),cpu:this.cpu.snapshot(),ppis:this.ppis.map(p=>p.snapshot()),adc:this.adc.snapshot(),dac:this.dac.snapshot(),generator:this.generator.snapshot(),mapping:structuredClone(this.mapping),wiring:{...this.wiring},clock:this.clock,time:this.time,nextSample:this.nextSample,id:this.id,idActiveLow:this.idActiveLow,romProtected:this.romProtected,scopeRate:this.scopeRate,externalPorts:Array.from(this.externalPorts),consoleOut:this.consoleOut,consoleIn:[...this.consoleIn],breakpoints:[...this.breakpoints],watchpoints:[...this.watchpoints]};}
  restore(s){validateSnapshot(s);this.memory.set(s.memory);this.written.set(s.written);this.cpu.restore(s.cpu);this.ppis.forEach((p,i)=>p.restore(s.ppis[i]));this.adc.restore(s.adc);Object.assign(this.dac,s.dac);Object.assign(this.generator,s.generator);this.mapping=structuredClone(s.mapping);this.wiring={...s.wiring};this.clock=s.clock;this.time=s.time;this.nextSample=s.nextSample;this.id=s.id;this.idActiveLow=s.idActiveLow;this.romProtected=s.romProtected;this.scopeRate=s.scopeRate;this.externalPorts.set(s.externalPorts);this.consoleOut=s.consoleOut;this.consoleIn=[...s.consoleIn];this.breakpoints=new Set(s.breakpoints);this.watchpoints=new Map(s.watchpoints);this.scope.clear();this.trace.clear();this.sample(this.time);}
}
