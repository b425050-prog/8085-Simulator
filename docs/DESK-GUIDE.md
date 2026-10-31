# 8085 Lab Desk user guide

## Starting and moving around

Double-click `Start Simulator.cmd`. The launcher uses Node.js or Python 3 and binds only to `127.0.0.1`. It selects the next port if 8085 is busy. Keep the server terminal open. The application runs offline using local HTML, CSS and JavaScript; the supplied video/photo files are local as well.

The default page is the physical desk. **Bench / Trainer / Oscilloscope / Keyboard** frame the equipment. Scroll over the desk to zoom; drag a bare desk area to pan. Drag a title strip to move an instrument. Focus, position and zoom are included in a saved project.

The preserved [advanced workspace](../advanced.html) provides the original source editor, detailed CPU/memory inspectors, bus trace, watchpoints, interrupt panel, extra ADC0804/DAC0808 profiles and logic capture. Its separate documentation is [ADVANCED-WORKSPACE.md](ADVANCED-WORKSPACE.md). Its default port map is 80H/90H; the physical desk defaults to 00/30. The two pages run separate machines.

## Trainer LCD and keyboard

The LCD is 20 columns by two rows with a green dot-matrix theme. Click it or **Type on board** to direct the computer keyboard to it. The drawn PS/2 keyboard sends the same keys. Power and a connected PS/2 cable are required.

The photographed sheets and first video establish this workflow:

```
Power ON                  8085 LCD TRAINER / M85-0X
1                         A=ASSEMBLE MODE / C=DISASSEMBLE MODE
A                         RAM ADR:
2000 Enter                2000 _
MVI A 09 Enter            2002 _
MVI B 04 Enter            2004 _
ADD B Enter               2005 _
RST 5 Enter               2006 _
Reset
G 2000 .                  execute from 2000H
R A                       A=0D
```

Only pressing Enter commits the current assembly instruction. There is no whole-source assembly or memory replacement in this monitor path. Invalid instructions leave memory and the current address intact and display an error. Backspace and Delete are inactive. Esc or the red Reset key resets the monitor; re-enter the target address to correct an instruction. Syntax rejection keeps the address and all RAM bytes unchanged and requires Reset before correction. A line contains one instruction with exactly one ASCII space between mnemonic/operands. Only MOV uses a comma, without spaces around it: `MOV A,B`. MVI and LXI use spaces: `MVI A 80`, `LXI D 0000`. Leading, trailing or doubled spaces are rejected. Labels, comments, directives and H suffixes are invalid on the LCD. Bare numeric operands are hex, so `MVI A 80` loads hexadecimal 80. `MVI A 0A` is valid; `MVI A 0AH` is rejected. Jump operands are bare hexadecimal addresses, e.g. `JMP 2006`; no O-/0- prefix is accepted.

The notebook's Terminal page keeps up to 2,000 processed command/instruction records, including addresses, stored bytes and errors. Notebook → Experiments can type a program for you. Each instruction is displayed, then receives its own Enter event; an ordinary key press stops automatic entry. Pasted text follows the same process. Labels in included examples are resolved to numeric operands before the typing begins.

**Reset key** returns to the monitor and stops execution. It retains user RAM, results and peripheral outputs, allowing the sheet's Reset / R / A inspection sequence. It differs from a power cycle. **Vector interrupt** asserts TRAP; a handler can be installed through Connections. `RST 5` is the reconstructed return-to-monitor service and restores the stack return address. `HLT` stops the program as a CPU halt.

| Command | Behavior |
|---|---|
| `1`, `A`, address, Enter | Assemble instructions sequentially |
| `1`, `C`, start Enter, end Enter | Disassemble; each Enter advances one instruction |
| `M` address Enter | Show a byte; enter a hex byte to store and advance |
| `G` address `.` or Enter | Execute at the supplied address |
| `R` then A/B/C/D/E/H/L/F | Inspect or edit an 8-bit register |
| `R` then SP/PC/BC/DE/HL Enter | Inspect or edit a pair / 16-bit register |
| `T` address Enter | Enter executes one CPU instruction at a time |
| `I` port Enter | Read an I/O port |
| `O` port data Enter | Write an I/O port |
| `F` start end byte Enter | Fill inclusive RAM range |
| `B` start end destination Enter | Copy a RAM range, including overlap |
| `.` | Exit to menu; from GO it starts execution |

