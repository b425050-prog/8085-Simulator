import test from 'node:test';
import assert from 'node:assert/strict';
import {DeskLab} from '../src/desk-lab.js';
import {TrainerMonitor} from '../src/monitor.js';
import {TDS2001C,measurement} from '../src/tds2001c.js';
import {formatVolts,scopeMenuTitle} from '../src/tds-display.js';
import {turnDACTrim,turnADCLevel,circuitHint} from '../src/instrument-controls.js';
import {terminalName} from '../src/legibility.js';

test('all four physical DAC trimmer IDs adjust the correct channel and parameter',()=>{
  const l=new DeskLab();l.setup('dac');l.output(3,0x80);l.output(0,128);l.output(1,64);
  turnDACTrim(l,'dac-gain0',5);assert.equal(l.dacTrim[0].gain,1.1);assert.equal(l.dacVoltages[0],-2.75);assert.equal(l.dacVoltages[1],-1.25);
  turnDACTrim(l,'dac-offset0',2);assert.equal(l.dacVoltages[0],-2.65);
  turnDACTrim(l,'dac-gain1',-5);assert.equal(l.dacTrim[1].gain,.9);assert.equal(l.dacVoltages[1],-1.125);
  turnDACTrim(l,'dac-offset1',4);assert.equal(l.dacVoltages[1],-.925);
  turnDACTrim(l,'dac-offset1',1000);assert.equal(l.dacTrim[1].offset,5);
  assert.throws(()=>turnDACTrim(l,'dac-gain3',1),/Unknown/);
});

test('fine DAC adjustment and local ADC VIN controls change the sampled voltage',()=>{
  const l=new DeskLab();l.setup('adc');turnDACTrim(l,'dac-gain0',1,true);assert.equal(l.dacTrim[0].gain,1.001);
  l.adcInputSources[0]='jack';turnADCLevel(l,100);assert.equal(l.adcInputSources[0],'knob');assert.equal(l.adcInputs[0],5);
  l.output(3,0x8A);l.output(2,8);l.output(2,0);l.tick(l.clock*.0002);assert.equal(l.input(1),255);
});

test('scope menu names are one-based and millivolt labels retain significant zeros',()=>{
  assert.equal(scopeMenuTitle('channel0'),'CH1');assert.equal(scopeMenuTitle('channel1'),'CH2');
  assert.deepEqual([.002,.02,.1,.2,.5,1,5].map(formatVolts),['2 mV','20 mV','100 mV','200 mV','500 mV','1 V','5 V']);
});

test('missing measurements show unavailable rather than a false zero voltage',()=>{
  assert.equal(measurement([{t:0,c0:null}],'c0','Mean'),'—');
  assert.equal(measurement([{t:0,c0:0}],'c0','Mean'),'0.000V');
});

test('autoset on CH1 selects CH1 measurements and ignores disconnected CH2 history',()=>{
  const l=new DeskLab();l.setup('dac');l.patchbay.remove(l.patchbay.cables.find(c=>c.a==='scope.ch2.tip').id);l.cable('scope.ch1.tip','dac.y','probe');
  l.scope.clear();for(let i=0;i<5000;i++)l.scope.push({t:i/100000,ch1:.2*Math.sin(i*2*Math.PI/500),ch2:.4*Math.sin(i*2*Math.PI/100)});l.time=.05;
  const s=new TDS2001C(l);s.single=true;s.autoset();
  assert(s.channels[0].enabled);assert(!s.channels[1].enabled);assert(s.measurements.every(m=>m.source===0));assert.equal(s.trigger.source,0);assert.equal(s.single,false);
});

test('autoset preserves explicit mixed measurement sources when both probes are connected',()=>{
  const l=new DeskLab();l.setup('dac');l.cable('scope.ch1.tip','dac.y','probe');
  for(let i=0;i<500;i++)l.scope.push({t:i/100000,ch1:Math.sin(i/20),ch2:Math.cos(i/20)});l.time=.005;
  const s=new TDS2001C(l);s.measurements[0].source=0;s.autoset();assert.equal(s.measurements[0].source,0);assert.equal(s.measurements[1].source,1);
});

test('scope channels share the grounded chassis, with a real circuit return still required',()=>{
  const l=new DeskLab();l.setup('dac');l.cable('scope.ch1.tip','dac.y','probe');l.output(3,0x80);l.output(1,128);
  assert.equal(l.probeVoltage(0),-.25);
  l.patchbay.remove(l.patchbay.cables.find(c=>c.a==='scope.ch2.gnd').id);l.sync();assert.equal(l.probeVoltage(0),null);
  l.cable('scope.gnd','dac.gnd','ground');assert.equal(l.probeVoltage(0),-.25);
});

test('power-on reset clears SC-01 output latches and retains user RAM and counter clocks',()=>{
  const l=new DeskLab();l.setup('id');l.output(0x33,0x80);l.output(0x30,0x42);l.memory[0x2000]=0x76;l.timer.channels[0].clock=2000;
  l.powerOnReset();assert.equal(l.studyPPI.control,0x9B);assert.deepEqual(l.ledBytes,[0,0,0]);assert.equal(l.memory[0x2000],0x76);assert.equal(l.timer.channels[0].clock,2000);assert(l.cpu.halted);assert.equal(l.cpu.sp,0xFFFF);
});

test('bounded terminal history continues updating beyond 2000 committed records',()=>{
  const l=new DeskLab(),m=new TrainerMonitor(l);for(let i=0;i<2050;i++)m.record('NOP','00');
  assert.equal(m.history.length,2000);assert.equal(m.history[0].index,51);assert.equal(m.history.at(-1).index,2050);
  const r=new TrainerMonitor(l);r.restore(m.snapshot());r.record('HLT','76');assert.equal(r.history.at(-1).index,2051);assert.equal(r.historySerial,2051);
});

test('the exact OUT 01 / X probe mismatch produces a useful port hint',()=>{
  const l=new DeskLab();l.traceEnabled=false;l.setup('dac');const m=new TrainerMonitor(l);
  for(const c of '1A2000')m.key(c);m.key('Enter');
  for(const row of ['MVI A 80','OUT 03','MVI A 00','OUT 01','INR A','JMP 2006']){for(const c of row)m.key(c);m.key('Enter');}
  m.reset();for(const c of 'G2000.')m.key(c);for(let i=0;i<3000;i++)l.oneInstruction();
  assert.match(circuitHint(l),/CH2 watches X-OUT.*Y-OUT.*OUT 01/);
  l.patchbay.remove(l.patchbay.cables.find(c=>c.a==='scope.ch2.tip').id);l.cable('scope.ch2.tip','dac.y','probe');assert.equal(circuitHint(l),'');
});

test('connector names follow configured port addresses instead of stale printed numbers',()=>{
  const mapping=[{base:0x40},{base:0x50}];assert.match(terminalName('trainer.ppi0',mapping),/CN4.*40–43/);assert.match(terminalName('dac.y',mapping),/OUT 41/);
  assert.match(terminalName('dac',mapping,'power'),/CN1.*supply/);assert.match(terminalName('dac',mapping,'frc'),/CN2.*I\/O/);
});

test('scope setup recall cannot replace its hardware object or executable methods',()=>{
  const l=new DeskLab(),s=new TDS2001C(l);s.recall({...s.settings(),lab:null,frame:null,run:false});assert.equal(s.lab,l);assert.equal(typeof s.frame,'function');assert(s.run);
});
