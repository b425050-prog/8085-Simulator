# 8085 Bench user guide

## Launch and workflow

Double-click `Start Simulator.cmd`. Node.js 18+ or Python 3 is sufficient; no packages need to be installed. The launcher serves the files only on `127.0.0.1`. Keep its terminal window open. To use the app without the launcher, run `node tools/server.mjs` or `python tools/server.py` and visit the printed address.

The simulator works offline. Open the URL in a full browser window for the two-column workbench, or use the compact preview in Codex.

The workbench combines a source editor, CPU panel, analog board, ID board, and live signal preview. The navigation rail opens Interfacing, Scope, Memory, and Reference.

- **Assemble & load** validates source, resets the CPU/peripherals, replaces user RAM, loads the machine code, and applies `VECTOR` routes.
- **Run** executes continuously. If source changed, it assembles first. Run becomes Pause while active. The UI yields regularly, so an infinite assembly loop remains stoppable.
- **Step** executes one instruction, or accepts an interrupt at an instruction boundary.
- **Step over** runs until the return address and original SP are reached after a CALL/RST. Breakpoints and watchpoints remain active.
- **Reset** resets CPU and peripherals while retaining user RAM, input-source settings and addresses. Source-declared interrupt routes are reinstalled. It starts at the loaded entry address.
- **Save project** saves the source, entire memory, CPU, peripheral state, wiring, ID, breakpoints and instrument settings in a `.85bench` JSON file. Reloading pauses execution and starts a fresh scope/trace history.

Source drafts and the entered ID are saved automatically in this browser's local storage. This is separate from the explicit project file. Clear browser storage to remove drafts. Choose this project folder in your browser's save dialog to keep exported files together.

Keyboard: Ctrl+Enter assemble, F5 run/pause, F10 step, Shift+F10 step over, Ctrl+S save project, Tab insert indentation. Click a register to edit it and a flag to toggle it while debugging. Click a source line number to toggle a breakpoint.

## Memory and I/O map

| Range | Purpose |
|---|---|
| `0000H–1FFFH` | 8 KB internal monitor ROM, protected from CPU writes |
| `2000H–FFFFH` | **56 KB (57,344 bytes) available user RAM** |
| I/O `80H–83H` | Default analog 8255 #1: A, B, C, control |
| I/O `90H–93H` | Default ID 8255 #2: A, B, C, control |
| I/O `E0H` | Internal monitor console data |
| I/O `E1H` | Console input ready: bit 0 = 1 if bytes are queued |
| Other I/O addresses | Independent 8-bit general-purpose latches, initialized to FFH |

All user RAM addresses are writable and visible, including `2000H` and `FFFFH`. There is no hidden RAM reservation for the simulator. The stack initially points to `FFFFH` and grows downward; a PUSH first writes at `FFFEH`, then `FFFDH`. Your program is responsible for keeping code, data and stack from overlapping.

The actual reset vector at `0000H` contains `JMP 2000H`. The app starts programs at their assembled entry point for convenience. Set PC to `0000H` to run through the monitor reset vector.

Each 8255 has a contiguous four-address mapping. In Interfacing, select I/O or Memory mapped, enter a base address, and apply. I/O mappings use IN/OUT. Memory mappings use LDA/STA or other memory instructions. Mapping collisions, monitor ROM mappings, and console-port collisions are rejected. A chosen memory-mapped peripheral occupies its selected addresses until remapped; the default configuration leaves all user addresses as RAM.

Memory view pages through every address from `0000H` to `FFFFH`. Click a RAM byte to edit, or use Write bytes / Fill range. The ROM is readable. The disassembly follows PC unless Follow PC is turned off. Execution breakpoints stop before an instruction; data read/write watchpoints stop after the accessing instruction. Fetches and immediate-operand fetches use separate trace categories and do not trigger data-read watchpoints.

## Your six-digit ID: exactly two digits per port

The LED board is **8255 #2**, independent of the ADC/DAC chip. Use packed BCD: each decimal digit occupies four bits. The high nibble is the first digit on a port and the low nibble is the second.

For ID `123456`:

| 8255 #2 port | ID digits | Hex value | LEDs, bit 7 through bit 0 |
|---|---|---|---|
| PA (`90H`) | 12 | `12H` | `0001 0010` |
| PB (`91H`) | 34 | `34H` | `0011 0100` |
| PC (`92H`) | 56 | `56H` | `0101 0110` |