When execution is running, Reset or dot stops it. A breakpoint is checked after an instruction. Execution yields to the browser so infinite waveform programs remain controllable. Simulation speed controls the virtual time budget; actual throughput also depends on the host computer. Simulation Pause freezes peripherals and CPU together. All displayed frequency measurements use virtual time.

## Memory and address map

| Range | Desk default |
|---|---|
| 0000H–1FFFH | Internal monitor region, protected from ordinary writes |
| 2000H–FFFFH | All 57,344 bytes of user RAM |
| 00 / 01 / 02 / 03 | 8255-1 PA / PB / PC / control |
| C4H / C5H / C6H / C7H | 8253 counter 0 / 1 / 2 / control |
| 30 / 31 / 32 / 33 | SC-01 PA / PB / PC / control; trainer motor PPI in the alternate profile |
| E0H / E1H | Internal console services retained from the CPU engine |

Default program entry is 2000H and SP is FFFFH. RAM includes the uppermost byte, FFFFH. Stack writes are ordinary RAM writes and can overwrite a program placed at the top of memory.

The supplied IC-02 8085 sheet establishes analog PA/PB/control at 00/01/03. The supplied ID and motor sheets establish PA/PB/PC/control at 30/31/32/33. These replace the earlier provisional C0/C8 mapping. Timer C4–C7 remains a simulator default. Connections → Address map changes them. Included desk programs are regenerated from the chosen map. The default CPU clock is 3.072 MHz, assuming a 6.144 MHz oscillator divided by two; the manufacturer describes 6.144 MHz operation without resolving that distinction, so CPU frequency is editable. Do not infer exact physical waveform timing from that assumption.

All 246 documented opcode encodings are implemented with 8085 timings, flags, register/memory operations, stack, calls/returns, conditional branches, interrupts and RIM/SIM. Undefined/undocumented opcodes fault. HOLD, extra wait-state and INTR controls are available in the advanced workspace. The monitor UI itself is a JavaScript state machine; it is not the original Kitek monitor ROM executing on the CPU.

## Making connections

Choose a cable in the top toolbar, then click the first and second endpoints. Auto connector detects complete housings; Jumper selects individual pins. A cable can be unplugged by clicking it and pressing Delete / the toolbar delete button, or through the Connections notebook. Cables can share terminals. A full supply cable carries +5 V, ground, +12 V and −12 V separately. A full FRC carries 24 corresponding I/O signals; power is connected separately, as in the photos.

- AC: bench outlet → trainer/scope inlet; mains switch and instrument switch must be on.
- Keyboard: PS/2 lead → trainer CN7.
- Analog FRC: trainer CN4 / 8255-1 → DAC or ADC CN2. Stepper FRC: trainer CN3 / 8255-2 → motor CN2, matching the stepper sheet’s 30–33 map.
- ID CPU bus: trainer CN1 → SC-01 CN1, 50 logical signals including +5 V/GND. SC-01 CN2 exposes its independent 24 port signals.
- Analog/motor module supply: CN5 → module CN1. The SC-01 preset obtains +5 V/GND through its CPU bus.
- Probe: scope CH1/CH2 BNC → signal test point; separate ground clip → circuit ground.

The netlist joins individual wires and corresponding bundle pins. Output direction bits decide whether a PPI pin drives a voltage or reads the connected net. Floating digital inputs use a model pull-up; floating module inputs use a pull-down. Conflicting ideal drivers differing by more than 0.55 V make the net indeterminate and produce a status message. This is contention detection, not an analog short-circuit/current model.

The virtual FRC uses the logical order PA0–PA7, PB0–PB7, PC0–PC7, +5 V, GND. The exact physical 26-pin ordering was not established by the supplied material; these labels are the simulator convention, not a physical-kit wiring specification. The Connections patch panel exposes every logical pin, logic switch and timer terminal.

