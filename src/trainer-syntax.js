import {INSTRUCTIONS,hex} from './isa.js';

// LCD dialect supplied by the lab: one literal ASCII space, no H suffixes,
// and a comma only between the two registers of MOV. Never trim or repair input.
const numeric = arg => ['d8','d16','a16'].includes(arg);
const form = (entry,args) => entry.mnemonic+(args.length?' '+args.join(entry.mnemonic==='MOV'?',':' '):'');
const patterns=INSTRUCTIONS.map(entry=>{
  const args=entry.args.map(arg=>arg==='d8'?'([0-9A-F]{1,2})':arg==='d16'||arg==='a16'?'([0-9A-F]{1,4})':arg);
  return {entry,regex:new RegExp('^'+form(entry,args)+'$')};
});

export class TrainerSyntaxError extends Error {
  constructor(){super('SYNTAX ERROR');this.name='TrainerSyntaxError';}
}

export function parseTrainerInstruction(source){
  if(typeof source!=='string'||!/^[\x20-\x7E]*$/.test(source))throw new TrainerSyntaxError();
  const text=source.toUpperCase();
  for(const {entry,regex} of patterns){
    const match=regex.exec(text);if(!match||match[0]!==text)continue;
    const bytes=[entry.opcode],index=entry.args.findIndex(numeric);
    if(index>=0){const value=parseInt(match[1],16);bytes.push(value&255);if(entry.bytes===3)bytes.push(value>>8&255);}
    return {entry,bytes,text};
  }
  throw new TrainerSyntaxError();
}

export function formatTrainerInstruction(decoded){
  if(!decoded.entry)return 'DB '+hex(decoded.bytes[0]);
  const {entry,bytes}=decoded;
  const args=entry.args.map(arg=>arg==='d8'?hex(bytes[1]):arg==='d16'||arg==='a16'?hex(bytes[1]|bytes[2]<<8,4):arg);
  return form(entry,args);
}

// Conversion is internal only; the general Intel assembler has a separate dialect.
export function trainerInstruction(source){
  const parsed=parseTrainerInstruction(source),{entry,bytes}=parsed;
  const args=entry.args.map(arg=>arg==='d8'?hex(bytes[1])+'H':arg==='d16'||arg==='a16'?hex(bytes[1]|bytes[2]<<8,4)+'H':arg);
  return entry.mnemonic+(args.length?' '+args.join(','):'');
}

export function parseTrainerProgram(source){
  if(typeof source!=='string')throw new TrainerSyntaxError();
  const lines=source.replaceAll('\r\n','\n').split('\n');
  if(lines.at(-1)==='')lines.pop(); // A text file's final newline is not an instruction.
  return lines.map((line,index)=>{try{return parseTrainerInstruction(line);}catch(e){throw new Error(`Line ${index+1}: syntax error. Use MVI A 80, MOV A,B; one space, no H.`);}});
}
