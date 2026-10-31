export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bit=(v,n)=>v>>n&1;
const withBit=(v,n,x)=>x?v|1<<n:v&~(1<<n);
export class PPI8255 {
  constructor(name='8255'){this.name=name;this.reset();}
  reset(){this.control=0x9B;this.latch=[0,0,0];this.external=[255,255,255];this.inputLatch=[0,0];this.ibf=[0,0];this.obf=[1,1];this.inteIn=[0,0];this.inteOut=[0,0];this.intr=[0,0];}
  get modeA(){return this.control&0x40?2:this.control>>5&1;}
  get modeB(){return this.control>>2&1;}
  isInput(port){return port===0?!!(this.control&16):port===1?!!(this.control&2):false;}
  get reservedC(){return (this.modeA===2?0xF8:this.modeA===1?(this.isInput(0)?0x38:0xC8):0)|(this.modeB?7:0);}
  outputMask(port){if(port===0)return this.modeA===2?(bit(this.external[2],6)?0:255):this.isInput(0)?0:255;if(port===1)return this.isInput(1)?0:255;
    const general=((this.control&8?0:0xF0)|(this.control&1?0:15))&~this.reservedC;
    const a=this.modeA===2?0xA8:this.modeA===1?(this.isInput(0)?0x28:0x88):0;
    return general|a|(this.modeB?3:0);
  }
  recompute(){for(let p=0;p<2;p++){const mode=p===0?this.modeA:this.modeB;if(!mode){this.intr[p]=0;continue;}const c=this.external[2],stb=bit(c,p===0?4:2),ack=bit(c,p===0?6:2);this.intr[p]=+!!((p===0&&mode===2||this.isInput(p))&&this.ibf[p]&&stb&&this.inteIn[p]||(!this.isInput(p)||mode===2)&&this.obf[p]&&ack&&this.inteOut[p]);}}
  pins(port){const mask=this.outputMask(port);if(port!==2)return this.latch[port]&mask|this.external[port]&~mask&255;
    let v=this.latch[2]&mask|this.external[2]&~mask&255;
    if(this.modeA){v=withBit(v,3,this.intr[0]);if(this.modeA===2||this.isInput(0))v=withBit(v,5,this.ibf[0]);if(this.modeA===2||!this.isInput(0))v=withBit(v,7,this.obf[0]);}
    if(this.modeB){v=withBit(v,0,this.intr[1]);v=withBit(v,1,this.isInput(1)?this.ibf[1]:this.obf[1]);}return v&255;
  }
  peek(port){if(port===3)return 0xFF; // The original NMOS 8255A control register is write-only.
    if(port===2){let v=this.pins(2);if(this.modeA===2){v=withBit(v,4,this.inteIn[0]);v=withBit(v,6,this.inteOut[0]);}else if(this.modeA)v=withBit(v,this.isInput(0)?4:6,this.isInput(0)?this.inteIn[0]:this.inteOut[0]);if(this.modeB)v=withBit(v,2,this.isInput(1)?this.inteIn[1]:this.inteOut[1]);return v;}
    const mode=port===0?this.modeA:this.modeB;return mode&&(this.isInput(port)||mode===2)?this.inputLatch[port]:this.isInput(port)?this.external[port]:this.latch[port];
  }
  read(port){const v=this.peek(port);if(port<2){const mode=port===0?this.modeA:this.modeB;if(mode&&(this.isInput(port)||mode===2)){this.ibf[port]=0;this.recompute();}}return v;}
  write(port,value){value&=255;if(port===3){if(value&128){this.control=value;this.latch=[0,0,0];this.inputLatch=[0,0];this.ibf=[0,0];this.obf=[1,1];this.inteIn=[0,0];this.inteOut=[0,0];this.intr=[0,0];}
      else {const n=value>>1&7,set=value&1;this.latch[2]=withBit(this.latch[2],n,set);if(n===4&&(this.modeA===2||this.modeA===1&&this.isInput(0)))this.inteIn[0]=set;if(n===6&&(this.modeA===2||this.modeA===1&&!this.isInput(0)))this.inteOut[0]=set;if(n===2&&this.modeB){if(this.isInput(1))this.inteIn[1]=set;else this.inteOut[1]=set;}this.recompute();}
    }else {this.latch[port]=value;if(port<2){const mode=port===0?this.modeA:this.modeB;if(mode&&(!this.isInput(port)||mode===2)){this.obf[port]=0;this.recompute();}}}
  }
  setInput(port,value){value&=255;const old=this.external[port];this.external[port]=value;
    for(let p=0;p<2;p++){const mode=p===0?this.modeA:this.modeB;if(!mode)continue;const stb=p===0?4:2,ack=p===0?6:2;
      if(this.isInput(p)||mode===2){if(!bit(this.external[2],stb)&&(port===p||port===2)){this.inputLatch[p]=this.external[p];this.ibf[p]=1;}}
      if((!this.isInput(p)||mode===2)&&port===2&&bit(old,ack)&&!bit(value,ack))this.obf[p]=1;
    }this.recompute();
  }
  pulse(port,type){const pin=port===0?(type==='strobe'?4:6):2;this.setInput(2,this.external[2]|1<<pin);this.setInput(2,this.external[2]&~(1<<pin));this.setInput(2,this.external[2]|1<<pin);}
  snapshot(){return {control:this.control,latch:[...this.latch],external:[...this.external],inputLatch:[...this.inputLatch],ibf:[...this.ibf],obf:[...this.obf],inteIn:[...this.inteIn],inteOut:[...this.inteOut],intr:[...this.intr]};}
  restore(s){for(const [k,v]of Object.entries(s))this[k]=Array.isArray(v)?[...v]:v;}
}