## 8255 and ID LEDs

Both trainer PPIs and the independent SC-01 PPI include mode 0, mode 1 strobed I/O, mode 2 bidirectional A, BSR, mixed C directions, input/output latches, STB/ACK, IBF, /OBF, INTE and INTR. A mode-set control word clears output latches. Handshake signals use the allocated Port C bits. The test suite exercises all these modes.

The ID board is the **SC-01 study card with its own 8255**, independent of both trainer PPIs. Its 50-pin CN1 connects to the trainer CPU bus; its CN2 exposes 24 port signals. Its six-digit field is in Notebook → Experiments. Enter all six digits, including leading zeroes, then type/run the generated ID or combined program.

For ID `123456`, write `80` to control `33`, then `12` to `30`, `34` to `31` and `56` to `32`. On the LCD, use `MVI A 80`, `OUT 33`, then each data pair and its OUT instruction. Each port's upper nibble represents its first decimal digit and lower nibble its second. The eight lamps are binary LEDs, not seven-segment numerals; the small value label makes the pair legible. Active-low polarity can be selected in Connections. No automatic ID helper overwrites running port outputs.

## DAC0800 and waveform generation

The IC-02-style module has two DAC0800 channels, two 741-style output stages, X-OUT, Y-OUT, ground, FRC and supply terminals. PA drives X and PB drives Y. The module requires +5 V, ground, +12 V and −12 V. The separate ID board remains usable at the same time.

The ideal inverting output model is:

```
Vout = clamp(−5 × code / 256 × gain + offset, −10.5, +10.5) volts
```

Turn the four trimmers to adjust each channel's independent gain/offset. This captures DAC scaling, polarity and trim effects; physical module resistor values and calibration were not supplied. The lower-level DAC current model and adjustable reference/load are available in the advanced workspace.

Included programs generate sawtooth, triangle, square and a 32-sample sine through CPU `OUT` instructions. Delay loops execute on the simulated CPU. Nothing draws a preset waveform when a DAC program is selected: a trace appears only after code runs through a powered, wired module and a connected probe.

## ADC0809 interface

The IC-01-style card is an eight-channel, 8-bit converter. The logical harness uses PB for conversion data, PC0–2 for channel address, PC3 for tied ALE/START, and PC7 for EOC, with OE enabled. Control word 8AH gives PA output, PB input, PC upper input and PC lower output. These harness choices are documented reconstruction defaults; a complete IC-01 schematic was not supplied.

The falling START edge samples the selected input. EOC goes low during conversion, then high when the result is ready. Conversion time is 64 ADC clocks (100 µs at the default 640 kHz). Quantization rounds the ideal 256-step code and clips at 0/255. Channel sources can be the physical input jack, the VIN knob, or the auxiliary generator; select them in Connections. The ADC loopback example polls EOC, reads PB and writes PA to the DAC. Both cards share the parallel FRC with the appropriate directions.

The advanced workspace additionally supports ADC0804's /WR, /RD and /INTR protocol.

## IC-08 stepper and 8253

The four-phase IC-08-style driver uses PA0–PA3 of the 30–33 PPI. The clockwise sheet applies F9, F5, F6, FA; the reverse sequence is FA, F6, F5, F9. The upper four bits do not drive the motor. The motor preset disconnects the LED card because both sheets use the same 30–33 PPI; DAC/ADC remain on 00–03. +5 V, +12 V and ground are required. Coil lamps show the energized phases and the rotor follows valid phase order. Included programs cover full-step clockwise, reverse and half-step. The phase ring is 1,5,4,6,2,10,8,9; each adjacent half-step is 0.9° with the default 1.8° full-step motor. Invalid jumps are counted. Electrical phase sequencing is simulated; motor inertia, torque, load and missed physical steps are not.

The 8253 model implements modes 0–5, gate behavior, LSB/MSB access, latched reads, binary/BCD counts, and periodic outputs. Each channel's default independent clock can be changed in Connections. CN2 exposes clock, gate and output. Driven external clock terminals count rising logic transitions when the circuit is synchronized; for high-frequency clocks use the internal clock setting. This is not an event-accurate model of cascaded high-frequency counters.

