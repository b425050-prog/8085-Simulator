import test from 'node:test';
import assert from 'node:assert/strict';
import {INSTRUCTIONS,disassemble} from '../src/isa.js';
import {parseTrainerInstruction,formatTrainerInstruction,parseTrainerProgram} from '../src/trainer-syntax.js';
import {DeskLab} from '../src/desk-lab.js';
import {TrainerMonitor} from '../src/monitor.js';
import {experimentProgram,EXPERIMENTS} from '../src/desk-experiments.js';
import {snapshotDesk,restoreDesk} from '../src/desk-project.js';
import {TDS2001C} from '../src/tds2001c.js';

const keys=(m,s)=>{for(const k of s)m.key(k);};
function board(kind='dac'){
  const lab=new DeskLab();lab.traceEnabled=false;lab.scopeRate=1000;lab.setup(kind);
  return {lab,monitor:new TrainerMonitor(lab)};
}
function begin(m,address='2000'){m.reset();keys(m,'1A'+address);m.key('Enter');assert.equal(m.error,'');}
function line(m,text){keys(m,text);m.key('Enter');assert.equal(m.error,'',text);}
function type(m,kind){begin(m);for(const text of experimentProgram(kind,m.lab).lines)line(m,text);}
const bytes=s=>s.split(/\s+/).map(v=>parseInt(v,16));

test('new lab defaults match the supplied 8085 DAC, ID and stepper port maps',()=>{
  const l=new DeskLab();assert.deepEqual(l.mapping,[{space:'io',base:0},{space:'io',base:0x30}]);
  assert.equal(l.id,'425050');assert.equal(l.clock,3072000);
  l.setup('motor');assert(l.patchbay.cables.some(c=>c.a==='trainer.ppi1'&&c.b==='motor'));
  assert(!l.patchbay.cables.some(c=>c.b==='led'));
});

test('strict LCD formatter and parser cover all 246 documented opcode encodings',()=>{
  assert.equal(INSTRUCTIONS.length,246);
  for(const entry of INSTRUCTIONS){
    const data=[entry.opcode,...(entry.bytes>1?[0xA5]:[]),...(entry.bytes>2?[0xBE]:[])];
    const decoded=disassemble(a=>data[a],0),text=formatTrainerInstruction(decoded),parsed=parseTrainerInstruction(text);
    assert.deepEqual(parsed.bytes,data,text);assert.equal(parsed.entry.opcode,entry.opcode,text);
    assert.equal(parsed.text,text);assert.deepEqual(parseTrainerInstruction(text.toLowerCase()).bytes,data);
    assert.equal(text.includes(','),entry.mnemonic==='MOV',text);
  }
});

test('extra spacing is rejected across the ISA; a different valid opcode remains syntax-valid',()=>{
  let rejected=0;
  for(const entry of INSTRUCTIONS){
    const data=[entry.opcode,0xAB,0xCD].slice(0,entry.bytes),text=formatTrainerInstruction(disassemble(a=>data[a],0));
    for(let i=0;i<=text.length;i++){
      const malformed=text.slice(0,i)+' '+text.slice(i);
      // CMA -> CM A is a different legal instruction (conditional CALL 000A).
      // A syntax-only checker must not guess the programmer's intended opcode.
      let alternative=null;try{alternative=parseTrainerInstruction(malformed);}catch(e){assert.match(e.message,/SYNTAX/);rejected++;}
      if(alternative)assert.notEqual(alternative.entry.opcode,entry.opcode,malformed);
    }
    if(entry.mnemonic==='MOV')assert.throws(()=>parseTrainerInstruction(text.replace(',',', ')),/SYNTAX/);
    if(entry.bytes>1)assert.throws(()=>parseTrainerInstruction(text+'H'),/SYNTAX/);
  }
  assert(rejected>1500);
});

test('no suffixes, alternate separators, labels, directives or invisible whitespace are repaired',()=>{
  for(const bad of ['MVI A,80','MVI A,80H','MVI A 80H','MVI  A 80','MVI A  80',' MVI A 80','MVI A 80 ',
    'MVI\tA 80','MVI A 80\n','MVI A 80\r','MVI A\u00a080','MOV A B','MOV A, B','MOV A ,B','MOV M,M',
    'LXI D,0000','LXI D 0000H','OUT 03H','OUT 0x03','OUT 100','MVI A 100','MVI Q 80','JMP 10000',
    'JMP O-2006','JMP LOOP','LOOP: NOP','ORG 2000','DB 80','NOP ;comment','RST 8','HLT ','PUſH B']){
    assert.throws(()=>parseTrainerInstruction(bad),/SYNTAX/,JSON.stringify(bad));
  }
  assert.deepEqual(parseTrainerInstruction('MVI A 80').bytes,[0x3E,0x80]);
  assert.deepEqual(parseTrainerInstruction('MOV A,B').bytes,[0x78]);
  assert.deepEqual(parseTrainerInstruction('LXI D 0000').bytes,[0x11,0,0]);
});

