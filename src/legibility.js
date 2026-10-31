import {hex} from './isa.js';

const ANNOTATIONS=[
  ['trainer','connector','trainer.bus','CN1',76,104],
  ['trainer','note','','CN2',285,123],
  ['trainer','connector','trainer.ppi1','CN3',396,127],
  ['trainer','connector','trainer.ppi0','CN4',525,127],
  ['trainer','connector','trainer.power','CN5',902,174],
  ['trainer','note','','CN6 · SERIAL',851,341],
  ['trainer','connector','trainer.ps2','CN7',889,507],
  ['dac','connector','dac.power','CN1 · SUPPLY',88,281],
  ['dac','connector','dac','CN2 · I/O',235,281],
  ['dac','terminal','dac.x','X-OUT',366,114],
  ['dac','terminal','dac.y','Y-OUT',186,137],
  ['dac','terminal','dac.gnd','GND',377,252],
  ['adc','connector','adc.power','CN1 · SUPPLY',66,301],
  ['adc','connector','adc','CN2 · I/O',242,301],
  ['motor','connector','motor.power','CN1',82,282],
  ['motor','connector','motor','CN2',161,282],
  ['led','connector','led.bus','CN1 · CPU BUS',48,49],
  ['led','connector','led','CN2 · PORTS',216,219],
  ['scope','terminal','scope.ch1.tip','CH1',622,376],
  ['scope','terminal','scope.ch2.tip','CH2',721,376],
  ['scope','terminal','scope.ch1.gnd','CH1 GND',622,472],
  ['scope','terminal','scope.ch2.gnd','CH2 GND',721,472],
  ['scope','terminal','scope.gnd','GND',519,426]
];

export function terminalName(id,mapping,type){
  if(type==='power'&&!id.endsWith('.power'))id+='.power';
  const base=mapping?.[0]?.base??0,second=mapping?.[1]?.base??0x30;
  const names={
    'trainer.ppi0':`CN4 · analog ${hex(base)}–${hex(base+3)}`,
    'trainer.ppi1':`CN3 · motor ${hex(second)}–${hex(second+3)}`,
    'trainer.bus':'Trainer CN1 · CPU bus','led.bus':'SC-01 CN1 · CPU bus',
    'trainer.power':'Trainer CN5 · supply','trainer':'Trainer supply',
    'dac':'DAC CN2 · I/O','dac.power':'DAC CN1 · supply',
    'adc.power':'ADC CN1 · supply','motor.power':'Motor CN1 · supply','led.power':'SC-01 supply',
    'trainer.ps2':'Trainer CN7 · keyboard','keyboard.ps2':'Keyboard PS/2 plug',
    'outlet.trainer':'AC outlet 1','outlet.scope':'AC outlet 2',
    'trainer.ac':'Trainer AC inlet','scope.ac':'Scope AC inlet',
    'dac.x':`DAC X-OUT · OUT ${hex(base)}`,'dac.y':`DAC Y-OUT · OUT ${hex(base+1)}`,
    'dac.gnd':'DAC GND','scope.gnd':'Scope chassis GND',
    'scope.ch1.tip':'CH1 probe tip','scope.ch2.tip':'CH2 probe tip',
    'scope.ch1.gnd':'CH1 ground clip','scope.ch2.gnd':'CH2 ground clip',
    'adc':'ADC CN2 · I/O','motor':'Motor CN2 · I/O','led':'SC-01 CN2 · port pins'
  };
  return names[id]||id;
}

function ink(root,text,x,y,cls=''){const el=document.createElement('span');el.className='hardware-ink '+cls;el.textContent=text;Object.assign(el.style,{left:x+'px',top:y+'px'});root.append(el);return el;}