## TDS2001C-style oscilloscope

The beige/teal case and button arrangement follow the photographed Tektronix TDS2001C. All visible front keys have handlers, and knobs accept drag, mouse wheel or arrow keys. Shift enables finer position/level/trim increments. Scope power depends on its own AC connection.

| Controls | Implemented behavior |
|---|---|
| 1 / 2 | Select channel menu; pressing again toggles channel |
| Position / Scale | Independent vertical positions and volts/div |
| Channel softkeys | DC / AC / GND, 20 MHz ideal low-pass, coarse/fine, 1/10/100/1000× probe compensation, invert |
| Horizontal position / scale | Time offset and 5 ns–50 s/div settings; Main / Window / Zero |
| Trigger menu / level | Edge, pulse-width condition, ideal video sync; channel/ext/line source, slope, coupling and Auto/Normal |
| Set to 50% / Force / Trig View | Midpoint level, forced acquisition, visible trigger line |
| Auto Set | Fit active channels, position and timebase from acquired data |
| AutoRange | Periodically refit the connected signal |
| Run/Stop / Single | Freeze/resume or capture one qualifying trigger |
| Acquire | Sample, min/max peak detection, moving acquisition average; 4/16/64/128 averages |
| Measure | Five editable measurement slots; frequency, period, mean, peak-to-peak, RMS, min/max, timing/duty and phase calculations |
| Cursor / multipurpose knob | Two time or amplitude cursors, delta and reciprocal-time readout |
| Math | CH1 ± CH2, multiplication, FFT; Hanning/Flattop/Rectangular windows; linear RMS or dBV RMS |
| Ref | Save and show two reference traces |
| Display | Vectors/dots, persistence, XY, contrast |
| Save/Recall | Ten setup slots, waveform CSV, screen PNG and Save All |
| USB socket / File Utilities | Insert virtual drive, list saved files, export latest |
| Utility | Model/status, template limit comparison, measurement logging, simulated calibration result |
| Help / Default Setup / Menu Off | Context instructions, reset settings, hide soft menu |

Connections contains physical probe attenuation, detailed pulse/video/holdoff settings, math scale and exports. A 10× physical probe with a 10× menu setting reads the original circuit voltage. A mismatch reproduces a scaled voltage display. The two channels share the scope chassis ground. At least one ground clip or the chassis GND jack must return to the circuit ground; connecting a clip only to the scope itself does not ground the circuit. An unreferenced probe produces no acquired signal.

The real instrument's **50 MHz / 500 MS/s** label is reproduced visually. The numerical capture rate defaults to **100,000 samples/s**, configurable from 1,000 to 1,000,000; the bounded history holds 32,768 records, and acquisitions reduce to 2,500 points. Timebase selection cannot recover detail outside that sample rate/history. Very fast signals alias and very slow settings can display an incomplete history. The virtual scope is not the Tektronix firmware: video sync, AC-line triggering, acquisition averages, low-pass filtering, setup storage and limit testing are educational approximations. There is no USB hardware driver, proprietary calibration, analog front-end noise, acquisition ASIC or real bandwidth emulation. Self Cal checks/resets the model's ideal signal path, not real hardware.

## Saving, importing and references

The top Save button downloads a `.85desk` project containing CPU/RAM, both PPIs, ADC, cable netlist, module settings, ID, motor, counters, monitor entries/history, scope configuration, references, up to 8,192 recent capture points, desk positions and zoom. Loading validates into a separate machine before replacing the current state and pauses CPU execution. Press G with the desired address to continue. Unsaved desk state is not silently persisted across page reloads.

LCD assembly imports use the same strict lab dialect, one instruction per line, starting at 2000. They are validated without fixing whitespace or punctuation, then typed through the LCD with a separate Enter for each line. Only a final file newline is ignored. No labels, ORG, comments or H suffixes are accepted; generated labels are resolved internally before exporting lab lines. Data tables use Intel HEX import or the advanced workspace. Intel HEX loading preserves RAM bytes not present in the file. Exports use the browser download folder; choose the project folder if all results should remain together. Browser cache/storage is managed by the browser.

