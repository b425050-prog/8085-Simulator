import {clamp} from './peripherals.js';

export function turnDACTrim(lab,control,steps,fine=false){
  const match=/^dac-(gain|offset)([01])$/.exec(control);
  if(!match||!Number.isFinite(steps))throw new Error('Unknown DAC trimmer');
  const parameter=match[1],channel=Number(match[2]),trim=lab.dacTrim[channel];
  trim[parameter]=parameter==='gain'
    ?clamp(trim.gain+steps*(fine?.001:.02),.1,2.2)
    :clamp(trim.offset+steps*(fine?.005:.05),-5,5);
  lab.sync();return {parameter,channel,value:trim[parameter]};
}

export function turnADCLevel(lab,steps,fine=false){
  const channel=lab.adcChannel;
  lab.adcInputSources[channel]='knob';
  lab.adcInputs[channel]=clamp(lab.adcInputs[channel]+steps*(fine?.005:.05),0,lab.adc.vref);
  lab.sync();return {channel,value:lab.adcInputs[channel]};
}

export function circuitHint(lab){
  if(!lab.powered)return 'Connect trainer AC power, then switch it ON.';
  if(!lab.modulePower.dac)return '';
  const range=[{min:Infinity,max:-Infinity},{min:Infinity,max:-Infinity}],buffer=lab.scope;
  for(let i=0;i<Math.min(512,buffer.length);i++){
    const p=buffer.data[(buffer.head-1-i+buffer.capacity)%buffer.capacity];
    for(let n=0;n<2;n++){const v=p?.[n?'dacY':'dac'];if(Number.isFinite(v)){range[n].min=Math.min(range[n].min,v);range[n].max=Math.max(range[n].max,v);}}
  }
  const moving=range.map(r=>r.max-r.min>.06);
  for(let channel=0;channel<2;channel++)for(let n=0;n<2;n++){
    if(lab.patchbay.linked(`scope.ch${channel+1}.tip`,n?'dac.y':'dac.x')&&!moving[n]&&moving[1-n]){
      const watched=n?'Y':'X',active=n?'X':'Y',port=(lab.mapping[0].base+1-n).toString(16).toUpperCase().padStart(2,'0');
      return `CH${channel+1} watches ${watched}-OUT (DC). ${active}-OUT is changing: OUT ${port}.`;
    }
  }
  return '';
}
