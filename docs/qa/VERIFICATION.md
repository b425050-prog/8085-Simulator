# Verification record

Verified locally on 31 October 2026.

## Automated checks

`node --test tests/*.test.js`: **35 tests passed, zero failures.**

The suite exercises all 246 documented encodings, exhaustive ALU input/carry combinations, all valid two-digit BCD additions with carry, stack/memory boundaries, instruction timing, interrupts, assembler directives/macros, memory protection, both 8255s, handshake modes, ADC profiles and loopback, DAC scaling, HEX checksums, snapshot validation/restoration, generated waveform timing, scope measurements, FFT and local HTTP serving.

All **15 standalone `.asm` files** in `examples/` assembled successfully, including the combined ID/DAC experiment. Browser modules and both launch-server implementations passed syntax checks. The Node server returned HTTP 200 for the app and correct JavaScript MIME. The Python fallback was started separately and returned HTTP 200 and JavaScript MIME as well.

## Browser checks

The actual interface was exercised in both the narrow Codex preview and the desktop workbench layout.

- Entered test ID `123456`: PA=12H, PB=34H, PC=56H; generated and ran its assembly; the visible LED groups matched the packed BCD bits.
- Ran ADC0808-to-DAC loopback. With the 100 Hz input generator and a sufficiently long scope window, the display measured approximately **99.93 Hz**, 3.984 V peak-to-peak. Confirmed scope FFT selection and freeze state. No browser error/warning logs appeared.
- Set a source-line breakpoint before HLT. A test program wrote **42H to FFFFH** and stopped at PC=2005H; Memory displayed that byte correctly.
- Saved a `.85bench` file through Save project, then restored it through Open. The CPU PC, source and RAM were restored with execution paused. `project-roundtrip.85bench` contains this small boundary/breakpoint test, not a user's actual ID program.
- Ran the mode-1 input example, set PA external input to 5AH, and pulsed STB A. The CPU read the latched value and echoed **5AH on PB**; IBF/INTR cleared after the read.
- Ran the RST7.5 example. A pulse entered the ISR in user RAM and incremented the visible LED port to 01H.
- Ran ADC0804 loopback and a manual conversion through its /WR, /RD and /INTR wiring. The conversion counter advanced and the DAC received the acquired codes.
- Restored the startup experiment and the editable ID placeholder `000000` after verification.

Scope and bus histories are finite ring buffers. Verification covers the implemented instruction-level and ideal analog models, not a hardware electrical simulation. Detailed model boundaries are in the user guide.