Notebook → References displays all 22 supplied photos (including the nine detailed close-ups and the final scope waveform reference) and both videos from `references/lab`. The review script extracted one frame per second plus timeline contact sheets; these are evidence used to reconstruct component layout and LCD states, not app runtime dependencies. `tools/media-deps` contains local-only media inspection libraries; the simulator needs none of them.

The primary board source is [Kitek's product page](https://kitektechnologies.com/8085-8086-process-trainer.html) and the [local manufacturer PDF](../references/lab/M85-04-manufacturer.pdf). Its supported interfaces include the IC-01 ADC0809, IC-02 dual DAC0800 and IC-08 stepper modules. The scope reference is the [official Tektronix TDS1000C/TDS2000C manual](https://download.tek.com/manual/071272203Web_RevA.pdf). Additional component sources are in [references/SOURCES.md](references/SOURCES.md).

## Verification

Run `node --test tests/*.test.js` or `Run Tests.cmd`. The suite covers all documented encodings, exhaustive arithmetic/flag and DAA cases, interrupts, peripheral handshake modes, memory protection/range, HEX, LCD one-line commit and error recovery, Reset/run/result inspection, netlist contention/disconnection, dual DAC, ADC latency, independent BCD ports, motor direction, 8253, scope processing and project restoration. Saved screenshots and browser QA notes are in `docs/qa`.

## Supplied PDFs and strict lab profile

The newer sheets override the earlier provisional map. The DAC sheet's **8085 page** uses 00–03; page 2 is 8086 material and is not used by this 8085 CPU. The SC-01 ID and stepper sheets both use 30–33 in alternate profiles; the complete connected SC-01 bus selects its independent chip instead of the trainer motor PPI for this range. The default ID is 425050. The analog PPI and SC-01 remain independent; motor and ID are alternate experiments at the second address range.

The sheet's ROM delay at 03A6 is installed as real 8085 instructions: PUSH PSW; DCX D; MOV A,D; ORA E; JNZ back to DCX; POP PSW; RET. It preserves A/flags and balances the stack. DE=N gives N iterations; DE=0000 gives 65,536 iterations. The implementation takes 24*N+29 T states. This is a compatibility service, since the original kit ROM and its exact delay timing were not provided.

The Intel manual and printed PDFs use conventional commas/H notation. Those are not the LCD input grammar requested for this lab. The monitor enforces the user's exact spaces, MOV-only comma and no-H rules while producing the same documented Intel opcodes. A valid different instruction is not rejected merely because it was unintended; the checker does not infer program logic.

The photographic theme uses locally stored image assets only. Circuit state, LCD, scope, key handling, wire terminals, LEDs and the moving rotor remain live UI elements. These are reconstructed surfaces, not a claim that every printed label is an original manufacturer photograph.

See [LAB-MATERIAL-VERIFICATION.md](LAB-MATERIAL-VERIFICATION.md) for exact program-byte fixtures, official references, timing checks and limitations. Older saved desks preserve their saved address map and RAM; new desks use 00/30. Do not assume an old C0/C8 program was silently relocated.

The later detail photos were used to refine the trainer’s DIP layout, CN4 ribbon header, CN5 supply order, DB9/keyboard sockets and red keys, and the IC-08 transistor layout, metal motor face and brass pinion. The partly hand-obscured photo does not establish hidden details. All six originals are preserved in `references/lab/details`.

The final three photos reveal the SC-01 study card’s independent 8255 and its CPU-bus connection. The SC-01 slide switch selects continuous clock or instruction-level single-step; after G, each STEP press executes one complete instruction. Its AD0–AD7 and /CS/A0/A1//RD//WR lamps show the latest retained CPU transaction. Physical microcycle gating, exact 50-pin numbering and address-decoder circuits are unprovided. [SC01-STUDY-CARD.md](SC01-STUDY-CARD.md) explains the implemented selection and wiring. The old provisional three-row LED surface is no longer used.
