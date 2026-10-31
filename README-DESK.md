# 8085 Lab Desk

A local, offline laboratory desk with photographic equipment surfaces, based on the supplied Kitek M85-04 photos, two lab videos and procedure sheets. The main view contains a green LCD trainer, a physical keyboard, patch leads, grey interface modules, a separate ID LED board and a Tektronix TDS2001C-style oscilloscope.

**Start:** double-click **Start Simulator.cmd**. Keep the server window open while using the app. No npm installation, build step, account or internet connection is required. Node.js 18+ or Python 3 is sufficient.

Alternatively:

```powershell
node tools/server.mjs --open
```

The server prints its loopback address, normally `http://127.0.0.1:8085`. Refresh an already-open tab to see the new desk.

## Use the LCD like the lab

1. Click **Connect photo setup**, or connect AC, PS/2, ribbon, supply and probe leads yourself. Switch the trainer on.
2. Click the green LCD or **Type on board**. Press `1`, then `A`. Type `2000`, Enter.
3. Type one instruction and press Enter. **That line alone is assembled and stored**, and its instruction length determines the next displayed address.
4. Try `MVI A 09`, `MVI B 04`, `ADD B`, `RST 5`, pressing Enter after each.
5. Press the board's **Reset key**. Press `G`, type `2000`, then `.` to run.
6. Press `R`, then `A`. The LCD shows `A=0D`. `M` examines memory; `1 → C` disassembles; `T` steps one instruction per Enter.

The LCD displays two rows of 20 dot-matrix characters. Notebook → Terminal records each processed command and instruction. Example programs are entered visibly through the same line-at-a-time monitor path. The source editor is retained separately in [advanced.html](advanced.html).

## Lab entry rules

Write `MVI A 80`, `LXI D 0000`, `OUT 03`; only `MOV A,B` uses a comma. No H suffixes, leading/trailing/doubled spaces, labels or comments. A syntax error writes nothing and keeps the same address. Backspace/Delete and coding-address arrows are inactive: press Reset, return to the address and retype. Valid but logically wrong code is accepted because checking is syntax-only.

The lab defaults are **00/01/02/03 for analog** and **30/31/32/33 for ID or stepper**. The stepper example uses the sheet's F9/F5/F6/FA sequence and CALL 03A6. The ID defaults to **425050**, giving PA=42, PB=50, PC=50.

## Included

- All **246 documented 8085 opcode encodings**, flags, timings, stack, interrupts and RIM/SIM; undefined opcodes report an error.
- All **57,344 bytes of RAM from 2000H through FFFFH**; 0000H–1FFFH is reserved for internal monitor services.
- Two on-board 8255A models plus the SC-01 study card’s independent 8255, with modes 0/1/2, BSR and handshake latches. DAC/ADC use 00–03; SC-01 ID uses 30–33 through the 50-pin CPU bus. The alternate motor profile uses the trainer’s second PPI at 30–33.
- **Six-digit ID: PA = first two digits, PB = middle two, PC = final two**, packed BCD on 24 LEDs. Leading zeroes are preserved. `425050` is the value from the supplied ID sheet; enter your ID in Notebook → Experiments.
- A dual DAC0800 module with independent X/Y outputs and four gain/offset trimmers; an eight-channel ADC0809-style interface with conversion latency; an IC-08-style four-phase stepper driver and moving rotor.
- An 8253 counter model, clock/gate/output patch points, digital switches, SID/SOD, interrupt pin and vector controls.
- Connectable AC, PS/2, 50-pin CPU-bus and 26-pin port ribbons, four-wire supplies, individual jumpers, scope tips and ground clips. Wiring, power, direction bits and conflicting drivers affect the circuit.
- Working oscilloscope channel, scale/position, coupling, probe compensation, invert, acquisition, trigger, Run/Stop, Single, Auto Set, reference, measurement, cursor, display, math/FFT, save/recall and virtual USB controls. Drag or wheel a knob; Shift gives fine adjustment.
- CPU-generated sawtooth, triangle, square and sine experiments; ADC → DAC loopback; ID + DAC together; clockwise/reverse/half-step motor examples.
- Complete `.85desk` save/restore for RAM, CPU, cable netlist, monitor history, instrument settings and desk positions. Assembly, Intel HEX, monitor history, scope CSV and PNG exports.
- All 22 supplied photos (including nine detailed close-ups and the final scope waveform reference) and both supplied videos copied into `references/lab`, available in the in-app References notebook. Per-second video review frames and contact sheets are kept there too.