test('bad LCD syntax cannot modify RAM or advance the address and requires Reset to correct',()=>{
  const {lab:l,monitor:m}=board();begin(m);
  l.memory.set([0xAA,0xBB,0xCC,0xDD],0x2000);const before=l.memory.slice();
  keys(m,'MVI A,80');m.key('Enter');
  assert.equal(m.address,0x2000);assert.equal(m.syntaxRejected,true);assert.equal(m.entries.size,0);
  assert.deepEqual(l.memory,before);assert.equal(l.written[0x2000],0);
  assert.match(m.lines[0],/^2000 MVI A,80/);assert.match(m.lines[1],/SYNTAX ERR/);
  const bad=m.buffer;for(const k of ['Backspace','Delete','ArrowLeft','ArrowUp','.','Enter','M'])m.key(k);
  assert.equal(m.buffer,bad);assert.equal(m.address,0x2000);assert.deepEqual(l.memory,before);
  begin(m);line(m,'MVI A 80');assert.equal(m.address,0x2002);
  assert.deepEqual([...l.memory.slice(0x2000,0x2004)],[0x3E,0x80,0xCC,0xDD]);
});

test('Backspace/Delete and arrows cannot repair an unsubmitted coding line',()=>{
  const {monitor:m}=board();begin(m);keys(m,'MVI A 81');
  for(const k of ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])m.key(k);
  assert.equal(m.buffer,'MVI A 81');assert.equal(m.address,0x2000);
  m.key('Enter');assert.equal(m.lab.memory[0x2001],0x81);
  m.key('Escape');m.key('M');line(m,'2001');line(m,'80');
  assert.equal(m.lab.memory[0x2001],0x80);assert.equal(m.lab.written[0x2001],1);
});

test('syntax checking permits valid but logically wrong instructions and unused targets',()=>{
  const {monitor:m}=board();begin(m);
  for(const text of ['OUT FF','JMP 0000','MVI A 81','LXI SP 2000'])line(m,text);
  assert.equal(m.entries.size,4);assert.equal(m.syntaxRejected,false);
});

test('FFFH boundary and monitor ROM protection still work with the strict dialect',()=>{
  const {monitor:m}=board();begin(m,'FFFF');line(m,'NOP');assert.equal(m.lab.written[0xFFFF],1);
  begin(m,'FFFF');keys(m,'MVI A 80');m.key('Enter');assert.match(m.error,/MEMORY LIMIT/);
  assert.equal(m.lab.memory[0],0xC3);m.reset();keys(m,'1A2000H');m.key('Enter');assert(m.error);
});

// Independent fixtures transcribed from the machine-code columns of the PDFs.
const SHEET_BYTES={
  id:'3E 80 D3 33 3E 42 D3 30 3E 50 D3 31 3E 50 D3 32 76',
  motor:'3E 80 D3 33 3E F9 D3 30 CD 23 20 3E F5 D3 30 CD 23 20 3E F6 D3 30 CD 23 20 3E FA D3 30 CD 23 20 C3 04 20 11 00 00 CD A6 03 C9',
  ramp:'3E 80 D3 03 3E 00 D3 00 D3 01 3C C3 06 20',
  square:'3E 80 D3 03 3E 00 D3 00 CD 15 20 3E FF D3 00 CD 15 20 C3 04 20 0E FF 0D C2 17 20 C9',
  triangle:'3E 80 D3 03 3E 00 D3 00 3C FE FF C2 06 20 3D D3 00 FE 00 C2 0E 20 C3 04 20'
};
for(const kind of Object.keys(SHEET_BYTES))test(`${kind} program matches every machine-code byte in the supplied PDF`,()=>{
  const {monitor:m}=board(kind==='motor'?'motor':kind==='id'?'id':'dac');type(m,kind);
  const expected=bytes(SHEET_BYTES[kind]);assert.deepEqual([...m.lab.memory.slice(0x2000,0x2000+expected.length)],expected);
});

test('all examples export and reimport in the same strict no-comma/no-H LCD dialect',()=>{
  const l=new DeskLab();for(const [kind]of EXPERIMENTS){const p=experimentProgram(kind,l),parsed=parseTrainerProgram(p.source);
    assert.deepEqual(parsed.map(r=>r.text),p.lines,kind);assert.equal(parsed.length,p.instructions.length);}
  assert.throws(()=>parseTrainerProgram('MVI A,80H\n'),/Line 1/);
  assert.throws(()=>parseTrainerProgram('MVI A 80\n\nOUT 03\n'),/Line 2/);
});

