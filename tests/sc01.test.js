import test from 'node:test';
import assert from 'node:assert/strict';
import {DeskLab,BUS_SIGNALS} from '../src/desk-lab.js';
import {TrainerMonitor} from '../src/monitor.js';
import {snapshotDesk,restoreDesk} from '../src/desk-project.js';
import {TDS2001C} from '../src/tds2001c.js';

test('SC-01 uses its own 8255 through a 50-signal powered CPU bus',()=>{
  const l=new DeskLab();l.traceEnabled=false;l.setup('id');
  assert.equal(BUS_SIGNALS.length,50);assert.equal(new Set(BUS_SIGNALS).size,50);
  assert(l.studyBusConnected);assert(l.modulePower.led);
  l.output(0x33,0x80);l.output(0x30,0x42);l.output(0x31,0x50);l.output(0x32,0x50);
  assert.deepEqual(l.ledBytes,[0x42,0x50,0x50]);
  assert.deepEqual(l.studyPPI.latch,[0x42,0x50,0x50]);
  assert.deepEqual(l.ppis[0].latch,[0,0,0]);assert.deepEqual(l.ppis[1].latch,[0,0,0]);
  assert.equal(l.input(0x30),0x42);
  const bus=l.patchbay.cables.find(c=>c.type==='bus');l.patchbay.remove(bus.id);l.sync();
  assert.equal(l.studyBusConnected,false);assert.equal(l.modulePower.led,false);
  assert.deepEqual(l.ledBytes,[0,0,0]);
});

test('SC-01 port header drives actual DAC nets independently of trainer PPI pins',()=>{
  const l=new DeskLab();l.setup('id');l.cable('trainer','dac','power');l.cable('led','dac','frc');
  l.output(0x33,0x80);l.output(0x30,0x80);l.output(0x31,0x40);
  assert.equal(l.dacVoltages[0],-2.5);assert.equal(l.dacVoltages[1],-1.25);
  assert.equal(l.patchbay.voltage('led.A7'),5);assert.equal(l.patchbay.voltage('trainer.ppi1.A7'),null);
  l.output(0x33,0x9B);assert.equal(l.dacVoltages[0],0);
});

test('SC-01 data and control indicators follow the latest CPU bus transaction',()=>{
  const l=new DeskLab();l.traceEnabled=false;l.setup('id');l.output(0x33,0x80);l.output(0x31,0x50);
  assert.deepEqual(l.studyBus,{data:0x50,address:0x31,read:false,write:true,cs:true});
  assert.equal(l.input(0x31),0x50);assert(l.studyBus.read);assert(!l.studyBus.write);
  l.memory[0x2000]=0x76;l.cpu.pc=0x2000;l.oneInstruction();
  assert.equal(l.studyBus.data,0x76);assert.equal(l.studyBus.address,0x2000);assert(!l.studyBus.cs);
});

test('SC-01 single-step inhibits continuous execution and STEP executes one instruction',()=>{
  const l=new DeskLab();l.traceEnabled=false;l.setup('id');const m=new TrainerMonitor(l);
  for(const k of '1A2000')m.key(k);m.key('Enter');
  for(const line of ['MVI A 42','INR A','HLT']){for(const k of line)m.key(k);m.key('Enter');}
  l.studySingleStep=true;m.reset();for(const k of 'G2000.')m.key(k);
  m.runSlice();assert.equal(l.cpu.pc,0x2000);assert.equal(l.cpu.instructions,0);
  m.hardwareStep();assert.equal(l.cpu.pc,0x2002);assert.equal(l.cpu.r.A,0x42);
  m.runSlice();assert.equal(l.cpu.pc,0x2002);
  m.hardwareStep();assert.equal(l.cpu.pc,0x2003);assert.equal(l.cpu.r.A,0x43);
  m.hardwareStep();assert.equal(l.cpu.pc,0x2004);assert(l.cpu.halted);assert(!m.running);
  l.studySingleStep=false;assert.throws(()=>m.hardwareStep(),/single-step ON/);
});

test('SC-01 state and BSR output survive project restoration',()=>{
  const l=new DeskLab();l.setup('id');l.output(0x33,0x80);l.output(0x33,0x0F);
  assert.equal(l.ledBytes[2],0x80);l.studySingleStep=true;
  const snap=snapshotDesk(l,new TrainerMonitor(l),new TDS2001C(l),{},null);
  const r=restoreDesk(JSON.parse(JSON.stringify(snap))).lab;
  assert.equal(r.studyPPI.control,0x80);assert.equal(r.ledBytes[2],0x80);assert(r.studySingleStep);
  assert.deepEqual(r.studyBus,l.studyBus);assert.deepEqual(r.studyPPI.snapshot(),l.studyPPI.snapshot());
  const bad=structuredClone(snap);bad.desk.studyPPI.latch[1]=256;
  assert.throws(()=>restoreDesk(bad),/Invalid/);
});

test('SC-01 mode-1 input uses wired strobe, input latch and interrupt enable',()=>{
  const l=new DeskLab();l.setup('id');l.switches[0]=1;
  l.cable('trainer.v5','led.A1');l.cable('trainer.v5','led.A6');l.cable('logic.0','led.C4');
  l.output(0x33,0xBB);l.output(0x33,0x09);
  l.switches[0]=0;l.sync();l.switches[0]=1;l.sync();
  assert.equal(l.studyPPI.inputLatch[0],0x42);assert.equal(l.studyPPI.ibf[0],1);assert.equal(l.studyPPI.intr[0],1);
  const s=snapshotDesk(l,new TrainerMonitor(l),new TDS2001C(l),{},null),r=restoreDesk(s).lab;
  assert.equal(r.studyPPI.ibf[0],1);assert.equal(r.input(0x30),0x42);assert.equal(r.studyPPI.ibf[0],0);
  assert.deepEqual(l.ppis[1].latch,[0,0,0]);
});

test('an incomplete SC-01 CPU ribbon cannot silently deliver port writes',()=>{
  const l=new DeskLab();l.setup('id');const c=l.patchbay.cables.find(c=>c.type==='bus');
  c.pairs=c.pairs.filter(([a])=>a!=='trainer.bus.WR');l.patchbay.compiled=false;l.sync();
  assert(l.modulePower.led);assert(!l.studyBusConnected);
  l.output(0x33,0x80);l.output(0x30,0x42);
  assert.equal(l.studyPPI.control,0x9B);assert.deepEqual(l.ledBytes,[0,0,0]);
});

test('motor preset disconnects SC-01 and selects the trainer motor PPI at 30',()=>{
  const l=new DeskLab();l.setup('id');l.output(0x33,0x80);l.output(0x30,0x42);
  l.studySingleStep=true;l.setup('motor');assert(!l.studyBusConnected);assert(!l.studySingleStep);
  l.output(0x33,0x80);l.output(0x30,0xF9);assert.equal(l.motor.phase,9);
  assert.equal(l.ppis[1].latch[0],0xF9);assert.equal(l.studyPPI.latch[0],0x42);
});
