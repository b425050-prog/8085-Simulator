import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EXAMPLES,idProgram,waveProgram} from '../src/examples.js';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../examples');
await mkdir(folder,{recursive:true});
for(const example of EXAMPLES){const source=typeof example.source==='function'?example.source():example.source;await writeFile(path.join(folder,example.id+'.asm'),source);}
const wave=waveProgram('sine');
// A combined example keeps initialization on one CPU and independent PPI buses.
const id=idProgram('123456').replace(/HLT\nEND\n$/,'');
const analog=wave.slice(wave.indexOf('MVI A, 8AH'));
await writeFile(path.join(folder,'combined-id-dac.asm'),id+'\n; Continue into the analog waveform experiment.\n'+analog);
process.stdout.write('Wrote '+(EXAMPLES.length+1)+' assembly experiments to '+folder+'\n');
