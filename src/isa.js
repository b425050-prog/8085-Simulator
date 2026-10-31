// Documented Intel 8085 instruction encodings. Undocumented silicon opcodes trap.
export const REG = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
export const PAIR = ['B', 'D', 'H', 'SP'];
export const CONDITIONS = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M'];
export const hex = (v, n = 2) => (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
export const ISA = Array(256).fill(null);
function add(opcode, mnemonic, args = [], bytes = 1, cycles = 4, group = 'Control', flags = '—', description = '') {
  ISA[opcode] = { opcode, mnemonic, args, bytes, cycles: Array.isArray(cycles) ? cycles : [cycles, cycles], group, flags, description };
}
add(0, 'NOP', [], 1, 4, 'Control', '—', 'No operation');
for (let p = 0; p < 4; p++) {
  add(0x01 + p * 16, 'LXI', [PAIR[p], 'd16'], 3, 10, 'Transfer', '—', 'Load register pair with a 16-bit value');
  add(0x03 + p * 16, 'INX', [PAIR[p]], 1, 6, 'Arithmetic', '—', 'Increment register pair');
  add(0x0B + p * 16, 'DCX', [PAIR[p]], 1, 6, 'Arithmetic', '—', 'Decrement register pair');
  add(0x09 + p * 16, 'DAD', [PAIR[p]], 1, 10, 'Arithmetic', 'CY', 'Add register pair to HL');
}
for (let r = 0; r < 8; r++) {
  add(0x04 + r * 8, 'INR', [REG[r]], 1, r === 6 ? 10 : 4, 'Arithmetic', 'S Z AC P', 'Increment byte; preserve carry');
  add(0x05 + r * 8, 'DCR', [REG[r]], 1, r === 6 ? 10 : 4, 'Arithmetic', 'S Z AC P', 'Decrement byte; preserve carry');
  add(0x06 + r * 8, 'MVI', [REG[r], 'd8'], 2, r === 6 ? 10 : 7, 'Transfer', '—', 'Load immediate byte');
}
for (const [op, name] of [[2, 'STAX'], [0x0A, 'LDAX'], [0x12, 'STAX'], [0x1A, 'LDAX']])
  add(op, name, [op < 0x10 ? 'B' : 'D'], 1, 7, 'Transfer', '—', name === 'LDAX' ? 'Read accumulator through register pair' : 'Store accumulator through register pair');
for (const [op, name, cycles, desc] of [[0x22,'SHLD',16,'Store HL to consecutive memory bytes'], [0x2A,'LHLD',16,'Read HL from consecutive memory bytes'], [0x32,'STA',13,'Store accumulator to memory'], [0x3A,'LDA',13,'Read accumulator from memory']])
  add(op, name, ['a16'], 3, cycles, 'Transfer', '—', desc);
for (const [op, name, flags, desc] of [[7,'RLC','CY','Rotate A left'],[0x0F,'RRC','CY','Rotate A right'],[0x17,'RAL','CY','Rotate A left through carry'],[0x1F,'RAR','CY','Rotate A right through carry'],[0x27,'DAA','S Z AC P CY','Decimal adjust accumulator after BCD addition'],[0x2F,'CMA','—','Complement accumulator'],[0x37,'STC','CY','Set carry'],[0x3F,'CMC','CY','Complement carry']])
  add(op, name, [], 1, 4, 'Logical', flags, desc);
add(0x20, 'RIM', [], 1, 4, 'Control', '—', 'Read SID, pending interrupts, enable and masks into A');
add(0x30, 'SIM', [], 1, 4, 'Control', '—', 'Set interrupt masks, reset RST7.5 latch, or write SOD');
for (let dst = 0; dst < 8; dst++) for (let src = 0; src < 8; src++) {
  if (dst === 6 && src === 6) continue;
  add(0x40 + dst * 8 + src, 'MOV', [REG[dst], REG[src]], 1, dst === 6 || src === 6 ? 7 : 4, 'Transfer', '—', 'Copy a byte; M means memory at HL');
}
add(0x76, 'HLT', [], 1, 5, 'Control', '—', 'Halt until reset or an accepted interrupt');
const alu = ['ADD','ADC','SUB','SBB','ANA','XRA','ORA','CMP'];
const imm = ['ADI','ACI','SUI','SBI','ANI','XRI','ORI','CPI'];
const descriptions = ['Add to A','Add to A with carry','Subtract from A','Subtract from A with borrow','Bitwise AND with A','Bitwise XOR with A','Bitwise OR with A','Compare with A without changing A'];
for (let a = 0; a < 8; a++) {
  for (let r = 0; r < 8; r++) add(0x80 + a * 8 + r, alu[a], [REG[r]], 1, r === 6 ? 7 : 4, a < 4 || a === 7 ? 'Arithmetic' : 'Logical', 'S Z AC P CY', descriptions[a]);
  add(0xC6 + a * 8, imm[a], ['d8'], 2, 7, a < 4 || a === 7 ? 'Arithmetic' : 'Logical', 'S Z AC P CY', descriptions[a] + ' (immediate)');
  add(0xC0 + a * 8, 'R' + CONDITIONS[a], [], 1, [6,12], 'Branch', '—', 'Return if ' + CONDITIONS[a]);
  add(0xC2 + a * 8, 'J' + CONDITIONS[a], ['a16'], 3, [7,10], 'Branch', '—', 'Jump if ' + CONDITIONS[a]);
  add(0xC4 + a * 8, 'C' + CONDITIONS[a], ['a16'], 3, [9,18], 'Branch', '—', 'Call if ' + CONDITIONS[a]);
  add(0xC7 + a * 8, 'RST', [String(a)], 1, 12, 'Branch', '—', 'Call vector ' + hex(a * 8, 4) + 'H');
}
for (let p = 0; p < 4; p++) {
  const name = p === 3 ? 'PSW' : PAIR[p];
  add(0xC1 + p * 16, 'POP', [name], 1, 10, 'Stack', p === 3 ? 'S Z AC P CY' : '—', 'Pop a pair from stack');
  add(0xC5 + p * 16, 'PUSH', [name], 1, 12, 'Stack', '—', 'Push a pair onto stack');
}
for (const [op,name,args,bytes,t,group,desc] of [
  [0xC3,'JMP',['a16'],3,10,'Branch','Unconditional jump'], [0xC9,'RET',[],1,10,'Branch','Return from subroutine'],
  [0xCD,'CALL',['a16'],3,18,'Branch','Call subroutine'], [0xD3,'OUT',['d8'],2,10,'I/O','Write A to I/O port'],
  [0xDB,'IN',['d8'],2,10,'I/O','Read I/O port into A'], [0xE3,'XTHL',[],1,16,'Stack','Exchange HL and top of stack'],
  [0xE9,'PCHL',[],1,6,'Branch','Jump to address in HL'], [0xEB,'XCHG',[],1,4,'Transfer','Exchange DE and HL'],
  [0xF3,'DI',[],1,4,'Control','Disable maskable interrupts'], [0xF9,'SPHL',[],1,6,'Stack','Copy HL to SP'],
  [0xFB,'EI',[],1,4,'Control','Enable interrupts after the next instruction']
]) add(op,name,args,bytes,t,group,'—',desc);

export const INSTRUCTIONS = ISA.filter(Boolean);
export function disassemble(memory, address) {
  address &= 0xFFFF;
  const read = typeof memory === 'function' ? memory : a => memory[a & 0xFFFF];
  const opcode = read(address), entry = ISA[opcode];
  if (!entry) return { address, bytes: [opcode], text: 'DB ' + hex(opcode) + 'H', size: 1, entry: null };
  const bytes = Array.from({ length: entry.bytes }, (_, i) => read((address + i) & 0xFFFF));
  const args = entry.args.map(a => a === 'd8' ? hex(bytes[1]) + 'H' : a === 'd16' || a === 'a16' ? hex(bytes[1] | bytes[2] << 8, 4) + 'H' : a);
  return { address, bytes, text: entry.mnemonic + (args.length ? ' ' + args.join(', ') : ''), size: entry.bytes, entry };
}
