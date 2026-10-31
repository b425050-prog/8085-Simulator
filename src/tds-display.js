import {measurement} from './tds2001c.js';
import {formatTime,formatHz} from './scope.js';
const COLORS=['#fff34c','#71eaff'];
export const scopeMenuTitle=menu=>menu==='channel0'?'CH1':menu==='channel1'?'CH2':({save:'SAVE / REC',measurement:'MEASURE',horizontal:'HORIZONTAL'})[menu]||menu.toUpperCase();
export const formatVolts=v=>Number((v<1?v*1000:v).toPrecision(3))+(v<1?' mV':' V');
const txt=(ctx,text,x,y,color='#f4f6ef',size=20,maxWidth)=>{ctx.fillStyle=color;ctx.font=`${size}px Consolas,monospace`;if(maxWidth===undefined)ctx.fillText(String(text),x,y);else ctx.fillText(String(text),x,y,maxWidth);};
function lines(text,width=14){const words=String(text).split(' '),out=[];let line='';for(const word of words){if(line&&line.length+word.length+1>width){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
export class TDSDisplay {
  constructor(canvas,tds){this.canvas=canvas;this.tds=tds;this.persistence=[];this.lastSettings='';}
  draw(){
    const s=this.tds,c=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height;
    c.clearRect(0,0,w,h);
    if(!s.lab.scopePower()){c.fillStyle='#171e1b';c.fillRect(0,0,w,h);return;}
    const frame=s.frame(),a={x:30,y:48,w:660,h:480},points=frame.points;
    c.fillStyle='#073db6';c.fillRect(0,0,w,h);c.fillStyle='#090c0e';c.fillRect(a.x,a.y,a.w,a.h);
    c.save();c.strokeStyle='#748080';c.lineWidth=1;c.setLineDash([1,7]);
    for(let x=0;x<=10;x++){c.beginPath();c.moveTo(a.x+x*a.w/10,a.y);c.lineTo(a.x+x*a.w/10,a.y+a.h);c.stroke();}
    for(let y=0;y<=8;y++){c.beginPath();c.moveTo(a.x,a.y+y*a.h/8);c.lineTo(a.x+a.w,a.y+y*a.h/8);c.stroke();}
    c.setLineDash([]);c.strokeStyle='#b5bfbb';c.strokeRect(a.x,a.y,a.w,a.h);c.restore();
    txt(c,'Tek',9,31,'#fff',29);
    if(!s.run){c.fillStyle='#fb4b48';c.beginPath();c.arc(205,22,9,0,Math.PI*2);c.fill();}
    txt(c,s.run?(frame.triggered?'T Trig’d':'T Auto'):'Stop',s.run?170:224,29,s.run?'#b9ff9a':'#fff',21);
    txt(c,'M Pos: '+formatTime(s.hpos),397,29,'#fff',20);txt(c,scopeMenuTitle(s.menu),718,29,'#fff',18,175);
    const stamp=JSON.stringify([s.channels,s.tdiv,s.hpos,s.display.format,s.math,s.run]);
    if(stamp!==this.lastSettings){this.persistence=[];this.lastSettings=stamp;}
    if(s.display.persistence!=='Off'&&s.run){this.persistence.push({frame,time:performance.now()/1000});const duration=s.display.persistence==='Infinite'?Infinity:parseInt(s.display.persistence);this.persistence=this.persistence.filter(p=>performance.now()/1000-p.time<duration).slice(-50);c.save();c.globalAlpha=.12;for(const past of this.persistence)this.traces(c,a,past.frame);c.restore();}
    this.traces(c,a,frame);
    for(let n=0;n<2;n++)if(s.refEnabled[n]&&s.references[n]?.length){const ref=s.references[n],begin=ref[0].t,span=ref.at(-1).t-begin||1;this.plot(c,a,ref,p=>a.x+(p.t-begin)/span*a.w,p=>a.y+a.h/2-p.v/s.channels[n].vdiv*a.h/8,n?'#b0c9ff':'#ffc96d',false,true);}
    for(let n=0;n<2;n++)if(s.channels[n].enabled){const ch=s.channels[n],y=a.y+a.h/2-ch.position*a.h/8;if(y>=a.y&&y<=a.y+a.h){c.fillStyle=COLORS[n];c.beginPath();c.moveTo(a.x-12,y-7);c.lineTo(a.x,y);c.lineTo(a.x-12,y+7);c.fill();txt(c,n+1,4,y+6,COLORS[n],18);}}
    if(s.showTrigger||s.menu==='trigger'){const ch=s.channels[s.trigger.source<2?s.trigger.source:0],y=a.y+a.h/2-(s.trigger.level/ch.vdiv+ch.position)*a.h/8;if(y>=a.y&&y<=a.y+a.h){c.strokeStyle='#a7ef94';c.setLineDash([4,6]);c.beginPath();c.moveTo(a.x,y);c.lineTo(a.x+a.w,y);c.stroke();c.setLineDash([]);txt(c,'T',a.x+a.w-20,y-5,'#b9ff9a',18);}}
    this.cursors(c,a,frame);
    const soft=s.softkeys();
    for(let n=0;n<5;n++){
      const y=48+n*96;c.strokeStyle='#a9c2ee';c.beginPath();c.moveTo(711,y+94);c.lineTo(893,y+94);c.stroke();if(!soft[n])continue;
      const measured=s.menu==='measure',label=measured?soft[n].label+' '+soft[n].value:soft[n].label,value=measured?measurement(points,'c'+s.measurements[n].source,s.measurements[n].type):soft[n].value;
      txt(c,label,717,y+23,'#f5f8ed',measured?18:21,174);
      lines(value,13).slice(0,2).forEach((line,j)=>txt(c,line,717,y+55+j*25,measured?COLORS[s.measurements[n].source]:'#fff',23,174));
    }
    for(let n=0;n<2;n++)if(s.channels[n].enabled)txt(c,'CH'+(n+1)+' '+formatVolts(s.channels[n].vdiv),35+n*240,560,COLORS[n],24,230);
    txt(c,'M '+formatTime(s.tdiv),510,560,'#fff',23,190);
    const source=['CH1','CH2','EXT','EXT/5','LINE'][s.trigger.source];txt(c,source+' '+(s.trigger.slope==='Rising'?'↗':'↘'),723,558,COLORS[s.trigger.source]||'#b9ff9a',19);
    txt(c,s.trigger.level.toFixed(2)+' V',723,584,COLORS[s.trigger.source]||'#b9ff9a',19);
    txt(c,s.acquisition+'  '+formatHz(s.lab.scopeRate).replace('Hz','S/s'),34,587,'#d4e4ff',17,490);
    if(s.message){c.fillStyle='#0d2851ec';c.fillRect(36,491,647,30);txt(c,s.message,43,513,'#f4f5e9',18,631);}
    if(s.limitEnabled)txt(c,'LIMIT FAIL '+s.limitFailures,44,77,'#ffd392',18);
    c.fillStyle=`rgba(225,240,231,${Math.max(0,(70-s.display.contrast)/1100)})`;c.fillRect(0,0,w,h);this.lastFrame=frame;return frame;
  }
  volts(v){return formatVolts(v);}
  plot(c,a,points,x,y,color,dots=false,continuous=false){c.save();c.beginPath();c.rect(a.x,a.y,a.w,a.h);c.clip();c.lineWidth=1.7;c.strokeStyle=color;c.fillStyle=color;c.shadowColor=color;c.shadowBlur=.6;c.beginPath();let prev=null;for(const p of points){const xx=x(p),yy=y(p);if(!Number.isFinite(xx)||!Number.isFinite(yy)){prev=null;continue;}if(dots){c.fillRect(xx,yy,1.6,1.6);continue;}if(prev===null)c.moveTo(xx,yy);else{if(!continuous)c.lineTo(xx,prev);c.lineTo(xx,yy);}prev=yy;}if(!dots)c.stroke();c.restore();}
  traces(c,a,frame){const s=this.tds,{points,start,end}=frame,tx=p=>a.x+(p.t-start)/(end-start)*a.w,dots=s.display.type==='Dots';if(s.display.format==='XY'){this.plot(c,a,points,p=>p.c0===null?NaN:a.x+a.w/2+(p.c0/s.channels[0].vdiv+s.channels[0].position)*a.w/10,p=>p.c1===null?NaN:a.y+a.h/2-(p.c1/s.channels[1].vdiv+s.channels[1].position)*a.h/8,COLORS[1],dots,true);return;}
    for(let n=0;n<2;n++){const ch=s.channels[n];if(ch.enabled)this.plot(c,a,points,tx,p=>p['c'+n]===null?NaN:a.y+a.h/2-(p['c'+n]/ch.vdiv+ch.position)*a.h/8,COLORS[n],dots);}
    if(!s.math.enabled)return;if(s.math.operation==='FFT'){const bins=s.fft(points),maxHz=bins.at(-1)?.hz||1;if(!bins.length)return;const values=bins.map(b=>({...b,v:s.math.units==='dBVrms'?20*Math.log10(Math.max(1e-12,b.amplitude/Math.SQRT2)):b.amplitude/Math.SQRT2}));this.plot(c,a,values,b=>a.x+b.hz/maxHz*a.w,b=>a.y+a.h/2-(b.v/s.math.scale+s.math.position)*a.h/8,'#ef9df4',false,true);txt(c,'FFT 0 — '+formatHz(maxHz),44,80,'#ef9df4',18);}else this.plot(c,a,points,tx,p=>{if(p.c0===null||p.c1===null)return NaN;const v=s.math.operation==='+'?p.c0+p.c1:s.math.operation==='×'?p.c0*p.c1:p.c0-p.c1;return a.y+a.h/2-(v/s.math.scale+s.math.position)*a.h/8;},'#ef9df4',dots);
  }
  cursors(c,a,frame){const s=this.tds,k=s.cursors;if(k.type==='Off')return;c.save();c.strokeStyle='#fbf0d5';c.setLineDash([5,4]);for(const v of [k.a,k.b]){c.beginPath();if(k.type==='Time'){const x=a.x+a.w*v;c.moveTo(x,a.y);c.lineTo(x,a.y+a.h);}else{const y=a.y+a.h*v;c.moveTo(a.x,y);c.lineTo(a.x+a.w,y);}c.stroke();}c.setLineDash([]);const delta=Math.abs(k.b-k.a);txt(c,k.type==='Time'?'Δt '+formatTime(delta*(frame.end-frame.start))+'  1/Δt '+formatHz(1/(delta*(frame.end-frame.start))):'ΔV '+(delta*8*s.channels[k.source].vdiv).toFixed(3)+'V',44,80,'#fbf0d5',18);c.restore();}
}