test('provided ID 425050 lights exactly the PDF patterns on the separate 30–33 PPI',()=>{
  const {lab:l,monitor:m}=board('dac');type(m,'id');m.reset();keys(m,'G2000.');
  for(let i=0;i<20&&!l.cpu.halted;i++)l.oneInstruction();
  assert.deepEqual(l.ledBytes,[0x42,0x50,0x50]);assert.deepEqual(l.ppis[0].latch,[0,0,0]);
  assert.equal(l.studyPPI.control,0x80);assert.equal(l.ppis[1].control,0x9B);
});

test('03A6 compatibility delay is executable 8085 ROM and preserves A, flags and stack',()=>{
  const {lab:l}=board('motor');l.cpu.r.A=0xAB;l.cpu.flags=0xD7;l.cpu.setPair(1,3);l.cpu.push(0x2100);l.cpu.pc=0x03A6;l.cpu.halted=false;
  for(let i=0;i<100&&l.cpu.pc!==0x2100;i++)l.oneInstruction();
  assert.equal(l.cpu.pc,0x2100);assert.equal(l.cpu.sp,0xFFFF);assert.equal(l.cpu.r.A,0xAB);
  assert.equal(l.cpu.flags,0xD7);assert.equal(l.cpu.pair(1),0);assert.equal(l.cpu.cycles,101);
});

test('the exact clockwise PDF program executes through four real ROM delays and repeats',()=>{
  const {lab:l,monitor:m}=board('motor');type(m,'motor');m.reset();keys(m,'G2000.');
  const writes=[],output=l.output.bind(l);l.output=(port,v)=>{output(port,v);if(port===0x30)writes.push(v);};
  for(let i=0;i<1100000&&writes.length<5;i++)l.oneInstruction();
  assert.deepEqual(writes,[0xF9,0xF5,0xF6,0xFA,0xF9]);assert.equal(l.motor.invalid,0);
  assert(Math.abs(l.motor.angle-7.2)<1e-8);assert.equal(l.cpu.sp,0xFFFF);assert(l.time>2);
});

test('reversed PDF phase order rotates anticlockwise without invalid transitions',()=>{
  const {lab:l}=board('motor');l.output(0x33,0x80);
  for(const phase of [0xFA,0xF6,0xF5,0xF9,0xFA]){l.time+=.01;l.output(0x30,phase);}
  assert(Math.abs(l.motor.angle+7.2)<1e-8);assert.equal(l.motor.invalid,0);
});

test('manual ramp reaches both X and Y through physical 8255 output instructions',()=>{
  const {lab:l,monitor:m}=board();type(m,'ramp');m.reset();keys(m,'G2000.');const out=[],original=l.output.bind(l);
  l.output=(port,v)=>{original(port,v);if(port===0||port===1)out.push([port,v]);};
  for(let i=0;i<2000&&out.length<512;i++)l.oneInstruction();
  for(let n=0;n<256;n++)assert.deepEqual(out.slice(n*2,n*2+2),[[0,n],[1,n]]);
  assert.equal(l.dacVoltages[0],-5*255/256);assert.equal(l.dacVoltages[1],-5*255/256);
});

for(const [kind,pc,period]of [['square',0x2004,7248],['triangle',0x2004,15821]])test(`${kind} sheet period agrees with Intel instruction timings`,()=>{
  const {lab:l,monitor:m}=board();type(m,kind);m.reset();keys(m,'G2000.');const cycles=[];
  for(let i=0;i<20000&&cycles.length<3;i++){if(l.cpu.pc===pc)cycles.push(l.cpu.cycles);l.oneInstruction();}
  assert.equal(cycles.length,3);assert.equal(cycles[1]-cycles[0],period);assert.equal(cycles[2]-cycles[1],period);
});

test('a saved rejected line remains rejected after desk restoration',()=>{
  const {lab:l,monitor:m}=board();begin(m);keys(m,'MVI  A 80');m.key('Enter');
  const s=snapshotDesk(l,m,new TDS2001C(l),{},{}),r=restoreDesk(JSON.parse(JSON.stringify(s)));
  assert.equal(r.monitor.syntaxRejected,true);assert.equal(r.monitor.address,0x2000);
  r.monitor.key('Backspace');assert.equal(r.monitor.buffer,'MVI  A 80');
});
test('typed tabs and pasted non-ASCII whitespace are retained for rejection rather than repaired',()=>{
  const {monitor:m}=board();for(const whitespace of ['Tab','\t','\u00a0','\r']){begin(m);keys(m,'MVI A ');m.key(whitespace);keys(m,'80');m.key('Enter');assert.equal(m.syntaxRejected,true);assert.equal(m.address,0x2000);assert.equal(m.lab.written[0x2000],0);}
});