export class SignalGenerator {
  constructor(){this.type='sine';this.frequency=100;this.amplitude=2;this.offset=2.5;this.duty=50;this.phase=0;this.dc=2.5;}
  value(t){const p=((t*this.frequency+this.phase/360)%1+1)%1;let v=0;switch(this.type){case 'sine':v=Math.sin(2*Math.PI*p);break;case 'square':v=p<this.duty/100?1:-1;break;case 'triangle':v=1-4*Math.abs(p-0.5);break;case 'saw':v=2*p-1;break;case 'dc':return this.dc;case 'noise':{const n=Math.sin(Math.floor(t*Math.max(this.frequency,1))*12.9898+78.233)*43758.5453;v=(n-Math.floor(n))*2-1;break;}}return this.offset+this.amplitude*v;}
  snapshot(){return {...this};}
}

export class ADC080x {
  constructor(){this.profile='0808';this.vref=5;this.clock=640000;this.channel=0;this.dc=Array(8).fill(2.5);this.sources=Array(8).fill('dc');this.sources[0]='generator';this.reset();}
  reset(){this.busy=false;this.eoc=1;this.intr=1;this.code=0;this.sampledVoltage=0;this.deadline=0;this.startHigh=false;this.oe=false;this.ale=false;this.conversions=0;}
  get conversionSeconds(){return (this.profile==='0804'?64:64)/this.clock;}
  quantize(v){return clamp(Math.floor(v/this.vref*256+0.5),0,255);}
  start(t,voltage){this.busy=true;this.eoc=0;this.intr=1;this.sampledVoltage=voltage;this.deadline=t+this.conversionSeconds;}
  tick(t){if(this.busy&&t>=this.deadline){this.code=this.quantize(this.sampledVoltage);this.busy=false;this.eoc=1;this.intr=0;this.conversions++;}}
  pins(c,t,input){if(this.profile==='0804'){const wr=!!(c&8),rd=!!(c&1);if(!wr){this.busy=false;this.intr=1;}if(wr&&!this.startHigh)this.start(t,input(0));this.startHigh=wr;this.oe=!rd;if(this.oe&&!this.busy)this.intr=1;}
    else {const ale=!!(c&8),start=!!(c&8);if(ale&&!this.ale)this.channel=c&7;this.ale=ale;if(start&&!this.startHigh){this.busy=false;this.eoc=0;}if(!start&&this.startHigh)this.start(t,input(this.channel));this.startHigh=start;this.oe=true;}}
  read(){return this.oe?this.code:255;}
  snapshot(){return {...this,dc:[...this.dc],sources:[...this.sources]};}
  restore(s){Object.assign(this,s,{dc:[...s.dc],sources:[...s.sources]});}
}
export class DAC0800 {
  constructor(){this.profile='0800';this.reference=5;this.rref=2500;this.rload=2500;this.bipolar=false;this.code=0;}
  get current(){return this.reference/this.rref*this.code/256;}
  get complementaryCurrent(){return this.reference/this.rref*(255-this.code)/256;}
  get voltage(){return this.bipolar?this.reference*this.rload/this.rref*(this.code-128)/128:this.current*this.rload;}
  snapshot(){return {...this};}
}

// Fixed-size ring buffer prevents continuous experiments from growing memory.
export class CaptureBuffer {
  constructor(capacity=32768){this.capacity=capacity;this.data=new Array(capacity);this.head=0;this.length=0;}
  push(point){this.data[this.head]=point;this.head=(this.head+1)%this.capacity;this.length=Math.min(this.length+1,this.capacity);}
  clear(){this.head=0;this.length=0;}
  points(){return Array.from({length:this.length},(_,i)=>this.data[(this.head-this.length+i+this.capacity)%this.capacity]);}
  range(start,end){const out=[];for(let i=0;i<this.length;i++){const p=this.data[(this.head-this.length+i+this.capacity)%this.capacity];if(p.t>=start&&p.t<=end)out.push(p);}return out;}
}