The numeric labels above the LEDs decode those nibbles for readability. The LEDs themselves show the individual BCD bits. Leading zeroes are kept. A nibble above 9 is shown as `?`, and a port which is not entirely driving outputs is shown as `--`.

Enter your actual six digits and press **Display** to configure and write this board immediately. To perform the operation using the CPU, press **Generate code**, then assemble and run. Example:

```asm
ORG 2000H
LXI SP, 0FFFFH
MVI A, 80H       ; Mode 0, all ports output
OUT 93H
MVI A, 12H       ; First two digits
OUT 90H
MVI A, 34H       ; Middle two digits
OUT 91H
MVI A, 56H       ; Last two digits
OUT 92H
HLT
END
```

Change the constants for your ID, or let Generate code do it. A six-digit placeholder of `000000` is supplied because the actual ID has not been specified. Active-low LED wiring can be selected in the second 8255's Interfacing panel; the code generator then complements each BCD byte.

Manual Display writes the ports once. Reset/assembly resets the chips, and any CPU program writing the same ports can change the display. To run an ID display and a DAC experiment together, put the ID initialization at the beginning of the DAC program, then use only 8255 #1 in the waveform loop. The example `combined-id-dac.asm` demonstrates this.

## Analog interface: 8255 #1

Default wiring:

```text
8085 I/O bus
  ├─ 8255 #1 (80H–83H)
  │    PA[7:0] ──> DAC0800/0808 data ──> ideal I/V stage ──> DSO
  │    PB[7:0] <── ADC0808/0809 data
  │    PC[2:0] ──> ADC channel address
  │    PC3 ──────> ADC ALE and START tied together
  │    PC7 <────── ADC EOC
  │    ADC OE tied high
  └─ 8255 #2 (90H–93H) ──> three banks of eight ID LEDs
```

`8AH` configures PA output, PB input, PC upper input, PC lower output. The harness deliberately uses the lower nibble for all ADC outputs, because 8255 mode 0 configures Port C direction by nibble. EOC is in the upper input nibble. PC4–PC6 are available as general inputs.

Swap DAC and ADC data ports using the two selectors. The corresponding default control word becomes `98H` when PA is ADC input and PB is DAC output. Port C remains the control port. Disconnect the analog harness when testing 8255 modes 1/2 or manually driving all pins; otherwise the connected ADC continues to drive its data/status inputs.

The PPI panels expose control-word builders, raw register reads/writes, actual pin states, external input switches, and STB/ACK pulse buttons. The displayed control-word byte is the model's configuration, available to the debugger. The original 8255A control register is write-only, so a CPU read of the control address returns the floating bus value FFH. It does not emulate the later 82C55A's enhanced control readback feature.

### ADC0808 / ADC0809

Select a channel through PC0–PC2. A rising PC3 latches the channel and resets a conversion; a falling PC3 starts it. Poll PC7 until EOC becomes 1, then read the data port. OE is tied high in this harness. A channel can use an independent DC level, the signal generator, or DAC loopback. The input source selector is independent for each of the eight channels.

```asm
ORG 2000H
MVI A, 8AH
OUT 83H
AGAIN:
    MVI A, 08H  ; Channel 0; ALE/START high
    OUT 82H
    XRA A       ; ALE/START low: begin conversion
    OUT 82H
POLL:
    IN 82H
    ANI 80H
    JZ POLL
    IN 81H      ; ADC result
    OUT 80H     ; Reconstruct on DAC
    JMP AGAIN
END
```

The ideal conversion interval is `64 / ADC clock`. At 640 kHz this is 100 µs. Conversion uses **simulated time**, not wall-clock delays. Quantization uses an ideal half-LSB transition rule, `clamp(floor(Vin / span × 256 + 0.5), 0, 255)`. The input is sampled at conversion start and held by the model; this is an educational simplification of the real SAR behavior. ADC0808 and ADC0809 use the same ideal model; their real accuracy differences are not injected.

**Convert once** configures the analog 8255, drives a START pulse, advances simulated time for the conversion, and reads the result. **Advance 1 ms** advances the hardware clock without executing CPU instructions. Both are useful when paused.

### ADC0804

Select ADC0804, or load its dedicated example. The harness changes to:

