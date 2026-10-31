import { INSTRUCTIONS, hex } from './isa.js';
const BY_NAME = new Map();
for(const e of INSTRUCTIONS){if(!BY_NAME.has(e.mnemonic))BY_NAME.set(e.mnemonic,[]);BY_NAME.get(e.mnemonic).push(e);}
const DIRECTIVES=new Set(['ORG','DB','DW','DS','EQU','SET','END','ALIGN','VECTOR']);
export class AssemblyError extends Error {constructor(message,line=0){super(message);this.line=line;}}
export function stripComment(s){let q=null;for(let i=0;i<s.length;i++){if(s[i]==='\\'){i++;continue;}if(q){if(s[i]===q)q=null;}else if(s[i]==='\''||s[i]==='"')q=s[i];else if(s[i]===';')return s.slice(0,i);}return s;}
export function splitArgs(s){const out=[];let q=null,depth=0,start=0;for(let i=0;i<s.length;i++){const c=s[i];if(c==='\\'){i++;continue;}if(q){if(c===q)q=null;}else if(c==='\''||c==='"')q=c;else if(c==='(')depth++;else if(c===')')depth--;else if(c===','&&depth===0){out.push(s.slice(start,i).trim());start=i+1;}}if(q)throw new AssemblyError('Unclosed string');if(s.trim())out.push(s.slice(start).trim());return out;}
function decodeString(s){const quote=s[0];if(s.at(-1)!==quote)throw new AssemblyError('Unclosed string');return s.slice(1,-1).replace(/\\(x[0-9a-fA-F]{2}|n|r|t|0|\\|'|")/g,(_,v)=>v[0]==='x'?String.fromCharCode(parseInt(v.slice(1),16)):({n:'\n',r:'\r',t:'\t','0':'\0','\\':'\\',"'":"'",'"':'"'})[v]);}
export function expression(source,symbols={},location=0){
  const tokens=[];let p=0;
  while(p<source.length){if(/\s/.test(source[p])){p++;continue;}const rest=source.slice(p);let m;
    if(source[p]==='\''||source[p]==='"'){let end=p+1;for(;end<source.length;end++){if(source[end]==='\\')end++;else if(source[end]===source[p])break;}if(end===source.length)throw new AssemblyError('Unclosed character literal');const str=decodeString(source.slice(p,end+1));if(str.length!==1)throw new AssemblyError('Expected one character in expression');tokens.push({v:str.charCodeAt(0)});p=end+1;}
    else if((m=/^(0x[0-9a-f]+|0b[01]+|[0-9a-f]+H\b|[01]+B\b|[0-7]+[OQ]\b|\d+D\b|\d+)\b/i.exec(rest))){const s=m[0].toUpperCase();let value;if(s.startsWith('0X'))value=parseInt(s.slice(2),16);else if(/^0B[01]+$/.test(s))value=parseInt(s.slice(2),2);else if(/[HBOQD]$/.test(s)){const radix={H:16,B:2,O:8,Q:8,D:10}[s.at(-1)];value=parseInt(s.slice(0,-1),radix);}else value=Number(s);tokens.push({v:value});p+=m[0].length;}
    else if((m=/^[A-Za-z_?.@][\w?.@]*/.exec(rest))){tokens.push(m[0].toUpperCase());p+=m[0].length;}
    else if((m=/^(<<|>>|<=|>=|==|!=|[()+\-*/%&|^~$<>=])/.exec(rest))){tokens.push(m[0]);p+=m[0].length;}
    else throw new AssemblyError('Invalid expression near '+rest);
  }
  let i=0;const aliases={AND:'&',OR:'|',XOR:'^',MOD:'%',SHL:'<<',SHR:'>>',EQ:'==',NE:'!=',LT:'<',GT:'>',LE:'<=',GE:'>='};
  const precedence={'|':1,'^':2,'&':3,'==':4,'=':4,'!=':4,'<':5,'>':5,'<=':5,'>=':5,'<<':6,'>>':6,'+':7,'-':7,'*':8,'/':8,'%':8};
  function parse(min=0){let token=tokens[i++],v;if(token===undefined)throw new AssemblyError('Incomplete expression');
    if(typeof token==='object')v=token.v;
    else if(token==='('){v=parse();if(tokens[i++]!==')')throw new AssemblyError('Missing closing parenthesis');}
    else if(['+','-','~','NOT','LOW','HIGH'].includes(token)){const n=parse(9);v=token==='-'?-n:token==='~'||token==='NOT'?~n:token==='LOW'?n&255:token==='HIGH'?n>>8&255:n;}
    else if(token==='$')v=location;
    else if(Object.hasOwn(symbols,token))v=symbols[token];else throw new AssemblyError('Unknown symbol '+token);
    while(i<tokens.length){const op=aliases[tokens[i]]||tokens[i],prec=precedence[op];if(prec===undefined||prec<min)break;i++;const b=parse(prec+1);
      switch(op){case '+':v+=b;break;case '-':v-=b;break;case '*':v*=b;break;case '/':if(!b)throw new AssemblyError('Division by zero');v=Math.trunc(v/b);break;case '%':if(!b)throw new AssemblyError('Division by zero');v%=b;break;case '&':v&=b;break;case '|':v|=b;break;case '^':v^=b;break;case '<<':v<<=b;break;case '>>':v>>=b;break;case '=':case '==':v=+(v===b);break;case '!=':v=+(v!==b);break;case '<':v=+(v<b);break;case '>':v=+(v>b);break;case '<=':v=+(v<=b);break;case '>=':v=+(v>=b);break;}
    }return v;
  }
  const value=parse();if(i<tokens.length)throw new AssemblyError('Unexpected token '+tokens[i]);if(!Number.isSafeInteger(value))throw new AssemblyError('Expression must be a finite integer');return value;
}
function parseLine(text){let rest=stripComment(text).trim(),label=null;const colon=/^([A-Za-z_?.@][\w?.@]*):/.exec(rest);if(colon){label=colon[1].toUpperCase();rest=rest.slice(colon[0].length).trim();}
  let m=/^(\S+)(?:\s+(.*))?$/.exec(rest);if(!m)return {label,op:null,args:[]};let op=m[1].toUpperCase(),tail=m[2]||'';
  if(!label&&!BY_NAME.has(op)&&!DIRECTIVES.has(op)){const n=/^(\S+)(?:\s+(.*))?$/.exec(tail);if(n&&(BY_NAME.has(n[1].toUpperCase())||DIRECTIVES.has(n[1].toUpperCase()))){label=op;op=n[1].toUpperCase();tail=n[2]||'';}}
  return {label,op,args:splitArgs(tail)};
}
function expand(source){const input=source.replaceAll('\r','').split('\n').map((text,i)=>({text,line:i+1})),macros=new Map();let serial=0,total=0;
  function block(lines,depth=0){if(depth>16)throw new AssemblyError('Macro nesting exceeds 16');const out=[];
    for(let i=0;i<lines.length;i++){const row=lines[i],clean=stripComment(row.text).trim();let m;
      if((m=/^(\w+)\s+MACRO\b(.*)$/i.exec(clean))){const body=[];let level=1;while(++i<lines.length){if(/\bMACRO\b/i.test(stripComment(lines[i].text)))level++;if(/^\s*ENDM\b/i.test(stripComment(lines[i].text))&&--level===0)break;body.push(lines[i]);}if(level)throw new AssemblyError('Missing ENDM',row.line);macros.set(m[1].toUpperCase(),{params:splitArgs(m[2]),body});continue;}
      if((m=/^REPT\s+(.+)$/i.exec(clean))){const count=expression(m[1]);if(count<0||count>4096)throw new AssemblyError('REPT count must be 0..4096',row.line);const body=[];let level=1;while(++i<lines.length){const t=stripComment(lines[i].text).trim();if(/^REPT\b/i.test(t))level++;if(/^ENDM\b/i.test(t)&&--level===0)break;body.push(lines[i]);}if(level)throw new AssemblyError('Missing ENDM',row.line);for(let j=0;j<count;j++)out.push(...block(body,depth+1));continue;}
      const prefix=/^([A-Za-z_?.@][\w?.@]*:)\s*(.*)$/.exec(clean);m=/^(\w+)\b(.*)$/.exec(prefix?prefix[2]:clean);const macro=m&&macros.get(m[1].toUpperCase());if(macro){const args=splitArgs(m[2]);if(args.length!==macro.params.length)throw new AssemblyError('Wrong macro argument count',row.line);if(prefix)out.push({line:row.line,text:prefix[1]});const id=++serial;out.push(...block(macro.body.map(r=>({line:row.line,text:r.text.replace(/%%(\w+)/g,`__M${id}_$1`).replace(/\b[A-Za-z_]\w*\b/g,t=>{const n=macro.params.findIndex(p=>p.toUpperCase()===t.toUpperCase());return n<0?t:args[n];})})),depth+1));}
      else out.push(row);
      total++;if(total>100000)throw new AssemblyError('Source expansion exceeds 100,000 lines',row.line);
    }return out;
  }return block(input);
}
function choose(op,args){const candidates=BY_NAME.get(op);if(!candidates)throw new AssemblyError('Unknown instruction '+op);let normal=args.map(a=>a.toUpperCase());
  if(['LXI','INX','DCX','DAD','LDAX','STAX','PUSH','POP'].includes(op)){normal=normal.map(a=>({BC:'B',DE:'D',HL:'H',AF:'PSW'})[a]||a);}
  const entry=candidates.find(e=>e.args.length===args.length&&e.args.every((a,i)=>['d8','d16','a16'].includes(a)||a===normal[i]||(op==='RST'&&Number(a)===Number(normal[i]))));
  if(!entry)throw new AssemblyError('Invalid operands for '+op+': '+args.join(', '));return entry;
}
export function assemble(source,{origin=0x2000,protectROM=true}={}){
  const errors=[],warnings=[];let expanded;try{expanded=expand(source);}catch(e){return {ok:false,errors:[{line:e.line||1,message:e.message}],warnings};}
  const rows=[],symbols={},definitions=new Set(),equates=[],setValues={};let pc=origin,entryPoint=null,ended=false;
  function error(row,e){errors.push({line:row.line,message:e.message||String(e)});}
  for(const row of expanded){if(ended)break;try{const r={...row,...parseLine(row.text),address:pc,size:0,environment:{...setValues}};rows.push(r);const {label,op,args}=r;
    if(label){if(definitions.has(label)&&op!=='SET')throw new AssemblyError('Duplicate symbol '+label);definitions.add(label);if(op!=='EQU'&&op!=='SET')symbols[label]=pc;}
    if(!op)continue;
    if(op==='EQU'||op==='SET'){if(!label||args.length!==1)throw new AssemblyError(op+' requires a label and expression');try{symbols[label]=expression(args[0],symbols,pc);if(op==='SET')setValues[label]=symbols[label];}catch(e){if(op==='SET')throw e;equates.push(r);}continue;}
    if(op==='ORG'){if(args.length!==1)throw new AssemblyError('ORG requires one address');pc=expression(args[0],symbols,pc);if(pc<0||pc>65535)throw new AssemblyError('ORG address outside memory');r.address=pc;}
    else if(op==='END'){ended=true;if(args.length)r.entryExpression=args[0];}
    else if(op==='DB'){if(!args.length)throw new AssemblyError('DB requires data');r.size=args.reduce((n,a)=>n+((a[0]==='\''||a[0]==='"')&&a.at(-1)===a[0]?decodeString(a).length:1),0);}
    else if(op==='DW'){if(!args.length)throw new AssemblyError('DW requires data');r.size=args.length*2;}
    else if(op==='DS'){if(args.length<1||args.length>2)throw new AssemblyError('DS count[, fill]');r.size=expression(args[0],symbols,pc);if(r.size<0)throw new AssemblyError('Negative storage size');}
    else if(op==='ALIGN'){const n=expression(args[0],symbols,pc);if(n<1||n>65536)throw new AssemblyError('Invalid alignment');r.size=(n-pc%n)%n;}
    else if(op==='VECTOR'){if(args.length!==2)throw new AssemblyError('VECTOR address, handler');}
    else {r.entry=choose(op,args);r.size=r.entry.bytes;}
    if(pc+r.size>65536)throw new AssemblyError('Data crosses FFFFH');pc+=r.size;
  }catch(e){error(row,e);}}
  for(let pass=0,max=equates.length;pass<=max&&equates.length;pass++){const before=equates.length;for(let i=equates.length-1;i>=0;i--){const r=equates[i];try{symbols[r.label]=expression(r.args[0],{...symbols,...r.environment},r.address);equates.splice(i,1);}catch{}}if(equates.length===before)break;}
  for(const r of equates)error(r,new AssemblyError('Unresolved EQU expression: '+r.args[0]));
  const memory=new Uint8Array(65536),written=new Uint8Array(65536),listing=[],vectors=[];
  const range=(v,n)=>{const min=n===1?-128:-32768,max=n===1?255:65535;if(v<min||v>max)throw new AssemblyError(`Value ${v} does not fit in ${n*8} bits`);return v&(n===1?255:65535);};
  for(const r of rows){try{const val=s=>expression(s,{...symbols,...r.environment},r.address),{op,args,address}=r;let bytes=[];
    if(op==='END'&&r.entryExpression)entryPoint=range(val(r.entryExpression),2);
    else if(op==='VECTOR'){const a=val(args[0]),target=val(args[1]);if(![8,16,24,32,36,40,44,48,52,56,60].includes(a))throw new AssemblyError('Not an 8085 vector address');if(target<0x2000||target>65535)throw new AssemblyError('Interrupt handler must be in 2000H–FFFFH');vectors.push({address:a,target});}
    else if(op==='DB'){for(const a of args){if((a[0]==='\''||a[0]==='"')&&a.at(-1)===a[0])for(const c of decodeString(a)){if(c.charCodeAt(0)>255)throw new AssemblyError('DB strings must contain 8-bit characters');bytes.push(c.charCodeAt(0));}else bytes.push(range(val(a),1));}}
    else if(op==='DW'){for(const a of args){const v=range(val(a),2);bytes.push(v&255,v>>8);}}
    else if(op==='DS'||op==='ALIGN')bytes=Array(r.size).fill(args[1]?range(val(args[1]),1):0);
    else if(r.entry){bytes=[r.entry.opcode];const index=r.entry.args.findIndex(a=>['d8','d16','a16'].includes(a));if(index>=0){const n=r.entry.bytes-1,v=range(val(args[index]),n);bytes.push(v&255);if(n===2)bytes.push(v>>8);}}
    if(bytes.length&&protectROM&&address<0x2000)throw new AssemblyError('0000H–1FFFH is monitor ROM. Use ORG 2000H or higher; use VECTOR for interrupts.');
    for(let j=0;j<bytes.length;j++){const a=address+j;if(written[a])throw new AssemblyError('Overlapping output at '+hex(a,4)+'H');written[a]=1;memory[a]=bytes[j];}
    if(bytes.length&&entryPoint===null)entryPoint=address;
    listing.push({...r,bytes});
  }catch(e){error(r,e);}}
  const count=written.reduce((a,b)=>a+b,0);return {ok:errors.length===0,errors,warnings,memory,written,listing,symbols,vectors,entry:entryPoint??origin,byteCount:count};
}
