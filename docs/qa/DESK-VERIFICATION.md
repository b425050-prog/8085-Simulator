# Lab desk verification

Verified locally on 2026-10-31 in `C:\8085 Simulator Project`. Application assets, references, photographic surfaces, exports and evidence are inside this folder. Original supplied files were left unchanged.

## Automated checks

`node --test tests/*.test.js`: **106 passed, 0 failed**. See [final-tests.txt](final-tests.txt). Application JavaScript syntax checks also passed.

Coverage includes all 246 documented encodings, exhaustive arithmetic/flag and DAA cases, timings, stack/interrupts, RAM 2000–FFFF and protected ROM, 8255 modes 0/1/2/BSR/handshakes, ADC latency/quantization, DAC transfer, 8253, cable contention/disconnection, scope acquisition/trigger/FFT/measurements, HEX and project restoration.

Strict LCD checks cover every opcode, extra spaces, MOV-only commas, no H suffixes, tabs/non-ASCII whitespace, no trimming or alias repair, disabled Backspace/Delete/address editing, no RAM/address changes on rejection, Reset correction and valid-but-unintended instructions. Five independent byte fixtures match the ID, clockwise motor, ramp, square and triangle PDFs. The complete motor example executes actual 8085 instructions at 03A6.

Eight SC-01 regressions verify its independent PPI, powered 50-signal bus, port-header driving, retained bus indicators, instruction stepping, BSR/mode-1 input/interrupt latches, saved state, incomplete-ribbon behavior and alternate trainer motor PPI.

## Browser checks

Tests used the actual local UI and visible DOM, without hidden-state mutation.

- At 2000, typed `MVI A,80H`, then Backspace and Enter. The rejected line stayed at 2000 with `SYNTAX ERR  RESET`. Delete and further typing did not alter it. Earlier double-space entry was also rejected. Automated checks independently verify unchanged RAM and written-byte masks.
- Pressed the physical Reset key, returned to 2000, and entered `MVI A 09`, `MOV B,A`, `ADD B`, `HLT`, one Enter per line. The address advanced to 2005. G followed by R/A showed `A=12` hexadecimal.
- Typed the supplied ID program through the LCD. The independent SC-01 showed **42 / 50 / 50** on its actual PA/PB/PC edge-bank layout. Its CPU cable carried 50 logical pairs; both trainer PPI latches remained independent.
- Switched SC-01 single-step ON and started at 2000. PC stayed at 2000 until STEP clicks advanced it to 2002, then 2004. Switching OFF resumed execution. This is complete-instruction stepping, not unprovided microcycle gating.
- Ran the complete clockwise stepper sheet. The live brass gear advanced from 1.8 to 1222.2 degrees while alternating valid phases; the captured panel showed phase 0A. The motor preset disconnects SC-01 and uses the trainer motor PPI at 30–33.
- Typed the exact triangle sheet. The exported scope image reads **194.17 Hz**, **5.150 ms**, **4.961 V peak-to-peak** at default ideal gain/probe settings.
- Typed the exact square sheet. Its exported image reads **423.73 Hz**, **2.360 ms**, **4.980 V peak-to-peak**. Sampling-grid quantization causes slight readout variation; the independent CPU-cycle test gives 423.841 Hz. ID ports stayed **42 / 50 / 50** during both waveforms.
- Tested USB insertion and actual front-panel PNG exports, then inspected both downloads. Rechecked pointer Run/Stop, Single/Force, Measure, Cursor, Math, Ref, Display, Acquire, Trigger, Horizontal, Help, Utility, Save/Recall, AutoRange and Default Setup. Visible transitions are saved in [panel-checks.json](panel-checks.json).
- Pointer testing found Run/Stop too close to the trigger-knob hit area. Moved it upward in the photographic calibration. Fresh-page pointer clicks then changed Running → Stopped → Running reliably. Single plus Force captured and stopped once.
- References exposes **21 local photos and two videos**. All nine later originals are copied unchanged. The earlier review covered all 12 initial photos, both complete videos, per-second frames and contact sheets. All ten pages of the three supplied PDFs were rendered and inspected.
- Saved and restored the actual `.85desk` through the real chooser. It contains 65,536 memory bytes, eight cables, a 50-pair CPU bus, SC-01 control 80/latches 42/50/50, 21 retained instruction-entry addresses and 8,192 capture points. Restore preserved the ID, RAM and waveform setup and paused CPU/scope execution. G and the corrected pointer Run/Stop resumed the bench.
- Exported `square.asm` through the app. Its 13 strict instructions match the checked example exactly. Reimport through the chooser entered the lines visibly and finished at 201C.
- No browser console errors during the final successful workflow. Final photographic checks used the default desktop viewport.

## Final refinement checks

Native connector labels now remain legible above the photographic surfaces, including CN4. The Display focus enlarges the blue/black scope screen. Real UI entry of the dual-output ramp acquired a 352.73 Hz signal. Auto Set was verified to enter its menu and complete; final browser console checks showed no errors. New regressions cover four DAC trimmers, millivolt text, channel selection, grounding, power reset, terminal history and safe setup recall.

- [Final trainer labels](final-trainer-labels.png)
- [Final scope display](final-scope-display.png)
- [Exam quick start](../../EXAM-QUICKSTART.md)

## Earlier evidence

- [Complete photographic bench](photographic-bench.png)
- [Trainer and live LCD](photographic-trainer.png)
- [Rejected LCD syntax](lcd-strict-error.png)
- [SC-01 card and CPU bus](photographic-sc01.png)
- [Stepper and brass gear](photographic-stepper.png)
- [Triangle panel](photographic-triangle.png), [actual exported PNG](scope-triangle-export.png)
- [Square panel](photographic-square.png), [actual exported PNG](scope-square-export.png)
- [Restorable working desk](photographic-roundtrip.85desk)
- [Strict LCD assembly export](lcd-square-export.asm)

Older `lab-desk.png`, `desk-roundtrip.85desk` and compact-view captures document the provisional layout/map. They are historical evidence, not the current SC-01 profile.

## Fidelity limits

The surfaces are photographic reconstructions. Functional labels take precedence over imperfect generated decorative silkscreen. Original Kitek ROM, decoder/module schematics, physical connector numbering and analog calibration were not supplied. The 03A6 timing, profile-based chip selection, retained bus indicators and instruction-level hardware step are explicit compatibility conventions. Analog models are ideal; the bounded virtual sample rate differs from the printed physical 500 MS/s. See [SC01-STUDY-CARD.md](../SC01-STUDY-CARD.md), [LAB-MATERIAL-VERIFICATION.md](../LAB-MATERIAL-VERIFICATION.md) and [USER-GUIDE.md](../USER-GUIDE.md).