| Pin on 8255 #1 | ADC0804 connection |
|---|---|
| PC3 | `/WR` |
| PC0 | `/RD` |
| PC7 | `/INTR` |
| PB | ADC data (or PA after a data-port swap) |
| `/CS` | Tied low |

Pulse `/WR` low then high. The rising edge starts conversion. `/INTR` goes low when ready. Set `/RD` low to enable and read the data. A low `/RD` acknowledges the result. This profile uses channel 0 only, an ideal 64-clock conversion and a configurable full-scale span. It models a single-ended input relative to zero; differential negative-input behavior is outside its scope.

### DAC0800 / DAC0808

These are current-output devices. The simulator exposes the ideal output current:

`Iref = Vref / Rref`

`Iout = Iref × code / 256`

The unipolar scope voltage comes from an ideal external current-to-voltage stage:

`Vout = Iout × Rload`

At the defaults, code 255 produces `5 × 255 / 256 = 4.98046875 V`, rather than exactly 5 V. Bipolar I/V mode instead maps midscale code 128 to 0 V with an ideal offset/gain stage. References and resistances are configurable. The manual code slider configures the corresponding 8255 port and writes it; a running program can subsequently overwrite that value.

Both device choices share the ideal transfer function. The model does not add their real settling time, compliance limits, nonlinearity, temperature effects or output-stage polarity constraints.

## 8255 modes, directions and handshakes

Writing a control byte with D7=1 selects a mode and resets output latches and handshake/interrupt state. Writing D7=0 performs BSR and preserves the current mode.

| Bit | I/O configuration (`D7=1`) |
|---|---|
| D6–D5 | Group A: 00 mode 0, 01 mode 1, 1x mode 2 |
| D4 | Port A: 1 input, 0 output; ignored for mode 2 direction |
| D3 | Unassigned upper Port C pins: 1 input, 0 output |
| D2 | Group B: 0 mode 0, 1 mode 1 |
| D1 | Port B: 1 input, 0 output |
| D0 | Unassigned lower Port C pins: 1 input, 0 output |

BSR: D3–D1 select PC0–PC7; D0 sets (1) or resets (0) the selected bit. In handshake modes, selected BSR bits also control internal INTE flip-flops.

- **Mode 0:** output ports are latched; input pins are read directly. Port C upper/lower direction can differ.
- **Mode 1 input A:** PC4=`/STB`, PC5=IBF, PC3=INTR; BSR PC4 controls INTE. A low strobe latches data; a completed strobe can request an interrupt. Reading the data port clears IBF/INTR.
- **Mode 1 output A:** PC6=`/ACK`, PC7=`/OBF`, PC3=INTR; BSR PC6 controls INTE. CPU write asserts `/OBF` low; ACK releases it, then INTR can become high.
- **Mode 1 B:** PC2=`/STB` or `/ACK`, PC1=IBF or `/OBF`, PC0=INTR. BSR PC2 controls INTE.
- **Mode 2 A:** independent input and output latches with PC3–PC7 handshakes. BSR PC4 controls input INTE, PC6 output INTE. The PA output driver is active while `/ACK` is low; otherwise external input pins are visible. Group B can still use mode 0 or 1.

The debugger distinguishes physical Port C pin levels from CPU status reads: in strobed modes, status reads show the INTE bits where appropriate, while the pin view shows STB/ACK inputs.

The optional IRQ selector wires the OR of 8255 #1 INTR A/B to one CPU interrupt input. You still need EI and the proper SIM masks. Pulse buttons represent a complete handshake pulse at one simulated instant; propagation and minimum electrical pulse widths are not modeled.

## Interrupts, serial I/O and monitor ROM

The CPU implements priority TRAP > RST7.5 > RST6.5 > RST5.5 > INTR. TRAP is non-maskable and needs a rising edge plus a high level. RST7.5 is rising-edge latched and retains a pulse while masked. RST6.5/5.5 and INTR are level sensitive. SIM controls masks, resets the RST7.5 latch, and sets SOD. RIM reads pending states, masks, interrupt enable and SID. The first RIM after a TRAP reports the saved enable state.

EI takes effect after the following instruction. DI disables immediately. HLT advances PC to the following instruction and stops instruction execution. With “Keep clocking during HLT” enabled, peripheral time continues; an accepted interrupt wakes the processor. Turn this setting off to pause the app's runner automatically on HLT. TRAP can wake a halted CPU even with EI disabled.

