# Exam practice quick start

Double-click **Start Simulator.cmd**, or open the running app at **http://127.0.0.1:8085/**. Refresh the page after an update. Everything runs locally.

## Find and connect the equipment

Use **Trainer**, **Oscilloscope** and **Keyboard** to enlarge equipment. **Display** enlarges only the scope screen; double-clicking that screen does the same. **Bench** returns to the whole desk. The **CN** button toggles readable connector labels. Click a connector label and then its destination to connect the real terminals.

For DAC practice, **Connect photo setup** attaches AC, keyboard, the analog ribbon, module supply, a CH2 probe on X-OUT and its ground return. It connects the independent SC-01 card too. Notebook → Connections lists the actual cables and live DAC codes/voltages.

| Equipment | Port A | Port B | Port C | Control |
|---|---|---|---|---|
| Analog 8255-1, trainer CN4 | 00 → DAC X-OUT | 01 → DAC Y-OUT | 02 | **03** |
| Independent SC-01 ID card | 30 | 31 | 32 | **33** |
| Alternate stepper profile, trainer CN3 | 30 → motor phases | 31 | 32 | **33** |

The ID and motor sheets use the same alternate address range. The motor preset unplugs the SC-01 CPU bus and uses the trainer's second PPI. The analog PPI stays separate. To make all ports outputs, enter `MVI A 80`, then `OUT 03` for analog, or `OUT 33` for the ID/motor profile.

The ID example defaults to the sheet's **425050**, with **42 on A, 50 on B and 50 on C**. Change the six digits in Notebook → Experiments. LEDs show each pair in two BCD nibbles.

## Enter each instruction on the LCD

1. Power the trainer and connect the PS/2 keyboard to CN7. Click **Type on board**.
2. Press `1`, `A`, type `2000`, and press Enter.
3. Type **one instruction**, then Enter. The next byte address appears.
4. Press Reset when finished. Press `G`, type `2000`, then `.` to run.
5. Reset returns to the monitor while retaining RAM. Use `R`, then `A` to read A, `M` for memory, or `1` → `C` to disassemble.

All numbers are hexadecimal without H. Exactly one ASCII space separates fields. Examples: `MVI A 80`, `LXI D 0000`, `JMP 2006`, `OUT 01`. **Only MOV uses a comma: `MOV A,B`.** Extra spaces, commas elsewhere, H suffixes, comments and labels are rejected. Syntax checking does not reject a valid instruction merely because its logic is wrong.

A rejected line writes no bytes and stays at the same address. Backspace/Delete and coding-address arrows are inactive. **Reset → 1 → A → the address → Enter**, then re-enter the instruction to correct it. RAM is available throughout **2000–FFFF**; **0000–1FFF** is reserved for internal services.

## If a waveform is missing

- `OUT 00` changes **X-OUT**; `OUT 01` changes **Y-OUT**. Put the probe on the output your code writes. The bench gives a hint if the other output is changing.
- Connect **trainer CN4 → DAC CN2** with the I/O ribbon and **trainer CN5 → DAC CN1** with the four-wire supply. Connect a scope probe tip to the output and at least one scope ground return to DAC GND.
- Start the code with `G2000.` after Reset. The bottom bar reports execution; **Simulation** must be running.
- Click **Auto Set** on the scope. With only one connected signal, measurement sources follow that channel. **Run/Stop** must show running. Use **Display** to inspect the trace and readouts clearly.
- The DAC output amplifier inverts: increasing byte values produce a falling voltage ramp. Compare against the supplied sheet's circuit and polarity.

Notebook → Experiments contains the supplied ID, clockwise motor and DAC waveform programs. **Type into LCD** processes them one line at a time through the same strict monitor. Notebook → References contains all photos, both videos, the three PDFs and manufacturer documents.

The app is an instruction-level educational reconstruction. Original Kitek firmware, module schematics and analog calibration were not supplied; the documented compatibility behavior and ideal analog models are described in [the user guide](docs/USER-GUIDE.md).
