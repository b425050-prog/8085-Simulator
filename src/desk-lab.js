import {Lab,RAM_START} from './lab.js';
import {DAC0800,PPI8255,clamp} from './peripherals.js';
import {PatchBay,PIT8253} from './circuit.js';

export const PORT_SIGNALS=Array.from({length:24},(_,i)=>'ABC'[Math.floor(i/8)]+(i%8));
// Logical bus labels, not an unverified physical Kitek pin-number specification.
export const BUS_SIGNALS=[...Array.from({length:8},(_,i)=>'AD'+i),...Array.from({length:8},(_,i)=>'A'+(i+8)),'ALE','RD','WR','IOM','S0','S1','READY','HOLD','HLDA','RESET','CLK','INTR','INTA','TRAP','RST55','RST65','RST75','SID','SOD','V5','GND',...Array.from({length:13},(_,i)=>'NC'+(i+1))];
export const busTerminal=(prefix,s)=>s==='V5'?prefix.split('.')[0]+'.v5':s==='GND'?prefix.split('.')[0]+'.gnd':prefix+'.'+s;
export class DeskLab extends Lab {
  constructor(){super();this.mapping=[{space:'io',base:0x00},{space:'io',base:0x30}];this.id='425050';this.clock=3072000;this.wiring.analogEnabled=false;this.timer=new PIT8253();this.timerBase=0xC4;this.patchbay=new PatchBay();this.boardSwitch=false;this.scopeSwitch=true;this.stripOn=true;this.powered=false;this.keyboardConnected=false;
    this.modulePower={dac:false,adc:false,led:false,motor:false};this.studyPPI=new PPI8255('SC-01 study card');this.studySingleStep=false;this.studyBusConnected=false;this.studyBus={data:0,address:0,read:false,write:false,cs:false};this.dacs=[this.dac,new DAC0800()];this.dacTrim=[{gain:1,offset:0},{gain:1,offset:0}];this.dacVoltages=[0,0];this.adcInputs=Array(8).fill(2.5);this.adcInputSources=Array(8).fill('knob');this.adcInputSources[0]='jack';this.adcChannel=0;this.adcAle=false;this.adcStart=false;this.adcOE=false;
    this.motor={phase:0,index:null,angle:0,steps:0,invalid:0,rpm:0,lastStep:0,stepAngle:1.8};this.ledBytes=[0,0,0];this.activeLowLED=false;this.probes=[{physical:10},{physical:10}];this.switches=Array(8).fill(0);this.conflictText='';this._lastPitClock=[0,0,0];this._registerTerminals();this.reset();}
  _registerTerminals(){const p=this.patchbay;for(const name of ['outlet.trainer','outlet.scope','trainer.ac','scope.ac','keyboard.ps2','trainer.ps2','source.out','source.gnd','trainer.sid','trainer.sod','trainer.rst75','trainer.rst65','trainer.rst55'])p.node(name);
    for(const mod of ['trainer','dac','adc','led','motor'])for(const rail of ['v5','gnd','v12','vn12'])p.node(mod+'.'+rail,{power:true});
    for(let n=0;n<2;n++)for(const s of PORT_SIGNALS)p.node('trainer.ppi'+n+'.'+s);
    for(const mod of ['dac','adc','led','motor'])for(const s of PORT_SIGNALS)p.node(mod+'.'+s);
    for(const prefix of ['trainer.bus','led.bus'])for(const s of BUS_SIGNALS)p.node(busTerminal(prefix,s));
    for(const id of ['dac.x','dac.y','adc.ale','adc.start','adc.oe','adc.eoc','adc.addr0','adc.addr1','adc.addr2','scope.ch1.tip','scope.ch1.gnd','scope.ch2.tip','scope.ch2.gnd','scope.ext.tip','scope.ext.gnd','scope.comp','scope.gnd'])p.node(id);
    for(let n=0;n<8;n++)p.node('adc.in'+n);
    for(let n=0;n<3;n++)for(const signal of ['clock','gate','out'])p.node(`trainer.pit${n}.${signal}`);
    for(let n=0;n<8;n++)p.node('logic.'+n);
  }
  bundlePairs(from,to,type){if(type==='bus')return BUS_SIGNALS.map(s=>[busTerminal(from,s),busTerminal(to,s)]);if(type==='frc')return PORT_SIGNALS.map(s=>[from+'.'+s,to+'.'+s]);if(type==='power')return ['v5','gnd','v12','vn12'].map(s=>[from+'.'+s,to+'.'+s]);return [[from,to]];}
  cable(from,to,type='jumper',color='#d8ad35'){const pairs=this.bundlePairs(from,to,type);let c;if(['frc','power','bus'].includes(type))c=this.patchbay.bundle(from,to,pairs,{type,color});else c=this.patchbay.connect(from,to,{type,color});this.sync();return c;}
  findDevice(space,address){const d=super.findDevice(space,address);if(d?.index===1&&this.studyBusConnected)return this.modulePower.led?{...d,ppi:this.studyPPI,index:2}:null;return d;}
  event(type,address,value,device='RAM'){super.event(type,address,value,device);if(this.studyBusConnected&&this.modulePower?.led&&['fetch','read','write','IN','OUT'].includes(type)){const m=this.mapping[1];this.studyBus={data:value&255,address,read:type!=='write'&&type!=='OUT',write:type==='write'||type==='OUT',cs:(m.space==='io'?(type==='IN'||type==='OUT'):(type!=='IN'&&type!=='OUT'))&&address>=m.base&&address<m.base+4};}}
  installROM(){super.installROM();this.memory[0x28]=0x76;this.memory[0x29]=0xC9;
    // Compatibility implementation of the kit service called by the supplied
    // stepper sheet: PUSH PSW; loop DCX D/MOV A,D/ORA E/JNZ; POP PSW; RET.
    // DE=0000 makes 65,536 iterations. Original Kitek timing was not supplied.
    this.memory.set([0xF5,0x1B,0x7A,0xB3,0xC2,0xA7,0x03,0xF1,0xC9],0x03A6);
  }
  reset(){if(!this.patchbay)return super.reset();super.reset({entry:RAM_START});this.timer.reset();this.ppis.forEach(p=>p.reset());this.studyPPI.reset();this.studySingleStep=false;this.studyBus={data:0,address:0,read:false,write:false,cs:false};this.installROM();this.cpu.reset(RAM_START);this.cpu.sp=0xFFFF;this.motor.index=null;this.motor.phase=0;this.motor.rpm=0;this.motor.steps=0;this.motor.angle=0;this.sync();}
  powerOnReset(){this.cpu.reset(RAM_START);this.cpu.sp=0xFFFF;this.ppis.forEach(p=>p.reset());this.studyPPI.reset();this.adc.reset();const clocks=this.timer.channels.map(c=>c.clock);this.timer.reset();this.timer.channels.forEach((c,n)=>c.clock=clocks[n]);this.sync();this.cpu.halted=true;}
  input(port){if(this.timer&&port>=this.timerBase&&port<this.timerBase+4){const v=this.timer.read(port-this.timerBase);this.event('IN',port,v,'8253');return v;}return super.input(port);}
  output(port,value){if(this.timer&&port>=this.timerBase&&port<this.timerBase+4){this.timer.write(port-this.timerBase,value);this.sync();this.event('OUT',port,value,'8253');return;}super.output(port,value);}
  _railOK(mod,bipolar=false){const p=this.patchbay,ground=p.voltage(mod+'.gnd'),v=p.voltage(mod+'.v5');return ground!==null&&Math.abs(ground)<.3&&v!==null&&v>=4.5&&v<=5.5&&(!bipolar||(p.voltage(mod+'.v12')??0)>=10&&(p.voltage(mod+'.vn12')??0)<=-10);}
  sync(){if(!this.patchbay)return;const p=this.patchbay,wasPowered=this.powered;const boardAC=this.stripOn&&this.boardSwitch&&p.linked('outlet.trainer','trainer.ac');this.powered=boardAC;this.keyboardConnected=boardAC&&p.linked('keyboard.ps2','trainer.ps2');
    const drivers={};if(this.stripOn){drivers['outlet.trainer']=230;drivers['outlet.scope']=230;}if(boardAC){drivers['trainer.v5']=5;drivers['trainer.gnd']=0;drivers['trainer.v12']=12;drivers['trainer.vn12']=-12;drivers['trainer.sod']=this.cpu.sod*5;for(let n=0;n<2;n++)for(let port=0;port<3;port++){const chip=this.ppis[n],mask=chip.outputMask(port),pins=chip.pins(port);for(let b=0;b<8;b++)if(mask&1<<b)drivers[`trainer.ppi${n}.${'ABC'[port]}${b}`]=(pins>>b&1)*5;}for(let n=0;n<3;n++)drivers[`trainer.pit${n}.out`]=this.timer.channels[n].out*5;}
    drivers['source.out']=this.generator.value(this.time);drivers['source.gnd']=0;drivers['scope.gnd']=0;drivers['scope.ch1.gnd']=0;drivers['scope.ch2.gnd']=0;drivers['scope.comp']=(Math.floor(this.time*2000)%2?5:0);
    for(let n=0;n<8;n++)drivers['logic.'+n]=this.switches[n]*5;
    p.resolve(drivers);
    if(boardAC)for(let n=0;n<3;n++){const gate=`trainer.pit${n}.gate`,clock=`trainer.pit${n}.clock`;this.timer.gate(n,p.digital(gate,1));this.timer.channels[n].externalClock=p.voltage(clock)!==null;if(this.timer.channels[n].externalClock){const high=p.digital(clock,0);if(high&&!this._lastPitClock[n])this.timer.clocks(n,1);this._lastPitClock[n]=high;drivers[`trainer.pit${n}.out`]=this.timer.channels[n].out*5;}}
    this.modulePower={dac:this._railOK('dac',true),adc:this._railOK('adc'),led:this._railOK('led'),motor:this._railOK('motor')&&(p.voltage('motor.v12')??0)>10};
    this.studyBusConnected=BUS_SIGNALS.filter(s=>!s.startsWith('NC')).every(s=>p.linked(busTerminal('trainer.bus',s),busTerminal('led.bus',s)));
    if(this.modulePower.led){for(let port=0;port<3;port++){const mask=this.studyPPI.outputMask(port),pins=this.studyPPI.pins(port);for(let b=0;b<8;b++)if(mask&1<<b)drivers[`led.${'ABC'[port]}${b}`]=(pins>>b&1)*5;}p.resolve(drivers);}
    if(this.modulePower.dac){for(let n=0;n<2;n++){const port='AB'[n];let code=0;for(let b=0;b<8;b++)code|=p.digital(`dac.${port}${b}`,0)<<b;this.dacs[n].code=code;const trim=this.dacTrim[n];this.dacVoltages[n]=clamp(-5*code/256*trim.gain+trim.offset,-10.5,10.5);}drivers['dac.x']=this.dacVoltages[0];drivers['dac.y']=this.dacVoltages[1];}else this.dacVoltages=[0,0];
    if(this.modulePower.adc){let channel=0;for(let b=0;b<3;b++)channel|=p.digital('adc.C'+b,0)<<b;const pulse=!!p.digital('adc.C3',0);if(pulse&&!this.adcStart){this.adc.channel=channel;this.adc.busy=false;this.adc.eoc=0;}if(!pulse&&this.adcStart){this.adc.start(this.time,this.analogInput(this.adc.channel));}this.adcStart=pulse;this.adc.oe=true;drivers['adc.C7']=this.adc.eoc*5;for(let b=0;b<8;b++)drivers['adc.B'+b]=(this.adc.code>>b&1)*5;}
    p.resolve(drivers);
    if(this.modulePower.led)for(let port=0;port<3;port++){let v=0;for(let b=0;b<8;b++)v|=p.digital(`led.${'ABC'[port]}${b}`,0)<<b;this.studyPPI.setInput(port,v);}
    if(boardAC){for(let n=0;n<2;n++)for(let port=0;port<3;port++){let v=0;for(let b=0;b<8;b++)v|=p.digital(`trainer.ppi${n}.${'ABC'[port]}${b}`,1)<<b;this.ppis[n].setInput(port,v);}this.cpu.sid=p.digital('trainer.sid',0);for(const name of ['rst75','rst65','rst55'])this.cpu.setLine(name.toUpperCase(),p.digital('trainer.'+name,0));}
    this.ledBytes=[0,0,0];if(this.modulePower.led)for(let port=0;port<3;port++){let v=0;for(let b=0;b<8;b++)v|=p.digital(`led.${'ABC'[port]}${b}`,0)<<b;this.ledBytes[port]=v^(this.activeLowLED?255:0);}
    let phase=0;if(this.modulePower.motor)for(let b=0;b<4;b++)phase|=p.digital('motor.A'+b,0)<<b;this._motorPhase(phase);
    this.conflictText=p.conflicts.length?`Conflicting drivers on ${p.conflicts.length} connected net${p.conflicts.length>1?'s':''}`:'';if(wasPowered&&!boardAC)this.cpu.halted=true;
  }
  analogInput(channel){const source=this.adcInputSources[channel];return source==='generator'?this.generator.value(this.time):source==='jack'?(this.nodeVoltageAt('adc.in'+channel,this.time)??0):this.adcInputs[channel];}
  nodeVoltageAt(id,t=this.time){const p=this.patchbay;if(p.linked(id,'source.out'))return this.generator.value(t);if(p.linked(id,'scope.comp'))return Math.floor(t*2000)%2?5:0;for(let n=0;n<3;n++)if(p.linked(id,`trainer.pit${n}.out`)){const c=this.timer.channels[n];if(this.powered&&c.enabled&&c.gate&&!c.externalClock&&[2,3].includes(c.mode)){const phase=((c.phase+c.clockPhase+(t-this.time)*c.clock)%c.reload+c.reload)%c.reload;return 5*(c.mode===3?+(phase<Math.ceil(c.reload/2)):+(phase<c.reload-1));}return this.powered?c.out*5:null;}return p.voltage(id);}
  _motorPhase(phase){const m=this.motor;if(phase===m.phase)return;m.phase=phase;if(!phase){m.rpm=0;return;}const order=[1,5,4,6,2,10,8,9],index=order.indexOf(phase);if(index<0){m.invalid++;m.index=null;return;}if(m.index!==null){let delta=(index-m.index+8)%8;if(delta>4)delta-=8;if(Math.abs(delta)>2){m.invalid++;}else if(delta){const degrees=delta*m.stepAngle/2;m.angle+=degrees;m.steps+=Math.abs(delta)/2;const dt=this.time-m.lastStep;if(dt>0)m.rpm=degrees/360/dt*60;}}m.index=index;m.lastStep=this.time;}
  scopePower(){return this.scopeSwitch&&this.stripOn&&this.patchbay.linked('outlet.scope','scope.ac');}
  probeVoltage(n,t=this.time){const p=this.patchbay,tip=`scope.ch${n+1}.tip`,ground=`scope.ch${n+1}.gnd`;if(!this.scopePower())return null;const reference=p.linked(tip,'scope.comp')?'scope.gnd':p.linked(tip,'source.out')?'source.gnd':'trainer.gnd';if(!['scope.gnd','scope.ch1.gnd','scope.ch2.gnd'].some(g=>p.linked(g,reference)))return null;
    const v=this.nodeVoltageAt(tip,t);return v===null?null:v/this.probes[n].physical;}
  tick(t){if(!this.patchbay)return;const seconds=t/this.clock,end=this.time+seconds,wasBusy=this.adc.busy,oldTimer=this.timer.channels.map(c=>c.out);if(this.powered&&this.timer.channels.some(c=>c.enabled))this.timer.advance(seconds);this.adc.tick(end);this.time=end;if(wasBusy!==this.adc.busy||oldTimer.some((v,n)=>v!==this.timer.channels[n].out)||this._lastSod!==this.cpu.sod){this._lastSod=this.cpu.sod;this.sync();}const period=1/this.scopeRate;if(end-this.nextSample>8191*period)this.nextSample=end-8191*period;let steps=0;while(this.nextSample<=end&&steps++<8192){this.sample(this.nextSample);this.nextSample+=period;}if(steps>=8192)this.nextSample=end+period;}
  sample(t){if(!this.patchbay)return;const ch1=this.probeVoltage(0,t),ch2=this.probeVoltage(1,t);this.scope.push({t,ch1,ch2,dac:this.dacVoltages[0],dacY:this.dacVoltages[1],input:this.generator.value(t),adc:this.adc.code*this.adc.vref/256,a:this.ppis[0].pins(0),b:this.ppis[0].pins(1),c:this.ppis[0].pins(2),ledA:this.ledBytes[0],ledB:this.ledBytes[1],ledC:this.ledBytes[2],eoc:this.adc.eoc,sid:this.cpu.sid,sod:this.cpu.sod,ext:this.patchbay.voltage('scope.ext.tip')});}
  oneInstruction(){if(!this.powered)throw new Error('Connect AC power and switch the trainer on');if(this.cpu.pc===0x28){this.cpu.pc=this.cpu.pop();this.cpu.halted=true;return {monitorReturn:true,pc:this.cpu.pc};}return this.cpu.step();}
  setup(kind='dac'){
    this.studySingleStep=false;this.patchbay.clear();this.cable('outlet.trainer','trainer.ac','mains','#25252a');this.cable('outlet.scope','scope.ac','mains','#25252a');this.cable('keyboard.ps2','trainer.ps2','keyboard','#4b436e');this.boardSwitch=true;this.scopeSwitch=true;
    const target=kind==='motor'?'motor':kind==='adc'?'adc':kind==='id'?'led':'dac';if(kind==='id')this.cable('trainer.bus','led.bus','bus');else{this.cable('trainer',target,'power');this.cable(kind==='motor'?'trainer.ppi1':'trainer.ppi0',target,'frc');}
    if(kind!=='id'&&kind!=='motor')this.cable('trainer.bus','led.bus','bus');
    if(kind==='dac'){this.cable('scope.ch2.tip','dac.x','probe','#29292c');this.cable('scope.ch2.gnd','dac.gnd','ground','#353535');}
    if(kind==='adc'){this.cable('source.out','adc.in0','jumper','#dfa73b');this.cable('source.gnd','adc.gnd','ground','#29292c');this.cable('trainer','dac','power'); // ADC data B and DAC data A share a parallel bus.
      this.cable('trainer.ppi0','dac','frc');this.cable('scope.ch2.tip','dac.x','probe');this.cable('scope.ch2.gnd','dac.gnd','ground');}
    this.sync();return target;
  }
}