The interrupt panel offers persistent High checkboxes and pulse buttons. For level-sensitive manual pulses, the panel performs the acceptance check immediately while the input is high. A masked/disabled level pulse is then gone. The RST7.5 button latches its edge for the next CPU step.

`VECTOR` installs a three-byte JMP in the internal monitor area, so your ISR can live anywhere in user RAM:

```asm
ORG 2000H
VECTOR 003CH, ISR
LXI SP, 0FFFFH
MVI A, 0BH      ; MSE=1, unmask 7.5, mask 6.5/5.5
SIM
EI
WAIT: HLT
      JMP WAIT
ORG 2100H
ISR: PUSH PSW
     INR B
     POP PSW
     EI
     RET
END 2000H
```

Vector addresses accepted by the assembler: `08H,10H,18H,20H,24H,28H,2CH,30H,34H,38H,3CH`. The corresponding routes can also be changed in Reference. There is no hidden ISR storage in user RAM.

INTR supports an externally supplied RST 0–7 or three-byte CALL address, selectable in Reference. General arbitrary interrupt-acknowledge instruction streams are not modeled. SID is a manual input and SOD can be watched through SIM and capture data. HOLD pauses instruction execution with HLDA implied; it does not implement a second bus master or DMA controller. Additional wait time is configured per instruction, rather than a pin-level READY waveform.

The monitor reserves these optional software services:

| Service | Operation |
|---|---|
| `RST 1` | Output accumulator character to the console |
| `RST 2` | Read a queued console byte into A; return zero if empty |
| `RST 3` | Print zero-terminated bytes addressed by HL; updates A, flags and HL |

Other vectors return by default until routed. The console also accepts raw IN/OUT on E0H; E1H reports whether input is queued. These are simulator monitor services, not built-in 8085 CPU features.

## Waveform generation and oscilloscope

The independent **input signal generator** produces sine, square, triangle, sawtooth, DC or deterministic pseudo-noise. Amplitude is **peak**, so amplitude 2 V and offset 2.5 V gives a nominal 0.5–4.5 V input. Configure each ADC channel's source in Interfacing. The generator follows simulated CPU time.

The **8085 waveform program builder** creates a lookup table and an actual assembly delay loop. Available tables: 16, 32, 64, 128 or 256 samples. Minimum/maximum codes set the DAC range. A delay-loop count from 1 to 255 controls the period. For `N` samples and delay count `D`:

- I/O-mapped DAC period = `N × (41 + 14 × D) + 24` T-states.
- Memory-mapped DAC period = `N × (44 + 14 × D) + 24` T-states.
- Frequency = CPU clock / period.

The formulas include loop overhead, assume no extra wait states, and apply to a repeating generated table after startup. Interrupts or code changes can alter timing. The program builder sets PA to DAC output and PB to ADC input, and uses the current 8255 #1 address mapping.

The DSO offers:

- **CH1/CH2:** DAC voltage, selected ADC analog input, or ADC code reconstructed as `code × span / 256`. Turn a channel off if unused.
- **Timebase:** ten horizontal divisions. **Vertical:** eight divisions around the chosen center voltage.
- **Auto / roll:** newest samples. **Normal:** retain the latest completed triggered frame. **Single:** capture and freeze the first completed trigger after arming. Trigger location is 20% into the display, leaving 80% post-trigger history.
- **Freeze:** freezes the display, while CPU/peripheral execution continues. Arm clears the display's frozen state and waits for a fresh single trigger where selected.
- **Cursors:** click twice on the time display for T1/T2, delta time and reciprocal frequency.
- **Measurements:** CH1 peak-to-peak, RMS including DC, mean, midpoint crossing frequency and approximate midpoint duty cycle. Frequency needs at least two rising midpoint crossings; flat signals report no frequency.
- **FFT:** CH1 Hann-windowed, up to 1,024 uniformly sampled points, linear peak amplitude and frequency axes. DC is included. **X–Y:** CH1 on X and CH2 on Y.
- **Digital logic:** eight lanes from either 8255's selected port, using the same time window. Data captures also include SID/SOD/EOC.
- **Export:** entire current capture ring as CSV, displayed analog trace as PNG, and bus transactions as a separate CSV.