export function initializeLegibility(){
  const layer=document.createElement('div');layer.id='equipment-labels';layer.setAttribute('aria-label','Equipment connector labels');document.getElementById('desk-transform').append(layer);
  for(const [gear,kind,target,label,x,y]of ANNOTATIONS){
    const el=document.createElement(kind==='note'?'span':'button');el.className='connector-label'+(gear==='scope'?' scope-label':'');el.textContent=label;
    el.dataset.labelGear=gear;el.dataset.labelX=x;el.dataset.labelY=y;
    if(target){el.dataset.wireTarget=target;el.dataset.wireKind=kind;}
    layer.append(el);
  }
  const trainer=document.getElementById('equipment-trainer');
  for(const [label,x,y]of [['8085 CPU',177,226],['8253',298,218],['8255-2',415,225],['8255-1',533,225],['RAM',157,505],['EPROM',237,505]])ink(trainer,label,x,y,'chip-ink vertical-ink');
  ink(trainer,'5V  GND  +12V  −12V',858,222,'supply-ink vertical-ink');
  const scope=document.getElementById('equipment-scope');
  const plate=document.createElement('div');plate.className='scope-nameplate';plate.innerHTML='<strong>Tektronix</strong><b>TDS 2001C</b><small>50 MHz · 500 MS/s</small>';scope.append(plate);
  const captions={autorange:'AutoRange',save:'Save/Recall',measure:'Measure',acquire:'Acquire',help:'Help'};
  const caps={autorange:'',save:'',measure:'',acquire:'',help:'',ref:'Ref',utility:'Utility',cursor:'Cursor',display:'Display',default:'Default<br>Setup',autoset:'Auto<br>Set',single:'Single',run:'Run/<br>Stop',print:'Save',ch1:'1',ch2:'2',math:'Math',horiz:'Horiz',zero:'Set to<br>Zero',trigger:'Trig<br>Menu',half:'Set to<br>50%',force:'Force<br>Trig',trigview:'Trig<br>View'};
  for(const [id,text]of Object.entries(caps)){const el=scope.querySelector(`[data-scope-button="${id}"] span`);if(el)el.innerHTML=text;}
  for(const [id,label]of Object.entries(captions)){const b=scope.querySelector(`[data-scope-button="${id}"]`),el=document.createElement('span');el.className='scope-caption';el.textContent=label;b.append(el);}
  const knobLabels={multi:'MULTIPURPOSE',p1:'POSITION 1',p2:'POSITION 2',hpos:'HORIZ POS',level:'LEVEL',v1:'VOLTS/DIV 1',v2:'VOLTS/DIV 2',time:'TIME/DIV'};
  for(const [id,label]of Object.entries(knobLabels)){const el=scope.querySelector(`[data-knob="${id}"]`).parentElement.querySelector('span');el.textContent=label;}
  ink(document.getElementById('equipment-adc'),'ADC0809',205,150,'chip-ink vertical-ink');
  const led=document.getElementById('equipment-led'),sx=443/1536,sy=279/1024;
  const pa=[950,995,1039,1084,1129,1174,1218,1264],pb=[840,885,931,977,1022,1068,1114,1159],ad=[350,396,441,488,535,581,628,674];
  for(let b=0;b<8;b++){
    ink(led,'PA'+b,pa[b]*sx,215,'bit-ink');ink(led,'PB'+b,pb[b]*sx,27,'bit-ink');ink(led,'AD'+b,ad[b]*sx,27,'bit-ink');
  }
  for(const [label,x,y]of [['8255',266,140],['74LS245',101,108],['74LS245',338,107]])ink(led,label,x,y,'chip-ink vertical-ink');
  const motor=document.getElementById('equipment-motor');for(let i=0;i<4;i++)ink(motor,'PA'+i,[83,134,185,240][i],186,'coil-ink');
  document.getElementById('tek-screen').title='Double-click to enlarge the oscilloscope display';
}

let mappingStamp='';
export function updateLegibility(layout,view,mapping){
  const layer=document.getElementById('equipment-labels');if(!layer)return;
  layer.hidden=view.labels===false;
  layer.style.setProperty('--label-scale',Math.min(2.2,Math.max(.65,.78/view.scale)));
  for(const el of layer.children){const r=layout[el.dataset.labelGear];if(!r)continue;el.style.left=r.x+Number(el.dataset.labelX)+'px';el.style.top=r.y+Number(el.dataset.labelY)+'px';const target=el.dataset.wireTarget;if(target){const name=terminalName(target,mapping);el.title=name;el.setAttribute('aria-label','Wire '+name);}}
  const stamp=JSON.stringify(mapping);if(stamp!==mappingStamp){mappingStamp=stamp;for(const [i,id]of ['trainer.ppi0','trainer.ppi1'].entries()){
    const el=document.querySelector(`#equipment-trainer [data-connector="${id}"]`),name=terminalName(id,mapping);
    el.setAttribute('aria-label',name);el.title=name;for(const pin of el.querySelectorAll('[data-terminal]'))pin.setAttribute('aria-label',name+' '+pin.dataset.terminal.split('.').at(-1));
  }}
}
