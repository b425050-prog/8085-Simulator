// Patch cables are real connections in a shared netlist, not decorative lines.
export class PatchBay {
  constructor(){this.nodes=new Map();this.cables=[];this.nets=new Map();this.compiled=false;this.values=new Map();this.conflicts=[];this.serial=0;}
  node(id,options={}){if(!this.nodes.has(id))this.nodes.set(id,{id,...options});this.compiled=false;return id;}
  connect(a,b,options={}){if(!this.nodes.has(a)||!this.nodes.has(b))throw new Error('Unknown connection terminal');if(a===b)throw new Error('Choose a different terminal');if(this.cables.some(c=>c.a===a&&c.b===b||c.a===b&&c.b===a))throw new Error('These terminals are already connected');const cable={id:'wire-'+(++this.serial),a,b,color:options.color||'#d8ae3a',type:options.type||'jumper',...options};this.cables.push(cable);this.compiled=false;return cable;}
  bundle(a,b,pairs,options={}){if(this.cables.some(c=>c.a===a&&c.b===b||c.a===b&&c.b===a))throw new Error('These connectors are already joined');const cable={id:'wire-'+(++this.serial),a,b,pairs,type:options.type||'frc',color:options.color||'#b8bbc2',...options};for(const [x,y]of pairs)if(!this.nodes.has(x)||!this.nodes.has(y))throw new Error('Unknown connector pin');this.cables.push(cable);this.compiled=false;return cable;}
  remove(id){this.cables=this.cables.filter(c=>c.id!==id);this.compiled=false;}
  clear(){this.cables=[];this.compiled=false;this.values.clear();}
  compile(){const parent=new Map([...this.nodes.keys()].map(k=>[k,k]));const find=k=>{let p=parent.get(k);if(p!==k){p=find(p);parent.set(k,p);}return p;};for(const c of this.cables)for(const [a,b]of c.pairs||[[c.a,c.b]]){if(parent.has(a)&&parent.has(b))parent.set(find(a),find(b));}this.nets=new Map([...parent.keys()].map(k=>[k,find(k)]));this.compiled=true;}
  resolve(drivers){if(!this.compiled)this.compile();const nets=new Map();for(const [id,v]of Object.entries(drivers)){if(v===null||v===undefined||!this.nets.has(id)||!Number.isFinite(v))continue;const net=this.nets.get(id);if(!nets.has(net))nets.set(net,[]);nets.get(net).push({id,v});}this.values=new Map();this.conflicts=[];for(const [net,entries]of nets){const lo=Math.min(...entries.map(e=>e.v)),hi=Math.max(...entries.map(e=>e.v));if(hi-lo>.55){this.values.set(net,null);this.conflicts.push({net,entries});}else this.values.set(net,entries.reduce((sum,e)=>sum+e.v,0)/entries.length);}return this;}
  voltage(id){return this.values.get(this.nets.get(id))??null;}
  digital(id,pull=1){const v=this.voltage(id);return v===null?pull:v>=2?1:0;}
  linked(a,b){if(!this.compiled)this.compile();return this.nets.has(a)&&this.nets.get(a)===this.nets.get(b);}
  restore(cables){const previous=this.cables;this.cables=[];try{for(const c of cables){if(c.pairs)this.bundle(c.a,c.b,c.pairs,c);else this.connect(c.a,c.b,c);}this.serial=Math.max(this.serial,...this.cables.map(c=>parseInt(c.id.split('-')[1])||0));}catch(e){this.cables=previous;this.compiled=false;throw e;}}
}

// 8253 counter model. Gate and clock are exposed at the board's CN2 header.
export class PIT8253 {
  constructor(){this.reset();}
  reset(){this.channels=Array.from({length:3},()=>({mode:0,access:3,bcd:false,reload:65536,count:65536,out:0,gate:1,enabled:false,phase:0,writeLow:null,readHigh:false,latched:null,latchHigh:false,clock:1000,clockPhase:0}));}
  control(v){const n=v>>6;if(n===3)return;const c=this.channels[n],access=v>>4&3;if(!access){if(c.latched===null){c.latched=this.value(n);c.latchHigh=false;}return;}const mode=v>>1&7;c.mode=mode>=6?mode-4:mode;c.access=access;c.bcd=!!(v&1);c.writeLow=null;c.readHigh=false;c.latched=null;c.enabled=false;c.out=c.mode===0?0:1;c.phase=0;}
  decode(v,c){if(!c.bcd)return v||65536;return (v&15)+((v>>4)&15)*10+((v>>8)&15)*100+((v>>12)&15)*1000||10000;}
  load(n,v){const c=this.channels[n];c.reload=this.decode(v,c);c.count=c.reload;c.phase=0;c.enabled=![1,5].includes(c.mode);c.out=c.mode===0?0:1;}
  write(n,v){if(n===3){this.control(v);return;}const c=this.channels[n];if(c.access===1)this.load(n,v);else if(c.access===2)this.load(n,v<<8);else if(c.writeLow===null)c.writeLow=v;else{this.load(n,c.writeLow|v<<8);c.writeLow=null;}}
  value(n){const c=this.channels[n],v=Math.ceil(c.count);if(!c.bcd)return v&65535;return Math.floor(v/1000)%10<<12|Math.floor(v/100)%10<<8|Math.floor(v/10)%10<<4|v%10;}
  read(n){if(n===3)return 255;const c=this.channels[n],v=c.latched??this.value(n);let result;if(c.access===1){result=v&255;c.latched=null;}else if(c.access===2){result=v>>8;c.latched=null;}else if(c.latched!==null){result=c.latchHigh?v>>8:v&255;if(c.latchHigh)c.latched=null;c.latchHigh=!c.latchHigh;}else{result=c.readHigh?v>>8:v&255;c.readHigh=!c.readHigh;}return result&255;}
  gate(n,v){const c=this.channels[n],rise=v&&!c.gate;c.gate=+!!v;if(rise&&[1,2,3,5].includes(c.mode)){c.count=c.reload;c.phase=0;c.enabled=true;if(c.mode===1)c.out=0;}if(!v&&[2,3].includes(c.mode))c.out=1;}
  clocks(n,ticks){const c=this.channels[n];if(!c.enabled||ticks<=0)return;if(!c.gate&&![1,5].includes(c.mode))return;
    if(c.mode===0||c.mode===1){c.count=Math.max(0,c.count-ticks);if(!c.count){c.out=1;c.enabled=false;}}
    else if(c.mode===2){c.phase=(c.phase+ticks)%c.reload;c.count=c.reload-c.phase;c.out=+(c.phase!==c.reload-1);}
    else if(c.mode===3){c.phase=(c.phase+ticks)%c.reload;c.count=c.reload-(c.phase*2%c.reload);c.out=+(c.phase<Math.ceil(c.reload/2));}
    else{c.count-=ticks;if(c.count<=-1){c.out=1;c.enabled=false;c.count=0;}else c.out=+(c.count!==0);}}
  advance(seconds){for(let n=0;n<3;n++){const c=this.channels[n];if(c.externalClock)continue;c.clockPhase+=seconds*c.clock;const ticks=Math.floor(c.clockPhase);c.clockPhase-=ticks;this.clocks(n,ticks);}}
}