The capture ring retains at most 32,768 samples. At 100 kS/s this is about 327.68 ms; at 1 MS/s about 32.768 ms. Changing sample rate or CPU clock clears old captures to avoid mixing sample intervals. Choose enough sample rate and enough retained time for your experiment. A slow-changing signal may need a longer timebase. High-frequency signals can alias. FFT estimates are subject to sample rate, finite window and quantization.

## Assembler syntax

Case insensitive Intel mnemonics. All 246 documented opcode encodings are included and searchable in Reference. M means the memory byte at HL. Register-pair spellings B/D/H or BC/DE/HL are accepted where appropriate; PUSH/POP accept PSW (AF alias).

```asm
PORT EQU 90H
ORG 2000H
START: MVI A, 'A'
       OUT PORT
       JMP START
END START
```

Semicolon starts a comment outside a quoted string. Labels can use `NAME:`; labels preceding instructions/directives are also accepted. Hex: `0FFH`, `FFH`, `0xFF`; binary: `1010B` or `0b1010`; octal: `77O`/`77Q`; decimal: `123`/`123D`. Use a leading zero in Intel-style hex when the first digit is A–F for familiar, unambiguous source. Strings use single or double quotes. Escapes include `\n`, `\r`, `\t`, `\0`, `\xNN`, escaped quote and backslash.

| Directive | Meaning |
|---|---|
| `ORG address` | Set location counter; default is 2000H |
| `DB value, 'string', ...` | Emit bytes |
| `DW value, ...` | Emit little-endian 16-bit words |
| `DS count [, fill]` | Emit initialized storage, zero by default |
| `ALIGN boundary [, fill]` | Advance to a multiple of boundary |
| `NAME EQU expression` | Constant, including forward expressions |
| `NAME SET expression` | Mutable assembly-time value, resolved at each use |
| `END [entry]` | Stop assembling; optionally select starting PC |
| `VECTOR vector, handler` | Install monitor JMP to a user-RAM handler |
| `NAME MACRO arg1, arg2` … `ENDM` | Parameterized source expansion |
| `REPT count` … `ENDM` | Repeat a source block; literal expression count |

Expressions support `+ - * / %`, shifts, bitwise AND/OR/XOR/NOT, comparisons, parentheses, unary LOW/HIGH and `$` for the current row address. Division truncates to an integer. Byte values must be -128..255; word values -32768..65535. Negative values emit two's-complement bytes. ORG/storage sizes must be resolvable in the first pass. Source expansions are bounded to prevent accidental infinite macros. Macros can use `%%local` names, made unique for each invocation; label a macro invocation with a colon. REPT counts are numeric expressions rather than forward-symbol expressions.

Example macro:

```asm
WRITE MACRO port, value
    MVI A, value
    OUT port
ENDM
ORG 2000H
WRITE 93H, 80H
WRITE 90H, 12H
HLT
```

This assembler targets a single absolute-memory image. Intel relocatable object modules, external linking, INCLUDE files, conditional-assembly IF blocks and the complete historical ISIS-II macro language are not implemented. Standard CPU instructions, the listed directives, macros and expressions are available.

## Import, export and model boundaries

Open supports `.asm`/text source, Intel HEX, raw binary and `.85bench` project files. HEX import checks checksums, record lengths, EOF, overlaps, 64 KB bounds and protected monitor addresses. Raw binary import asks for a RAM load address. RAM exports cover `2000H–FFFFH`; scope and bus exports use CSV. Exported HEX does not contain ROM/vector configuration; use a project file or the source's VECTOR directives to preserve those settings.

The implementation models documented 8085 behavior at **instruction granularity**. Instruction timing follows 8085 counts, including five states to enter HLT and variable taken/not-taken branch costs. The AC flag follows the complement-add carry convention for subtraction/decrement; ANA sets AC on the 8085. Undocumented opcodes and the undocumented K/V flags are intentionally outside the model and undocumented opcodes stop with a fault.

Bus transactions and peripheral edges occur at instruction boundaries, not electrical subcycles. Captured outputs use zero-order hold at the selected sample rate. The trace is a transaction log, not an ALE/RD/WR pin timing diagram. There is no analog circuit solver, analog component tolerances, electrical contention solver, power model, real-device connection, or general DMA controller. These limits are also shown inside Reference.

The project is organized into independent ISA, CPU, assembler, bus, peripherals and scope modules. Run `node --test tests/*.test.js` to verify behavior after changes. No third-party code packages are required.