Drag the desk to pan, scroll to zoom, use the top focus buttons, and drag an equipment title strip to reposition it.

## Verification and fidelity

Run **Run Tests.cmd** or:

```powershell
node --test tests/*.test.js
```

The suite includes CPU opcode and exhaustive arithmetic checks, peripheral handshakes, the full RAM range, LCD entry/reset/run sequences, cable routing, dual DAC/ADC, separate ID ports, stepper phases, counter behavior, scope acquisition/FFT and project restoration. Browser checks cover the physical layout and actual keyboard workflow.

This is an instruction-level educational reconstruction. The supplied PDFs establish the new port map and exact ID, motor and DAC example bytes. The original Kitek ROM and complete module schematics were not supplied. The sheet's CALL 03A6 is supported by an executable compatibility ROM delay, with reconstructed timing. Observed LCD prompts and workflows are reproduced; unobserved monitor text and module pin conventions are reconstructed. Analog behavior is ideal, and the scope's virtual sample rate is distinct from the real instrument's printed 500 MS/s rating. See [the desk guide](docs/USER-GUIDE.md) for the precise models and assumptions.

The board identity and feature set were checked against [Kitek's manufacturer page](https://kitektechnologies.com/8085-8086-process-trainer.html) and its [specification PDF](references/lab/M85-04-manufacturer.pdf). Scope controls were referenced against the [Tektronix user manual](https://download.tek.com/manual/071272203Web_RevA.pdf). Component datasheets and CPU sources are in [docs/references](docs/references/SOURCES.md).

## Project files

| File | Purpose |
|---|---|
| `index.html`, `lab.css` | Physical desk interface |
| `src/desk-app.js`, `src/lab-scene.js`, `src/lcd.js` | Interaction, equipment layout, dot-matrix LCD |
| `src/monitor.js`, `src/trainer-syntax.js` | Strict single-line trainer monitor and syntax parser |
| `src/photographic.js`, `photographic.css`, `assets/photographic` | Photographic surfaces with live controls |
| `src/cpu.js`, `src/isa.js`, `src/assembler.js` | CPU, opcode definitions, assembler/disassembler |
| `src/desk-lab.js`, `src/circuit.js` | Netlist, power, dual DAC, ADC, motor and 8253 |
| `src/tds2001c.js`, `src/tds-display.js` | Scope controls, acquisition and display |
| `src/desk-project.js`, `src/desk-experiments.js` | Project state and lab programs |
| `advanced.html`, `styles.css`, `src/app.js` | Preserved advanced development workspace |
| `examples/lab-desk` | Assembly examples using the desk address map |
| `references/lab` | Original media and review material |
| `docs/qa` | Saved verification evidence |
| `tools/server.mjs`, `tools/server.py` | Local-only launch servers |

All application files, references and tooling are inside this project folder. Exports use the browser's download destination; choose this folder when saving them. There is no telemetry or remote backend.

The supplied PDFs and official checks are recorded in [LAB-MATERIAL-VERIFICATION.md](docs/LAB-MATERIAL-VERIFICATION.md). Visual assets were made with the built-in image tool; [asset provenance and prompts](assets/photographic/README.md) are saved locally.

The latest LED-board photos identify it as the **SC-01 8255 Study Card**. Its own PPI, PA/PB/PC edge LEDs, bus indicators, 50-pin CN1, 26-pin CN2 and full-clock/single-step controls are now represented. Connect **trainer CN1 → SC-01 CN1**, using the 50-pin cable, rather than wiring it as a passive 24-LED panel. See [SC01-STUDY-CARD.md](docs/SC01-STUDY-CARD.md) for the chip-selection and instruction-level stepping conventions.
