import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {DeskLab} from '../src/desk-lab.js';
import {EXPERIMENTS,experimentProgram} from '../src/desk-experiments.js';
const dir=new URL('../examples/lab-desk/',import.meta.url);
await mkdir(fileURLToPath(dir),{recursive:true});
const lab=new DeskLab();
for(const [kind]of EXPERIMENTS)await writeFile(new URL(kind+'.asm',dir),experimentProgram(kind,lab).source);
process.stdout.write(`Wrote ${EXPERIMENTS.length} strict LCD programs (analog 00, ID/motor 30).\n`);
