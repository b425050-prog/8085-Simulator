// Image-generation output is used only as a photographic surface. All displays,
// key handling, terminal locations, cable nets and instrument state remain live.
const SHEET={w:1758,h:895};
const CROPS={
  scope:{x:249,y:113,w:614,h:330},trainer:{x:886,y:303,w:554,h:363},
  dac:{x:912,y:111,w:265,h:185},motor:{x:1200,y:111,w:280,h:183},
  adc:{x:270,y:446,w:263,h:185},led:{x:562,y:445,w:294,h:183},
  keyboard:{x:740,y:674,w:730,h:187},source:{x:585,y:645,w:139,h:113},
  outlet:{x:285,y:87,w:218,h:32}
};
const SCOPE_BUTTONS={
  autorange:[654,152],save:[692,152],measure:[728,152],acquire:[765,152],help:[800,152],
  ref:[654,180],utility:[692,180],cursor:[728,180],display:[765,180],default:[800,180],
  autoset:[833,151],single:[833,180],run:[833,202],print:[606,211],
  ch1:[654,264],math:[687,264],ch2:[720,264],horiz:[780,254],zero:[780,280],
  trigger:[833,254],half:[833,281],force:[833,309],trigview:[833,337]
};
const SCOPE_KNOBS={multi:[607,165,24],p1:[655,225,28],p2:[719,225,28],hpos:[782,225,28],level:[833,225,35],v1:[655,316,39],v2:[719,316,39],time:[780,337,41]};
function photoCap(button,x,y,diameter){
  const size=parseFloat(button.style.width)||button.getBoundingClientRect().width;
  const k=size/diameter;
  button.classList.add('photo-rotary');
  button.style.setProperty('--cap-width',SHEET.w*k+'px');button.style.setProperty('--cap-height',SHEET.h*k+'px');
  button.style.setProperty('--cap-x',(-x*k+size/2)+'px');button.style.setProperty('--cap-y',(-y*k+size/2)+'px');
}
export function applyPhotographicSkins(){
  for(const [id,crop]of Object.entries(CROPS)){
    const el=document.getElementById('equipment-'+id);if(!el)continue;
    const sx=parseFloat(el.style.width)/crop.w,sy=parseFloat(el.style.height)/crop.h;
    el.classList.add('photo-equipment');el.style.setProperty('--photo-width',SHEET.w*sx+'px');el.style.setProperty('--photo-height',SHEET.h*sy+'px');
    el.style.setProperty('--photo-x',-crop.x*sx+'px');el.style.setProperty('--photo-y',-crop.y*sy+'px');
  }
  const scope=document.getElementById('equipment-scope'),c=CROPS.scope,sx=940/c.w,sy=505/c.h;
  const point=(x,y)=>[(x-c.x)*sx,(y-c.y)*sy];
  for(const [name,[x,y]]of Object.entries(SCOPE_BUTTONS)){
    const b=scope.querySelector(`[data-scope-button="${name}"]`);if(!b)continue;const [left,top]=point(x,y);
    const width=name==='print'?29:name==='ch1'||name==='ch2'||name==='math'?36:name==='default'?47:35,height=name==='print'?29:24;
    Object.assign(b.style,{left:left-width/2+'px',top:top-height/2+'px',width:width+'px',height:height+'px'});
  }
  for(const [name,[x,y,d]]of Object.entries(SCOPE_KNOBS)){
    const b=scope.querySelector(`[data-knob="${name}"]`),[left,top]=point(x,y),size=d*sx;
    Object.assign(b.style,{width:size+'px',height:size+'px'});Object.assign(b.parentElement.style,{left:left-size/2+'px',top:top-size/2+'px',width:size+'px'});
    photoCap(b,x,y,d);
  }
  const jacks={'scope.ch1.tip':[655,374],'scope.ch2.tip':[720,374],'scope.ext.tip':[779,374],'scope.gnd':[588,374],'scope.comp':[588,351],'scope.ch1.gnd':[655,402],'scope.ch2.gnd':[720,402]};
  for(const [id,[x,y]]of Object.entries(jacks)){
    const b=scope.querySelector(`[data-terminal="${id}"]`);if(!b)continue;
    const [left,top]=point(x,y),style=getComputedStyle(b),w=parseFloat(style.width),h=parseFloat(style.height);
    Object.assign(b.style,{left:left-w/2+'px',top:top-h/2+'px'});
  }
  // Trimmers retain their functional positions and use a photographed metal cap.
  for(const b of document.querySelectorAll('.module-pcb [data-knob]'))photoCap(b,477,500,27);
  // The later close-ups supply a sharper, separately rectified trainer and motor.
  // Coordinates are in each equipment's own CSS space, so moving the equipment
  // also moves its actual wire endpoints and every live control with the photo.
  const trainer=document.getElementById('equipment-trainer');
  const place=(root,selector,left,top,width,height)=>{
    const el=root.querySelector(selector);if(!el)return;
    Object.assign(el.style,{left:left+'px',top:top+'px',...(width?{width:width+'px'}:{}),...(height?{height:height+'px'}:{})});
  };
  place(trainer,'[data-connector="trainer.ppi1"]',321,47,113,26);
  place(trainer,'[data-connector="trainer.ppi0"]',455,48,103,26);
  place(trainer,'[data-connector="trainer.power"]',843,172,76);
  place(trainer,'[data-connector="trainer.ps2"]',835,407,62,62);
  place(trainer,'.pit-header',242,49);
  place(trainer,'#trainer-power',849,87);
  place(trainer,'#trainer-red-led',809,81);
  place(trainer,'#trainer-power-led',809,116);
  const motor=document.getElementById('equipment-motor');
  place(motor,'[data-connector="motor"]',78,178,103,26);
  place(motor,'[data-connector="motor.power"]',26,178,44);
  for(let i=0;i<4;i++)place(motor,'#coil-'+i,[47,98,149,204][i],108);
  const led=document.getElementById('equipment-led');
  place(led,'[data-connector="led.power"]',366,172,76);
  place(led,'[data-connector="led"]',134,191,93,26);
  const lx=443/1536,ly=279/1024;
  const lamp=(selector,x,y)=>place(led,selector,x*lx-19-6,y*ly-36-6,12,12);
  const pa=[950,995,1039,1084,1129,1174,1218,1264],pb=[840,885,931,977,1022,1068,1114,1159],pc=[312,356,400,444,488,533,576,621],ad=[350,396,441,488,535,581,628,674];
  for(let b=0;b<8;b++){
    lamp('#id-lamp-0-'+b,pa[b],905);lamp('#id-lamp-1-'+b,pb[b],138);lamp('#id-lamp-2-'+b,1403,pc[b]);lamp('#study-data-'+b,ad[b],138);
    for(let p=0;p<3;p++){const el=led.querySelector('#id-lamp-'+p+'-'+b);el.title=`P${'ABC'[p]}${b}`;el.setAttribute('aria-label',el.title);}
  }
  ['cs','a0','a1','rd','wr'].forEach((name,i)=>lamp('#study-signal-'+name,627,[334,380,424,470,516][i]));
}
